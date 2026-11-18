// Hit feedback shared by every boss (nextSteps.md P3.3): one look per outcome, so a player
// learns them once. A pink burst means a shot hurt; a gold spark glancing off means a hard
// surface stopped it; a shot that passes through shows nothing.
import { pixelGlow as glow } from '../render/fx.mjs';
import { px } from './draw-kit.mjs';

// Stopped: a gold flash and sparks glancing off; `u` runs 0..1 over 300 ms. Drawn from the
// scene's BLOCKS events.
export function glance(ctx, x, y, angle, u) {
    if (u < 0 || u >= 1) return;
    glow(ctx, x, y, 6 + 6 * u, '255,210,120', 0.7 * (1 - u));
    ctx.globalAlpha = 1 - u;
    for (let k = 0; k < 4; k++) {
        const a = angle + Math.PI + (k - 1.5) * 0.45 + (k % 2 ? 0.9 : -0.9);
        ctx.fillStyle = k % 2 ? '#ffd890' : '#ffffff';
        px(ctx, x + Math.cos(a) * 10 * u, y + Math.sin(a) * 10 * u);
    }
    ctx.globalAlpha = 1;
}
