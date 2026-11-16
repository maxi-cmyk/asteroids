import { glow } from '../fx.mjs';

// What collecting a pickup looks like, one animation per kind, drawn from the engine's collect
// cue (COLLECT_CUE_MS counts down from CUE_MS, COLLECT_KIND says which pickup it was):
//   shield    a curved, triangular shield front radiating outward in three fading echoes
//   health    the heart radiating outward the same way
//   multishot three amber rays fanning out from the nose along the spread
//   2x fire   two parallel streaks shooting forward, with a quick double flash
// Reduced motion draws one still, fading outline instead of the moving parts.
export const CUE_MS = 600;
export const KIND = Object.freeze({ multishot: 0, shield: 1, double: 2, health: 3 });

const CYAN = '#70d9ed',
    CYAN_RGB = '112,217,237',
    RED = '#ff6c78',
    RED_RGB = '255,96,108',
    AMBER = '#efb963',
    AMBER_RGB = '239,185,99',
    INK = '#f2f1df';

// Crisp 1 px outline: sample a closed parametric curve and plot each pixel once.
function outline(ctx, x, y, scale, curve, steps = 96) {
    let last = '';
    for (let i = 0; i <= steps; i++) {
        const [u, v] = curve(i / steps);
        const px = Math.round(x + u * scale),
            py = Math.round(y + v * scale);
        const key = px + ',' + py;
        if (key === last) continue;
        last = key;
        ctx.fillRect(px, py, 1, 1);
    }
}

// A heater shield, unit size about 1 wide and 1.15 tall: a gently domed top, straight upper
// sides, then curving in to a point at the bottom.
function shieldCurve(t) {
    const p = t * 5,
        q = p % 1,
        bend = (q * Math.PI) / 2;
    if (p < 1) return [-0.5 + q, -0.55 - 0.08 * Math.sin(q * Math.PI)]; // domed top
    if (p < 2) return [0.5, -0.55 + q * 0.45]; // right side, down
    if (p < 3) return [0.5 * Math.cos(bend), -0.1 + 0.7 * Math.sin(bend)]; // swell into the point
    if (p < 4) return [-0.5 * Math.sin(bend), 0.6 - 0.7 * (1 - Math.cos(bend))]; // and back out
    return [-0.5, -0.1 - q * 0.45]; // left side, up
}

// The classic heart curve, scaled to about 1 wide.
function heartCurve(t) {
    const a = t * Math.PI * 2,
        s = Math.sin(a);
    return [
        (16 * s * s * s) / 34,
        -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 34,
    ];
}

// Three echoes leaving the pickup one after another, growing and fading.
function radiate(ctx, x, y, t, curve, colour, rgb, reduced) {
    glow(ctx, x, y, 16, rgb, 0.5 * (1 - t));
    ctx.fillStyle = colour;
    if (reduced) {
        ctx.globalAlpha = 1 - t;
        outline(ctx, x, y, 22, curve);
        ctx.globalAlpha = 1;
        return;
    }
    for (let echo = 0; echo < 3; echo++) {
        const local = (t - echo * 0.18) / 0.64;
        if (local <= 0 || local >= 1) continue;
        ctx.globalAlpha = (1 - local) * (echo === 0 ? 1 : 0.7);
        outline(ctx, x, y, 12 + local * 34, curve, 140);
    }
    ctx.globalAlpha = 1;
}

function ray(ctx, x, y, dx, dy, from, to) {
    for (let r = Math.round(from); r <= to; r++)
        ctx.fillRect(Math.round(x + dx * r), Math.round(y + dy * r), 1, 1);
}

function multishot(ctx, x, y, dx, dy, t, reduced) {
    const SPREAD = 0.3; // drawn wider than the real spread so the fan reads at a glance
    const head = reduced ? 34 : 8 + t * 46,
        tail = reduced ? 10 : Math.max(8, head - 16);
    ctx.fillStyle = AMBER;
    ctx.globalAlpha = 1 - t * 0.8;
    for (const side of [-1, 0, 1]) {
        const a = side * SPREAD,
            rx = dx * Math.cos(a) - dy * Math.sin(a),
            ry = dx * Math.sin(a) + dy * Math.cos(a);
        ray(ctx, x, y, rx, ry, tail, head);
        ctx.fillStyle = INK;
        ctx.fillRect(Math.round(x + rx * head), Math.round(y + ry * head), 1, 1);
        ctx.fillStyle = AMBER;
    }
    ctx.globalAlpha = 1;
    glow(ctx, x + dx * 10, y + dy * 10, 10, AMBER_RGB, 0.45 * (1 - t));
}

function doubleFire(ctx, x, y, dx, dy, t, reduced) {
    // Two flashes at the nose, 0-90 ms and 180-270 ms in.
    const flash = t < 0.15 || (t > 0.3 && t < 0.45);
    if (flash) glow(ctx, x + dx * 12, y + dy * 12, 12, CYAN_RGB, 0.8);
    const nx = -dy,
        ny = dx; // across the aim
    const head = reduced ? 40 : 10 + t * 70,
        tail = reduced ? 14 : Math.max(10, head - 22);
    ctx.fillStyle = CYAN;
    ctx.globalAlpha = 1 - t * 0.8;
    for (const side of [-1, 1]) {
        const ox = x + nx * side * 3,
            oy = y + ny * side * 3;
        ray(ctx, ox, oy, dx, dy, tail, head);
        ctx.fillStyle = INK;
        ctx.fillRect(Math.round(ox + dx * head), Math.round(oy + dy * head), 1, 1);
        ctx.fillStyle = CYAN;
    }
    ctx.globalAlpha = 1;
}

// `left` is COLLECT_CUE_MS; (dx, dy) the collector's aim, for the forward-facing kinds.
export function drawCollect(ctx, { kind, left, x, y, dx = 1, dy = 0, reduced = false }) {
    if (!left) return;
    const t = Math.min(1, Math.max(0, 1 - left / CUE_MS));
    if (!dx && !dy) dx = 1;
    if (kind === KIND.shield) radiate(ctx, x, y, t, shieldCurve, CYAN, CYAN_RGB, reduced);
    else if (kind === KIND.health) radiate(ctx, x, y, t, heartCurve, RED, RED_RGB, reduced);
    else if (kind === KIND.multishot) multishot(ctx, x, y, dx, dy, t, reduced);
    else doubleFire(ctx, x, y, dx, dy, t, reduced);
}
