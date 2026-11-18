// The trail and the body: a steered head simulated along a script, the body laid along its
// trail, the head frame and its points, the forehead pearl and the whole dragon drawn.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { segmentKey } from '../../src/boss/zodiarch/dragon.mjs';
import { TAU } from '../../src/boss/draw-kit.mjs';
import { lerp, DT, clamp, wrap, SEGS, GAP, px, art } from './kit.mjs';

// ---------------------------------------------------------------- the trail and the body
// Every head position, sampled every 2 px of travel, with its arc length. Segments sit at fixed
// arc lengths back from the head, so the body can only go where the head has been.
class Trail {
    constructor(x, y, heading) {
        this.pts = [];
        const c = Math.cos(heading),
            s = Math.sin(heading);
        for (let a = -440; a <= 0; a += 2) {
            const wave = 5 * Math.sin((a * TAU) / 110);
            this.pts.push([x + c * a - s * wave, y + s * a + c * wave, a]);
        }
    }
    get end() {
        return this.pts[this.pts.length - 1][2];
    }
    push(x, y) {
        const [lx, ly, la] = this.pts[this.pts.length - 1];
        const d = Math.hypot(x - lx, y - ly);
        if (d >= 2) this.pts.push([x, y, la + d]);
    }
    at(s) {
        const p = this.pts;
        if (s <= p[0][2]) return [p[0][0], p[0][1]];
        let lo = 0,
            hi = p.length - 1;
        if (s >= p[hi][2]) return [p[hi][0], p[hi][1]];
        while (hi - lo > 1) {
            const m = (lo + hi) >> 1;
            if (p[m][2] <= s) lo = m;
            else hi = m;
        }
        const u = (s - p[lo][2]) / (p[hi][2] - p[lo][2] || 1);
        return [lerp(p[lo][0], p[hi][0], u), lerp(p[lo][1], p[hi][1], u)];
    }
}
// Steering: the head turns toward the step's goal at a capped rate, speeds ease over about
// 400 ms, and a sideways wave (by distance travelled) makes the serpentine S.
export function simulate({ x, y, heading, v = 0.06 }, script, duration) {
    const trail = new Trail(x, y, heading);
    const st = { bx: x, by: y, th: heading, v, phase: 0 };
    const frames = [];
    for (let t = 0; t <= duration; t += DT) {
        const step = script.find((s) => t < s.until) ?? script[script.length - 1];
        const goal = typeof step.goal === 'function' ? step.goal(t, st) : step.goal;
        let target = step.speed;
        if (goal) {
            const want = Math.atan2(goal[1] - st.by, goal[0] - st.bx);
            st.th += clamp(
                wrap(want - st.th),
                (-(step.turn ?? 1.9) * DT) / 1000,
                ((step.turn ?? 1.9) * DT) / 1000,
            );
            if (step.arrive)
                target = Math.min(target, Math.hypot(goal[0] - st.bx, goal[1] - st.by) * 0.0016);
        }
        st.v += (target - st.v) * (step.ease ?? 0.05);
        st.bx += Math.cos(st.th) * st.v * DT;
        st.by += Math.sin(st.th) * st.v * DT;
        st.phase += (st.v * DT * TAU) / 110;
        const wave = (step.wave ?? 5) * Math.sin(st.phase);
        trail.push(st.bx - Math.sin(st.th) * wave, st.by + Math.cos(st.th) * wave);
        frames.push({ t, h: trail.end, v: st.v, label: step.label, step });
    }
    return { trail, frames, frame: (t) => frames[clamp(Math.floor(t / DT), 0, frames.length - 1)] };
}
// The body's 26 segments from a path (arc length -> point). `neck(k)` may override a segment's
// arc (the lunge's coil); `still` (0..1) adds the breathing wave; `shudder` a recoil ripple.
export function bodyOf(path, h, { t = 0, still = 0, shudder = -1e9, arcOf } = {}) {
    const segs = [];
    for (let k = 1; k <= SEGS; k++) {
        const s = arcOf ? arcOf(k) : h - k * GAP;
        const [x, y] = path(s);
        const [ax, ay] = path(s + 4),
            [bx, by] = path(s - 4);
        const dx = ax - bx,
            dy = ay - by,
            n = Math.hypot(dx, dy) || 1;
        let off = still * (0.8 + (2.2 * k) / SEGS) * Math.sin((t / 1000) * Math.PI - k * 0.45);
        const since = t - shudder - k * 15;
        if (since > 0 && since < 900) off += 3 * Math.exp(-since / 260) * Math.sin(since / 35);
        segs.push({
            x: x - (dy / n) * off,
            y: y + (dx / n) * off,
            r: 20 - (10 * (k - 1)) / 25,
            dx: dx / n,
            dy: dy / n,
        });
    }
    return segs;
}
export function headOf(path, h, pilotAt, look = 1) {
    const [x, y] = path(h),
        [bx, by] = path(h - 8);
    const heading = Math.atan2(y - by, x - bx);
    let ang = heading;
    if (pilotAt && look) {
        const to = Math.atan2(pilotAt[1] - y, pilotAt[0] - x);
        ang = heading + clamp(wrap(to - heading), -0.44, 0.44) * look;
    }
    return { x, y, heading, ang };
}
// A point given in the left-facing head frame (from the head's path point), in the world.
export function local(head, dx, dy) {
    const right = Math.cos(head.ang) > 0,
        a = right ? head.ang : head.ang - Math.PI,
        lx = right ? -dx : dx;
    return [
        head.x + lx * Math.cos(a) - dy * Math.sin(a),
        head.y + lx * Math.sin(a) + dy * Math.cos(a),
    ];
}
export const EYE = [-38, -12],
    JAW = [-72, 3],
    BROW = [-27, -17];
