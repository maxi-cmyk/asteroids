// The Zodiarch's ring and creatures (design: nextSteps.md P1.2). The ring of twelve signs turns
// behind the dragon as faint constellations; a sign that is out leaves a gap. A thrown sign's
// stars fly from its place in the ring to its creature, which fades in as it forms (part.r is
// how far it has formed, or how much is left while it dissolves).
import { pixelGlow as glow } from '../render/fx.mjs';
import { PART, SIGN_KEY, ZODIARCH, bossBody } from './scene.mjs';

// Simplified star patterns in a unit box: points, then the chains that join them. Ring order.
const GLYPHS = [
    [[0, 0.35], [0.35, 0.2], [0.65, 0.3], [0.95, 0.55]], // Aries
    [[0, 0], [0.45, 0.5], [0.2, 0.55], [1, 0.1], [0.6, 0.7], [0.5, 0.95]], // Taurus
    [[0.2, 0], [0.2, 0.5], [0.15, 1], [0.7, 0], [0.7, 0.5], [0.8, 1]], // Gemini
    [[0.5, 0.45], [0.15, 0.1], [0.85, 0.1], [0.5, 1]], // Cancer
    [[0.1, 0.3], [0.25, 0.05], [0.45, 0.1], [0.4, 0.4], [0.75, 0.5], [1, 0.85], [0.55, 0.9]], // Leo
    [[0, 0.2], [0.3, 0.35], [0.5, 0.1], [0.6, 0.5], [0.95, 0.45], [0.55, 0.95]], // Virgo
    [[0.5, 0], [0.05, 0.45], [0.95, 0.45], [0.25, 1], [0.8, 0.9]], // Libra
    [[0, 0.1], [0.15, 0.3], [0.35, 0.4], [0.5, 0.65], [0.7, 0.9], [0.95, 0.8], [0.9, 0.55]], // Scorpio
    [[0.1, 0.9], [0.45, 0.5], [0.9, 0.1], [0.3, 0.2], [0.7, 0.8]], // Sagittarius
    [[0, 0.15], [0.5, 0.1], [1, 0.2], [0.55, 0.95]], // Capricorn
    [[0.05, 0.1], [0.35, 0.3], [0.25, 0.6], [0.55, 0.55], [0.5, 0.85], [0.85, 0.75], [0.95, 1]], // Aquarius
    [[0, 0.1], [0.2, 0.35], [0.5, 0.9], [0.8, 0.35], [1, 0.1]], // Pisces
];
const CHAINS = [
    [[0, 1, 2, 3]],
    [[0, 1, 4, 5], [3, 1], [2, 4]],
    [[0, 1, 2], [3, 4, 5], [1, 4]],
    [[1, 0, 2], [0, 3]],
    [[0, 1, 2, 3, 0], [3, 4, 5, 6, 3]],
    [[0, 1, 2], [1, 3, 4], [3, 5]],
    [[1, 0, 2], [1, 3], [2, 4]],
    [[0, 1, 2, 3, 4, 5, 6]],
    [[0, 1, 2], [3, 1, 4]],
    [[0, 1, 2, 3, 0]],
    [[0, 1, 2, 3, 4, 5, 6]],
    [[0, 1, 2, 3, 4]],
];
export const SIGN_RIM = [
    '#ff965a',
    '#ffbe6e',
    '#8cdcff',
    '#b4e6d2',
    '#ffd25a',
    '#c8f08c',
    '#e6e6ff',
    '#ff5a5a',
    '#ffaad2',
    '#a0c8ff',
    '#6ec8ff',
    '#aaa0ff',
];
const BOX = 22;

export function ringPoint(sign, clock) {
    const a = -Math.PI / 2 + (sign * Math.PI * 2) / 12 + clock * 0.05;
    return [ZODIARCH.cx + ZODIARCH.rx * Math.cos(a), ZODIARCH.cy + ZODIARCH.ry * Math.sin(a)];
}
const glyphPoints = (sign, cx, cy, scale = 1) =>
    GLYPHS[sign].map(([u, v]) => [cx + (u - 0.5) * BOX * scale, cy + (v - 0.5) * BOX * scale]);

