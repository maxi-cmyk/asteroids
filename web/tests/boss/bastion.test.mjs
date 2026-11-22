// The Bastion (P4.4).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    ENTRANCE,
    HAZARD,
    KINDS,
    PART,
    SHOT,
    bossHazards,
    bossPart,
    bossParts,
    bossShots,
    bossState,
    practiceGame,
    set,
    shoot,
    ticks,
    until,
} from './harness.mjs';

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
    assert(
        Math.abs(lane.y - 60) <= 46,
        `near the pilot’s row (lane ${Math.round(lane.y)}, pilot 60)`,
    );
    const slope = Math.tan(lane.a - Math.PI); // dy per px travelled left
    const laneAt = (x) => lane.y + slope * (lane.x - x);
    until(game, (state) => state.attackMs >= 1800, 100);
    const b = bossState(game.scene());
    assert(b.x < 200, `it is crossing the field (x ${Math.round(b.x)})`);
    assert(Math.abs(b.y - laneAt(b.x)) < 2, 'along the lane');
    assert(b.aux[KINDS[3].aux.thrust] > 0.8, 'engines blazing');
    const debris = bossShots(game.scene()).filter((s) => s.family === SHOT.pellet).length;
    assert(debris > 0, 'a wake of debris');
    until(game, (state) => state.attack !== ATTACK.ram, 400);
    ticks(game, 2);
    assert(Math.abs(bossState(game.scene()).x - 324) < 30, 'and it is home again');
});

// It used to ram one of two fixed lanes, always level, and only ever list nose-up.
test('the Bastion varies its rams and banks both ways', async () => {
    const lanes = [],
        slopes = new Set(),
        rolls = [];
    let doubles = 0;
    for (const seed of [3, 5, 8, 13]) {
        const game = await practiceGame(3, 1, seed);
        set(game, 5, 1e9);
        ticks(game, ENTRANCE);
        let lanesThisRam = 0;
        for (let i = 0; i < 50 * 60; i++) {
            // After 20 s, damage it below half: phase 2, where a second pass is possible.
            if (i === 1000) set(game, 0, Math.round(bossState(game.scene()).health * 0.45));
            // The pilot drifts between rows, as people do.
            set(game, 4, 135 + 75 * Math.sin(i / 300 + seed));
            set(game, 5, 1e9);
            game.step();
            const scene = game.scene(),
                state = bossState(scene);
            if (i < 1000) rolls.push(state.aux[KINDS[3].aux.roll]); // the bank, unhurt
            if (state.attack !== ATTACK.ram) {
                lanesThisRam = 0;
                continue;
            }
            for (const h of bossHazards(scene)) {
                if (h.kind !== HAZARD.lane || h.warn <= 0) continue;
                // A lane's first tick: newly marked.
                if (h.warnTotal - h.warn <= 20) {
                    lanes.push(h.y);
                    slopes.add(Math.round(Math.tan(h.a - Math.PI) * 100));
                    if (++lanesThisRam === 2) doubles++;
                }
                // While a lane is only marked, the hull is not yet on it (still rising, or
                // off the field before a second pass).
                assert(
                    state.x > 300 || state.x > 470,
                    `the hull left before its lane went live (x ${Math.round(state.x)})`,
                );
            }
        }
    }
    const heights = new Set(lanes.map((y) => Math.round(y / 20)));
    assert(heights.size >= 4, `lanes at many heights, not two (${lanes.map(Math.round)})`);
    assert(slopes.size >= 2, 'some lanes slope');
    assert(doubles > 0, 'phase 2 sometimes makes a second pass');
    assert(Math.min(...rolls) < -0.05 && Math.max(...rolls) > 0.05, 'it banks both ways');
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
