import { pixelGlow as glow } from '../render/fx.mjs';
import { ATTACK, NINEFOLD, PART, bossHazards, bossPart, bossShots, foxBend, zodiarchPath } from './scene.mjs';
import { creatures, drawCreature, drawDragonBody, drawRing, partners } from './zodiac.mjs';
import { drawZodiacFx } from './zodiac-fx.mjs';
import { TAU, dottedRing } from './draw-kit.mjs';

// One painter per boss kind (the index is the engine's BossKind). Each receives `b`:
//   ctx, art, scene, time     what to draw onto, from, and when
//   state, aux, parts         the decoded boss state, its 16 floats and its sub-targets
//   A                         this kind's named aux slots (KINDS[kind].aux)
//   x, y, alpha, flash        position, entrance fade and damage flash
//   frame(key, extra)         draws the body sprite `key` from the boss's own sheet
//   overlay(key)              draws the damage-state overlay for the current damage level

const sentinel = (b) => {
    const { ctx, x, y, time, aux, state, A } = b;
    const open = aux[A.open],
        index = Math.round(open * 3);
    glow(
        ctx,
        x,
        y,
        150,
        '255,170,90',
        (0.1 + 0.12 * Math.sin(time / 260)) * (state.stage >= 2 ? 1.4 : 1),
    );
    b.frame(
        index === 3 && state.stage >= 2 && Math.floor(time / 240) % 2
            ? 'sentinel-glow'
            : `sentinel-${index}`,
    );
    b.overlay('sentinel');
    if (open > 0.5) glow(ctx, x, y, 44, '255,200,120', 0.35 + 0.1 * Math.sin(time / 130));
};

const ringwarden = (b) => {
    const { ctx, art, x, y, aux, parts, A } = b;
    const scale = aux[A.scale] || 1;
    glow(ctx, x, y, 110, '120,90,255', 0.12 + (aux[A.charging] ? 0.14 : 0));
    b.frame(`ringwarden-core-${aux[A.charging] ? 1 : 0}`);
    b.overlay('ringwarden');
    ctx.fillStyle = '#5a3caa';
    for (const radius of [106 * scale, 70 * scale])
        dottedRing(ctx, x, y, radius, '#a58cff', Math.round(radius * 2.4), 0);
    for (const part of parts) {
        if (part.kind !== PART.blade) continue;
        const outer = part.slot < 16,
            angle = Math.atan2(part.y - y, part.x - x);
        const k = ((Math.round(angle / (Math.PI / 8)) % 16) + 16) % 16;
        art.draw(ctx, 'violet', `blade-${outer ? 'outer' : 'inner'}-${k}`, part.x, part.y, {
            alpha: 1,
        });
    }
};

const cinderforge = (b) => {
    const { ctx, art, scene, sheet, x, y, time, aux, alpha, A } = b;
    glow(ctx, x, y, 190, '255,90,30', 0.2 + 0.06 * Math.sin(time / 210) + (aux[A.open] ? 0.18 : 0));
    const heat = aux[A.heat] < 0.5 ? 0 : aux[A.heat] < 0.62 ? 1 : 2;
    b.frame(`forge-${heat}`);
    b.overlay('forge');
    // Fire churning behind the lattice: a few slow-orbiting additive flares.
    for (let k = 0; k < 7; k++) {
        const a = time / (2400 + k * 310) + k * 2.1,
            r = 28 + ((k * 37) % 70);
        glow(
            ctx,
            x + Math.cos(a) * r,
            y + Math.sin(a * 1.3) * r * 0.9,
            30,
            k % 2 ? '255,140,40' : '255,200,90',
            0.16 + 0.08 * Math.sin(time / 170 + k),
        );
    }
    for (let i = 0; i < 8; i++) {
        const part = bossPart(scene, i);
        if (!part.exists) continue;
        const key =
            part.state === 0
                ? 'panel-0'
                : `panel-${part.state}${Math.floor(time / 130 + i) % 2 ? 'a' : 'b'}`;
        art.draw(ctx, sheet, key, part.x, part.y, { alpha });
        if (part.state) glow(ctx, part.x, part.y, 22, '255,150,50', 0.4);
    }
    if (aux[A.open]) glow(ctx, x, y, 70, '255,244,200', 0.5 + 0.2 * Math.sin(time / 90));
};

