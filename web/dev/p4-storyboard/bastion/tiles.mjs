// Tiles for the Bastion (nextSteps.md P4.4): the engines as its weak point, sailing, the
// ramming run, the new missiles, and damage you can see.
import { clamp, dotted, ease, fire, glow, lerp, note, pilot, px, span } from '../kit.mjs';
import { bastion, ENGINES, HOME, missile, pop, reticle, smoke, toField, trails } from './body.mjs';

// Where a shot stops: on an engine (a burst: it hurts), or glancing off the hull.
function shipHit(p, engines = [true, true]) {
    return (y) => {
        for (const [k, e] of ENGINES.entries()) {
            if (!engines[k]) continue;
            const [ex, ey] = toField(p.x, p.y, p.roll ?? 0, e);
            if (Math.abs(y - ey) < 10) return { x: ex - 40, kind: 'burst', colour: '#ffb070' };
        }
        const dy = Math.abs(y - p.y);
        return dy < 70 ? { x: p.x - 170 + dy * 1.6, kind: 'glance' } : null;
    };
}

// ---------------------------------------------------------------- engines
export const ENGINE_MS = 8000;
const idle = (s) => ({ x: HOME[0], y: HOME[1] + 20 * Math.sin(s / 955), roll: 0, thrust: 0.3 });
export function engines(ctx, t) {
    const p = idle(t);
    trails(ctx, idle, t);
    bastion(ctx, p.x, p.y, { ...p, time: t });
    const ship = (s) => [96, s < 4000 ? idle(s + 500).y - 88 : 150];
    fire(ctx, t, ship, 260, 0, 7600, (y) => shipHit(p)(y));
    pilot(ctx, ...ship(t));
    note(
        ctx,
        t < 4000
            ? 'the engines on its flanks: shots there burst'
            : 'the hull and the guns still turn shots away',
        12,
        258,
    );
}

// ---------------------------------------------------------------- sailing
export const SAIL_MS = 8000;
const sailY = (s) => HOME[1] + 46 * Math.sin((s / SAIL_MS) * Math.PI * 2);
const sail = (s) => {
    const v = sailY(s + 30) - sailY(s);
    return {
        x: HOME[0],
        y: sailY(s),
        roll: clamp(v * 0.05, -0.14, 0.14),
        thrust: clamp(0.3 + Math.abs(v) * 0.7, 0, 1),
    };
};
export function sailing(ctx, t) {
    const p = sail(t);
    trails(ctx, sail, t);
    bastion(ctx, p.x, p.y, { ...p, time: t });
    pilot(ctx, 96, 135);
    note(
        ctx,
        p.thrust > 0.6
            ? 'turning: it banks, the engines flare, the trails stretch and bend'
            : 'cruising: engines low, short trails',
        12,
        258,
    );
}

// ---------------------------------------------------------------- ramming run
export const RAM_MS = 6400;
const LANE_Y = 92;
const ram = (s) => {
    if (s < 0) return { x: HOME[0], y: HOME[1], thrust: 0.3, roll: 0 };
    if (s < 1200) {
        const u = ease(span(s, 0, 700));
        return {
            x: HOME[0] + 10 * span(s, 700, 1200),
            y: lerp(HOME[1], LANE_Y, u),
            roll: -0.1 * Math.sin(Math.PI * u),
            thrust: 0.6 + 0.4 * span(s, 600, 1200),
        };
    }
    if (s < 2600)
        return {
            x: HOME[0] + 10 - 760 * span(s, 1200, 2600) ** 1.6,
            y: LANE_Y,
            roll: 0,
            thrust: 1,
        };
    if (s < 3800) return { x: 900, y: HOME[1], roll: 0, thrust: 0.5 };
    return { x: lerp(820, HOME[0], ease(span(s, 3800, 5000))), y: HOME[1], roll: 0, thrust: 0.6 };
};
export function ramming(ctx, t) {
    const p = ram(t);
    if (t < 1300) {
        // The lane it will take, top to bottom of the hull, blinking as it nears.
        const c = Math.floor(t / 110) % 2 && t > 900 ? '#ffffff' : '#ff9a6a';
        for (const y of [LANE_Y - 96, LANE_Y + 96])
            dotted(ctx, HOME[0] - 170, y, Math.PI, HOME[0] - 170, c, 6);
    }
    // Its wake: debris left along the lane, drifting, for 2.5 s.
    for (let k = 0; k < 16; k++) {
        const left = 1200 + (k / 16) * 1400,
            age = t - left;
        if (age < 0 || age > 2500) continue;
        const x = ram(left).x + 160 + ((k * 53) % 40),
            y = LANE_Y + (((k * 71) % 120) - 60) + age * 0.006 * ((k % 3) - 1);
        ctx.globalAlpha = 1 - age / 2500;
        ctx.fillStyle = k % 3 ? '#6a6478' : '#ff9a4a';
        px(ctx, x, y, 3 + (k % 3), 3);
        ctx.globalAlpha = 1;
    }
    trails(ctx, ram, t);
    bastion(ctx, p.x, p.y, { ...p, time: t });
    pilot(ctx, 120, 232);
    note(
        ctx,
        t < 1300
            ? 'it rises to a lane, bow on, engines flaring: the run is marked'
            : t < 3800
              ? 'the run: across the field, engines blazing, a wake of debris'
              : 'back in from the right',
        12,
        258,
    );
}

