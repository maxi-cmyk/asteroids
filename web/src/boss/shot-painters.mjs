import { pixelGlow as glow } from '../render/fx.mjs';
import { SHOT } from './scene.mjs';
import { band, dottedRing, px } from './draw-kit.mjs';

// One painter per hostile shot family: (ctx, art, shot, time, flicker) where `flicker`
// alternates 0/1 every 110 ms for two-frame sprites.
export const SHOT_PAINTERS = {
    [SHOT.needle]: (ctx, art, s) => art.draw(ctx, 'shots', 'needle', s.x, s.y),
    [SHOT.shard]: (ctx, art, s) => art.draw(ctx, 'shots', 'shard', s.x, s.y),
    [SHOT.fast]: (ctx, art, s) => art.drawRotated(ctx, 'shots', 'fast', s.x, s.y, s.angle),
    [SHOT.bolt](ctx, art, s) {
        art.drawRotated(ctx, 'shots', 'bolt', s.x, s.y, s.angle);
        glow(ctx, s.x, s.y, 8, '255,150,100', 0.35);
    },
    [SHOT.sine]: (ctx, art, s) => art.draw(ctx, 'shots', 'sine', s.x, s.y),
    [SHOT.pellet]: (ctx, art, s) => art.draw(ctx, 'shots', 'pellet', s.x, s.y),
    [SHOT.ember]: (ctx, art, s, time, flicker) =>
        art.draw(ctx, 'shots', `ember-${flicker}`, s.x, s.y),
    [SHOT.curve](ctx, art, s) {
        art.draw(ctx, 'shots', 'curve', s.x, s.y);
        glow(ctx, s.x, s.y, 7, '255,120,230', 0.35);
    },
    [SHOT.missile](ctx, art, s, time, flicker) {
        const tail = 8;
        ctx.fillStyle = flicker ? '#ffcf70' : '#ff8a3a';
        px(ctx, s.x - Math.cos(s.angle) * tail, s.y - Math.sin(s.angle) * tail, 2, 2);
        px(ctx, s.x - Math.cos(s.angle) * (tail + 3), s.y - Math.sin(s.angle) * (tail + 3), 1, 1);
        art.drawRotated(ctx, 'shots', 'missile', s.x, s.y, s.angle);
    },
    [SHOT.mine]: (ctx, art, s, time) =>
        art.draw(
            ctx,
            'shots',
            Math.floor(time / (s.age > 1400 ? 90 : 220)) % 2 ? 'mine-1' : 'mine-0',
            s.x,
            s.y,
        ),
    [SHOT.spore]: (ctx, art, s, time, flicker) =>
        art.draw(ctx, 'shots', `spore-${flicker}`, s.x, s.y, { alpha: 0.92 }),
    // The Zodiarch's coil-spit (P3.5): a glob of fire, a hot core trailing flickering flame;
    // the last 200 ms of its 900 it swells and flashes, then bursts into two embers.
    [SHOT.fireball](ctx, art, s, time, flicker) {
        const back = s.angle + Math.PI;
        for (let k = 1; k <= 4; k++) {
            ctx.globalAlpha = 0.6 - k * 0.12;
            ctx.fillStyle = k % 2 ? '#ff7a20' : '#ffc060';
            ctx.fillRect(
                Math.round(s.x + Math.cos(back) * k * 3 + Math.sin(time / 30 + k)),
                Math.round(s.y + Math.sin(back) * k * 3),
                2,
                2,
            );
        }
        ctx.globalAlpha = 1;
        glow(ctx, s.x, s.y, 12, '255,140,40', 0.5);
        ctx.fillStyle = flicker ? '#ff7a20' : '#ff6010';
        ball(ctx, s.x, s.y, 4);
        ctx.fillStyle = '#fff0b0';
        ball(ctx, s.x - 1, s.y - 1, 1.5);
        if (s.age > 700 && Math.floor(time / 60) % 2) {
            ctx.fillStyle = '#ffffff';
            ball(ctx, s.x, s.y, 2);
        }
    },
    // A nova star (8 sparks: the dragon's or Spica) or one of Aquarius's droplets (6): flies
    // to its spot, then counts down under a closing ring; a droplet fuses, blue to white to gold.
    [SHOT.nova](ctx, art, s, time) {
        if (s.aux <= 6) return droplet(ctx, s, time);
        if (s.age < 500) return star(ctx, s.x, s.y, '#ffe6a0', 2);
        const u = Math.min(1, (s.age - 500) / 1200);
        const pulse = Math.floor(time / (u > 0.7 ? 60 : 140)) % 2;
        glow(ctx, s.x, s.y, 14, '255,230,160', 0.4 + 0.3 * pulse);
        star(ctx, s.x, s.y, pulse ? '#ffffff' : '#ffe6a0', 3);
        dottedRing(ctx, s.x, s.y, 34 * (1 - u) + 6, pulse ? '#ffffff' : '#ff8a6a', 24, time / 300);
    },
    // A sun from Leo's mane: a hot core, four turning rays and a flame tail.
    [SHOT.sun](ctx, art, s, time) {
        for (let f = 1; f <= 6; f++) {
            ctx.globalAlpha = 0.6 - f * 0.09;
            ctx.fillStyle = f < 3 ? '#ffd25a' : '#ff7a30';
            const wob = Math.sin(time / 40 + f) * f * 0.5;
            px(
                ctx,
                s.x - Math.cos(s.angle) * f * 3 - Math.sin(s.angle) * wob - 1,
                s.y - Math.sin(s.angle) * f * 3 + Math.cos(s.angle) * wob - 1,
                3,
                3,
            );
        }
        ctx.globalAlpha = 1;
        glow(ctx, s.x, s.y, 14, '255,190,80', 0.6);
        for (let k = 0; k < 4; k++)
            band(ctx, s.x, s.y, time / 90 + (k * Math.PI) / 2, 7, 1, '#ffb040');
        ctx.fillStyle = '#ff9a30';
        px(ctx, s.x - 3, s.y - 3, 7, 7);
        ctx.fillStyle = '#fff6c0';
        px(ctx, s.x - 2, s.y - 2, 5, 5);
    },
    // A meteor: a dark rock with a burning edge and a long flame trail.
    [SHOT.meteor](ctx, art, s, time, flicker) {
        for (let f = 1; f <= 8; f++) {
            ctx.globalAlpha = 0.7 - f * 0.08;
            ctx.fillStyle = f < 3 ? '#fff0b0' : f < 6 ? '#ff9a40' : '#c04a20';
            px(
                ctx,
                s.x - Math.cos(s.angle) * f * 3 - 1,
                s.y - Math.sin(s.angle) * f * 3 - 1,
                f < 5 ? 3 : 2,
                f < 5 ? 3 : 2,
            );
        }
        ctx.globalAlpha = 1;
        glow(ctx, s.x, s.y, 12, '255,150,60', 0.5);
        ctx.fillStyle = '#3a2418';
        ball(ctx, s.x, s.y, 4);
        ctx.fillStyle = flicker ? '#ffb060' : '#ff8030';
        px(ctx, s.x + Math.cos(s.angle) * 3 - 1, s.y + Math.sin(s.angle) * 3 - 1, 2, 2);
    },
    // Plasma arcs over the floor: a lifted sprite above its landing shadow.
    [SHOT.lob](ctx, art, s) {
        const life = Math.max(1, s.aux),
            lift = Math.sin(Math.min(1, s.age / life) * Math.PI) * 34;
        ctx.fillStyle = '#2a1030';
        px(ctx, s.x - 4, s.y + 1, 9, 2);
        art.draw(ctx, 'shots', 'lob-0', s.x, s.y - lift);
        glow(ctx, s.x, s.y - lift, 11, '255,110,40', 0.4);
    },
};

