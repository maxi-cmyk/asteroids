// The Zodiarch's firing effects (nextSteps.md P2.3): every shot and wall leaves a visible point
// on a body. While an attack is warned, light gathers at the point it comes from (motes
// spiral in, a glow grows); when it goes live, or a shot appears, a muzzle flash. Also the
// pieces drawn from the attack timers the engine already sends: Virgo's seeds in flight,
// Capricornus's splash, the black hole's inflow and the slack cord between the fish.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { HAZARD, SHOT, SIGN_CHARGE, SIGN_EMIT, ZOD_STYLE } from '../scene.mjs';
import { TAU, dotted, px } from '../draw-kit.mjs';

const DRAGON_CHARGE = '255,210,140';
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, u) => a + (b - a) * u;

// Light gathering at (x, y) while an attack is warned; u runs 0..1 over the warning.
export function charge(ctx, x, y, u, colour) {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 6 + 18 * u, colour, 0.25 + 0.45 * u);
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + u * 5,
            r = 22 * (1 - ((u * 3 + k / 8) % 1));
        ctx.fillStyle = k % 2 ? '#ffffff' : `rgb(${colour})`;
        px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
}
// A muzzle flash; u runs 0..1 over its 150 ms.
export function muzzle(ctx, x, y, u, colour) {
    if (u < 0 || u >= 1) return;
    glow(ctx, x, y, 10 + 16 * u, colour, 0.9 * (1 - u));
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU,
            r = 3 + 10 * u;
        px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 1);
    }
    ctx.globalAlpha = 1;
}

// The colour of whoever is nearest (x, y): a creature's sign, else the dragon.
function sourceColour(x, y, creatures) {
    let best = 90,
        colour = DRAGON_CHARGE;
    for (const c of creatures) {
        if (c.state !== 1) continue;
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < best) {
            best = d;
            colour = SIGN_CHARGE[c.slot];
        }
    }
    return colour;
}
// Hazards whose origin is an emitter (the others are drawn whole by their painters).
function fromEmitter(h) {
    if (h.kind === HAZARD.lane) return h.e === ZOD_STYLE.plain || h.e === ZOD_STYLE.tether;
    if (h.kind === HAZARD.aim) return h.e === ZOD_STYLE.plain;
    if (h.kind === HAZARD.arc) return h.d !== 15;
    return h.kind === HAZARD.beam || h.kind === HAZARD.arm || h.kind === HAZARD.ring;
}

// When each hazard went live, for the muzzle flash (keyed by slot and warning length).
const liveSince = new Map();
const flashFamilies = new Set([
    SHOT.needle,
    SHOT.fast,
    SHOT.pellet,
    SHOT.missile,
    SHOT.fireball,
    SHOT.sun,
    SHOT.meteor,
    SHOT.nova,
]);

export function drawZodiacFx(ctx, { hazards, shots, creatures, time }) {
    const seen = new Set();
    for (const h of hazards) {
        if (!fromEmitter(h)) continue;
        const key = `${h.index}:${h.warnTotal}:${Math.round(h.x)}`;
        if (h.warn > 0) {
            charge(ctx, h.x, h.y, 1 - h.warn / h.warnTotal, sourceColour(h.x, h.y, creatures));
            continue;
        }
        seen.add(key);
        if (!liveSince.has(key)) liveSince.set(key, time);
        muzzle(ctx, h.x, h.y, (time - liveSince.get(key)) / 150, sourceColour(h.x, h.y, creatures));
    }
    for (const key of liveSince.keys()) if (!seen.has(key)) liveSince.delete(key);
    // A shot just fired: the flash where it left (it has moved only a few pixels yet).
    for (const s of shots)
        if (s.age < 120 && flashFamilies.has(s.family) && s.family !== SHOT.pellet)
            muzzle(ctx, s.x, s.y, s.age / 120, sourceColour(s.x, s.y, creatures));
    for (const h of hazards) {
        if (h.kind === HAZARD.aim && h.e === ZOD_STYLE.seed) seed(ctx, h, creatures);
    }
    slackCord(ctx, creatures, hazards, time);
}

// Virgo's seed: flies on an arc from her hand to its spot over the first 40% of the warning,
// then sprouts.
function seed(ctx, h, creatures) {
    const u = 1 - h.warn / h.warnTotal;
    const virgo = creatures.find((c) => c.slot === 5 && c.state === 1);
    const fly = clamp01(u / 0.4);
    if (fly < 1 && virgo) {
        const [dx, dy] = SIGN_EMIT[5].hand;
        const x = lerp(virgo.x + dx, h.x, fly),
            y = lerp(virgo.y + dy, h.y, fly) - Math.sin(fly * Math.PI) * 40;
        ctx.fillStyle = '#c8f08c';
        px(ctx, x - 1, y - 1, 3, 3);
        ctx.fillStyle = '#ffffff';
        px(ctx, x, y);
        return;
    }
    const grow = clamp01((u - 0.4) / 0.25);
    ctx.fillStyle = '#c8f08c';
    px(ctx, h.x - 1, h.y - Math.round(6 * grow), 2, Math.round(6 * grow) + 1);
}

