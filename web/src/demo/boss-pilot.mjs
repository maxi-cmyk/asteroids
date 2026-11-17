import { S } from '../runtime/scene-layout.mjs';
// The steering and target choice of a scripted boss pilot. It reads the same scene the renderer
// reads, picks the sub-target a person would, and keeps clear of every shot, lethal hazard and
// body. The boss tests use it to prove each fight is beatable, and the Home demo flies with it.
import {
    BOSS_AT,
    HAZARD,
    PART,
    SHOT,
    SIGN_KEY,
    NINEFOLD,
    bossHazards,
    bossParts,
    bossPart,
    bossShots,
    bossState,
} from '../boss/scene.mjs';

const SPEED = 3.65625,
    SHIP = 7;
const wrap = (a) => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
};
const SHOT_R = [2, 3, 3, 4, 2.5, 4, 5, 5, 18, 2, 2.5, 3, 6, 3.5, 3.5, 4];

export function hazardHits(h, px, py, r = SHIP) {
    const dx = px - h.x,
        dy = py - h.y;
    switch (h.kind) {
        case HAZARD.beam:
        case HAZARD.arm:
            // A sweeping beam or arm: a person keeps out of the whole wedge it will sweep
            // (c to e), not just where it points now.
            if (h.e !== h.c && h.e !== 0) {
                const dist = Math.hypot(dx, dy),
                    len = h.kind === HAZARD.beam ? 520 : h.b;
                if (dist > len + r) return false;
                const lo = Math.min(h.c, h.e),
                    hi = Math.max(h.c, h.e),
                    pad = Math.atan2(r + 5, Math.max(1, dist));
                const ang = h.c + wrap(Math.atan2(dy, dx) - h.c);
                if (ang >= lo - pad && ang <= hi + pad) return true;
            }
        // falls through: the line it points along now
        case HAZARD.lane: {
            const ca = Math.cos(h.a),
                sa = Math.sin(h.a),
                along = dx * ca + dy * sa,
                across = -dx * sa + dy * ca;
            const len = h.kind === HAZARD.beam ? 520 : h.b;
            const half = h.kind === HAZARD.lane ? h.c : h.kind === HAZARD.beam ? 5 : 5 + r * 0.3;
            return along >= 0 && along <= len && Math.abs(across) < half + r;
        }
        case HAZARD.pool:
            return dx * dx + dy * dy < (h.c + r) ** 2;
        case HAZARD.burn:
            return dx * dx + dy * dy < (h.c + r * 0.6) ** 2;
        case HAZARD.ring: {
            const dist = Math.hypot(dx, dy);
            if (Math.abs(dist - h.b) >= 4 + r * 0.6) return false;
            return Math.abs(wrap(Math.atan2(dy, dx) - h.a)) >= h.c;
        }
        default:
            return false;
    }
}
// Scorched ground burns like a lethal hazard once it is down (before that it is only a mark).
const lethal = (h) => h.kind <= HAZARD.arm || (h.kind === HAZARD.burn && h.warn === 0);

