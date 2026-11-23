// Campaign Act 1 (nextSteps.md C1): the levels, clear and fail, the three stars, progress and
// its save, the returning-player rule, replays and co-op credit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime, SCORE_KEY } from '../src/runtime/runtime.mjs';
import { S } from '../src/runtime/scene-layout.mjs';
import { playReplay, sceneHash } from '../src/runtime/replay.mjs';
import { regionForWave } from '../src/render/regions.mjs';
import { KINDS, kindForWave } from '../src/boss/scene.mjs';
import { Pilot } from '../src/demo/pilot.mjs';
import {
    CAMPAIGN_KEY,
    LEVELS,
    LEVEL_COUNT,
    PAR_SECONDS,
    STAR_CLEAR,
    STAR_LIVES,
    STAR_PAR,
    clock,
    endlessForWave,
    floorForWave,
    mergeProfiles,
    normalizeProfile,
    starCount,
    starsEarned,
} from '../src/state/campaign-data.mjs';
import { CampaignProgress } from '../src/state/campaign.mjs';
import { PersonalBests, clearBrowserRecords, rulesKey } from '../src/state/records.mjs';
import { mergeSaves, parseSave, readSave, writeSave, saveFileText } from '../src/state/save.mjs';

const bytes = await readFile(new URL('../dist/game.wasm', import.meta.url));
const memory = () => {
    const values = new Map();
    return {
        getItem: (k) => values.get(k) ?? null,
        setItem: (k, v) => values.set(k, String(v)),
        removeItem: (k) => values.delete(k),
        keys: () => [...values.keys()],
    };
};
const seeded = (seed) => {
    let s = seed >>> 0;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0);
};
const engine = (storage = memory(), seed = 7, profile = 0) =>
    createRuntime(bytes, { storage, random: seeded(seed), profile: () => profile });

// Flies the running level with the scripted pilot (or leaves the ship idle) until its result.
function fly(game, { idle = false, limit = 30000 } = {}) {
    const pilot = new Pilot(game);
    for (let i = 0; i < limit && game.state !== 'results'; i++)
        game.step(game.state === 'playing' && !idle ? pilot.decide(game.scene()) : {});
    return game.result;
}

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
    const testBytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
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

// ---------------------------------------------------------------- progress
test('level 1 is open, each clear opens the next, and clearing level 6 opens Endless', () => {
    const progress = new CampaignProgress(memory());
    assert.equal(progress.openLevels(0), 1);
    assert.ok(progress.isOpen(0, 1) && !progress.isOpen(0, 2));
    assert.equal(progress.endlessOpen(0), false);
    const clear = { cleared: true, timeMs: 60000, score: 5000, livesRemaining: 3 };
    for (let level = 1; level <= 5; level++) {
        progress.record(0, level, clear);
        assert.equal(progress.openLevels(0), level + 1);
        assert.equal(progress.endlessOpen(0), false);
    }
    assert.ok(!progress.act1Done(0));
    const last = progress.record(0, 6, clear);
    assert.ok(last.firstClear && progress.act1Done(0) && progress.endlessOpen(0));
    assert.equal(progress.totalStars(0), 6 * 3 /* every level flawless and under par */);
    // Profiles are separate.
    assert.equal(progress.openLevels(1), 1);
    assert.equal(progress.endlessOpen(1), false);
    // A level that is not open, or not a level, cannot be recorded or opened.
    assert.equal(progress.isOpen(0, 0), false);
    assert.equal(progress.isOpen(0, 7), false);
    assert.equal(progress.record(0, 9, clear).cleared, false);
});

test('a failed level changes nothing; a clear keeps the best stars, the lowest time and the highest score', () => {
    const storage = memory();
    const progress = new CampaignProgress(storage);
    assert.equal(
        progress.record(0, 1, { cleared: false, timeMs: 0, score: 9999, livesRemaining: 0 })
            .cleared,
        false,
    );
    assert.equal(storage.getItem(CAMPAIGN_KEY), null, 'nothing was written');
    const first = progress.record(0, 1, {
        cleared: true,
        timeMs: 100000,
        score: 4000,
        livesRemaining: 1,
    });
    assert.ok(first.firstClear && first.betterTime && first.betterScore);
    assert.equal(first.newStars, STAR_CLEAR);
    const second = progress.record(0, 1, {
        cleared: true,
        timeMs: 70000,
        score: 3000,
        livesRemaining: 3,
    });
    assert.ok(!second.firstClear && second.betterTime && !second.betterScore);
    assert.equal(second.newStars, STAR_LIVES | STAR_PAR);
    assert.deepEqual(progress.best(0, 1), { stars: 7, bestMs: 70000, bestScore: 4000 });
    // A worse run later takes nothing away.
    const third = progress.record(0, 1, {
        cleared: true,
        timeMs: 200000,
        score: 100,
        livesRemaining: 0,
    });
    assert.equal(third.newStars, 0);
    assert.deepEqual(progress.best(0, 1), { stars: 7, bestMs: 70000, bestScore: 4000 });
    // It survives a reload, and a broken value in storage is dropped rather than trusted.
    assert.deepEqual(new CampaignProgress(storage).best(0, 1), progress.best(0, 1));
    storage.setItem(
        CAMPAIGN_KEY,
        '{"version":1,"profiles":[{"levels":{"1":{"stars":99},"x":{}}},7]}',
    );
    assert.equal(new CampaignProgress(storage).stars(0, 1), 0);
    storage.setItem(CAMPAIGN_KEY, 'not json');
    assert.equal(new CampaignProgress(storage).openLevels(0), 1);
});

