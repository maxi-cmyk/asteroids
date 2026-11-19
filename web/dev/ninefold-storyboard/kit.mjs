// The Ninefold storyboard's kit (nextSteps.md P2.1): the draft fox sheet, drawing a pose
// (mirrored, scaled, faded), a little script runner for moves (sit, rise, walk, run, skid,
// crouch, leap, land), star paw prints, and the effects the tiles share.
import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { TAU } from '../../src/boss/draw-kit.mjs';
import { art, clamp01, ease, lerp, px, span } from '../zodiarch-living/kit.mjs';

export const SHEET = 'draft-p21-fox';
await art.load(SHEET);

// A pose at (x, y), the centre of the game's 250 x 196 frame (the ground is 74 px below).
// face -1 looks left (as drawn), 1 looks right (mirrored).
export function fox(ctx, frame, x, y, { face = -1, scale = 1, alpha = 1, decoy = false } = {}) {
    const key =
        decoy && art.cell(SHEET, `fox-decoy-${frame}`) ? `fox-decoy-${frame}` : `fox-${frame}`;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(face > 0 ? -scale : scale, scale);
    art.draw(ctx, SHEET, key, 0, 0, { alpha });
    ctx.restore();
}
// Offsets from the frame centre (facing left) of points the tiles need, per pose.
export const MARK = { sit: [-33, -50], stand: [-56, -26] };
export const flip = (face, [dx, dy]) => [face > 0 ? -dx : dx, dy];

// ---------------------------------------------------------------- moves
// A script is a list of steps { kind, ms, to } run one after another from `at`. Returns
// where the fox is at time t, which frame it shows and which way it faces.
const STEP_MS = { walk: 150, run: 80 };
export function play(script, at, t) {
    let pos = at,
        face = -1,
        clock = 0;
    for (const s of script) {
        const from = pos,
            to = s.to || pos,
            u = clamp01((t - clock) / s.ms);
        if (to[0] !== from[0]) face = to[0] > from[0] ? 1 : -1;
        if (s.face) face = s.face;
        if (t < clock + s.ms || s === script[script.length - 1]) {
            return { ...pose(s, from, to, u, t - clock, face), face, step: s, u };
        }
        pos = to;
        clock += s.ms;
    }
    return { x: pos[0], y: pos[1], frame: 'sit', face };
}
function pose(s, from, to, u, local, face) {
    const k = s.kind;
    if (k === 'walk' || k === 'run') {
        const x = lerp(from[0], to[0], u),
            y = lerp(from[1], to[1], u);
        const n = k === 'walk' ? 4 : 6,
            f = Math.floor(local / STEP_MS[k]) % n;
        const slope = (to[1] - from[1]) / Math.max(1, Math.abs(to[0] - from[0]));
        const tilt =
            k === 'run' && slope < -0.25 ? 'up-' : k === 'run' && slope > 0.25 ? 'down-' : '';
        return { x, y, frame: `${k}-${tilt}${f}` };
    }
    if (k === 'leap') {
        // Up off the perch, gone into stars at the top, back above the next perch, down.
        const lift = 70;
        if (u < 0.45) {
            const v = ease(u / 0.45);
            return {
                x: from[0] - 24 * face * -v,
                y: from[1] - lift * v,
                frame: 'leap',
                alpha: 1 - span(u, 0.33, 0.45),
            };
        }
        if (u < 0.55)
            return {
                x: to[0],
                y: to[1] - lift,
                frame: 'leap',
                alpha: 0,
                stars: [from[0], from[1] - lift, to[0], to[1] - lift, (u - 0.45) / 0.1],
            };
        const v = ease((u - 0.55) / 0.45);
        return {
            x: to[0],
            y: to[1] - lift * (1 - v),
            frame: v < 0.85 ? 'leap' : 'land',
            alpha: span(u, 0.55, 0.67),
        };
    }
    const frames = {
        sit: 'sit',
        rise: 'rise',
        stand: 'stand',
        crouch: 'crouch',
        skid: 'skid',
        land: 'land',
    };
    let frame = s.frame || frames[k] || 'sit';
    // A crouch wiggles its rear; a skid slides on a little past the mark.
    const dx =
        k === 'crouch' ? Math.sin(local / 45) * 1.5 : k === 'skid' ? 8 * face * (1 - ease(u)) : 0;
    return { x: to[0] + dx, y: to[1], frame };
}

