// Tile: its four old attacks, each now warned from the eye: light gathers behind the shut
// plates and leaks through their seams, then a flash at the muzzle (nextSteps.md P4.1).
import { dotted, ease, glow, label, note, pilot, shot, span, warnLane } from '../kit.mjs';
import { HOME, sentinel } from './body.mjs';

const P = [96, 150],
    MX = HOME[0] - 82,
    MY = HOME[1];
const EACH = 2000;
export const ATTACKS_MS = EACH * 4;
const NAMES = ['lance', 'fan', 'volley', 'cross'];

export function attacks(ctx, t) {
    const which = Math.floor(t / EACH),
        u = t % EACH;
    let o = { open: 1, mood: 'wide', rim: 1 };
    if (u < 300) o = { open: 1 - ease(u / 300), mood: 'narrow', brow: 1, shiver: 1 };
    else if (u < 1100) o = { open: 0, mood: 'narrow', brow: 1, seam: span(u, 300, 900) };
    else if (u < 1500) {
        const k = ease(span(u, 1100, 1500));
        o = { open: k, mood: k < 0.6 ? 'calm' : 'wide', rim: k };
    }
    sentinel(ctx, ...HOME, { ...o, gaze: P, time: t });
    const aim = Math.atan2(P[1] - MY, P[0] - MX);
    const warn = span(u, 0, 900),
        live = u >= 900 && u < 1240;
    if (u >= 900 && u < 1000) glow(ctx, MX, MY, 16, '255,220,150', 0.9);
    if (which === 0 || which === 3) {
        const lanes = which === 0 ? [P[1]] : [P[1] - 80];
        for (const y of lanes) {
            if (u < 900) warnLane(ctx, HOME[0] - 30, y, Math.PI, 330, warn);
            if (live) {
                ctx.fillStyle = '#ffd890';
                ctx.fillRect(0, y - 4, HOME[0] - 30, 9);
            }
        }
        if (which === 3) {
            const vx = P[0] + 90;
            if (u < 900) warnLane(ctx, vx, 0, Math.PI / 2, 270, warn);
            if (live) {
                ctx.fillStyle = '#ffd890';
                ctx.fillRect(vx - 4, 0, 9, 270);
            }
        }
    }
    if (which === 1) {
        if (u < 900)
            for (let i = -1; i <= 1; i++)
                dotted(ctx, MX, MY, aim + i * 0.28, 190 * warn, '#ffa860', 5);
        for (let i = -1; i <= 1; i++)
            if (u >= 900) {
                const d = 10 + (u - 900) * 0.2;
                shot(
                    ctx,
                    'needle',
                    MX + Math.cos(aim + i * 0.28) * d,
                    MY + Math.sin(aim + i * 0.28) * d,
                    aim + i * 0.28,
                );
            }
    }
    if (which === 2) {
        if (u < 900) dotted(ctx, MX, MY, aim, 160 * warn, '#ffa860', 4);
        for (let k = 0; k < 5; k++) {
            const age = u - (900 + k * 120);
            if (age > 0) {
                const d = 10 + age * 0.18;
                shot(ctx, 'needle', MX + Math.cos(aim) * d, MY + Math.sin(aim) * d, aim);
            }
        }
    }
    if (u < 900) glow(ctx, MX, MY, 4 + 10 * warn, '255,170,90', 0.6 * warn);
    pilot(ctx, ...P);
    label(ctx, NAMES[which], 12, 22);
    note(
        ctx,
        'warned from the eye: light in the seams, a flash at the muzzle; then it opens',
        12,
        258,
    );
}
