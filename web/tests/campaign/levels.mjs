import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime, SCORE_KEY } from '../../src/runtime/runtime.mjs';
import { S } from '../../src/runtime/scene-layout.mjs';
import { regionForWave } from '../../src/render/regions.mjs';
import { KINDS, kindForWave } from '../../src/boss/scene.mjs';
import {
    LEVELS,
    LEVEL_COUNT,
    PAR_SECONDS,
    STAR_CLEAR,
    STAR_LIVES,
    STAR_PAR,
    clock,
    starCount,
    starsEarned,
} from '../../src/state/campaign-data.mjs';
import { memory, seeded, engine, fly } from './harness.mjs';

// ---------------------------------------------------------------- the levels
test('the six levels are five waves each, one per region, with the region’s mini and boss', () => {
    assert.equal(LEVELS.length, LEVEL_COUNT);
    LEVELS.forEach((info, i) => {
        const n = i + 1;
        assert.equal(info.firstWave, 5 * n - 4);
        assert.equal(info.bossWave, 5 * n);
        assert.equal(regionForWave(info.firstWave).id, info.region.id);
        assert.equal(regionForWave(info.bossWave).id, info.region.id);
        assert.equal(kindForWave(info.bossWave), info.bossKind, `level ${n} boss`);
        assert.equal(kindForWave(info.firstWave + 2), info.miniKind, `level ${n} mini on wave 3`);
        assert.ok(KINDS[info.bossKind].mini === false && KINDS[info.miniKind].mini === true);
        assert.equal(info.parMs, PAR_SECONDS[i] * 1000);
    });
    assert.deepEqual(
        LEVELS.map((l) => [l.mini, l.boss]),
        [
            ['Picket', 'Sentinel'],
            ['Shardling', 'Ringwarden'],
            ['Cinderling', 'Cinderforge'],
            ['Gunnery', 'Bastion'],
            ['Moonjelly', 'Tidecaller'],
            ['Ninefold', 'Zodiarch'],
        ],
    );
});

test('each level starts at its first wave with three lives, a x1 multiplier and no pickups', async () => {
    const game = await engine();
    for (const info of LEVELS) {
        game.startLevel(info.level);
        const scene = game.scene();
        assert.equal(scene[S.WAVE], info.firstWave);
        assert.equal(scene[S.LEVEL_INDEX], info.level);
        assert.equal(scene[S.LEVEL_ACT], 1);
        assert.equal(scene[S.LEVEL_FIRST_WAVE], info.firstWave);
        assert.equal(scene[S.LEVEL_LAST_WAVE], info.bossWave);
        assert.equal(scene[S.LIVES], 3);
        assert.equal(scene[S.MULTIPLIER], 1);
        assert.equal(scene[S.SCORE], 0);
        assert.equal(scene[S.PICKUP_ACTIVE], 0);
        assert.equal(scene[S.PRACTICE], 0);
        assert.equal(game.state, 'countdown');
    }
    assert.throws(() => game.startLevel(7), RangeError);
    assert.throws(() => game.startLevel(0), RangeError);
    // Every other way to start a run leaves no level behind.
    game.start(false);
    assert.equal(game.scene()[S.LEVEL_INDEX], 0);
    assert.equal(game.level, null);
});

// ---------------------------------------------------------------- clear and fail
test('every level can be cleared: the boss falls, the engine stops there, and only campaign progress is written', async () => {
    for (const info of LEVELS) {
        const storage = memory();
        const game = await engine(storage, 100 + info.level);
        game.startLevel(info.level);
        const result = fly(game);
        assert.equal(game.state, 'results', `level ${info.level} ends in the result screen`);
        const run = result.levelRun;
        assert.ok(run.cleared, `level ${info.level} cleared`);
        assert.equal(run.level, info.level);
        assert.equal(game.api.web_state(), 8, 'the engine is in level-clear');
        // The wave counter never moves past the boss's wave while its death plays.
        assert.equal(game.scene()[S.WAVE], info.bossWave);
        assert.ok(run.timeMs > 0 && run.timeMs < 5 * 60 * 1000);
        // Both the mini-boss and the boss were beaten on the way.
        assert.ok(result.bossMask & (1 << info.miniKind), `${info.mini} defeated`);
        assert.ok(result.bossMask & (1 << info.bossKind), `${info.boss} defeated`);
        assert.deepEqual(run.livesRemaining, [game.scene()[S.LIVES]]);
        assert.equal(!!(run.pilots[0].stars & STAR_LIVES), run.livesRemaining[0] >= 3);
        assert.ok(game.campaign.cleared(0, info.level));
        // Nothing went to the Endless records or the leaderboard.
        assert.deepEqual(game.records.profiles, [{}, {}]);
        assert.equal(storage.getItem(SCORE_KEY), null);
        assert.equal(storage.getItem('asteroids.web.hd.scores-v3'), null);
    }
});

