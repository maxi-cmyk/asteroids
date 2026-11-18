// Tile: the bigger black hole beside today's.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { swirl as oldSwirl, blackHole as oldHole } from '../../src/boss/zodiarch/fx.mjs';
import { TAU, dotted, dottedRing } from '../../src/boss/draw-kit.mjs';
import { px, span, ease, bullet, note, label } from './kit.mjs';

// 9. The black hole, old and new side by side.
function newHole(ctx, x, y, t, u = 1) {
    glow(ctx, x, y, 80 * u, '120,80,220', 0.35);
    // The far half of the tilted disc, behind the core.
    const disc = (front) => {
        for (let k = 0; k < 90; k++) {
            const r = 24 + ((k * 13) % 38),
                a = (k / 90) * TAU + t / (120 + r * 9);
            const sy = Math.sin(a);
            if (front !== sy > 0) continue;
            const hot = r < 32;
            ctx.fillStyle = hot ? (k % 3 ? '#ffd0a0' : '#ffffff') : k % 4 ? '#8a6ae0' : '#d8c4ff';
            ctx.globalAlpha = u;
            px(ctx, x + Math.cos(a) * r * u, y + sy * r * 0.32 * u, k % 3 ? 2 : 1, 1);
        }
        ctx.globalAlpha = 1;
    };
    disc(false);
    ctx.fillStyle = '#05020c';
    const R = Math.round(20 * u);
    for (let dy = -R; dy <= R; dy++) {
        const half = Math.floor(Math.sqrt(R * R - dy * dy));
        ctx.fillRect(Math.round(x) - half, Math.round(y) + dy, half * 2 + 1, 1);
    }
    // The lensing ring: light bent round the edge, in turning broken arcs.
    ctx.strokeStyle = '#f0e4ff';
    for (let k = 0; k < 5; k++) {
        const a0 = (k / 5) * TAU + t / 900;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), R + 2, a0, a0 + 0.9);
        ctx.stroke();
    }
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#b49cff';
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), R + 5, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    disc(true);
}
function newSwirl(ctx, x, y, t, u) {
    for (let k = 0; k < 30; k++) {
        const a = (k / 30) * TAU + t / 300,
            r = 80 * (1 - ((u * 2 + k / 30) % 1)) + 10;
        ctx.globalAlpha = 0.4 + 0.5 * u;
        ctx.fillStyle = k % 3 ? '#b49cff' : '#ffffff';
        px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r);
        dotted(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, a + Math.PI * 0.6, 6, '#7a5ad0', 2);
    }
    ctx.globalAlpha = 0.6;
    dottedRing(ctx, x, y, 18, '#ff8a6a', 32, t / 200);
    ctx.globalAlpha = 1;
    glow(ctx, x, y, 10 + 20 * u, '120,80,220', 0.5 * u);
}
export function hole(ctx, t) {
    const warn = t < 900,
        u = span(t, 0, 900);
    const A = [130, 140],
        B = [330, 140];
    if (warn) {
        oldSwirl(ctx, { x: A[0], y: A[1], warn: 900 - t, warnTotal: 900 }, t);
        newSwirl(ctx, B[0], B[1], t, u);
    } else {
        oldHole(ctx, { x: A[0], y: A[1] }, t);
        newHole(ctx, B[0], B[1], t, ease(span(t, 900, 1150)));
        // Shots it swallows.
        for (let k = 0; k < 3; k++) {
            const age = (t - 1200 - k * 700) % 2100;
            if (age < 0) continue;
            const d = Math.max(0, 140 - age * 0.25);
            if (d > 28) bullet(ctx, B[0] - d, B[1] - 20 + k * 20 - (k - 1) * (140 - d) * 0.08);
        }
    }
    note(ctx, 'today: core 10, swirl to 34', A[0] - 60, 240, '#aab6dc');
    note(ctx, 'new: core 18 (drawn 20), disc to 60, lensing rim', B[0] - 90, 240, '#ffe9c4');
    label(
        ctx,
        warn
            ? 'Warning (900 ms): the swirl matches the lethal size'
            : 'Live: it swallows shots in 28 px',
    );
}
