// The living-dragon storyboard's kit: the art, easing helpers, the backdrop, the pilot,
// labels, lanes, bursts, glancing sparks and bullets.

import { BossArt } from '../../src/boss/art.mjs';
import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { dotted, TAU } from '../../src/boss/draw-kit.mjs';

export const W = 480,
    H = 270,
    DT = 20,
    GAP = 13,
    SEGS = 26;
export const art = new BossArt('./assets/bosses/');
await Promise.all([art.load('rift'), art.load('shots')]);
await document.fonts.load('16px "Jersey 10"').catch(() => {});
// ---------------------------------------------------------------- helpers
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const clamp01 = (v) => clamp(v, 0, 1);
export const ease = (u) => u * u * (3 - 2 * u);
export const lerp = (a, b, u) => a + (b - a) * u;
export const span = (t, a, b) => clamp01((t - a) / (b - a));
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const bump = (t, a, b) => (t < a || t > b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));
export const rgb = (hex) =>
    hex
        .match(/\w\w/g)
        .map((h) => parseInt(h, 16))
        .join(',');
export const px = (ctx, x, y, w = 1, h = 1) => ctx.fillRect(Math.round(x), Math.round(y), w, h);
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
        px(ctx, x, y);
    }
}
export function pilot(ctx, x, y) {
    ctx.fillStyle = '#9fe8ff';
    ctx.beginPath();
    ctx.moveTo(x + 9, y);
    ctx.lineTo(x - 6, y - 5);
    ctx.lineTo(x - 3, y);
    ctx.lineTo(x - 6, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb060';
    ctx.fillRect(Math.round(x) - 9, Math.round(y) - 1, 3, 2);
}
export function label(ctx, text, x = 8, y = 18, colour = '#ffe9c4') {
    ctx.font = '16px "Jersey 10"';
    ctx.fillStyle = '#0a0614';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
}
export function note(ctx, text, x, y, colour = '#ffffff') {
    ctx.font = '13px "Jersey 10"';
    ctx.fillStyle = '#0a0614';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
}
export function line(ctx, [x0, y0], [x1, y1], step = 2) {
    const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i += step) px(ctx, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
}
export function warnLane(ctx, x, y, a, len, u, colour = '#ff8a6a') {
    if (u <= 0 || u >= 1) return;
    dotted(ctx, x, y, a, len, Math.floor(u * 9) % 2 && u > 0.7 ? '#ffffff' : colour, 4, 1);
}
export function burst(ctx, x, y, u, colour, n = 8, reach = 12) {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 10 + 14 * u, rgb(colour), 0.8 * (1 - u));
    ctx.globalAlpha = 1 - u;
    for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        ctx.fillStyle = k % 2 ? '#ffffff' : colour;
        px(ctx, x + Math.cos(a) * reach * u, y + Math.sin(a) * reach * u, 2, 1);
    }
    ctx.globalAlpha = 1;
}
// A shot stopped by a hard surface: a gold flash and a few sparks glancing off.
export function glance(ctx, x, y, inAngle, u) {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 6 + 6 * u, '255,210,120', 0.7 * (1 - u));
    ctx.globalAlpha = 1 - u;
    for (let k = 0; k < 4; k++) {
        const a = inAngle + Math.PI + (k - 1.5) * 0.45 + (k % 2 ? 0.9 : -0.9);
        ctx.fillStyle = k % 2 ? '#ffd890' : '#ffffff';
        px(ctx, x + Math.cos(a) * 10 * u, y + Math.sin(a) * 10 * u);
    }
    ctx.globalAlpha = 1;
}
export function bullet(ctx, x, y) {
    ctx.fillStyle = '#9fe8ff';
    px(ctx, x - 2, y, 4, 1);
    ctx.fillStyle = '#ffffff';
    px(ctx, x + 1, y);
}
