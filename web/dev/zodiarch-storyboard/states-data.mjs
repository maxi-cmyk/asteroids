// Creature states, the timings and tables: stages, when each is hurt and broken, partners,
// and each sign's idle motion.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { TAU, band } from '../../src/boss/draw-kit.mjs';
import { emitAt } from './kit.mjs';

// ---------------------------------------------------------------- creature states
// nextSteps.md P2.3 section 6: every sign's hold (idle), hurt (a body hit: flinch, white
// flash, spilled stars, no damage) and break (the key star shot: cracks run out from it, the
// figure comes apart, its stars fly back to the ring, dim). Exit is the dissolve in the
// attack tiles. Timeline: form 0-700, hold, a body hit at 2450, hold, the key star hit at
// 3850, break, stars home by 5300.
export const ST = { hurtAt: 2450, breakAt: 3850, loop: 5800 };
export const STAGE = [
    [230, 140],
    [230, 130],
    [205, 100],
    [215, 130],
    [235, 125],
    [230, 130],
    [220, 125],
    [225, 140],
    [230, 125],
    [215, 130],
    [235, 140],
    [235, 105],
];
export const PARTNER_AT = { 2: [30, 66], 11: [8, 62] };
// Where a body hit lands (away from the key star) and which part leaves first on a break.
export const HURT_AT = [
    [10, 14],
    [10, -10],
    [-12, -40],
    [-30, -10],
    [20, 10],
    [-30, 10],
    [0, -30],
    [40, 0],
    [20, 10],
    [-30, 0],
    [-10, 20],
    [-6, 62],
];
export const BREAK_FIRST = {
    0: ['horns'],
    1: ['eye'],
    4: ['mane'],
    5: ['wheat'],
    6: ['pan_near', 'pan_far'],
    7: ['sting'],
    8: ['arrow'],
    10: ['urn'],
};
export const SPLIT = { 3: 'vertical', 9: 'vertical' };
// break into two halves, not shards

export function seeded(n) {
    let s = n * 7919 + 13;
    return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}
// Idle: small transforms of the strike frame plus a few particles; returns the transform.
export function idle(ctx, sign, t, x, y, draw) {
    const s = Math.sin,
        o = { dx: 0, dy: 0, rot: 0, sx: 1, pdx: 0, pdy: 0, prot: 0 };
    switch (sign) {
        case 0: // Aries: paws, head dips
            o.rot = 0.03 * Math.max(0, s(t / 260));
            if (draw && Math.floor(t / 520) % 2) {
                const [hx, hy] = emitAt(0, 'hooves', x, y);
                for (let k = 0; k < 3; k++) {
                    const u = (t / 520) % 1;
                    ctx.globalAlpha = 0.5 * (1 - u);
                    ctx.fillStyle = '#c8b090';
                    ctx.fillRect(
                        Math.round(hx + k * 4 - 4 + u * (k - 1) * 6),
                        Math.round(hy - u * 6),
                        1,
                        1,
                    );
                }
                ctx.globalAlpha = 1;
            }
            break;
        case 1: // Taurus: snorts, head tosses a little
            o.rot = 0.015 * s(t / 400);
            if (draw) {
                const [mx, my] = emitAt(1, 'muzzle', x, y);
                const u = (t % 1100) / 500;
                if (u < 1)
                    for (const side of [-1, 1]) {
                        ctx.globalAlpha = 0.5 * (1 - u);
                        ctx.fillStyle = '#e0d8ff';
                        ctx.fillRect(
                            Math.round(mx - u * 10),
                            Math.round(my + side * (2 + u * 5)),
                            2,
                            1,
                        );
                    }
                ctx.globalAlpha = 1;
            }
            break;
        case 2: // Gemini: the twins sway out of step
            o.dx = 2 * s(t / 380);
            o.pdx = 2 * s(t / 380 + 2);
            o.rot = 0.02 * s(t / 380);
            o.prot = 0.02 * s(t / 380 + 2);
            break;
        case 3: // Cancer: shuffles sideways, claws open and close
            o.dx = 3 * s(t / 300);
            o.sx = 1 + 0.03 * s(t / 140);
            break;
        case 4: // Leo: mane ripples, a slow breath
            o.dy = 1.5 * s(t / 450);
            if (draw) {
                const [nx, ny] = emitAt(4, 'mane', x, y + o.dy);
                for (let k = 0; k < 10; k++) {
                    const a = (k / 10) * TAU,
                        l = 3 + 2 * s(t / 120 + k * 1.3);
                    ctx.globalAlpha = 0.35;
                    band(ctx, nx + Math.cos(a) * 17, ny + Math.sin(a) * 17, a, l, 1, '#ffd25a');
                }
                ctx.globalAlpha = 1;
            }
            break;
        case 5: // Virgo: wheat sways, robe stars drift up
            o.rot = 0.015 * s(t / 520);
            if (draw) {
                for (let k = 0; k < 5; k++) {
                    const u = (t / 1400 + k / 5) % 1;
                    ctx.globalAlpha = 0.6 * Math.sin(u * Math.PI);
                    ctx.fillStyle = '#e0ffc0';
                    ctx.fillRect(Math.round(x - 14 + k * 7), Math.round(y + 30 - u * 40), 1, 1);
                }
                const [wx, wy] = emitAt(5, 'wheat', x, y);
                if (Math.floor(t / 200) % 5 === 0) glow(ctx, wx, wy, 8, '200,240,140', 0.6);
                ctx.globalAlpha = 1;
            }
            break;
        case 6: // Libra: the pans bob against each other
            o.rot = 0.05 * s(t / 500);
            break;
        case 7: // Scorpius: the tail sways, the stinger twitches
            o.rot = 0.012 * s(t / 600);
            if (draw && Math.floor(t / 150) % 7 === 0) {
                const [sx, sy] = emitAt(7, 'sting', x, y);
                glow(ctx, sx, sy, 8, '255,96,90', 0.7);
            }
            break;
        case 8: // Sagittarius: paces on the spot
            o.dx = 2 * Math.round(s(t / 220));
            o.dy = -Math.abs(s(t / 220)) * 2;
            break;
        case 9: // Capricornus: slow rise and fall, the fish tail sweeps
            o.dy = 4 * s(t / 600);
            o.rot = 0.02 * s(t / 300);
            break;
        case 10: // Aquarius: water drips from the urn lip
            if (draw) {
                const [ux, uy] = emitAt(10, 'urn', x, y);
                for (let k = 0; k < 3; k++) {
                    const u = (t / 700 + k / 3) % 1;
                    ctx.globalAlpha = 1 - u;
                    ctx.fillStyle = '#6ec8ff';
                    ctx.fillRect(Math.round(ux - 6), Math.round(uy + 2 + u * u * 70), 1, 2);
                }
                ctx.globalAlpha = 1;
            }
            break;
        case 11: // Pisces: the fish nose about
            o.dx = 3 * s(t / 340);
            o.dy = 2 * s(t / 260);
            o.pdx = 3 * s(t / 340 + 1.5);
            o.pdy = 2 * s(t / 260 + 2);
            break;
    }
    return o;
}
