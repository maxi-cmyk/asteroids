// Tiles: the three concepts side by side, and the heat cycle with its vent (the weakness)
// on the furnace golem (nextSteps.md P4.3).
import { cell, ease, fire, glow, note, pilot, px, span, TAU } from '../kit.mjs';
import { golem, HOME, SHEET } from './body.mjs';

// ---------------------------------------------------------------- concepts
export const CONCEPT_MS = 6000;
const venting = (t) => t >= 3000;
export function conceptGolem(ctx, t) {
    const v = venting(t),
        u = v ? ease(span(t, 3000, 3300)) : 0;
    golem(ctx, ...HOME, {
        hammer: 0.25 + 0.08 * Math.sin(t / 700),
        ladle: -0.2 - 0.08 * Math.sin(t / 800),
        breath: 0.5 + 0.5 * Math.sin(t / 500),
        doors: u,
        heat: v ? 1 : 0.4,
        core: v ? 2 : 0,
        steam: v ? 1 : 0,
        time: t,
    });
    note(
        ctx,
        v ? 'venting: chest doors open on the core' : 'A: furnace golem (recommended)',
        12,
        258,
    );
}
function concept(ctx, t, key, x, y, what) {
    const v = venting(t);
    glow(ctx, x, y, 140, v ? '255,220,150' : '255,120,40', v ? 0.4 : 0.18);
    cell(ctx, SHEET, `${key}-${v ? 1 : 0}`, x, y);
    note(ctx, v ? 'venting' : what, 12, 258);
}
export function conceptSmelter(ctx, t) {
    // It walks: a heavy step side to side.
    const step = Math.sin(t / 700);
    concept(ctx, t, 'smelter', 372 + step * 10, 140 - Math.abs(step) * 4, 'B: walking smelter');
}
export function conceptCaged(ctx, t) {
    concept(ctx, t, 'caged', 372, 135 + Math.sin(t / 900) * 5, 'C: forge heart caged in chains');
}

// ---------------------------------------------------------------- heat cycle
// Each attack lights a lamp; at five it vents: doors burst open, steam, a heat ring with one
// gap rolls out, and the core is bare (white-hot, cooling) until the doors close again.
export const HEAT_MS = 10400;
const PULSES = [600, 2000, 3400, 4800];
const VENT = 5600,
    SHUT = 9000;
export function heatCycle(ctx, t) {
    let lamps = 1,
        breath = 0.3 + 0.2 * Math.sin(t / 500),
        hammer = 0.25;
    for (const p of PULSES) {
        if (t >= p + 600) lamps++;
        if (t >= p && t < p + 700) {
            breath = 0.3 + 0.7 * Math.sin((Math.PI * (t - p)) / 700);
            hammer = 0.25 + 0.5 * Math.sin((Math.PI * (t - p)) / 700);
        }
    }
    const vent = t >= VENT && t < SHUT + 400;
    const doors = vent
        ? t < SHUT
            ? ease(span(t, VENT, VENT + 200))
            : 1 - span(t, SHUT, SHUT + 400)
        : 0;
    const core = t >= VENT && t < VENT + 1800 ? 2 : t >= VENT && t < SHUT ? 1 : 0;
    golem(ctx, ...HOME, {
        hammer,
        breath: vent ? 0.1 : breath,
        doors,
        heat: vent ? 1 - span(t, VENT, SHUT) : Math.min(5, lamps) / 5,
        core,
        steam: vent ? 1 - span(t, SHUT - 600, SHUT) : 0,
        time: t,
    });
    // The heat ring: out from the core with one gap, which you sit in.
    const gap = Math.PI - 0.12;
    if (t >= VENT && t < VENT + 1600) {
        const r = 20 + 300 * ease(span(t, VENT, VENT + 1600));
        for (let k = 0; k < 300; k++) {
            const a = (k / 300) * TAU;
            if (Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap))) < 34 / r + 0.06)
                continue;
            ctx.fillStyle = k % 5 ? '#ff8a2a' : '#ffe8b0';
            px(ctx, HOME[0] + Math.cos(a) * r - 1, HOME[1] + 2 + Math.sin(a) * r - 1, 3, 3);
        }
    }
    const P = [96, HOME[1] + 2 + Math.sin(gap) * (HOME[0] - 96)];
    const bare = (s) => s + 450 >= VENT + 150 && s + 450 < SHUT;
    fire(
        ctx,
        t,
        () => P,
        240,
        0,
        HEAT_MS - 400,
        (y, s) => {
            const dy = Math.abs(y - HOME[1] - 2);
            if (bare(s) && dy < 24) return { x: HOME[0] - 24, kind: 'burst' };
            return dy < 60 ? { x: HOME[0] - 60, kind: 'glance' } : null;
        },
    );
    pilot(ctx, ...P);
    const what =
        t < VENT
            ? `each attack lights a lamp on its belt and it glows hotter (${Math.min(5, lamps)} of 5)`
            : t < VENT + 1600
              ? 'full: it vents. Doors burst open, steam, a heat ring with one gap'
              : t < SHUT
                ? 'the core is bare while it cools: hit it hard'
                : 'cooled: the doors close and the lamps go out';
    note(ctx, what, 12, 258);
}
