// Tiles: how Ninefold gets from perch to perch (nextSteps.md P2.1, "Movement"): a trot for
// short moves, a gallop for long ones (turned up or down on a slope), and the blink as a
// leap that dissolves into stars at the top and lands on the next perch.
import { note, pilot } from '../zodiarch-living/kit.mjs';
import { fox, play, prints, starStream } from './kit.mjs';

// The perches: a 3 x 3 grid in the right of the field. x stops at 340 so the tails stay on
// screen, and starts at 276 so the head stays right of x 216.
export const PERCH = { x: [276, 308, 340], y: [92, 140, 188] };
const P = (i, j) => [PERCH.x[i], PERCH.y[j]];

function drawScript(ctx, script, at, t, caption) {
    prints(ctx, script, at, t);
    const s = play(script, at, t);
    if (s.stars) starStream(ctx, ...s.stars);
    else fox(ctx, s.frame, s.x, s.y, { face: s.face, alpha: s.alpha ?? 1 });
    pilot(ctx, 90, 150);
    note(ctx, caption(s), 12, 258);
}
const say = {
    sit: 'sits',
    rise: 'gets up',
    stand: 'stands',
    walk: 'trots (short move): head low and level',
    run: 'gallops (long move): ears back, tails streaming',
    skid: 'skids to a stop, paws braced, tails swinging past',
    crouch: 'crouches, the weight shifting back',
    leap: 'leaps, dissolves into stars, lands on the next perch',
};
const caption = (s) => say[s.step?.kind] || '';

const WALK = [
    { kind: 'sit', ms: 900 },
    { kind: 'rise', ms: 200 },
    { kind: 'stand', ms: 150 },
    { kind: 'walk', ms: 550, to: P(1, 1) },
    { kind: 'stand', ms: 200 },
    { kind: 'rise', ms: 200 },
    { kind: 'sit', ms: 1000 },
    { kind: 'rise', ms: 200 },
    { kind: 'walk', ms: 550, to: P(2, 1) },
    { kind: 'stand', ms: 200, face: -1 },
    { kind: 'rise', ms: 200 },
    { kind: 'sit', ms: 700 },
];
export const walkTile = (ctx, t) => drawScript(ctx, WALK, P(2, 1), t, caption);
export const WALK_MS = WALK.reduce((a, s) => a + s.ms, 0);

// Long moves (over 90 px): up and left across the grid, straight down, up and right, down.
const leg = (to, ms) => [
    { kind: 'crouch', ms: 300 },
    { kind: 'run', ms, to },
    { kind: 'skid', ms: 400 },
    { kind: 'stand', ms: 150, face: -1 },
    { kind: 'sit', ms: 700 },
];
const RUN = [
    { kind: 'sit', ms: 500 },
    ...leg(P(0, 0), 720),
    ...leg(P(0, 2), 600),
    ...leg(P(2, 0), 720),
    ...leg(P(2, 2), 600),
];
export const runTile = (ctx, t) => drawScript(ctx, RUN, P(2, 2), t, caption);
export const RUN_MS = RUN.reduce((a, s) => a + s.ms, 0);

const BLINK = [
    { kind: 'sit', ms: 900 },
    { kind: 'crouch', ms: 600 },
    { kind: 'leap', ms: 1100, to: P(0, 0) },
    { kind: 'skid', ms: 400 },
    { kind: 'sit', ms: 1200 },
    { kind: 'crouch', ms: 600 },
    { kind: 'leap', ms: 1100, to: P(2, 2) },
    { kind: 'skid', ms: 400 },
    { kind: 'sit', ms: 900 },
];
export const blinkTile = (ctx, t) => drawScript(ctx, BLINK, P(2, 2), t, caption);
export const BLINK_MS = BLINK.reduce((a, s) => a + s.ms, 0);
