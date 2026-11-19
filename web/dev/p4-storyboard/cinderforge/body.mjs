// The Cinderforge redesigned for the P4.3 storyboard: a furnace golem in parts (draft sheet
// draft-p4-cinderforge from tools/make-p4-drafts.py). It hovers on the flame of its bellows;
// its hammer arm faces you, its ladle arm is on the far side; heat lamps on its belt are the
// gauge, and at full heat its chest doors open on the core.
import { art, cell, clamp01, glow, lerp, px, TAU } from '../kit.mjs';

export const SHEET = 'draft-p4-cinderforge';
await art.load(SHEET);
export const HOME = [372, 128];
export const SHOULDER = { hammer: [-64, -46], ladle: [64, -46] };
const REACH = 96; // shoulder to the hammer head or the ladle cup

// Where the end of an arm is: its shoulder turned by `a` (0 hangs down, PI/2 points at you,
// PI is overhead).
export function armEnd(x, y, which, a) {
    const [sx, sy] = SHOULDER[which];
    return [x + sx - Math.sin(a) * REACH, y + sy + Math.cos(a) * REACH];
}
const HEAT = ['255,120,40', '255,170,60', '255,230,170'];
export const heatColour = (h) => HEAT[h < 0.45 ? 0 : h < 0.85 ? 1 : 2];

// o: hammer and ladle angles, breath 0..1 (the bellows' fill), doors 0..1 (open), heat 0..1
// (the lamps lit), core 0..2 (cool to white-hot), steam 0..1 (venting), bob (px).
export function golem(ctx, x, y, o = {}) {
    const {
        hammer = 0.25,
        ladle = -0.2,
        breath = 0.3,
        doors = 0,
        heat = 0,
        core = 0,
        steam = 0,
        time = 0,
    } = o;
    y += Math.round(Math.sin(time / 600) * 2);
    glow(ctx, x, y, 150, heatColour(heat), 0.12 + 0.25 * heat);
    // The flame it hovers on, from the bellows' nozzle.
    const bh = 18 + 22 * breath + 10;
    for (let k = 0; k < 10; k++) {
        const f = (time / 40 + k * 7) % 14;
        ctx.fillStyle = k % 3 ? '#ff9a3a' : '#ffe2a0';
        px(ctx, x - 3 + Math.sin(k * 1.7 + time / 90) * 3, y + 62 + bh + f * 1.4, 2, 2);
    }
    glow(ctx, x, y + 62 + bh + 12, 14, '255,150,60', 0.6);
    cell(ctx, SHEET, `golem-ladle`, x + SHOULDER.ladle[0], y + SHOULDER.ladle[1], { a: ladle });
    cell(ctx, SHEET, `golem-bellows-${Math.round(clamp01(breath) * 3)}`, x, y);
    cell(ctx, SHEET, 'golem-torso', x, y);
    cell(ctx, SHEET, `golem-core-${core | 0}`, x, y);
    if (doors > 0) glow(ctx, x, y + 2, 30 + 16 * doors, '255,220,150', 0.5 * doors);
    cell(ctx, SHEET, 'golem-door-l', x - Math.round(30 * doors), y);
    cell(ctx, SHEET, 'golem-door-r', x + Math.round(30 * doors), y);
    // The heat lamps on its belt: one per attack, white and blinking when full.
    const lit = Math.round(heat * 5);
    for (let k = 0; k < 5; k++) {
        const on = k < lit,
            full = lit >= 5 && Math.floor(time / 110) % 2;
        ctx.fillStyle = !on ? '#2a1418' : full ? '#ffffff' : k < 3 ? '#ff8a2a' : '#ffd070';
        px(ctx, x - 36 + k * 16, y + 44, 8, 6);
        if (on) glow(ctx, x - 32 + k * 16, y + 48, 6, heatColour(heat), 0.6);
    }
    // Eyes, as hot as it is.
    for (const sx of [-11, 11]) glow(ctx, x + sx, y - 67, 6 + 4 * heat, heatColour(heat), 0.9);
    cell(ctx, SHEET, 'golem-hammer', x + SHOULDER.hammer[0], y + SHOULDER.hammer[1], { a: hammer });
    if (steam > 0) {
        // Steam from the shoulders and the chimney while it vents.
        for (const [sx, sy, dx] of [
            [-70, -60, -1],
            [70, -60, 1],
            [0, -130, 0],
        ])
            for (let k = 0; k < 8; k++) {
                const u = ((time / 500 + k / 8) % 1) * steam;
                ctx.globalAlpha = (1 - u) * steam;
                ctx.fillStyle = '#e8eef8';
                px(
                    ctx,
                    x + sx + dx * u * 40 + Math.sin(k * 3 + time / 120) * 4,
                    y + sy - u * 40,
                    3,
                    3,
                );
            }
        ctx.globalAlpha = 1;
    }
}

// Fire that stays: a pool (fresh, bright) that burns down to a scorch (dark, flickering).
export function pool(ctx, x, y, age, life = 4000) {
    const u = clamp01(age / life);
    if (u >= 1) return;
    const r = lerp(18, 14, u);
    for (let k = 0; k < 26; k++) {
        const a = (k / 26) * TAU,
            rr = r * (0.6 + (0.4 * ((k * 7) % 5)) / 5);
        ctx.fillStyle = u < 0.5 ? (k % 3 ? '#ff7a1e' : '#ffe27a') : k % 4 ? '#4a2e2c' : '#ff6a1e';
        px(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.4, 3, 2);
    }
    if (u < 0.5) glow(ctx, x, y, 22, '255,120,40', 0.5 * (1 - u * 2));
    ctx.fillStyle = '#ffb060';
    if (Math.floor(age / 140) % 2) px(ctx, x - 2, y - 6 - (age % 300) / 60, 1, 2);
}
// A blob of molten metal in the air.
export function blob(ctx, x, y) {
    glow(ctx, x, y, 10, '255,150,50', 0.8);
    ctx.fillStyle = '#ffe27a';
    px(ctx, x - 2, y - 2, 5, 5);
    ctx.fillStyle = '#ff6a1e';
    px(ctx, x - 3, y, 2, 2);
}
export const FLOOR = 262;
export function floor(ctx) {
    ctx.fillStyle = '#2a1214';
    ctx.fillRect(0, FLOOR, 480, 270 - FLOOR);
    ctx.fillStyle = '#5a2a24';
    for (let x = 0; x < 480; x += 3) px(ctx, x, FLOOR + ((x * 7) % 3 ? 0 : 1));
}