function ball(ctx, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
        const half = Math.floor(Math.sqrt(r * r - dy * dy + 0.5));
        ctx.fillRect(Math.round(cx) - half, Math.round(cy) + dy, half * 2 + 1, 1);
    }
}
function star(ctx, x, y, colour, size) {
    ctx.fillStyle = '#2a0c24';
    px(ctx, x - size, y - size, size * 2 + 1, size * 2 + 1);
    ctx.fillStyle = colour;
    px(ctx, x - size + 1, y - size + 1, size * 2 - 1, size * 2 - 1);
    ctx.fillStyle = '#ffffff';
    px(ctx, x, y);
}
const mix = (c0, c1, f) => c0.map((v, i) => Math.round(v + (c1[i] - v) * f)).join(',');
// Aquarius's droplet: in flight for 650 ms, then 1.1 s of fusion before it bursts.
function droplet(ctx, s, time) {
    if (s.age < 650) {
        for (let k = 1; k <= 4; k++) {
            ctx.globalAlpha = 0.5 - k * 0.1;
            ctx.fillStyle = '#6ec8ff';
            px(ctx, s.x - Math.cos(s.angle) * k * 2.5, s.y - Math.sin(s.angle) * k * 2.5, 2, 2);
        }
        ctx.globalAlpha = 1;
        return star(ctx, s.x, s.y, '#bfe8ff', 2);
    }
    const fuse = Math.min(1, (s.age - 650) / 1100);
    const col =
        fuse < 0.5
            ? mix([110, 200, 255], [255, 255, 255], fuse * 2)
            : mix([255, 255, 255], [255, 200, 90], fuse * 2 - 1);
    const flick = Math.floor(time / (fuse > 0.7 ? 45 : 110)) % 2;
    glow(ctx, s.x, s.y, 6 + 10 * fuse, col, 0.35 + 0.35 * fuse + 0.15 * flick);
    const orb = 6 * (1 - fuse) + 0.5,
        spin = time / (120 - 80 * fuse) + s.x;
    ctx.fillStyle = `rgb(${col})`;
    for (const side of [0, Math.PI])
        px(ctx, s.x + Math.cos(spin + side) * orb - 1, s.y + Math.sin(spin + side) * orb - 1, 2, 2);
    const r = Math.round(1 + 2 * fuse);
    ctx.fillStyle = flick ? '#ffffff' : `rgb(${col})`;
    px(ctx, s.x - r + 1, s.y - r + 1, r * 2 - 1, r * 2 - 1);
    ctx.globalAlpha = 0.6;
    dottedRing(
        ctx,
        s.x,
        s.y,
        16 * (1 - fuse) + 5,
        fuse > 0.7 && flick ? '#ffffff' : '#ffb070',
        12,
        time / 400,
    );
    ctx.globalAlpha = 1;
}
