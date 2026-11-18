import { pixelGlow as glow } from '../render/fx.mjs';
import { HAZARD, ZOD_STYLE } from './scene.mjs';
import { blackHole, splash, swirl } from './zodiarch/fx.mjs';

const ZODIARCH_KIND = 5;
import { TAU, COLOUR, px, dotted, dottedRing, dottedArc, band, disc } from './draw-kit.mjs';

// Hazards and their telegraphs. Telegraph language: dashed amber line = lane or beam,
// pulsing pink ring = area landing, dotted arc = spread, thin red line = aimed shot,
// white flash = damage (never a danger cue). Each painter takes the hazard `h` and
// `m = { warning, urgency, blink, time }`: warning is true while only the telegraph shows.

// Drawn under the boss body; the rest draw over it.
export const BELOW_BODY = new Set([
    HAZARD.pool,
    HAZARD.burn,
    HAZARD.tell,
    HAZARD.arc,
    HAZARD.aim,
    HAZARD.pull,
]);

export const HAZARD_PAINTERS = {
    [HAZARD.lane](ctx, h, m) {
        if (h.e === ZOD_STYLE.cord) return zodLine(ctx, h, m);
        if (h.e === ZOD_STYLE.tether && !m.warning) return tether(ctx, h);
        const { warning, blink } = m;
        const half = h.c,
            x = h.x,
            y = h.y;
        if (warning) {
            dotted(ctx, x, y, h.a, h.b, blink ? COLOUR.white : COLOUR.amber, 9, 2);
            const ox = -Math.sin(h.a) * half,
                oy = Math.cos(h.a) * half;
            dotted(ctx, x + ox, y + oy, h.a, h.b, COLOUR.warn, 12);
            dotted(ctx, x - ox, y - oy, h.a, h.b, COLOUR.warn, 12);
        } else {
            band(ctx, x, y, h.a, h.b, half * 2, COLOUR.hot);
            band(ctx, x, y, h.a, h.b, Math.max(2, half * 0.45), COLOUR.white);
        }
    },
    // Scorched ground. Marked first by a dotted orange ring (a shot-down lob's landing), then a
    // charred patch with embers that flicker and a thin lick of flame; it dims as it dies down.
    [HAZARD.burn](ctx, h, { warning, time }) {
        const r = h.c;
        if (warning) {
            dottedRing(
                ctx,
                h.x,
                h.y,
                r,
                Math.floor(time / 110) % 2 ? COLOUR.white : COLOUR.hot,
                Math.round(r * 2.4),
                -time / 600,
            );
            return;
        }
        const fade = h.live < 1200 && Math.floor(time / 120) % 2 ? 0.45 : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#1c0b08';
        disc(ctx, h.x, h.y, r);
        ctx.fillStyle = '#4a1a0a';
        disc(ctx, h.x, h.y, r - 3);
        for (let i = 0; i < r * 2.6; i++) {
            const a = i * 2.399 + Math.floor(time / 160) * 0.7,
                d = (((i * 37) % 100) / 100) * (r - 4);
            ctx.fillStyle = i % 3 ? '#ff7a1c' : '#ffd27a';
            px(ctx, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d);
        }
        dottedRing(ctx, h.x, h.y, r, '#c4501a', Math.round(r * 2.6), time / 900);
        // A lick of flame rising from the middle.
        ctx.fillStyle = '#ff9a2a';
        const lift = 3 + (Math.floor(time / 90) % 3);
        px(ctx, h.x - 1, h.y - lift, 2, lift);
        ctx.fillStyle = '#ffe27a';
        px(ctx, h.x, h.y - lift - 1, 1, 2);
        ctx.restore();
    },
    [HAZARD.pool](ctx, h, { warning, urgency, time }) {
        if (h.e === 1) return; // a black hole's core: the pull draws it
        const r = h.c;
        if (warning) {
            // A pulsing pink ring on the floor, tightening as the plasma arrives.
            const wobble = 1 + 0.08 * Math.sin(time / 80);
            dottedRing(
                ctx,
                h.x,
                h.y,
                r * wobble + 3 * (1 - urgency),
                Math.floor(time / 90) % 2 ? COLOUR.white : COLOUR.pink,
                Math.round(r * 2.4),
                time / 700,
            );
            dottedRing(ctx, h.x, h.y, r * 0.55, COLOUR.pink, 18, -time / 500);
            return;
        }
        ctx.fillStyle = '#7a1604';
        disc(ctx, h.x, h.y, r);
        ctx.fillStyle = '#d83a0c';
        disc(ctx, h.x, h.y, r - 3);
        ctx.fillStyle = '#ff8a1c';
        for (let dy = -r + 4; dy <= r - 4; dy += 2)
            for (let dx = -r + 4; dx <= r - 4; dx += 2) {
                if (
                    dx * dx + dy * dy < (r - 5) ** 2 &&
                    ((dx + dy + Math.floor(time / 120)) / 2) % 2 === 0
                )
                    px(ctx, h.x + dx, h.y + dy);
            }
        ctx.fillStyle = '#ffe27a';
        disc(ctx, h.x - 2, h.y - 2, 4);
        glow(ctx, h.x, h.y, r + 10, '255,100,40', 0.3);
    },
    [HAZARD.beam](ctx, h, { warning, blink, kind }) {
        if (warning) {
            // The whole wedge is dotted, with the opening edge dashed amber.
            dotted(ctx, h.x, h.y, h.c, 420, blink ? COLOUR.white : COLOUR.amber, 8, 2);
            dotted(ctx, h.x, h.y, h.e, 420, COLOUR.warn, 10);
            dottedArc(ctx, h.x, h.y, 150, h.c, h.e, COLOUR.warn, 6);
            dottedArc(ctx, h.x, h.y, 260, h.c, h.e, COLOUR.warn, 8);
            return;
        }
        dotted(ctx, h.x, h.y, h.e, 420, COLOUR.warn, 14);
        // The Zodiarch's beams come from an eye (its own, or Aldebaran): red.
        const [outer, inner] =
            kind === ZODIARCH_KIND ? ['#c8281e', '#ff8a70'] : ['#8a60e8', '#d8c4ff'];
        band(ctx, h.x, h.y, h.a, 520, 10, outer);
        band(ctx, h.x, h.y, h.a, 520, 6, inner);
        band(ctx, h.x, h.y, h.a, 520, 2, '#ffffff');
    },
    [HAZARD.ring](ctx, h, { warning, urgency, time }) {
        const gap = { a: h.a, half: h.c };
        if (warning && h.d > 1.5) {
            // A fast ring that starts inside a body (a boss's repel): its own small warning ring
            // would hide behind the sprite, so show where it is going. Ripples run out from it to
            // the reach it will sweep, brightening as it nears, with the safe gap left open.
            const reach = Math.min(260, h.b + h.d * 40);
            for (let k = 0; k < 3; k++) {
                const u = ((time / 700 + k / 3) % 1) * 0.85 + 0.15;
                const r = h.b + (reach - h.b) * u;
                ctx.globalAlpha = (0.35 + 0.5 * urgency) * (1 - u * 0.7);
                dottedRing(
                    ctx,
                    h.x,
                    h.y,
                    r,
                    k ? '#ff7a8a' : '#fff0e0',
                    Math.round(r * 1.2) + 12,
                    0,
                    gap,
                );
            }
            ctx.globalAlpha = 1;
            for (const side of [-1, 1]) {
                const a = h.a + side * h.c;
                dotted(
                    ctx,
                    h.x + Math.cos(a) * h.b,
                    h.y + Math.sin(a) * h.b,
                    a,
                    reach - h.b,
                    COLOUR.white,
                    6,
                );
            }
            return;
        }
        if (warning) {
            dottedRing(
                ctx,
                h.x,
                h.y,
                Math.max(8, h.b),
                '#b04a5a',
                Math.round(h.b * 1.1) + 12,
                0,
                gap,
            );
            // Mark the gap with two short ticks.
            for (const side of [-1, 1]) {
                const a = h.a + side * h.c;
                dotted(
                    ctx,
                    h.x + Math.cos(a) * (h.b - 8),
                    h.y + Math.sin(a) * (h.b - 8),
                    a,
                    16,
                    COLOUR.white,
                    3,
                );
            }
            return;
        }
        const dots = 40;
        for (let i = 0; i < dots; i++) {
            const a = h.a + h.c + (i / dots) * (TAU - h.c * 2);
            const X = h.x + Math.cos(a) * h.b,
                Y = h.y + Math.sin(a) * h.b;
            if (X < -6 || X > 486 || Y < -6 || Y > 276) continue;
            ctx.fillStyle = '#2a0c24';
            px(ctx, X - 2, Y - 2, 5, 5);
            ctx.fillStyle = '#ff7a8a';
            px(ctx, X - 1, Y - 1, 3, 3);
            ctx.fillStyle = '#fff0e0';
            px(ctx, X - 1, Y - 1, 1, 1);
        }
        // A crisp ring line ties the dots together.
        dottedRing(ctx, h.x, h.y, h.b, '#7a2a50', Math.round(h.b * 2), 0, gap);
    },
    [HAZARD.arm](ctx, h, { warning, blink, kind }) {
        if (kind === ZODIARCH_KIND && !warning) return venom(ctx, h);
        if (warning) {
            dottedArc(ctx, h.x, h.y, h.b, h.c, h.e, blink ? COLOUR.white : COLOUR.pink, 5);
            dotted(ctx, h.x, h.y, h.c, h.b, COLOUR.warn, 8);
            dotted(ctx, h.x, h.y, h.e, h.b, COLOUR.warn, 8);
            return;
        }
        band(ctx, h.x, h.y, h.a, h.b, 10, '#6a1858');
        band(ctx, h.x, h.y, h.a, h.b, 6, '#f060cc');
        band(ctx, h.x, h.y, h.a, h.b * 0.96, 2, '#ffd8f4');
        const tx = h.x + Math.cos(h.a) * h.b,
            ty = h.y + Math.sin(h.a) * h.b;
        ctx.fillStyle = '#ffa0e8';
        disc(ctx, tx, ty, 5);
        glow(ctx, tx, ty, 14, '255,100,220', 0.5);
    },
    // An area about to land.
    [HAZARD.tell](ctx, h, { blink, time }) {
        if (h.e === ZOD_STYLE.splash) return splash(ctx, h);
        if (h.e === ZOD_STYLE.swirl) return swirl(ctx, h, time);
        const r = h.b * (1 - 0.1 * Math.sin(time / 70));
        dottedRing(
            ctx,
            h.x,
            h.y,
            r,
            blink ? COLOUR.white : COLOUR.pink,
            Math.round(r * 1.2),
            time / 900,
        );
    },
    // A spread: the centre line and the two edges.
    [HAZARD.arc](ctx, h, { blink }) {
        if (h.e) return meteorPath(ctx, h, blink);
        if (h.d === 15) return fan(ctx, h, blink);
        for (const side of [-1, 0, 1])
            dotted(ctx, h.x, h.y, h.a + side * h.b, h.c, side ? COLOUR.warn : COLOUR.amber, 7);
    },
    // An aimed shot.
    [HAZARD.aim](ctx, h, { blink }) {
        if (h.e === ZOD_STYLE.fish)
            return dotted(ctx, h.x, h.y, h.a, h.b, blink ? COLOUR.white : '#aaa0ff', 6);
        // A seed is in flight for the first 40% of its warning (zodiac-fx draws it).
        if (h.e === ZOD_STYLE.seed && 1 - h.warn / h.warnTotal < 0.55) return;
        dotted(ctx, h.x, h.y, h.a, h.b, blink ? COLOUR.white : COLOUR.aim, 4);
    },
    // A gravity well drawing the ship in.
    [HAZARD.pull](ctx, h, { warning, time }) {
        if (h.e === 1) return warning ? undefined : blackHole(ctx, h, time);
        const pulse = (time / 14) % 90;
        for (let k = 0; k < 3; k++)
            dottedRing(ctx, h.x, h.y, 150 - ((pulse + k * 30) % 90) * 1.6, '#a88cff', 36, k);
    },
};

