// Tile: the forehead pearl's window, its tell, timer and boss-bar icon.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { drawRing } from '../../src/boss/zodiarch/ring.mjs';
import { TAU } from '../../src/boss/draw-kit.mjs';
import { span, clamp01, note, burst, pilot, label } from './kit.mjs';
import { simulate, bodyOf, headOf, drawDragon, local, BROW } from './body.mjs';

// 7. The forehead pearl window, with a close-up of the head.
const PEARL = simulate(
    { x: 400, y: 140, heading: Math.PI, v: 0.03 },
    [{ until: 7000, goal: [300, 130], speed: 0.018, turn: 1, label: '' }],
    7000,
);
const PW = { tell: 1500, open: 2100, close: 4600 };
function pearlState(t) {
    const tell = t >= PW.tell && t < PW.open ? span(t, PW.tell, PW.tell + 200) : 0;
    const open = clamp01(span(t, PW.open, PW.open + 120) - span(t, PW.close, PW.close + 80));
    const left = t >= PW.open && t < PW.close ? 1 - span(t, PW.open, PW.close) : 0;
    return { tell, open, left };
}
function pearlRing(ctx, x, y, left, t) {
    if (left <= 0) return;
    const flash = left < 0.2 && Math.floor(t / 80) % 2;
    ctx.strokeStyle = flash ? '#ffffff' : '#ff8ad0';
    ctx.beginPath();
    ctx.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + TAU * left);
    ctx.stroke();
}
function bossBar(ctx, open, left, t) {
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(150, 250, 220, 8);
    ctx.fillStyle = '#ffb060';
    ctx.fillRect(151, 251, 150, 6);
    const x = 386,
        y = 254;
    if (open) glow(ctx, x, y, 12, '255,150,210', 0.6);
    ctx.fillStyle = open ? '#ffe4f2' : '#6a4a66';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, TAU);
    ctx.fill();
    pearlRing(ctx, x, y, left, t);
    note(ctx, 'ZODIARCH', 150, 246, '#ffe9c4');
}
export function pearlWindow(ctx, t) {
    const f = PEARL.frame(t),
        path = (s) => PEARL.trail.at(s);
    drawRing(ctx, t / 1000, 0, t);
    const { tell, open, left } = pearlState(t);
    const segs = bodyOf(path, f.h, { t, still: 0.6 });
    const head = headOf(path, f.h, [90, 150]);
    drawDragon(ctx, segs, head, {
        t,
        pearl: { open, tell },
        rim: open > 0.5 ? '#ff8ad0' : undefined,
    });
    const [qx, qy] = local(head, BROW[0], BROW[1]);
    pearlRing(ctx, qx, qy, left, t);
    if (t >= PW.close && t < PW.close + 200)
        burst(ctx, qx, qy, (t - PW.close) / 200, '#ffffff', 6, 6);
    // The close-up: the head at 3x, bottom left.
    const zx = Math.round(qx - 22),
        zy = Math.round(qy - 14);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#33447f';
    ctx.fillRect(8, 120, 136, 88);
    ctx.drawImage(ctx.canvas, zx, zy, 44, 28, 10, 122, 132, 84);
    note(ctx, 'forehead, 3x', 12, 218, '#aab6dc');
    bossBar(ctx, open > 0.5, left, t);
    pilot(ctx, 170, 150 + Math.sin(t / 500) * 3);
    label(
        ctx,
        t < PW.tell
            ? 'Closed: the brow scales shut'
            : t < PW.open
              ? 'Tell (600 ms): scales twitch, light leaks, chime'
              : t < PW.close
                ? 'Open: the ring drains over 2.5 s, body rim pink'
                : t < PW.close + 300
                  ? 'Snap shut'
                  : 'Closed',
    );
}
