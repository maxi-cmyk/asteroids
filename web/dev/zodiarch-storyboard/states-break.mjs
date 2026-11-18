// Creature states, the break: each figure cracking apart from its key star, and the tile
// captions.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { ringPoint, SIGN_RIM } from '../../src/boss/zodiarch/ring.mjs';
import { SIGN_KEY } from '../../src/boss/scene.mjs';
import { TAU, band } from '../../src/boss/draw-kit.mjs';
import { emitAt, clamp01, ease, lerp, spark } from './kit.mjs';
import { seeded, SPLIT, BREAK_FIRST } from './states-data.mjs';
import { figure } from './states-pose.mjs';

// Break: the key star flares, cracks run out from it along the figure for 250 ms, then the
// figure comes apart (shards, or two halves for the crab and the sea-goat); a sign's first
// part (horns, sting, bow...) leaves 250 ms ahead of the rest. Its stars stream back to the
// ring, dim.
export function breakFigure(ctx, sign, b, x, y, pAt, clock) {
    const [kx, ky] = SIGN_KEY[sign];
    const K = [x + kx, y + ky],
        R = 220;
    const r = seeded(sign + 40);
    let pieces;
    if (SPLIT[sign])
        pieces = [
            {
                poly: [
                    [x - R, y - R],
                    [x + 2, y - R],
                    [x - 2, y + R],
                    [x - R, y + R],
                ],
                dir: Math.PI,
                first: false,
            },
            {
                poly: [
                    [x + 2, y - R],
                    [x + R, y - R],
                    [x + R, y + R],
                    [x - 2, y + R],
                ],
                dir: 0,
                first: false,
            },
        ];
    else {
        const N = 7,
            off = r() * TAU,
            cuts = [...Array(N).keys()].map((k) => off + (k / N) * TAU + (r() - 0.5) * 0.4);
        const firstPts = (BREAK_FIRST[sign] ?? []).map((n) => emitAt(sign, n, x, y));
        pieces = cuts.map((a, k) => {
            const a2 = cuts[(k + 1) % N] + (k === N - 1 ? TAU : 0),
                mid = (a + a2) / 2;
            const poly = [
                K,
                ...[a, mid, a2].map((q) => [K[0] + Math.cos(q) * R, K[1] + Math.sin(q) * R]),
            ];
            const first = firstPts.some(([px, py]) => {
                let q = Math.atan2(py - K[1], px - K[0]);
                while (q < a) q += TAU;
                return q <= a2;
            });
            return { poly, dir: mid, first };
        });
    }
    const crack = clamp01(b / 250);
    // The pieces.
    pieces.forEach((p, i) => {
        const start = p.first ? 250 : 500;
        const u = clamp01((b - start) / 1100);
        if (u >= 1) return;
        const gravity = sign === 6 && p.first ? 60 : 18;
        const dx = Math.cos(p.dir) * ease(u) * (p.first ? 46 : 26),
            dy = Math.sin(p.dir) * ease(u) * (p.first ? 46 : 26) + gravity * u * u;
        const spin = (i % 2 ? 1 : -1) * 0.35 * u;
        ctx.save();
        ctx.translate(dx, dy);
        const cx = K[0] + Math.cos(p.dir) * 30,
            cy = K[1] + Math.sin(p.dir) * 30;
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.translate(-cx, -cy);
        const wink = u > 0.6 && Math.floor(b / 70) % 2 ? 0.4 : 1;
        figure(ctx, sign, x, y, {
            clip: p.poly,
            alpha: (1 - u) * wink,
            flash: b < 200 ? 0.45 * (1 - b / 200) : 0,
        });
        if (pAt)
            figure(ctx, sign, x + pAt[0], y + pAt[1], {
                partner: true,
                clip: p.poly,
                alpha: (1 - u) * wink,
            });
        ctx.restore();
    });
    // The cracks and the flare.
    if (crack < 1 || b < 400) {
        glow(ctx, K[0], K[1], 12 + 30 * crack, '255,255,255', 0.8 * (1 - clamp01((b - 250) / 300)));
        ctx.globalAlpha = 1 - clamp01((b - 250) / 200);
        ctx.fillStyle = '#ffffff';
        for (const p of pieces) {
            const [ex, ey] = p.poly[1];
            const n = Math.round(80 * crack);
            for (let s = 0; s < n; s += 1) {
                const f = s / 220;
                ctx.fillRect(
                    Math.round(lerp(K[0], ex, f) + Math.sin(s * 0.7) * 1.2),
                    Math.round(lerp(K[1], ey, f)),
                    1,
                    1,
                );
            }
        }
        ctx.globalAlpha = 1;
    }
    // Sign extras.
    const e = clamp01((b - 250) / 900);
    if (sign === 1 && e > 0 && e < 1)
        for (let k = 0; k < 7; k++) {
            const a = (k / 7) * TAU,
                [ex, ey] = emitAt(1, 'eye', x, y);
            spark(ctx, ex + Math.cos(a) * e * 50, ey + Math.sin(a) * e * 50, '#ffbe6e', 1);
        }
    if (sign === 4 && e > 0 && e < 1) {
        const [nx, ny] = emitAt(4, 'mane', x, y);
        ctx.globalAlpha = 1 - e;
        for (let k = 0; k < 14; k++)
            band(
                ctx,
                nx + Math.cos((k / 14) * TAU) * (16 + e * 40),
                ny + Math.sin((k / 14) * TAU) * (16 + e * 40),
                (k / 14) * TAU,
                6,
                1,
                '#ffd25a',
            );
        ctx.globalAlpha = 1;
    }
    if (sign === 10 && e > 0 && e < 1) {
        const [ux, uy] = emitAt(10, 'urn', x, y);
        for (let k = 0; k < 10; k++) {
            ctx.globalAlpha = 0.7 * (1 - e);
            ctx.fillStyle = '#6ec8ff';
            ctx.fillRect(
                Math.round(ux - 14 + k * 3),
                Math.round(uy + e * e * 120 + (k % 3) * 6),
                1,
                2,
            );
        }
        ctx.globalAlpha = 1;
    }
    if ((sign === 2 || sign === 11) && b < 500) {
        // The thread (Gemini) or the cord (Pisces) snaps: two ends whip apart.
        const A = sign === 2 ? emitAt(2, 'hand', x, y) : [x + 26, y],
            B =
                sign === 2
                    ? emitAt(2, 'b_hand', x + pAt[0], y + pAt[1])
                    : [x + pAt[0] + 26, y + pAt[1]];
        const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2],
            u = b / 500;
        ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = sign === 2 ? '#8cdcff' : '#aaa0ff';
        ctx.beginPath();
        ctx.moveTo(...A);
        ctx.quadraticCurveTo(
            M[0] + 20 * u,
            M[1] - 10 * u,
            lerp(M[0], A[0], u),
            lerp(M[1], A[1], u) - 6,
        );
        ctx.moveTo(...B);
        ctx.quadraticCurveTo(
            M[0] + 20 * u,
            M[1] + 10 * u,
            lerp(M[0], B[0], u),
            lerp(M[1], B[1], u) + 6,
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    // The stars go home, dim.
    const home = clamp01((b - 550) / 900);
    if (home > 0 && home < 1) {
        const [rx, ry] = ringPoint(sign, clock);
        for (let k = 0; k < 14; k++) {
            const sx = x + (r() - 0.5) * 100,
                sy = y + (r() - 0.5) * 70;
            const u = ease(clamp01(home * 1.3 - k / 40));
            ctx.globalAlpha = 0.55 * (1 - u * 0.5);
            ctx.fillStyle = SIGN_RIM[sign];
            ctx.fillRect(
                Math.round(lerp(sx, rx, u)),
                Math.round(lerp(sy, ry, u) - Math.sin(u * Math.PI) * 20),
                1,
                1,
            );
        }
        ctx.globalAlpha = 1;
    }
}
export const STATES = [
    'Hold: paws the ground (dust from the hooves), head dips. Hurt: head jerks up. Break: the horns snap off first.',
    'Hold: snorts from the muzzle. Hurt: stamps. Break: the star knot scatters as seven sparks.',
    'Hold: the twins sway out of step, a thread of light between their hands. Hurt: the hit twin staggers. Break: both shatter, the thread snaps.',
    'Hold: shuffles sideways, claws working. Hurt: claws pull in to guard. Break: the shell splits down the middle.',
    'Hold: mane ripples, slow breath. Hurt: a snarl. Break: the mane bursts outward as rays.',
    'Hold: wheat sways, robe stars drift up. Hurt: turns away. Break: the wheat ear falls first.',
    'Hold: the pans bob. Hurt: the beam rocks. Break: the pans drop away first.',
    'Hold: the tail sways, the sting twitches. Hurt: the tail curls in. Break: the tail comes apart from the tip.',
    'Hold: paces on the spot. Hurt: rears. Break: the bow goes first.',
    'Hold: slow rise and fall, the tail sweeps. Hurt: ducks. Break: goat and fish tail part.',
    'Hold: water drips from the urn. Hurt: water spills. Break: the urn shatters, its water falls harmlessly.',
    'Hold: the fish nose about, the cord ripples. Hurt: the hit fish darts aside. Break: the cord snaps, the fish fall apart.',
];
