// Tiles: the golem's attacks, each from a part you can see (nextSteps.md P4.3): the bellows
// blast, the hammer's anvil strikes, the ladle's lob into a pool that burns down, and the
// geysers it drives along the floor with its flame.
import { dotted, dottedRing, ease, glow, lerp, note, pilot, px, span, warnLane } from '../kit.mjs';
import { armEnd, blob, floor, FLOOR, golem, HOME, pool } from './body.mjs';

const MOUTH = [HOME[0], HOME[1] + 2];

// The bellows blast: a long breath in (embers drawn into the furnace mouth, the cone it will
// fill marked), then a breath out in a cone of embers.
export const BLAST_MS = 4000;
export function blast(ctx, t) {
    const P = [96, t < 1300 ? 135 : lerp(135, 60, ease(span(t, 1300, 1700)))];
    const inhale = span(t, 0, 800),
        exhale = span(t, 800, 1100);
    const breath = t < 800 ? 0.3 + 0.7 * ease(inhale) : 1 - 0.9 * exhale;
    golem(ctx, ...HOME, { breath, heat: 0.4, core: t < 800 ? 1 : 0, time: t });
    const aim = Math.PI;
    if (t < 800) {
        for (const s of [-0.35, 0.35]) dotted(ctx, ...MOUTH, aim + s, 300 * inhale, '#ffa860', 5);
        for (let k = 0; k < 18; k++) {
            // embers pulled into the mouth
            const u = (t / 600 + k / 18) % 1,
                a = aim + ((k % 7) - 3) * 0.12,
                r = 140 * (1 - u);
            ctx.fillStyle = k % 3 ? '#ff9a3a' : '#ffe2a0';
            px(ctx, MOUTH[0] + Math.cos(a) * r, MOUTH[1] + Math.sin(a) * r, 2, 1);
        }
        glow(ctx, ...MOUTH, 10 + 20 * inhale, '255,170,60', 0.6 * inhale);
    }
    for (let k = 0; k < 40; k++) {
        const age = t - (800 + (k % 10) * 40);
        if (age < 0 || age > 1800) continue;
        const a = aim + (((k * 37) % 21) / 20 - 0.5) * 0.7,
            d = 30 + age * (0.16 + (k % 4) * 0.03);
        ctx.fillStyle = k % 3 ? '#ff7a1e' : '#ffe27a';
        px(ctx, MOUTH[0] + Math.cos(a) * d, MOUTH[1] + Math.sin(a) * d, 3, 2);
    }
    pilot(ctx, ...P);
    note(
        ctx,
        t < 800
            ? 'a long breath in: embers drawn into the furnace, the cone marked'
            : 'and out: a cone of embers',
        12,
        258,
    );
}

// The hammer: raised overhead (the strike's column is marked), brought down, and a column of
// fire falls on the mark. Twice, the second mark 90 px from the first.
export const HAMMER_MS = 4400;
export function hammer(ctx, t) {
    floor(ctx);
    const strikes = [
        { t0: 0, x: 120 },
        { t0: 1900, x: 210 },
    ];
    let a = 0.25;
    for (const s of strikes) {
        const u = t - s.t0;
        if (u >= 0 && u < 900) a = lerp(0.25, Math.PI + 0.4, ease(span(u, 0, 600)));
        else if (u >= 900 && u < 1300) a = lerp(Math.PI + 0.4, 1.7, ease(span(u, 900, 1000)));
        if (u >= 0 && u < 900) warnLane(ctx, s.x, 0, Math.PI / 2, FLOOR, span(u, 0, 900));
        if (u >= 900 && u < 1200) {
            ctx.fillStyle = '#ff8a2a';
            ctx.fillRect(s.x - 9, 0, 19, FLOOR);
            ctx.fillStyle = '#ffe8b0';
            ctx.fillRect(s.x - 3, 0, 7, FLOOR);
        }
        if (u >= 1000) pool(ctx, s.x, FLOOR - 2, u - 1000, 3200);
    }
    golem(ctx, ...HOME, { hammer: a, heat: 0.6, time: t });
    for (const s of strikes) {
        const u = t - s.t0;
        if (u >= 900 && u < 1100)
            glow(ctx, ...armEnd(...HOME, 'hammer', 1.7), 24, '255,230,170', 0.8);
    }
    const P = [t < 1900 ? 160 : 160, 150];
    pilot(ctx, ...P);
    note(
        ctx,
        'the hammer goes up, the column is marked; it comes down, and so does the fire',
        12,
        258,
    );
}

