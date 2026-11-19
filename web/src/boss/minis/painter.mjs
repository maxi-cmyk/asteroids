// The minis' painters (nextSteps.md P4.6): each borrows its boss's new motion or tell. The
// Picket's eye follows you and narrows before it fires; the Shardling's blades orbit on a
// tilting ring; the Cinderling is a small furnace golem that heats up and vents; the Gunnery
// banks as it moves, an engine trail left behind it. (The Moonjelly's pulse swim is drawn
// with the Tidecaller's, in tidecaller/painter.mjs.)
import { pixelGlow as glow } from '../../render/fx.mjs';
import { S } from '../../runtime/scene-layout.mjs';
import { dottedOrbit, px, TAU } from '../draw-kit.mjs';

export const picket = (b) => {
    const { ctx, art, scene, x, y, aux, alpha, A } = b;
    const open = aux[A.open],
        busy = aux[A.busy] > 0.5;
    const frame = Math.round(open * 2);
    b.frame(`picket-${frame}`);
    // Its eye, inside the gate, rolled toward the pilot; narrowed while it is about to fire.
    const gx = scene[S.SHIP_X] - x,
        gy = scene[S.SHIP_Y] - y,
        d = Math.hypot(gx, gy) || 1;
    const mood = busy && open < 0.5 ? 'narrow' : open > 0.5 ? 'wide' : 'calm';
    // Only what shows between the shutters: their inner edges sit 2 + 15·open px either side
    // of the centre in the sprite (boss_sprites.picket_gate), so a shut gate hides the eye.
    const gap = 2 + frame * 7.5;
    if (frame === 0) {
        b.overlay('picket');
        return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), 22, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(Math.round(x) - 30, Math.round(y - gap), 60, Math.round(gap * 2));
    ctx.clip();
    ctx.translate(Math.round(x + (gx / d) * 5), Math.round(y + (gy / d) * 5));
    ctx.scale(0.52, 0.52);
    art.draw(ctx, 'frontier', `sentinel-eye-${mood}`, 0, 0, { alpha });
    ctx.restore();
    b.overlay('picket');
    if (open > 0.5) glow(ctx, x, y, 28, '255,200,120', 0.35);
};

export const shardling = (b) => {
    const { ctx, art, x, y, aux, alpha, state, A } = b;
    const tilt = aux[A.tilt],
        axis = aux[A.axis];
    dottedOrbit(ctx, x, y, 46, 46 * Math.cos(tilt), axis, '#6a52c0');
    const c = Math.cos(axis),
        s = Math.sin(axis);
    const blades = [0, 1, 2].map((k) => {
        const a = aux[A.spin] + (k * TAU) / 3,
            bx = Math.cos(a) * 46,
            by = Math.sin(a) * 46 * Math.cos(tilt);
        return { x: x + bx * c - by * s, y: y + bx * s + by * c, z: Math.sin(a) };
    });
    const draw = (bl) =>
        art.draw(
            ctx,
            'violet',
            `blade-inner-${((Math.round(Math.atan2(bl.y - y, bl.x - x) / (Math.PI / 8)) % 16) + 16) % 16}`,
            bl.x,
            bl.y,
            { alpha: bl.z < 0 ? alpha * 0.55 : alpha },
        );
    blades.filter((bl) => bl.z < 0).forEach(draw);
    b.frame(`shardling-${state.attack ? 1 : 0}`);
    b.overlay('shardling');
    blades.filter((bl) => bl.z >= 0).forEach(draw);
};