// The Zodiarch's styled lines. A constellation net or the fish's cord: dotted while warned,
// a thin glowing line when live.
function zodLine(ctx, h, { warning, blink }) {
    const colour = h.e === ZOD_STYLE.cord ? '#aaa0ff' : '#b8a8ff';
    if (warning) {
        dotted(ctx, h.x, h.y, h.a, h.b, blink ? COLOUR.white : colour, 4);
        return;
    }
    const mid = [h.x + (Math.cos(h.a) * h.b) / 2, h.y + (Math.sin(h.a) * h.b) / 2];
    glow(ctx, mid[0], mid[1], Math.min(40, h.b / 2), '170,160,255', 0.3);
    band(ctx, h.x, h.y, h.a, h.b, 4, colour);
    band(ctx, h.x, h.y, h.a, h.b, 1, COLOUR.white);
}
// Cancer's claw on its tether: out along the lane for its first 250 ms, back for the last.
function tether(ctx, h) {
    const out = h.live > 250 ? 1 - (h.live - 250) / 250 : h.live / 250;
    const reach = h.b * Math.max(0, Math.min(1, out));
    ctx.strokeStyle = '#b4e6d2';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(h.x + Math.cos(h.a) * reach, h.y + Math.sin(h.a) * reach);
    ctx.stroke();
    ctx.setLineDash([]);
    const X = h.x + Math.cos(h.a) * reach,
        Y = h.y + Math.sin(h.a) * reach;
    glow(ctx, X, Y, 14, '180,232,210', 0.5);
    ctx.fillStyle = '#2a0c24';
    px(ctx, X - 4, Y - 4, 9, 9);
    ctx.fillStyle = '#dffff0';
    px(ctx, X - 3, Y - 3, 7, 7);
    ctx.fillStyle = '#ffffff';
    px(ctx, X - 1, Y - 1, 3, 3);
}
// A meteor's path, drawn ahead: heading a, turning e per tick at d px per tick.
function meteorPath(ctx, h, blink) {
    let x = h.x,
        y = h.y,
        a = h.a;
    ctx.fillStyle = blink ? COLOUR.white : '#ffb070';
    for (let i = 0; i < 260; i++) {
        x += Math.cos(a) * h.d;
        y += Math.sin(a) * h.d;
        a += h.e;
        if (x < -10 || x > 490 || y < -10 || y > 280) break;
        if (i % 3 === 0) px(ctx, x, y);
    }
}
// Capricornus's fan: the lanes its waves will fly down, growing out from the splash.
function fan(ctx, h, blink) {
    const u = 1 - h.warn / h.warnTotal,
        n = h.d;
    for (let k = 0; k < n; k++) {
        const a = h.a - h.b + (2 * h.b * k) / (n - 1);
        ctx.globalAlpha = 0.35 + 0.4 * u;
        dotted(ctx, h.x, h.y, a, 40 + 120 * u, blink && u > 0.6 ? COLOUR.white : '#a0c8ff', 5);
    }
    ctx.globalAlpha = 1;
}
// Scorpius's venom lash: a red beam from the stinger tip, venom dripping from its end.
function venom(ctx, h) {
    band(ctx, h.x, h.y, h.a, h.b, 7, '#c8281e');
    band(ctx, h.x, h.y, h.a, h.b, 3, '#ffe0d8');
    const tx = h.x + Math.cos(h.a) * h.b,
        ty = h.y + Math.sin(h.a) * h.b;
    glow(ctx, h.x, h.y, 14, '255,110,100', 0.7);
    glow(ctx, tx, ty, 12, '255,90,90', 0.5);
    ctx.fillStyle = '#ff8a7a';
    for (let k = 0; k < 4; k++)
        px(ctx, tx - Math.cos(h.a) * k * 18, ty - Math.sin(h.a) * k * 18 + 4 + ((k * 5) % 7), 1, 2);
}
