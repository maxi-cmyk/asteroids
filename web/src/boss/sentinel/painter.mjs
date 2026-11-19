// The Sentinel's painter (nextSteps.md P4.1): the shell rolling with its slide, the eye in
// its socket looking at the pilot (narrow for the tell, wide and rim-lit for the window),
// the brows, the plates (apart, shivering, shut with light in their seams), thrown plates
// spinning on their loops with the loops drawn while warned, and the plates shed in phase 3.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { ATTACK, PART } from '../scene.mjs';
import { TAU } from '../draw-kit.mjs';

// Each thrown plate's loop (as in native/boss/fights/sentinel.h SENT_FLIGHT): reach out, swing.
const FLIGHT = [
    [-150, 84, 40, 30],
    [-170, 40, 0, 80],
    [-170, -40, 0, -80],
    [-150, -84, 40, -30],
];
const TELL = 600,
    OUT = 38;
const plateAngle = (k) => ((45 + 90 * k) * Math.PI) / 180;
function loopAt(x, y, k, u) {
    const a = plateAngle(k),
        e = u * u * (3 - 2 * u),
        out = Math.sin(Math.PI * e),
        swing = Math.sin(TAU * e) * 0.6,
        [rx, ry, sx, sy] = FLIGHT[k];
    return [
        x + Math.cos(a) * OUT + rx * out + sx * swing,
        y + Math.sin(a) * OUT + ry * out + sy * swing,
    ];
}
const px = (ctx, x, y, w = 1, h = 1) => ctx.fillRect(Math.round(x), Math.round(y), w, h);

export const sentinel = (b) => {
    const { ctx, art, state, x, y, time, aux, parts, alpha, flash, A } = b;
    const open = aux[A.open],
        shed = aux[A.shed] > 0.5,
        bare = aux[A.bare] > 0.5,
        tell = aux[A.tell] > 0.5,
        busy = aux[A.busy] > 0.5,
        roll = aux[A.roll];
    const plates = parts.filter((p) => p.kind === PART.plate);
    const onBody = new Set(plates.filter((p) => p.state === 0).map((p) => p.slot));
    const throwing = state.attack === ATTACK.plateThrow;
    glow(ctx, x, y, 150, '255,170,90', (0.1 + 0.12 * Math.sin(time / 260)) * (shed ? 1.4 : 1));

    // The eye's mood: the tell narrows it; open (or bare) it is wide; in between, calm.
    let mood = 'wide';
    if (!shed && !(throwing && bare)) {
        if (tell || (busy && open < 0.2)) mood = 'narrow';
        else if (open < 0.9) mood = 'calm';
    }
    const rim = bare && mood === 'wide' ? 1 : 0;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(roll);
    const draw = (key, dx = 0, dy = 0, extra = {}) =>
        art.draw(ctx, 'frontier', key, Math.round(dx), Math.round(dy), { alpha, flash, ...extra });
    draw('sentinel-shell');
    // The eye rolls toward the pilot, up to 10 px inside its socket.
    const gx = aux[A.gazeX] - x,
        gy = aux[A.gazeY] - y,
        d = Math.hypot(gx, gy) || 1,
        reach = Math.min(10, d / 14);
    const c = Math.cos(-roll),
        s = Math.sin(-roll);
    const ex = ((gx * c - gy * s) / d) * reach,
        ey = ((gx * s + gy * c) / d) * reach;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, TAU);
    ctx.clip();
    draw(`sentinel-eye-${mood}`, ex, ey);
    ctx.restore();
    if (rim) {
        glow(ctx, ex, ey, 52, '255,200,120', 0.35 + 0.1 * Math.sin(time / 130));
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 64; i++) {
            const a = (i / 64) * TAU;
            ctx.fillStyle = (i + Math.floor(time / 90)) % 8 < 2 ? '#ffffff' : '#ffc070';
            px(ctx, ex + Math.cos(a) * 34 - 1, ey + Math.sin(a) * 34 - 1, 2, 2);
        }
        ctx.globalAlpha = 1;
    }
    draw('sentinel-brows', 0, tell || busy ? 3 : 0);
    const seam = aux[A.seam];
    if (seam > 0) glow(ctx, 0, 0, 20 + 30 * seam, '255,170,90', 0.6 * seam);
    for (let k = 0; k < 4; k++) {
        if (
            !onBody.has(k) &&
            !(throwing && state.attackMs < TELL && plates.some((p) => p.slot === k))
        )
            continue;
        const jig = tell ? Math.sin(time / 23 + k * 2.1) * 1.5 : 0,
            r = open * 36 + jig;
        draw(`sentinel-plate-${k}`, Math.cos(plateAngle(k)) * r, Math.sin(plateAngle(k)) * r);
    }
    if (seam > 0 && open < 0.3) {
        ctx.globalAlpha = seam * alpha;
        for (let dd = -66; dd <= 66; dd++) {
            ctx.fillStyle = Math.abs(dd) < 24 ? '#ffffff' : '#ffc070';
            px(ctx, dd, -1, 1, 3);
            px(ctx, -1, dd, 3, 1);
        }
        ctx.globalAlpha = 1;
    }
    ctx.restore();
    b.overlay('sentinel');

    // Plates warned (glowing, their loops drawn), thrown (spinning) or shed (tumbling away).
    for (const p of plates) {
        if (p.state === 1) {
            const u = Math.min(1, state.attackMs / TELL);
            glow(ctx, p.x, p.y, 22, '255,170,90', 0.5 * u);
            // The loop it will fly, drawn out as the tell runs: bold dots, dark-edged so
            // they read on any sky, flashing white as it is about to go.
            const hot = Math.floor(time / 110) % 2 && u > 0.7 ? '#ffffff' : '#ffb070';
            for (let i = 0; i <= 90 * u; i += 3) {
                const [lx, ly] = loopAt(x, y, p.slot, i / 90);
                ctx.fillStyle = '#1a0c2a';
                px(ctx, lx - 1, ly - 1, 4, 4);
                ctx.fillStyle = hot;
                px(ctx, lx, ly, 2, 2);
            }
        } else if (p.state === 2 || p.state === 3) {
            const spin = Math.floor(time / 45 + p.slot * 2) % 8;
            art.draw(ctx, 'frontier', `sentinel-spin-${spin}`, Math.round(p.x), Math.round(p.y), {
                alpha: p.state === 3 ? alpha * 0.85 : alpha,
            });
        }
    }
};
