// The Tidecaller's painter (nextSteps.md P4.5): the bell (cut above its old fringe) squeezing
// narrower and taller on each contraction and leaning toward where it swims, tendrils that
// trail behind it on the path it took, light running along the bell to where a stream will
// start, and the bubbles drifting round it. Also the Moonjelly, which swims the same way
// (its own tentacles already trail, so it gets no extra tendrils).
import { pixelGlow as glow } from '../../render/fx.mjs';
import { PART, bossBlocks } from '../scene.mjs';
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

// The bubble shield (R1 playtest: it was not clear the bubbles must go first). While any
// bubble stands, a membrane wraps the bell, each bubble feeds it along a tether, a blocked
// shot ripples it, and it thins as bubbles pop; the last pop bursts it.
// The membrane is an ellipse round the bell sprite (above its fringe), not the hit circle,
// so it is never hidden inside the bell.
const SHIELD = { dy: -46, rx: 124, ry: 92 };
const shieldState = { count: -1, burstAt: -1e9, formedAt: -1e9, lastTime: 0 };
function shield(b, bubbles) {
    const { ctx, x, time } = b,
        cy = b.y + SHIELD.dy,
        squeeze = b.aux[b.A.squeeze],
        s = shieldState,
        n = bubbles.length;
    const rx = SHIELD.rx * (1 - 0.12 * squeeze),
        ry = SHIELD.ry * (1 + 0.06 * squeeze);
    const at = (a, grow = 1, lift = 0) => [
        x + Math.cos(a) * (rx * grow + lift),
        cy + Math.sin(a) * (ry * grow + lift),
    ];
    if (time < s.lastTime || time - s.lastTime > 500) s.count = -1; // a new fight or a jump
    s.lastTime = time;
    if (s.count > 0 && n === 0) s.burstAt = time;
    if (s.count === 0 && n > 0) s.formedAt = time;
    s.count = n;
    // The burst: the membrane flies apart in droplets.
    const burst = (time - s.burstAt) / 600;
    if (burst >= 0 && burst < 1) {
        glow(ctx, x, cy, 90 + 40 * burst, '150,240,255', 0.45 * (1 - burst));
        ctx.globalAlpha = (1 - burst) * b.alpha;
        for (let i = 0; i < 56; i++) {
            const a = (i / 56) * Math.PI * 2 + (i % 3) * 0.04;
            const [X, Y] = at(a, 1, burst * (24 + (i % 5) * 10));
            ctx.fillStyle = i % 4 ? '#bffcff' : '#ffffff';
            px(ctx, X - 1, Y - 1, 3, 3);
        }
        ctx.globalAlpha = 1;
    }
    if (!n) return;
    const grow = 0.7 + 0.3 * Math.min(1, (time - s.formedAt) / 400),
        fade = Math.min(1, (time - s.formedAt) / 400),
        flicker = n === 1 && Math.floor(time / 90) % 5 === 0 ? 0.4 : 1;
    // Ripples where blocked shots struck it (the events sit on the hit circle).
    const ripples = bossBlocks(b.scene)
        .filter((k) => k.age < 420)
        .map((k) => ({ a: Math.atan2((k.y - cy) / ry, (k.x - x) / rx), u: k.age / 420 }));
    ctx.globalAlpha = b.alpha * fade * flicker;
    const dots = 96;
    for (let i = 0; i < dots; i++) {
        const a = (i / dots) * Math.PI * 2;
        // Thinner as bubbles pop: a gap in every three dots per bubble lost.
        if (n < 3 && i % 3 < 3 - n) continue;
        let lift = 0,
            hot = 0;
        for (const p of ripples) {
            let d = Math.abs(a - p.a) % (Math.PI * 2);
            if (d > Math.PI) d = Math.PI * 2 - d;
            const w = Math.max(0, 1 - Math.abs(d - p.u * 0.9) / 0.16) * (1 - p.u);
            lift += w * 6;
            hot = Math.max(hot, w);
        }
        const [X, Y] = at(a, grow, Math.sin(time / 260 + i * 0.7) * 1.5 + lift);
        const big = hot > 0.3 || i % 8 === Math.floor(time / 110) % 8;
        ctx.fillStyle = '#0a2a3a';
        px(ctx, X - 2, Y - 2, big ? 4 : 3, big ? 4 : 3);
        ctx.fillStyle = hot > 0.3 ? '#ffffff' : big ? '#e8ffff' : i % 2 ? '#7ae8ff' : '#ff9ae0';
        px(ctx, X - 1, Y - 1, big ? 2 : 1, big ? 2 : 1);
    }
    // A sheen on the upper left so the bell reads as behind glass.
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 12; i++) {
        const [X, Y] = at(-2.5 + i * 0.07, grow, -9);
        px(ctx, X, Y, 2, 1);
    }
    // Tethers: light runs from each bubble into the membrane.
    for (const part of bubbles) {
        const a = Math.atan2((part.y - cy) / ry, (part.x - x) / rx);
        const [ex, ey] = at(a, grow),
            len = Math.hypot(part.x - ex, part.y - ey);
        if (len < 6) continue;
        const steps = Math.floor(len / 5),
            run = (time / 450) % 1;
        for (let k = 1; k < steps; k++) {
            const u = k / steps,
                lit = Math.abs(u - run) < 0.12;
            const X = lerp(part.x, ex, u),
                Y = lerp(part.y, ey, u);
            ctx.fillStyle = '#0a2a3a';
            px(ctx, X - 1, Y - 1, 3, 3);
            ctx.fillStyle = lit ? '#ffffff' : '#7ae8ff';
            px(ctx, X, Y, lit ? 2 : 1, lit ? 2 : 1);
        }
    }
    ctx.globalAlpha = 1;
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
    const bubbles = parts.filter((part) => part.kind === PART.bubble);
    shield(b, bubbles);
    for (const part of bubbles)
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
