// The Cinderforge (P4.3).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    ENTRANCE,
    ENTRANCE_TICKS,
    HAZARD,
    KINDS,
    SHOT,
    bossHazards,
    bossShots,
    bossState,
    newGame,
    phaseGame,
    practiceGame,
    set,
    shoot,
    ticks,
    until,
} from './harness.mjs';

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
