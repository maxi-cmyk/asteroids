// Creature states, drawing a figure: the figure itself, its key star, the pilot's shot and
// the hurt pose.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { SIGN_RIM } from '../../src/boss/zodiarch/ring.mjs';
import { SIGN_KEY } from '../../src/boss/scene.mjs';
import { flash, rgb, art, lerp, PILOT } from './kit.mjs';

// The strike frame, transformed, with its glow and edge; `clip` limits it to a polygon.
export function figure(
    ctx,
    sign,
    x,
    y,
    { partner = false, rot = 0, sx = 1, alpha = 1, flash = 0, edge = SIGN_RIM[sign], clip } = {},
) {
    const key = `sign-${sign}${partner ? 'b' : ''}-1`;
    ctx.save();
    if (clip) {
        ctx.beginPath();
        clip.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.clip();
    }
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sx, 1);
    ctx.translate(-x, -y);
    if (!clip) glow(ctx, x, y, 46, rgb(SIGN_RIM[sign].slice(1)), 0.22 * alpha);
    art.drawEdge(ctx, 'rift', key, x, y, edge, 0.75 * alpha);
    art.draw(ctx, 'rift', key, x, y, { alpha, flash });
    ctx.restore();
}
export function keyStar(ctx, sign, x, y, t) {
    const [kx, ky] = SIGN_KEY[sign];
    const on = Math.floor(t / 160) % 3 !== 0;
    ctx.fillStyle = on ? '#ffffff' : SIGN_RIM[sign];
    ctx.fillRect(Math.round(x + kx) - 2, Math.round(y + ky), 5, 1);
    ctx.fillRect(Math.round(x + kx), Math.round(y + ky) - 2, 1, 5);
}
export function playerShot(ctx, t, at, [tx, ty]) {
    const u = (t - (at - 250)) / 250;
    if (u < 0 || u >= 1) return;
    const px = lerp(PILOT.x + 10, tx, u),
        py = lerp(PILOT.y, ty, u);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(Math.round(px) - 3, Math.round(py), 5, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px) + 1, Math.round(py), 2, 1);
}
// Hurt: the flinch away from the hit, plus each sign's own reaction (0..1, eased out).
export function hurtPose(sign, h) {
    const e = Math.sin(Math.min(1, h) * Math.PI) * (1 - h * 0.3);
    const o = { dx: 2 * e, dy: 0, rot: 0, sx: 1, pdx: 0, pdy: 0, prot: 0 };
    switch (sign) {
        case 0:
            o.rot = 0.07 * e;
            break; // head jerks up
        case 1:
            o.dy = -3 * Math.sin(h * Math.PI * 3) * (1 - h);
            break; // stamps
        case 2:
            o.dx = 4 * e;
            o.rot = 0.06 * e;
            o.pdx = -1.5 * e;
            break; // the hit twin staggers
        case 3:
            o.sx = 1 - 0.07 * e;
            break; // claws pull in to guard
        case 4:
            o.rot = 0.05 * e;
            break; // snarl
        case 5:
            o.rot = -0.05 * e;
            break; // turns away
        case 6:
            o.rot = 0.1 * Math.sin(h * 14) * (1 - h);
            break; // the beam rocks
        case 7:
            o.rot = -0.04 * e;
            o.sx = 1 - 0.04 * e;
            break; // tail curls in
        case 8:
            o.rot = 0.12 * e;
            o.dy = -3 * e;
            break; // rears
        case 9:
            o.dy = 7 * e;
            break; // ducks
        case 10:
            o.rot = 0.05 * e;
            break; // water spills (drawn below)
        case 11:
            o.dx = 0;
            o.pdx = 2 * e;
            o.pdy = 12 * e;
            break; // the hit fish (the lower) darts aside
    }
    return o;
}
