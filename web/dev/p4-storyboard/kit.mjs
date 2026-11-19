// The P4 storyboards' kit: each region's sky (the colours of tools/boss_art.py REGIONS), a
// shot from the shots sheet, and the shared helpers of the living-dragon kit.
import { art, burst, glance, H, px, W } from '../zodiarch-living/kit.mjs';

export * from '../zodiarch-living/kit.mjs';
export { pixelGlow as glow } from '../../src/render/fx.mjs';
export { TAU, band, dotted, dottedArc, dottedOrbit, dottedRing } from '../../src/boss/draw-kit.mjs';

const SKY = {
    frontier: ['#09061c', '#1a0c3a', '#4a185c', '#96346a'],
    violet: ['#08051a', '#140a30', '#2c1248', '#5a2060'],
    ember: ['#1c0a1a', '#3a1424', '#6a2430', '#8c3a3c'],
    ruins: ['#080c1c', '#10162e', '#1c2442', '#2c3656'],
    lunar: ['#050c20', '#0a1a3c', '#123058', '#1a4470'],
};
export const sky = (region) => (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, H),
        stops = SKY[region];
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    let s = region.length * 9301;
    for (let i = 0; i < 70; i++) {
        s = (s * 9301 + 49297) % 233280;
        const x = (s / 233280) * W;
        s = (s * 9301 + 49297) % 233280;
        const y = (s / 233280) * H;
        ctx.fillStyle = i % 7 ? '#5a5a8a' : '#c8d2ff';
        px(ctx, x, y);
    }
};

// A boss shot from the shots sheet, turned to its heading.
export function shot(ctx, kind, x, y, a = Math.PI) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(a);
    art.draw(ctx, 'shots', kind, 0, 0);
    ctx.restore();
}
// A sprite cell drawn centred at (x, y), turned by `a` and scaled by `k`.
export function cell(ctx, sheet, key, x, y, { a = 0, k = 1, alpha = 1, flash = 0 } = {}) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (a) ctx.rotate(a);
    if (k !== 1) ctx.scale(k, k);
    art.draw(ctx, sheet, key, 0, 0, { alpha, flash });
    ctx.restore();
}
// The pilot's shots: one every `every` ms from t0 to t1, leaving the ship where it was then
// (`from(s)` gives the ship at time s) and flying right. `hit(y, s)` says where a shot at
// height y stops ({ x, kind: 'burst' | 'glance', colour }) or null if it flies on.
export function fire(ctx, t, from, every, t0, t1, hit) {
    const speed = 0.5; // px per ms
    for (let s = t0; s < t1 && s <= t; s += every) {
        const [x0, y] = from(s),
            stop = hit(y, s),
            x = x0 + 12 + (t - s) * speed;
        if (!stop || x < stop.x) {
            if (x > W) continue;
            ctx.fillStyle = '#9fe8ff';
            px(ctx, x - 2, y, 4, 1);
            ctx.fillStyle = '#ffffff';
            px(ctx, x + 1, y);
            continue;
        }
        const u = (x - stop.x) / speed / 320;
        if (stop.kind === 'glance') glance(ctx, stop.x, y, 0, u);
        else burst(ctx, stop.x, y, u, stop.colour || '#ffd070');
    }
}
