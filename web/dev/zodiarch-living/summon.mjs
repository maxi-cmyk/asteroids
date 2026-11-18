// Tiles: the summon (a beam, the constellation's flight, the reveal) and the conjunction.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import {
    glyphPoints,
    SIGN_RIM,
    CHAINS,
    ringPoint,
    drawRing,
} from '../../src/boss/zodiarch/ring.mjs';
import { drawCreature } from '../../src/boss/zodiarch/creatures.mjs';
import { SIGN_KEY } from '../../src/boss/scene.mjs';
import { TAU, dottedRing, dotted } from '../../src/boss/draw-kit.mjs';
import { lerp, line, px, ease, rgb, art, clamp01, span, bump, pilot, label } from './kit.mjs';
import { simulate, bodyOf, headOf, drawDragon, local, EYE } from './body.mjs';

// 3. The summon: call, wake, flight, form; and the exit in reverse.
const SUMMON_SIGN = 10,
    STAGE = [200, 182];
const CALL = 1000;
// the throw (0 in the plan's timeline)
const SUMMON = simulate(
    { x: 420, y: 170, heading: Math.PI, v: 0.06 },
    [
        { until: CALL - 300, goal: [360, 160], speed: 0.06, turn: 1.9, label: '' },
        { until: CALL + 900, goal: [330, 90], speed: 0.05, turn: 2.4, arrive: true, label: '' },
        { until: 6000, goal: [430, 140], speed: 0.07, turn: 1.9, label: '' },
    ],
    6000,
);
// Stars of the sign's constellation between the ring (u 0) and the creature (u 1), on an arc.
function flyingConstellation(ctx, sign, from, to, u, alpha = 1) {
    const a = glyphPoints(sign, from[0], from[1], 1),
        b = glyphPoints(sign, to[0], to[1], 3);
    const lift = -Math.sin(u * Math.PI) * 50;
    const pts = a.map(([x, y], i) => [lerp(x, b[i][0], u), lerp(y, b[i][1], u) + lift]);
    ctx.globalAlpha = 0.8 * alpha;
    ctx.fillStyle = SIGN_RIM[sign];
    for (const chain of CHAINS[sign])
        for (let i = 1; i < chain.length; i++) line(ctx, pts[chain[i - 1]], pts[chain[i]], 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    for (const [x, y] of pts) {
        px(ctx, x - 1, y, 3, 1);
        px(ctx, x, y - 1, 1, 3);
    }
    ctx.globalAlpha = 1;
    return pts;
}
// The engraving reveal: the strike frame, uncovered by a circle growing from the key star.
function reveal(ctx, sign, x, y, u) {
    const [kx, ky] = [x + SIGN_KEY[sign][0], y + SIGN_KEY[sign][1]];
    const r = 120 * ease(u);
    ctx.save();
    ctx.beginPath();
    ctx.arc(kx, ky, Math.max(0.1, r), 0, TAU);
    ctx.clip();
    glow(ctx, x, y, 46, rgb(SIGN_RIM[sign]), 0.25);
    art.drawEdge(ctx, 'rift', `sign-${sign}-1`, x, y, SIGN_RIM[sign], 0.9);
    art.draw(ctx, 'rift', `sign-${sign}-1`, x, y, { alpha: 0.35 + 0.65 * u });
    ctx.restore();
    if (u < 1) {
        ctx.globalAlpha = 1 - u;
        dottedRing(ctx, kx, ky, r, SIGN_RIM[sign], 64, u * 4);
        ctx.globalAlpha = 1;
    }
    glow(ctx, kx, ky, 8 + 10 * (1 - u), '255,255,255', 0.8 * (1 - u));
}
function summonSign(ctx, t, sign, stage, eye, clock, at = CALL, hold = 2600) {
    const ring = ringPoint(sign, clock);
    const exit = at + 900 + hold;
    // Call: a beam from the eye to the sign on the ring.
    const beam = clamp01(span(t, at - 300, at - 150)) * (1 - span(t, at + 250, at + 400));
    if (beam > 0) {
        ctx.globalAlpha = beam;
        dotted(
            ctx,
            eye[0],
            eye[1],
            Math.atan2(ring[1] - eye[1], ring[0] - eye[0]),
            Math.hypot(ring[0] - eye[0], ring[1] - eye[1]),
            '#fff2c8',
            3,
            1,
        );
        const p = (t / 300) % 1;
        glow(ctx, lerp(eye[0], ring[0], p), lerp(eye[1], ring[1], p), 6, '255,240,200', 0.8);
        ctx.globalAlpha = 1;
    }
    // Wake: the ring sign flares and its lines draw star to star.
    if (t >= at && t < at + 250) {
        const u = span(t, at, at + 250);
        glow(ctx, ring[0], ring[1], 18 + 14 * u, rgb(SIGN_RIM[sign]), 0.6);
        flyingConstellation(ctx, sign, ring, stage, 0, 0.4 + 0.6 * u);
    }
    // The landing mark, from the wake until it has formed.
    if (t >= at && t < at + 900) {
        const u = span(t, at, at + 550);
        ctx.globalAlpha = 0.35 + 0.4 * u;
        dottedRing(
            ctx,
            stage[0] + SIGN_KEY[sign][0],
            stage[1] + SIGN_KEY[sign][1],
            22 - 8 * u,
            SIGN_RIM[sign],
            24,
            t / 300,
        );
        ctx.globalAlpha = 1;
    }
    // Flight: the whole constellation peels off and arcs over, growing; a spark trail.
    if (t >= at + 250 && t < at + 550) {
        const u = ease(span(t, at + 250, at + 550));
        const pts = flyingConstellation(ctx, sign, ring, stage, u);
        for (let k = 1; k <= 5; k++) {
            const w = Math.max(0, u - k * 0.05);
            const [cx, cy] = [
                lerp(ring[0], stage[0], w),
                lerp(ring[1], stage[1], w) - Math.sin(w * Math.PI) * 50,
            ];
            ctx.globalAlpha = 0.5 - k * 0.08;
            ctx.fillStyle = SIGN_RIM[sign];
            px(ctx, cx, cy, 2, 2);
        }
        ctx.globalAlpha = 1;
        void pts;
    }
    // Form: the lines fade as the engraving uncovers itself from the key star.
    if (t >= at + 550 && t < at + 900) {
        const u = span(t, at + 550, at + 900);
        flyingConstellation(ctx, sign, ring, stage, 1, 1 - u);
        reveal(ctx, sign, stage[0], stage[1], u);
    }
    if (t >= at + 900 && t < exit)
        drawCreature(
            ctx,
            art,
            { slot: sign, x: stage[0], y: stage[1], state: 1, r: 1, hp: 3 },
            clock,
            t,
            1,
        );
    // Exit: the reverse.
    if (t >= exit && t < exit + 350)
        reveal(ctx, sign, stage[0], stage[1], 1 - span(t, exit, exit + 350));
    if (t >= exit + 200 && t < exit + 650)
        flyingConstellation(ctx, sign, ring, stage, 1 - ease(span(t, exit + 200, exit + 650)), 1);
    return t >= at && t < exit + 650;
}
export function summon(ctx, t) {
    const f = SUMMON.frame(t),
        path = (s) => SUMMON.trail.at(s),
        clock = t / 1000;
    const out = t >= CALL && t < CALL + 900 + 2600 + 650 ? 1 << SUMMON_SIGN : 0;
    drawRing(ctx, clock, out, t);
    const segs = bodyOf(path, f.h, { t, still: clamp01(1 - f.v / 0.03) });
    const head = headOf(path, f.h, ringPoint(SUMMON_SIGN, clock), 1);
    drawDragon(ctx, segs, head, {
        t,
        mouth: t > CALL - 300 && t < CALL + 400,
        eyeGlow: bump(t, CALL - 350, CALL + 400),
    });
    summonSign(ctx, t, SUMMON_SIGN, STAGE, local(head, EYE[0], EYE[1]), clock);
    pilot(ctx, 70, 150 + Math.sin(t / 500) * 3);
    const phase =
        t < CALL - 300
            ? ''
            : t < CALL
              ? 'Call: it rears, a beam to the sign'
              : t < CALL + 250
                ? 'Wake: the sign flares on the ring'
                : t < CALL + 550
                  ? 'Flight: the constellation arcs over'
                  : t < CALL + 900
                    ? 'Form: the engraving uncovers from the key star'
                    : t < CALL + 3500
                      ? 'Alive'
                      : 'Exit: the reverse, home to the ring';
    label(ctx, phase);
}
// 4. The conjunction: three beams at once.
const CONJ = [
    [1, [215, 50]],
    [7, [150, 150]],
    [10, [225, 228]],
];
export function conjunction(ctx, t) {
    const f = SUMMON.frame(Math.min(t, 1500)),
        path = (s) => SUMMON.trail.at(s),
        clock = t / 1000;
    let out = 0;
    for (const [s] of CONJ) if (t >= CALL && t < CALL + 3500 + 650) out |= 1 << s;
    drawRing(ctx, clock, out, t);
    const segs = bodyOf(path, f.h, { t, still: 1 });
    const head = headOf(path, f.h, [118, 30], 1);
    drawDragon(ctx, segs, head, {
        t,
        mouth: t > CALL - 300 && t < CALL + 400,
        eyeGlow: bump(t, CALL - 350, CALL + 400),
    });
    if (t > CALL - 300 && t < CALL + 300)
        glow(
            ctx,
            ...local(head, EYE[0], EYE[1]),
            30,
            '255,240,200',
            0.5 * bump(t, CALL - 300, CALL + 300),
        );
    for (const [sign, stage] of CONJ)
        summonSign(ctx, t, sign, stage, local(head, EYE[0], EYE[1]), clock);
    pilot(ctx, 60, 150 + Math.sin(t / 500) * 3);
    label(
        ctx,
        t >= CALL - 300 && t < CALL + 900
            ? 'Great Conjunction: three beams, three signs'
            : 'Great Conjunction',
    );
}