const bastion = (b) => {
    const { ctx, art, state, x, y, time, aux, parts, alpha, flash, A } = b;
    b.frame('bastion-hull');
    if (state.stage >= 2) art.draw(ctx, 'ruins', 'bastion-flare', x, y, { alpha });
    const alive = [false, false, false];
    for (const part of parts) if (part.kind === PART.hard) alive[part.slot] = true;
    art.draw(ctx, 'ruins', alive[0] ? 'bastion-cannon' : 'bastion-cannon-dead', x, y, {
        alpha,
        flash: alive[0] ? flash : 0,
    });
    art.draw(
        ctx,
        'ruins',
        alive[1] ? (aux[A.pods] ? 'bastion-pods-open' : 'bastion-pods') : 'bastion-pods-dead',
        x,
        y,
        { alpha, flash: alive[1] ? flash : 0 },
    );
    art.draw(
        ctx,
        'ruins',
        alive[2] ? (aux[A.pods] ? 'bastion-mine-open' : 'bastion-mine') : 'bastion-mine-dead',
        x,
        y,
        { alpha, flash: alive[2] ? flash : 0 },
    );
    b.overlay('bastion');
    glow(
        ctx,
        x + 114,
        y + 2,
        26,
        '255,110,60',
        0.2 + (aux[A.cannon] ? 0.3 : 0) + 0.1 * Math.sin(time / 200),
    );
    for (const part of parts) {
        if (part.kind !== PART.hard) continue;
        if (part.hp < 3) glow(ctx, part.x, part.y, 20, '255,120,50', 0.3);
    }
};

const tidecaller = (b) => {
    const { ctx, art, x, y, time, aux, parts, A } = b;
    const exposed = aux[A.exposed] > 0.5;
    b.frame(`tide-${Math.floor(time / 280) % 4}-${exposed ? 1 : 0}`);
    b.overlay('tide');
    if (exposed) glow(ctx, x, y - 37, 80, '255,120,220', 0.25 + 0.12 * Math.sin(time / 100));
    for (const part of parts) {
        if (part.kind !== PART.bubble) continue;
        art.draw(ctx, 'shots', 'bubble', part.x, part.y, { alpha: 0.9 });
    }
};

// The Zodiarch: its ring behind, the path its head will take next as faint dots, the body
// from the tail up, the head (jaw open while it throws or breathes), the pearl (bright while
// it can be shot) and every creature it has thrown.
const warden = (b) => {
    const { ctx, art, scene, x, y, time, aux, parts, alpha, flash, state, A } = b;
    const clock = aux[A.clock];
    drawRing(ctx, clock, aux[A.out], time, alpha);
    if (state.stage > 0 && aux[A.breath] < 0.5 && aux[A.hold] < 0.5) {
        ctx.fillStyle = '#ffd890';
        for (let k = 1; k <= 6; k++) {
            const [px, py] = zodiarchPath(clock + k * 0.1);
            ctx.globalAlpha = 0.5 - k * 0.06;
            ctx.fillRect(Math.round(px - 24), Math.round(py), 2, 2);
        }
        ctx.globalAlpha = 1;
    }
    drawDragonBody(ctx, art, scene, { alpha, flash, damage: state.damage, time });
    const open = aux[A.coreOpen] > 0.5;
    const head = aux[A.mouth] > 0.5 ? 'zod-head-1' : 'zod-head-0';
    art.draw(ctx, 'rift', head, x - 24, y, { alpha, flash });
    if (state.damage > 0) art.draw(ctx, 'rift', `zod-head-d${state.damage}`, x - 24, y, { alpha });
    if (aux[A.breath] > 0.5) glow(ctx, x - 70, y + 4, 26, '255,210,140', 0.5 + 0.2 * Math.sin(time / 60));
    const px = aux[A.pearlX],
        py = aux[A.pearlY];
    if (open) glow(ctx, px, py, 24, '255,150,210', 0.45 + 0.15 * Math.sin(time / 90));
    art.draw(ctx, 'rift', open ? 'zod-pearl-1' : 'zod-pearl-0', px, py, { alpha });
    const thrown = creatures(parts),
        second = partners(thrown);
    thrown.forEach((part, i) => drawCreature(ctx, art, part, clock, time, alpha, second[i]));
    drawZodiacFx(ctx, { hazards: bossHazards(scene), shots: bossShots(scene), creatures: thrown, time });
};