// The fish's cord, slack and harmless while no lethal cord is out: a dim dashed sag.
function slackCord(ctx, creatures, hazards, time) {
    const fish = creatures.filter((c) => c.slot === 11 && c.state === 1);
    if (fish.length < 2) return;
    if (hazards.some((h) => h.kind === HAZARD.lane && h.e === ZOD_STYLE.cord)) return;
    const back = fish[0].r < 0 ? 26 : -26; // r < 0: swimming left, so behind is to the right
    const [a, b] = fish;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#8a80d0';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(a.x + back, a.y);
    ctx.quadraticCurveTo(
        (a.x + b.x) / 2 + back * 1.8 + Math.sin(time / 200) * 6,
        (a.y + b.y) / 2,
        b.x + back,
        b.y,
    );
    ctx.stroke();
    ctx.restore();
}

// Capricornus's splash (a tell styled `splash`): u runs over its 1000 ms; the sea-goat hits
// the water at about a third of the way.
export function splash(ctx, h) {
    const since = (1 - h.warn / h.warnTotal) * 1000 - 330;
    if (since < 0) return;
    const f = clamp01(since / 500);
    glow(ctx, h.x, h.y, 30 + 50 * f, '200,230,255', 0.9 * (1 - f));
    if (since < 600) {
        const height = 110 * Math.sin((since / 600) * Math.PI);
        ctx.globalAlpha = 0.55 * (1 - since / 600);
        ctx.fillStyle = '#cfe6ff';
        ctx.fillRect(Math.round(h.x - 8), Math.round(h.y - height), 16, Math.round(height));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(h.x - 3), Math.round(h.y - height), 6, Math.round(height));
        ctx.globalAlpha = 1;
    }
    for (let k = 0; k < 30; k++) {
        const a = -Math.PI / 2 + (k / 29 - 0.5) * 2.4,
            v = 0.22 + ((k * 37) % 11) / 30;
        const x = h.x + Math.cos(a) * v * since,
            y = h.y + Math.sin(a) * v * since + 0.00045 * since * since;
        if (y > h.y + 4) continue;
        ctx.globalAlpha = Math.max(0, 1 - since / 700);
        ctx.fillStyle = k % 3 ? '#a0c8ff' : '#ffffff';
        px(ctx, x, y, 2, 2);
    }
    for (let k = 0; k < 3; k++) {
        const r = clamp01((since - k * 150) / 600);
        if (r <= 0 || r >= 1) continue;
        ctx.globalAlpha = 1 - r;
        ctx.strokeStyle = '#a0c8ff';
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, 12 + r * 170, 3 + r * 14, 0, Math.PI, TAU);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}
// Where a black hole will open (P3.6): stars streak inward from 80 px, and a dotted ring marks
// the lethal core (18 px) so the warned area is the lethal one.
export function swirl(ctx, h, time) {
    const u = 1 - h.warn / h.warnTotal;
    for (let k = 0; k < 30; k++) {
        const a = (k / 30) * TAU + time / 300,
            r = 80 * (1 - ((u * 2 + k / 30) % 1)) + 10;
        ctx.globalAlpha = 0.4 + 0.5 * u;
        ctx.fillStyle = k % 3 ? '#b49cff' : '#ffffff';
        px(ctx, h.x + Math.cos(a) * r, h.y + Math.sin(a) * r);
        dotted(
            ctx,
            h.x + Math.cos(a) * r,
            h.y + Math.sin(a) * r,
            a + Math.PI * 0.6,
            6,
            '#7a5ad0',
            2,
        );
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ff8a6a';
    for (let k = 0; k < 32; k++) {
        const a = (k / 32) * TAU + time / 200;
        px(ctx, h.x + Math.cos(a) * 18, h.y + Math.sin(a) * 18);
    }
    ctx.globalAlpha = 1;
    glow(ctx, h.x, h.y, 10 + 20 * u, '120,80,220', 0.5 * u);
}
// The black hole itself: a dark core of 20 px behind a tilted, turning disc of accretion
// streaks out to 60 px (hot at its inner edge) and a lensing rim of light bent round its edge.
export function blackHole(ctx, h, time) {
    glow(ctx, h.x, h.y, 80, '120,80,220', 0.35);
    const disc = (front) => {
        for (let k = 0; k < 90; k++) {
            const r = 24 + ((k * 13) % 38),
                a = (k / 90) * TAU + time / (120 + r * 9),
                sy = Math.sin(a);
            if (front !== sy > 0) continue;
            ctx.fillStyle =
                r < 32 ? (k % 3 ? '#ffd0a0' : '#ffffff') : k % 4 ? '#8a6ae0' : '#d8c4ff';
            px(ctx, h.x + Math.cos(a) * r, h.y + sy * r * 0.32, k % 3 ? 2 : 1, 1);
        }
    };
    disc(false);
    ctx.fillStyle = '#05020c';
    for (let dy = -20; dy <= 20; dy++) {
        const half = Math.floor(Math.sqrt(400 - dy * dy));
        ctx.fillRect(Math.round(h.x) - half, Math.round(h.y) + dy, half * 2 + 1, 1);
    }
    ctx.strokeStyle = '#f0e4ff';
    ctx.globalAlpha = 0.85;
    for (let k = 0; k < 5; k++) {
        const a0 = (k / 5) * TAU + time / 900;
        ctx.beginPath();
        ctx.arc(Math.round(h.x), Math.round(h.y), 22, a0, a0 + 0.9);
        ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#b49cff';
    ctx.beginPath();
    ctx.arc(Math.round(h.x), Math.round(h.y), 25, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    disc(true);
}
