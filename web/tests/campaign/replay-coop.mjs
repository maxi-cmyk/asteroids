import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { S } from '../../src/runtime/scene-layout.mjs';
import { playReplay, sceneHash } from '../../src/runtime/replay.mjs';
import { Pilot } from '../../src/demo/pilot.mjs';
import { STAR_CLEAR, STAR_LIVES } from '../../src/state/campaign-data.mjs';
import { bytes, memory, engine } from './harness.mjs';

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
