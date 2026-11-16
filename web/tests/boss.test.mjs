import { S } from '../src/runtime/scene-layout.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { BossBot } from './boss-bot.mjs';
import {
    ATTACK,
    HAZARD,
    KINDS,
    NINEFOLD,
    PART,
    SHOT,
    SIGN_KEY,
    bossBody,
    bossHazards,
    bossParts,
    bossPart,
    bossShots,
    bossState,
} from '../src/boss/scene.mjs';
const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
const set = (game, field, value) => game.api.web_test_boss_set(field, value);
const K = [3, 6, 7, 5, 5, 4, 5, 8, 5, 8, 8, 6]; // sub-hits per design hit, mirrors BOSS_K
const ENTRANCE = 75; // ticks: 1.4 s plus a margin
async function newGame(seed = 7) {
    let state = seed;
    return createRuntime(bytes, {
        random: () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0),
    });
}
// A scored wave fight in a clean room (rocks cleared, ship centred left).
async function waveGame(wave, players = 1, health = 0, seed = 7) {
    const game = await newGame(seed);
    game.start();
    game.api.web_scenario(0);
    game.api.web_test_boss(wave, players, health);
    set(game, 5, 1e6); // tests that need hits clear this
    return game;
}
async function practiceGame(kind, tier = 0, seed = 7) {
    const game = await newGame(seed);
    game.start(true);
    game.api.web_boss_practice(kind, tier, 0);
    return game;
}
const ticks = (game, count, input = {}) => {
    for (let i = 0; i < count; i++) game.step(input);
};
const until = (game, test, limit = 2000, input = () => ({})) => {
    for (let i = 0; i < limit; i++) {
        if (test(bossState(game.scene()), game.scene())) return i;
        game.step(input());
    }
    throw new Error('condition not reached');
};
const stats = (game) => {
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
const body = (game) => {
    const v = new Float32Array(game.api.memory.buffer, game.api.web_test_boss_body(), 97);
    return Array.from({ length: v[0] }, (_, i) => ({
        x: v[1 + i * 3],
        y: v[2 + i * 3],
        r: v[3 + i * 3],
    }));
};
// Aim from a spot level with the target and fire single shots into it.
function shoot(game, target, count, { from = 80 } = {}) {
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

test('every wave fight maps to its boss, its health and its tier', async () => {
    const base = (wave) => 18 + 6 * (Math.min(10, wave / 5) - 1);
    for (const [wave, kind] of [
        [5, 0],
        [10, 1],
        [15, 2],
        [20, 3],
        [25, 4],
        [30, 5],
        [35, 0],
        [60, 5],
        [65, 0],
    ]) {
        const tier = Math.floor((wave / 5 - 1) / 6);
        for (const players of [1, 2]) {
            const game = await waveGame(wave, players);
            const state = bossState(game.scene());
            assert.equal(state.kind, kind, `wave ${wave}`);
            assert.equal(state.tier, tier);
            assert.equal(state.mini, false);
            const designed = tier >= 1 ? Math.floor((base(wave) * 12) / 10) : base(wave);
            assert.equal(state.maximum, designed * K[kind] * players, `wave ${wave} x${players}`);
        }
    }
    for (const [wave, kind] of [
        [3, 6],
        [8, 7],
        [13, 8],
        [18, 9],
        [23, 10],
        [28, 11],
        [33, 6],
    ]) {
        const game = await waveGame(wave);
        const state = bossState(game.scene());
        assert.equal(state.kind, kind, `mini wave ${wave}`);
        assert.equal(state.mini, true);
        const region = kind - 6,
            tier = Math.floor((wave - 3) / 5 / 6),
            designed = (6 + 2 * region) * (tier >= 1 ? 12 / 10 : 1);
        assert.equal(state.maximum, Math.floor(designed) * K[kind]);
    }
});

test('the entrance is harmless for 1.4 s and then the body hurts', async () => {
    const game = await waveGame(5);
    set(game, 3, 330);
    set(game, 4, 135);
    set(game, 5, 0);
    ticks(game, 60);
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(stats(game).entranceHits, 0);
    assert(bossState(game.scene()).entrance < 1);
    // Shots pass through an unfinished entrance without scratching it.
    const hp = bossState(game.scene()).health;
    ticks(game, 5, { aimX: 1, firePressed: true });
    assert.equal(bossState(game.scene()).health, hp);
    ticks(game, 20);
    assert.equal(game.state, 'death');
});

test('the Sentinel only takes damage while its plates are open', async () => {
    const game = await waveGame(5);
    ticks(game, ENTRANCE + 30); // rest ends, the first lance begins
    const target = () => ({ x: bossState(game.scene()).x, y: bossState(game.scene()).y });
    until(game, (state) => state.attack === ATTACK.lance && state.gate < 0.2);
    const hp = bossState(game.scene()).health;
    shoot(game, target(), 4);
    assert.equal(bossState(game.scene()).health, hp, 'closed plates absorb shots');
    until(game, (state) => state.attack === 0 && state.gate > 0.9);
    shoot(game, target(), 3);
    assert(bossState(game.scene()).health < hp, 'open plates take damage');
});

test('the laser is one 8-point hit on an open boss and cannot repeat on a hold', async () => {
    const game = await waveGame(5);
    set(game, 3, 100);
    set(game, 4, 135);
    for (let i = 0; i < 76; i++) {
        const scene = game.scene(),
            dx = 366 - scene[S.SHIP_X],
            dy = 135 - scene[S.SHIP_Y],
            length = Math.hypot(dx, dy);
        game.step({ y: 0, laser: true, aimX: dx / length, aimY: dy / length });
    }
    assert.equal(game.state, 'playing');
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(bossState(game.scene()).health, 54 - 8 * K[0]);
    assert.equal(game.stats().laserShots, 1);
    ticks(game, 15, { laser: true, aimX: 1 });
    assert.equal(bossState(game.scene()).health, 54 - 8 * K[0]);
});

test('dying never resets the boss; threats are cleared and the ship returns protected', async () => {
    const game = await waveGame(5);
    ticks(game, ENTRANCE + 50);
    const hp = bossState(game.scene()).health,
        wave = bossState(game.scene()).wave;
    set(game, 1, hp - 5); // a wounded boss
    const wounded = bossState(game.scene()).health;
    set(game, 5, 0);
    game.api.web_test_overlap();
    ticks(game, 3);
    assert.equal(game.state, 'death');
    assert.equal(bossShots(game.scene()).length, 0);
    assert(bossHazards(game.scene()).every((h) => h.kind > HAZARD.arm));
    until(game, (_, scene) => scene[S.STATE] === 2 && scene[S.SHIP_ALIVE] === 1, 400);
    const back = bossState(game.scene());
    assert(back.active);
    assert.equal(back.health, wounded);
    assert.equal(back.wave, wave);
    assert(game.scene()[S.INVINCIBLE_MS] > 0, 'respawn protection');
});

test('a flawless fight pays 50% more, losing a life pays the base', async () => {
    for (const flawless of [true, false]) {
        const game = await waveGame(5, 1, 1);
        ticks(game, ENTRANCE);
        set(game, 5, flawless ? 1e6 : 0);
        if (!flawless) {
            set(game, 5, 0);
            game.api.web_test_overlap();
            ticks(game, 3);
            until(game, (_, s) => s[0] === 2 && s[6] === 1, 400);
        }
        const before = game.scene()[S.SCORE];
        until(game, (state) => state.attack === 0 && state.gate > 0.9, 800);
        const s = bossState(game.scene());
        shoot(game, { x: s.x, y: s.y }, 3);
        ticks(game, 40);
        assert.equal(bossState(game.scene()).active, false);
        assert.equal(game.scene()[S.BOSS_KILLS], 1);
        assert.equal(game.scene()[S.SCORE] - before, flawless ? 2625 : 1750);
        assert.equal(game.scene()[S.RUN_DESTROYED], 0, 'boss kills never count as asteroids');
        assert.equal(game.scene()[S.WAVE], 5);
        ticks(game, 20);
        assert.equal(game.scene()[S.WAVE], 5);
        // The overlap rock the unflawless run spawned sits still forever, so only check clean runs.
        if (flawless) {
            ticks(game, 700);
            assert(game.scene()[S.WAVE] >= 6);
        }
    }
});

test('a mini-boss shares its wave with half the rocks and holds the wave open', async () => {
    const game = await waveGame(3);
    assert.equal(bossState(game.scene()).mini, true);
    ticks(game, 50 * 30); // rocks all gone, wave must wait
    assert.equal(game.scene()[S.WAVE], 3);
    assert(bossState(game.scene()).active);
    const hp = 1;
    set(game, 1, hp);
    until(game, (state) => state.attack === 0 && state.gate > 0.9, 800);
    const s = bossState(game.scene());
    shoot(game, { x: s.x, y: s.y }, 3);
    ticks(game, 10);
    assert.equal(bossState(game.scene()).active, false);
    ticks(game, 300);
    assert(game.scene()[S.WAVE] >= 4, 'the wave moves on once the mini is down');
    assert.equal(bossState(game.scene()).defeated & (1 << 6), 1 << 6);
});

const HEALTH = 3; // PICKUP_HEALTH
// Takes the boss down in one blow and returns the pickup it left, if any.
function defeat(game) {
    ticks(game, ENTRANCE);
    set(game, 0, 0);
    ticks(game, 2);
    assert.equal(bossState(game.scene()).active, false);
    const scene = game.scene();
    return scene[S.PICKUP_ACTIVE]
        ? { kind: scene[S.PICKUP_KIND], x: scene[S.PICKUP_X], y: scene[S.PICKUP_Y] }
        : null;
}

test('every boss leaves exactly one health pickup, and flying through it restores a life', async () => {
    const game = await waveGame(5);
    const drop = defeat(game);
    assert.equal(drop?.kind, HEALTH);
    const lives = game.scene()[S.LIVES];
    set(game, 3, drop.x);
    set(game, 4, drop.y);
    ticks(game, 3);
    assert.equal(game.scene()[S.PICKUP_ACTIVE], 0);
    assert.equal(game.scene()[S.LIVES], lives + 1);
});

test('a mini-boss leaves a health pickup about half the time', async () => {
    let drops = 0;
    const runs = 24;
    for (let seed = 1; seed <= runs; seed++) {
        const game = await waveGame(3, 1, 0, seed);
        if (defeat(game)?.kind === HEALTH) drops++;
    }
    assert(drops > 3 && drops < runs - 3, `${drops} of ${runs} mini-bosses dropped health`);
});

test('boss practice drops no health', async () => {
    const game = await practiceGame(0);
    assert.equal(defeat(game), null);
});

test('practice and a fresh retry do not inherit a previous boss', async () => {
    const game = await waveGame(5);
    game.start(true);
    ticks(game, 100);
    assert.equal(game.scene()[S.BOSS_ACTIVE], 0);
    assert.equal(game.scene()[S.BOSS_KILLS], 0);
    game.start();
    ticks(game, 80);
    assert.equal(game.scene()[S.BOSS_ACTIVE], 0);
});

test('boss practice never costs a life and reports hits taken', async () => {
    const game = await practiceGame(2);
    ticks(game, ENTRANCE);
    set(game, 3, 300);
    set(game, 4, 135);
    set(game, 5, 0);
    ticks(game, 60);
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(game.state, 'playing');
    assert(stats(game).hitsTaken > 0);
    assert.equal(bossState(game.scene()).practice, true);
});

test('multishot plus 2x fire keeps per-projectile accounting while damaging the boss', async () => {
    const game = await waveGame(5);
    ticks(game, ENTRANCE);
    until(game, (state) => state.attack === 0 && state.gate > 0.9, 800);
    game.api.web_test_pickup(0);
    game.step();
    game.api.web_test_pickup(2);
    game.step();
    set(game, 3, 100);
    set(game, 4, 135);
    game.step({ firePressed: true, aimX: 1 });
    ticks(game, 5);
    ticks(game, 50, { y: 0 });
    assert.equal(game.stats().spawned, 6);
    assert(game.stats().hits >= 1);
    assert(game.stats().hits <= 6);
    assert(bossState(game.scene()).health < 54);
    assert.equal(game.scene()[S.BOSS_KILLS], 0);
});

test('stored shield absorbs a boss lance and holds cannot cause repeated life loss', async () => {
    const game = await waveGame(5);
    set(game, 5, 0);
    game.api.web_test_pickup(1);
    game.step({ shield: true });
    set(game, 3, 150);
    set(game, 4, 135);
    ticks(game, 175);
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(game.scene()[S.SHIELD], 0, 'the shield took the lance');
});

test('assists lengthen telegraphs by 30% and calm the lens bend', async () => {
    const lance = async (long) => {
        const game = await waveGame(5);
        game.api.web_boss_assist(long, 0);
        until(game, (state) => bossHazards(game.scene()).some((h) => h.kind === HAZARD.lane), 600);
        return bossHazards(game.scene()).find((h) => h.kind === HAZARD.lane).warnTotal;
    };
    assert.equal(await lance(0), 900);
    assert.equal(await lance(1), 1170);
});

test('boss pickups arrive once per phase boundary', async () => {
    const game = await waveGame(15); // Cinderforge: three phases (Ringwarden has timed shields)
    ticks(game, ENTRANCE);
    const max = bossState(game.scene()).maximum;
    set(game, 0, Math.ceil(max * 0.4)); // below 66%
    ticks(game, 2);
    assert.equal(game.scene()[S.PICKUP_ACTIVE], 1);
    assert.equal(game.scene()[S.PICKUP_KIND], 1);
    assert.equal(bossState(game.scene()).stage, 2);
});

test('every fight keeps its promises: warnings, caps, corridor, entrance, body room', async () => {
    for (const kind of KINDS.keys()) {
        for (const tier of [0, 1, 2]) {
            const game = await practiceGame(kind, tier, 100 + kind);
            const bot = new BossBot(game);
            let steps = 0,
                minLeft = 999;
            for (; steps < 150 * 50; steps++) {
                bot.step();
                const scene = game.scene();
                if (!scene[S.BOSS_ACTIVE] && steps > 100) break;
                if (scene[S.BOSS_STAGE] > 0 && steps % 25 === 0)
                    for (const [i, c] of body(game).entries()) {
                        // The Zodiarch's thrown creatures are projectiles, not its body (head,
                        // snout and 26 segments come first).
                        if (kind === 5 && i >= 28) continue;
                        minLeft = Math.min(minLeft, c.x - c.r);
                    }
            }
            const s = stats(game),
                name = `${KINDS[kind].name} tier ${tier}`;
            assert.equal(s.violations, 0, `${name}: lethal hazard without its warning`);
            assert(s.maxShots <= 48, `${name}: ${s.maxShots} shots`);
            assert(s.maxHazards <= 6, `${name}: ${s.maxHazards} hazards`);
            assert.equal(s.entranceHits, 0, `${name}: entrance`);
            assert(s.corridor >= 42, `${name}: corridor ${s.corridor}`);
            assert(minLeft >= 216 - 1, `${name}: body reaches x=${minLeft}`);
            assert.equal(bossState(game.scene()).active, false, `${name}: not beaten in 150 s`);
        }
    }
});

test('tiers shorten rests and tier II adds a frenzy phase', async () => {
    const game = await practiceGame(1, 2);
    ticks(game, ENTRANCE);
    const max = bossState(game.scene()).maximum;
    assert.equal(max, Math.floor((24 * 12) / 10) * K[1]);
    set(game, 0, Math.floor(max * 0.1));
    ticks(game, 2);
    assert.equal(bossState(game.scene()).stage, 4, 'a fourth phase at 15% health');
});

test('the Ringwarden: blades absorb shots and break, the core only takes what gets through', async () => {
    const game = await practiceGame(1);
    ticks(game, ENTRANCE);
    // The frontmost outer blade: nothing else stands between it and the pilot (the ring moves).
    const blade = bossParts(game.scene())
        .filter((p) => p.kind === PART.blade && p.slot < 16)
        .sort((a, b) => a.x - b.x)[0];
    const hp = bossState(game.scene()).health;
    shoot(game, blade, 1);
    assert.equal(bossPart(game.scene(), blade.index).exists, false);
    assert.equal(bossState(game.scene()).health, hp);
    ticks(game, 50 * 6.5);
    assert.equal(
        bossPart(game.scene(), blade.index).exists,
        true,
        'blades regrow after six seconds',
    );
});

test('the Cinderforge: shell blocks, a panel breaks after three hits and becomes a window', async () => {
    const game = await practiceGame(2);
    ticks(game, ENTRANCE);
    const hp = bossState(game.scene()).health;
    const panel = bossPart(game.scene(), 2);
    shoot(game, panel, 2);
    assert.equal(bossPart(game.scene(), 2).state, 0);
    shoot(game, bossPart(game.scene(), 2), 1);
    assert.equal(bossPart(game.scene(), 2).state, 2);
    assert.equal(
        bossState(game.scene()).health,
        hp,
        'breaking a panel hurts the panel, not the boss',
    );
    shoot(game, bossPart(game.scene(), 2), 2);
    assert(bossState(game.scene()).health < hp, 'a broken panel is a window');
});

test('the Bastion: hardpoints fall at six hits, the bridge takes half until they do', async () => {
    const game = await practiceGame(3);
    ticks(game, ENTRANCE);
    const bridge = () => ({ x: bossState(game.scene()).x + 114, y: bossState(game.scene()).y + 2 });
    const hp = bossState(game.scene()).health;
    shoot(game, bridge(), 4, { from: 60 });
    assert.equal(hp - bossState(game.scene()).health, 2, 'four shots, half damage');
    for (const [i, slot] of [
        [0, 0],
        [1, 1],
        [2, 2],
    ]) {
        const part = () => bossPart(game.scene(), slot);
        shoot(game, part(), 6, { from: 60 });
        assert.equal(part().exists, false, `hardpoint ${i} destroyed`);
    }
    const h2 = bossState(game.scene()).health;
    shoot(game, bridge(), 2, { from: 60 });
    assert.equal(h2 - bossState(game.scene()).health, 2, 'full damage once they are gone');
    ticks(game, 50 * 8.5);
    assert.equal(
        bossParts(game.scene()).filter((p) => p.kind === PART.hard).length,
        3,
        'rebuilt once after eight seconds',
    );
});

test('the Tidecaller: the bubble shield, and a laser that pops all three', async () => {
    const game = await practiceGame(4);
    ticks(game, ENTRANCE);
    const bell = () => ({ x: bossState(game.scene()).x, y: bossState(game.scene()).y - 37 });
    const hp = bossState(game.scene()).health;
    shoot(game, bell(), 3, { from: 120 });
    assert.equal(bossState(game.scene()).health, hp, 'the bell takes no damage under a bubble');
    set(game, 3, 60);
    set(game, 4, bell().y);
    for (let i = 0; i < 80; i++) {
        const s = game.scene(),
            b = bell(),
            dx = b.x - s[4],
            dy = b.y - s[5],
            l = Math.hypot(dx, dy);
        game.step({ laser: true, aimX: dx / l, aimY: dy / l, x: 2048, y: 2048 });
    }
    assert.equal(bossParts(game.scene()).filter((p) => p.kind === PART.bubble).length, 0);
    assert(bossState(game.scene()).health < hp);
});

test('shootable projectiles: missiles take two shots, lobs split into embers and cancel their pool', async () => {
    const gunnery = await practiceGame(9);
    until(
        gunnery,
        () => bossShots(gunnery.scene()).some((s) => s.family === SHOT.missile),
        900,
        () => ({ x: 2048, y: 2048 }),
    );
    const missile = bossShots(gunnery.scene()).find((s) => s.family === SHOT.missile);
    shoot(gunnery, missile, 1, { from: 30 });
    assert.equal(
        bossShots(gunnery.scene()).some((s) => s.family === SHOT.missile && s.hp === 1),
        true,
        'two hit points',
    );
    shoot(
        gunnery,
        bossShots(gunnery.scene()).find((s) => s.family === SHOT.missile),
        1,
        { from: 30 },
    );
    assert.equal(
        bossShots(gunnery.scene()).some((s) => s.family === SHOT.missile),
        false,
    );
    const ling = await practiceGame(8);
    until(
        ling,
        () => bossShots(ling.scene()).some((s) => s.family === SHOT.lob),
        900,
        () => ({ x: 2048, y: 2048 }),
    );
    assert.equal(
        bossHazards(ling.scene()).filter((h) => h.kind === HAZARD.pool).length,
        1,
        'the landing marker is up',
    );
    const lob = bossShots(ling.scene()).find((s) => s.family === SHOT.lob);
    shoot(ling, lob, 1, { from: 30 });
    assert.equal(
        bossShots(ling.scene()).filter((s) => s.family === SHOT.ember).length >= 3,
        true,
        'three slow embers',
    );
    assert.equal(
        bossHazards(ling.scene()).filter((h) => h.kind === HAZARD.pool).length,
        0,
        'the pool is cancelled',
    );
});

test('boss practice can start in a later phase, frenzy included', async () => {
    const game = await newGame();
    game.start(true);
    game.api.web_boss_practice(1, 0, 3);
    ticks(game, ENTRANCE);
    assert.equal(bossState(game.scene()).stage, 3);
    const max = bossState(game.scene()).maximum;
    assert(bossState(game.scene()).health <= Math.floor(max * 0.33) + 1);
    const frenzy = await newGame();
    frenzy.start(true);
    frenzy.api.web_boss_practice(2, 2, 4);
    ticks(frenzy, ENTRANCE);
    assert.equal(bossState(frenzy.scene()).stage, 4);
});

// Shield spawn times (seconds into the fight) over `seconds` of an untouched fight.
function shieldDrops(game, seconds) {
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

test('Ringwarden alone drops a shield every 7 seconds', async () => {
    const ringwarden = await waveGame(10);
    const drops = shieldDrops(ringwarden, 36);
    assert(drops.length >= 4, `drops: ${drops}`);
    drops.slice(1).forEach((t, i) => assert(Math.abs(t - drops[i] - 7) < 0.1, `gap ${drops}`));
    // The first fight of the run (Sentinel) and the later bosses keep their phase-based drops.
    for (const wave of [5, 15, 20]) {
        const other = await waveGame(wave);
        assert.equal(shieldDrops(other, 22).length, 0, `wave ${wave} drops nothing in phase 1`);
    }
});

// A practice fight that starts in `phase`, with the pilot untouchable.
async function phaseGame(kind, phase, seed = 7) {
    const game = await newGame(seed);
    game.start(true);
    game.api.web_boss_practice(kind, 0, phase);
    set(game, 5, 1e6);
    return game;
}
const ENTRANCE_TICKS = ENTRANCE;
const angleError = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

test('the Tidecaller streams start from all over the bell and its three new attacks work', async () => {
    const game = await phaseGame(4, 3, 11);
    ticks(game, ENTRANCE_TICKS);
    const columnYs = [],
        sporeXs = [];
    let wall = null,
        rings = null;
    const seen = new Set();
    for (let i = 0; i < 90 * 50 && bossState(game.scene()).active; i++) {
        game.step({});
        const scene = game.scene(),
            state = bossState(scene);
        seen.add(state.attack);
        for (const s of bossShots(scene)) {
            if (s.family === SHOT.sine && s.age < 25) columnYs.push(s.y);
            if (s.family === SHOT.spore && s.y < 14 && s.age < 25) sporeXs.push(s.x);
        }
        if (state.attack === ATTACK.wall && state.attackMs > 800 && state.attackMs < 860 && !wall)
            wall = bossShots(scene)
                .filter((s) => s.family === SHOT.pellet && s.age < 200)
                .map((s) => s.y)
                .sort((a, b) => a - b);
        if (state.attack === ATTACK.whirl && state.attackMs > 1250 && !rings)
            rings = {
                ring: bossHazards(scene).filter((h) => h.kind === HAZARD.ring),
                ship: { x: scene[S.SHIP_X], y: scene[S.SHIP_Y] },
            };
    }
    assert(Math.max(...columnYs) - Math.min(...columnYs) > 60, 'streams use the whole bell');
    for (const id of [ATTACK.wall, ATTACK.rain, ATTACK.whirl]) assert(seen.has(id), `attack ${id}`);
    assert(wall && wall.length >= 8, 'a wall of pellets');
    const biggestGap = Math.max(...wall.slice(1).map((y, i) => y - wall[i]));
    assert(biggestGap >= 60, `with a gap to fly through (${biggestGap} px)`);
    assert(Math.max(...sporeXs) - Math.min(...sporeXs) > 80, 'spores fall in random columns');
    assert(rings && rings.ring.length >= 2, 'two whirlpools');
    for (const r of rings.ring)
        assert(
            Math.hypot(r.x - rings.ship.x, r.y - rings.ship.y) >= 100,
            'never opened on the pilot',
        );
});

test('the Cinderforge: a lava pool burns down into scorched ground that burns while you stand in it', async () => {
    // The Cinderling lobs the same pools and does nothing else, so a hit here is a pool or a burn.
    const game = await phaseGame(8, 1, 5);
    ticks(game, ENTRANCE_TICKS);
    const burns = () => bossHazards(game.scene()).filter((h) => h.kind === HAZARD.burn);
    const pools = () => bossHazards(game.scene()).filter((h) => h.kind === HAZARD.pool);
    until(game, () => pools().length > 0, 2500);
    const pool = pools()[0];
    set(game, 3, 460); // out of the way: lobs are aimed at the pilot but clamped to the field
    set(game, 4, 20);
    until(
        game,
        () => burns().length > 0,
        600,
        () => ({ x: 2048, y: 2048 }),
    );
    const scorch = burns()[0];
    assert(
        Math.abs(scorch.x - pool.x) < 1 && Math.abs(scorch.y - pool.y) < 1,
        'where the pool was',
    );
    assert.equal(scorch.warn, 0, 'it is already down: the pool was the warning');
    assert(scorch.live > 5000, 'and it lasts about six seconds');
    const before = bossState(game.scene()).hitsTaken;
    ticks(game, 20);
    assert.equal(bossState(game.scene()).hitsTaken, before, 'nothing burns while you are away');
    set(game, 3, scorch.x);
    set(game, 4, scorch.y);
    ticks(game, 30); // the first burn comes 500 ms after stepping in
    assert(bossState(game.scene()).hitsTaken > before, 'standing in it burns');
});

test('the Cinderforge: a shot-down lob cancels its pool but marks the ground, which then smoulders', async () => {
    const game = await phaseGame(2, 1, 5);
    ticks(game, ENTRANCE_TICKS);
    const hz = (kind) => bossHazards(game.scene()).filter((h) => h.kind === kind);
    until(game, () => bossShots(game.scene()).some((s) => s.family === SHOT.lob), 2500);
    const lob = bossShots(game.scene()).find((s) => s.family === SHOT.lob);
    shoot(game, lob, 2, { from: 40 });
    assert.equal(hz(HAZARD.pool).length, 0, 'the pool never lands');
    const mark = hz(HAZARD.burn);
    assert(mark.length >= 1 && mark[0].warn > 0, 'but the ground is marked first');
    until(game, () => hz(HAZARD.burn).length && hz(HAZARD.burn)[0].warn === 0, 100);
    assert(hz(HAZARD.burn)[0].c < 15, 'a small patch');
});

test('the Cinderforge fights with fire that stays: geysers, hammers, vents and a barrage; at most three scorches burn', async () => {
    const seen = new Set();
    let most = 0,
        geyserScorch = false;
    for (const [phase, seed] of [
        [1, 3],
        [2, 4],
        [2, 5],
        [3, 6],
        [3, 7],
    ]) {
        const game = await phaseGame(2, phase, seed);
        for (let i = 0; i < 50 * 50 && bossState(game.scene()).active; i++) {
            game.step({ x: 2048, y: 2048 });
            const scene = game.scene(),
                state = bossState(scene);
            seen.add(state.attack);
            const burning = bossHazards(scene).filter((h) => h.kind === HAZARD.burn);
            most = Math.max(most, burning.length);
            if (state.attack === ATTACK.geyser && burning.some((h) => h.y > 240))
                geyserScorch = true;
        }
    }
    for (const id of [ATTACK.geyser, ATTACK.hammer, ATTACK.vent, ATTACK.barrage, ATTACK.lob])
        assert(seen.has(id), `attack ${id}`);
    assert(most >= 1 && most <= 3, `${most} scorches at once`);
    assert(geyserScorch, 'a geyser leaves a scorch at its base');
});

test('every boss moves: its rest point follows the pilot between attacks', async () => {
    for (const kind of KINDS.keys()) {
        if (kind === 7) continue; // the Shardling already kites on its own
        const game = await practiceGame(kind, 0, 300 + kind);
        ticks(game, ENTRANCE);
        set(game, 5, 1e9); // untouchable: this test is about the boss, not the pilot
        let low = 999,
            high = -999,
            left = 999,
            right = -999;
        for (let i = 0; i < 50 * 20; i++) {
            // The pilot weaves between the top and bottom of the field, in front of the boss.
            set(game, 3, 60);
            set(game, 4, i % 500 < 250 ? 50 : 220);
            game.step();
            const s = game.scene();
            if (!s[S.BOSS_ACTIVE]) break;
            low = Math.min(low, s[S.BOSS_Y]);
            high = Math.max(high, s[S.BOSS_Y]);
            left = Math.min(left, s[S.BOSS_X]);
            right = Math.max(right, s[S.BOSS_X]);
        }
        const name = KINDS[kind].name;
        assert(high - low >= 30, `${name}: moved only ${high - low} px vertically`);
        assert(right - left >= 5, `${name}: moved only ${right - left} px sideways`);
    }
});

test('parking behind or beside a boss sets off a warned repel ring', async () => {
    for (const kind of KINDS.keys()) {
        const game = await practiceGame(kind, 0, 400 + kind);
        ticks(game, ENTRANCE);
        set(game, 5, 0); // vulnerable
        let hit = false;
        // Some bodies (the Ringwarden's blades) touch a parked pilot first; keep parking until
        // the repel has gone out too.
        for (let i = 0; i < 50 * 6 && !(hit && stats(game).repels >= 1); i++) {
            const s = game.scene();
            set(game, 3, Math.min(460, s[S.BOSS_X] + 70));
            set(game, 4, s[S.BOSS_Y] + (kind % 2 ? 60 : -60));
            game.step();
            hit = stats(game).hitsTaken > 0;
        }
        const s = stats(game),
            name = KINDS[kind].name;
        assert(s.repels >= 1, `${name}: no repel`);
        assert(hit, `${name}: a pilot parked behind it was never touched`);
        assert.equal(s.violations, 0, `${name}: the repel went live without its warning`);
    }
});

// ---------------------------------------------------------------- the Zodiarch (P1.2)
const signParts = (game) => bossParts(game.scene()).filter((p) => p.kind === PART.sign);

test('the Zodiarch swims: its 26 segments trail the head along its path, right of x=216', async () => {
    const game = await practiceGame(5);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    const first = bossBody(game.scene()).map((s) => [s.x, s.y]);
    assert.equal(first.length, 26);
    ticks(game, 100);
    const later = bossBody(game.scene());
    assert(Math.hypot(later[0].x - first[0][0], later[0].y - first[0][1]) > 20, 'the neck moved');
    for (const s of later) assert(s.x - s.r >= 215, `segment at x=${s.x}`);
    // Each segment sits about 13 px further back along the path than the one before.
    for (let i = 1; i < later.length; i++) {
        const gap = Math.hypot(later[i].x - later[i - 1].x, later[i].y - later[i - 1].y);
        assert(gap > 4 && gap <= 14, `gap ${gap.toFixed(1)} at ${i}`);
    }
});

test('a thrown sign forms out of the ring before anything of it is live, and breaking its key star hurts the dragon', async () => {
    const game = await practiceGame(5);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    until(game, () => signParts(game).length > 0, 400);
    const forming = signParts(game)[0];
    assert.equal(forming.state, 0, 'it starts by forming');
    assert(
        bossHazards(game.scene()).every((h) => h.kind > HAZARD.arm),
        'no lethal hazard while it forms',
    );
    until(game, () => signParts(game).some((p) => p.state === 1), 60);
    const live = signParts(game).find((p) => p.state === 1);
    const hp = bossState(game.scene()).health;
    for (let k = 0; k < live.hp; k++) set(game, 9, live.index); // three hits on its key star
    const after = bossPart(game.scene(), live.index);
    assert(!after.exists || after.state === 2, 'the creature breaks');
    assert(bossState(game.scene()).health < hp, 'and the dragon is hurt');
});

test('the Zodiarch: the pearl takes shots only while it is open', async () => {
    const game = await practiceGame(5);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    const pearl = () => {
        const a = bossState(game.scene()).aux;
        return { x: a[4], y: a[5] };
    };
    until(game, (state) => state.aux[1] < 0.5 && !signParts(game).length, 600);
    const hp = bossState(game.scene()).health;
    shoot(game, pearl(), 2, { from: 120 });
    assert.equal(bossState(game.scene()).health, hp, 'closed: nothing');
    until(game, (state) => state.aux[1] > 0.5, 700);
    let hit = false;
    for (let k = 0; k < 6 && !hit; k++) {
        shoot(game, pearl(), 1, { from: 90 });
        hit = bossState(game.scene()).health < hp;
    }
    assert(hit, 'open: the pearl takes damage');
});

test('every sign has its own attack, and the breath comes in phase 3', async () => {
    const seen = new Set();
    for (const phase of [1, 2, 3]) {
        const game = await phaseGame(5, phase, 40 + phase);
        for (let i = 0; i < 50 * 70 && seen.size < 13; i++) {
            game.step();
            const a = bossState(game.scene()).attack;
            if (a) seen.add(a);
        }
    }
    for (let sign = 0; sign < 12; sign++) assert(seen.has(ATTACK.aries + sign), `sign ${sign}`);
    assert(seen.has(ATTACK.breath), 'breath');
});

// ---------------------------------------------------------------- Ninefold (P1.3)
const tails = (game) => bossParts(game.scene()).filter((p) => p.kind === PART.tail);

test('Ninefold: its nine tails are its health, and losing one opens the forehead', async () => {
    const game = await practiceGame(11);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    assert.equal(tails(game).length, 9);
    const state = bossState(game.scene());
    set(game, 1, Math.floor((state.maximum * 6.5) / 9)); // between six and seven ninths left
    ticks(game, 1);
    assert.equal(tails(game).length, 7);
    assert(bossState(game.scene()).aux[2] > 0.5, 'the forehead opens');
    ticks(game, 140);
    assert(bossState(game.scene()).aux[2] < 0.5, 'and closes again after 2.5 s');
});

test('Ninefold: a hit on a tail reaches the fox', async () => {
    const game = await practiceGame(11);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    const hp = bossState(game.scene()).health;
    const tail = tails(game).sort((a, b) => a.y - b.y)[0];
    shoot(game, tail, 3, { from: 80 });
    assert(bossState(game.scene()).health < hp);
});

test('Ninefold: popping both illusions opens the forehead; while it blinks it cannot be touched', async () => {
    const game = await practiceGame(11);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    until(game, (state) => state.attack === ATTACK.illusion && state.attackMs >= 700, 2000);
    const decoys = bossParts(game.scene()).filter((p) => p.kind === PART.decoy);
    assert.equal(decoys.length, 2);
    for (const d of decoys) shoot(game, { x: d.x + NINEFOLD.body[0], y: d.y + NINEFOLD.body[1], index: d.index }, 3, { from: 80 });
    assert.equal(bossParts(game.scene()).filter((p) => p.kind === PART.decoy).length, 0);
    assert(bossState(game.scene()).aux[2] > 0.5, 'seen through: the forehead opens');
    until(game, (state) => state.aux[1] > 0.5, 2000);
    assert.equal(body(game).length, 0, 'gone while it blinks');
});
