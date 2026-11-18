// The storyboard's drawing kit: the art, the backdrop, the pilot, the dragon, charges,
// flashes, lanes and shots, a sign's tile (summon, act, dissolve) and the table `S` the season
// files fill with one tile per sign.

import { BossArt } from '../../src/boss/art.mjs';
import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { drawRing } from '../../src/boss/zodiarch/ring.mjs';
import { drawCreature } from '../../src/boss/zodiarch/creatures.mjs';
import { segmentKey } from '../../src/boss/zodiarch/dragon.mjs';
import { zodiarchPath } from '../../src/boss/scene.mjs';
import { TAU, dotted, band, dottedRing } from '../../src/boss/draw-kit.mjs';

export const W = 480,
    H = 270;
export const art = new BossArt('./assets/bosses/');
await Promise.all([art.load('rift'), art.load('shots')]);
const EMIT = await (await fetch('./assets/bosses/draft-p2-emitters.json')).json();
export const PILOT = { x: 90, y: 150 };
// The phase 3 composite draws the dragon once; its signs work out the dragon's points on a
// canvas nobody sees.
export const view = { dragon: true };
// false: the dragon goes to that canvas
const OFFSCREEN = Object.assign(document.createElement('canvas'), {
    width: W,
    height: H,
}).getContext('2d');
// ---------------------------------------------------------------- helpers
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (u) => u * u * (3 - 2 * u);
export const lerp = (a, b, u) => a + (b - a) * u;
export const span = (t, a, b) => clamp01((t - a) / (b - a));
// 0..1 while t runs a..b
export const rgb = (hex) =>
    hex
        .match(/\w\w/g)
        .map((h) => parseInt(h, 16))
        .join(',');
