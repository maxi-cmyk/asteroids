// The Ringwarden's painter (nextSteps.md P4.2): two rings of crystal blades tilted in 3D
// (dotted ellipses that squash and turn), blades behind the core drawn dimmer, the core
// flaring white while the lane into it is clear (the eclipse), blades glowing as the prism
// beam crosses them, the halo lock's gap marked at the edge of the field before it goes, and
// a blade shattering into crystal splinters when it breaks.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { ATTACK, HAZARD, PART, bossHazards, bossPart } from '../scene.mjs';
import { dottedOrbit, px, TAU } from '../draw-kit.mjs';

const HALO_MAX = 3,
    HALO_WARN = 900,
    HALO_GAP = 40;

// Blades seen breaking: slot -> { x, y, out (angle away from the core), at }. The engine only
// says whether a blade exists, so a break is a blade there last frame and gone now.
const SHATTER_MS = 520;
const shatters = new Map();
let was = [],
    lastTime = 0;
function watchBreaks(scene, x, y, time) {
    if (time < lastTime || time - lastTime > 500) {
        shatters.clear();
        was = [];
    }
    lastTime = time;
    for (let i = 0; i < 27; i++) {
        const p = bossPart(scene, i);
        if (was[i] && !p.exists)
            shatters.set(i, { x: p.x, y: p.y, out: Math.atan2(p.y - y, p.x - x), at: time });
        was[i] = p.exists;
    }
    for (const [i, s] of shatters) if (time - s.at > SHATTER_MS) shatters.delete(i);
}
// A flash, a ring of light, and six splinters flung outward (mostly away from the core),
// tumbling and fading.
function shatter(ctx, s, time, slot) {
    const u = (time - s.at) / SHATTER_MS,
        fade = 1 - u;
    if (u < 0.35) glow(ctx, s.x, s.y, 22, '235,225,255', 0.9 * (1 - u / 0.35));
    if (u < 0.5) {
        ctx.globalAlpha = 1 - u * 2;
        ctx.fillStyle = '#ffffff';
        const r = 6 + 22 * u;
        for (let k = 0; k < 16; k++) {
            const a = (k / 16) * TAU;
            px(ctx, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 2, 2);
        }
    }
    for (let k = 0; k < 6; k++) {
        const a = s.out + (k - 2.5) * 0.55 + Math.sin(slot * 3.1 + k) * 0.2,
            d = (20 + 10 * (k % 3)) * u * 2.2,
            spin = time / 60 + k,
            len = 5 - (k % 2);
        const cx = s.x + Math.cos(a) * d,
            cy = s.y + Math.sin(a) * d + 18 * u * u;
        ctx.globalAlpha = fade;
        ctx.fillStyle = '#1a0c2a';
        px(ctx, cx - 2, cy - 2, 4, 4);
        ctx.fillStyle = k % 2 ? '#d8c8ff' : '#8a6ad0';
        for (let j = -len; j <= len; j++)
            px(ctx, cx + Math.cos(spin) * j, cy + Math.sin(spin) * j, 2, 2);
        ctx.fillStyle = '#ffffff';
        px(ctx, cx, cy, 1, 1);
    }
    ctx.globalAlpha = 1;
}

export const ringwarden = (b) => {
    const { ctx, art, scene, state, x, y, time, aux, parts, alpha, A } = b;
    const scale = aux[A.scale] || 1,
        halo = aux[A.halo] || 1,
        eclipse = aux[A.eclipse] > 0.5,
        charging = aux[A.charging] > 0.5;
    glow(ctx, x, y, 110, '120,90,255', 0.12 + (charging ? 0.14 : 0));

    // The halo lock's warning: where the ring will reach, its gap blinking; then the band of
    // light between its blades, out to the edge of the field and back, open across the gap.
    const gap = aux[A.haloGap];
    const dots = (R, colour, step, size) => {
        const half = HALO_GAP / R;
        for (let a = 0; a < TAU; a += step / R) {
            if (Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap))) < half) continue;
            const X = x + Math.cos(a) * R,
                Y = y + Math.sin(a) * R;
            if (X < -4 || X > 484 || Y < -4 || Y > 274) continue;
            ctx.fillStyle = '#1a0c2a';
            px(ctx, X - 1, Y - 1, size + 2, size + 2);
            ctx.fillStyle = colour(a);
            px(ctx, X, Y, size, size);
        }
    };
    if (state.attack === ATTACK.halo && state.attackMs < HALO_WARN) {
        const blink = Math.floor(time / 120) % 2;
        dots(106 * HALO_MAX, () => (blink ? '#ffffff' : '#c8a8ff'), 6, 2);
    } else if (halo > 1.02) {
        const R = 106 * halo * scale,
            run = Math.floor(time / 40);
        ctx.globalAlpha = alpha;
        dots(R, (a) => ((Math.round(a * R) / 3 + run) % 9 < 1 ? '#ffffff' : '#a68cff'), 3, 3);
        ctx.globalAlpha = 1;
    }
    // The rings themselves, as tilted ellipses.
    for (const [R, tilt, axis] of [
        [106 * halo * scale, aux[A.outerTilt], aux[A.outerAxis]],
        [70 * scale, aux[A.innerTilt], aux[A.innerAxis]],
    ])
        dottedOrbit(ctx, x, y, R, R * Math.cos(tilt), axis, '#6a52c0');

    // Blades the prism beam is crossing right now light up.
    const beam = bossHazards(scene).find((h) => h.kind === HAZARD.beam && h.warn <= 0);
    const blades = parts.filter((p) => p.kind === PART.blade);
    const blade = (p) => {
        const angle = Math.atan2(p.y - y, p.x - x),
            k = ((Math.round(angle / (Math.PI / 8)) % 16) + 16) % 16;
        if (beam && Math.abs(Math.atan2(Math.sin(angle - beam.a), Math.cos(angle - beam.a))) < 0.12)
            glow(ctx, p.x, p.y, 16, '220,200,255', 0.8);
        art.draw(ctx, 'violet', `blade-${p.slot < 16 ? 'outer' : 'inner'}-${k}`, p.x, p.y, {
            alpha: p.state === 1 ? alpha * 0.55 : alpha,
        });
    };
    blades.filter((p) => p.state === 1).forEach(blade);
    b.frame(`ringwarden-core-${charging || eclipse ? 1 : 0}`);
    b.overlay('ringwarden');
    if (eclipse) {
        // The eclipse: a clear lane straight in, the core blazing.
        glow(ctx, x, y, 56, '235,220,255', 0.55);
        ctx.fillStyle = Math.floor(time / 90) % 2 ? '#ffffff' : '#c8b8ff';
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 48; i++) {
            const a = (i / 48) * TAU;
            ctx.fillRect(Math.round(x + Math.cos(a) * 30), Math.round(y + Math.sin(a) * 30), 2, 2);
        }
        ctx.globalAlpha = 1;
    }
    blades.filter((p) => p.state !== 1).forEach(blade);
    watchBreaks(scene, x, y, time);
    for (const [i, s] of shatters) shatter(ctx, s, time, i);
};
