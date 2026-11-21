// Shared set-up for the boss tests (split from tests/boss.test.mjs, nextSteps.md R7 M2): the
// test engine, fresh games in a wave, practice or a given phase, ticking, the boss's stats and
// contact circles, aiming and shooting, and the few helpers several bosses' tests share.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { S } from '../../src/runtime/scene-layout.mjs';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import {
    ATTACK,
    HAZARD,
    KINDS,
    NINEFOLD,
    PART,
    SHOT,
    SIGN_EMIT,
    SIGN_KEY,
    bossBody,
    bossHazards,
    bossParts,
    bossPart,
    bossShots,
    bossState,
} from '../../src/boss/scene.mjs';
export { S, createRuntime };
export { BossBot } from '../boss-bot.mjs';
export { FOX_POSES, FOX_POSE } from '../../src/boss/ninefold/poses.mjs';
export {
    ATTACK,
    HAZARD,
    KINDS,
    NINEFOLD,
    PART,
    SHOT,
    SIGN_EMIT,
    SIGN_KEY,
    bossBody,
    bossHazards,
    bossParts,
    bossPart,
    bossShots,
    bossState,
};

export const bytes = await readFile(new URL('../../dist/test.wasm', import.meta.url));
export const set = (game, field, value) => game.api.web_test_boss_set(field, value);
export const K = [3, 6, 2, 5, 5, 2, 5, 8, 5, 8, 8, 6]; // sub-hits per design hit, mirrors BOSS_K
export const ENTRANCE = 75; // ticks: 1.4 s plus a margin
export async function newGame(seed = 7) {
    let state = seed;
    return createRuntime(bytes, {
        random: () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0),
    });
}
// A scored wave fight in a clean room (rocks cleared, ship centred left).
export async function waveGame(wave, players = 1, health = 0, seed = 7) {
    const game = await newGame(seed);
    game.start();
    game.api.web_scenario(0);
    game.api.web_test_boss(wave, players, health);
    set(game, 5, 1e6); // tests that need hits clear this
    return game;
}
export async function practiceGame(kind, tier = 0, seed = 7) {
    const game = await newGame(seed);
    game.start(true);
    game.api.web_boss_practice(kind, tier, 0);
    return game;
}
export const ticks = (game, count, input = {}) => {
    for (let i = 0; i < count; i++) game.step(input);
};
export const until = (game, test, limit = 2000, input = () => ({})) => {
    for (let i = 0; i < limit; i++) {
        if (test(bossState(game.scene()), game.scene())) return i;
        game.step(input());
    }
    throw new Error('condition not reached');
};
export const stats = (game) => {
    const v = new Float32Array(game.api.memory.buffer, game.api.web_test_boss_stats(), 16);
    return {
        violations: v[0],
        maxShots: v[1],
        maxHazards: v[2],
        entranceHits: v[3],
        corridor: v[4],
        hitsTaken: v[5],
        health: v[6],
        phase: v[7],
        mask: v[8],
        kind: v[9],
        lifeLost: v[10],
        maximum: v[11],
        repels: v[12],
    };
};
export const body = (game) => {
    const v = new Float32Array(game.api.memory.buffer, game.api.web_test_boss_body(), 121);
    return Array.from({ length: v[0] }, (_, i) => ({
        x: v[1 + i * 3],
        y: v[2 + i * 3],
        r: v[3 + i * 3],
    }));
};
// Aim from a spot level with the target and fire single shots into it.
export function shoot(game, target, count, { from = 80 } = {}) {
    set(game, 3, Math.max(20, target.x - from));
    set(game, 4, target.y);
    let fired = 0;
    for (let i = 0; i < count * 3 && fired < count; i++) {
        const s = game.scene();
        // Bosses move between attacks: aim at where the part is now, not where it was.
        const live =
            target.index !== undefined && target.family === undefined
                ? bossPart(s, target.index)
                : null;
        const tx = live?.exists ? live.x : target.x,
            ty = live?.exists ? live.y : target.y;
        const dx = tx - s[4],
            dy = ty - s[5],
            len = Math.hypot(dx, dy) || 1;
        const press = i % 3 === 0;
        if (press) fired++;
        game.step({
            aimX: dx / len,
            aimY: dy / len,
            firePressed: press,
            fire: press,
            x: 2048,
            y: 2048,
        });
    }
    ticks(game, 6); // the last shot's flight; targets may be moving
}
export const HEALTH = 3; // PICKUP_HEALTH
// Takes the boss down in one blow and returns the pickup it left, if any.
export function defeat(game) {
    ticks(game, ENTRANCE);
    set(game, 0, 0);
    ticks(game, 2);
    assert.equal(bossState(game.scene()).active, false);
    const scene = game.scene();
    return scene[S.PICKUP_ACTIVE]
        ? { kind: scene[S.PICKUP_KIND], x: scene[S.PICKUP_X], y: scene[S.PICKUP_Y] }
        : null;
}

// Shield spawn times (seconds into the fight) over `seconds` of an untouched fight.
export function shieldDrops(game, seconds) {
    const times = [];
    let was = false;
    const start = game.scene()[S.GAME_MS];
    for (let i = 0; i < seconds * 50; i++) {
        game.step({});
        const scene = game.scene();
        const fresh = scene[S.PICKUP_ACTIVE] && scene[S.PICKUP_X] > 440;
        if (fresh && !was) times.push((scene[S.GAME_MS] - start) / 1000);
        was = fresh;
    }
    return times;
}
// A practice fight that starts in `phase`, with the pilot untouchable.
export async function phaseGame(kind, phase, seed = 7) {
    const game = await newGame(seed);
    game.start(true);
    game.api.web_boss_practice(kind, 0, phase);
    set(game, 5, 1e6);
    return game;
}
export const ENTRANCE_TICKS = ENTRANCE;
export const angleError = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export const signParts = (game) => bossParts(game.scene()).filter((p) => p.kind === PART.sign);
// Start attack `id` now, with no creatures or threats left over from the practice fight.
export async function zodAttack(id, phase = 2, seed = 5) {
    const game = await phaseGame(5, phase, seed);
    ticks(game, ENTRANCE);
    set(game, 8, 0);
    set(game, 2, 0);
    set(game, 10, id);
    return game;
}
export const ZM = { face: 7, hold: 8, coil: 9, lunge: 10 };
export const bend = (a, b, c) => {
    const u = Math.atan2(b.y - a.y, b.x - a.x),
        v = Math.atan2(c.y - b.y, c.x - b.x);
    return angleError(u, v);
};
export const tails = (game) => bossParts(game.scene()).filter((p) => p.kind === PART.tail);
export const PERCH_X = [300, 320, 340],
    PERCH_Y = [92, 140, 188];