test('a storage failure keeps the progress for this visit and says so', () => {
    const storage = memory();
    storage.setItem = () => {
        throw new Error('full');
    };
    const progress = new CampaignProgress(storage);
    const result = progress.record(0, 1, {
        cleared: true,
        timeMs: 1000,
        score: 1,
        livesRemaining: 3,
    });
    assert.equal(result.saved, false);
    assert.ok(progress.cleared(0, 1));
});

// ---------------------------------------------------------------- returning players
test('a returning player’s earlier waves open levels (no stars), and wave 30 opens Endless', () => {
    assert.deepEqual(
        [1, 5, 6, 10, 11, 25, 26, 30, 31].map(floorForWave),
        [1, 1, 2, 2, 3, 5, 6, 6, 6],
    );
    assert.deepEqual([29, 30, 31].map(endlessForWave), [false, true, true]);
    const records = new PersonalBests(memory());
    const best = (wave, practice = false) => ({ score: 1, wave, peakCps: 1, longestChain: 1 });
    records.profiles[0][rulesKey({ mode: 'solo' })] = best(12);
    records.profiles[1][rulesKey({ mode: 'solo' })] = best(30);
    // Practice never counts, whatever wave it reached.
    records.profiles[0][rulesKey({ mode: 'solo', practice: true })] = best(30);
    const storage = memory();
    const progress = new CampaignProgress(storage, records);
    assert.equal(progress.openLevels(0), 3, 'wave 12 is past the level 2 boss');
    assert.equal(progress.endlessOpen(0), false);
    assert.equal(progress.openLevels(1), 6);
    assert.equal(progress.endlessOpen(1), true);
    assert.equal(progress.totalStars(0) + progress.totalStars(1), 0, 'no stars are given');
    // What was opened stays open after the records are cleared.
    const clearedRecords = new PersonalBests(memory());
    const later = new CampaignProgress(storage, clearedRecords);
    assert.equal(later.openLevels(0), 3);
    assert.equal(later.endlessOpen(1), true);
    // A new player has the same single open level as before.
    assert.equal(new CampaignProgress(memory(), new PersonalBests(memory())).openLevels(0), 1);
});

test('Clear this browser’s records also clears the campaign', () => {
    const storage = memory();
    new CampaignProgress(storage).record(0, 1, {
        cleared: true,
        timeMs: 1,
        score: 1,
        livesRemaining: 3,
    });
    assert.ok(storage.getItem(CAMPAIGN_KEY));
    assert.ok(clearBrowserRecords(storage, SCORE_KEY).ok);
    assert.equal(new CampaignProgress(storage).stars(0, 1), 0);
});

// ---------------------------------------------------------------- the save
test('campaign progress is part of the save: it round-trips, merges and tolerates old saves', () => {
    const a = memory(),
        b = memory();
    const pa = new CampaignProgress(a),
        pb = new CampaignProgress(b);
    pa.record(0, 1, { cleared: true, timeMs: 90000, score: 1000, livesRemaining: 2 });
    pb.record(0, 1, { cleared: true, timeMs: 60000, score: 800, livesRemaining: 3 });
    pb.record(0, 2, { cleared: true, timeMs: 80000, score: 900, livesRemaining: 1 });
    pb.record(1, 1, { cleared: true, timeMs: 70000, score: 700, livesRemaining: 3 });
    const saveA = readSave(a),
        saveB = readSave(b);
    assert.equal(saveA.campaign[0].levels[1].stars, STAR_CLEAR);
    const merged = mergeSaves(saveA, saveB);
    assert.deepEqual(merged.campaign[0].levels[1], { stars: 7, bestMs: 60000, bestScore: 1000 });
    assert.ok(merged.campaign[0].levels[2] && merged.campaign[1].levels[1]);
    // Merging twice changes nothing.
    assert.deepEqual(mergeSaves(merged, saveB).campaign, merged.campaign);
    // Written to a fresh browser, it reads back the same.
    const target = memory();
    assert.ok(writeSave(target, merged));
    assert.deepEqual(readSave(target).campaign, merged.campaign);
    assert.equal(new CampaignProgress(target).stars(0, 1), 7);
    // The exported file parses back to the same progress.
    const parsed = parseSave(saveFileText(merged));
    assert.deepEqual(parsed.campaign, merged.campaign);
    // A save from before the campaign has no such part and reads as no progress.
    const old = JSON.parse(saveFileText(merged));
    delete old.campaign;
    const oldParsed = parseSave(JSON.stringify(old));
    assert.deepEqual(
        oldParsed.campaign.map((p) => Object.keys(p.levels).length),
        [0, 0],
    );
});

