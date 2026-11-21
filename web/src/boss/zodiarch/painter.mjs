// The Zodiarch's body painter (nextSteps.md P3): the ring behind, the body along its trail,
// the turned head, the pearl (resting in the forehead, or surfaced on the body section an
// attack comes from) with its tell and timer, the call beams that bring a sign down, every
// creature it has thrown and the firing effects.
import { pixelGlow as glow } from '../../render/fx.mjs';
import { ATTACK, ZOD_HEAD, bossHazards, bossShots, zodLocal } from '../scene.mjs';
import { drawRing, ringPoint } from './ring.mjs';
import { creatures, drawCreature, partners } from './creatures.mjs';
import {
    drawDragonBody,
    drawDragonHead,
    drawPathDots,
    drawPearl,
    drawWhiskers,
} from './dragon.mjs';
import { drawZodiacFx } from './fx.mjs';

const PINK = '#ff8ad0';
let lastHealth = null,
    hurtAt = -1e9;

// A summon's call: a beam of starlight from its eye to the sign on the ring, while the sign
// wakes (the first 30% of the creature's 900 ms).
function callBeam(ctx, eye, ring, u, time) {
    const a = Math.min(1, u / 0.08) * (1 - Math.max(0, (u - 0.24) / 0.06));
    if (a <= 0) return;
    const len = Math.hypot(ring[0] - eye[0], ring[1] - eye[1]),
        dx = (ring[0] - eye[0]) / len,
        dy = (ring[1] - eye[1]) / len;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff2c8';
    for (let d = 0; d < len; d += 3)
        ctx.fillRect(Math.round(eye[0] + dx * d), Math.round(eye[1] + dy * d), 1, 1);
    const p = ((time / 300) % 1) * len;
    glow(ctx, eye[0] + dx * p, eye[1] + dy * p, 6, '255,240,200', 0.8 * a);
    ctx.restore();
}

export const warden = (b) => {
    const { ctx, art, scene, x, y, time, aux, parts, alpha, flash, state, A } = b;
    const clock = aux[A.clock],
        heading = aux[A.heading],
        pearl = aux[A.pearl],
        open = aux[A.coreOpen] > 0.5;
    drawRing(ctx, clock, aux[A.out], time, alpha);
    const ms = state.attackMs;
    const charging = state.attack === ATTACK.coilSpit && ms >= 1400 && ms < 2300;
    const body = drawDragonBody(ctx, art, scene, {
        alpha,
        flash,
        damage: state.damage,
        time,
        rim: open ? PINK : null,
        pulse: charging ? (ms - 1400) / 900 : -1,
        speed: aux[A.speed],
    });
    const jaw = zodLocal(x, y, heading, ZOD_HEAD.jaw),
        eye = zodLocal(x, y, heading, ZOD_HEAD.eye);
    // The head's path ahead, starting from the snout, under the head.
    const tip = zodLocal(x, y, heading, [-80, 0]),
        th = aux[A.pathHeading];
    drawPathDots(
        ctx,
        tip,
        heading,
        aux[A.pathX] < 0
            ? null
            : [aux[A.pathX] + Math.cos(th) * 80, aux[A.pathY] + Math.sin(th) * 80],
        th,
        time,
        alpha,
    );
    // The throat swells with fire through the coil-spit's charge and spit; the breath glows.
    if (state.attack === ATTACK.coilSpit && ms >= 1400 && ms < 2700)
        glow(ctx, jaw[0], jaw[1], 14 + 18 * Math.min(1, (ms - 1400) / 900), '255,150,60', 0.7);
    drawDragonHead(ctx, art, x, y, heading, {
        mouth: aux[A.mouth] > 0.5,
        alpha,
        flash,
        damage: state.damage,
        rim: open ? PINK : null,
    });
    drawWhiskers(ctx, x, y, (p) => zodLocal(x, y, heading, p), time, alpha);
    if (aux[A.breath] > 0.5)
        glow(ctx, jaw[0], jaw[1], 26, '255,210,140', 0.5 + 0.2 * Math.sin(time / 60));
    const px = aux[A.pearlX],
        py = aux[A.pearlY],
        section = Math.round(aux[A.section]);
    // Throwing the black hole, the pearl glows violet.
    if (state.attack === ATTACK.blackHole && ms < 900)
        glow(ctx, px, py, 10 + 14 * (ms / 900), '150,100,240', 0.7);
    if (section >= 0 && section < body.length) {
        // Surfaced on the body: the brow lies shut, and the pearl turns with its segment.
        const brow = zodLocal(x, y, heading, ZOD_HEAD.brow);
        drawPearl(ctx, brow[0], brow[1], heading, 0, time, alpha, false);
        // The engine slides it toward the head while its section is off the screen: turn it
        // with the segment it is actually on.
        let k = 0;
        body.forEach((s, i) => {
            if (Math.hypot(s.x - px, s.y - py) < Math.hypot(body[k].x - px, body[k].y - py)) k = i;
        });
        const a = body[Math.max(0, k - 1)],
            b = body[Math.min(body.length - 1, k + 1)];
        if (pearl !== 0)
            drawPearl(ctx, px, py, Math.atan2(a.y - b.y, a.x - b.x), pearl, time, alpha);
    } else {
        drawPearl(ctx, px, py, heading, pearl, time, alpha);
    }
    // A hit on the open pearl: a pink burst.
    if (lastHealth !== null && state.health < lastHealth && open) hurtAt = time;
    lastHealth = state.health;
    const since = (time - hurtAt) / 300;
    if (since >= 0 && since < 1) {
        glow(ctx, px, py, 10 + 14 * since, '255,138,208', 0.8 * (1 - since));
        ctx.globalAlpha = 1 - since;
        for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            ctx.fillStyle = k % 2 ? '#ffffff' : PINK;
            ctx.fillRect(
                Math.round(px + Math.cos(a) * 12 * since),
                Math.round(py + Math.sin(a) * 12 * since),
                2,
                1,
            );
        }
        ctx.globalAlpha = 1;
    }
    const thrown = creatures(parts),
        second = partners(thrown);
    for (const part of thrown)
        if (part.state === 0 && part.r < 0.3)
            callBeam(ctx, eye, ringPoint(part.slot, clock), part.r, time);
    thrown.forEach((part, i) => drawCreature(ctx, art, part, clock, time, alpha, second[i]));
    drawZodiacFx(ctx, {
        hazards: bossHazards(scene),
        shots: bossShots(scene),
        creatures: thrown,
        time,
    });
};