const picket = (b) => {
    const { ctx, x, y, aux, A } = b;
    b.frame(`picket-${Math.round(aux[A.open] * 2)}`);
    b.overlay('picket');
    if (aux[A.open] > 0.5) glow(ctx, x, y, 28, '255,200,120', 0.35);
};

const shardling = (b) => {
    const { ctx, art, x, y, aux, alpha, state, A } = b;
    b.frame(`shardling-${state.attack ? 1 : 0}`);
    b.overlay('shardling');
    for (let k = 0; k < 3; k++) {
        const a = aux[A.spin] + (k * TAU) / 3,
            bx = x + Math.cos(a) * 46,
            by = y + Math.sin(a) * 46;
        art.draw(
            ctx,
            'violet',
            `blade-inner-${((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16}`,
            bx,
            by,
            { alpha },
        );
    }
};

const cinderling = (b) => {
    const { ctx, x, y, aux, A } = b;
    glow(ctx, x, y, 90, '255,90,30', 0.2 + (aux[A.open] ? 0.2 : 0));
    b.frame(aux[A.open] > 0.5 ? 'cinderling-1' : 'cinderling-0');
    b.overlay('cinderling');
};

const gunnery = (b) => {
    const { ctx, x, y, aux, A } = b;
    b.frame(aux[A.firing] > 0.5 ? 'gunnery-1' : 'gunnery-0');
    b.overlay('gunnery');
    glow(ctx, x + 68, y, 18, '255,120,80', 0.2 + (aux[A.firing] ? 0.3 : 0));
};

const moonjelly = (b) => {
    b.frame(`moonjelly-${Math.floor(b.time / 300) % 4}`);
    b.overlay('moonjelly');
};

// Ninefold. It breathes (the body rises and falls a pixel), blinks its eyes now and then, and
// its nine tails sway in a wave that runs across the fan (bend frames, foxBend). Firing comets,
// each tail draws back and flicks. Its blink is a dissolve: the fox comes apart into stars
// that stream off, and gathers out of stars at its new place. While it casts an illusion all
// three foxes are drawn smaller (`ninefold-s`); the two decoys have dark eyes.
const FOX_TAU = Math.PI * 2;
// Deterministic star motes over the fox's body and head, for its dissolve.
const FOX_MOTES = Array.from({ length: 28 }, (_, i) => {
    const a = (i * 2.399) % FOX_TAU,
        r = ((i * 37) % 23) / 23;
    const onHead = i % 3 === 0;
    return {
        x: onHead ? -35 + Math.cos(a) * 14 * r : -19 + Math.cos(a) * 22 * r,
        y: onHead ? -40 + Math.sin(a) * 12 * r : 22 + Math.sin(a) * 34 * r,
        drift: 0.5 + ((i * 13) % 7) / 7,
        colour: ['#ffffff', '#c8f0ff', '#96e6ff', '#ffe6a0'][i % 4],
    };
});
function foxMotes(ctx, x, y, s, spread, alpha) {
    if (alpha <= 0.02) return;
    ctx.globalAlpha = alpha;
    for (const m of FOX_MOTES) {
        // Out and up: the stars lift away as they scatter.
        const k = spread * 46 * m.drift;
        const px = x + m.x * s * (1 + spread * 1.4) + Math.cos(m.x) * k * 0.3,
            py = y + m.y * s * (1 + spread * 0.6) - k;
        ctx.fillStyle = m.colour;
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
        if (m.drift > 1.1) ctx.fillRect(Math.round(px) - 1, Math.round(py), 3, 1);
    }
    ctx.globalAlpha = 1;
}
const foxEase = (u) => u * u * (3 - 2 * u);

