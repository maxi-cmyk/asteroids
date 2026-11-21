// The Sentinel (P4.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    ENTRANCE,
    KINDS,
    PART,
    bossParts,
    bossState,
    newGame,
    practiceGame,
    set,
    shoot,
    ticks,
    until,
    waveGame,
} from './harness.mjs';

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
