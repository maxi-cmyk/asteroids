// Tiles for the five minis (nextSteps.md P4.6): each borrows its boss's new motion or tell,
// with no new attacks. Drawn from the game's own mini cells plus the bosses' storyboard parts.
import { art, cell, dottedOrbit, ease, glow, note, pilot, px, span, TAU } from './kit.mjs';
import { SHEET as SENT } from './sentinel/body.mjs';
import { golem } from './cinderforge/body.mjs';
import { swim } from './tidecaller/body.mjs';

await Promise.all([art.load('frontier'), art.load('violet'), art.load('ruins'), art.load('lunar')]);
const ship = (t) => [96, 135 + 80 * Math.sin(t / 1300)];

// The Picket: its eye follows you inside the gate, and narrows before it fires.
export function picket(ctx, t) {
    const P = ship(t),
        x = 380,
        y = 135,
        tell = t % 4000 > 3000;
    cell(ctx, 'frontier', `picket-${tell ? 1 : 2}`, x, y);
    const d = Math.hypot(P[0] - x, P[1] - y),
        ex = ((P[0] - x) / d) * 5,
        ey = ((P[1] - y) / d) * 5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, TAU);
    ctx.clip();
    cell(ctx, SENT, `sent-eye-${tell ? 'narrow' : 'wide'}`, x + ex, y + ey, { k: 0.52 });
    ctx.restore();
    pilot(ctx, ...P);
    note(
        ctx,
        tell ? 'Picket: the eye narrows before it fires' : 'Picket: its eye follows you',
        12,
        258,
    );
}

// The Shardling: its three blades orbit on a tilted ring that wobbles.
export function shardling(ctx, t) {
    const x = 370,
        y = 135 + 30 * Math.sin(t / 1500),
        tilt = 0.9 + 0.35 * Math.sin(t / 900),
        axis = 0.4 * Math.sin(t / 1400);
    dottedOrbit(ctx, x, y, 46, 46 * Math.cos(tilt), axis, '#6a52c0');
    const blades = [0, 1, 2].map((k) => {
        const a = t / 500 + (k * TAU) / 3,
            px_ = Math.cos(a) * 46,
            py_ = Math.sin(a) * 46 * Math.cos(tilt);
        return {
            x: x + px_ * Math.cos(axis) - py_ * Math.sin(axis),
            y: y + px_ * Math.sin(axis) + py_ * Math.cos(axis),
            z: Math.sin(a),
        };
    });
    const draw = (b) =>
        art.draw(
            ctx,
            'violet',
            `blade-inner-${((Math.round(Math.atan2(b.y - y, b.x - x) / (Math.PI / 8)) % 16) + 16) % 16}`,
            Math.round(b.x),
            Math.round(b.y),
            { alpha: b.z < 0 ? 0.55 : 1 },
        );
    blades.filter((b) => b.z < 0).forEach(draw);
    cell(ctx, 'violet', 'shardling-0', x, y);
    blades.filter((b) => b.z >= 0).forEach(draw);
    pilot(ctx, ...ship(t));
    note(ctx, 'Shardling: its blades orbit on a tilting ring', 12, 258);
}

// The Cinderling: a small golem that heats up and vents (once the Cinderforge is chosen).
export function cinderling(ctx, t) {
    const u = t % 6000,
        vent = u > 4000;
    ctx.save();
    ctx.translate(380, 135);
    ctx.scale(0.5, 0.5);
    golem(ctx, 0, 0, {
        heat: vent ? 1 - span(u, 4000, 6000) : Math.min(1, Math.floor(u / 1000 + 1) / 4),
        doors: vent ? ease(span(u, 4000, 4200)) * (1 - span(u, 5700, 6000)) : 0,
        core: vent ? 2 : 0,
        steam: vent ? 1 : 0,
        breath: 0.4 + 0.3 * Math.sin(t / 400),
        time: t,
    });
    ctx.restore();
    pilot(ctx, ...ship(t));
    note(
        ctx,
        vent
            ? 'Cinderling: it vents, the core is bare'
            : 'Cinderling: each attack heats it (if the golem is chosen)',
        12,
        258,
    );
}

// The Gunnery: it banks as it moves, an engine trail behind it.
export function gunnery(ctx, t) {
    const yAt = (s) => 135 + 50 * Math.sin(s / 1500);
    const y = yAt(t),
        roll = (yAt(t + 30) - y) * 0.06;
    for (let age = 0; age < 700; age += 12) {
        const yy = yAt(t - age),
            u = age / 700;
        ctx.globalAlpha = 1 - u;
        ctx.fillStyle = u < 0.2 ? '#ffffff' : '#ffb070';
        px(ctx, 470 + age * 0.15 - 4, yy + 2, 3, 3);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(372, Math.round(y));
    ctx.rotate(roll);
    art.draw(ctx, 'ruins', 'gunnery-0', 0, 0);
    glow(ctx, 96, 2, 12, '255,170,90', 0.7);
    ctx.restore();
    pilot(ctx, ...ship(t));
    note(ctx, 'Gunnery: it banks as it turns, an engine trail behind it', 12, 258);
}

// The Moonjelly: it swims in pulses like the Tidecaller.
const STOPS = [
    [370, 140],
    [350, 110],
    [384, 120],
    [360, 170],
];
export function moonjelly(ctx, t) {
    const p = swim(STOPS, t);
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.lean);
    ctx.scale(1 - 0.14 * p.squeeze, 1 + 0.08 * p.squeeze);
    art.draw(ctx, 'lunar', `moonjelly-${Math.floor(t / 280) % 4}`, 0, 0);
    ctx.restore();
    pilot(ctx, ...ship(t));
    note(ctx, 'Moonjelly: it swims in pulses', 12, 258);
}
