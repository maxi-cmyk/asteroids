// A thrown creature: summoned down from the ring, alive, hurt (a flinch) and broken (cracks
// from the key star, shards, its stars home to the ring). Design: nextSteps.md P1.2, P2.3
// section 6, P3.4.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { PART, SIGN_KEY } from '../scene.mjs';
import { CHAINS, SIGN_RIM, glyphPoints, ringPoint } from './ring.mjs';

const ease = (u) => u * u * (3 - 2 * u);
const span = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
function line(ctx, [x0, y0], [x1, y1]) {
    const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++)
        ctx.fillRect(
            Math.round(x0 + ((x1 - x0) * i) / n),
            Math.round(y0 + ((y1 - y0) * i) / n),
            1,
            1,
        );
}
// The sign's constellation between the ring (u 0) and the creature (u 1), lifted on an arc.
function constellation(ctx, sign, ring, x, y, u, alpha) {
    const a = glyphPoints(sign, ring[0], ring[1], 1),
        b = glyphPoints(sign, x, y, 3),
        lift = -Math.sin(u * Math.PI) * 50;
    const pts = a.map(([ax, ay], i) => [ax + (b[i][0] - ax) * u, ay + (b[i][1] - ay) * u + lift]);
    ctx.globalAlpha = 0.8 * alpha;
    ctx.fillStyle = SIGN_RIM[sign];
    for (const chain of CHAINS[sign])
        for (let i = 1; i < chain.length; i++) line(ctx, pts[chain[i - 1]], pts[chain[i]]);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    for (const [px, py] of pts) {
        ctx.fillRect(Math.round(px) - 1, Math.round(py), 3, 1);
        ctx.fillRect(Math.round(px), Math.round(py) - 1, 1, 3);
    }
    ctx.globalAlpha = 1;
}
// The engraving uncovers itself from the key star: the strike frame inside a growing circle.
function reveal(ctx, art, sign, key, x, y, u, alpha) {
    const kx = x + SIGN_KEY[sign][0],
        ky = y + SIGN_KEY[sign][1],
        r = 120 * ease(u);
    ctx.save();
    ctx.beginPath();
    ctx.arc(kx, ky, Math.max(0.1, r), 0, Math.PI * 2);
    ctx.clip();
    glow(ctx, x, y, 46, rgbOf(SIGN_RIM[sign]), 0.25 * alpha);
    art.drawEdge(ctx, 'rift', key, x, y, SIGN_RIM[sign], 0.9 * alpha);
    art.draw(ctx, 'rift', key, x, y, { alpha: (0.35 + 0.65 * u) * alpha });
    ctx.restore();
    if (u < 1) {
        ctx.globalAlpha = (1 - u) * alpha;
        ctx.strokeStyle = SIGN_RIM[sign];
        ctx.beginPath();
        ctx.arc(Math.round(kx), Math.round(ky), Math.max(0.1, r), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    glow(ctx, kx, ky, 8 + 10 * (1 - u), '255,255,255', 0.8 * (1 - u) * alpha);
}
// Forming (state 0, `r` 0..1 over 900 ms): the sign wakes on the ring (to 0.28), its
// constellation arcs over to where the creature will stand (to 0.61) while a ring marks the
// spot, and the engraving uncovers itself from the key star. Leaving (state 2, `r` 1..0) is the
// reverse.
function drawSummon(ctx, art, part, clock, time, alpha, partner) {
    const sign = part.slot,
        key = `sign-${sign}${partner ? 'b' : ''}-1`,
        ring = ringPoint(sign, clock),
        u = Math.max(0, Math.min(1, part.r));
    const kx = part.x + SIGN_KEY[sign][0],
        ky = part.y + SIGN_KEY[sign][1];
    if (part.state === 0) {
        if (u < 0.28) {
            glow(ctx, ring[0], ring[1], 18 + 14 * (u / 0.28), rgbOf(SIGN_RIM[sign]), 0.6 * alpha);
            constellation(ctx, sign, ring, part.x, part.y, 0, (0.4 + 0.6 * (u / 0.28)) * alpha);
        } else if (u < 0.61)
            constellation(ctx, sign, ring, part.x, part.y, ease(span(u, 0.28, 0.61)), alpha);
        else {
            const f = span(u, 0.61, 1);
            constellation(ctx, sign, ring, part.x, part.y, 1, (1 - f) * alpha);
            reveal(ctx, art, sign, key, part.x, part.y, f, alpha);
        }
        // The landing mark, until it has formed.
        ctx.globalAlpha = (0.35 + 0.4 * span(u, 0, 0.61)) * alpha;
        ctx.fillStyle = SIGN_RIM[sign];
        const rr = 22 - 8 * span(u, 0, 0.61);
        for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2 + time / 300;
            ctx.fillRect(
                Math.round(kx + Math.cos(a) * rr),
                Math.round(ky + Math.sin(a) * rr),
                1,
                1,
            );
        }
        ctx.globalAlpha = 1;
        return;
    }
    // Leaving: the engraving closes back into the key star, then the stars fly home.
    if (u > 0.45) reveal(ctx, art, sign, key, part.x, part.y, span(u, 0.45, 1), alpha);
    if (u < 0.6) constellation(ctx, sign, ring, part.x, part.y, ease(span(u, 0, 0.6)), alpha);
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
    if (part.state === 2 && part.hp <= 0)
        return drawBreak(ctx, art, part, clock, time, alpha, partner);
    if (part.state !== 1) return drawSummon(ctx, art, part, clock, time, alpha, partner);
    const hurt = flinch(part, time);
    const fade = 1;
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
        art.draw(ctx, 'rift', key, x, y, {
            alpha: fade * alpha,
            flash: hurt < 1 ? 0.45 * Math.max(0, 1 - hurt * 4) : 0,
        });
    }
    ctx.restore();
    if (part.state === 1) {
        // The key star pulses as a four-pointed glint, with three pips under it for the hits
        // it can take: shoot it to break the creature (P3.3).
        const [kx, ky] = SIGN_KEY[sign];
        const sx = Math.round(part.x + kx),
            sy = Math.round(part.y + ky) + bob,
            p = 0.5 + 0.5 * Math.sin((time / 800) * Math.PI * 2),
            n = 3 + Math.round(3 * p);
        glow(ctx, sx, sy, 8 + 4 * p, rgbOf(SIGN_RIM[sign]), 0.4 * alpha);
        ctx.fillStyle = SIGN_RIM[sign];
        ctx.fillRect(sx - n, sy, n * 2 + 1, 1);
        ctx.fillRect(sx, sy - n, 1, n * 2 + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 3, 3);
        const left = Math.max(0, Math.min(3, Math.round(part.hp)));
        for (let k = 0; k < 3; k++) {
            const x0 = sx - 7 + k * 6,
                y0 = sy + 9;
            ctx.fillStyle = '#0a0614';
            ctx.fillRect(x0 - 1, y0 - 1, 4, 4);
            ctx.fillStyle = k < left ? '#ffffff' : '#4a3a5a';
            ctx.fillRect(x0, y0, 2, 2);
        }
        // Stars spilled by the last hit fall away from the key star.
        if (hurt < 1.6)
            for (let k = 0; k < 9; k++) {
                const a = Math.PI + (((k * 37) % 13) / 13 - 0.5) * 2.2,
                    v = 18 + ((k * 17) % 26),
                    u = hurt / 1.6;
                ctx.globalAlpha = 1 - u;
                ctx.fillStyle = k % 3 ? SIGN_RIM[sign] : '#ffffff';
                ctx.fillRect(
                    Math.round(part.x + kx + Math.cos(a) * v * u),
                    Math.round(part.y + ky + Math.sin(a) * v * u + 20 * u * u),
                    1,
                    1,
                );
            }
        ctx.globalAlpha = 1;
    }
}
const rgbOf = (hex) =>
    hex
        .match(/\w\w/g)
        .map((h) => parseInt(h, 16))
        .join(',');
