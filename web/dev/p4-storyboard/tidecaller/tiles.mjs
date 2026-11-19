// Tiles for the Tidecaller (nextSteps.md P4.5): swimming in pulses, drifting bubbles you
// can push, the bioluminescence before a stream, and the optional tides.
import { burst, clamp, ease, fire, note, pilot, px, shot, span } from '../kit.mjs';
import { bell, bubble, HOME, PULSE_MS, swim, tendrils } from './body.mjs';

const STOPS = [
    [356, 146],
    [330, 124],
    [372, 132],
    [344, 168],
    [380, 158],
];
const pose = (s) => swim(STOPS, s);

export const SWIM_MS = PULSE_MS * STOPS.length;
export function pulses(ctx, t) {
    const p = pose(t);
    tendrils(ctx, pose, t);
    bell(ctx, p.x, p.y, { ...p, open: true, time: t });
    pilot(ctx, 96, 135);
    const ms = t % PULSE_MS;
    note(
        ctx,
        ms < 300
            ? 'contract: the bell squeezes and thrusts, its core flares'
            : ms < 1000
              ? 'glide: the tendrils trail behind along its path'
              : 'relax: the bell opens out again',
        12,
        258,
    );
}

// Bubbles wander round the bell instead of riding a fixed orbit. A shot pushes a bubble
// away; a second one pops it.
export const BUBBLE_MS = 7000;
const still = (s) => ({
    x: HOME[0],
    y: HOME[1] + 6 * Math.sin(s / 700),
    lean: 0,
    squeeze: 0.2 + 0.2 * Math.sin(s / 400),
});
const WANDER = [
    [0.0013, 0.0017, 0],
    [0.0011, 0.0021, 2.1],
    [0.0016, 0.0012, 4.2],
];
function bubbleAt(k, s) {
    const [fx, fy, ph] = WANDER[k];
    let x = HOME[0] + Math.cos(s * fx + ph) * 100 + Math.sin(s * fy * 0.7) * 14,
        y = HOME[1] - 20 + Math.sin(s * fy + ph) * 52;
    // Bubble 0 is pushed by a shot at 2000 ms and popped by the next at 3300 ms.
    if (k === 0 && s > 2000) x += 40 * ease(span(s, 2000, 2600));
    return [x, y];
}
export function bubbles(ctx, t) {
    const p = still(t);
    tendrils(ctx, still, t);
    bell(ctx, p.x, p.y, { ...p, time: t });
    const popped = t >= 3300;
    for (let k = 0; k < 3; k++) if (k || !popped) bubble(ctx, ...bubbleAt(k, t));
    const target = (s) => bubbleAt(0, s)[1];
    const P = [96, clamp(target(t + 400), 30, 240)];
    fire(
        ctx,
        t,
        () => [96, target(1600)],
        1300,
        1600,
        3000,
        (y, s) => {
            const [bx] = bubbleAt(0, s + 500);
            return { x: bx - 14, kind: 'burst', colour: '#9af8ff' };
        },
    );
    if (t >= 3300) burst(ctx, ...bubbleAt(0, 3300), (t - 3300) / 400, '#c8fcff', 10, 16);
    pilot(ctx, ...P);
    note(
        ctx,
        t < 2000
            ? 'bubbles drift round the bell, each its own way'
            : t < 3300
              ? 'a shot pushes one away'
              : 'the next one pops it',
        12,
        258,
    );
}

// Bioluminescence: light runs along the bell to where a stream will start, then the stream.
export const GLOW_MS = 4600;
export function biolum(ctx, t) {
    const p = still(t),
        mouth = Math.PI - 0.5;
    tendrils(ctx, still, t);
    const rim = t < 900 ? span(t, 0, 900) : t < 2400 ? 1 - span(t, 2000, 2400) : 0;
    bell(ctx, p.x, p.y, { ...p, rim, rimTo: mouth, time: t });
    const mx = p.x + Math.cos(mouth) * 92,
        my = p.y - 37 + Math.sin(mouth) * 70;
    for (let k = 0; k < 10; k++) {
        const age = t - (900 + k * 140);
        if (age < 0 || age > 2600) continue;
        const d = age * 0.11;
        shot(ctx, 'sine', mx - d, my + Math.sin(age / 160 + k * 0.4) * 22, Math.PI);
    }
    pilot(ctx, 96, 200);
    note(
        ctx,
        t < 900
            ? 'the light runs along the bell to the stream’s mouth'
            : 'and the stream pours out from there',
        12,
        258,
    );
}

// The tides (optional): a water level rises and falls across the field; under it the ship is
// slower, so the streams' gaps are harder to reach.
export const TIDE_MS = 9000;
export function tides(ctx, t) {
    const level = 270 - 120 * (0.5 - 0.5 * Math.cos((t / TIDE_MS) * Math.PI * 2));
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#3aa8c0';
    ctx.fillRect(0, level, 480, 270 - level);
    ctx.globalAlpha = 1;
    for (let x = 0; x < 480; x += 2) {
        ctx.fillStyle = (x + Math.floor(t / 60)) % 12 < 2 ? '#ffffff' : '#9af8ff';
        px(ctx, x, level + Math.sin(x / 18 + t / 300) * 2, 2, 1);
    }
    const p = pose(t);
    tendrils(ctx, pose, t);
    bell(ctx, p.x, p.y, { ...p, time: t });
    // The ship weaves up and down at one speed in open space, slower once under water.
    let y = 60,
        s = 0;
    for (let k = 0; k < t; k += 20) {
        const under = y > level;
        s += (under ? 0.45 : 1) * 20;
        y = 140 + 90 * Math.sin(s / 1200);
    }
    const under = y > level;
    if (under)
        for (let k = 0; k < 4; k++) {
            ctx.fillStyle = '#c8fcff';
            px(ctx, 90 - k * 5, y - 3 - ((t / 80 + k * 5) % 12), 1, 1);
        }
    pilot(ctx, 96, y);
    note(
        ctx,
        under ? 'under the tide the ship is slower' : 'optional: a tide that rises and falls',
        12,
        258,
    );
}