function line(ctx, [x0, y0], [x1, y1]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i += 2)
        ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
}

// The ring: twelve faint constellations; a sign that is out of the ring is left as a gap.
export function drawRing(ctx, clock, outMask, time, alpha = 1) {
    for (let sign = 0; sign < 12; sign++) {
        if (outMask & (1 << sign)) continue;
        const [cx, cy] = ringPoint(sign, clock);
        const pts = glyphPoints(sign, cx, cy);
        ctx.globalAlpha = 0.35 * alpha;
        ctx.fillStyle = SIGN_RIM[sign];
        for (const chain of CHAINS[sign])
            for (let i = 1; i < chain.length; i++) line(ctx, pts[chain[i - 1]], pts[chain[i]]);
        ctx.globalAlpha = (0.65 + 0.25 * Math.sin(time / 400 + sign)) * alpha;
        ctx.fillStyle = '#f2f1df';
        for (const [x, y] of pts) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
}

// A thrown creature. Forming: its constellation's stars fly from the ring to it while the
// sprite fades in. Dissolving: the sprite fades and the stars drift back.
// A creature holds its atlas pose while it forms and dissolves, and strikes while it is live.
// Gemini and Pisces split into two creatures: the partner (`partner`) draws the other twin,
// the other fish. A creature hit on its key star without breaking flinches (P2.3 section 6:
// hurt); one whose key star is shot out cracks from it and comes apart (break: the engine
// keeps hp 0 while it fades); a fish with r < 0 while formed is drawn mirrored (the art faces
// right; the engine sets it while the fish swim left).
const hurtAt = new Map(); // part index -> { hp, at }
export function drawCreature(ctx, art, part, clock, time, alpha = 1, partner = false) {
    const sign = part.slot,
        key = `sign-${sign}${partner ? 'b' : ''}${part.state === 1 ? '-1' : ''}`;
    if (part.state === 2 && part.hp <= 0) return drawBreak(ctx, art, part, clock, time, alpha, partner);
    const formed = part.state === 1 ? 1 : Math.max(0, Math.min(1, part.r));
    if (part.state !== 1) {
        const [rx, ry] = ringPoint(sign, clock);
        const from = glyphPoints(sign, rx, ry),
            to = glyphPoints(sign, part.x, part.y, 3);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < from.length; i++) {
            const x = from[i][0] + (to[i][0] - from[i][0]) * formed,
                y = from[i][1] + (to[i][1] - from[i][1]) * formed;
            ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
            ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
        }
    }
    const hurt = flinch(part, time);
    const fade = part.state === 1 ? 1 : formed * formed;
    // Alive, not pasted on: each creature bobs on its own beat while it holds its form.
    const bob = part.state === 1 ? Math.round(Math.sin(time / 210 + sign * 1.7) * 1.5) : 0;
    const x = part.x + Math.round(2 * Math.sin(Math.min(1, hurt) * Math.PI)),
        y = part.y + bob;
    ctx.save();
    if (part.state === 1 && part.r < 0) {
        ctx.translate(x * 2, 0);
        ctx.scale(-1, 1);
    }
    if (fade > 0.02) {
        // Lift the navy figure off the navy dragon behind it: a soft glow and a 1 px starlight
        // edge in the sign's colour (white, flickering, for a moment after a hit).
        glow(ctx, x, y, 46, rgbOf(SIGN_RIM[sign]), 0.22 * fade * alpha);
        const edge = hurt < 0.45 && Math.floor(hurt * 12) % 2 === 0 ? '#ffffff' : SIGN_RIM[sign];
        // Only once it is solid: under a half-faded sprite the edge would show through as a fill.
        if (part.state === 1) art.drawEdge(ctx, 'rift', key, x, y, edge, 0.75 * alpha);
        art.draw(ctx, 'rift', key, x, y, { alpha: fade * alpha, flash: hurt < 1 ? 0.45 * Math.max(0, 1 - hurt * 4) : 0 });
    }
    ctx.restore();
    if (part.state === 1) {
        // The key star twinkles: shoot it to break the creature.
        const [kx, ky] = SIGN_KEY[sign];
        const on = Math.floor(time / 160) % 3 !== 0;
        ctx.fillStyle = on ? '#ffffff' : SIGN_RIM[sign];
        ctx.fillRect(Math.round(part.x + kx) - 2, Math.round(part.y + ky) + bob, 5, 1);
        ctx.fillRect(Math.round(part.x + kx), Math.round(part.y + ky) - 2 + bob, 1, 5);
        // Stars spilled by the last hit fall away from the key star.
        if (hurt < 1.6)
            for (let k = 0; k < 9; k++) {
                const a = Math.PI + (((k * 37) % 13) / 13 - 0.5) * 2.2,
                    v = 18 + ((k * 17) % 26),
                    u = hurt / 1.6;
                ctx.globalAlpha = 1 - u;
                ctx.fillStyle = k % 3 ? SIGN_RIM[sign] : '#ffffff';
                ctx.fillRect(Math.round(part.x + kx + Math.cos(a) * v * u), Math.round(part.y + ky + Math.sin(a) * v * u + 20 * u * u), 1, 1);
            }
        ctx.globalAlpha = 1;
    }
}
const rgbOf = (hex) => hex.match(/\w\w/g).map((h) => parseInt(h, 16)).join(',');
// 0..1 over 550 ms after the creature's hp last dropped (Infinity if it never did).
function flinch(part, time) {
    if (part.index === undefined) return Infinity;
    const was = hurtAt.get(part.index);
    if (!was || part.state === 0 || part.hp > was.hp) hurtAt.set(part.index, { hp: part.hp, at: -1e9 });
    else if (part.hp < was.hp) hurtAt.set(part.index, { hp: part.hp, at: time });
    return (time - hurtAt.get(part.index).at) / 550;
}
// Break: the key star flares and cracks run out from it (the first quarter), then the figure
// comes apart in seven shards that drift and wink out, and its stars stream back to the ring,
// dim. u = 1 - r runs 0..1 over the engine's 900 ms break fade.
function drawBreak(ctx, art, part, clock, time, alpha, partner) {
    const sign = part.slot,
        key = `sign-${sign}${partner ? 'b' : ''}-1`;
    const u = 1 - Math.max(0, Math.min(1, part.r));
    const [kx, ky] = SIGN_KEY[sign];
    const K = [part.x + kx, part.y + ky],
        R = 220,
        N = 7,
        off = sign * 0.9;
    const cuts = Array.from({ length: N }, (_, k) => off + (k / N) * Math.PI * 2 + (((k * 13 + sign) % 7) / 7 - 0.5) * 0.4);
    const crack = Math.min(1, u / 0.25);
    const drift = Math.max(0, (u - 0.2) / 0.8);
    cuts.forEach((a, k) => {
        const a2 = k === N - 1 ? cuts[0] + Math.PI * 2 : cuts[k + 1],
            mid = (a + a2) / 2;
        if (drift >= 1) return;
        const d = drift * drift * (3 - 2 * drift) * 26;
        ctx.save();
        ctx.translate(Math.cos(mid) * d, Math.sin(mid) * d + 18 * drift * drift);
        const cx = K[0] + Math.cos(mid) * 30,
            cy = K[1] + Math.sin(mid) * 30;
        ctx.translate(cx, cy);
        ctx.rotate((k % 2 ? 1 : -1) * 0.35 * drift);
        ctx.translate(-cx, -cy);
        ctx.beginPath();
        ctx.moveTo(K[0], K[1]);
        for (const q of [a, mid, a2]) ctx.lineTo(K[0] + Math.cos(q) * R, K[1] + Math.sin(q) * R);
        ctx.closePath();
        ctx.clip();
        const wink = drift > 0.6 && Math.floor(time / 70) % 2 ? 0.4 : 1;
        art.drawEdge(ctx, 'rift', key, part.x, part.y, SIGN_RIM[sign], 0.75 * alpha * (1 - drift) * wink);
        art.draw(ctx, 'rift', key, part.x, part.y, { alpha: alpha * (1 - drift) * wink, flash: u < 0.15 ? 0.45 * (1 - u / 0.15) : 0 });
        ctx.restore();
    });
    if (u < 0.45) {
        glow(ctx, K[0], K[1], 12 + 30 * crack, '255,255,255', 0.8 * (1 - Math.max(0, (u - 0.25) / 0.2)));
        ctx.globalAlpha = 1 - Math.max(0, (u - 0.25) / 0.2);
        ctx.fillStyle = '#ffffff';
        for (const a of cuts)
            for (let s = 0; s < 80 * crack; s++)
                ctx.fillRect(Math.round(K[0] + Math.cos(a) * s * 0.4 + Math.sin(s * 0.7) * 1.2), Math.round(K[1] + Math.sin(a) * s * 0.4), 1, 1);
        ctx.globalAlpha = 1;
    }
    const home = Math.max(0, (u - 0.4) / 0.6);
    if (home > 0 && home < 1) {
        const [rx, ry] = ringPoint(sign, clock);
        for (let k = 0; k < 14; k++) {
            const sx = part.x + (((k * 37) % 100) / 100 - 0.5) * 100,
                sy = part.y + (((k * 53) % 100) / 100 - 0.5) * 70;
            const e = Math.min(1, home * 1.3 - k / 40);
            if (e <= 0) continue;
            ctx.globalAlpha = 0.55 * (1 - e * 0.5) * alpha;
            ctx.fillStyle = SIGN_RIM[sign];
            ctx.fillRect(Math.round(sx + (rx - sx) * e), Math.round(sy + (ry - sy) * e - Math.sin(e * Math.PI) * 20), 1, 1);
        }
        ctx.globalAlpha = 1;
    }
}

