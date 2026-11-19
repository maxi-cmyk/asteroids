// The Bastion for the P4.4 storyboard: the game's hull and hardpoints (sheet ruins) with its
// new weak point, an engine on each flank (draft sheet draft-p4-bastion), exhaust trails
// that stay in space behind it, banking, listing when hurt, and the new missiles.
import { art, cell, clamp01, glow, lerp, px, TAU } from '../kit.mjs';

export const SHEET = 'draft-p4-bastion';
await Promise.all([art.load(SHEET), art.load('ruins')]);
export const HOME = [324, 138];
// The engines in the ship's frame (bow to the left): top flank, bottom flank.
export const ENGINES = [
    [66, -98],
    [66, 98],
];
const NOZZLE = 40; // from an engine's centre to its nozzle

// A point of the ship's frame in the field, for a ship at (x, y) turned by `roll`.
export function toField(x, y, roll, [dx, dy]) {
    const c = Math.cos(roll),
        s = Math.sin(roll);
    return [x + dx * c - dy * s, y + dx * s + dy * c];
}

// Exhaust trails: `pose(s)` gives the ship ({ x, y, roll, thrust }) at time s; the trail is
// where the exhaust left the nozzle, blown back at 0.25 px/ms, so turns bend it.
export function trails(ctx, pose, t, engines = [true, true]) {
    ENGINES.forEach((e, k) => {
        if (!engines[k]) return;
        for (let age = 0; age < 900; age += 12) {
            const p = pose(t - age),
                th = p.thrust ?? 0.3;
            const reach = 250 + 650 * th; // how long it lasts with this much thrust (ms)
            if (age > reach) break;
            const [nx, ny] = toField(p.x, p.y, p.roll ?? 0, [e[0] + NOZZLE, e[1]]);
            const x = nx + age * (0.12 + 0.25 * th),
                u = age / reach;
            if (x > 480) continue;
            ctx.globalAlpha = (1 - u) * (0.5 + 0.5 * th);
            ctx.fillStyle = u < 0.2 ? '#ffffff' : u < 0.5 ? '#ffb070' : '#8a6a9a';
            const w = u < 0.3 ? 4 : 3;
            px(ctx, x, ny - 1 + Math.sin(age / 40 + k) * u * 2, w, w);
        }
        ctx.globalAlpha = 1;
    });
}

// o: roll (bank or list), thrust 0..1 (engines flare), engines [top, bottom] alive, guns
// [cannon, pods, mines] alive, pods open, intake 0..1 (the intakes lit: they can be hurt).
export function bastion(ctx, x, y, o = {}) {
    const {
        roll = 0,
        thrust = 0.3,
        engines = [true, true],
        guns = [true, true, true],
        podsOpen = false,
        time = 0,
    } = o;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(roll);
    art.draw(ctx, 'ruins', 'bastion-hull', 0, 0);
    art.draw(ctx, 'ruins', guns[0] ? 'bastion-cannon' : 'bastion-cannon-dead', 0, 0);
    art.draw(
        ctx,
        'ruins',
        guns[1] ? (podsOpen ? 'bastion-pods-open' : 'bastion-pods') : 'bastion-pods-dead',
        0,
        0,
    );
    art.draw(ctx, 'ruins', guns[2] ? 'bastion-mine' : 'bastion-mine-dead', 0, 0);
    ENGINES.forEach(([ex, ey], k) => {
        ctx.save();
        ctx.translate(ex, ey);
        if (ey > 0) ctx.scale(1, -1);
        art.draw(ctx, SHEET, engines[k] ? 'engine' : 'engine-dead', 0, 0);
        ctx.restore();
    });
    ENGINES.forEach(([ex, ey], k) => {
        if (!engines[k]) return;
        // The nozzle's flame and the intake's glow: both grow with thrust.
        const f = 0.4 + 0.6 * thrust;
        glow(ctx, ex + NOZZLE, ey, 10 + 16 * f, '255,170,90', 0.6 * f);
        ctx.fillStyle = '#ffffff';
        px(
            ctx,
            ex + NOZZLE - 1,
            ey - 2,
            3 + Math.round(6 * f * (0.8 + 0.2 * Math.sin(time / 30))),
            4,
        );
        glow(ctx, ex - 36, ey, 8 + 8 * f, '255,120,60', 0.5 * f);
    });
    ctx.restore();
}
// Smoke from a wrecked hardpoint or engine at (x, y): puffs rising and drifting back.
export function smoke(ctx, x, y, t, seed = 0) {
    for (let k = 0; k < 7; k++) {
        const u = (t / 900 + k / 7 + seed) % 1;
        ctx.globalAlpha = 0.6 * (1 - u);
        ctx.fillStyle = k % 2 ? '#5a5466' : '#3a3644';
        const r = 2 + Math.round(u * 4);
        px(ctx, x + u * 30 + Math.sin(k + t / 300) * 3, y - u * 26, r, r);
    }
    ctx.globalAlpha = 1;
    if (Math.floor(t / 90 + seed * 10) % 3 === 0) {
        ctx.fillStyle = '#ffb060';
        px(ctx, x, y, 2, 2);
    }
}

