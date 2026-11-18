// Creature states, one sign's tile: idle, hurt, broken, gone.

import { SIGN_RIM } from '../../src/boss/zodiarch/ring.mjs';
import { drawCreature } from '../../src/boss/zodiarch/creatures.mjs';
import { SIGN_KEY } from '../../src/boss/scene.mjs';
import { dragon, FORM, pilot, art, ease, clamp01, emitAt, flash } from './kit.mjs';
import { STAGE, PARTNER_AT, ST, idle, HURT_AT, seeded } from './states-data.mjs';
import { hurtPose, playerShot, figure, keyStar } from './states-pose.mjs';
import { breakFigure } from './states-break.mjs';

export function statesTile(sign) {
    const [x0, y0] = STAGE[sign],
        pAt = PARTNER_AT[sign];
    const draw = (ctx, t, clock) => {
        const d = dragon(ctx, clock, {
            mouth: t < FORM,
            out: t < ST.breakAt + 250 ? 1 << sign : 0,
            time: t,
        });
        pilot(ctx, t);
        if (t < FORM) {
            drawCreature(
                ctx,
                art,
                { slot: sign, x: x0, y: y0, state: 0, r: ease(t / FORM) },
                clock,
                t,
            );
            if (pAt)
                drawCreature(
                    ctx,
                    art,
                    { slot: sign, x: x0 + pAt[0], y: y0 + pAt[1], state: 0, r: ease(t / FORM) },
                    clock,
                    t,
                    1,
                    true,
                );
            return d;
        }
        const hurt = clamp01((t - ST.hurtAt) / 550);
        const hurting = t >= ST.hurtAt && hurt < 1;
        const o = idle(ctx, sign, t, x0, y0, false);
        if (hurting) {
            const h = hurtPose(sign, hurt);
            for (const k of Object.keys(h)) o[k] += k === 'sx' ? h[k] - 1 : h[k];
        }
        const x = x0 + o.dx,
            y = y0 + o.dy;
        const [hx, hy] = HURT_AT[sign];
        playerShot(ctx, t, ST.hurtAt, [x0 + hx, y0 + hy]);
        const [kx, ky] = SIGN_KEY[sign];
        playerShot(ctx, t, ST.breakAt, [x0 + kx, y0 + ky]);
        if (t < ST.breakAt) {
            // Pisces: the cord between the fish ripples.
            if (sign === 11) {
                ctx.strokeStyle = '#8a80d0';
                ctx.globalAlpha = 0.6;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(x + 26, y);
                ctx.quadraticCurveTo(
                    x + 50 + 8 * Math.sin(t / 200),
                    y + 30,
                    x0 + pAt[0] + o.pdx + 26,
                    y0 + pAt[1] + o.pdy,
                );
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }
            // Gemini: a thread of light between the twins' hands.
            if (sign === 2) {
                const [ax, ay] = emitAt(2, 'hand', x, y),
                    [bx, by] = emitAt(2, 'b_hand', x0 + pAt[0] + o.pdx, y0 + pAt[1]);
                ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t / 150);
                ctx.strokeStyle = '#8cdcff';
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            const fl = hurting ? 0.45 * Math.max(0, 1 - hurt * 4) : 0;
            const edge =
                hurting && hurt < 0.45 && Math.floor(hurt * 12) % 2 === 0
                    ? '#ffffff'
                    : SIGN_RIM[sign];
            const hitPartner = sign === 11; // the lower fish takes the hit in Pisces
            figure(ctx, sign, x, y, {
                rot: o.rot,
                sx: o.sx,
                flash: hitPartner ? 0 : fl,
                edge: hitPartner ? SIGN_RIM[sign] : edge,
            });
            if (pAt)
                figure(ctx, sign, x0 + pAt[0] + o.pdx, y0 + pAt[1] + o.pdy, {
                    partner: true,
                    rot: o.prot,
                    flash: hitPartner ? fl : 0,
                    edge: hitPartner ? edge : SIGN_RIM[sign],
                });
            idle(ctx, sign, t, x0, y0, true);
            keyStar(ctx, sign, x, y, t);
            if (t >= ST.hurtAt) {
                // Stars spill from the hit point and fall away.
                const u = clamp01((t - ST.hurtAt) / 900),
                    r = seeded(sign);
                if (u < 1)
                    for (let k = 0; k < 9; k++) {
                        const a = Math.PI + (r() - 0.5) * 2.2,
                            v = 18 + r() * 26;
                        ctx.globalAlpha = 1 - u;
                        ctx.fillStyle = k % 3 ? SIGN_RIM[sign] : '#ffffff';
                        ctx.fillRect(
                            Math.round(x0 + hx + Math.cos(a) * v * u),
                            Math.round(y0 + hy + Math.sin(a) * v * u + 20 * u * u),
                            1,
                            1,
                        );
                    }
                if (u < 0.25) flash(ctx, x0 + hx, y0 + hy, u * 4, '255,255,255');
                // Aquarius spills water from the urn when hit.
                if (sign === 10 && u < 1) {
                    const [ux, uy] = emitAt(10, 'urn', x, y);
                    for (let k = 0; k < 6; k++) {
                        ctx.globalAlpha = 1 - u;
                        ctx.fillStyle = '#6ec8ff';
                        ctx.fillRect(
                            Math.round(ux - 8 - k * 2),
                            Math.round(uy + u * 60 + k * 5),
                            1,
                            2,
                        );
                    }
                }
                ctx.globalAlpha = 1;
            }
            return d;
        }
        breakFigure(ctx, sign, t - ST.breakAt, x0, y0, pAt, clock);
        return d;
    };
    return draw;
}
