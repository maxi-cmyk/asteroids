// Death sequences for the rift region's boss and mini-boss.
import { ease } from '../../render/fx.mjs';
import { PART, bossBody, bossParts, bossState } from '../scene.mjs';
import { segmentKey } from '../zodiarch/dragon.mjs';
import {
    TAU,
    clamp01,
    VIOLET,
    shake,
    rays,
    ring,
    whiteFlash,
    dim,
    body,
    dissolved,
} from './fx.mjs';

const STAR = ['#ffffff', '#ffe6a0', '#c8d2ff'];

// A burst of loose stars flying out from (x, y), `age` ms after it began.
function starBurst(ctx, x, y, age, count = 10, reach = 0.09, life = 700, seed = 0) {
    if (age < 0 || age > life) return;
    ctx.globalAlpha = 1 - age / life;
    for (let i = 0; i < count; i++) {
        const a = ((i + seed * 0.37) / count) * TAU,
            r = age * reach * (0.6 + ((i * 7 + seed) % 5) * 0.12);
        ctx.fillStyle = STAR[i % STAR.length];
        ctx.fillRect(
            Math.round(x + Math.cos(a) * r),
            Math.round(y + Math.sin(a) * r),
            i % 3 ? 1 : 2,
            i % 3 ? 1 : 2,
        );
    }
    ctx.globalAlpha = 1;
}

export const SCRIPTS = {
    // 5: the Zodiarch comes apart from the tail: each segment bursts into its stars, the head
    // last; then the pearl flares into a short supernova.
    5(d) {
        const { ctx, age } = d,
            segs = bossBody(d.snap),
            st = bossState(d.snap),
            n = segs.length,
            step = 45;
        const [sx, sy] = shake(d, 3, 0, n * step + 400);
        for (let i = n - 1; i >= 0; i--) {
            const at = (n - 1 - i) * step,
                s = segs[i];
            if (age < at) d.art.drawFx(ctx, 'rift', segmentKey(s.r, i), s.x + sx, s.y + sy, {});
            else starBurst(ctx, s.x, s.y, age - at, 8, 0.07, 600, i);
        }
        const headAt = n * step;
        const px = st.aux[4] || d.x - 56,
            py = st.aux[5] || d.y + 24;
        if (age < headAt) {
            d.art.drawFx(ctx, 'rift', 'zod-head-1', d.x - 24 + sx, d.y + sy, {});
            d.art.drawFx(ctx, 'rift', 'zod-pearl-1', px, py, {});
        } else starBurst(ctx, d.x - 24, d.y, age - headAt, 18, 0.12, 900, 3);
        const nova = headAt + 250;
        if (age >= headAt && age < nova) d.art.drawFx(ctx, 'rift', 'zod-pearl-1', px, py, {});
        dim(d, age < nova ? clamp01(age / nova) * 0.45 : 0.45 * (1 - clamp01((age - nova) / 900)));
        whiteFlash(d, nova, 160, 0.85);
        for (const [delay, colour, speed] of [
            [0, '#ffffff', 0.32],
            [80, '#ffaad2', 0.26],
            [180, '#ffe6a0', 0.21],
        ])
            ring(d, px, py, nova + delay, { colour, speed, life: 1000, max: 320, squash: 1 });
        rays(d, px, py, nova, {
            count: 18,
            reach: 2.6,
            colours: ['#ffaad2', '#ffffff', '#ffe6a0'],
            life: 900,
        });
        if (age > nova) starBurst(ctx, px, py, age - nova, 28, 0.2, 1100, 7);
    },
    // 11: Ninefold sheds its tails one by one, each in a puff of stars, then dissolves.
    11(d) {
        const { ctx, x, y, age } = d,
            tails = bossParts(d.snap).filter((p) => p.kind === PART.tail),
            s = bossState(d.snap).aux[5] || 1,
            fox = s < 0.9 ? 'ninefold-s' : 'ninefold',
            step = 110;
        tails.forEach((tail, k) => {
            const at = k * step;
            if (age < at) d.art.drawFx(ctx, 'rift', `${fox}-tail-${tail.slot}`, x, y, {});
            else starBurst(ctx, tail.x, tail.y, age - at, 8, 0.08, 500, k);
        });
        const from = tails.length * step,
            p = clamp01((age - from) / 600);
        if (p < 1) dissolved(d, 'rift', `${fox}-1`, x, y, ease(p));
        else if (age < from + 700) body(d, `${fox}-1`, { alpha: 0 });
        if (age > from) starBurst(ctx, x - 20 * s, y, age - from, 20, 0.1, 900, 2);
        const mx = x - 33 * s,
            my = y - 54 * s;
        ring(d, mx, my, from + 200, {
            colour: '#ffaad2',
            speed: 0.2,
            life: 700,
            max: 140,
            squash: 1,
        });
        if (age > from + 200)
            rays(d, mx, my, from + 200, { count: 10, reach: 1.2, colours: VIOLET, life: 600 });
    },
};
