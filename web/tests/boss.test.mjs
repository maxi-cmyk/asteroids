import { S } from '../src/runtime/scene-layout.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { BossBot } from './boss-bot.mjs';
import { FOX_POSES, FOX_POSE } from '../src/boss/ninefold/poses.mjs';
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
} from '../src/boss/scene.mjs';
const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
const set = (game, field, value) => game.api.web_test_boss_set(field, value);
const K = [3, 6, 2, 5, 5, 2, 5, 8, 5, 8, 8, 6]; // sub-hits per design hit, mirrors BOSS_K
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

test('the Sentinel tells each attack, then its plate throw leaves the eye bare (P4.1)', async () => {
    const game = await practiceGame(0, 0, 11);
    set(game, 5, 1e9); // untouchable: this is about the boss
    ticks(game, ENTRANCE);
    const A = KINDS[0].aux;
    until(game, (state) => state.attack !== 0 && state.attackMs > 60 && state.attackMs < 300);
    assert.equal(bossState(game.scene()).aux[A.tell], 1, 'the eye narrows for the tell');
    // Phase 1 runs lance, fan, plate throw.
    until(game, (state) => state.attack === ATTACK.plateThrow && state.attackMs > 40, 3000);
    const plates = () => bossParts(game.scene()).filter((p) => p.kind === PART.plate);
    assert.equal(plates().filter((p) => p.state === 1).length, 2, 'two plates warned');
    until(game, (state) => state.attackMs >= 700);
    const boss = bossState(game.scene());
    assert.deepEqual(
        plates()
            .filter((p) => p.state === 2)
            .map((p) => p.slot)
            .sort(),
        [1, 2],
        'the two plates facing the pilot are thrown',
    );
    assert.equal(boss.aux[A.bare], 1, 'the eye is bare while they fly');
    const hp = boss.health;
    shoot(game, { x: boss.x, y: boss.y }, 6);
    assert(bossState(game.scene()).health < hp, 'shots into the bare eye hurt');
    const far = Math.min(...plates().map((p) => p.x));
    assert(far < boss.x - 60, `a thrown plate flies out (x ${far})`);
    until(game, (state) => state.attack !== ATTACK.plateThrow, 300);
    ticks(game, 2);
    assert(
        plates().every((p) => p.state === 0),
        'the plates come back',
    );
});

test('in phase 3 the Sentinel sheds its plates and the eye stays open (P4.1)', async () => {
    const game = await newGame(12);
    game.start(true);
    game.api.web_boss_practice(0, 0, 3);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE + 120);
    assert.equal(bossParts(game.scene()).filter((p) => p.kind === PART.plate).length, 0);
    until(game, (state) => state.attack === ATTACK.lance && state.attackMs > 400);
    const boss = bossState(game.scene());
    assert.equal(boss.aux[KINDS[0].aux.bare], 1);
    const hp = boss.health;
    shoot(game, { x: boss.x, y: boss.y }, 3);
    assert(bossState(game.scene()).health < hp, 'hurt even mid-attack');
});

test('the Tidecaller swims in pulses, its bubbles drift and are pushed, and it lights a stream (P4.5)', async () => {
    const game = await practiceGame(4, 0, 11);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    const A = KINDS[4].aux;
    // Over two pulses the bell contracts hard, then relaxes, and moves.
    let most = 0,
        least = 1,
        xs = [];
    for (let i = 0; i < 160; i++) {
        game.step();
        const b = bossState(game.scene());
        most = Math.max(most, b.aux[A.squeeze]);
        least = Math.min(least, b.aux[A.squeeze]);
        xs.push(b.x);
    }
    assert(most > 0.9 && least < 0.1, 'it contracts and relaxes');
    assert(Math.max(...xs) - Math.min(...xs) > 20, 'and swims');
    // A bubble's first hit pushes it back; the second pops it.
    const bubble = () =>
        bossParts(game.scene())
            .filter((p) => p.kind === PART.bubble)
            .sort((a, b) => a.x - b.x)[0];
    until(game, (state) => bubble().x < state.x - 95, 50 * 30); // one comes round in front
    const first = bubble();
    for (let k = 0; k < 4 && bossPart(game.scene(), first.index).hp > 1; k++) {
        shoot(game, bossPart(game.scene(), first.index), 1, { from: 60 });
        ticks(game, 6);
    }
    assert(bossPart(game.scene(), first.index).exists, 'one hit only pushes it');
    assert.equal(bossPart(game.scene(), first.index).hp, 1);
    for (let k = 0; k < 4 && bossPart(game.scene(), first.index).exists; k++) {
        shoot(game, bossPart(game.scene(), first.index), 1, { from: 60 });
        ticks(game, 6);
    }
    assert(!bossPart(game.scene(), first.index).exists, 'the second hit pops it');
    // Light runs along the bell before a stream.
    until(
        game,
        (state) => state.attack === ATTACK.sine && state.attackMs > 300 && state.attackMs < 500,
        50 * 30,
    );
    assert(bossState(game.scene()).aux[A.rim] > 0.4, 'the stream’s start lights up first');
});

