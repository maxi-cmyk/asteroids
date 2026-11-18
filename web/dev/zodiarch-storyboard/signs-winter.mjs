// Storyboard tiles for the winter signs: Capricornus, Aquarius and Pisces.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { TAU, dotted, dottedRing } from '../../src/boss/draw-kit.mjs';
import {
    S,
    signTile,
    FORM,
    span,
    clamp01,
    PILOT,
    flash,
    trail,
    spark,
    emitAt,
    charge,
    ease,
    lerp,
    warnLane,
} from './kit.mjs';

S[9] = signTile(9, {
    // Capricornus: a short, hard dive; the splash is the event: a white flash, a crown and
    // column of spray, ripples running out along the bottom while the fan of lanes it will
    // fire down flickers; then two waves of stars burst up and out in every direction from
    // the splash (each with a gap), and the sea-goat leaps back up through its own spray.
    stage: [210, 140],
    dissolveAt: FORM + 2400,
    lingers: true,
    act: {
        motion: (t, [sx, sy]) => {
            if (t < 350) {
                const u = t / 350;
                return { x: sx - 10 * u, y: sy + u * u * 190 };
            }
            if (t < 1000) return { x: sx - 10, y: sy + 190 };
            return { x: sx - 10, y: sy + 190 - (1 - (1 - span(t, 1000, 1500)) ** 3) * 190 };
        },
        draw(ctx, t, x, y, d, gone) {
            const SX = 200,
                SY = 266;
            const since = t - 330;
            if (since > 0 && since < 1600) {
                // The flash and the column.
                const f = clamp01(since / 500);
                glow(ctx, SX, SY, 30 + 50 * f, '200,230,255', 0.9 * (1 - f));
                if (since < 700) {
                    const h = 120 * Math.sin(Math.min(1, since / 700) * Math.PI);
                    ctx.globalAlpha = 0.55 * (1 - since / 700);
                    ctx.fillStyle = '#cfe6ff';
                    ctx.fillRect(SX - 8, SY - h, 16, h);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(SX - 3, SY - h, 6, h);
                    ctx.globalAlpha = 1;
                }
                // The crown and the spray: droplets thrown up that fall back.
                for (let k = 0; k < 30; k++) {
                    const a = -Math.PI / 2 + (k / 29 - 0.5) * 2.4,
                        v = 0.22 + ((k * 37) % 11) / 30;
                    const px = SX + Math.cos(a) * v * since,
                        py = SY + Math.sin(a) * v * since + 0.00045 * since * since;
                    if (py > SY + 4) continue;
                    ctx.globalAlpha = 1 - since / 1600;
                    ctx.fillStyle = k % 3 ? '#a0c8ff' : '#ffffff';
                    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
                }
                ctx.globalAlpha = 1;
                // Ripples along the bottom.
                for (let k = 0; k < 3; k++) {
                    const r = clamp01((since - k * 150) / 900);
                    if (r <= 0 || r >= 1) continue;
                    ctx.globalAlpha = 1 - r;
                    ctx.strokeStyle = '#a0c8ff';
                    ctx.beginPath();
                    ctx.ellipse(SX, SY, 12 + r * 170, 3 + r * 14, 0, Math.PI, TAU);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
            // The fan it will fire down: 15 lanes over the upper half-plane, one gap.
            const N = 15,
                lanes = (off) =>
                    [...Array(N).keys()].map(
                        (k) => Math.PI + 0.12 + ((Math.PI - 0.24) * (k + off)) / (N - 1),
                    );
            const pilotA = Math.atan2(PILOT.y - SY, PILOT.x - SX);
            const gapOf = (as) =>
                as.reduce(
                    (b, a, k) => (Math.abs(a - pilotA) < Math.abs(as[b] - pilotA) ? k : b),
                    0,
                );
            const warn = span(t, 380, 1000);
            if (warn > 0 && warn < 1) {
                const as = lanes(0),
                    gap = gapOf(as);
                as.forEach((a, k) => {
                    if (k === gap) return;
                    ctx.globalAlpha = 0.35 + 0.4 * warn;
                    dotted(
                        ctx,
                        SX,
                        SY,
                        a,
                        40 + 120 * warn,
                        Math.floor(t / 80) % 2 && warn > 0.6 ? '#ffffff' : '#a0c8ff',
                        5,
                    );
                });
                ctx.globalAlpha = 1;
            }
            for (const [w, start, off] of [
                [0, 1000, 0],
                [1, 1280, 0.5],
            ]) {
                const f = t - start;
                if (f < 0 || f > 1500) continue;
                if (f < 160) flash(ctx, SX, SY - 4, f / 160, '220,240,255');
                const as = lanes(off),
                    gap = gapOf(as);
                as.forEach((a, k) => {
                    if (k === gap || (w && k === Math.min(N - 1, gap + 1))) return;
                    const dist = f * (w ? 0.24 : 0.32);
                    const px = SX + Math.cos(a) * dist,
                        py = SY + Math.sin(a) * dist;
                    trail(ctx, px, py, a, 12, '#a0c8ff');
                    spark(ctx, px, py, w ? '#cfe6ff' : '#a0c8ff', 2);
                });
            }
            (void x, y, d, gone);
        },
    },
});
S[10] = signTile(10, {
    // Aquarius: the urn tips and pours a wavering stream; each star droplet slows and hangs in
    // the air, then fuses: its two motes spiral together, it swells and burns from blue to
    // white to gold under a closing warning ring, and bursts into six sparks.
    stage: [235, 140],
    dissolveAt: FORM + 2300,
    lingers: true,
    act: {
        draw(ctx, t, x, y, d, gone) {
            const [ux, uy] = gone ? [230, 98] : emitAt(10, 'urn', x, y);
            const a = Math.atan2(PILOT.y - uy, PILOT.x - ux);
            const u = span(t, 0, 600);
            if (!gone) charge(ctx, ux, uy, u, '110,200,255');
            if (u > 0 && u < 1) dotted(ctx, ux, uy, a, 260, '#6ec8ff', 5);
            if (t > 600 && t < 1800 && !gone) glow(ctx, ux, uy, 14, '110,200,255', 0.6);
            const lerpC = (c0, c1, f) =>
                c0.map((v, i) => Math.round(v + (c1[i] - v) * f)).join(',');
            for (let k = 0; k < 12; k++) {
                const born = 600 + k * 95,
                    f = t - born;
                if (f < 0) continue;
                const reach = 70 + ((k * 53) % 5) * 34 + (k % 2) * 12;
                const fly = clamp01(f / 650),
                    dist = reach * (1 - (1 - fly) ** 2);
                const wave = Math.sin(dist / 18 + k) * 12 * (0.4 + fly);
                const px = ux + Math.cos(a) * dist - Math.sin(a) * wave,
                    py =
                        uy +
                        Math.sin(a) * dist +
                        Math.cos(a) * wave +
                        (fly < 1 ? 0 : Math.sin(t / 300 + k) * 1.5);
                const fuse = clamp01((f - 650) / 1100);
                const pop = f - 1750;
                if (pop >= 0) {
                    const e = clamp01(pop / 500);
                    if (e >= 1) continue;
                    glow(ctx, px, py, 8 + 20 * (1 - e), '255,220,140', 0.8 * (1 - e));
                    for (let s = 0; s < 6; s++) {
                        const sa = (s / 6) * TAU + k;
                        spark(
                            ctx,
                            px + Math.cos(sa) * e * 60,
                            py + Math.sin(sa) * e * 60,
                            '#ffe6a0',
                            1,
                        );
                    }
                    continue;
                }
                if (fly < 1) {
                    trail(ctx, px, py, a, 10, '#6ec8ff');
                    spark(ctx, px, py, '#bfe8ff', 2);
                    continue;
                }
                // Fusion.
                const col =
                    fuse < 0.5
                        ? lerpC([110, 200, 255], [255, 255, 255], fuse * 2)
                        : lerpC([255, 255, 255], [255, 200, 90], fuse * 2 - 1);
                const flick = Math.floor(t / (fuse > 0.7 ? 45 : 110)) % 2;
                glow(ctx, px, py, 6 + 10 * fuse, col, 0.35 + 0.35 * fuse + 0.15 * flick);
                const orb = 6 * (1 - fuse) + 0.5,
                    spin = t / (120 - 80 * fuse) + k;
                ctx.fillStyle = `rgb(${col})`;
                for (const side of [0, Math.PI])
                    ctx.fillRect(
                        Math.round(px + Math.cos(spin + side) * orb) - 1,
                        Math.round(py + Math.sin(spin + side) * orb) - 1,
                        2,
                        2,
                    );
                const r = Math.round(1 + 2 * fuse);
                ctx.fillStyle = flick ? '#ffffff' : `rgb(${col})`;
                ctx.fillRect(Math.round(px) - r + 1, Math.round(py) - r + 1, r * 2 - 1, r * 2 - 1);
                ctx.globalAlpha = 0.6;
                dottedRing(
                    ctx,
                    px,
                    py,
                    16 * (1 - fuse) + 5,
                    fuse > 0.7 && flick ? '#ffffff' : '#ffb070',
                    12,
                    t / 400,
                );
                ctx.globalAlpha = 1;
            }
        },
    },
});
// Pisces: the fish part as wide as the field allows (just inside the top and bottom), the
// cord between them slack and harmless: the gap is the way through. They swim the length
// of the field, turn, close in, and on the way back the cord pulls taut and lights: the gap
// is filled, and the way round is outside the fish.
const PISCES = {
    y: (u) => {
        const part = ease(span(u, 0, 900)),
            close = ease(span(u, 2300, 2900));
        return [lerp(lerp(110, 40, part), 96, close), lerp(lerp(190, 230, part), 176, close)];
    },
    x: (u) =>
        u < 2300
            ? lerp(250, 30, ease(span(u, 900, 2300)))
            : lerp(30, 360, ease(span(u, 2700, 4300))),
};
S[11] = signTile(11, {
    stage: [250, 110],
    dissolveAt: FORM + 4300,
    pilotY: (u) => lerp(PILOT.y, 232, ease(span(u, 2300, 3000))),
    partner: (t) => {
        const u = Math.max(0, t - FORM);
        return { x: PISCES.x(u) + 6, y: PISCES.y(u)[1] };
    },
    act: {
        motion: (u) => ({ x: PISCES.x(u), y: PISCES.y(u)[0], flip: u < 2300 }), // the art faces right
        draw(ctx, u, x) {
            const [ya, yb] = PISCES.y(u),
                xb = x + 6;
            const back = u >= 2300 ? -1 : 1; // which way is behind them
            const ta = [x + back * 26, ya],
                tb = [xb + back * 26, yb];
            const taut = span(u, 2400, 3300),
                live = u >= 3300;
            const sag = back * lerp(46, 6, taut);
            ctx.lineWidth = live ? 3 : 1;
            ctx.setLineDash(live ? [] : [3, 3]);
            ctx.globalAlpha = live ? 1 : 0.45 + 0.4 * taut;
            ctx.strokeStyle = live
                ? '#aaa0ff'
                : taut > 0 && Math.floor(u / 90) % 2
                  ? '#ffffff'
                  : '#8a80d0';
            ctx.beginPath();
            ctx.moveTo(...ta);
            ctx.quadraticCurveTo((ta[0] + tb[0]) / 2 + sag, (ya + yb) / 2, ...tb);
            ctx.stroke();
            if (live) {
                ctx.strokeStyle = '#f0ecff';
                ctx.lineWidth = 1;
                ctx.stroke();
                glow(ctx, (ta[0] + tb[0]) / 2, (ya + yb) / 2, 22, '170,160,255', 0.45);
            }
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
            ctx.globalAlpha = 1;
            // Warned lanes for the fish themselves, ahead of them.
            if (u < 900 || (u >= 2300 && u < 3000)) {
                const dir = u < 900 ? Math.PI : 0;
                for (const [fx, fy] of [
                    [x, ya],
                    [xb, yb],
                ])
                    warnLane(
                        ctx,
                        fx - back * 30,
                        fy,
                        dir,
                        300,
                        u < 900 ? span(u, 0, 900) : span(u, 2300, 3000),
                        '#aaa0ff',
                    );
            }
            // Bubbles off the tails while they swim.
            for (const [fx, fy] of [ta, tb])
                for (let k = 0; k < 3; k++) {
                    const b = (u / 400 + k / 3) % 1;
                    ctx.globalAlpha = 0.6 * (1 - b);
                    ctx.fillStyle = '#c8c0ff';
                    ctx.fillRect(Math.round(fx + back * b * 14), Math.round(fy - b * 6 + k), 1, 1);
                }
            ctx.globalAlpha = 1;
        },
    },
});
