// Storyboard tiles for the autumn signs: Libra, Scorpius and Sagittarius.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { dotted, band } from '../../src/boss/draw-kit.mjs';
import {
    S,
    signTile,
    FORM,
    span,
    emitAt,
    charge,
    trail,
    spark,
    ease,
    lerp,
    PILOT,
    flash,
} from './kit.mjs';

S[6] = signTile(6, {
    // Libra: the beam tips; the field tilts toward the heavier pan; weights drop from the pans.
    stage: [220, 110],
    dissolveAt: FORM + 3000,
    act: {
        draw(ctx, t, x, y) {
            const u = span(t, 0, 900);
            ctx.globalAlpha = 0.35 + 0.3 * u;
            ctx.fillStyle = '#e6e6ff';
            for (let k = 0; k < 14; k++) {
                const ax = 30 + ((k * 67) % 420),
                    ay = 30 + ((k * 41 + t / 8) % 230);
                ctx.fillRect(Math.round(ax), Math.round(ay), 1, 4);
                ctx.fillRect(Math.round(ax) - 1, Math.round(ay) + 3, 3, 1);
            }
            ctx.globalAlpha = 1;
            for (const [k, name] of ['pan_near', 'pan_far'].entries()) {
                const [px, py] = emitAt(6, name, x, y);
                charge(ctx, px, py, span(t, 0, 900), '230,230,255');
                for (let w = 0; w < 3; w++) {
                    const s = span(t, 900 + w * 300 + k * 150, 2400 + w * 300 + k * 150);
                    if (s > 0 && s < 1) {
                        const wx = px - s * 90,
                            wy = py + s * s * 200;
                        trail(ctx, wx, wy, Math.atan2(s * 2, -0.5), 10, '#e6e6ff');
                        spark(ctx, wx, wy, '#e6e6ff', 2);
                    }
                }
            }
        },
    },
});
S[7] = signTile(7, {
    // Scorpius: everything leaves the sting at the tip of the tail. The tail cocks back while
    // venom gathers at the tip; a venom beam whips an arc from the tip; it gathers again and
    // the sting itself is fired from the tip and homes in, the body lurching after it.
    stage: [220, 150],
    dissolveAt: FORM + 3200,
    act: {
        motion: (t, [sx, sy]) => {
            const cock =
                ease(span(t, 0, 900)) * (1 - ease(span(t, 900, 1100))) +
                ease(span(t, 1700, 2300)) * (1 - ease(span(t, 2300, 2400)));
            const lurch =
                Math.max(0, 1 - Math.abs(t - 1000) / 250) +
                Math.max(0, 1 - Math.abs(t - 2400) / 250);
            return { x: sx + 4 * cock - 6 * lurch, y: sy };
        },
        draw(ctx, t, x, y) {
            const [sx, sy] = emitAt(7, 'sting', x, y);
            const a0 = Math.PI + 0.55,
                a1 = Math.PI - 0.45;
            const u = span(t, 0, 900);
            charge(ctx, sx, sy, u, '255,96,90');
            if (u > 0 && u < 1) {
                dotted(ctx, sx, sy, a0, 230, '#ff7a6a', 6);
                dotted(ctx, sx, sy, a1, 230, '#ff7a6a', 6);
                ctx.globalAlpha = 0.35;
                for (let k = 1; k < 6; k++)
                    dotted(ctx, sx, sy, lerp(a0, a1, k / 6), 230, '#ff7a6a', 12);
                ctx.globalAlpha = 1;
            }
            const sweep = span(t, 900, 1700);
            if (sweep > 0 && sweep < 1) {
                const a = lerp(a0, a1, ease(sweep));
                band(ctx, sx, sy, a, 230, 7, '#ff5a5a');
                band(ctx, sx, sy, a, 230, 3, '#ffe0d8');
                glow(ctx, sx, sy, 14, '255,110,100', 0.7);
                // Venom drips off the arc it has swept.
                for (let k = 0; k < 6; k++) {
                    const f = ((sweep * 3 + k / 6) % 1) * ease(sweep);
                    const da = lerp(a0, a, f),
                        dd = 60 + k * 26;
                    ctx.globalAlpha = 0.6;
                    spark(
                        ctx,
                        sx + Math.cos(da) * dd,
                        sy + Math.sin(da) * dd + f * 8,
                        '#ff8a7a',
                        1,
                    );
                }
                ctx.globalAlpha = 1;
            }
            charge(ctx, sx, sy, span(t, 1700, 2400), '255,120,110');
            if (t >= 1700 && t < 2400) {
                ctx.globalAlpha = 0.6;
                dotted(
                    ctx,
                    sx,
                    sy,
                    Math.atan2(PILOT.y - sy, PILOT.x - sx),
                    150,
                    Math.floor(t / 90) % 2 ? '#ffffff' : '#ff7a6a',
                    5,
                );
                ctx.globalAlpha = 1;
            }
            const fly = span(t, 2400, 3200);
            if (fly > 0 && fly < 1) {
                const mx = lerp(sx, PILOT.x + 20, fly) + 0,
                    my = lerp(sy, PILOT.y, fly) + Math.sin(fly * 9) * 10 * (1 - fly);
                const ang = Math.atan2(PILOT.y - sy, PILOT.x - sx);
                trail(ctx, mx, my, ang, 18, '#ff7a6a');
                glow(ctx, mx, my, 10, '255,90,90', 0.6);
                ctx.fillStyle = '#ff5a5a';
                ctx.beginPath();
                ctx.moveTo(mx + Math.cos(ang) * 6, my + Math.sin(ang) * 6);
                ctx.lineTo(mx + Math.cos(ang + 2.5) * 4, my + Math.sin(ang + 2.5) * 4);
                ctx.lineTo(mx + Math.cos(ang - 2.5) * 4, my + Math.sin(ang - 2.5) * 4);
                ctx.fill();
                if (fly < 0.2) flash(ctx, sx, sy, fly * 5, '255,140,120');
            }
        },
    },
});
S[8] = signTile(8, {
    // Sagittarius: three aim lines from the arrowhead, then two volleys down them.
    stage: [230, 110],
    dissolveAt: FORM + 1900,
    act: {
        draw(ctx, t, x, y) {
            const [ax, ay] = emitAt(8, 'arrow', x, y);
            const a0 = Math.atan2(PILOT.y - ay, PILOT.x - ax);
            const u = span(t, 0, 900);
            charge(ctx, ax, ay, u, '255,170,210');
            if (u < 1)
                for (let k = -1; k <= 1; k++) dotted(ctx, ax, ay, a0 + k * 0.18, 420, '#ffaad2', 5);
            for (const v of [0, 160]) {
                const f = span(t, 900 + v, 1700 + v);
                if (f > 0 && f < 1) {
                    if (f < 0.2) flash(ctx, ax, ay, f * 5, '255,190,220');
                    for (let k = -1; k <= 1; k++) {
                        const a = a0 + k * 0.18;
                        const px = ax + Math.cos(a) * f * 420,
                            py = ay + Math.sin(a) * f * 420;
                        ctx.fillStyle = '#ffe0ef';
                        band(ctx, px, py, a + Math.PI, 10, 1, '#ffe0ef');
                        spark(ctx, px, py, '#ffaad2', 1);
                    }
                }
            }
        },
    },
});