// Star paw prints: one per footfall along the moves before `t`, fading over 600 ms.
export function prints(ctx, script, at, t) {
    let clock = 0,
        pos = at;
    for (const s of script) {
        const to = s.to || pos;
        if (s.kind === 'walk' || s.kind === 'run') {
            const step = s.kind === 'walk' ? 150 : 160;
            for (let m = step; m < s.ms; m += step) {
                const age = t - (clock + m);
                if (age < 0 || age > 600) continue;
                const u = m / s.ms,
                    side = (m / step) % 2 ? 3 : -3;
                const x = lerp(pos[0], to[0], u),
                    y = lerp(pos[1], to[1], u) + 72 + side;
                ctx.globalAlpha = 1 - age / 600;
                ctx.fillStyle = '#c8f0ff';
                px(ctx, x, y);
                px(ctx, x - 1, y, 3, 1);
                px(ctx, x, y - 1, 1, 3);
                ctx.globalAlpha = 1;
            }
        }
        pos = to;
        clock += s.ms;
    }
}
// The fox as stars streaming from one point to another (the blink), u 0..1.
export function starStream(ctx, x0, y0, x1, y1, u) {
    for (let k = 0; k < 24; k++) {
        const v = clamp01(u * 1.4 - (k / 24) * 0.4),
            wob = Math.sin(k * 2.3 + u * 6) * 10;
        const x = lerp(x0, x1, ease(v)) + wob,
            y = lerp(y0, y1, ease(v)) - Math.sin(v * Math.PI) * 24 + Math.cos(k) * 8;
        ctx.fillStyle = k % 3 ? '#9ad8ff' : '#ffffff';
        px(ctx, x, y, k % 4 ? 1 : 2, 1);
    }
}
// Stars bursting out (u 0..1) or gathering in (in = true).
export function starBurst(
    ctx,
    x,
    y,
    u,
    { n = 18, reach = 40, colour = '#9ad8ff', inward = false } = {},
) {
    if (u <= 0 || u >= 1) return;
    const r = (inward ? 1 - u : u) * reach;
    ctx.globalAlpha = inward ? u : 1 - u;
    for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + k * 0.37;
        ctx.fillStyle = k % 3 ? colour : '#ffffff';
        px(ctx, x + Math.cos(a) * r * (0.7 + (k % 3) * 0.15), y + Math.sin(a) * r * 0.8, 2, 1);
    }
    ctx.globalAlpha = 1;
}
// The forehead mark open: a pink star with a ring that drains over `left` (1..0).
export function markOpen(ctx, x, y, left, t) {
    glow(ctx, x, y, 12, '255,120,170', 0.6 + 0.2 * Math.sin(t / 60));
    ctx.fillStyle = '#ffffff';
    px(ctx, x - 1, y - 1, 3, 3);
    ctx.strokeStyle = '#ff8ad0';
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), 9, -Math.PI / 2, -Math.PI / 2 + TAU * left);
    ctx.stroke();
}
export function comet(ctx, x, y, a, colour = '#9ad8ff') {
    glow(ctx, x, y, 8, '150,220,255', 0.7);
    for (let k = 0; k < 10; k++) {
        ctx.globalAlpha = 1 - k / 10;
        ctx.fillStyle = k < 2 ? '#ffffff' : colour;
        px(ctx, x - Math.cos(a) * k * 2, y - Math.sin(a) * k * 2, k < 2 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
}
export function wisp(ctx, x, y, t) {
    glow(ctx, x, y, 9, '120,200,255', 0.7);
    ctx.fillStyle = '#e8fbff';
    px(ctx, x - 1, y - 1, 3, 3);
    ctx.fillStyle = '#7ad0ff';
    px(ctx, x + Math.sin(t / 50) * 3, y + 3);
}
export { glow };
