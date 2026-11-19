// The Ringwarden for the P4.2 storyboard: the game's core and blades (sheet violet) on two
// rings that tilt in 3D. A ring is drawn as an ellipse: `tilt` 0 faces you, near PI/2 it is
// edge-on; `axis` turns the ellipse in the screen. Each ring is built with a gap (a few
// blade slots left empty) that sweeps round as it spins.
import { art, dottedOrbit, glow, TAU } from '../kit.mjs';

await art.load('violet');
export const HOME = [352, 135];
export const RINGS = {
    outer: { R: 106, n: 16, gap: [0, 1, 2], cell: 'outer' },
    inner: { R: 70, n: 11, gap: [0, 1], cell: 'inner' },
};
// Where slot i of a ring is: screen x, y and depth (z > 0 is in front of the core).
export function slot(ring, i, { spin = 0, tilt = 0, axis = 0, scale = 1 }, x, y) {
    const { R, n } = RINGS[ring],
        a = (i / n) * TAU + spin,
        r = R * scale;
    const px = Math.cos(a) * r,
        py = Math.sin(a) * r * Math.cos(tilt),
        z = Math.sin(a) * r * Math.sin(tilt);
    const c = Math.cos(axis),
        s = Math.sin(axis);
    return { x: x + px * c - py * s, y: y + px * s + py * c, z, i };
}
// The blades of a ring still on it (not in its gap, not broken).
export function blades(ring, pose, x, y, broken = () => false) {
    const out = [];
    for (let i = 0; i < RINGS[ring].n; i++) {
        if (RINGS[ring].gap.includes(i)) continue;
        const b = slot(ring, i, pose, x, y);
        if (!broken(ring, b)) out.push(b);
    }
    return out;
}
// The middle of a ring's gap, on screen.
export function gapAt(ring, pose, x, y) {
    const g = RINGS[ring].gap;
    return slot(ring, (g[0] + g[g.length - 1]) / 2, pose, x, y);
}

function blade(ctx, ring, b, x, y, alpha) {
    const k = ((Math.round(Math.atan2(b.y - y, b.x - x) / (Math.PI / 8)) % 16) + 16) % 16;
    art.draw(ctx, 'violet', `blade-${RINGS[ring].cell}-${k}`, Math.round(b.x), Math.round(b.y), {
        alpha,
    });
}
// o: outer and inner ring poses ({ spin, tilt, axis, scale }), charging (the core glows),
// flare 0..1 (the eclipse: the core blazes), broken(ring, blade) for blades shot off.
export function ringwarden(ctx, x, y, o) {
    const { outer, inner, charging = false, flare = 0, broken, time = 0 } = o;
    const rings = { outer, inner };
    glow(ctx, x, y, 110, '120,90,255', 0.12 + (charging ? 0.14 : 0));
    for (const [name, pose] of Object.entries(rings)) {
        const r = RINGS[name].R * (pose.scale ?? 1);
        dottedOrbit(ctx, x, y, r, r * Math.cos(pose.tilt), pose.axis, '#6a52c0');
    }
    const all = [];
    for (const [name, pose] of Object.entries(rings))
        for (const b of blades(name, pose, x, y, broken)) all.push([name, b]);
    // Behind the core first, darker; then the core; then the blades in front.
    for (const [name, b] of all) if (b.z < 0) blade(ctx, name, b, x, y, 0.55);
    art.draw(ctx, 'violet', `ringwarden-core-${charging || flare > 0 ? 1 : 0}`, x, y);
    if (flare > 0) {
        glow(ctx, x, y, 40 + 20 * flare, '235,220,255', 0.7 * flare);
        ctx.strokeStyle = Math.floor(time / 90) % 2 ? '#ffffff' : '#c8b8ff';
        ctx.globalAlpha = flare;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    for (const [name, b] of all) if (b.z >= 0) blade(ctx, name, b, x, y, 1);
    return all;
}
// Is the line from the left into the core clear? No blade of either ring crosses the core's
// height on the pilot's side.
export function clearShot(all, x, y) {
    return !all.some(([, b]) => b.x < x - 10 && Math.abs(b.y - y) < 16);
}
// The first blade a shot at height sy meets, coming from the left (or null).
export function firstBlade(all, sy) {
    let best = null;
    for (const [, b] of all) if (Math.abs(b.y - sy) < 12 && (!best || b.x < best.x)) best = b;
    return best;
}
