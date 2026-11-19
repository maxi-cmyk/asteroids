// The Tidecaller's painter (nextSteps.md P4.5): the bell (cut above its old fringe) squeezing
// narrower and taller on each contraction and leaning toward where it swims, tendrils that
// trail behind it on the path it took, light running along the bell to where a stream will
// start, and the bubbles drifting round it. Also the Moonjelly, which swims the same way
// (its own tentacles already trail, so it gets no extra tendrils).
import { pixelGlow as glow } from '../../render/fx.mjs';
import { PART } from '../scene.mjs';
import { px } from '../draw-kit.mjs';

const lerp = (a, b, u) => a + (b - a) * u;

// Recent poses ({ x, y, lean, squeeze, time }), so the tendrils can follow the bell's path.
function trail() {
    const poses = [];
    let lastTime = 0;
    return {
        push(pose, time) {
            if (time < lastTime || time - lastTime > 500) poses.length = 0;
            lastTime = time;
            poses.push({ ...pose, time });
            while (poses.length && time - poses[0].time > 800) poses.shift();
        },
        at(time) {
            for (let k = poses.length - 1; k >= 0; k--) if (poses[k].time <= time) return poses[k];
            return poses[0];
        },
    };
}
const tidePath = trail();

function tendrils(ctx, path, time, scale, alpha) {
    ctx.globalAlpha = alpha;
    for (let k = 0; k < 7; k++) {
        const off = (-54 + k * 18) * scale;
        let prev = null;
        for (let j = 0; j <= 11; j++) {
            const p = path.at(time - j * 55),
                c = Math.cos(p.lean),
                s = Math.sin(p.lean);
            const ox = off * (1 - 0.18 * p.squeeze),
                oy = (-6 + j * 9) * scale;
            const x = p.x + ox * c - oy * s + Math.sin(time / 300 + k + j * 0.6) * j * 0.4,
                y = p.y + ox * s + oy * c;
            if (prev) {
                const n = Math.max(1, Math.round(Math.hypot(x - prev[0], y - prev[1]) / 2));
                for (let i = 0; i < n; i++) {
                    ctx.fillStyle = (j + i + k) % 7 ? '#3aa8c0' : '#ff7ad0';
                    px(ctx, lerp(prev[0], x, i / n) - 2, lerp(prev[1], y, i / n), 4, 2);
                }
            }
            prev = [x, y];
        }
        ctx.fillStyle = '#ff5ac0';
        px(ctx, prev[0] - 3, prev[1], 6, 4);
    }
    ctx.globalAlpha = 1;
}
// The bell sprite above its fringe, squeezed and leaning.
function bell(b, key, { lean, squeeze, cut, scale = 1 }) {
    const { ctx, art, sheet, x, y, alpha, flash } = b;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(lean);
    ctx.scale(1 - 0.16 * squeeze, 1 + 0.1 * squeeze);
    ctx.beginPath();
    ctx.rect(-130 * scale, -170 * scale, 260 * scale, (170 + cut) * scale);
    ctx.clip();
    art.draw(ctx, sheet, key, 0, 0, { alpha, flash });
    ctx.restore();
}

export const tidecaller = (b) => {
    const { ctx, art, x, y, time, aux, parts, A } = b;
    const exposed = aux[A.exposed] > 0.5,
        squeeze = aux[A.squeeze],
        lean = aux[A.lean];
    tidePath.push({ x, y, lean, squeeze }, time);
    tendrils(ctx, tidePath, time, 1, b.alpha);
    bell(b, `tide-${Math.floor(time / 280) % 4}-${exposed ? 1 : 0}`, { lean, squeeze, cut: -6 });
    b.overlay('tide');
    if (exposed) glow(ctx, x, y - 37, 60 + 20 * squeeze, '255,120,220', 0.22 + 0.25 * squeeze);
    // Bioluminescence: light runs along the bell from its crown to the stream's mouth.
    const rim = aux[A.rim];
    if (rim > 0) {
        const to = aux[A.rimTo];
        for (let i = 0; i < 24; i++) {
            const a = lerp(-Math.PI / 2, to, (i / 24) * rim);
            const rx = x + Math.cos(a) * 92 * (1 - 0.16 * squeeze),
                ry = y - 37 + Math.sin(a) * 70;
            glow(ctx, rx, ry, 6, '150,240,255', 0.5);
            ctx.fillStyle = '#0a2a3a';
            px(ctx, rx - 2, ry - 2, 5, 5);
            ctx.fillStyle = i % 3 ? '#ffffff' : '#9af8ff';
            px(ctx, rx - 1, ry - 1, 3, 3);
        }
        glow(
            ctx,
            x + Math.cos(to) * 92,
            y - 37 + Math.sin(to) * 70,
            10 + 14 * rim,
            '150,240,255',
            0.8 * rim,
        );
    }
    for (const part of parts)
        if (part.kind === PART.bubble)
            art.draw(ctx, 'shots', 'bubble', Math.round(part.x), Math.round(part.y), {
                alpha: 0.9,
            });
};

export const moonjelly = (b) => {
    const { ctx, x, y, time, aux, A } = b;
    const squeeze = aux[A.squeeze],
        lean = aux[A.lean];
    bell(b, `moonjelly-${Math.floor(time / 300) % 4}`, { lean, squeeze, cut: 200, scale: 0.6 });
    b.overlay('moonjelly');
    glow(ctx, x, y - 25, 30 + 10 * squeeze, '170,230,255', 0.12 + 0.2 * squeeze);
};
