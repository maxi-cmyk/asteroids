// The Sentinel for the P4.1 storyboard: the shell, an eye that rolls in its socket toward
// the pilot, brows, and four plates that part, shiver, close or fly off (draft sheet
// draft-p4-sentinel from tools/make-p4-drafts.py; the plates are the game's own cells).
import { art, cell, clamp01, ease, glow, lerp, px, TAU } from '../kit.mjs';

export const SHEET = 'draft-p4-sentinel';
await Promise.all([art.load(SHEET), art.load('frontier')]);

export const HOME = [366, 135];
// Plate k sits on the diagonal at 45 + 90k degrees: 0 lower right, 1 lower left, 2 upper
// left, 3 upper right. The two on the left face the pilot.
export const plateAngle = (k) => ((45 + 90 * k) * Math.PI) / 180;
export const LEFT = [1, 2];

// o: open 0..1 (how far the plates have parted), mood 'narrow' | 'calm' | 'wide', gaze
// [x, y] it looks at, roll (radians, as it slides), shiver (px), rim 0..1 (the window lit),
// brow 0..1 (a frown), off: plates not on the body (thrown or shed), seam 0..1 (light
// leaking between shut plates as an attack is warned).
export function sentinel(ctx, x, y, o = {}) {
    const {
        open = 1,
        mood = 'wide',
        gaze = null,
        roll = 0,
        shiver = 0,
        rim = 0,
        brow = 0,
        off = [],
        seam = 0,
        time = 0,
    } = o;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(roll);
    art.draw(ctx, SHEET, 'sent-shell', 0, 0);
    // The eye rolls toward what it watches, up to 10 px inside its socket.
    let ex = 0,
        ey = 0;
    if (gaze) {
        const dx = gaze[0] - x,
            dy = gaze[1] - y,
            d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(10, d / 14);
        ex = (dx / d) * reach;
        ey = (dy / d) * reach;
        const c = Math.cos(-roll),
            s = Math.sin(-roll);
        [ex, ey] = [ex * c - ey * s, ex * s + ey * c];
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, TAU);
    ctx.clip();
    art.draw(ctx, SHEET, `sent-eye-${mood}`, Math.round(ex), Math.round(ey));
    ctx.restore();
    if (rim > 0) {
        glow(ctx, ex, ey, 52, '255,200,120', 0.35 * rim + 0.1 * Math.sin(time / 130));
        ctx.globalAlpha = rim;
        for (let i = 0; i < 64; i++) {
            const a = (i / 64) * TAU;
            ctx.fillStyle = (i + Math.floor(time / 90)) % 8 < 2 ? '#ffffff' : '#ffc070';
            px(ctx, ex + Math.cos(a) * 34 - 1, ey + Math.sin(a) * 34 - 1, 2, 2);
        }
        ctx.globalAlpha = 1;
    }
    art.draw(ctx, SHEET, 'sent-brows', 0, Math.round(3 * brow));
    if (seam > 0) glow(ctx, 0, 0, 20 + 30 * seam, '255,170,90', 0.6 * seam);
    for (let k = 0; k < 4; k++) {
        if (off.includes(k)) continue;
        const a = plateAngle(k),
            jig = shiver ? Math.sin(time / 23 + k * 2.1) * shiver : 0,
            r = open * 36 + jig;
        art.draw(
            ctx,
            'frontier',
            `sentinel-plate-${k}`,
            Math.round(Math.cos(a) * r),
            Math.round(Math.sin(a) * r),
        );
    }
    if (seam > 0) {
        // Light through the cross of seams between the shut plates.
        ctx.globalAlpha = seam;
        for (let d = -66; d <= 66; d += 1) {
            ctx.fillStyle = Math.abs(d) < 24 ? '#ffffff' : '#ffc070';
            px(ctx, d, -1, 1, 3);
            px(ctx, -1, d, 3, 1);
        }
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}

// Where plate k sits on the body (its centre of mass is about 38 px out on its diagonal).
export function plateHome(k, x = HOME[0], y = HOME[1], open = 0) {
    const a = plateAngle(k);
    return [x + Math.cos(a) * (38 + open * 36), y + Math.sin(a) * (38 + open * 36)];
}
// A plate in flight: spinning, at (x, y).
export function spinningPlate(ctx, x, y, t, alpha = 1) {
    cell(ctx, SHEET, `sent-spin-${Math.floor(t / 45) % 8}`, x, y, { alpha });
}
// A boomerang loop: out toward `reach` and back to where it left, swinging out to the
// `side` (a vector) on the way out and the other side on the way back. u 0..1.
export function loop(from, reach, side, u) {
    const out = Math.sin(Math.PI * u),
        swing = Math.sin(TAU * u) * 0.6;
    return [from[0] + reach[0] * out + side[0] * swing, from[1] + reach[1] * out + side[1] * swing];
}
// The dotted path a plate will fly, drawn while it is warned.
export function loopPath(ctx, from, reach, side, u, colour = '#ffa860') {
    ctx.fillStyle = colour;
    const n = Math.floor(60 * clamp01(u));
    for (let i = 0; i <= n; i += 2) {
        const [x, y] = loop(from, reach, side, i / 60);
        px(ctx, x, y);
    }
}
export { ease, lerp };