// ---------------------------------------------------------------- missiles
export const MISSILE_MS = 6400;
const TUBE = [HOME[0] - 46, HOME[1] + 60];
const pilotAt = (s) => [96, 135 + 60 * Math.sin(s / 1300)];
// Each missile homes on the pilot with a capped turn, simulated once.
const LAUNCH = [700, 1300, 1900];
const PATHS = LAUNCH.map((t0, k) => {
    const pts = [];
    let [x, y] = TUBE,
        a = Math.PI + 0.5 + k * 0.3;
    for (let s = t0; s < t0 + 4000; s += 16) {
        const [px_, py_] = pilotAt(s);
        const want = Math.atan2(py_ - y, px_ - x),
            d = Math.atan2(Math.sin(want - a), Math.cos(want - a));
        a += clamp(d, -0.04, 0.04);
        x += Math.cos(a) * 1.4;
        y += Math.sin(a) * 1.4;
        pts.push([x, y]);
    }
    return pts;
});
const DOWNED = 2900; // the middle one is shot down
export function missiles(ctx, t) {
    const p = idle(t);
    trails(ctx, idle, t);
    bastion(ctx, p.x, p.y, { ...p, podsOpen: t > 300 && t < 2400, time: t });
    const P = pilotAt(t);
    if (t < 700) reticle(ctx, ...P, span(t, 0, 600), t);
    for (const [k, t0] of LAUNCH.entries()) {
        if (t >= t0 && t < t0 + 200) {
            glow(ctx, ...TUBE, 12, '255,220,160', 1 - (t - t0) / 200);
            for (let j = 0; j < 5; j++) {
                ctx.fillStyle = '#8a8496';
                px(ctx, TUBE[0] + 4 + j * 3, TUBE[1] + 4 + ((j * 7) % 5), 3, 3);
            }
        }
        const path = (s) => {
            if (k === 1 && s >= DOWNED) return null;
            const i = Math.floor((s - t0) / 16);
            return i >= 0 && i < PATHS[k].length ? PATHS[k][i] : null;
        };
        if (t >= t0) missile(ctx, path, t, t0);
        if (k === 1) {
            const at = PATHS[1][Math.floor((DOWNED - t0) / 16)];
            pop(ctx, ...at, (t - DOWNED) / 300);
        }
    }
    pilot(ctx, ...P);
    note(
        ctx,
        t < 700
            ? 'the lock-on: a reticle settles on you, then the tubes flash'
            : 'slim, finned, a white-hot core and flame, smoke where they turned',
        12,
        258,
    );
}

// ---------------------------------------------------------------- damage
export const DAMAGE_MS = 7200;
export function damage(ctx, t) {
    const stage = t < 2400 ? 0 : t < 4800 ? 1 : 2;
    const list = [0, 0.05, 0.1][stage];
    const pose = (s) => ({
        x: HOME[0],
        y: HOME[1] + [20, 12, 6][stage] * Math.sin(s / [955, 1400, 2000][stage]),
        roll: list,
        thrust: 0.3,
    });
    const p = pose(t),
        eng = [stage < 2, true];
    trails(ctx, pose, t, eng);
    bastion(ctx, p.x, p.y, { ...p, engines: eng, guns: [stage < 1, true, true], time: t });
    if (stage >= 1) smoke(ctx, ...toField(p.x, p.y, list, [-12, -58]), t);
    if (stage >= 2) smoke(ctx, ...toField(p.x, p.y, list, [ENGINES[0][0], ENGINES[0][1]]), t, 0.4);
    pilot(ctx, 96, 135);
    note(
        ctx,
        [
            'whole',
            'the cannon is gone: a smoking hole, and it lists',
            'an engine out: no trail, it lists further and slows',
        ][stage],
        12,
        258,
    );
}
