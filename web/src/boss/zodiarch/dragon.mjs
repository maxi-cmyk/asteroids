// The dragon itself (nextSteps.md P3): the body laid along its trail (segments, the legs on
// its belly side, the tail fan), the head turned to its heading from pre-turned frames, and
// the forehead pearl under its two brow scales, with the window's tell and timer.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { bossBody } from '../scene.mjs';

const RADII = [20, 18, 16, 14, 12, 10];
export const segmentKey = (r, i) =>
    `zod-seg-${RADII.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a))}-${i % 2 ? 0 : 1}`;
const PINK = '#ff8ad0';
const STEP = Math.PI / 8; // 22.5 degrees between the pre-turned head frames

// Body, legs and tail fan, tail first so the neck draws on top. `rim` outlines every segment
// (pink while the pearl is open); `pulse` (0..1) runs fire up the body from the tail to the
// throat (the coil-spit's charge); `speed` paddles the legs faster.
export function drawDragonBody(
    ctx,
    art,
    scene,
    { alpha = 1, flash = 0, damage = 0, time = 0, rim = null, pulse = -1, speed = 1 } = {},
) {
    const body = bossBody(scene);
    if (body.length < 2) return body;
    const last = body[body.length - 1],
        prev = body[body.length - 2];
    art.drawRotated(
        ctx,
        'rift',
        'zod-tail',
        last.x,
        last.y,
        Math.atan2(last.y - prev.y, last.x - prev.x),
        alpha,
    );
    const hot = pulse >= 0 ? (body.length - 1) * (1 - pulse) : -9;
    for (let i = body.length - 1; i >= 0; i--) {
        const s = body[i],
            key = segmentKey(s.r, i);
        if (rim) art.drawEdge(ctx, 'rift', key, s.x, s.y, rim, alpha);
        art.draw(ctx, 'rift', key, s.x, s.y, { alpha, flash });
        // Damage spreads down the body: one segment in three at level 1, every other at 2.
        if (damage > 0 && i % (damage === 2 ? 2 : 3) === 1)
            art.draw(ctx, 'rift', `${key.replace(/-[01]$/, '')}-d${damage}`, s.x, s.y, { alpha });
        const near = 1 - Math.abs(i - hot) / 3;
        if (near > 0) glow(ctx, s.x, s.y, s.r + 8, '255,150,60', 0.75 * near * alpha);
        // The legs, on the belly side of the spine, paddle as it swims (faster in a surge).
        if (i === 4 || i === 15) {
            const a = body[i - 1],
                b = body[i + 1];
            const dx = a.x - b.x,
                dy = a.y - b.y,
                n = Math.hypot(dx, dy) || 1;
            let nx = -dy / n,
                ny = dx / n;
            if (ny < 0) {
                nx = -nx;
                ny = -ny;
            }
            const paddle = Math.sin(time / (speed > 2 ? 110 : 260) + (i === 4 ? 0 : Math.PI)) * 3,
                reach = s.r * 0.55 + 14;
            art.draw(
                ctx,
                'rift',
                'zod-claw',
                s.x + nx * reach - (dx / n) * paddle,
                s.y + ny * reach - (dy / n) * paddle,
                { alpha },
            );
        }
    }
    return body;
}

// The head at its point on the trail, turned to `heading` from the nearest pre-turned frame
// (mirrored past 90 degrees so the horns stay up).
export function drawDragonHead(
    ctx,
    art,
    x,
    y,
    heading,
    { mouth = false, alpha = 1, flash = 0, damage = 0, rim = null } = {},
) {
    const right = Math.cos(heading) > 0;
    const off = right
        ? -heading
        : Math.atan2(Math.sin(heading - Math.PI), Math.cos(heading - Math.PI));
    const k = Math.max(-4, Math.min(4, Math.round(off / STEP)));
    const frame = `zod-head-${mouth ? 1 : 0}-r${k}`;
    ctx.save();
    ctx.translate(Math.round(x), 0);
    if (right) ctx.scale(-1, 1);
    if (rim) art.drawEdge(ctx, 'rift', frame, 0, y, rim, alpha);
    art.draw(ctx, 'rift', frame, 0, y, { alpha, flash });
    if (damage > 0) art.draw(ctx, 'rift', `zod-head-d${damage}-r${k}`, 0, y, { alpha });
    ctx.restore();
}

// The pearl at (x, y) under its two scales, turned to `heading` (the head's, or its body
// segment's). `pearl` is the engine's window value: > 0 open (the time left, 1..0), < 0 the
// tell (-0..-1), 0 shut. `slit` false: shut with no glint (the pearl is elsewhere).
export function drawPearl(ctx, x, y, heading, pearl, time, alpha = 1, slit = true) {
    const open = pearl > 0 ? Math.min(1, pearl * 12) : 0,
        tell = pearl < 0 ? -pearl : 0;
    const flicker = 0.6 + 0.4 * Math.sin(time / 40);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (open > 0) glow(ctx, x, y, 10 + 18 * open, '255,150,210', 0.65 * open);
    if (tell > 0) glow(ctx, x, y, 6 + 8 * tell, '255,150,210', 0.45 * tell * flicker);
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(Math.cos(heading) > 0 ? heading : heading - Math.PI);
    ctx.fillStyle = open > 0.3 ? '#ffe4f2' : '#9a6a90';
    for (let dy = -3; dy <= 3; dy++) {
        const half = Math.floor(Math.sqrt(10 - dy * dy));
        ctx.fillRect(-half, dy, half * 2 + 1, 1);
    }
    if (open > 0.3) {
        ctx.fillStyle = PINK;
        ctx.fillRect(-3, 1, 7, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -2, 2, 2);
    }
    // Two brow scales close over it like a lid; in the tell the upper one twitches.
    const twitch = tell ? Math.round(Math.sin(time / 35) * tell) : 0;
    const gap = open * 4 + tell * 0.6;
    for (const side of [-1, 1]) {
        const oy = side * (gap + 2.5) + (side < 0 ? twitch : 0);
        ctx.fillStyle = '#1b2763';
        ctx.beginPath();
        ctx.ellipse(0, Math.round(oy), 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd890';
        for (let k = -5; k <= 5; k++)
            ctx.fillRect(k, Math.round(oy + side * (3 - Math.abs(k) * 0.35)), 1, 1);
    }
    if (open < 0.3 && slit) {
        ctx.globalAlpha = alpha * (0.25 + 0.75 * tell * flicker);
        ctx.fillStyle = '#ff9ad6';
        ctx.fillRect(-4, 0, 9, 1);
    }
    ctx.restore();
    // The time left: a ring that drains, flashing in its last fifth.
    if (pearl > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = pearl < 0.2 && Math.floor(time / 80) % 2 ? '#ffffff' : PINK;
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pearl);
        ctx.stroke();
        ctx.restore();
    }
}
