// Tiles: the Sentinel watching you (the window), the cycle of tell, shut and window around
// one attack, and its slide on a rail (nextSteps.md P4.1).
import { clamp, dotted, ease, fire, note, pilot, span, warnLane } from '../kit.mjs';
import { HOME, sentinel } from './body.mjs';

// Where a shot stops: in the open eye (a burst), on the plates or shell (a glance).
export function eyeHit(y, by, open) {
    const dy = Math.abs(y - by);
    if (open && dy < 30) return { x: HOME[0] - Math.sqrt(33 * 33 - dy * dy), kind: 'burst' };
    if (dy < 70) return { x: HOME[0] - Math.sqrt(72 * 72 - dy * dy), kind: 'glance' };
    return null;
}

export function watching(ctx, t) {
    const ship = (s) => [96 + 26 * Math.sin(s / 900), 135 + 92 * Math.sin(s / 1270)];
    const p = ship(t);
    sentinel(ctx, ...HOME, { open: 1, mood: 'wide', rim: 1, gaze: p, time: t });
    fire(ctx, t, ship, 260, 0, 8000, (y) => eyeHit(y, HOME[1], true));
    pilot(ctx, ...p);
    note(ctx, 'between attacks: plates apart, eye wide, rim lit, the pupil on you', 12, 258);
}

// One attack from start to finish: window, tell, shut (the lance), opening, window.
export const CYCLE_MS = 4600;
export function cycle(ctx, t) {
    const P = [96, 150];
    let o = { open: 1, mood: 'wide', rim: 1 },
        what = 'the window: plates apart, eye wide, rim lit';
    if (t >= 900 && t < 1500) {
        const u = span(t, 900, 1500);
        o = { open: 1 - 0.35 * u, mood: 'narrow', shiver: 1.5, brow: 1, seam: 0 };
        what = 'the tell: the eye narrows, the brows drop, the plates shiver';
    } else if (t >= 1500 && t < 3000) {
        const u = span(t, 1500, 1700);
        o = { open: 0.65 * (1 - ease(u)), mood: 'narrow', brow: 1, seam: span(t, 1700, 2400) };
        what = 'shut: the lance is warned, light leaks through the seams';
    } else if (t >= 3000 && t < 3500) {
        const u = ease(span(t, 3000, 3500));
        o = { open: u, mood: u < 0.6 ? 'calm' : 'wide', rim: span(t, 3300, 3500) };
        what = 'it opens: the eye widens and its rim lights';
    }
    sentinel(ctx, ...HOME, { ...o, gaze: P, time: t });
    // The lance: a lane at the pilot's height, warned from the tell, live for 320 ms.
    if (t >= 900 && t < 2400) warnLane(ctx, HOME[0] - 30, P[1], Math.PI, 330, span(t, 900, 2400));
    if (t >= 2400 && t < 2720) {
        ctx.fillStyle = '#ffd890';
        ctx.fillRect(0, P[1] - 4, HOME[0] - 30, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, P[1] - 1, HOME[0] - 30, 3);
    }
    const ship = (s) => [96, s > 1600 && s < 2900 ? 210 : P[1]];
    const open = (s) => s < 900 || s > 3350;
    fire(ctx, t, ship, 300, 0, 4400, (y, s) => eyeHit(y, HOME[1], open(s + 480)));
    pilot(ctx, ...ship(t));
    note(ctx, what, 12, 258);
}

// The rail: it follows the pilot up and down at a capped speed, rolling with the slide and
// looking where it goes. The rail is unseen in the game; it is dotted here.
export function rail(ctx, t) {
    const py = 135 + 95 * Math.sin((t / 6000) * Math.PI * 2);
    // Where it is: chasing the pilot's height, lagging behind it (a capped slide).
    const lag = (s) => 135 + 40 * Math.sin(((s - 700) / 6000) * Math.PI * 2);
    const y = lag(t),
        v = lag(t + 40) - y;
    dotted(ctx, HOME[0], 20, Math.PI / 2, 230, '#6a5a9a', 6);
    sentinel(ctx, HOME[0], y, {
        open: 1,
        mood: 'wide',
        rim: 1,
        roll: clamp(v * 0.12, -0.12, 0.12),
        gaze: [96, py],
        time: t,
    });
    pilot(ctx, 96, py);
    note(ctx, 'it slides on a rail after you, rolling like an eyeball', 12, 258);
}