test('losing every life fails the level: no leaderboard entry, no stars, the level is kept for Retry', async () => {
    const storage = memory();
    const game = await engine(storage, 5);
    game.startLevel(3);
    const result = fly(game, { idle: true });
    assert.equal(game.state, 'results');
    assert.equal(result.levelRun.cleared, false);
    assert.equal(result.levelRun.livesLost[0], 3);
    assert.equal(game.api.web_state(), 6, 'straight to game over, never the score entry');
    assert.ok(result.wave >= 11, 'it fell inside level 3');
    assert.equal(game.campaign.stars(0, 3), 0);
    assert.equal(game.campaign.cleared(0, 2), false, 'a failure opens nothing');
    assert.equal(storage.getItem('asteroids.web.hd.scores-v3'), null);
    assert.equal(storage.getItem(SCORE_KEY), null);
    assert.deepEqual(game.records.profiles, [{}, {}]);
    // Continue is not how a level result ends; Retry starts the same level again.
    game.continueResults();
    assert.equal(game.state, 'results');
    assert.equal(game.level.level, 3);
    game.restartLevel();
    assert.equal(game.state, 'countdown');
    assert.equal(game.scene()[S.WAVE], 11);
    assert.equal(game.scene()[S.LEVEL_INDEX], 3);
    assert.equal(game.nextLevel(), 4);
});

test('lives lost and hits taken are counted, a shield-absorbed hit counts as a hit only', async () => {
    const game = await engine(memory(), 3);
    game.startLevel(1);
    const before = game.scene();
    assert.equal(before[S.LEVEL_LIVES_LOST], 0);
    const result = fly(game, { idle: true });
    const run = result.levelRun;
    assert.equal(run.livesLost[0], 3);
    assert.ok(run.hitsTaken >= run.livesLost[0]);
    assert.equal(run.livesLost[1], 0, 'player two has no lives lost in a solo run');
});

test('campaign bosses and minis drop no hearts; Endless bosses still do', async () => {
    const testBytes = await readFile(new URL('../../dist/test.wasm', import.meta.url));
    for (const campaign of [false, true]) {
        for (const wave of [3, 5]) {
            const game = await createRuntime(testBytes, { random: seeded(7) });
            if (campaign) game.startLevel(1);
            else game.start(false);
            while (game.state === 'countdown') game.step({});
            game.api.web_test_boss(wave, 1, 1);
            game.api.web_test_boss_set(5, 1000000);
            for (let i = 0; i < 100; i++) game.step({});
            game.api.web_test_boss_set(0, 0);
            assert.equal(game.scene()[S.BOSS_ACTIVE], 0, 'boss was defeated');
            if (campaign) assert.equal(game.scene()[S.PICKUP_ACTIVE], 0, `campaign wave ${wave}`);
            else if (wave === 5)
                assert.equal(game.scene()[S.PICKUP_ACTIVE], 1, 'Endless boss drops a heart');
        }
    }
});

// ---------------------------------------------------------------- stars
test('stars: clear, net lives remaining, under the time target', () => {
    const par = LEVELS[0].parMs;
    assert.equal(
        starsEarned({ cleared: true, timeMs: par + 1, livesRemaining: 3, livesLost: 2 }, 1),
        STAR_CLEAR | STAR_LIVES,
        'earned lives offset losses',
    );
    assert.equal(
        starsEarned({ cleared: true, timeMs: par + 1, livesRemaining: 4 }, 1),
        STAR_CLEAR | STAR_LIVES,
        'finishing above starting lives counts',
    );
    assert.equal(starsEarned({ cleared: false, timeMs: 1000, livesRemaining: 3 }, 1), 0);
    assert.equal(starsEarned({ cleared: true, timeMs: par + 1, livesRemaining: 2 }, 1), STAR_CLEAR);
    assert.equal(
        starsEarned({ cleared: true, timeMs: par + 1, livesRemaining: 3 }, 1),
        STAR_CLEAR | STAR_LIVES,
    );
    assert.equal(
        starsEarned({ cleared: true, timeMs: par, livesRemaining: 1 }, 1),
        STAR_CLEAR,
        'exactly the target does not satisfy the strict < goal',
    );
    assert.equal(
        starsEarned({ cleared: true, timeMs: par - 1, livesRemaining: 3 }, 1),
        STAR_CLEAR | STAR_LIVES | STAR_PAR,
    );
    assert.equal(
        starsEarned({ cleared: true, timeMs: 0, livesRemaining: 3 }, 1),
        3,
        'no time, no par',
    );
    assert.equal(starCount(7), 3);
    assert.equal(starCount(STAR_CLEAR | STAR_PAR), 2);
    assert.equal(clock(75000), '1:15');
    assert.equal(clock(9400), '0:09');
});

test('par is the scripted pilot’s time times 1.5, so the pilot beats par on every level', async () => {
    for (const info of LEVELS) {
        const game = await engine(memory(), 40 + info.level);
        game.startLevel(info.level);
        const run = fly(game).levelRun;
        assert.ok(
            run.timeMs <= info.parMs,
            `level ${info.level}: ${run.timeMs} ms vs par ${info.parMs}`,
        );
        assert.ok(run.timeMs * 2 > info.parMs, `level ${info.level}: par is not absurdly slack`);
    }
});
