// The Tidecaller (P4.5).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    ENTRANCE,
    ENTRANCE_TICKS,
    HAZARD,
    KINDS,
    PART,
    S,
    SHOT,
    bossHazards,
    bossPart,
    bossParts,
    bossShots,
    bossState,
    phaseGame,
    practiceGame,
    set,
    shoot,
    ticks,
    until,
} from './harness.mjs';

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
