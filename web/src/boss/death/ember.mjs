// Death sequences for the ember region's boss and mini-boss.
import { ease, hash, pixelGlow } from '../../render/fx.mjs';
import {
    TAU,
    clamp01,
    snap4,
    FIRE,
    shake,
    flicker,
    fireball,
    rays,
    whiteFlash,
    rubble,
    embers,
    body,
} from './fx.mjs';

export const SCRIPTS = {
    // 2: the golem overheats: its doors blow off, its arms fall away, the kiln splits on a
    // column of fire, then embers rain.
    2(d) {
        const { x, y, age } = d,
            [sx, sy] = shake(d, 4 + age / 200, 0, 1700),
            ctx = d.ctx;
        const whole = age < 900,
            halves = age >= 900 && age < 1750;
        pixelGlow(ctx, x, y, 190, '255,90,30', 0.25 + Math.min(0.4, age / 2000));
        const arm = (key, side, a, dx, dy, alpha = 1) => {
            ctx.save();
            ctx.translate(Math.round(x + side * 64 + dx), Math.round(y - 46 + dy));
            ctx.rotate(a);
            d.art.drawFx(ctx, d.sheet, key, 0, 0, { alpha });
            ctx.restore();
        };
        // The arms: twitching, then torn off and falling, tumbling.
        const fall = Math.max(0, age - 700);
        for (const [key, side, rest] of [
            ['golem-ladle', 1, -0.2],
            ['golem-hammer', -1, 0.25],
        ]) {
            if (fall === 0) arm(key, side, rest + Math.sin(age / 60 + side) * 0.15, sx, sy);
            else if (fall < 1300)
                arm(
                    key,
                    side,
                    rest + side * fall * 0.004,
                    side * fall * 0.06,
                    fall * fall * 0.00012,
                    1 - clamp01((fall - 900) / 400),
                );
        }
        if (whole) {
            body(d, 'golem-bellows-0', { dx: sx, dy: sy });
            body(d, 'golem-torso', { dx: sx, dy: sy, flash: flicker(d, 100, 500) });
            body(d, 'golem-core-2', { dx: sx, dy: sy });
            body(d, 'golem-d2', { dx: sx, dy: sy, alpha: clamp01(age / 700) });
            const rattle = Math.floor(age / 70) % 2 ? 2 : 0;
            body(d, 'golem-door-l', { dx: sx - rattle, dy: sy });
            body(d, 'golem-door-r', { dx: sx + rattle, dy: sy });
        } else if (halves) {
            const t = ease(clamp01((age - 900) / 800));
            for (const side of [-1, 1])
                body(d, 'golem-torso', {
                    dx: side * t * 44 + sx,
                    dy: sy,
                    rot: side * t * 0.12,
                    clip: side < 0 ? [-170, -170, 170, 340] : [0, -170, 170, 340],
                    flash: flicker(d, 90, 1300),
                });
            const h = 250 * t,
                w = 8 + t * 28;
            for (const [scale, colour] of [
                [1, '#e8944a'],
                [0.62, '#ffd9a0'],
                [0.3, '#ffffff'],
            ]) {
                ctx.fillStyle = colour;
                const ww = snap4(w * scale),
                    hh = snap4(h * (0.6 + scale * 0.4));
                ctx.fillRect(snap4(x - ww / 2), snap4(y - hh / 2), ww, hh);
            }
        }
        // The doors blow off at 900 ms, spinning away with a jet of fire behind each.
        if (age >= 900 && age < 1900) {
            const a = age - 900;
            for (const [key, side] of [
                ['golem-door-l', -1],
                ['golem-door-r', 1],
            ]) {
                const dx = side * (30 + a * 0.25),
                    dy = -a * 0.12 + a * a * 0.0002;
                if (a < 160) {
                    ctx.fillStyle = '#ffd060';
                    for (let k = 0; k < 30; k++)
                        ctx.fillRect(Math.round(x + side * k * 2), Math.round(y + 2), 2, 2);
                }
                body(d, key, { dx, dy, rot: side * a * 0.008, alpha: 1 - a / 1000 });
                pixelGlow(ctx, x + dx + side * 16, y + dy, 18, '255,150,50', 0.5 * (1 - a / 1000));
            }
        }
        whiteFlash(d, 1500);
        rays(d, x, y, 1500, { reach: 1.4, colours: ['#ffd060', '#ff8a2a', '#ffffff'] });
        fireball(d, x, y, 1500, 1.5, FIRE, 1700);
        rubble(d, x, y, 1700, { speed: 1.1 });
        embers(d, x, y, 1700);
    },
    // 8: Cinderling cracks, vents fire from its shell, and bursts into embers.
    8(d) {
        const { x, y, age } = d,
            ctx = d.ctx,
            [sx, sy] = shake(d, 6, 0, 650);
        if (age < 650) {
            body(d, 'cinderling-1', { dx: sx, dy: sy, flash: flicker(d, 90, 200) });
            body(d, 'cinderling-d2', { dx: sx, dy: sy, alpha: clamp01(age / 400) });
            ctx.fillStyle = '#ffd060';
            for (let j = 0; j < 8; j++) {
                if (Math.floor(age / 70 + j) % 3 === 0) continue;
                const a = (j * TAU) / 8 + hash(j) * 0.3;
                for (let k = 0; k < 18; k++)
                    ctx.fillRect(
                        Math.round(x + Math.cos(a) * (54 + k * 1.5)),
                        Math.round(y + Math.sin(a) * (54 + k * 1.5)),
                        2,
                        2,
                    );
            }
        }
        whiteFlash(d, 650, 100, 0.35);
        rays(d, x, y, 650, { reach: 0.9 });
        fireball(d, x, y, 650, 0.85, FIRE, 1000);
        rubble(d, x, y, 700, { count: 7, speed: 0.8, life: 900 });
        embers(d, x, y, 700, { count: 26, spread: 150, life: 950 });
    },
};
