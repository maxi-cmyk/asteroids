// The Bastion's painter (nextSteps.md P4.4): the battleship banking into its turns and listing
// as it is hurt, an engine on an outrigger above and below the stern (its weak point) with a
// flame and lit intake that grow with thrust, exhaust trails left in space behind it (so its
// turns bend them), smoke from lost guns and a lost engine, and the missile lock-on reticle
// closing on the pilot before the tubes flash.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { S } from '../../runtime/scene-layout.mjs';
import { ATTACK, PART } from '../scene.mjs';
import { px } from '../draw-kit.mjs';

const lerp = (a, b, u) => a + (b - a) * u;
const ENGINE_X = 66,
    ENGINE_Y = 98,
    NOZZLE = 40;
const TUBE = [-30, 76];

const toField = (x, y, roll, dx, dy) => {
    const c = Math.cos(roll),
        s = Math.sin(roll);
    return [x + dx * c - dy * s, y + dx * s + dy * c];
};

// Exhaust left where each nozzle was: [x, y, time, thrust] per engine, blown back over time.
const exhaust = [[], []];
let lastTime = 0;
function trails(ctx, nozzles, alive, thrust, time) {
    if (time < lastTime || time - lastTime > 500) exhaust.forEach((e) => (e.length = 0));
    lastTime = time;
    nozzles.forEach(([x, y], k) => {
        const e = exhaust[k];
        if (alive[k] && x < 500) e.push([x, y, time, thrust]);
        while (e.length && time - e[0][2] > 900) e.shift();
        for (const [ex, ey, t, th] of e) {
            const age = time - t,
                reach = 250 + 650 * th,
                u = age / reach;
            if (u >= 1) continue;
            const X = ex + age * (0.12 + 0.25 * th);
            if (X > 482) continue;
            ctx.globalAlpha = (1 - u) * (0.5 + 0.5 * th);
            ctx.fillStyle = u < 0.2 ? '#ffffff' : u < 0.5 ? '#ffb070' : '#8a6a9a';
            const w = u < 0.3 ? 4 : 3;
            px(ctx, X, ey - 1 + Math.sin(age / 40 + k) * u * 2, w, w);
        }
        ctx.globalAlpha = 1;
    });
}
// Smoke from a wreck: puffs rising and drifting back, now and then a spark.
function smoke(ctx, x, y, t, seed) {
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
// The lock-on: four corners closing in on the pilot (u 0..1), red and blinking once locked.
function reticle(ctx, x, y, u, t) {
    const r = lerp(30, 9, Math.min(1, u)),
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

export const bastion = (b) => {
    const { ctx, art, scene, sheet, state, x, y, time, aux, parts, alpha, flash, A } = b;
    const roll = aux[A.roll],
        thrust = aux[A.thrust];
    const guns = [false, false, false];
    for (const p of parts) if (p.kind === PART.hard) guns[p.slot] = true;
    const engines = [0, 1].map((k) => parts.find((p) => p.kind === PART.engine && p.slot === k));
    const alive = engines.map((e) => !!e && e.state === 0);
    const nozzles = [-1, 1].map((sy) => toField(x, y, roll, ENGINE_X + NOZZLE, sy * ENGINE_Y));
    trails(ctx, nozzles, alive, thrust, time);

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(roll);
    const draw = (key, on = true) =>
        art.draw(ctx, sheet, key, 0, 0, { alpha, flash: on ? flash : 0 });
    draw('bastion-hull');
    if (state.stage >= 2) art.draw(ctx, sheet, 'bastion-flare', 0, 0, { alpha });
    draw(guns[0] ? 'bastion-cannon' : 'bastion-cannon-dead', guns[0]);
    draw(
        guns[1] ? (aux[A.pods] ? 'bastion-pods-open' : 'bastion-pods') : 'bastion-pods-dead',
        guns[1],
    );
    draw(guns[2] ? 'bastion-mine' : 'bastion-mine-dead', guns[2]);
    [-1, 1].forEach((sy, k) => {
        ctx.save();
        ctx.translate(ENGINE_X, sy * ENGINE_Y);
        if (sy > 0) ctx.scale(1, -1);
        art.draw(ctx, sheet, alive[k] ? 'bastion-engine' : 'bastion-engine-dead', 0, 0, {
            alpha,
            flash,
        });
        ctx.restore();
        if (!alive[k]) return;
        // The nozzle's flame and the lit intake: both grow with thrust.
        const f = 0.4 + 0.6 * thrust,
            ey = sy * ENGINE_Y;
        glow(ctx, ENGINE_X + NOZZLE, ey, 10 + 16 * f, '255,170,90', 0.6 * f);
        ctx.fillStyle = '#ffffff';
        px(
            ctx,
            ENGINE_X + NOZZLE - 1,
            ey - 2,
            3 + Math.round(6 * f * (0.8 + 0.2 * Math.sin(time / 30))),
            4,
        );
        glow(ctx, ENGINE_X - 36, ey, 8 + 8 * f, '255,120,60', 0.5 * f);
    });
    ctx.restore();
    b.overlay('bastion');

    // Smoke from what it has lost.
    for (const p of parts) {
        if (p.kind === PART.hard && p.hp < 3) glow(ctx, p.x, p.y, 20, '255,120,50', 0.3);
        if (p.kind === PART.engine && p.state === 1) smoke(ctx, p.x + 20, p.y, time, 0.4);
    }
    const holes = [
        [8, -56],
        [-28, 58],
        [50, 56],
    ];
    guns.forEach((on, i) => {
        if (!on) smoke(ctx, ...toField(x, y, roll, ...holes[i]), time, i * 0.3);
    });

    // The missiles: the lock-on, then a flash and a puff at the tube for each launch.
    if (state.attack === ATTACK.missile) {
        const u = aux[A.lock];
        if (state.attackMs < 700) reticle(ctx, scene[S.SHIP_X], scene[S.SHIP_Y], u, time);
        const since = (state.attackMs - 600) % 600;
        if (state.attackMs >= 600 && since < 200) {
            const [tx, ty] = toField(x, y, roll, ...TUBE);
            glow(ctx, tx, ty, 12, '255,220,160', 1 - since / 200);
            for (let j = 0; j < 5; j++) {
                ctx.globalAlpha = 1 - since / 200;
                ctx.fillStyle = '#8a8496';
                px(ctx, tx + 4 + j * 3 + since * 0.05, ty + 4 + ((j * 7) % 5), 3, 3);
            }
            ctx.globalAlpha = 1;
        }
    }
};
