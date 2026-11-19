// The missiles' look (nextSteps.md P4.4): a slim body with small fins, a white-hot nose, an
// exhaust flame, a smoke trail left where it has been (so its turns show), and a burst of hot
// fragments when one is gone (shot down or spent). The engine only says where each missile is
// now, so the trail and the burst are remembered here, frame to frame.
import { pixelGlow as glow } from '../render/fx.mjs';
import { SHOT } from './scene.mjs';
import { px, TAU } from './draw-kit.mjs';

const TRAIL_MS = 700,
    POP_MS = 300;
const live = new Map(); // shot index -> { pts: [[x, y, t]], age }
const pops = []; // { x, y, at }
let lastTime = 0;

// Once a frame, before the shots are drawn: remember where each missile is, draw the smoke
// behind each, and the bursts of those just gone.
export function missileTrails(ctx, shots, time) {
    if (time < lastTime || time - lastTime > 500) {
        live.clear();
        pops.length = 0;
    }
    lastTime = time;
    const seen = new Set();
    for (const s of shots) {
        if (s.family !== SHOT.missile) continue;
        seen.add(s.index);
        let m = live.get(s.index);
        if (!m || s.age < m.age) live.set(s.index, (m = { pts: [], age: s.age }));
        m.age = s.age;
        m.x = s.x;
        m.y = s.y;
        m.pts.push([s.x, s.y, time]);
        while (m.pts.length && time - m.pts[0][2] > TRAIL_MS) m.pts.shift();
    }
    for (const [i, m] of live)
        if (!seen.has(i)) {
            pops.push({ x: m.x, y: m.y, at: time });
            live.delete(i);
        }
    for (const m of live.values())
        for (const [x, y, t] of m.pts) {
            const u = (time - t) / TRAIL_MS;
            if (u < 0.03) continue;
            ctx.globalAlpha = 0.55 * (1 - u);
            ctx.fillStyle = u < 0.15 ? '#ffb070' : '#7a7488';
            const r = 1 + Math.round(u * 3);
            px(ctx, x - r / 2, y - r / 2 - u * 4, r, r);
        }
    ctx.globalAlpha = 1;
    for (let k = pops.length - 1; k >= 0; k--) {
        const p = pops[k],
            u = (time - p.at) / POP_MS;
        if (u >= 1) {
            pops.splice(k, 1);
            continue;
        }
        glow(ctx, p.x, p.y, 8 + 10 * u, '255,180,90', 0.8 * (1 - u));
        ctx.globalAlpha = 1 - u;
        for (let j = 0; j < 6; j++) {
            const a = (j / 6) * TAU;
            ctx.fillStyle = j % 2 ? '#ffffff' : '#ff9a4a';
            px(ctx, p.x + Math.cos(a) * 9 * u, p.y + Math.sin(a) * 9 * u, 2, 2);
        }
        ctx.globalAlpha = 1;
    }
}
// One missile: body and fins along its heading, the hot nose, the flickering flame.
export function missile(ctx, s, time) {
    const c = Math.cos(s.angle),
        sn = Math.sin(s.angle);
    const at = (f, side) => [s.x + c * f - sn * side, s.y + sn * f + c * side];
    glow(ctx, ...at(-8, 0), 7, '255,140,60', 0.7);
    ctx.fillStyle = '#ff8a3a';
    px(ctx, ...at(-10 - (Math.floor(time / 40) % 2) * 2, 0), 2, 2);
    ctx.fillStyle = '#ffd070';
    px(ctx, ...at(-8, 0), 2, 2);
    ctx.fillStyle = '#9aa2b4';
    for (let f = -6; f <= 4; f++) px(ctx, ...at(f, 0), 1, 2);
    ctx.fillStyle = '#5a6274';
    for (const side of [-2, 2]) px(ctx, ...at(-6, side), 2, 1);
    ctx.fillStyle = '#ffffff';
    px(ctx, ...at(5, 0), 2, 2);
}