export class BossPilot {
    // `extraDanger(px, py, ahead)` adds a cost for anything else to avoid (the demo adds rocks).
    constructor(game, { margin = 12, extraDanger = null } = {}) {
        this.game = game;
        this.margin = margin;
        this.extraDanger = extraDanger;
        this.last = null;
    }
    body() {
        const v = new Float32Array(this.game.api.memory.buffer, this.game.api.web_boss_body(), 97);
        return Array.from({ length: v[0] }, (_, i) => ({
            x: v[1 + i * 3],
            y: v[2 + i * 3],
            r: v[3 + i * 3],
        }));
    }
    // The point a player would shoot at, or null to hold fire.
    target(scene, boss, parts) {
        const { x, y, aux } = boss,
            ship = { x: scene[S.SHIP_X], y: scene[S.SHIP_Y] };
        const nearest = (list) =>
            list.sort(
                (a, b) =>
                    Math.hypot(a.x - ship.x, a.y - ship.y) - Math.hypot(b.x - ship.x, b.y - ship.y),
            )[0];
        switch (boss.kind) {
            case 0:
                return aux[0] > 0.5 ? { x, y } : null;
            case 6:
                return aux[0] > 0.5 ? { x, y } : null;
            case 1:
                return { x, y };
            case 7:
                return { x, y };
            case 2: {
                const panels = Array.from({ length: 8 }, (_, i) => bossPart(scene, i)).filter(
                    (p) => p.exists,
                );
                const windows = panels.filter((p) => p.state >= 1);
                const pick = windows.length
                    ? nearest(windows)
                    : nearest(panels.filter((p) => p.state === 0));
                return scene[BOSS_AT + 16 + 1] ? { x, y } : pick || { x, y };
            }
            case 8:
                return aux[1] > 0.5 ? { x, y } : null;
            case 3: {
                const hard = parts
                    .filter((p) => p.kind === PART.hard)
                    .sort((a, b) => a.slot - b.slot)[0];
                return hard || { x: x + 114, y: y + 2 };
            }
            case 9:
                return { x: x + 68, y };
            case 4: {
                const bubbles = parts.filter((p) => p.kind === PART.bubble);
                return bubbles.length ? nearest(bubbles) : { x, y: y - 37 };
            }
            case 10:
                return { x, y: y - 25 };
            case 5: {
                // The Zodiarch: break a creature by its key star; otherwise the pearl when open.
                const keys = parts
                    .filter((p) => p.kind === PART.sign && p.state === 1 && p.x < 470 && p.y < 262)
                    .map((p) => ({ x: p.x + SIGN_KEY[p.slot][0], y: p.y + SIGN_KEY[p.slot][1] }));
                if (keys.length) return nearest(keys);
                return aux[1] > 0.5 ? { x: aux[4], y: aux[5] } : null;
            }
            case 11: {
                // Ninefold: pop the illusions, hit the forehead when it opens, else the tails.
                if (aux[1] > 0.5) return null;
                const decoys = parts.filter((p) => p.kind === PART.decoy);
                if (decoys.length)
                    return nearest(
                        decoys.map((p) => ({
                            x: p.x + NINEFOLD.body[0] * NINEFOLD.illusionScale,
                            y: p.y + NINEFOLD.body[1] * NINEFOLD.illusionScale,
                        })),
                    );
                const s = aux[5] || 1,
                    mark = { x: x + NINEFOLD.mark[0] * s, y: y + NINEFOLD.mark[1] * s };
                if (aux[2] > 0.5) return mark;
                const tails = parts.filter((p) => p.kind === PART.tail);
                return tails.length ? nearest(tails) : mark;
            }
            default:
                return { x, y };
        }
    }
    // Danger of standing at (px, py) `ahead` ticks from now.
    danger(px, py, scene, boss, shots, hazards, body, ahead) {
        let cost = 0;
        if (px < 16 || px > 464 || py < 16 || py > 248) cost += 1e4;
        // Level with or behind a boss is where the repel ring goes (native/boss/motion.h):
        // a sensible pilot stays in front.
        if (boss && px > boss.x - 40) cost += 300;
        for (const s of shots) {
            const reach = SHOT_R[s.family] + SHIP + this.margin;
            const sx = s.x + Math.cos(s.angle) * speedOf(s) * ahead,
                sy = s.y + Math.sin(s.angle) * speedOf(s) * ahead;
            const d = Math.hypot(sx - px, sy - py);
            if (s.family === SHOT.lob) continue;
            if (d < reach) cost += (400 * (reach - d)) / reach + 80;
        }
        for (const h of hazards) {
            if (!lethal(h)) continue;
            const soon = h.warn > 0 ? h.warn < 700 + 20 * ahead : true;
            if (!soon) continue;
            for (const grow of [0, 7])
                if (hazardHits(h, px, py, SHIP + this.margin * 0.5 + grow)) {
                    cost += 600 + (grow ? 0 : 400);
                    break;
                }
        }
        for (const c of body) {
            const d = Math.hypot(c.x - px, c.y - py),
                reach = c.r + SHIP + this.margin;
            if (d < reach) cost += (1000 * (reach - d)) / reach + 200;
        }
        return cost + (this.extraDanger ? this.extraDanger(px, py, ahead) : 0);
    }
    // The one-tick move (dx, dy each -1..0..1) with the least danger over the next 22 ticks.
    // `home` is where to drift when nothing threatens.
    steer(scene, { shots, hazards, body }, home) {
        const boss = scene[S.BOSS_ACTIVE] ? { x: scene[S.BOSS_X], y: scene[S.BOSS_Y] } : null;
        const sx = scene[S.SHIP_X],
            sy = scene[S.SHIP_Y];
        const here = this.danger(sx, sy, scene, boss, shots, hazards, body, 0);
        // A sweeping wedge can take more than 22 ticks to leave from a corner: look further.
        const wedge = hazards.some((h) => (h.kind === HAZARD.beam || h.kind === HAZARD.arm) && h.e !== h.c && h.e !== 0);
        const horizon = wedge ? [1, 3, 6, 10, 15, 22, 30, 40] : [1, 3, 6, 10, 15, 22];
        let best = null;
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                const len = Math.hypot(dx, dy) || 1,
                    mx = (dx / len) * SPEED,
                    my = (dy / len) * SPEED;
                let cost = 0;
                for (const ahead of horizon) {
                    const px = sx + mx * ahead,
                        py = sy + my * ahead;
                    cost += this.danger(
                        Math.max(16, Math.min(464, px)),
                        Math.max(16, Math.min(248, py)),
                        scene,
                        boss,
                        shots,
                        hazards,
                        body,
                        ahead,
                    );
                }
                const nx = sx + mx,
                    ny = sy + my;
                // Drift home only when nothing threatens; keep going the way we were going.
                if (!here)
                    cost +=
                        Math.hypot(nx - home.x, (ny - home.y) * 0.35) * 0.35 + (dx || dy ? 0.2 : 0);
                if (this.last && this.last.dx === dx && this.last.dy === dy) cost -= 3;
                if (!best || cost < best.cost) best = { cost, dx, dy };
            }
        this.last = best;
        return best;
    }
}
function speedOf(s) {
    switch (s.family) {
        case SHOT.needle:
            return 2.2;
        case SHOT.shard:
            return 1.6;
        case SHOT.fast:
            return 2.6;
        case SHOT.bolt:
            return 3;
        case SHOT.sine:
            return 1.8;
        case SHOT.pellet:
            return 1.7;
        case SHOT.missile:
            return 1.4;
        case SHOT.mine:
            return 0.8;
        case SHOT.spore:
            return 1;
        case SHOT.ember:
            return 2.4;
        case SHOT.curve:
            return 2;
        case SHOT.fireball:
            return 1.1;
        case SHOT.sun:
            return 1.7;
        case SHOT.meteor:
            return 1.9;
        default:
            return 0;
    }
}