// The forehead pearl, drawn in the head's own frame: two brow scales close over it like a lid.
function forehead(ctx, x, y, { open = 0, tell = 0 } = {}, t = 0) {
    const flicker = 0.6 + 0.4 * Math.sin(t / 40);
    if (open > 0) glow(ctx, x, y, 8 + 16 * open, '255,150,210', 0.65 * open);
    ctx.fillStyle = open > 0.3 ? '#ffe4f2' : '#9a6a90';
    for (let dy = -3; dy <= 3; dy++) {
        const half = Math.floor(Math.sqrt(10 - dy * dy));
        px(ctx, x - half, y + dy, half * 2 + 1, 1);
    }
    if (open > 0.3) {
        ctx.fillStyle = '#ff8ad0';
        px(ctx, x - 3, y + 1, 7, 2);
        ctx.fillStyle = '#ffffff';
        px(ctx, x - 1, y - 2, 2, 2);
    }
    const twitch = tell ? Math.round(Math.sin(t / 35) * tell) : 0;
    const gap = open * 4 + tell * 0.6;
    for (const side of [-1, 1]) {
        const oy = y + side * (gap + 2.5) + (side < 0 ? twitch : 0);
        ctx.fillStyle = '#1b2763';
        ctx.beginPath();
        ctx.ellipse(Math.round(x), Math.round(oy), 6, 3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffd890';
        for (let k = -5; k <= 5; k++) px(ctx, x + k, oy + side * (3 - Math.abs(k) * 0.35));
    }
    if (open < 0.3) {
        ctx.globalAlpha = 0.25 + 0.75 * tell * flicker;
        ctx.fillStyle = '#ff9ad6';
        px(ctx, x - 4, y, 9, 1);
        if (tell > 0) glow(ctx, x, y, 6 + 6 * tell, '255,150,210', 0.4 * tell * flicker);
        ctx.globalAlpha = 1;
    }
}
function drawHead(
    ctx,
    head,
    { mouth = false, pearl = {}, rim, alpha = 1, eyeGlow = 0, throat = 0, t = 0, push = 0 } = {},
) {
    const right = Math.cos(head.ang) > 0;
    ctx.save();
    ctx.translate(
        Math.round(head.x + Math.cos(head.ang) * push),
        Math.round(head.y + Math.sin(head.ang) * push),
    );
    ctx.rotate(right ? head.ang : head.ang - Math.PI);
    if (right) ctx.scale(-1, 1);
    const key = mouth ? 'zod-head-1' : 'zod-head-0';
    if (throat > 0) glow(ctx, -60, 8, 14 + 18 * throat, '255,150,60', 0.7 * throat);
    if (rim) art.drawEdge(ctx, 'rift', key, -24, 0, rim, alpha);
    art.draw(ctx, 'rift', key, -24, 0, { alpha });
    if (eyeGlow > 0) {
        glow(ctx, EYE[0], EYE[1], 8 + 12 * eyeGlow, '255,90,70', 0.6 * eyeGlow);
        ctx.fillStyle = '#ffd0c0';
        px(ctx, EYE[0] - 1, EYE[1] - 1, 3, 3);
    }
    forehead(ctx, BROW[0], BROW[1], pearl, t);
    ctx.restore();
}
// The whole dragon: tail, segments with legs on the belly side, head on top.
export function drawDragon(ctx, segs, head, opts = {}) {
    const { alpha = 1, rim, pulse = -1, t = 0 } = opts;
    const last = segs[segs.length - 1],
        prev = segs[segs.length - 2];
    art.drawRotated(
        ctx,
        'rift',
        'zod-tail',
        last.x,
        last.y,
        Math.atan2(last.y - prev.y, last.x - prev.x),
        alpha,
    );
    for (let i = segs.length - 1; i >= 0; i--) {
        const s = segs[i],
            key = segmentKey(s.r, i);
        if (rim) art.drawEdge(ctx, 'rift', key, s.x, s.y, rim, alpha);
        art.draw(ctx, 'rift', key, s.x, s.y, { alpha });
        if (pulse >= 0) {
            const near = 1 - Math.abs(i - pulse) / 3;
            if (near > 0) glow(ctx, s.x, s.y, s.r + 8, '255,150,60', 0.75 * near);
        }
        if (i === 4 || i === 15) {
            let nx = -s.dy,
                ny = s.dx;
            if (ny < 0) {
                nx = -nx;
                ny = -ny;
            }
            const paddle = Math.sin(t / (opts.fast ? 120 : 260) + (i === 4 ? 0 : Math.PI));
            const reach = s.r * 0.55 + 14;
            art.draw(
                ctx,
                'rift',
                'zod-claw',
                s.x + nx * reach - s.dx * paddle * 3,
                s.y + ny * reach - s.dy * paddle * 3,
                { alpha },
            );
        }
    }
    drawHead(ctx, head, opts);
}