const RADII = [20, 18, 16, 14, 12, 10];
export const segmentKey = (r, i) =>
    `zod-seg-${RADII.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a))}-${i % 2 ? 0 : 1}`;

// Body, legs and tail fan, tail first so the neck draws on top.
export function drawDragonBody(ctx, art, scene, { alpha = 1, flash = 0, damage = 0, time = 0 } = {}) {
    const body = bossBody(scene);
    if (body.length < 2) return body;
    const last = body[body.length - 1],
        prev = body[body.length - 2];
    art.drawRotated(ctx, 'rift', 'zod-tail', last.x, last.y, Math.atan2(last.y - prev.y, last.x - prev.x), alpha);
    for (let i = body.length - 1; i >= 0; i--) {
        const s = body[i],
            key = segmentKey(s.r, i);
        art.draw(ctx, 'rift', key, s.x, s.y, { alpha, flash });
        // Damage spreads down the body: one segment in three at level 1, every other at 2.
        if (damage > 0 && i % (damage === 2 ? 2 : 3) === 1)
            art.draw(ctx, 'rift', `${key.replace(/-[01]$/, '')}-d${damage}`, s.x, s.y, { alpha });
        // The legs paddle as it swims, front and back pairs out of step.
        if (i === 4 || i === 15) {
            const paddle = Math.sin(time / 260 + (i === 4 ? 0 : Math.PI));
            art.draw(ctx, 'rift', 'zod-claw', s.x - 1 + Math.round(paddle * 3), s.y + s.r * 0.55 + 14 - Math.round(Math.abs(paddle) * 2), { alpha });
        }
    }
    return body;
}

export const creatures = (parts) => parts.filter((p) => p.kind === PART.sign);
// For each creature, whether it is the second of a pair (Gemini, Pisces): the lead is spawned
// first, so it has the lower part index.
export function partners(list) {
    const seen = new Set();
    return list.map((p) => {
        const second = seen.has(p.slot);
        seen.add(p.slot);
        return second;
    });
}