export const emitAt = (sign, name, x, y) => {
    const [dx, dy] = EMIT[sign][name];
    return [x + dx, y + dy];
};
export function backdrop(ctx, seed = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120a26');
    g.addColorStop(0.65, '#2a1036');
    g.addColorStop(1, '#3a1430');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    let s = seed * 9301;
    for (let i = 0; i < 70; i++) {
        s = (s * 9301 + 49297) % 233280;
        const x = (s / 233280) * W;
        s = (s * 9301 + 49297) % 233280;
        const y = (s / 233280) * H;
        ctx.fillStyle = i % 7 ? '#5a5a8a' : '#c8d2ff';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
}
export function pilot(ctx, t, at) {
    const y = (at ?? PILOT.y) + Math.sin(t / 500) * 3;
    ctx.fillStyle = '#9fe8ff';
    ctx.beginPath();
    ctx.moveTo(PILOT.x + 9, y);
    ctx.lineTo(PILOT.x - 6, y - 5);
    ctx.lineTo(PILOT.x - 3, y);
    ctx.lineTo(PILOT.x - 6, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb060';
    ctx.fillRect(PILOT.x - 9, y - 1, 3, 2);
}
// The dragon, swimming slowly; returns its head, eye, mouth, pearl, claws and tail points.
export function dragon(
    ctx,
    clock,
    { mouth = false, eyeGlow = 0, pearlGlow = 0, out = 0, time = 0 } = {},
) {
    drawRing(ctx, clock, out, time);
    const pts = [zodiarchPath(clock)];
    let c = clock;
    while (pts.length < 27) {
        c -= 0.004;
        const [px, py] = zodiarchPath(c);
        const [lx, ly] = pts[pts.length - 1];
        if (Math.hypot(px - lx, py - ly) >= 13) pts.push([px, py]);
    }
    const [x, y] = pts[0];
    const body = pts.slice(1).map(([sx, sy], i) => ({ x: sx, y: sy, r: 20 - (10 * i) / 25 }));
    const last = body[body.length - 1],
        prev = body[body.length - 2];
    art.drawRotated(
        ctx,
        'rift',
        'zod-tail',
        last.x,
        last.y,
        Math.atan2(last.y - prev.y, last.x - prev.x),
    );
    for (let i = body.length - 1; i >= 0; i--) {
        const s = body[i];
        art.draw(ctx, 'rift', segmentKey(s.r, i), s.x, s.y, {});
        if (i === 4 || i === 15)
            art.draw(ctx, 'rift', 'zod-claw', s.x - 1, s.y + s.r * 0.55 + 14, {});
    }
    art.draw(ctx, 'rift', mouth ? 'zod-head-1' : 'zod-head-0', x - 24, y, {});
    const eye = [x - 38, y - 12],
        jaw = [x - 72, y + 3],
        pearl = [x - 56, y + 24];
    if (eyeGlow > 0) {
        glow(ctx, eye[0], eye[1], 10 + 14 * eyeGlow, '255,90,70', 0.5 * eyeGlow);
        ctx.fillStyle = '#ffd0c0';
        ctx.fillRect(eye[0] - 1, eye[1] - 1, 3, 3);
    }
    if (pearlGlow > 0)
        glow(ctx, pearl[0], pearl[1], 16 + 20 * pearlGlow, '200,120,255', 0.5 * pearlGlow);
    art.draw(ctx, 'rift', pearlGlow > 0.5 ? 'zod-pearl-1' : 'zod-pearl-0', pearl[0], pearl[1], {});
    const claws = [body[4], body[15]].map((s) => [s.x - 4, s.y + s.r * 0.55 + 20]);
    return { x, y, eye, jaw, pearl, claws, tail: [last.x, last.y], body };
}
// Light gathering at an emitter while an attack is warned: motes spiral in, the glow grows.
export function charge(ctx, x, y, u, colour = '255,220,160') {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 6 + 18 * u, colour, 0.25 + 0.45 * u);
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + u * 5,
            r = 22 * (1 - ((u * 3 + k / 8) % 1));
        ctx.fillStyle = k % 2 ? '#ffffff' : `rgb(${colour})`;
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    }
}
export function flash(ctx, x, y, u, colour = '255,240,220') {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 10 + 16 * u, colour, 0.9 * (1 - u));
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU,
            r = 3 + 10 * u;
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 1);
    }
    ctx.globalAlpha = 1;
}
export function spark(ctx, x, y, colour = '#ffe6a0', size = 2) {
    ctx.fillStyle = '#2a0c24';
    ctx.fillRect(Math.round(x) - size, Math.round(y) - size, size * 2 + 1, size * 2 + 1);
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x) - size + 1, Math.round(y) - size + 1, size * 2 - 1, size * 2 - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}
export function trail(ctx, x, y, a, len, colour) {
    for (let k = 1; k <= 5; k++) {
        ctx.globalAlpha = 0.5 - k * 0.08;
        ctx.fillStyle = colour;
        ctx.fillRect(
            Math.round(x - (Math.cos(a) * len * k) / 5),
            Math.round(y - (Math.sin(a) * len * k) / 5),
            2,
            2,
        );
    }
    ctx.globalAlpha = 1;
}
export function warnLane(ctx, x, y, a, len, u, colour = '#ff8a6a') {
    if (u <= 0 || u >= 1) return;
    dotted(ctx, x, y, a, len, Math.floor(u * 9) % 2 && u > 0.7 ? '#ffffff' : colour, 4, 1);
}
export function liveLane(ctx, x, y, a, len, width, u, colour = '#ff9a7a') {
    if (u <= 0 || u >= 1) return;
    ctx.globalAlpha = 1 - u * 0.5;
    band(ctx, x, y, a, len, width, colour);
    band(ctx, x, y, a, len, Math.max(1, width - 4), '#fff0e0');
    ctx.globalAlpha = 1;
}
export function fireball(ctx, x, y, r = 6) {
    glow(ctx, x, y, r * 3, '255,140,40', 0.55);
    ctx.fillStyle = '#ff6a20';
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd890';
    ctx.beginPath();
    ctx.arc(Math.round(x) - 1, Math.round(y) - 1, r * 0.55, 0, TAU);
    ctx.fill();
}
// A thrown sign: the shared timeline. `stage` is where it forms; `act(ctx, t, x, y, k)`
// draws its attack from 700 ms (live); returns the creature's position (it may move).
export const FORM = 700;
// `motion` may return `flip` (the creature turns round) and `pilotY` lets the pilot dodge;
// `lingers` keeps drawing the attack after the creature has gone (shots still in flight).
export function signTile(sign, { stage, act, dissolveAt, partner, pilotY, lingers }) {
    const tile = (ctx, t, clock) => {
        const forming = t < FORM,
            dissolving = t >= dissolveAt;
        const throwing = t < FORM;
        const d = dragon(view.dragon ? ctx : OFFSCREEN, clock, {
            mouth: throwing,
            out: forming || !dissolving ? 1 << sign : 0,
            time: t,
        });
        if (view.dragon) pilot(ctx, t, pilotY?.(t - FORM));
        let pos = { x: stage[0], y: stage[1] };
        if (!forming && !dissolving) pos = act.motion?.(t - FORM, stage) ?? pos;
        if (dissolving) pos = act.motion?.(dissolveAt - FORM, stage) ?? pos;
        const state = forming ? 0 : dissolving ? 2 : 1;
        const r = forming
            ? ease(t / FORM)
            : dissolving
              ? 1 - span(t, dissolveAt, dissolveAt + 400)
              : 1;
        const creature = (x, y, isPartner) => {
            ctx.save();
            if (pos.flip) {
                ctx.translate(x * 2, 0);
                ctx.scale(-1, 1);
            }
            drawCreature(ctx, art, { slot: sign, x, y, state, r }, clock, t, 1, isPartner);
            ctx.restore();
        };
        if (!(dissolving && r <= 0)) {
            creature(pos.x, pos.y, false);
            if (partner) {
                const p2 = partner(t, pos);
                if (p2) creature(p2.x, p2.y, true);
            }
        }
        if (!forming && (!dissolving || lingers))
            act.draw(ctx, t - FORM, pos.x, pos.y, d, dissolving);
        return d;
    };
    tile.loop = dissolveAt + 700;
    return tile;
}
// ---------------------------------------------------------------- the twelve
export const S = {};
// A small sun: a hot core and four turning rays.
export function sun(ctx, x, y, spin, grow = 1) {
    const r = 1 + 2 * grow;
    glow(ctx, x, y, 8 + 6 * grow, '255,190,80', 0.6);
    for (let k = 0; k < 4; k++) {
        const a = spin + (k * Math.PI) / 2;
        band(ctx, x, y, a, r + 4, 1, '#ffb040');
    }
    ctx.fillStyle = '#ff9a30';
    ctx.fillRect(Math.round(x) - r, Math.round(y) - r, r * 2 + 1, r * 2 + 1);
    ctx.fillStyle = '#fff6c0';
    ctx.fillRect(
        Math.round(x) - r + 1,
        Math.round(y) - r + 1,
        Math.max(1, r * 2 - 1),
        Math.max(1, r * 2 - 1),
    );
}
// A nova star flung from `from` to `to`: flies 500 ms, counts down 1200 ms, bursts.
export function novaStar(ctx, t, [fx, fy], [tx, ty], colour = '#ffe6a0', gapAngle = 0.4) {
    if (t < 0) return;
    if (t < 500) {
        const u = t / 500;
        flash(ctx, fx, fy, u * 2, '255,240,200');
        spark(ctx, lerp(fx, tx, u), lerp(fy, ty, u) - Math.sin(u * Math.PI) * 50, colour, 2);
        return;
    }
    if (t < 1700) {
        const u = (t - 500) / 1200;
        const pulse = Math.floor(t / (u > 0.7 ? 60 : 140)) % 2;
        glow(ctx, tx, ty, 14, '255,230,160', 0.4 + 0.3 * pulse);
        spark(ctx, tx, ty, pulse ? '#ffffff' : colour, 3);
        dottedRing(ctx, tx, ty, 34 * (1 - u) + 6, pulse ? '#ffffff' : '#ff8a6a', 24, t / 300);
        return;
    }
    const u = clamp01((t - 1700) / 900);
    if (u >= 1) return;
    glow(ctx, tx, ty, 30 * (1 - u) + 6, '255,240,200', 0.8 * (1 - u));
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + gapAngle;
        if (k === 0) continue; // the gap
        spark(ctx, tx + Math.cos(a) * u * 110, ty + Math.sin(a) * u * 110, colour, 2);
    }
}