test('progress is validated and merged without losing anything', () => {
    assert.deepEqual(normalizeProfile(null), { floor: 1, endless: false, levels: {} });
    const messy = normalizeProfile({
        floor: 99,
        endless: 'yes',
        levels: {
            1: { stars: 3, bestMs: -5, bestScore: 'x' },
            2: { stars: 6 },
            9: { stars: 7 },
            3: 'no',
        },
    });
    assert.equal(messy.floor, 1);
    assert.equal(messy.endless, false);
    assert.deepEqual(Object.keys(messy.levels), ['1'], 'only cleared, real levels remain');
    assert.deepEqual(messy.levels[1], { stars: 3, bestMs: 0, bestScore: 0 });
    const merged = mergeProfiles(
        { floor: 3, endless: false, levels: { 1: { stars: 1, bestMs: 0, bestScore: 5 } } },
        { floor: 2, endless: true, levels: { 1: { stars: 4 | 1, bestMs: 50000, bestScore: 2 } } },
    );
    assert.equal(merged.floor, 3);
    assert.equal(merged.endless, true);
    assert.deepEqual(merged.levels[1], { stars: 5, bestMs: 50000, bestScore: 5 });
});

// ---------------------------------------------------------------- replays
test('a level is one short replay that plays back to the same scenes', async () => {
    const game = await createRuntime(bytes, { storage: memory() });
    game.startLevel(2, { seed: '0123456789abcdef0123456789abcdef' });
    const pilot = new Pilot(game);
    const live = [];
    for (let i = 0; i < 30000 && game.state !== 'results'; i++) {
        game.step(game.state === 'playing' ? pilot.decide(game.scene()) : {});
        live.push(sceneHash(game.host.memory, game.api.web_scene()));
    }
    const replay = JSON.parse(JSON.stringify(game.replay));
    assert.equal(replay.rules.level, 2);
    assert.equal(replay.rules.mode, 'solo');
    const played = await playReplay(bytes, replay);
    assert.equal(played.ticks, live.length);
    assert.equal(
        played.hashes.findIndex((h, i) => h !== live[i]),
        -1,
        'the replay matches the live level tick for tick',
    );
    // The level shows in the replayed engine's scene too.
    const scene = new Float32Array(played.host.memory.buffer, played.host.api.web_scene(), 1580);
    assert.equal(scene[S.LEVEL_INDEX], 2);
    assert.equal(scene[S.LEVEL_CLEARED], 1);
});

// ---------------------------------------------------------------- co-op
test('a co-op level credits both profiles, each with its own stars', async () => {
    const storage = memory();
    const game = await engine(storage, 21);
    game.startLevel(1, { profiles: [0, 1], friendlyFire: false });
    assert.ok(game.coop, 'a co-op run');
    assert.equal(game.scene()[S.LEVEL_INDEX], 1);
    assert.equal(game.scene()[S.WAVE], 1);
    const pilot = new Pilot(game);
    for (let i = 0; i < 40000 && game.state !== 'results'; i++) {
        const players = game.coopPlayers();
        game.step({
            players: [pilot.decide(players[0].scene), {}], // player two never touches a control
        });
    }
    assert.equal(game.state, 'results');
    const result = game.result;
    assert.ok(result.players && result.levelRun.cleared, 'the team cleared the level');
    const [one, two] = result.levelRun.pilots;
    assert.deepEqual([one.profile, two.profile], [0, 1]);
    // Player two lost every life while player one carried the level.
    assert.equal(two.livesLost, 3);
    assert.deepEqual(
        result.levelRun.livesRemaining,
        game.coopPlayers().map((p) => p.lives),
    );
    assert.equal(two.stars & STAR_LIVES, 0, 'no flawless star for the pilot who was lost');
    assert.ok(two.stars & STAR_CLEAR, 'but the level counts for them');
    assert.ok(one.stars & STAR_CLEAR);
    assert.equal(game.campaign.cleared(0, 1), true);
    assert.equal(game.campaign.cleared(1, 1), true);
    assert.equal(game.campaign.openLevels(1), 2);
    // No co-op leaderboard entry, no Endless record for either pilot.
    assert.deepEqual(game.records.profiles, [{}, {}]);
    assert.ok(!storage.keys().some((key) => key.includes('coop-scores')));
    // Continue does nothing on a level result; Retry keeps the same two pilots.
    game.continueResults();
    assert.equal(game.state, 'results');
    game.restartLevel();
    assert.ok(game.coop && game.level.profiles.join() === '0,1');
    assert.equal(game.scene()[S.LEVEL_INDEX], 1);
});

test('a co-op level that is lost goes to the level result, not the initials entry', async () => {
    const game = await engine(memory(), 9);
    game.startLevel(2, { profiles: [0, 1] });
    for (let i = 0; i < 40000 && game.state !== 'results'; i++) game.step({ players: [{}, {}] });
    assert.equal(game.state, 'results');
    assert.equal(game.result.levelRun.cleared, false);
    assert.equal(game.coop.phase, 'results');
    assert.deepEqual(game.result.levelRun.livesLost, [3, 3]);
});
