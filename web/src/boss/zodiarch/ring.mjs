// The Zodiarch's ring of twelve signs: the constellation patterns, each sign's colour, where a
// sign sits on the turning ring, and the ring itself (a sign that is out leaves a gap).
import { ZODIARCH } from '../scene.mjs';

export const GLYPHS = [
    [
        [0, 0.35],
        [0.35, 0.2],
        [0.65, 0.3],
        [0.95, 0.55],
    ], // Aries
    [
        [0, 0],
        [0.45, 0.5],
        [0.2, 0.55],
        [1, 0.1],
        [0.6, 0.7],
        [0.5, 0.95],
    ], // Taurus
    [
        [0.2, 0],
        [0.2, 0.5],
        [0.15, 1],
        [0.7, 0],
        [0.7, 0.5],
        [0.8, 1],
    ], // Gemini
    [
        [0.5, 0.45],
        [0.15, 0.1],
        [0.85, 0.1],
        [0.5, 1],
    ], // Cancer
    [
        [0.1, 0.3],
        [0.25, 0.05],
        [0.45, 0.1],
        [0.4, 0.4],
        [0.75, 0.5],
        [1, 0.85],
        [0.55, 0.9],
    ], // Leo
    [
        [0, 0.2],
        [0.3, 0.35],
        [0.5, 0.1],
        [0.6, 0.5],
        [0.95, 0.45],
        [0.55, 0.95],
    ], // Virgo
    [
        [0.5, 0],
        [0.05, 0.45],
        [0.95, 0.45],
        [0.25, 1],
        [0.8, 0.9],
    ], // Libra
    [
        [0, 0.1],
        [0.15, 0.3],
        [0.35, 0.4],
        [0.5, 0.65],
        [0.7, 0.9],
        [0.95, 0.8],
        [0.9, 0.55],
    ], // Scorpio
    [
        [0.1, 0.9],
        [0.45, 0.5],
        [0.9, 0.1],
        [0.3, 0.2],
        [0.7, 0.8],
    ], // Sagittarius
    [
        [0, 0.15],
        [0.5, 0.1],
        [1, 0.2],
        [0.55, 0.95],
    ], // Capricorn
    [
        [0.05, 0.1],
        [0.35, 0.3],
        [0.25, 0.6],
        [0.55, 0.55],
        [0.5, 0.85],
        [0.85, 0.75],
        [0.95, 1],
    ], // Aquarius
    [
        [0, 0.1],
        [0.2, 0.35],
        [0.5, 0.9],
        [0.8, 0.35],
        [1, 0.1],
    ], // Pisces
];
export const CHAINS = [
    [[0, 1, 2, 3]],
    [
        [0, 1, 4, 5],
        [3, 1],
        [2, 4],
    ],
    [
        [0, 1, 2],
        [3, 4, 5],
        [1, 4],
    ],
    [
        [1, 0, 2],
        [0, 3],
    ],
    [
        [0, 1, 2, 3, 0],
        [3, 4, 5, 6, 3],
    ],
    [
        [0, 1, 2],
        [1, 3, 4],
        [3, 5],
    ],
    [
        [1, 0, 2],
        [1, 3],
        [2, 4],
    ],
    [[0, 1, 2, 3, 4, 5, 6]],
    [
        [0, 1, 2],
        [3, 1, 4],
    ],
    [[0, 1, 2, 3, 0]],
    [[0, 1, 2, 3, 4, 5, 6]],
    [[0, 1, 2, 3, 4]],
];
export const SIGN_RIM = [
    '#ff965a',
    '#ffbe6e',
    '#8cdcff',
    '#b4e6d2',
    '#ffd25a',
    '#c8f08c',
    '#e6e6ff',
    '#ff5a5a',
    '#ffaad2',
    '#a0c8ff',
    '#6ec8ff',
    '#aaa0ff',
];
const BOX = 22;

export function ringPoint(sign, clock) {
    const a = -Math.PI / 2 + (sign * Math.PI * 2) / 12 + clock * 0.05;
    return [ZODIARCH.cx + ZODIARCH.rx * Math.cos(a), ZODIARCH.cy + ZODIARCH.ry * Math.sin(a)];
}
export const glyphPoints = (sign, cx, cy, scale = 1) =>
    GLYPHS[sign].map(([u, v]) => [cx + (u - 0.5) * BOX * scale, cy + (v - 0.5) * BOX * scale]);

function line(ctx, [x0, y0], [x1, y1]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i += 2)
        ctx.fillRect(
            Math.round(x0 + ((x1 - x0) * i) / n),
            Math.round(y0 + ((y1 - y0) * i) / n),
            1,
            1,
        );
}

// The ring: twelve faint constellations; a sign that is out of the ring is left as a gap.
export function drawRing(ctx, clock, outMask, time, alpha = 1) {
    for (let sign = 0; sign < 12; sign++) {
        if (outMask & (1 << sign)) continue;
        const [cx, cy] = ringPoint(sign, clock);
        const pts = glyphPoints(sign, cx, cy);
        ctx.globalAlpha = 0.35 * alpha;
        ctx.fillStyle = SIGN_RIM[sign];
        for (const chain of CHAINS[sign])
            for (let i = 1; i < chain.length; i++) line(ctx, pts[chain[i - 1]], pts[chain[i]]);
        ctx.globalAlpha = (0.65 + 0.25 * Math.sin(time / 400 + sign)) * alpha;
        ctx.fillStyle = '#f2f1df';
        for (const [x, y] of pts) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
}