// The ladle: dipped back into the furnace, whipped over the top, and a blob of molten metal
// lobbed onto a marked spot, where it pools and burns down to a scorch (the region's verb).
export const LADLE_MS = 5600;
export function ladle(ctx, t) {
    const target = [150, 180];
    let a = -0.2;
    if (t < 700) a = lerp(-0.2, 0.9, ease(span(t, 0, 700)));
    else if (t < 950) a = lerp(0.9, -3.4, ease(span(t, 700, 950)));
    else if (t < 1600) a = lerp(-3.4, -0.2, ease(span(t, 950, 1600)));
    golem(ctx, ...HOME, { ladle: a, heat: 0.6, time: t });
    if (t < 700) glow(ctx, ...armEnd(...HOME, 'ladle', a), 10, '255,170,60', 0.8);
    if (t < 1700)
        dottedRing(
            ctx,
            ...target,
            18,
            Math.floor(t / 110) % 2 ? '#ffffff' : '#ff8a2a',
            30,
            -t / 600,
        );
    const cup = armEnd(...HOME, 'ladle', -3.4),
        from = [cup[0], Math.max(24, cup[1])];
    if (t >= 950 && t < 1700) {
        const u = span(t, 950, 1700);
        blob(
            ctx,
            lerp(from[0], target[0], u),
            lerp(from[1], target[1], u) - Math.sin(Math.PI * u) * 40,
        );
    }
    if (t >= 1700) pool(ctx, ...target, t - 1700, 3600);
    pilot(ctx, 96, 110);
    note(
        ctx,
        t < 1700
            ? 'the ladle scoops, swings over, and lobs onto the mark'
            : 'a pool that burns down to a scorch: fire that stays',
        12,
        258,
    );
}

// Geysers: a breath in, then it drives its flame down into the floor, and geysers burst up
// one after another along the floor toward you, each marked first, each leaving a scorch.
export const GEYSER_MS = 5200;
const SPOTS = [310, 250, 190, 130];
export function geysers(ctx, t) {
    floor(ctx);
    const breath = t < 600 ? 0.3 + 0.7 * ease(span(t, 0, 600)) : 1 - 0.9 * span(t, 600, 900);
    if (t >= 600 && t < 1000) {
        ctx.fillStyle = '#ffb060';
        ctx.fillRect(HOME[0] - 3, HOME[1] + 120, 7, FLOOR - HOME[1] - 120);
        glow(ctx, HOME[0], FLOOR, 30, '255,170,60', 0.8);
    }
    SPOTS.forEach((x, k) => {
        const mark = 600 + k * 180,
            go = mark + 900;
        if (t >= mark && t < go)
            dottedRing(
                ctx,
                x,
                FLOOR - 2,
                14,
                Math.floor(t / 110) % 2 ? '#ffffff' : '#ff8a2a',
                20,
                -t / 500,
            );
        if (t >= go && t < go + 450) {
            const h = 130 * Math.sin((Math.PI * (t - go)) / 450);
            for (let j = 0; j < h; j += 3) {
                ctx.fillStyle = j % 9 ? '#ff7a1e' : '#ffe27a';
                px(ctx, x - 4 + Math.sin(j / 6 + t / 40) * 2, FLOOR - j, 9, 3);
            }
        }
        if (t >= go) pool(ctx, x, FLOOR - 2, t - go, 3000);
    });
    golem(ctx, ...HOME, { breath, heat: 0.6, time: t });
    pilot(ctx, 96, 96);
    note(
        ctx,
        'it drives its flame into the floor: geysers run toward you, each marked first',
        12,
        258,
    );
}