const lensimp = (b) => {
    const { ctx, art, state, x, y, time, aux, parts, alpha, flash, A } = b;
    const clock = aux[A.clock],
        s = aux[A.scale] > 0 ? aux[A.scale] : 1,
        small = s < 0.9,
        p = small ? 'ninefold-s' : 'ninefold';
    const tails = parts.filter((q) => q.kind === PART.tail);
    // A tail firing a comet draws back just before and flicks forward as it fires.
    const flick = new Map();
    if (state.attack === ATTACK.comets) {
        const n = Math.max(2, (tails.length + 1) >> 1);
        for (let k = 0; k < n; k++) {
            const i = Math.floor((k * 9) / n) % 9,
                fire = k * 150 + 500,
                dt = state.attackMs - fire;
            if (dt > -220 && dt < 0) flick.set(i, 4);
            else if (dt >= 0 && dt < 140) flick.set(i, 0);
        }
    }
    const tailFrame = (slot) => flick.get(slot) ?? foxBend(slot, clock);
    const drawFox = (fx, fy, prefix, bodyKey, a, f) => {
        for (const tail of tails) art.draw(ctx, 'rift', `${prefix}-tail-${tail.slot}-${tailFrame(tail.slot)}`, fx, fy, { alpha: a, flash: f });
        const bob = Math.round(Math.sin((clock * FOX_TAU) / 2.2));
        art.draw(ctx, 'rift', `${prefix}-${bodyKey}`, fx, fy + bob, { alpha: a, flash: f });
        return bob;
    };

    // Decoys first, so the real fox draws over any overlap.
    for (const decoy of parts.filter((q) => q.kind === PART.decoy)) {
        drawFox(decoy.x, decoy.y, 'ninefold-s', 'decoy', 0.88 * alpha, 0);
        if (Math.floor(time / 90 + decoy.slot) % 5 === 0)
            foxMotes(ctx, decoy.x, decoy.y, NINEFOLD.illusionScale, 0.15, 0.5);
    }

    // The blink: 500 ms coming apart into stars, then 500 ms gathering at the new place.
    let a = alpha,
        motes = 0,
        spread = 0;
    if (aux[A.blink] > 0.5) {
        const t = state.attack === ATTACK.foxBlink ? state.attackMs : 500;
        if (t < 500) {
            const u = foxEase(Math.min(1, t / 500));
            a = alpha * (1 - u);
            spread = u;
            motes = Math.min(1, u * 2.5) * (1 - u * 0.4);
        } else {
            const u = foxEase(Math.min(1, (t - 500) / 500));
            a = alpha * u;
            spread = 1 - u;
            motes = (1 - u) * 0.9;
        }
    }
    // The illusion's split: a burst of motes as it shrinks (attack 600..900 ms).
    if (state.attack === ATTACK.illusion && state.attackMs > 600 && state.attackMs < 900)
        foxMotes(ctx, x, y, s, (state.attackMs - 600) / 300, 1 - (state.attackMs - 600) / 300);

    const open = aux[A.open] > 0.5;
    const shut = !open && time % 3700 < 140; // it blinks its eyes
    const bob = drawFox(x, y, p, open ? '1' : shut ? 'shut' : '0', a, flash);
    if (state.damage > 0) art.draw(ctx, 'rift', `${p}-d${state.damage}`, x, y + bob, { alpha: a });
    foxMotes(ctx, x, y, s, spread, motes);
    if (open && a > 0.3)
        glow(ctx, x + NINEFOLD.mark[0] * s, y + NINEFOLD.mark[1] * s + bob, 16 * s, '255,120,170', 0.5 + 0.2 * Math.sin(time / 80));
};

// Indexed by BossKind: six bosses, then their six minis.
export const BODY_PAINTERS = [
    sentinel,
    ringwarden,
    cinderforge,
    bastion,
    tidecaller,
    warden,
    picket,
    shardling,
    cinderling,
    gunnery,
    moonjelly,
    lensimp,
];
