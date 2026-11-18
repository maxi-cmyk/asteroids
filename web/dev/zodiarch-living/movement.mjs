// Tiles: today's loop beside the living, steered swim.

import { drawRing } from '../../src/boss/zodiarch/ring.mjs';
import { segmentKey } from '../../src/boss/zodiarch/dragon.mjs';
import { zodiarchPath } from '../../src/boss/scene.mjs';
import { TAU } from '../../src/boss/draw-kit.mjs';
import {
    GAP,
    art,
    wrap,
    note,
    clamp,
    pilot,
    label,
    DT,
    bump,
    clamp01,
    ease,
    span,
    px,
    bullet,
    lerp,
    burst,
} from './kit.mjs';
import { simulate, bodyOf, headOf, drawDragon, local, BROW } from './body.mjs';

// 1. Today: the loop, the head never turns. A red marker where the neck kinks.
export function today(ctx, t) {
    const clock = t / 1000;
    drawRing(ctx, clock, 0, t);
    const pts = [zodiarchPath(clock)];
    let c = clock;
    while (pts.length < 27) {
        c -= 0.004;
        const [x, y] = zodiarchPath(c),
            [lx, ly] = pts[pts.length - 1];
        if (Math.hypot(x - lx, y - ly) >= GAP) pts.push([x, y]);
    }
    const [x, y] = pts[0];
    const body = pts.slice(1).map(([sx, sy], i) => ({ x: sx, y: sy, r: 20 - (10 * i) / 25 }));
    const last = body[body.length - 1],
        prev = body[body.length - 2];
    art.drawRotated(
        ctx,
        'rift',
        'zod-tail',
        last.x,
        last.y,
        Math.atan2(last.y - prev.y, last.x - prev.x),
    );
    for (let i = body.length - 1; i >= 0; i--) {
        const s = body[i];
        art.draw(ctx, 'rift', segmentKey(s.r, i), s.x, s.y, {});
        if (i === 4 || i === 15)
            art.draw(ctx, 'rift', 'zod-claw', s.x - 1, s.y + s.r * 0.55 + 14, {});
    }
    art.draw(ctx, 'rift', 'zod-head-0', x - 24, y, {});
    art.draw(ctx, 'rift', 'zod-pearl-0', x - 56, y + 24, {});
    const travel = Math.atan2(y - body[0].y, x - body[0].x);
    const kink = Math.abs(wrap(travel - Math.PI)) * (180 / Math.PI);
    if (kink > 45) {
        ctx.strokeStyle = '#ff5a5a';
        ctx.beginPath();
        ctx.arc(Math.round(x + 6), Math.round(y), 16, 0, TAU);
        ctx.stroke();
        note(ctx, `neck bent ${Math.round(kink)}°`, clamp(x - 10, 4, 400), y - 26, '#ff8a8a');
    }
    pilot(ctx, 90, 150 + Math.sin(t / 500) * 3);
    label(ctx, 'Today: the same figure of eight, head always facing left');
}
// 2. New: steered, with behaviours. The pilot moves between rows.
const pilotRow = (t) => (t < 6000 ? 150 : t < 13000 ? 80 : t < 19000 ? 195 : 150);
const smoothPilot = (() => {
    const ys = [];
    let y = 150;
    for (let t = 0; t <= 26000; t += DT) {
        y += (pilotRow(t) - y) * 0.04;
        ys.push(y);
    }
    return (t) => ys[clamp(Math.floor(t / DT), 0, ys.length - 1)] + Math.sin(t / 500) * 3;
})();
const MOVE = simulate(
    { x: 410, y: 150, heading: Math.PI, v: 0.06 },
    [
        {
            until: 3600,
            goal: (t) => [330, smoothPilot(t)],
            speed: 0.05,
            turn: 1.9,
            arrive: true,
            label: 'Stalk: drifts to your row, eyes on you',
        },
        { until: 5200, goal: [395, 215], speed: 0.2, turn: 3.1, label: 'Surge: a fast S across' },
        { until: 7000, goal: [390, 90], speed: 0.07, turn: 1.9, label: 'Glide: slowing down' },
        {
            until: 9800,
            goal: [345, 52],
            speed: 0.06,
            turn: 1.9,
            arrive: true,
            label: 'Rear: head high (before a summon)',
        },
        { until: 11400, goal: [385, 232], speed: 0.13, turn: 2.2, label: 'Dive...' },
        {
            until: 13000,
            goal: [300, 120],
            speed: 0.11,
            turn: 2.2,
            label: '...and rise behind the ring',
        },
        { until: 15400, goal: [290, 95], speed: 0, turn: 1.5, label: 'Hold: still breathing' },
        { until: 16600, goal: [290, 95], speed: 0, turn: 1.5, label: 'Recoil: the pearl is hit' },
        {
            until: 20500,
            goal: (t) => [340, smoothPilot(t)],
            speed: 0.06,
            turn: 1.9,
            arrive: true,
            label: 'Stalk again',
        },
        { until: 24000, goal: [395, 120], speed: 0.08, turn: 1.9, label: 'Cruise' },
    ],
    24000,
);
export function living(ctx, t) {
    const f = MOVE.frame(t),
        path = (s) => MOVE.trail.at(s);
    const behind = t > 11400 && t < 13000;
    const py = smoothPilot(t);
    const hitAt = 15550;
    const recoil = bump(t, hitAt, hitAt + 500);
    const h = f.h - 8 * recoil;
    const still = clamp01(1 - f.v / 0.03);
    const segs = bodyOf(path, h, { t, still, shudder: hitAt });
    const head = headOf(path, h, [90, py]);
    head.y -= 5 * recoil;
    const rear = 0.65 * ease(span(t, 7800, 8500)) * (1 - span(t, 9500, 9800));
    head.ang += Math.cos(head.ang) < 0 ? rear : -rear;
    const open = clamp01(span(t, 14300, 14500) - span(t, 16800, 17000));
    if (!behind) drawRing(ctx, t / 1000, 0, t);
    // Path dots: the steering's next 0.6 s, hidden while it holds.
    if (f.v > 0.02)
        for (let k = 1; k <= 6; k++) {
            const [x, y] = MOVE.trail.at(MOVE.frame(t + k * 100).h);
            ctx.globalAlpha = 0.5 - k * 0.06;
            ctx.fillStyle = '#ffd890';
            px(ctx, x - 24 * Math.cos(head.heading - Math.PI), y, 2, 2);
        }
    ctx.globalAlpha = 1;
    drawDragon(ctx, segs, head, {
        t,
        alpha: behind ? 0.55 : 1,
        pearl: { open },
        rim: open > 0.5 ? '#ff8ad0' : undefined,
        fast: f.v > 0.12,
        mouth: f.v > 0.15,
    });
    if (behind) drawRing(ctx, t / 1000, 0, t);
    // The shot that makes it recoil.
    const [qx, qy] = local(head, BROW[0], BROW[1]);
    if (t > hitAt - 600 && t < hitAt) {
        const u = (t - (hitAt - 600)) / 600;
        bullet(ctx, lerp(100, qx, u), lerp(smoothPilot(hitAt - 600), qy, u));
    }
    burst(ctx, qx, qy, (t - hitAt) / 350, '#ff8ad0');
    pilot(ctx, 90, py);
    label(ctx, f.label);
}