// A half-size furnace golem: it heats up through its lob and vents (doors open, steam) after.
export const cinderling = (b) => {
    const { ctx, art, x, state, time, aux, alpha, flash, A } = b;
    const open = aux[A.open] > 0.5;
    const heat = open ? 1 : state.attack ? Math.min(1, 0.3 + state.attackMs / 1000) : 0.3;
    const y = b.y + Math.round(Math.sin(time / 600));
    glow(ctx, x, y, 80, heat > 0.8 ? '255,230,170' : '255,140,50', 0.12 + 0.25 * heat);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(0.5, 0.5);
    const part = (key, dx = 0) => art.draw(ctx, 'ember', key, dx, 0, { alpha, flash });
    const arm = (key, side, a) => {
        ctx.save();
        ctx.translate(side * 64, -46);
        ctx.rotate(a);
        art.draw(ctx, 'ember', key, 0, 0, { alpha, flash });
        ctx.restore();
    };
    // The flame it hovers on.
    for (let k = 0; k < 8; k++) {
        ctx.fillStyle = k % 3 ? '#ff9a3a' : '#ffe2a0';
        px(ctx, -4 + Math.sin(k * 1.7 + time / 90) * 4, 112 + ((time / 40 + k * 7) % 14) * 2, 4, 4);
    }
    arm(
        'golem-ladle',
        1,
        state.attack ? -0.2 - Math.sin(Math.min(1, state.attackMs / 600) * Math.PI) * 2 : -0.2,
    );
    part(`golem-bellows-${Math.round((0.5 + 0.5 * Math.sin(time / 400)) * 3)}`);
    part('golem-torso');
    part(`golem-core-${open ? 2 : heat > 0.6 ? 1 : 0}`);
    part('golem-door-l', open ? -30 : 0);
    part('golem-door-r', open ? 30 : 0);
    arm('golem-hammer', -1, 0.25);
    ctx.restore();
    b.overlay('cinderling');
    for (const sx of [-6, 6]) glow(ctx, x + sx, y - 34, 4 + 3 * heat, '255,170,60', 0.9);
    if (open) {
        glow(ctx, x, y + 1, 22, '255,220,150', 0.5);
        for (const [sx, sy, dx] of [
            [-35, -30, -1],
            [35, -30, 1],
            [0, -65, 0],
        ])
            for (let k = 0; k < 6; k++) {
                const u = (time / 500 + k / 6) % 1;
                ctx.globalAlpha = (1 - u) * alpha;
                ctx.fillStyle = '#e8eef8';
                px(
                    ctx,
                    x + sx + dx * u * 20 + Math.sin(k * 3 + time / 120) * 2,
                    y + sy - u * 22,
                    2,
                    2,
                );
            }
        ctx.globalAlpha = 1;
    }
};

// The Gunnery banks with its climb and dive, and leaves an engine trail in space behind it.
const wake = [];
let gunLast = 0,
    gunY = 0,
    gunRoll = 0;
export const gunnery = (b) => {
    const { ctx, art, sheet, x, y, time, aux, alpha, flash, A } = b;
    if (time < gunLast || time - gunLast > 500) {
        wake.length = 0;
        gunY = y;
    }
    const dt = Math.max(1, time - gunLast);
    gunLast = time;
    const vy = (y - gunY) / dt; // px per ms
    gunY = y;
    gunRoll += (Math.max(-0.2, Math.min(0.2, vy * 1.2)) - gunRoll) * 0.1;
    const c = Math.cos(gunRoll),
        s = Math.sin(gunRoll);
    const nozzle = [x + 96 * c, y + 96 * s + 2];
    wake.push([...nozzle, time]);
    while (wake.length && time - wake[0][2] > 700) wake.shift();
    for (const [wx, wy, t] of wake) {
        const age = time - t,
            u = age / 700,
            X = wx + age * 0.15;
        if (X > 482) continue;
        ctx.globalAlpha = (1 - u) * alpha;
        ctx.fillStyle = u < 0.2 ? '#ffffff' : '#ffb070';
        px(ctx, X - 1, wy - 1, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(gunRoll);
    art.draw(ctx, sheet, aux[A.firing] > 0.5 ? 'gunnery-1' : 'gunnery-0', 0, 0, { alpha, flash });
    ctx.restore();
    b.overlay('gunnery');
    glow(ctx, ...nozzle, 12, '255,170,90', 0.7);
    glow(ctx, x + 68, y, 18, '255,120,80', 0.2 + (aux[A.firing] ? 0.3 : 0));
};
