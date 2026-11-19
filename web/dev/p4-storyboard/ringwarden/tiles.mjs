// Tiles for the Ringwarden (nextSteps.md P4.2): tilting rings and the precession, the
// eclipse, the prism through whole and broken blades, and the halo lock.
import {
    band,
    clamp,
    dotted,
    dottedRing,
    ease,
    fire,
    glow,
    lerp,
    note,
    pilot,
    px,
    span,
    TAU,
} from '../kit.mjs';
import { clearShot, firstBlade, HOME, RINGS, ringwarden } from './body.mjs';

// Shots from the pilot stop on the first blade at their height, or burst in the core.
const hitter = (all, x, y) => (sy) => {
    const b = firstBlade(all, sy);
    if (b && b.x < x) return { x: b.x - 8, kind: 'glance' };
    if (Math.abs(sy - y) < 26)
        return { x: x - Math.sqrt(26 * 26 - (sy - y) ** 2), kind: 'burst', colour: '#d8c8ff' };
    return null;
};
function sightLine(ctx, from, x, y, clear) {
    dotted(
        ctx,
        from[0] + 10,
        from[1],
        Math.atan2(y - from[1], x - from[0]),
        x - from[0] - 40,
        clear ? '#ffffff' : '#5a4a8a',
        6,
    );
}

export const DRIFT_MS = 9000;
export function precession(ctx, t) {
    const yAt = (s) => HOME[1] + 40 * Math.sin((s / DRIFT_MS) * TAU);
    const y = yAt(t),
        lean = clamp((yAt(t + 50) - y) * 0.25, -0.3, 0.3);
    const outer = {
        spin: t * 0.00025,
        tilt: 0.8 + 0.3 * Math.sin(t / 2100),
        axis: 0.3 * Math.sin(t / 3300) + lean,
    };
    const inner = {
        spin: 0.28 - t * 0.00045,
        tilt: 0.6 + 0.35 * Math.sin(t / 1700 + 1),
        axis: -0.4 + 0.3 * Math.sin(t / 2600) + lean,
    };
    const all = ringwarden(ctx, HOME[0], y, { outer, inner, time: t });
    const P = [96, 140];
    sightLine(ctx, P, HOME[0], y, clearShot(all, HOME[0], y));
    fire(ctx, t, () => P, 260, 0, DRIFT_MS, hitter(all, HOME[0], y));
    pilot(ctx, ...P);
    note(
        ctx,
        'the rings tilt and wobble; it leans as it drifts. White line: a clear shot',
        12,
        258,
    );
}

// Both gaps line up in front of the core: the eclipse.
export const ECLIPSE_MS = 5600;
const ECLIPSE_AT = 2800;
export function eclipse(ctx, t) {
    const d = t - ECLIPSE_AT;
    const outer = { spin: Math.PI - TAU / 16 + d * 0.0003, tilt: 0.55, axis: 0 };
    const inner = { spin: Math.PI - TAU / 22 - d * 0.0005, tilt: 0.45, axis: 0 };
    const y = HOME[1];
    const probe = ringwarden(document.createElement('canvas').getContext('2d'), HOME[0], y, {
        outer,
        inner,
    });
    const clear = clearShot(probe, HOME[0], y);
    const all = ringwarden(ctx, HOME[0], y, { outer, inner, flare: clear ? 1 : 0, time: t });
    const P = [96, 135];
    sightLine(ctx, P, HOME[0], y, clear);
    fire(ctx, t, () => P, 220, 0, ECLIPSE_MS, hitter(all, HOME[0], y));
    pilot(ctx, ...P);
    note(
        ctx,
        clear
            ? 'ECLIPSE: both gaps in front of the core, a clear lane straight in'
            : 'the outer gap turns one way, the inner gap the other',
        12,
        258,
        clear ? '#ffffff' : '#d8d0ff',
    );
}

