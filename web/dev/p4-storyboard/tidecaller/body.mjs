// The Tidecaller for the P4.5 storyboard: the game's bell (sheet lunar, cut above its fringe)
// squeezing as it swims in pulses, and tendrils drawn here that trail behind it on the path
// it took, as the Zodiarch's body follows its head.
import { art, clamp01, ease, glow, lerp, px, TAU } from '../kit.mjs';

await Promise.all([art.load('lunar'), art.load('shots')]);
export const HOME = [356, 146];

// A pulse: contract (300 ms, the thrust), glide (700 ms), relax (600 ms). Returns how far
// through the stroke it has moved (0..1) and how squeezed the bell is (0..1).
export const PULSE_MS = 1600;
export function stroke(u) {
    const ms = u * PULSE_MS;
    const squeeze =
        ms < 300
            ? ease(ms / 300)
            : ms < 1000
              ? 1 - ease((ms - 300) / 700) * 0.7
              : 0.3 * (1 - (ms - 1000) / 600);
    const moved =
        ms < 300
            ? 0.35 * ease(ms / 300)
            : ms < 1000
              ? 0.35 + 0.6 * Math.sin(((ms - 300) / 700) * (Math.PI / 2))
              : 0.95 + 0.05 * clamp01((ms - 1000) / 600);
    return { moved, squeeze };
}
// A swim along `stops` (one pulse from each to the next), looping. Returns where the bell is,
// which way it leans (toward where it goes) and how squeezed it is.
export function swim(stops, s) {
    const n = stops.length,
        k = Math.floor(s / PULSE_MS),
        u = (((s % PULSE_MS) + PULSE_MS) % PULSE_MS) / PULSE_MS;
    const a = stops[((k % n) + n) % n],
        b = stops[(((k + 1) % n) + n) % n];
    const { moved, squeeze } = stroke(u);
    const lean = Math.max(-0.35, Math.min(0.35, (b[0] - a[0]) / 140));
    return { x: lerp(a[0], b[0], moved), y: lerp(a[1], b[1], moved), lean, squeeze };
}

// Tendrils: seven, each a chain of points that follows where the fringe was a little earlier.
export function tendrils(ctx, pose, t) {
    for (let k = 0; k < 7; k++) {
        const off = -54 + k * 18;
        let prev = null;
        for (let j = 0; j <= 11; j++) {
            const p = pose(t - j * 55),
                c = Math.cos(p.lean),
                s = Math.sin(p.lean);
            const ox = off * (1 - 0.18 * p.squeeze),
                oy = -6 + j * 9;
            const x = p.x + ox * c - oy * s + Math.sin(t / 300 + k + j * 0.6) * j * 0.4,
                y = p.y + ox * s + oy * c;
            if (prev) {
                const n = Math.max(1, Math.round(Math.hypot(x - prev[0], y - prev[1]) / 2));
                for (let i = 0; i < n; i++) {
                    const qx = lerp(prev[0], x, i / n),
                        qy = lerp(prev[1], y, i / n);
                    ctx.fillStyle = (j + i + k) % 7 ? '#3aa8c0' : '#ff7ad0';
                    px(ctx, qx - 2, qy, 4, 2);
                }
            }
            prev = [x, y];
        }
        ctx.fillStyle = '#ff5ac0';
        px(ctx, prev[0] - 3, prev[1], 6, 4);
    }
}
// The bell: the game's sprite above its fringe, squeezed narrower and taller on a contraction.
// `open` lights the pink core (bare once the bubbles are popped); `rim` 0..1 runs a light
// along the bell toward `rimTo` (the bioluminescence before a stream).
export function bell(
    ctx,
    x,
    y,
    { lean = 0, squeeze = 0, open = false, time = 0, rim = 0, rimTo = Math.PI } = {},
) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(lean);
    ctx.scale(1 - 0.16 * squeeze, 1 + 0.1 * squeeze);
    ctx.beginPath();
    ctx.rect(-130, -160, 260, 154);
    ctx.clip();
    art.draw(ctx, 'lunar', `tide-${Math.floor(time / 280) % 4}-${open ? 1 : 0}`, 0, 0);
    ctx.restore();
    if (open) glow(ctx, x, y - 37, 60 + 20 * squeeze, '255,120,220', 0.2 + 0.25 * squeeze);
    if (rim > 0) {
        // Light running along the rim of the bell from the top to the stream's mouth.
        for (let i = 0; i < 24; i++) {
            const a = lerp(-Math.PI / 2, rimTo, (i / 24) * rim);
            const rx = x + Math.cos(a) * 92 * (1 - 0.16 * squeeze),
                ry = y - 37 + Math.sin(a) * 70;
            ctx.fillStyle = i % 3 ? '#9af8ff' : '#ffffff';
            px(ctx, rx - 1, ry - 1, 3, 3);
        }
        glow(
            ctx,
            x + Math.cos(rimTo) * 92,
            y - 37 + Math.sin(rimTo) * 70,
            10 + 14 * rim,
            '150,240,255',
            0.8 * rim,
        );
    }
}
export function bubble(ctx, x, y, alpha = 0.9) {
    art.draw(ctx, 'shots', 'bubble', Math.round(x), Math.round(y), { alpha });
}
export { TAU };
