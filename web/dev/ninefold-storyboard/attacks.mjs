// Tiles: every attack and reaction has a body (nextSteps.md P2.1, "Contortions"):
// anticipation, action, follow-through for the comets, foxfire, a lost tail and the wet-dog
// shake when its illusion is seen through.
import { bullet, ease, lerp, note, pilot, px, span } from '../zodiarch-living/kit.mjs';
import { comet, flip, fox, glow, markOpen, starBurst, wisp } from './kit.mjs';

const AT = [340, 120],
    PILOT = [90, 150];
const at = (off, face = -1) => {
    const [dx, dy] = flip(face, off);
    return [AT[0] + dx, AT[1] + dy];
};

export function comets(ctx, t) {
    let frame = 'sit',
        what = 'sits';
    const tips = at([-58, -66]);
    if (t >= 700 && t < 1400) {
        frame = 'arch-0';
        what = 'draws its tails up over its back, arched like a bow';
        glow(ctx, ...at([10, -80]), 10 + 14 * span(t, 700, 1400), '150,220,255', 0.5);
    } else if (t >= 1400 && t < 2100) {
        frame = 'arch-1';
        what = 'the tails whip forward one after another: a comet from each tip';
    } else if (t >= 2100 && t < 2500) {
        frame = 'arch-0';
        what = 'the tails settle back into the fan, rippling';
    }
    fox(ctx, frame, ...AT);
    for (let k = 0; k < 5; k++) {
        const t0 = 1450 + k * 120,
            u = (t - t0) / 1600;
        if (u < 0 || u > 1) continue;
        const ty = PILOT[1] + (k - 2) * 26,
            x = lerp(tips[0], PILOT[0] - 40, u),
            y = lerp(tips[1], ty, u);
        comet(ctx, x, y, Math.atan2(ty - tips[1], PILOT[0] - 40 - tips[0]));
    }
    pilot(ctx, ...PILOT);
    note(ctx, what, 12, 258);
}

export function foxfire(ctx, t) {
    let frame = 'sit',
        what = 'sits';
    const jaw = at([-62, -4]),
        toss = at([-58, -70]);
    if (t >= 500 && t < 1400) {
        frame = 'toss-0';
        what = 'ducks and scoops: foxfire gathers between its jaws';
        const u = span(t, 500, 1400);
        glow(ctx, ...jaw, 6 + 12 * u, '120,200,255', 0.4 + 0.4 * u);
    } else if (t >= 1400 && t < 1900) {
        frame = 'toss-1';
        what = 'tosses its head: three flames fly up and out';
    } else if (t >= 2300 && t < 2900) {
        frame = Math.floor(t / 90) % 2 ? 'sit-up' : 'sit-down';
        what = 'licks its chops and shakes its head';
    }
    fox(ctx, frame, ...AT);
    for (let k = 0; k < 3; k++) {
        const u = (t - 1450 - k * 100) / 2200;
        if (u < 0 || u > 1) continue;
        // Up and out, then slowly round toward the pilot.
        const x = lerp(toss[0], PILOT[0], ease(u)) + Math.sin(u * 7 + k) * 8,
            y = lerp(toss[1] - 40 * (k - 1), PILOT[1], ease(u)) - Math.sin(u * Math.PI) * 40;
        wisp(ctx, x, y, t + k * 100);
    }
    pilot(ctx, ...PILOT);
    note(ctx, what, 12, 258);
}

export function tailLost(ctx, t) {
    let frame = 'sit',
        face = -1,
        what = 'a shot reaches a tail';
    const tail = at([70, -20]);
    if (t >= 400 && t < 800)
        bullet(
            ctx,
            lerp(PILOT[0] + 10, tail[0], span(t, 400, 800)),
            lerp(PILOT[1], tail[1], span(t, 400, 800)),
        );
    if (t >= 800 && t < 1300) {
        frame = 'yelp';
        what = 'yelps: head thrown back, the tail bursts into stars';
    } else if (t >= 1300 && t < 2300) {
        frame = 'stand';
        face = Math.floor((t - 1300) / 250) % 2 ? 1 : -1;
        what = 'turns right round to look at its tails';
    } else if (t >= 2300) {
        what = 'glares at you, dazed: the forehead mark is open';
    }
    fox(ctx, frame, ...AT, { face });
    starBurst(ctx, ...tail, span(t, 800, 1500), { reach: 30 });
    if (t >= 2300 && t < 4800) markOpen(ctx, ...at([-33, -50]), 1 - span(t, 2300, 4800), t);
    pilot(ctx, ...PILOT);
    note(ctx, what, 12, 258);
}

export function shake(ctx, t) {
    let frame = 'sit',
        what = 'both illusions popped';
    if (t >= 400 && t < 1600) {
        frame = `shake-${Math.floor(t / 90) % 3}`;
        what = 'shakes itself like a wet dog, head to tail';
        // Star droplets fly off its coat.
        for (let k = 0; k < 14; k++) {
            const u = (t / 400 + k / 14) % 1,
                a = ((k * 2.4) % Math.PI) + Math.PI;
            ctx.globalAlpha = 1 - u;
            ctx.fillStyle = k % 3 ? '#9ad8ff' : '#ffffff';
            px(
                ctx,
                AT[0] + Math.cos(a) * (20 + 50 * u) + 20,
                AT[1] - 10 + Math.sin(a) * 30 * u + 60 * u * u,
            );
            ctx.globalAlpha = 1;
        }
    } else if (t >= 1600 && t < 2000) {
        frame = 'stand';
        what = 'stands taller, ears up';
    } else if (t >= 2000) {
        what = 'the mark opens';
    }
    fox(ctx, frame, ...AT);
    if (t >= 2000) markOpen(ctx, ...at([-33, -50]), 1 - span(t, 2000, 4500), t);
    pilot(ctx, ...PILOT);
    note(ctx, what, 12, 258);
}