// The prism: a beam from the core sweeps a quarter turn; each whole blade it crosses splits
// off two more beams. Break the blades on your side and only the one beam is left.
export const PRISM_MS = 4200;
function prism(ctx, t, broken) {
    const outer = { spin: 0.4, tilt: 0.35, axis: 0.2 },
        inner = { spin: -0.2, tilt: 0.3, axis: -0.3 };
    const cut = broken ? (ring, b) => b.x < HOME[0] - 30 : undefined;
    const charging = t < 2800;
    const all = ringwarden(ctx, ...HOME, { outer, inner, charging, broken: cut, time: t });
    const start = Math.PI - 0.785,
        a = start + 1.57 * ease(span(t, 900, 2650));
    if (t < 900) {
        dotted(ctx, ...HOME, start, 260, Math.floor(t / 120) % 2 ? '#ffffff' : '#c8a8ff', 5);
        ctx.fillStyle = '#8a6ad0';
        for (let k = 0; k <= 20; k++) {
            const q = start + (1.57 * k) / 20;
            px(ctx, HOME[0] + Math.cos(q) * 250, HOME[1] + Math.sin(q) * 250);
        }
    }
    if (t >= 900 && t < 2650) {
        band(ctx, ...HOME, a, 260, 7, '#b89aff');
        band(ctx, ...HOME, a, 260, 3, '#ffffff');
        for (const [, b] of all) {
            const ba = Math.atan2(b.y - HOME[1], b.x - HOME[0]);
            if (Math.abs(Math.atan2(Math.sin(ba - a), Math.cos(ba - a))) > 0.09) continue;
            glow(ctx, b.x, b.y, 14, '220,200,255', 0.8);
            for (const s of [-0.5, 0.5]) {
                band(ctx, b.x, b.y, a + s, 150, 3, '#d8c0ff');
                band(ctx, b.x, b.y, a + s, 150, 1, '#ffffff');
            }
        }
    }
    pilot(ctx, 60, 135);
    note(
        ctx,
        broken
            ? 'blades on your side broken: one beam to dodge'
            : 'whole blades split the beam: every one it crosses throws two more',
        12,
        258,
    );
}
export const prismWhole = (ctx, t) => prism(ctx, t, false);
export const prismBroken = (ctx, t) => prism(ctx, t, true);

// The halo lock: the outer ring flies out to the edge of the field, its blades linked by a
// band of light, and closes back in. One gap, which drifts; you thread it both ways.
export const HALO_MS = 6400;
export function halo(ctx, t) {
    const gapAngle = Math.PI + 0.32 * Math.sin(t / 1300);
    const scale =
        t < 900
            ? 1
            : t < 1900
              ? lerp(1, 2.8, ease(span(t, 900, 1900)))
              : t < 2400
                ? 2.8
                : lerp(2.8, 1, ease(span(t, 2400, 4200)));
    const outer = { spin: gapAngle - TAU / 16, tilt: 0, axis: 0, scale };
    const inner = { spin: 0.4 - t * 0.0004, tilt: 0.4, axis: 0.3 };
    const R = RINGS.outer.R * scale;
    if (t < 900) {
        const blink = Math.floor(t / 120) % 2;
        dottedRing(ctx, ...HOME, 106 * 2.8, blink ? '#ffffff' : '#c8a8ff', 320, 0, {
            a: gapAngle,
            half: 40 / (106 * 2.8),
        });
    }
    if (scale > 1.05) {
        // The band between the blades, except across the gap.
        ctx.globalAlpha = 0.9;
        for (let k = 0; k < 900; k++) {
            const a = (k / 900) * TAU;
            if (Math.abs(Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle))) < 40 / R)
                continue;
            ctx.fillStyle = k % 9 ? '#a68cff' : '#ffffff';
            px(ctx, HOME[0] + Math.cos(a) * R - 1, HOME[1] + Math.sin(a) * R - 1, 3, 3);
        }
        ctx.globalAlpha = 1;
    }
    // Blades across the gap stand aside.
    const aside = (ring, b) =>
        ring === 'outer' &&
        Math.abs(
            Math.atan2(
                Math.sin(Math.atan2(b.y - HOME[1], b.x - HOME[0]) - gapAngle),
                Math.cos(Math.atan2(b.y - HOME[1], b.x - HOME[0]) - gapAngle),
            ),
        ) <
            40 / R + 0.08;
    ringwarden(ctx, ...HOME, { outer, inner, charging: t < 900, broken: aside, time: t });
    // The pilot rides the gap as the ring passes.
    const P = [HOME[0] + Math.cos(gapAngle) * 250, HOME[1] + Math.sin(gapAngle) * 250];
    pilot(ctx, ...P);
    note(
        ctx,
        t < 900
            ? 'the halo lock: the gap is marked first'
            : 'out to the edge and back: thread the gap both ways',
        12,
        258,
    );
}