// 0..1 over 550 ms after the creature's hp last dropped (Infinity if it never did).
function flinch(part, time) {
    if (part.index === undefined) return Infinity;
    const was = hurtAt.get(part.index);
    if (!was || part.state === 0 || part.hp > was.hp)
        hurtAt.set(part.index, { hp: part.hp, at: -1e9 });
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
    const cuts = Array.from(
        { length: N },
        (_, k) => off + (k / N) * Math.PI * 2 + (((k * 13 + sign) % 7) / 7 - 0.5) * 0.4,
    );
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
        art.drawEdge(
            ctx,
            'rift',
            key,
            part.x,
            part.y,
            SIGN_RIM[sign],
            0.75 * alpha * (1 - drift) * wink,
        );
        art.draw(ctx, 'rift', key, part.x, part.y, {
            alpha: alpha * (1 - drift) * wink,
            flash: u < 0.15 ? 0.45 * (1 - u / 0.15) : 0,
        });
        ctx.restore();
    });
    if (u < 0.45) {
        glow(
            ctx,
            K[0],
            K[1],
            12 + 30 * crack,
            '255,255,255',
            0.8 * (1 - Math.max(0, (u - 0.25) / 0.2)),
        );
        ctx.globalAlpha = 1 - Math.max(0, (u - 0.25) / 0.2);
        ctx.fillStyle = '#ffffff';
        for (const a of cuts)
            for (let s = 0; s < 80 * crack; s++)
                ctx.fillRect(
                    Math.round(K[0] + Math.cos(a) * s * 0.4 + Math.sin(s * 0.7) * 1.2),
                    Math.round(K[1] + Math.sin(a) * s * 0.4),
                    1,
                    1,
                );
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
            ctx.fillRect(
                Math.round(sx + (rx - sx) * e),
                Math.round(sy + (ry - sy) * e - Math.sin(e * Math.PI) * 20),
                1,
                1,
            );
        }
        ctx.globalAlpha = 1;
    }
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