test('the minis borrow their bosses’ motion: the Shardling tilts, the Moonjelly pulses (P4.6)', async () => {
    const shard = await practiceGame(7, 0, 11);
    set(shard, 5, 1e9);
    ticks(shard, ENTRANCE);
    let flat = 99;
    for (let i = 0; i < 200; i++) {
        shard.step();
        const b = bossState(shard.scene());
        flat = Math.min(flat, Math.cos(b.aux[KINDS[7].aux.tilt]));
    }
    assert(flat < 0.5, 'the blades’ ring tips well away from flat');
    const jelly = await practiceGame(10, 0, 11);
    set(jelly, 5, 1e9);
    ticks(jelly, ENTRANCE);
    let most = 0;
    for (let i = 0; i < 100; i++) {
        jelly.step();
        most = Math.max(most, bossState(jelly.scene()).aux[KINDS[10].aux.squeeze]);
    }
    assert(most > 0.9, 'the Moonjelly contracts as it swims');
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
                minLeft = 999,
                lungeLeft = 999;
            for (; steps < 150 * 50; steps++) {
                bot.step();
                const scene = game.scene();
                if (!scene[S.BOSS_ACTIVE] && steps > 100) break;
                // The Zodiarch's lunge (P3.2) is the one strike past x = 216, down a warned
                // lane that never reaches past x = 120 at the snout.
                const lunging = kind === 5 && bossState(scene).attack === ATTACK.lunge;
                // The Bastion's ramming run (P4.4) crosses the whole field, but only down the
                // lane it marked for 1.2 s first (the lane hazard keeps it honest).
                if (kind === 3 && bossState(scene).attack === ATTACK.ram) continue;
                if (scene[S.BOSS_STAGE] > 0 && (steps % 25 === 0 || lunging))
                    for (const [i, c] of body(game).entries()) {
                        // The Zodiarch's thrown creatures are projectiles, not its body (head,
                        // snout and 26 segments come first).
                        if (kind === 5 && i >= 28) continue;
                        // The Sentinel's thrown plates (P4.1) fly out as boomerangs: also
                        // projectiles, warned by their drawn loops (the shell comes first).
                        if (kind === 0 && i >= 1) continue;
                        if (lunging) lungeLeft = Math.min(lungeLeft, c.x - c.r);
                        else minLeft = Math.min(minLeft, c.x - c.r);
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
            assert(lungeLeft >= 120 - 1, `${name}: lunge reaches x=${lungeLeft}`);
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

test('the Ringwarden: each ring has a gap, and the gaps meet in an eclipse (P4.2)', async () => {
    const game = await practiceGame(1, 0, 11);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    const A = KINDS[1].aux;
    const slots = bossParts(game.scene())
        .filter((p) => p.kind === PART.blade)
        .map((p) => p.slot);
    for (const gap of [0, 1, 2, 16, 17]) assert(!slots.includes(gap), `slot ${gap} is a gap`);
    assert.equal(slots.length, 22);
    // Over one 14 s clock the lane into the core is clear some of the time, not most of it.
    let clear = 0;
    for (let i = 0; i < 14000 / 18; i++) {
        game.step({});
        clear += bossState(game.scene()).aux[A.eclipse];
    }
    const share = clear / (14000 / 18);
    assert(
        share > 0.05 && share < 0.6,
        `the lane is clear ${Math.round(share * 100)}% of the time`,
    );
    // In an eclipse a shot from outside both rings reaches the core.
    until(game, (state) => state.aux[A.eclipse] === 1 && state.attack === 0, 2000);
    const boss = bossState(game.scene());
    const hp = boss.health;
    shoot(game, { x: boss.x, y: boss.y }, 2, { from: 200 });
    assert(bossState(game.scene()).health < hp, 'a shot down the clear lane hurts');
});

test('the Ringwarden: whole blades split the prism beam into shards (P4.2)', async () => {
    const game = await newGame(11);
    game.start(true);
    game.api.web_boss_practice(1, 0, 2);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    until(game, (state) => state.attack === ATTACK.prism && state.attackMs > 40, 4000);
    const shards = () => bossShots(game.scene()).filter((s) => s.family === SHOT.shard).length;
    assert.equal(shards(), 0, 'no shards before the beam goes live');
    let most = 0;
    until(game, (state) => {
        most = Math.max(most, shards());
        return state.attack !== ATTACK.prism;
    });
    assert(most >= 4, `the beam split on blades (${most} shards)`);
});

test('the Ringwarden: the halo lock throws the outer ring to the edge and back, one 80 px gap (P4.2)', async () => {
    const game = await newGame(11);
    game.start(true);
    game.api.web_boss_practice(1, 0, 2);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    until(game, (state) => state.attack === ATTACK.halo && state.attackMs > 40, 6000);
    const ring = () => bossHazards(game.scene()).find((h) => h.kind === HAZARD.ring);
    assert(ring().warn > 0, 'it is warned first');
    until(game, (state) => state.attackMs > 900 + 1000 + 200);
    const out = ring(),
        boss = bossState(game.scene());
    assert(out.b > 300, `the ring reaches the edge (r ${Math.round(out.b)})`);
    assert(Math.abs(out.b * out.c - 40) < 1, 'the gap stays 80 px wide');
    const far = Math.max(
        ...bossParts(game.scene())
            .filter((p) => p.kind === PART.blade && p.slot < 16)
            .map((p) => Math.hypot(p.x - boss.x, p.y - boss.y)),
    );
    assert(far > 280, 'the outer blades ride out with it');
    until(game, (state) => state.attack !== ATTACK.halo, 400);
    ticks(game, 2);
    assert(!ring(), 'the ring is gone');
    const back = Math.max(
        ...bossParts(game.scene())
            .filter((p) => p.kind === PART.blade && p.slot < 16)
            .map((p) =>
                Math.hypot(p.x - bossState(game.scene()).x, p.y - bossState(game.scene()).y),
            ),
    );
    assert(back < 115, 'the outer ring is home again');
});

test('the Cinderforge: each attack lights a lamp, at five it vents and the core is bare (P4.3)', async () => {
    const game = await practiceGame(2, 0, 11);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    const A = KINDS[2].aux;
    const core = () => {
        const b = bossState(game.scene());
        return { x: b.x, y: b.y + 2 };
    };
    let hp = bossState(game.scene()).health;
    shoot(game, core(), 3, { from: 200 });
    assert.equal(bossState(game.scene()).health, hp, 'shots glance off the shut shell');
    // Lamps climb one per attack, 600 ms in.
    until(game, (state) => state.attack !== 0 && state.attackMs > 640, 3000);
    assert.equal(bossState(game.scene()).aux[A.lamps], 1, 'the first attack lights a lamp');
    until(game, (state) => state.attack === ATTACK.vent, 50 * 60);
    assert.equal(bossState(game.scene()).aux[A.lamps], 5, 'it vents at five lamps');
    assert(bossState(game.scene()).aux[A.open] < 0.5, 'the doors hold through the warning');
    until(game, (state) => state.attackMs > 1300, 200);
    assert(bossState(game.scene()).aux[A.open] > 0.5, 'then burst open');
    hp = bossState(game.scene()).health;
    shoot(game, core(), 3, { from: 200 });
    const lost = hp - bossState(game.scene()).health;
    assert(lost > 0 && lost % 2 === 0, `the bare core takes double (${lost})`);
    until(game, (state) => state.attack !== ATTACK.vent, 300);
    ticks(game, 2);
    const after = bossState(game.scene());
    assert.equal(after.aux[A.lamps], 0, 'the lamps go out as it cools');
    assert(after.aux[A.open] < 0.5, 'and the doors close');
});

test('the Cinderforge: its attacks come from its arms and bellows (P4.3)', async () => {
    const game = await newGame(11);
    game.start(true);
    game.api.web_boss_practice(2, 0, 2);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    const A = KINDS[2].aux;
    until(game, (state) => state.attack === ATTACK.hammer && state.attackMs >= 700, 6000);
    let b = bossState(game.scene());
    assert(b.aux[A.hammer] > 3, `the hammer is raised over the strike (${b.aux[A.hammer]})`);
    const lane = bossHazards(game.scene()).find((h) => h.kind === HAZARD.lane);
    assert(lane && lane.warn > 0, 'its column is marked while it is up');
    until(game, (state) => state.attackMs >= 960, 50);
    b = bossState(game.scene());
    assert(Math.abs(b.aux[A.hammer] - 1.7) < 0.3, 'and it has come down as the column lands');
    until(game, (state) => state.attack === ATTACK.lob && state.attackMs >= 500, 6000);
    assert(bossState(game.scene()).aux[A.ladle] > 0.3, 'the ladle dips to scoop');
    until(game, (state) => state.attackMs >= 990, 50);
    b = bossState(game.scene());
    const blobs = bossShots(game.scene()).filter((s) => s.family === SHOT.lob);
    assert(blobs.length >= 1, 'a blob is away');
    assert(Math.min(...blobs.map((s) => s.y)) < b.y - 60, 'from over the top of the golem');
});

test('the Bastion: its engines are where it is hurt; guns fall and go quiet (P4.4)', async () => {
    const game = await practiceGame(3, 0, 11);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    const engine = (k) =>
        bossParts(game.scene()).find((p) => p.kind === PART.engine && p.slot === k);
    let hp = bossState(game.scene()).health;
    const boss = bossState(game.scene());
    shoot(game, { x: boss.x - 20, y: boss.y }, 3, { from: 120 });
    assert.equal(bossState(game.scene()).health, hp, 'the hull turns shots away');
    shoot(game, engine(0), 3, { from: 150 });
    assert(bossState(game.scene()).health < hp, 'an engine hit hurts it');
    // Knocking out the cannon costs the boss nothing, and silences the cannon.
    hp = bossState(game.scene()).health;
    const cannon = bossParts(game.scene()).find((p) => p.kind === PART.hard && p.slot === 0);
    shoot(game, cannon, 6);
    assert.equal(
        bossPart(game.scene(), cannon.index).exists,
        false,
        'six hits knock the cannon out',
    );
    assert.equal(bossState(game.scene()).health, hp, 'a gun hit does not hurt the ship');
    let cannonAfter = false;
    until(game, (state) => state.attack !== ATTACK.cannon, 200); // one already under way
    for (let i = 0; i < 50 * 20; i++) {
        game.step();
        cannonAfter ||= bossState(game.scene()).attack === ATTACK.cannon;
    }
    assert(!cannonAfter, 'no cannon while the cannon is out');
});

test('the Bastion: the ramming run crosses its marked lane, engines blazing (P4.4)', async () => {
    const game = await practiceGame(3, 0, 12);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    set(game, 3, 100);
    set(game, 4, 60);
    until(
        game,
        (state) => state.attack === ATTACK.ram && state.attackMs > 40,
        50 * 30,
        () => {
            set(game, 3, 100);
            set(game, 4, 60);
            return {};
        },
    );
    const lane = bossHazards(game.scene()).find((h) => h.kind === HAZARD.lane);
    assert(lane && lane.warn > 0, 'the lane is marked first');
    assert(Math.abs(lane.y - 70) < 1, 'on the pilot’s (top) half');
    until(game, (state) => state.attackMs >= 1800, 100);
    const b = bossState(game.scene());
    assert(b.x < 200, `it is crossing the field (x ${Math.round(b.x)})`);
    assert(Math.abs(b.y - 70) < 2, 'along the lane');
    assert(b.aux[KINDS[3].aux.thrust] > 0.8, 'engines blazing');
    const debris = bossShots(game.scene()).filter((s) => s.family === SHOT.pellet).length;
    assert(debris > 0, 'a wake of debris');
    until(game, (state) => state.attack !== ATTACK.ram, 300);
    ticks(game, 2);
    assert(Math.abs(bossState(game.scene()).x - 324) < 30, 'and it is home again');
});

test('the Bastion loses an engine at half health (P4.4)', async () => {
    const game = await practiceGame(3, 0, 13);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    const engines = () => bossParts(game.scene()).filter((p) => p.kind === PART.engine);
    shoot(game, engines()[1], 4, { from: 150 });
    set(game, 0, Math.floor(bossState(game.scene()).maximum * 0.45));
    ticks(game, 3);
    const dead = engines().filter((p) => p.state === 1);
    assert.equal(dead.length, 1, 'one engine is lost');
    assert.equal(dead[0].slot, 1, 'the one that took more hits');
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
        // The Sentinel slides on a vertical rail (P4.1).
        if (kind !== 0)
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
            if ((a >= ATTACK.aries && a <= ATTACK.pisces) || a === ATTACK.breath) seen.add(a);
        }
    }
    for (let sign = 0; sign < 12; sign++) assert(seen.has(ATTACK.aries + sign), `sign ${sign}`);
    assert(seen.has(ATTACK.breath), 'breath');
});

// ---------------------------------------------------------------- Zodiarch attacks (P2.3)
// Start attack `id` now, with no creatures or threats left over from the practice fight.
async function zodAttack(id, phase = 2, seed = 5) {
    const game = await phaseGame(5, phase, seed);
    ticks(game, ENTRANCE);
    set(game, 8, 0);
    set(game, 2, 0);
    set(game, 10, id);
    return game;
}

test("Zodiarch: every sign's first shot or wall leaves from its emitter on the creature", async () => {
    const cases = [
        [0, 'lane', ['horns'], { y: 0 }],
        [1, 'beam', ['eye']],
        [2, 'lane', ['hand', 'bHand']],
        [3, 'lane', ['clawNear', 'clawFar']],
        [4, 'ring', ['mouth']],
        [5, 'nova', ['wheat']],
        [6, 'pellet', ['panNear', 'panFar']],
        [7, 'arm', ['sting']],
        [8, 'aim', ['arrow']],
        [10, 'nova', ['urn']],
    ];
    for (const [sign, what, emitters, override = {}] of cases) {
        const game = await zodAttack(ATTACK.aries + sign);
        const old = new Set();
        let found = null;
        for (let i = 0; i < 50 * 4 && !found; i++) {
            game.step();
            const creature = bossParts(game.scene()).filter(
                (p) => p.kind === PART.sign && p.slot === sign && p.state === 1,
            );
            const items =
                what in HAZARD
                    ? bossHazards(game.scene()).filter((h) => h.kind === HAZARD[what])
                    : bossShots(game.scene()).filter((s) => s.family === SHOT[what]);
            for (const it of items) {
                if (i === 0) old.add(it.index);
                else if (!old.has(it.index) && creature.length) found = { it, creature };
            }
        }
        assert(found, `${sign}: no ${what} appeared`);
        const { it, creature } = found;
        const near = creature.some((c) =>
            emitters.some((name) => {
                const [dx, dy] = SIGN_EMIT[sign][name];
                const ex = c.x + dx,
                    ey = c.y + ('y' in override ? override.y : dy);
                return Math.hypot(it.x - ex, it.y - ey) <= (what === 'nova' ? 12 : 8); // a nova has taken its first step
            }),
        );
        assert(
            near,
            `${sign}: ${what} at ${Math.round(it.x)},${Math.round(it.y)}, creature at ${Math.round(creature[0].x)},${Math.round(creature[0].y)}`,
        );
    }
});

test('Zodiarch: Aries, Taurus and Leo charge all the way off the screen', async () => {
    for (const sign of [0, 1, 4]) {
        const game = await zodAttack(ATTACK.aries + sign);
        let least = 999,
            lane = 0;
        for (let i = 0; i < 50 * 7; i++) {
            game.step();
            const c = bossParts(game.scene()).find((p) => p.kind === PART.sign && p.slot === sign);
            if (c && c.state === 1) least = Math.min(least, c.x);
            for (const h of bossHazards(game.scene()))
                if (h.kind === HAZARD.lane && h.c >= 12) lane = Math.max(lane, h.b);
        }
        assert(least < -40, `${sign}: stopped at x ${Math.round(least)}`);
        assert(lane > 150, `${sign}: lane only ${Math.round(lane)} px`);
    }
});

test('Zodiarch: one sign out in phase 1, never more than two after, inside the caps', async () => {
    for (const [phase, limit] of [
        [1, 1],
        [2, 2],
        [3, 2],
    ]) {
        const game = await phaseGame(5, phase, 60 + phase);
        let most = 0;
        for (let i = 0; i < 50 * 60; i++) {
            game.step();
            const leads = new Set(
                bossParts(game.scene())
                    .filter((p) => p.kind === PART.sign && p.state !== 2)
                    .map((p) => p.slot),
            );
            most = Math.max(most, leads.size);
        }
        const stats = new Float32Array(game.api.memory.buffer, game.api.web_test_boss_stats(), 16);
        assert(most <= limit, `phase ${phase}: ${most} signs out`);
        if (phase > 1) assert(most >= limit, `phase ${phase}: never more than ${most} out`);
        assert.equal(stats[0], 0, 'no warning shorter than the minimum');
        assert(stats[2] <= 6, `lethal hazards ${stats[2]}`);
        assert(stats[4] >= 42, `corridor ${stats[4]}`);
    }
});

test('Zodiarch: a black hole pulls gently, swallows shots and leaves no scorch', async () => {
    const game = await zodAttack(ATTACK.blackHole, 3);
    let hole = null;
    // It settles before it throws (up to 1.6 s), then the 900 ms warning.
    for (let i = 0; i < 150 && !hole; i++) {
        game.step();
        hole = bossHazards(game.scene()).find(
            (h) => h.kind === HAZARD.pull && h.e === 1 && h.warn === 0,
        );
    }
    assert(hole, 'it opens');
    assert(hole.b <= 0.4 * 3.65625, 'full thrust escapes');
    assert(Math.hypot(hole.x - 90, hole.y - 135) > 100, 'well away from the pilot');
    const core = bossHazards(game.scene()).find((h) => h.kind === HAZARD.pool && h.e === 1);
    assert(core && core.c >= 18, 'a large core (P3.6)');
    for (let i = 0; i < 50 * 4; i++) game.step();
    assert(!bossHazards(game.scene()).some((h) => h.kind === HAZARD.burn), 'no scorch left');
});

test('Zodiarch: the coil-spit winds, settles facing the pilot and spits globs that burst in two', async () => {
    const game = await zodAttack(ATTACK.coilSpit, 1);
    let embers = 0,
        globs = 0,
        modes = new Set();
    for (let i = 0; i < 50 * 4; i++) {
        game.step();
        const shots = bossShots(game.scene());
        globs = Math.max(globs, shots.filter((s) => s.family === SHOT.fireball).length);
        embers = Math.max(embers, shots.filter((s) => s.family === SHOT.ember).length);
        modes.add(bossState(game.scene()).aux[15]);
    }
    assert(modes.has(9), 'it coils (ZM_COIL)');
    assert.equal(globs, 9, 'three streams of three globs in phase 1');
    assert(embers >= 12 && embers <= 18, `${embers} embers`);
});

// ---------------------------------------------------------------- the living dragon (P3)
const ZM = { face: 7, hold: 8, coil: 9, lunge: 10 };
const bend = (a, b, c) => {
    const u = Math.atan2(b.y - a.y, b.x - a.x),
        v = Math.atan2(c.y - b.y, c.x - b.x);
    return angleError(u, v);
};

test('Zodiarch: its body only ever curves, and it does not swim the same loop', async () => {
    const game = await phaseGame(5, 2, 11);
    const bot = new BossBot(game);
    ticks(game, ENTRANCE);
    let worst = 0;
    const cells = new Set(),
        trail = [];
    for (let i = 0; i < 50 * 90; i++) {
        bot.step();
        const state = bossState(game.scene());
        if (!state.active) break;
        if (i % 5) continue;
        const segs = body(game).slice(2, 28);
        if (state.aux[15] !== ZM.lunge)
            for (let k = 1; k + 1 < segs.length; k++)
                worst = Math.max(worst, bend(segs[k - 1], segs[k], segs[k + 1]));
        cells.add(`${Math.floor((state.x - 300) / 20)},${Math.floor((state.y - 55) / 20)}`);
        trail.push([Math.round(state.x / 8), Math.round(state.y / 8)]);
    }
    // Neighbouring segments turn at most 40 degrees (a 26 px turn at low speed plus the wave);
    // the old figure of eight folded the neck by 110 to 180.
    assert(
        worst < (40 * Math.PI) / 180,
        `sharpest bend ${Math.round((worst * 180) / Math.PI)} degrees`,
    );
    assert(cells.size >= 25, `the head visited ${cells.size} cells of the swim box`);
    // No 16 s stretch repeats the one before it (the old figure of eight did, exactly).
    const period = (16 * 50) / 5;
    let same = 0;
    for (let i = period; i < trail.length; i++)
        same += trail[i][0] === trail[i - period][0] && trail[i][1] === trail[i - period][1];
    assert(same < 0.2 * (trail.length - period), `${same} repeats`);
});

test('Zodiarch: it faces the pilot and settles before an attack from its head', async () => {
    const game = await zodAttack(ATTACK.eyes, 2);
    let beam = null;
    for (let i = 0; i < 50 * 3 && !beam; i++) {
        game.step();
        beam = bossHazards(game.scene()).find((h) => h.kind === HAZARD.beam);
    }
    assert(beam, 'the eye laser comes');
    const state = bossState(game.scene());
    assert(Math.cos(state.aux[12]) < 0, 'facing left, toward the pilot');
    assert(state.aux[13] < 0.12, 'stopped');
    const before = [state.x, state.y];
    ticks(game, 20);
    const after = bossState(game.scene());
    assert(
        Math.hypot(after.x - before[0], after.y - before[1]) < 0.5,
        'and holds still while it is warned',
    );
});

test('Zodiarch: the lunge strikes down a warned lane, then the pearl surfaces on its neck', async () => {
    const game = await zodAttack(ATTACK.lunge, 2);
    let lane = null,
        reach = 999,
        opened = false;
    for (let i = 0; i < 50 * 5; i++) {
        game.step();
        const state = bossState(game.scene());
        lane ??= bossHazards(game.scene()).find((h) => h.kind === HAZARD.lane && h.warn > 0);
        if (state.attack === ATTACK.lunge) reach = Math.min(reach, state.x);
        if (state.attack === ATTACK.lunge && state.aux[1] > 0.5 && state.aux[2] === 8)
            opened = true;
    }
    assert(lane, 'a lane is warned');
    assert(lane.warnTotal >= 900, 'for 900 ms');
    assert(reach < 216 + 72, `the head strikes out to x ${Math.round(reach)}`);
    assert(reach - 80 >= 119, 'never past x 120 at the snout');
    assert(opened, 'the pearl opens on the neck while it is stretched out');
});

test('Zodiarch: the pearl sits in its forehead; closed, its brow scales stop shots (with a spark)', async () => {
    const game = await phaseGame(5, 1, 3);
    ticks(game, ENTRANCE);
    set(game, 8, 0);
    set(game, 2, 0);
    set(game, 11, 1e9); // no attacks
    const state = bossState(game.scene());
    const h = state.aux[12],
        right = Math.cos(h) > 0,
        r = right ? h : h - Math.PI,
        lx = right ? 27 : -27;
    const bx = state.x + lx * Math.cos(r) + 17 * Math.sin(r),
        by = state.y + lx * Math.sin(r) - 17 * Math.cos(r);
    assert(Math.hypot(state.aux[4] - bx, state.aux[5] - by) < 1, 'the pearl is at the brow');
    // Wait for a closed moment, then shoot it.
    until(game, (s) => s.aux[1] < 0.5 && s.aux[14] === 0, 600);
    const hp = bossState(game.scene()).health;
    const s2 = bossState(game.scene());
    shoot(game, { x: s2.aux[4], y: s2.aux[5] }, 2);
    assert.equal(bossState(game.scene()).health, hp, 'a closed pearl is not hurt');
    const blocks = game.scene().subarray(600 + 948, 600 + 964);
    assert(
        [3, 7, 11, 15].some((i) => blocks[i] >= 0),
        'the stopped shot shows a spark',
    );
});

test('Zodiarch: its own attacks bring the pearl up where they come from, after a 600 ms tell', async () => {
    const where = [
        [ATTACK.eyes, -1],
        [ATTACK.coilSpit, 3],
        [ATTACK.lunge, 8],
        [ATTACK.novaStars, 15],
        [ATTACK.meteors, 23],
    ];
    for (const [id, section] of where) {
        const game = await zodAttack(id);
        let tell = 0,
            open = 0,
            at = null;
        for (let i = 0; i < 50 * 6; i++) {
            set(game, 11, 1e9); // nothing after this one
            game.step();
            const a = bossState(game.scene()).aux;
            if (a[14] < 0) tell++;
            if (a[14] > 0 && a[1] > 0.5) {
                open = Math.max(open, a[14]);
                at ??= { section: a[2], x: a[4], y: a[5] };
            }
        }
        assert(tell >= 25 && tell <= 32, `${id}: ${tell} ticks of tell`);
        assert(open > 0.95, `${id}: the time left starts full`);
        assert.equal(at.section, section, `${id}: surfaces at ${section}`);
        const shut = bossState(game.scene()).aux;
        assert(shut[1] < 0.5 && shut[2] === -1, `${id}: then sinks back to the forehead`);
    }
});

test('Zodiarch: with no attack of its own the pearl stays shut', async () => {
    const game = await phaseGame(5, 1, 3);
    ticks(game, ENTRANCE);
    set(game, 11, 1e9);
    for (let i = 0; i < 50 * 9; i++) {
        game.step();
        assert(bossState(game.scene()).aux[1] < 0.5);
    }
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
    // They run out of the cocoon at their own pace and have all sat down by 1400 ms.
    until(game, (state) => state.attack === ATTACK.illusion && state.attackMs >= 1400, 2000);
    const decoys = bossParts(game.scene()).filter((p) => p.kind === PART.decoy);
    assert.equal(decoys.length, 2);
    // Three smaller foxes, spread apart and wholly on screen (a fox at .6 size spans about
    // -48..+45 vertically from its centre).
    const fox = bossState(game.scene());
    const centres = [{ x: fox.x, y: fox.y }, ...decoys];
    for (const c of centres)
        assert(c.y - 48 >= 0 && c.y + 45 <= 270 && c.x - 45 >= 216, `fox at ${c.x},${c.y}`);
    for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++)
            assert(
                Math.hypot(centres[i].x - centres[j].x, centres[i].y - centres[j].y) > 70,
                'spread apart',
            );
    const s = NINEFOLD.illusionScale;
    for (const d of decoys)
        shoot(
            game,
            { x: d.x + NINEFOLD.body[0] * s, y: d.y + NINEFOLD.body[1] * s, index: d.index },
            3,
            { from: 80 },
        );
    assert.equal(bossParts(game.scene()).filter((p) => p.kind === PART.decoy).length, 0);
    assert(bossState(game.scene()).aux[2] > 0.5, 'seen through: the forehead opens');
    until(game, (state) => state.aux[1] > 0.5, 2000);
    assert.equal(body(game).length, 0, 'gone while it blinks');
});

test('Zodiarch: a surfaced pearl is always on the screen', async () => {
    for (const id of [ATTACK.meteors, ATTACK.novaStars, ATTACK.coilSpit]) {
        const game = await zodAttack(id);
        for (let i = 0; i < 50 * 5; i++) {
            set(game, 11, 1e9);
            game.step();
            const a = bossState(game.scene()).aux;
            if (a[1] > 0.5)
                assert(
                    a[4] <= 466 && a[5] >= 14 && a[5] <= 256,
                    `${id}: pearl at ${a[4]}, ${a[5]}`,
                );
        }
    }
});

test('Zodiarch: the starfire breath only fires head on, straight out of its mouth at the pilot', async () => {
    let fired = 0;
    for (const [px, py] of [
        [90, 40],
        [90, 230],
        [200, 135],
    ]) {
        const game = await phaseGame(5, 3, 5);
        ticks(game, ENTRANCE);
        set(game, 8, 0);
        set(game, 2, 0);
        set(game, 3, px);
        set(game, 4, py);
        game.step();
        set(game, 10, ATTACK.breath);
        let lanes = [],
            heading = 0;
        for (let i = 0; i < 50 * 4 && !lanes.length; i++) {
            set(game, 3, px);
            set(game, 4, py);
            set(game, 11, 1e9);
            game.step();
            lanes = bossHazards(game.scene()).filter((h) => h.kind === HAZARD.lane);
            heading = bossState(game.scene()).aux[12];
        }
        if (!lanes.length) continue; // it could not come round: no breath at all
        fired++;
        const mid = lanes[1];
        const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
        const to = Math.atan2(py - mid.y, px - mid.x);
        assert(Math.abs(wrap(mid.a - heading)) < 0.01, 'down the line the head points');
        assert(Math.abs(wrap(mid.a - to)) < 0.35, `at the pilot (${px}, ${py})`);
    }
    assert.equal(fired, 3, 'it comes round to face the pilot each time');
});

// ---------------------------------------------------------------- Ninefold's footwork (P2.1)
const PERCH_X = [300, 320, 340],
    PERCH_Y = [92, 140, 188];
test('Ninefold: it moves perch to perch between attacks, and sits still for each attack', async () => {
    const game = await practiceGame(11);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    const perches = new Set();
    let last = null,
        moves = 0;
    for (let i = 0; i < 50 * 40; i++) {
        game.step();
        const s = bossState(game.scene());
        const seated = (FOX_POSES[s.aux[6] | 0]?.name ?? '').startsWith('sit');
        if (seated && !s.attack && s.aux[5] === 1) {
            assert(
                PERCH_X.includes(Math.round(s.x)) && PERCH_Y.includes(Math.round(s.y)),
                `sits at ${s.x},${s.y}`,
            );
            perches.add(`${s.x},${s.y}`);
        }
        // Comets and foxfire are fired from where it sat down.
        if (s.attack === ATTACK.comets || s.attack === ATTACK.foxfire) {
            if (last && last.attack === s.attack)
                assert(last.x === s.x && last.y === s.y, 'still while it attacks');
        }
        if (last && !s.attack && (last.x !== s.x || last.y !== s.y) && !last.moving) moves++;
        last = {
            x: s.x,
            y: s.y,
            attack: s.attack,
            moving: last && (last.x !== s.x || last.y !== s.y),
        };
    }
    assert(perches.size >= 3, `sat on ${perches.size} perches`);
    assert(moves >= 4, `${moves} moves`);
});

test('Ninefold: its three foxes reach their places out of step', async () => {
    const game = await practiceGame(11);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    until(game, (s) => s.attack === ATTACK.illusion && s.attackMs >= 600, 3000);
    const arrived = new Map();
    for (let i = 0; i < 60; i++) {
        game.step();
        const s = bossState(game.scene());
        for (const d of bossParts(game.scene()).filter((p) => p.kind === PART.decoy))
            if (d.state === 0 && !arrived.has(d.index)) arrived.set(d.index, s.attackMs);
        if (
            s.aux[6] !== FOX_POSE['run-0'] &&
            !arrived.has('real') &&
            !FOX_POSES[s.aux[6] | 0].name.startsWith('run')
        )
            arrived.set('real', s.attackMs);
    }
    const times = [...arrived.values()];
    assert.equal(times.length, 3, 'all three arrive');
    assert.equal(new Set(times).size, 3, `different arrival times: ${times}`);
});
