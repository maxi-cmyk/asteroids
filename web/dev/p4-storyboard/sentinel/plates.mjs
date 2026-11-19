// Tiles: the plate throw (two plates, then four from phase 2) and phase 3, where it sheds
// its plates for good (nextSteps.md P4.1).
import { dotted, ease, fire, glow, note, pilot, shot, span } from '../kit.mjs';
import { HOME, loop, loopPath, plateHome, sentinel, spinningPlate } from './body.mjs';
import { eyeHit } from './watch.mjs';

const P = [96, 135];
// Each plate's flight: how far out and which way it swings.
const FLIGHT = {
    2: { reach: [-170, -40], side: [0, -80] },
    1: { reach: [-170, 40], side: [0, 80] },
    3: { reach: [-150, -84], side: [40, -30] },
    0: { reach: [-150, 84], side: [40, 30] },
};
const TELL = [700, 1300],
    FLY = [1300, 3100];

function plateThrow(ctx, t, thrown) {
    let o = { open: 1, mood: 'wide', rim: 1 },
        what = 'the window';
    const flying = t >= FLY[0] && t < FLY[1];
    if (t >= TELL[0] && t < TELL[1]) {
        const u = span(t, ...TELL);
        o = { open: 1 - u, mood: 'narrow', brow: 1, shiver: 1 };
        what = `the tell: ${thrown.length === 2 ? 'the two plates facing you' : 'all four plates'} glow along their edges, their paths are drawn`;
    } else if (flying) {
        o = { open: 0, mood: 'wide', rim: 1, off: thrown };
        what = 'the plates are out: the eye is bare on that side. Brave pays.';
    } else if (t >= FLY[1] && t < FLY[1] + 700) {
        const u = span(t, FLY[1] + 250, FLY[1] + 700);
        o = { open: ease(u), mood: u < 0.6 ? 'calm' : 'wide', rim: u };
        what = 'they snap back in, and it opens again';
    }
    sentinel(ctx, ...HOME, { ...o, gaze: P, time: t });
    for (const k of thrown) {
        const from = plateHome(k),
            { reach, side } = FLIGHT[k];
        if (t >= TELL[0] && t < TELL[1]) {
            loopPath(ctx, from, reach, side, span(t, ...TELL));
            glow(ctx, ...from, 22, '255,170,90', 0.5 * span(t, ...TELL));
        }
        if (flying) {
            const u = ease(span(t, ...FLY));
            spinningPlate(ctx, ...loop(from, reach, side, u), t);
        }
    }
    const open = (s) => s + 480 >= FLY[0] && s + 480 < FLY[1];
    fire(
        ctx,
        t,
        () => P,
        280,
        1100,
        3000,
        (y, s) => eyeHit(y, HOME[1], open(s)),
    );
    pilot(ctx, ...P);
    note(ctx, what, 12, 258);
}
export const THROW_MS = 4600;
export const throwTwo = (ctx, t) => plateThrow(ctx, t, [1, 2]);
export const throwFour = (ctx, t) => plateThrow(ctx, t, [0, 1, 2, 3]);

// Phase 3: it shudders, the plates burst off and tumble away, and from then on the eye is
// always open (the rim lit) but it attacks faster: the fan, warned 600 ms, then a volley.
export const SHED_MS = 6000;
export function shed(ctx, t) {
    const gone = t >= 900;
    let what = 'phase 3: it shudders';
    if (gone) what = 'the plates come off for good: the eye is always open now';
    if (t >= 2200) what = 'but it attacks faster: the fan (still warned for 600 ms)';
    if (t >= 3600) what = 'and a volley straight after';
    sentinel(ctx, ...HOME, {
        open: gone ? 0 : 0.2 + 0.1 * Math.sin(t / 30),
        mood: 'wide',
        rim: gone ? 1 : 0,
        shiver: gone ? 0 : 3,
        brow: 1,
        off: gone ? [0, 1, 2, 3] : [],
        gaze: P,
        time: t,
    });
    if (gone && t < 2600) {
        for (let k = 0; k < 4; k++) {
            const u = (t - 900) / 1700,
                a = ((45 + 90 * k) * Math.PI) / 180;
            const x = HOME[0] + Math.cos(a) * (40 + 160 * u),
                y = HOME[1] + Math.sin(a) * (40 + 120 * u) + 160 * u * u;
            spinningPlate(ctx, x, y, t * (1 + k * 0.2), 1 - span(u, 0.6, 1));
        }
    }
    const mx = HOME[0] - 82,
        my = HOME[1],
        aim = Math.atan2(P[1] - my, P[0] - mx);
    if (t >= 2200 && t < 2800)
        for (let i = -1; i <= 1; i++)
            dotted(ctx, mx, my, aim + i * 0.28, 190 * span(t, 2200, 2500), '#ffa860', 5);
    if (t >= 2200 && t < 2800) glow(ctx, mx, my, 6 + 10 * span(t, 2200, 2800), '255,170,90', 0.7);
    for (let i = -1; i <= 1; i++) {
        const age = t - 2800;
        if (age > 0 && age < 1400) {
            const d = 20 + age * 0.2;
            shot(
                ctx,
                'needle',
                mx + Math.cos(aim + i * 0.28) * d,
                my + Math.sin(aim + i * 0.28) * d,
                aim + i * 0.28,
            );
        }
    }
    for (let k = 0; k < 5; k++) {
        const age = t - (3700 + k * 120);
        if (age > 0 && age < 1200) {
            const d = 20 + age * 0.18;
            shot(ctx, 'needle', mx + Math.cos(aim) * d, my + Math.sin(aim) * d, aim);
        }
    }
    fire(
        ctx,
        t,
        () => [P[0], P[1] + 30],
        300,
        1200,
        5600,
        (y) => eyeHit(y, HOME[1], gone),
    );
    pilot(ctx, P[0], P[1] + 30);
    note(ctx, what, 12, 258);
}
