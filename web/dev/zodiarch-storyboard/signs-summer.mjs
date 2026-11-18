// Storyboard tiles for the summer signs: Cancer, Leo and Virgo.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { TAU, band, dottedRing, dotted } from '../../src/boss/draw-kit.mjs';
import {
    S,
    signTile,
    FORM,
    emitAt,
    PILOT,
    span,
    charge,
    warnLane,
    ease,
    spark,
    flash,
    sun,
    lerp,
    trail,
    novaStar,
} from './kit.mjs';

S[3] = signTile(3, {
    // Cancer: its claws shoot out on tethers down two lanes at the pilot's column and snap back.
    stage: [210, 120],
    dissolveAt: FORM + 2300,
    act: {
        draw(ctx, t, x, y) {
            for (const [k, name] of ['claw_near', 'claw_far'].entries()) {
                const [cx, cy] = emitAt(3, name, x, y);
                const tx = PILOT.x + 40 + k * 70,
                    ty = k ? 260 : 10;
                const a = Math.atan2(ty - cy, tx - cx),
                    len = Math.hypot(tx - cx, ty - cy);
                const u = span(t, k * 200, k * 200 + 900);
                charge(ctx, cx, cy, u, '180,232,210');
                warnLane(ctx, cx, cy, a, len, u, '#b4e6d2');
                const out = span(t, k * 200 + 900, k * 200 + 1200),
                    back = span(t, k * 200 + 1400, k * 200 + 1800);
                const reach = len * ease(out) * (1 - ease(back));
                if (reach > 1) {
                    ctx.strokeStyle = '#b4e6d2';
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    const px = cx + Math.cos(a) * reach,
                        py = cy + Math.sin(a) * reach;
                    glow(ctx, px, py, 12, '180,232,210', 0.5);
                    spark(ctx, px, py, '#dffff0', 3);
                }
            }
        },
    },
});
S[4] = signTile(4, {
    // Leo: no charge glow until it means to pounce. The roar: the mane flares and the head
    // shudders, then the ring (one notch). Its shots are suns shed from the mane: three bud,
    // hover spinning with short aim ticks, and are tossed off one by one with a jerk of the
    // head. Only then the crouch: it draws back and down, the eye glints, the lane is warned,
    // and it pounces all the way across.
    stage: [235, 125],
    dissolveAt: FORM + 4100,
    act: {
        motion: (t, [sx, sy]) => {
            if (t < 900)
                return { x: sx + (Math.floor(t / 45) % 2 ? 1 : -1) * span(t, 200, 900), y: sy };
            if (t < 2400) {
                let toss = 0;
                for (let k = 0; k < 3; k++)
                    toss += Math.max(0, 1 - Math.abs(t - (1900 + k * 180)) / 70) * 4;
                return { x: sx - toss, y: sy };
            }
            const crouch = ease(span(t, 2400, 2800));
            const cx = sx + 12 * crouch,
                cy = sy + 6 * crouch;
            if (t < 3300) return { x: cx, y: cy };
            const a = Math.atan2(PILOT.y - cy, PILOT.x - cx),
                u = (t - 3300) * 0.8;
            return { x: cx + Math.cos(a) * u, y: cy + Math.sin(a) * u };
        },
        draw(ctx, t, x, y) {
            const [mx, my] = emitAt(4, 'mouth', x, y);
            const [nx, ny] = emitAt(4, 'mane', x, y);
            // The roar's tell: the mane flares, sound arcs leave the jaws (no gathering light).
            const tell = span(t, 0, 900);
            if (tell > 0 && tell < 1) {
                for (let k = 0; k < 14; k++) {
                    const a = (k / 14) * TAU + Math.sin(t / 60 + k) * 0.08,
                        r0 = 16,
                        r1 = r0 + 4 + 10 * tell * (k % 2 ? 0.6 : 1);
                    ctx.globalAlpha = 0.5 + 0.4 * tell;
                    band(
                        ctx,
                        nx + Math.cos(a) * r0,
                        ny + Math.sin(a) * r0,
                        a,
                        r1 - r0,
                        1,
                        k % 3 ? '#ffd25a' : '#fff0b0',
                    );
                }
                ctx.globalAlpha = 1;
                for (let k = 0; k < 3; k++) {
                    const r = 6 + ((tell * 3 + k / 3) % 1) * 26;
                    ctx.globalAlpha = 1 - r / 32;
                    ctx.strokeStyle = '#ffd25a';
                    ctx.beginPath();
                    ctx.arc(mx, my, r, Math.PI - 0.6, Math.PI + 0.6);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                ctx.globalAlpha = 0.5;
                dottedRing(ctx, mx, my, 40, '#ffd25a', 56, 0, { a: Math.PI + 0.3, half: 0.32 });
                ctx.globalAlpha = 1;
            }
            const ring = span(t, 900, 1900);
            if (ring > 0 && ring < 1) {
                const r = 20 + ring * 260;
                ctx.globalAlpha = 1 - ring * 0.6;
                dottedRing(ctx, mx, my, r, '#ffd25a', Math.round(r * 1.4), 0, {
                    a: Math.PI + 0.3,
                    half: 0.32,
                });
                ctx.globalAlpha = 1;
            }
            // Suns shed from the mane.
            for (let k = 0; k < 3; k++) {
                const a0 = -2.5 + k * 0.7;
                const bud = span(t, 1200 + k * 120, 1600 + k * 120),
                    launch = 1900 + k * 180;
                if (bud <= 0) continue;
                const hx = nx + Math.cos(a0) * (14 + 14 * ease(bud)),
                    hy = ny + Math.sin(a0) * (14 + 14 * ease(bud));
                const aim = Math.atan2(PILOT.y - hy, PILOT.x - hx) + (k - 1) * 0.22;
                let px = hx,
                    py = hy;
                if (t >= launch) {
                    const d = (t - launch) * 0.32;
                    if (d > 420) continue;
                    px = hx + Math.cos(aim) * d;
                    py = hy + Math.sin(aim) * d;
                    for (let f = 1; f <= 6; f++) {
                        ctx.globalAlpha = 0.6 - f * 0.09;
                        ctx.fillStyle = f < 3 ? '#ffd25a' : '#ff7a30';
                        const wob = Math.sin(t / 40 + f) * f * 0.5;
                        ctx.fillRect(
                            Math.round(px - Math.cos(aim) * f * 3 - Math.sin(aim) * wob) - 1,
                            Math.round(py - Math.sin(aim) * f * 3 + Math.cos(aim) * wob) - 1,
                            3,
                            3,
                        );
                    }
                    ctx.globalAlpha = 1;
                    if (t - launch < 150) flash(ctx, hx, hy, (t - launch) / 150, '255,220,120');
                } else {
                    ctx.globalAlpha = 0.6 * bud;
                    dotted(ctx, hx, hy, aim, 26, '#ffd25a', 4);
                    ctx.globalAlpha = 1;
                }
                sun(ctx, px, py, t / 90 + k, bud);
            }
            // Only now the charge: the crouch, the eye glints, the lane is warned.
            if (t >= 2400 && t < 3300) {
                const [ex, ey] = emitAt(4, 'eye', x, y);
                charge(ctx, ex, ey, span(t, 2400, 3300), '255,210,90');
                const a = Math.atan2(PILOT.y - y, PILOT.x - x);
                warnLane(ctx, x - 40, y, a, 520, span(t, 2400, 3300), '#ffd25a');
                ctx.globalAlpha = 0.5;
                for (let k = 0; k < 4; k++)
                    spark(ctx, x + 30 + k * 6, y + 40 + ((k * 3) % 4), '#ffc070', 1);
                ctx.globalAlpha = 1;
            }
            if (t >= 3300) {
                const a = Math.atan2(PILOT.y - y, PILOT.x - x);
                for (let k = 1; k <= 6; k++) {
                    ctx.globalAlpha = 0.5 - k * 0.07;
                    band(
                        ctx,
                        x - Math.cos(a) * k * 14,
                        y - Math.sin(a) * k * 14 + 20,
                        a,
                        12,
                        2,
                        '#ffd25a',
                    );
                }
                ctx.globalAlpha = 1;
            }
        },
    },
});
S[5] = signTile(5, {
    // Virgo: throws four seeds from her hand on arcs; each sprouts and fires one needle; then
    // Spica on her wheat ear is flung as a nova star.
    stage: [230, 110],
    dissolveAt: FORM + 3600,
    act: {
        draw(ctx, t, x, y) {
            const [hx, hy] = emitAt(5, 'hand', x, y);
            const spots = [
                [220, 60],
                [250, 200],
                [300, 120],
                [190, 150],
            ];
            spots.forEach(([sx, sy], k) => {
                const fly = span(t, k * 250, k * 250 + 500);
                if (fly > 0 && fly < 1) {
                    const px = lerp(hx, sx, fly),
                        py = lerp(hy, sy, fly) - Math.sin(fly * Math.PI) * 40;
                    spark(ctx, px, py, '#c8f08c', 1);
                    if (fly < 0.2) flash(ctx, hx, hy, fly * 5, '200,240,140');
                }
                if (fly >= 1) {
                    const grow = span(t, k * 250 + 500, k * 250 + 800);
                    ctx.fillStyle = '#c8f08c';
                    ctx.fillRect(sx - 1, sy - Math.round(6 * grow), 2, Math.round(6 * grow) + 1);
                    const a = Math.atan2(PILOT.y - sy, PILOT.x - sx);
                    const aim = span(t, k * 250 + 800, k * 250 + 1300);
                    if (aim > 0 && aim < 1) dotted(ctx, sx, sy - 6, a, 200, '#ff8a6a', 5);
                    const shot = span(t, k * 250 + 1300, k * 250 + 1900);
                    if (shot > 0 && shot < 1) {
                        const nx = sx + Math.cos(a) * shot * 200,
                            ny = sy - 6 + Math.sin(a) * shot * 200;
                        trail(ctx, nx, ny, a, 10, '#c8f08c');
                        spark(ctx, nx, ny, '#efffd0', 1);
                    }
                }
            });
            novaStar(ctx, t - 1800, emitAt(5, 'wheat', x, y), [200, 230], '#c8f08c');
        },
    },
});
