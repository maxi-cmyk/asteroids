// Tile: the lunge.

import { drawRing } from '../../src/boss/zodiarch/ring.mjs';
import { band, TAU } from '../../src/boss/draw-kit.mjs';
import { span, ease, GAP, lerp, warnLane, burst, pilot, label } from './kit.mjs';
import { simulate, bodyOf, headOf, drawDragon, local, JAW, BROW } from './body.mjs';

// 6. The lunge, then a double lunge.
const LUNGE = simulate(
    { x: 450, y: 130, heading: Math.PI, v: 0.08 },
    [
        { until: 1200, goal: [355, 140], speed: 0.07, turn: 2, arrive: true, label: '' },
        { until: 9000, goal: [60, 140], speed: 0, turn: 2, label: '' },
    ],
    9000,
);
const L = [
    { warn: 1200, strike: 2100, out: 2350, back: 3250, home: 3850, pilot: [150, 95] },
    { warn: 4300, strike: 5200, out: 5450, back: 5600, home: 6000, pilot: [140, 95], keep: true },
    { warn: 5200, strike: 6100, out: 6350, back: 7250, home: 7850, pilot: [95, 165] },
];
const PULL = 40;
const lungeState = new Map();
export function lunge(ctx, t) {
    const f = LUNGE.frame(t),
        base = (s) => LUNGE.trail.at(s),
        H0 = f.h,
        Hc = H0 - PULL;
    drawRing(ctx, t / 1000, 0, t);
    // Which lunge is in charge of the head now (the latest that has started).
    const cur = L.find((l) => t >= l.warn && t < l.home) ?? null;
    const pyAt = (tt) => {
        let y = 140;
        for (const l of L)
            if (tt >= l.warn)
                y =
                    tt < l.warn + 500
                        ? l.pilot[1]
                        : l.pilot[1] +
                          (l.pilot[1] < 150 ? 70 : -70) * span(tt, l.warn + 500, l.warn + 800);
        return y;
    };
    const py = pyAt(t);
    const P0 = base(Hc);
    let pull = 0,
        reach = 0,
        coilU = 0;
    if (cur) {
        coilU =
            span(t, cur.warn, cur.warn + 600) * (cur.keep ? 1 : 1 - span(t, cur.back, cur.home));
        pull = coilU;
        const full = Math.min(210, (P0[0] - 72 - 120) / Math.max(0.3, -Math.cos(dirOf(cur))));
        reach = full * (ease(span(t, cur.strike, cur.out)) - ease(span(t, cur.back, cur.home)));
        if (t >= cur.out && t < cur.back) reach = full;
        if (t > cur.home) reach = 0;
    }
    function dirOf(l) {
        if (!lungeState.has(l)) lungeState.set(l, null);
        let a = lungeState.get(l);
        if (a == null || t < l.warn) {
            const jaw0 = [P0[0] - 72, P0[1] + 3];
            a = Math.atan2(l.pilot[1] - jaw0[1], l.pilot[0] - jaw0[0]);
            if (t >= l.warn) lungeState.set(l, a);
        }
        return a;
    }
    const dir = cur ? dirOf(cur) : Math.PI;
    // The path: the trail up to the coil point, then straight down the lane.
    const strikeLen = reach;
    const path = (s) => {
        if (s <= Hc) return base(s);
        const d = s - Hc;
        return [P0[0] + Math.cos(dir) * d, P0[1] + Math.sin(dir) * d];
    };
    const h = Hc + strikeLen + PULL * (1 - pull) * (reach > 0 ? 0 : 1);
    const arcOf = (k) => {
        if (k > 8) return H0 - k * GAP;
        return lerp(h, H0 - 8 * GAP, k / 8);
    };
    const segs = bodyOf(reach > 0 ? path : base, h, {
        t,
        still: 1 - coilU,
        arcOf: reach > 0 ? undefined : arcOf,
    });
    // The coil's S in the neck.
    if (coilU > 0 && reach <= 0)
        segs.forEach((s, i) => {
            if (i > 8) return;
            const off = 18 * coilU * Math.sin(((i + 1) * Math.PI) / 4.5);
            s.x += -s.dy * off;
            s.y += s.dx * off;
        });
    const head =
        reach > 0
            ? { x: path(h)[0], y: path(h)[1], heading: dir, ang: dir }
            : headOf(base, h, [py < 0 ? 90 : 90, py], 1);
    if (reach <= 0 && coilU > 0) head.ang = lerp(head.ang, dir, coilU);
    const overU = cur && t >= cur.out && t < cur.back + 300 ? 1 : 0;
    const panting = overU ? Math.round(Math.sin(t / 90)) : 0;
    head.y += panting;
    // Lanes: warned from the jaw at the coil point, 900 ms.
    for (const l of L) {
        if (t < l.warn || t > l.strike + 150) continue;
        const a = dirOf(l),
            jx = P0[0] + Math.cos(a) * 72,
            jy = P0[1] + Math.sin(a) * 72;
        const len = Math.min(210, (P0[0] - 72 - 120) / Math.max(0.3, -Math.cos(a))) + 10;
        if (t < l.strike) {
            warnLane(ctx, jx, jy, a, len, span(t, l.warn, l.strike));
            warnLane(
                ctx,
                jx - Math.sin(a) * 14,
                jy + Math.cos(a) * 14,
                a,
                len,
                span(t, l.warn, l.strike),
            );
            warnLane(
                ctx,
                jx + Math.sin(a) * 14,
                jy - Math.cos(a) * 14,
                a,
                len,
                span(t, l.warn, l.strike),
            );
        } else {
            ctx.globalAlpha = 0.35;
            band(ctx, jx, jy, a, len, 28, '#ff9a7a');
            ctx.globalAlpha = 1;
        }
    }
    const open = overU ? 1 : 0;
    drawDragon(ctx, segs, head, {
        t,
        mouth: coilU > 0.3 && !(t > (cur?.strike ?? 0) + 230 && t < (cur?.back ?? 0)),
        eyeGlow: coilU * (reach > 0 ? 0 : 1),
        pearl: { open },
        rim: open ? '#ff8ad0' : undefined,
    });
    if (cur && t > cur.strike + 230 && t < cur.strike + 400) {
        const [jx, jy] = local(head, JAW[0], JAW[1]);
        burst(ctx, jx, jy, (t - cur.strike - 230) / 170, '#ffffff', 8, 14);
    }
    if (overU) {
        const [qx, qy] = local(head, BROW[0], BROW[1]);
        const left = 1 - span(t, cur.out, cur.back + 300);
        ctx.strokeStyle = '#ff8ad0';
        ctx.beginPath();
        ctx.arc(qx, qy, 11, -Math.PI / 2, -Math.PI / 2 + TAU * left);
        ctx.stroke();
    }
    pilot(ctx, cur ? cur.pilot[0] : 120, py + Math.sin(t / 500) * 2);
    const phase = !cur
        ? 'Stalk, then face you'
        : t < cur.warn + 600
          ? 'Coil: the neck draws back, lane warned'
          : t < cur.strike
            ? 'Warning (900 ms)'
            : t < cur.out
              ? 'Strike!'
              : t < cur.back
                ? 'Overextended: the pearl is open'
                : 'Retract';
    label(ctx, (t >= L[1].warn ? 'Double lunge — ' : '') + phase);
}