// The new missile: a slim body with fins, a hot white nose core, an exhaust flame, and a
// smoke trail left where it has been (`path(s)` gives its [x, y] at time s, or null).
export function missile(ctx, path, t, born) {
    const now = path(t);
    if (!now) return;
    for (let age = 20; age < 700; age += 20) {
        if (t - age < born) break;
        const p = path(t - age);
        if (!p) break;
        const u = age / 700;
        ctx.globalAlpha = 0.55 * (1 - u);
        ctx.fillStyle = u < 0.15 ? '#ffb070' : '#7a7488';
        const r = 1 + Math.round(u * 3);
        px(ctx, p[0] - r / 2, p[1] - r / 2 - u * 4, r, r);
    }
    ctx.globalAlpha = 1;
    const back = path(t - 16) ?? now,
        a = Math.atan2(now[1] - back[1], now[0] - back[0]);
    const c = Math.cos(a),
        s = Math.sin(a);
    const at = (f, side) => [now[0] + c * f - s * side, now[1] + s * f + c * side];
    glow(ctx, ...at(-8, 0), 7, '255,140,60', 0.7);
    ctx.fillStyle = '#ff8a3a';
    px(ctx, ...at(-10 - (Math.floor(t / 40) % 2) * 2, 0), 2, 2);
    ctx.fillStyle = '#9aa2b4';
    for (let f = -6; f <= 4; f++) px(ctx, ...at(f, 0), 1, 2);
    ctx.fillStyle = '#5a6274';
    for (const side of [-2, 2]) px(ctx, ...at(-6, side), 2, 1);
    ctx.fillStyle = '#ffffff';
    px(ctx, ...at(5, 0), 2, 2);
}
// A missile shot down: a short burst of hot fragments.
export function pop(ctx, x, y, u) {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 8 + 10 * u, '255,180,90', 0.8 * (1 - u));
    ctx.globalAlpha = 1 - u;
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        ctx.fillStyle = k % 2 ? '#ffffff' : '#ff9a4a';
        px(ctx, x + Math.cos(a) * 9 * u, y + Math.sin(a) * 9 * u);
    }
    ctx.globalAlpha = 1;
}
// The lock-on reticle: four corners closing in on the pilot (u 0..1), red when locked.
export function reticle(ctx, x, y, u, t) {
    const r = lerp(30, 9, clamp01(u)),
        locked = u >= 1;
    ctx.fillStyle = locked ? (Math.floor(t / 80) % 2 ? '#ff4a3a' : '#ffffff') : '#ff9a6a';
    for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
    ]) {
        px(ctx, x + sx * r - (sx > 0 ? 3 : 0), y + sy * r, 4, 1);
        px(ctx, x + sx * r, y + sy * r - (sy > 0 ? 3 : 0), 1, 4);
    }
}
export { cell };
