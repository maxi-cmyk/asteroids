// Tiles: the illusion as a split (nextSteps.md P2.1, "The split"): it spins into a cocoon of
// tails, three smaller foxes burst out and run to their places out of step; a popped decoy
// streams back to the real one as foxfire, and the rest run back in and it grows.
import { bullet, ease, lerp, note, pilot, span } from '../zodiarch-living/kit.mjs';
import { fox, starBurst, wisp } from './kit.mjs';

const AT = [340, 140],
    SPOTS = [
        [330, 54],
        [404, 135],
        [330, 216],
    ],
    REAL = 2,
    S = 0.6;
// Each fox's run from the cocoon: its own length and a bend in its path.
const RUNS = [
    { ms: 650, bend: -30 },
    { ms: 520, bend: 20 },
    { ms: 820, bend: 40 },
];
function runner(ctx, k, from, to, u, t, decoy) {
    const x = lerp(from[0], to[0], ease(u)),
        y = lerp(from[1], to[1], ease(u)) + Math.sin(u * Math.PI) * RUNS[k].bend;
    const face = to[0] > from[0] ? 1 : -1;
    const frame = u < 1 ? `run-${Math.floor((t + k * 37) / 80) % 6}` : 'sit';
    fox(ctx, frame, x, y, { face: u < 1 ? face : -1, scale: S, decoy });
}

export function split(ctx, t) {
    let what = 'sits';
    if (t < 500) fox(ctx, 'sit', ...AT);
    else if (t < 1100) {
        // Spins on the spot; the tails wrap it into a cocoon that shrinks to 0.6.
        const u = span(t, 500, 1100);
        fox(ctx, `cocoon-${Math.floor(t / 110) % 4}`, ...AT, { scale: lerp(1, S, ease(u)) });
        what = 'spins: the tails wrap it into a cocoon that shrinks';
    } else {
        starBurst(ctx, AT[0], AT[1] + 20, span(t, 1100, 1500), { reach: 50 });
        what = 'the cocoon bursts: three foxes run to their places, out of step';
        SPOTS.forEach((spot, k) => {
            const u = span(t, 1150, 1150 + RUNS[k].ms);
            runner(ctx, k, [AT[0], AT[1] + 20], spot, u, t, k !== REAL);
        });
        if (t > 2200) what = 'only the real one has lit eyes (bottom)';
    }
    pilot(ctx, 90, 150);
    note(ctx, what, 12, 258);
}

export function decoyPop(ctx, t) {
    let what = 'three foxes: two decoys, one real';
    const popped = 0,
        other = 1,
        real = SPOTS[REAL];
    if (t < 1000)
        bullet(
            ctx,
            lerp(100, SPOTS[popped][0], span(t, 600, 1000)),
            lerp(150, SPOTS[popped][1], span(t, 600, 1000)),
        );
    if (t < 1000) fox(ctx, 'sit', ...SPOTS[popped], { scale: S, decoy: true });
    else if (t < 1900) {
        starBurst(ctx, ...SPOTS[popped], span(t, 1000, 1400), { reach: 26 });
        for (let k = 0; k < 6; k++) {
            const u = span(t, 1050 + k * 60, 1700 + k * 60);
            if (u > 0 && u < 1)
                wisp(
                    ctx,
                    lerp(SPOTS[popped][0], real[0], ease(u)) + Math.sin(u * 9 + k) * 10,
                    lerp(SPOTS[popped][1], real[1], ease(u)),
                    t,
                );
        }
        what = 'a decoy pops: its foxfire streams to the real fox';
    }
    if (t < 2500) fox(ctx, 'sit', ...SPOTS[other], { scale: S, decoy: true });
    else if (t < 3200) {
        runner(ctx, 1, SPOTS[other], real, span(t, 2500, 3200), t, true);
        what = 'it ends: the other decoy runs back into the real fox';
    }
    if (t < 3200) fox(ctx, 'sit', ...real, { scale: S });
    else if (t < 3700) {
        fox(ctx, `shake-${Math.floor(t / 90) % 3}`, real[0], real[1] - 20, {
            scale: lerp(S, 1, ease(span(t, 3200, 3700))),
        });
        what = 'and it grows back to full size in a single shake';
    } else {
        fox(ctx, 'sit', real[0], real[1] - 30);
        what = 'one fox again, full size';
    }
    pilot(ctx, 90, 150);
    note(ctx, what, 12, 258);
}
