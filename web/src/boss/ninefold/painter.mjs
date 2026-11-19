// Ninefold's painter (nextSteps.md P2.1): the fox in the pose the engine chose (aux pose and
// face), its remaining tails drawn one by one over that pose, the seated tails swaying, a
// breath while it sits, star paw prints where its feet fall, the glow of each attack where it
// comes from, the leap's dissolve into stars, and the illusion's decoys running and sitting.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { ATTACK, PART } from '../scene.mjs';
import { FOX_POSES, FOX_POSE, FOX_SWAY, FOX_SMALL } from './poses.mjs';

const TAU = Math.PI * 2;
const SIT_SET = FOX_POSES[FOX_POSE.sit].set;

// One fox: tails (only those still on), then the body. `face` 1 mirrors it to look right;
// `scale` other than 1 and 0.6 (the cocoon shrinking, the shake growing) scales the full cells.
function drawFox(ctx, art, pose, x, y, o) {
    const { face = -1, scale = 1, alpha = 1, flash = 0, tails = null, sway = 0, decoy = false } = o;
    const small = Math.abs(scale - FOX_SMALL) < 0.01 && pose.small,
        k = small ? 1 : scale,
        pre = small ? 'fox-s-' : 'fox-';
    let set = pose.set;
    if (set === SIT_SET && sway) set = [SIT_SET, FOX_SWAY[0], FOX_SWAY[1], FOX_SWAY[0]][sway % 4];
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(face > 0 ? -k : k, k);
    for (let i = 0; i < 9; i++)
        if (!tails || tails.has(i))
            art.draw(ctx, 'rift', `${pre}t${set}-${i}`, 0, 0, { alpha, flash });
    const body = decoy && pose.decoy ? `fox-sd-${pose.name}` : `${pre}${pose.name}`;
    art.draw(ctx, 'rift', body, 0, 0, { alpha, flash });
    ctx.restore();
}
// A pose point, turned to the way it faces and scaled.
const at = (x, y, off, face, s) => [x + (face > 0 ? -off[0] : off[0]) * s, y + off[1] * s];

// Star motes: the fox coming apart (spread 0..1) as it leaps out of sight, or gathering.
const MOTES = Array.from({ length: 28 }, (_, i) => ({
    a: (i * 2.399) % TAU,
    r: ((i * 37) % 23) / 23,
    drift: 0.5 + ((i * 13) % 7) / 7,
    colour: ['#ffffff', '#c8f0ff', '#96e6ff', '#ffe6a0'][i % 4],
}));
function motes(ctx, x, y, s, spread, alpha) {
    if (alpha <= 0.02) return;
    ctx.globalAlpha = alpha;
    for (const m of MOTES) {
        const k = spread * 46 * m.drift;
        ctx.fillStyle = m.colour;
        ctx.fillRect(
            Math.round(x + Math.cos(m.a) * 30 * m.r * s * (1 + spread)),
            Math.round(y + Math.sin(m.a) * 36 * m.r * s - k),
            m.drift > 1.1 ? 2 : 1,
            1,
        );
    }
    ctx.globalAlpha = 1;
}

// Paw prints: a small star per footfall (the engine counts steps in aux `step`), fading
// over 600 ms. Kept per run of the page; harmless to lose.
const prints = [];
let lastStep = -1;
function footfalls(ctx, x, y, s, step, moving, time) {
    if (moving && step !== lastStep && step > 0)
        prints.push({ x, y: y + 72 * s + (step % 2 ? 3 : -3) * s, at: time });
    lastStep = moving ? step : -1;
    while (prints.length && time - prints[0].at > 600) prints.shift();
    for (const p of prints) {
        ctx.globalAlpha = Math.max(0, 1 - (time - p.at) / 600);
        ctx.fillStyle = '#c8f0ff';
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1);
        ctx.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3);
    }
    ctx.globalAlpha = 1;
}

// Decoys run out of the cocoon and back; their facing and run frame come from how they move.
const decoyLast = new Map();
function drawDecoys(ctx, art, parts, alpha, time) {
    for (const d of parts) {
        if (d.kind !== PART.decoy) continue;
        const last = decoyLast.get(d.index) ?? d;
        const dx = d.x - last.x,
            dy = d.y - last.y;
        decoyLast.set(d.index, {
            x: d.x,
            y: d.y,
            face: Math.abs(dx) > 0.2 ? Math.sign(dx) : (last.face ?? -1),
        });
        const face = decoyLast.get(d.index).face;
        let name = 'sit';
        if (d.state === 1) {
            const slope = dy / Math.max(0.5, Math.abs(dx));
            const tilt = slope < -0.25 ? 'up-' : slope > 0.25 ? 'down-' : '';
            name = `run-${tilt}${Math.floor((time + d.index * 37) / 80) % 6}`;
        }
        const pose = FOX_POSES[FOX_POSE[name]];
        drawFox(ctx, art, pose, d.x, d.y, {
            face: d.state === 1 ? face : -1,
            scale: FOX_SMALL,
            alpha: 0.88 * alpha,
            decoy: true,
        });
    }
}

export const lensimp = (b) => {
    const { ctx, art, state, x, y, time, aux, parts, alpha, flash, A } = b;
    const s = aux[A.scale] > 0 ? aux[A.scale] : 1,
        pose = FOX_POSES[aux[A.pose] | 0] ?? FOX_POSES[0],
        face = aux[A.face] > 0 ? 1 : -1,
        fade = aux[A.alpha];
    const tails = new Set(parts.filter((q) => q.kind === PART.tail).map((q) => q.slot));
    const seated = pose.name.startsWith('sit') || pose.name.startsWith('toss');
    const moving = pose.name.startsWith('walk') || pose.name.startsWith('run');
    footfalls(ctx, x, y, s, aux[A.step] | 0, moving, time);
    drawDecoys(ctx, art, parts, alpha, time);
    const ms = state.attackMs;
    // Light gathering where the attack comes from: over the arched tails, in the jaws.
    if (state.attack === ATTACK.comets && ms < 700)
        glow(ctx, ...at(x, y, [12, -82], face, s), 8 + 16 * (ms / 700), '150,220,255', 0.55);
    if (state.attack === ATTACK.foxfire && ms < 700)
        glow(
            ctx,
            ...at(x, y, pose.jaw, face, s),
            6 + 12 * (ms / 700),
            '120,200,255',
            0.4 + 0.4 * (ms / 700),
        );
    // The cocoon bursting into three foxes.
    if (state.attack === ATTACK.illusion && ms > 600 && ms < 1000)
        motes(ctx, x, y, s, (ms - 600) / 400, 1 - (ms - 600) / 400);
    const bob = seated ? Math.round(Math.sin(time / 520)) : 0;
    const a = alpha * Math.max(0, Math.min(1, fade));
    if (a > 0.02)
        drawFox(ctx, art, pose, x, y + bob, {
            face,
            scale: s,
            alpha: a,
            flash,
            tails,
            sway: Math.floor(aux[A.clock] / 0.6),
        });
    // The leap: it comes apart into stars at the top and gathers again over the next perch.
    if (state.attack === ATTACK.foxBlink && fade < 1)
        motes(ctx, x, y - 10, s, 1 - fade, (1 - fade) * 0.9);
    if (aux[A.open] > 0.5 && a > 0.3)
        glow(
            ctx,
            ...at(x, y + bob, pose.mark, face, s),
            16 * s,
            '255,120,170',
            0.5 + 0.2 * Math.sin(time / 80),
        );
};
