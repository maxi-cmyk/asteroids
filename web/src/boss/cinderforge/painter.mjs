// The Cinderforge's painter (nextSteps.md P4.3): a furnace golem hovering on the flame of its
// bellows. The hammer arm faces you, the ladle arm hangs on the far side; heat lamps on its
// belt are the gauge, and at full heat its chest doors burst open on the core, steam pours
// from its shoulders and chimney. Every attack shows in its body: the bellows breathe in
// before a blast, the hammer is raised over a strike, the ladle scoops and whips over, and
// its flame is driven into the floor before the geysers.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { ATTACK } from '../scene.mjs';
import { px } from '../draw-kit.mjs';

const SHOULDER = 64,
    SHOULDER_Y = -46,
    FLOOR = 262;
const HEAT = ['255,120,40', '255,170,60', '255,230,170'];
const heatColour = (h) => HEAT[h < 0.45 ? 0 : h < 0.85 ? 1 : 2];

export const cinderforge = (b) => {
    const { ctx, art, sheet, state, x, time, aux, alpha, flash, A } = b;
    const heat = aux[A.heat],
        open = aux[A.open],
        breath = aux[A.breath],
        steam = aux[A.steam],
        lamps = Math.round(aux[A.lamps]),
        core = Math.round(aux[A.core]);
    const y = b.y + Math.round(Math.sin(time / 600) * 2);
    const draw = (key, dx = 0, dy = 0, extra = {}) =>
        art.draw(ctx, sheet, key, Math.round(x + dx), Math.round(y + dy), {
            alpha,
            flash,
            ...extra,
        });
    const arm = (key, side, a) => {
        ctx.save();
        ctx.translate(Math.round(x + side * SHOULDER), Math.round(y + SHOULDER_Y));
        ctx.rotate(a);
        art.draw(ctx, sheet, key, 0, 0, { alpha, flash });
        ctx.restore();
    };
    glow(ctx, x, y, 150, heatColour(heat), 0.12 + 0.25 * heat);

    // The flame it hovers on, from the bellows' nozzle (driven down to the floor before the
    // geysers).
    const nozzle = y + 62 + 18 + 22 * breath + 10;
    if (aux[A.flame] > 0.5) {
        const h = Math.max(0, FLOOR - nozzle);
        glow(ctx, x, nozzle + h / 2, 24, '255,170,60', 0.6);
        ctx.fillStyle = '#ff7a1e';
        ctx.fillRect(Math.round(x - 6), Math.round(nozzle), 13, h);
        ctx.fillStyle = '#ffb060';
        ctx.fillRect(Math.round(x - 3), Math.round(nozzle), 7, h);
        ctx.fillStyle = '#ffe8b0';
        ctx.fillRect(Math.round(x - 1), Math.round(nozzle), 3, h);
        // It splashes along the floor where it hits.
        for (let k = 0; k < 14; k++) {
            const u = (time / 300 + k / 14) % 1;
            ctx.fillStyle = k % 3 ? '#ff9a3a' : '#ffe2a0';
            px(ctx, x + (k % 2 ? 1 : -1) * u * 60, FLOOR - 2 - Math.sin(u * Math.PI) * 10, 2, 2);
        }
        glow(ctx, x, FLOOR, 44, '255,170,60', 0.9);
    } else {
        for (let k = 0; k < 10; k++) {
            const f = (time / 40 + k * 7) % 14;
            ctx.fillStyle = k % 3 ? '#ff9a3a' : '#ffe2a0';
            px(ctx, x - 3 + Math.sin(k * 1.7 + time / 90) * 3, nozzle + f * 1.4, 2, 2);
        }
    }
    glow(ctx, x, nozzle + 12, 14, '255,150,60', 0.6);

    arm('golem-ladle', 1, aux[A.ladle]);
    draw(`golem-bellows-${Math.max(0, Math.min(3, Math.round(breath * 3)))}`);
    draw('golem-torso');
    draw(`golem-core-${core}`, 0, 0, { flash: 0 });
    if (open > 0) glow(ctx, x, y + 2, 30 + 16 * open, '255,220,150', 0.5 * open);
    draw('golem-door-l', -30 * open);
    draw('golem-door-r', 30 * open);
    b.overlay('golem');

    // The blast's breath in: embers drawn back into the furnace mouth.
    if (state.attack === ATTACK.ember && state.attackMs < 800) {
        const u = state.attackMs / 800;
        for (let k = 0; k < 18; k++) {
            const v = (time / 600 + k / 18) % 1,
                a = Math.PI + ((k % 7) - 3) * 0.12,
                r = 140 * (1 - v);
            ctx.fillStyle = k % 3 ? '#ff9a3a' : '#ffe2a0';
            px(ctx, x - 40 + Math.cos(a) * r, y + 2 + Math.sin(a) * r, 2, 1);
        }
        glow(ctx, x - 40, y + 2, 10 + 20 * u, '255,170,60', 0.6 * u);
    }

    // The heat lamps on its belt: one per attack, white and blinking when full.
    const full = lamps >= 5 && Math.floor(time / 110) % 2;
    for (let k = 0; k < 5; k++) {
        const on = k < lamps;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = !on ? '#2a1418' : full ? '#ffffff' : k < 3 ? '#ff8a2a' : '#ffd070';
        px(ctx, x - 36 + k * 16, y + 44, 8, 6);
        ctx.globalAlpha = 1;
        if (on) glow(ctx, x - 32 + k * 16, y + 48, 6, heatColour(heat), 0.6);
    }
    // Eyes, as hot as it is.
    for (const sx of [-11, 11]) glow(ctx, x + sx, y - 67, 6 + 4 * heat, heatColour(heat), 0.9);
    arm('golem-hammer', -1, aux[A.hammer]);
    // The hammer's head flashes as it lands.
    if (
        state.attack === ATTACK.hammer &&
        (state.attackMs % 1000) - 900 >= 0 &&
        state.attackMs % 1000 < 1050
    ) {
        const a = aux[A.hammer];
        glow(
            ctx,
            x - SHOULDER - Math.sin(a) * 96,
            y + SHOULDER_Y + Math.cos(a) * 96,
            24,
            '255,230,170',
            0.8,
        );
    }
    if (steam > 0) {
        // Steam from the shoulders and the chimney while it vents.
        for (const [sx, sy, dx] of [
            [-70, -60, -1],
            [70, -60, 1],
            [0, -130, 0],
        ])
            for (let k = 0; k < 8; k++) {
                const u = ((time / 500 + k / 8) % 1) * steam;
                ctx.globalAlpha = (1 - u) * steam * alpha;
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
};
