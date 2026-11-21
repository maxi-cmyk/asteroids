// Ninefold: tails, illusions and footwork (P1.3, P2.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    ENTRANCE,
    FOX_POSE,
    FOX_POSES,
    NINEFOLD,
    PART,
    PERCH_X,
    PERCH_Y,
    body,
    bossParts,
    bossState,
    practiceGame,
    set,
    shoot,
    tails,
    ticks,
    until,
} from './harness.mjs';

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
