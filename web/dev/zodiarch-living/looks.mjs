// Tile: the three hit looks (stopped, hurt, a creature's key star).

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { SIGN_RIM, drawRing } from '../../src/boss/zodiarch/ring.mjs';
import { drawCreature } from '../../src/boss/zodiarch/creatures.mjs';
import { SIGN_KEY } from '../../src/boss/scene.mjs';
import { TAU } from '../../src/boss/draw-kit.mjs';
import { px, rgb, art, span, bullet, glance, burst, note, clamp, pilot, label } from './kit.mjs';
import { simulate, bodyOf, headOf, drawDragon, local, BROW } from './body.mjs';

// 8. Three looks: hurts, stopped, passes through; and a key star losing its pips.
const LOOKS = simulate(
    { x: 400, y: 120, heading: Math.PI, v: 0 },
    [{ until: 9000, goal: [300, 120], speed: 0.004, turn: 1, label: '' }],
    9000,
);
function keyGlint(ctx, sign, x, y, hits, t) {
    const [kx, ky] = [x + SIGN_KEY[sign][0], y + SIGN_KEY[sign][1]];
    const p = 0.5 + 0.5 * Math.sin((t / 800) * TAU);
    const n = 3 + Math.round(3 * p);
    ctx.fillStyle = SIGN_RIM[sign];
    px(ctx, kx - n, ky, n * 2 + 1, 1);
    px(ctx, kx, ky - n, 1, n * 2 + 1);
    ctx.fillStyle = '#ffffff';
    px(ctx, kx - 1, ky - 1, 3, 3);
    glow(ctx, kx, ky, 8 + 4 * p, rgb(SIGN_RIM[sign]), 0.4);
    for (let k = 0; k < 3; k++) {
        const x0 = kx - 8 + k * 6,
            y0 = ky + 9;
        ctx.fillStyle = '#0a0614';
        px(ctx, x0 - 1, y0 - 1, 5, 5);
        ctx.fillStyle = k < 3 - hits ? '#ffffff' : '#4a3a5a';
        px(ctx, x0, y0, 3, 3);
        if (k >= 3 - hits) {
            ctx.fillStyle = '#ff8a8a';
            px(ctx, x0 - 1, y0 - 1);
            px(ctx, x0 + 2, y0 + 2);
        }
    }
    return [kx, ky];
}
export function looks(ctx, t) {
    const f = LOOKS.frame(t),
        path = (s) => LOOKS.trail.at(s);
    drawRing(ctx, t / 1000, 1 << 1, t);
    const open = t > 2600 && t < 4600 ? 1 : 0;
    const segs = bodyOf(path, f.h, { t, still: 0.6 });
    const head = headOf(path, f.h, [90, 130], 0.5);
    drawDragon(ctx, segs, head, { t, pearl: { open }, rim: open ? '#ff8ad0' : undefined });
    const pear = local(head, BROW[0], BROW[1]),
        snout = local(head, -76, -4),
        seg = segs[9];
    // Taurus with its key star; three hits break it.
    const T = [230, 205];
    const keyHits = [6400, 6900, 7400].filter((h) => t >= h).length;
    if (keyHits < 3)
        drawCreature(
            ctx,
            art,
            { slot: 1, x: T[0], y: T[1], state: 1, r: 1, hp: 3 },
            t / 1000,
            t,
            1,
        );
    else if (t < 8000) {
        const u = span(t, 7400, 8000);
        ctx.globalAlpha = 1 - u;
        art.draw(ctx, 'rift', 'sign-1-1', T[0], T[1] + u * 10, { alpha: 1 - u, flash: 1 - u });
        ctx.globalAlpha = 1;
    }
    const key =
        keyHits < 3
            ? keyGlint(ctx, 1, T[0], T[1], keyHits, t)
            : [T[0] + SIGN_KEY[1][0], T[1] + SIGN_KEY[1][1]];
    // Shots: [fire time, target, kind]
    const shots = [
        [400, snout, 'stop', 'stopped (head)'],
        [1500, [seg.x, seg.y], 'pass', 'passes through (body)'],
        [2900, pear, 'hurt', 'hurts (open pearl)'],
        [4900, pear, 'stop', 'stopped (closed pearl)'],
        [6100, key, 'key', 'key star: a pip cracks'],
        [6600, key, 'key', ''],
        [7100, key, 'key', 'third pip: it breaks'],
    ];
    const from = [100, 130];
    for (const [at, [tx, ty], kind, text] of shots) {
        const dist = Math.hypot(tx - from[0], ty - from[1]),
            travel = dist / 0.6,
            a = Math.atan2(ty - from[1], tx - from[0]);
        const age = t - at;
        if (age < 0) continue;
        const go = kind === 'pass' ? age * 0.6 : Math.min(age * 0.6, dist);
        if (age < travel || (kind === 'pass' && go < 480))
            bullet(ctx, from[0] + Math.cos(a) * go, from[1] + Math.sin(a) * go);
        const since = age - travel;
        if (since < 0) continue;
        if (kind === 'stop') glance(ctx, tx, ty, a, since / 300);
        if (kind === 'hurt' || kind === 'key') burst(ctx, tx, ty, since / 350, '#ff8ad0');
        if (text && since < 1100)
            note(
                ctx,
                text,
                clamp(tx - 40, 4, 380),
                ty - 16,
                kind === 'stop' ? '#ffd890' : kind === 'pass' ? '#aab6dc' : '#ff9ad6',
            );
    }
    pilot(ctx, 90, 130);
    label(ctx, 'Three looks: pink hurts, gold stopped, nothing passes');
}
