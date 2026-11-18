// Storyboard tiles for the dragon's own attacks (`D`) and the signs drawn without it.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { ringPoint, SIGN_RIM } from '../../src/boss/zodiarch/ring.mjs';
import { dotted, band, TAU, dottedRing } from '../../src/boss/draw-kit.mjs';
import {
    span,
    dragon,
    pilot,
    charge,
    PILOT,
    ease,
    flash,
    fireball,
    spark,
    novaStar,
    lerp,
    trail,
    rgb,
    view,
    S,
} from './kit.mjs';

// ---------------------------------------------------------------- the dragon's own
export const D = {};
D.eyes = (ctx, t, clock) => {
    // Eye lasers: the eye kindles, an aim line, then a beam sweeps a short arc toward the pilot.
    const u = span(t, 300, 1200);
    const d = dragon(ctx, clock, { eyeGlow: u, time: t });
    pilot(ctx, t);
    const [ex, ey] = d.eye;
    charge(ctx, ex, ey, u, '255,90,70');
    const a0 = Math.atan2(PILOT.y - 50 - ey, PILOT.x - ex);
    if (u > 0 && u < 1) {
        dotted(ctx, ex, ey, a0, 480, '#ff6a5a', 5);
        dotted(ctx, ex, ey, a0 + 0.45, 480, '#ff6a5a', 9);
    }
    const s = span(t, 1200, 2200);
    if (s > 0 && s < 1) {
        const a = a0 + 0.45 * ease(s);
        for (const off of [0, 0.03]) {
            band(ctx, ex, ey, a + off, 520, 5, '#ff4a3a');
            band(ctx, ex, ey, a + off, 520, 2, '#ffe0d0');
        }
        flash(ctx, ex, ey, span(t, 1200, 1400), '255,120,100');
    }
};
D.fireballs = (ctx, t, clock) => {
    // Fireballs: the jaws glow; three slow fireballs; each splits into five embers.
    const d = dragon(ctx, clock, { mouth: t > 300 && t < 1600, time: t });
    pilot(ctx, t);
    const [mx, my] = d.jaw;
    const u = span(t, 300, 1200);
    charge(ctx, mx, my, u, '255,140,40');
    if (u > 0 && u < 1)
        for (let k = -1; k <= 1; k++) dotted(ctx, mx, my, Math.PI + k * 0.3, 90, '#ffa050', 5);
    for (let k = -1; k <= 1; k++) {
        const a = Math.PI + k * 0.3,
            f = span(t, 1200 + (k + 1) * 150, 2400 + (k + 1) * 150);
        if (f > 0 && f < 1) {
            fireball(ctx, mx + Math.cos(a) * f * 160, my + Math.sin(a) * f * 160, 7 - f * 2);
            if (f < 0.15) flash(ctx, mx, my, f * 7, '255,170,80');
        }
        const e = span(t, 2400 + (k + 1) * 150, 3300 + (k + 1) * 150);
        if (e > 0 && e < 1) {
            const cx = mx + Math.cos(a) * 160,
                cy = my + Math.sin(a) * 160;
            for (let j = 0; j < 5; j++) {
                const b = a + (j - 2) * 0.45;
                spark(ctx, cx + Math.cos(b) * e * 120, cy + Math.sin(b) * e * 120, '#ff9a40', 1);
            }
        }
    }
};
D.novas = (ctx, t, clock) => {
    // Nova stars: both claws fling stars to marked spots; they count down and burst.
    const d = dragon(ctx, clock, { time: t });
    pilot(ctx, t);
    const spots = [
        [180, 70],
        [230, 210],
        [140, 150],
    ];
    spots.forEach((spot, k) => {
        const claw = d.claws[k % 2];
        charge(ctx, claw[0], claw[1], span(t, k * 300, k * 300 + 500), '255,230,160');
        novaStar(ctx, t - 500 - k * 300, claw, spot, '#ffe6a0', k * 0.7);
    });
};
D.blackhole = (ctx, t, clock) => {
    // Black hole: the pearl darkens and flings a singularity well away from the pilot; it
    // pulls (never more than 40% of full thrust) and swallows shots that pass into it.
    const d = dragon(ctx, clock, { pearlGlow: span(t, 0, 600) * (t < 900 ? 1 : 0), time: t });
    const [px, py] = d.pearl;
    const spot = [200, 90];
    const fly = span(t, 900, 1400);
    if (fly > 0 && fly < 1) {
        const x = lerp(px, spot[0], fly),
            y = lerp(py, spot[1], fly) - Math.sin(fly * Math.PI) * 30;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, TAU);
        ctx.fill();
        glow(ctx, x, y, 10, '170,110,255', 0.6);
    }
    const warn = span(t, 1400, 2300);
    if (warn > 0 && warn < 1) {
        for (let k = 0; k < 16; k++) {
            const a = (k / 16) * TAU + t / 300,
                r = 50 * (1 - ((warn * 2 + k / 16) % 1));
            ctx.fillStyle = k % 2 ? '#c8a0ff' : '#ffffff';
            ctx.fillRect(
                Math.round(spot[0] + Math.cos(a) * r),
                Math.round(spot[1] + Math.sin(a) * r),
                1,
                1,
            );
        }
        dottedRing(ctx, spot[0], spot[1], 12, '#ff8a6a', 16, t / 200);
    }
    const live = span(t, 2300, 5300);
    if (live > 0 && live < 1) {
        const r = 10 + 4 * Math.sin(t / 120);
        glow(ctx, spot[0], spot[1], 46, '120,60,220', 0.45);
        for (let k = 0; k < 22; k++) {
            const a = (k / 22) * TAU + t / 260 + (k % 3),
                rr = r + 6 + ((k * 7) % 22);
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = ['#c8a0ff', '#ffffff', '#ffaad2'][k % 3];
            ctx.fillRect(
                Math.round(spot[0] + Math.cos(a) * rr * 1.4),
                Math.round(spot[1] + Math.sin(a) * rr * 0.6),
                2,
                1,
            );
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(spot[0], spot[1], r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffd0ff';
        ctx.beginPath();
        ctx.arc(spot[0], spot[1], r + 1, 0, TAU);
        ctx.stroke();
        // the pilot's shots bend into it and vanish
        for (let k = 0; k < 3; k++) {
            const f = (t / 600 + k / 3) % 1;
            const sx = lerp(PILOT.x + 12, spot[0], f),
                sy = lerp(PILOT.y - 4, spot[1], f * f);
            ctx.fillStyle = '#9fe8ff';
            ctx.fillRect(Math.round(sx), Math.round(sy), 4, 1);
        }
        // the pull, drawn as streaks toward it
        ctx.globalAlpha = 0.5;
        for (let k = 0; k < 6; k++)
            dotted(
                ctx,
                PILOT.x + 30,
                PILOT.y + (k - 3) * 6,
                Math.atan2(spot[1] - PILOT.y, spot[0] - PILOT.x - 30),
                20 + ((t / 30 + k * 7) % 20),
                '#c8a0ff',
                4,
            );
        ctx.globalAlpha = 1;
    }
    pilot(ctx, t);
};
D.meteors = (ctx, t, clock) => {
    // Meteor fall: the tail fan flares and flicks five meteors down curved paths.
    const d = dragon(ctx, clock, { time: t });
    pilot(ctx, t);
    const [tx, ty] = d.tail;
    const u = span(t, 300, 1200);
    charge(ctx, tx, ty, u, '255,214,120');
    const paths = [0, 1, 2, 3, 4].map((k) => ({ vx: -1.2 - k * 0.35, vy: -2.4 + k * 0.3 }));
    if (u > 0 && u < 1)
        for (const p of paths) {
            for (let s = 0; s < 40; s += 3) {
                const x = tx + p.vx * s * 6,
                    y = ty + p.vy * s * 6 + 0.03 * (s * 6) ** 2;
                ctx.fillStyle = '#ffd890';
                if (x > 0 && y < 270) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
            }
        }
    const f = (t - 1200) / 16;
    if (f > 0 && f < 160)
        for (const p of paths) {
            const s = f / 6;
            const x = tx + p.vx * f,
                y = ty + p.vy * f + 0.03 * f ** 2;
            if (x < -10 || y > 280) continue;
            const a = Math.atan2(p.vy + 0.06 * f, p.vx);
            trail(ctx, x, y, a, 22, '#ffb060');
            glow(ctx, x, y, 10, '255,170,80', 0.5);
            spark(ctx, x, y, '#fff0c0', 2);
            void s;
        }
};
D.net = (ctx, t, clock) => {
    // Constellation net: three ring stars kindle; dotted lines join them; the lines turn
    // lethal for 1.5 s. There is always room outside the triangle.
    const d = dragon(ctx, clock, { time: t });
    pilot(ctx, t);
    void d;
    const signs = [9, 11, 1];
    const pts = signs.map((s) => ringPoint(s, clock));
    const u = span(t, 300, 1200);
    pts.forEach(([x, y], k) => {
        glow(ctx, x, y, 8 + 14 * u, rgb(SIGN_RIM[signs[k]]), 0.3 + 0.5 * u);
        spark(ctx, x, y, '#ffffff', 2);
    });
    for (let k = 0; k < 3; k++) {
        const [x0, y0] = pts[k],
            [x1, y1] = pts[(k + 1) % 3];
        const a = Math.atan2(y1 - y0, x1 - x0),
            len = Math.hypot(x1 - x0, y1 - y0);
        if (u > 0 && u < 1)
            dotted(
                ctx,
                x0,
                y0,
                a,
                len * u,
                Math.floor(t / 90) % 2 && u > 0.7 ? '#ffffff' : '#ff8a6a',
                4,
            );
        const live = span(t, 1200, 2700);
        if (live > 0 && live < 1) {
            band(ctx, x0, y0, a, len, 4, '#aaa0ff');
            band(ctx, x0, y0, a, len, 1, '#ffffff');
        }
    }
};
D.breath = (ctx, t, clock) => {
    // Starfire breath (exists): three lanes from the jaws.
    const d = dragon(ctx, clock, { mouth: t > 300, time: t });
    pilot(ctx, t);
    const [mx, my] = d.jaw;
    const u = span(t, 300, 1200);
    charge(ctx, mx, my, u, '255,210,140');
    for (const k of [-1, 0, 1]) {
        const a = Math.PI + k * 0.26 + Math.atan2(PILOT.y - my, -(mx - PILOT.x)) * 0.0;
        if (u > 0 && u < 1) dotted(ctx, mx, my, a, 230, '#ffb080', 5);
        const live = span(t, 1200, 2400);
        if (live > 0 && live < 1) {
            band(ctx, mx, my, a, 230, 10, '#ff7a40');
            band(ctx, mx, my, a, 230, 4, '#ffe6c0');
        }
    }
};
D.phase3 = (ctx, t, clock) => {
    // Phase 3: three signs out at once (a charger, a ranged sign, a field sign), thrown 1.2 s
    // apart, while the dragon keeps up its own fireballs.
    D.fireballs(ctx, t % 3600, clock);
    // Each on its own spot: Sagittarius high, Scorpius low, Aquarius in the middle.
    const tiles = [
        [8, t, -10, -60],
        [7, t - 1200, -40, 75],
        [10, t - 2400, 30, 0],
    ];
    for (const [sign, tt, dx, dy] of tiles)
        if (tt >= 0) {
            ctx.save();
            ctx.translate(dx, dy);
            SIGN_ONLY[sign](ctx, tt % 4200, clock);
            ctx.restore();
        }
};
// The sign tiles, drawn without the dragon again (for the phase 3 composite).
const SIGN_ONLY = {};
for (const k of [7, 8, 10]) {
    SIGN_ONLY[k] = (ctx, t, clock) => {
        const save = view.dragon;
        view.dragon = false;
        S[k](ctx, t, clock);
        view.dragon = save;
    };
}
