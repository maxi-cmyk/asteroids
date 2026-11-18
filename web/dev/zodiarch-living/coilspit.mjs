// Tile: the coil-spit.

import { pixelGlow as glow } from '../../src/render/fx.mjs';
import { drawRing } from '../../src/boss/zodiarch/ring.mjs';
import { TAU } from '../../src/boss/draw-kit.mjs';
import { lerp, span, px, clamp01, SEGS, bump, warnLane, burst, pilot, label } from './kit.mjs';
import { simulate, bodyOf, headOf, drawDragon, local, JAW } from './body.mjs';

// 5. Coil-spit.
const CS = { coil: 600, charge: 1500, spit: 2400, uncoil: 3000 };
const COIL_C = [372, 140];
// It winds in: the goal runs round a circle that shrinks from 62 to 36 px, a little ahead of
// the head, then it brakes hard facing you.
const COIL = simulate(
    { x: 450, y: 110, heading: Math.PI, v: 0.1 },
    [
        { until: CS.coil, goal: [400, 96], speed: 0.14, turn: 2.4, label: '' },
        {
            until: 1500,
            goal: (t, st) => {
                const r = lerp(62, 38, span(t, CS.coil, 1500)),
                    a = Math.atan2(st.by - COIL_C[1], st.bx - COIL_C[0]) - 0.8;
                return [COIL_C[0] + r * Math.cos(a), COIL_C[1] + r * Math.sin(a)];
            },
            speed: 0.3,
            turn: 9,
            wave: 1.5,
            ease: 0.12,
            label: '',
        },
        { until: 1850, goal: [60, 150], speed: 0.12, turn: 5, wave: 0, ease: 0.15, label: '' },
        {
            until: CS.uncoil + 200,
            goal: [60, 150],
            speed: 0,
            turn: 5,
            wave: 0,
            ease: 0.25,
            label: '',
        },
        { until: 5600, goal: [330, 40], speed: 0.1, turn: 2.2, label: '' },
    ],
    5600,
);
const AIM = [-0.3, 0, 0.3];
function glob(ctx, x, y, a, t) {
    for (let k = 1; k <= 4; k++) {
        ctx.globalAlpha = 0.6 - k * 0.12;
        ctx.fillStyle = k % 2 ? '#ff7a20' : '#ffc060';
        px(ctx, x - Math.cos(a) * k * 3 + Math.sin(t / 30 + k), y - Math.sin(a) * k * 3, 2, 2);
    }
    ctx.globalAlpha = 1;
    glow(ctx, x, y, 12, '255,140,40', 0.5);
    ctx.fillStyle = '#ff6a20';
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff0b0';
    px(ctx, x - 1, y - 1, 2, 2);
}
let coilAim = null;
export function coilspit(ctx, t) {
    const f = COIL.frame(t),
        path = (s) => COIL.trail.at(s);
    drawRing(ctx, t / 1000, 0, t);
    const still = clamp01(1 - f.v / 0.03);
    const segs = bodyOf(path, f.h, { t, still: still * 0.6 });
    const head = headOf(path, f.h, [90, 150], t > 1700 && t < CS.uncoil ? 1 : 0.4);
    const shake = t > 1700 && t < CS.spit ? Math.round(Math.sin(t / 25)) : 0;
    head.x += shake;
    const u = span(t, CS.charge, CS.spit);
    const pulse = t > CS.charge && t < CS.spit ? (SEGS - 1) * (1 - u) : -1;
    const push = 20 * bump(t, CS.spit, CS.spit + 500) * (t < CS.spit + 250 ? 1 : 1);
    drawDragon(ctx, segs, head, {
        t,
        pulse,
        throat: u * (t < CS.spit + 300 ? 1 : 0),
        mouth: t > CS.charge && t < CS.spit + 500,
        push,
    });
    const jaw = local(head, JAW[0], JAW[1]);
    if (t < 1850 || !coilAim) coilAim = Math.atan2(150 - jaw[1], 90 - jaw[0]);
    for (const da of AIM)
        warnLane(ctx, jaw[0], jaw[1], coilAim + da, 230, span(t, CS.charge, CS.spit));
    // Spit: four globs down each aim, 90 ms apart; each bursts into two embers.
    for (const da of AIM)
        for (let j = 0; j < 4; j++) {
            const born = CS.spit + j * 90,
                age = t - born,
                a = coilAim + da;
            if (age < 0) continue;
            const life = 1000,
                d = Math.min(age, life) * 0.22;
            const [gx, gy] = [jaw[0] + Math.cos(a) * d, jaw[1] + Math.sin(a) * d];
            if (age < life) glob(ctx, gx, gy, a, t);
            else if (age < life + 600) {
                burst(ctx, gx, gy, (age - life) / 250, '#ffb050', 6, 8);
                for (const e of [-0.5, 0.5]) {
                    const ed = (age - life) * 0.15;
                    ctx.fillStyle = '#ffc060';
                    px(ctx, gx + Math.cos(a + e) * ed, gy + Math.sin(a + e) * ed, 2, 2);
                }
            }
        }
    // Smoke from the jaw as it uncoils.
    for (let k = 0; k < 5; k++) {
        const age = t - (CS.spit + 400 + k * 140);
        if (age < 0 || age > 900) continue;
        ctx.globalAlpha = 0.4 * (1 - age / 900);
        ctx.fillStyle = '#8a7a90';
        const r = 2 + age / 200;
        ctx.beginPath();
        ctx.arc(jaw[0] - 6 + k * 3, jaw[1] - age / 30, r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    pilot(ctx, 90, 150 + Math.sin(t / 500) * 3 + (t > 2800 ? 30 * span(t, 2800, 3100) : 0));
    label(
        ctx,
        t < CS.coil
            ? ''
            : t < CS.charge
              ? 'Coil: it winds into a spiral'
              : t < CS.spit
                ? 'Charge: fire climbs the body, aims warned'
                : t < CS.uncoil
                  ? 'Spit: the coil springs, three streams'
                  : 'Uncoil, smoke from the jaw',
    );
}
