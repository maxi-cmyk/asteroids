// Storyboard tiles for the spring signs: Aries, Taurus and Gemini.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { dotted, band, TAU } from '../../src/boss/draw-kit.mjs';
import {
    S,
    signTile,
    PILOT,
    FORM,
    emitAt,
    warnLane,
    span,
    charge,
    spark,
    flash,
    liveLane,
} from './kit.mjs';

S[0] = signTile(0, {
    // Aries: lines up on the pilot's row, paws, charges the whole field and off the edge.
    stage: [230, PILOT.y],
    dissolveAt: FORM + 1900,
    act: {
        motion: (t, [sx, sy]) => ({
            x: t < 1000 ? sx + Math.sin(t / 40) * (t > 600 ? 2 : 0) : sx - (t - 1000) * 0.62,
            y: sy,
        }),
        draw(ctx, t, x, y) {
            const [hx, hy] = emitAt(0, 'horns', x, y);
            warnLane(ctx, hx, hy, Math.PI, hx + 20, span(t, 0, 1000));
            charge(ctx, hx, hy, span(t, 0, 1000), '255,200,110');
            if (t >= 1000) {
                ctx.globalAlpha = 0.35;
                dotted(ctx, x + 40, y, 0, 480 - x, '#ffc070', 3);
                ctx.globalAlpha = 1;
                for (let k = 0; k < 8; k++) {
                    const fx = x + 30 + k * 16;
                    if (fx < 480) {
                        ctx.globalAlpha = 1 - k / 8;
                        spark(ctx, fx, y + 34 + ((k * 5) % 7), '#ffc070', 1);
                        ctx.globalAlpha = 1;
                    }
                }
            }
        },
    },
});
S[1] = signTile(1, {
    // Taurus: Aldebaran flares and sweeps a red eye beam, then the bull stampedes the whole
    // field; as it passes the pilot's column its star knot bursts.
    stage: [230, 110],
    dissolveAt: FORM + 2700,
    act: {
        motion: (t, [sx, sy]) => ({ x: t < 1700 ? sx : sx - (t - 1700) * 0.6, y: sy }),
        draw(ctx, t, x, y) {
            const [ex, ey] = emitAt(1, 'eye', x, y);
            charge(ctx, ex, ey, span(t, 0, 900), '255,90,70');
            const a0 = Math.atan2(PILOT.y - 30 - ey, PILOT.x - ex),
                sweep = a0 + 0.35 * span(t, 900, 1500);
            if (t < 900) dotted(ctx, ex, ey, a0, 420, '#ff6a5a', 5);
            if (t >= 900 && t < 1500) {
                band(ctx, ex, ey, sweep, 520, 5, '#ff5a4a');
                band(ctx, ex, ey, sweep, 520, 2, '#ffe0d0');
                flash(ctx, ex, ey, span(t, 900, 1100), '255,120,100');
            }
            if (t >= 1300 && t < 1700)
                warnLane(ctx, x - 50, y + 10, Math.PI, x, span(t, 1300, 1700));
            if (t >= 1700) {
                const passAt = 1700 + (x + 0 - PILOT.x) / 0.6;
                const burst = span(
                    t,
                    1700 + (230 - PILOT.x - 40) / 0.6,
                    1700 + (230 - PILOT.x - 40) / 0.6 + 900,
                );
                if (burst > 0) {
                    const bx = PILOT.x + 40;
                    for (let k = 0; k < 7; k++) {
                        const a = (k / 7) * TAU;
                        spark(
                            ctx,
                            bx + Math.cos(a) * burst * 90,
                            y + Math.sin(a) * burst * 90,
                            '#ffbe6e',
                        );
                    }
                } else if (passAt) glow(ctx, x - 10, y - 10, 14, '255,190,110', 0.6);
            }
        },
    },
});
S[2] = signTile(2, {
    // Gemini: the twins take the rows either side of the pilot; light gathers in their hands
    // and two beams cross the field from them; they step closer and fire again.
    stage: [190, PILOT.y - 62],
    dissolveAt: FORM + 3000,
    partner: (t, pos) => ({ x: pos.x + 30, y: PILOT.y + 62 - (t > FORM + 1500 ? 24 : 0) }),
    act: {
        motion: (t, [sx, sy]) => ({ x: sx, y: sy + (t > 1500 ? 24 : 0) }),
        draw(ctx, t, x, y) {
            const pairs = [
                emitAt(2, 'hand', x, y),
                emitAt(2, 'b_hand', x + 30, PILOT.y + 62 - (t > 1500 ? 24 : 0)),
            ];
            for (const round of [0, 1500]) {
                const u = span(t, round, round + 900);
                for (const [hx, hy] of pairs) {
                    charge(ctx, hx, hy, u, '140,220,255');
                    warnLane(ctx, hx, hy, Math.PI, hx, u, '#8cdcff');
                    liveLane(
                        ctx,
                        hx,
                        hy,
                        Math.PI,
                        hx,
                        8,
                        span(t, round + 900, round + 1300),
                        '#8cdcff',
                    );
                    flash(ctx, hx, hy, span(t, round + 900, round + 1100), '160,230,255');
                }
            }
        },
    },
});
