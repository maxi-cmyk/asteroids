import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';

test('HD demo launches explicitly and exits on movement without saving', async () => {
    let seed = 7,
        writes = 0;
    const g = await createRuntime(await readFile(new URL('../dist/test.wasm', import.meta.url)), {
        random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0),
        storage: { getItem: () => null, setItem: () => writes++ },
    });
    for (let i = 0; i < 500; i++) g.step();
    assert.equal(g.state, 'menu');
    g.api.web_demo();
    assert.equal(g.state, 'demo');
    const before = g.snapshot()[4];
    for (let i = 0; i < 500; i++) g.step();
    assert(g.snapshot()[4] > before);
    assert.equal(writes, 0);
    g.step({ y: 0 });
    assert.equal(g.state, 'menu');
    for (let i = 0; i < 20; i++) g.step({ y: 0 });
    assert.equal(g.state, 'menu');
});

test('isolated manual demo never advances or writes the player runtime and freezes after Stop', async () => {
    const { createDemo } = await import('../src/demo/engine.mjs');
    const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
    let writes = 0;
    const player = await createRuntime(bytes, {
        storage: { getItem: () => null, setItem: () => writes++ },
    });
    player.start(true);
    player.step({ firePressed: true });
    player.pause();
    const snapshot = player.snapshot(),
        scene = [...player.scene()],
        stats = player.stats();
    const demo = await createDemo(bytes);
    assert.equal(demo.active, false);
    const idle = demo.snapshot();
    for (let i = 0; i < 1500; i++) demo.step();
    assert.deepEqual(demo.snapshot(), idle);
    demo.start();
    assert.equal(demo.active, true);
    for (let i = 0; i < 15000; i++) demo.step();
    assert.deepEqual(player.snapshot(), snapshot);
    assert.deepEqual([...player.scene()], scene);
    assert.deepEqual(player.stats(), stats);
    assert.equal(writes, 0);
    demo.stop();
    const stopped = demo.snapshot();
    for (let i = 0; i < 1000; i++) demo.step();
    assert.deepEqual(demo.snapshot(), stopped);
    demo.start();
    assert.equal(demo.active, true);
    demo.stop();
});

test('the Home demo plays the whole game: bosses, deaths and all, until it is stopped', async () => {
    const { createDemo } = await import('../src/demo/engine.mjs');
    const { S } = await import('../src/runtime/scene-layout.mjs');
    const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
    // Seeded, so the run is the same every time (unseeded, some runs lose no life at all).
    let seed = 1;
    const demo = await createDemo(bytes, undefined, {
        random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0),
    });
    demo.start();
    let bossSeen = false,
        maxWave = 0,
        lastLives = 3,
        livesLost = 0;
    // The pilot now clears the early game cleanly; its first lost lives come around wave 40.
    for (let i = 0; i < 35000; i++) {
        demo.step();
        const scene = demo.scene();
        // Never the menu, score entry or game over: the run goes on whatever happens.
        assert(![0, 5, 6].includes(scene[S.STATE]), `the demo left play at tick ${i}`);
        bossSeen ||= !!scene[S.BOSS_ACTIVE];
        maxWave = Math.max(maxWave, scene[S.WAVE]);
        if (scene[S.LIVES] < lastLives) livesLost++;
        lastLives = scene[S.LIVES];
    }
    assert(bossSeen, 'a boss appears');
    assert(maxWave >= 8, `reached wave ${maxWave}`);
    assert(livesLost > 0, 'the pilot loses lives like anyone, and keeps flying');
    demo.stop();
});

// H4: the demo pilot used to park against a wall for most of a run and waste shots on rocks a
// bullet was already flying to.
test('demo pilot keeps off the walls and wastes few shots', async () => {
    const { Pilot } = await import('../src/demo/pilot.mjs');
    const { S } = await import('../src/runtime/scene-layout.mjs');
    const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
    for (const start of [1, 2, 3]) {
        let seed = start;
        const g = await createRuntime(bytes, {
            random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0),
            storage: { getItem: () => null, setItem: () => {} },
        });
        g.api.web_boss_assist(1, 0);
        g.api.web_start(0);
        const pilot = new Pilot(g);
        let fired = 0,
            wall = 0,
            flying = 0;
        for (let t = 0; t < 50 * 120; t++) {
            const s = g.scene();
            if (g.state !== 'playing') {
                if (g.state === 'death' && !s[S.LIVES]) g.api.web_demo_lives(3);
                g.step();
                continue;
            }
            flying++;
            const x = s[S.SHIP_X],
                y = s[S.SHIP_Y];
            if (x <= 17 || x >= 463 || y <= 17 || y >= 247) wall++;
            const input = pilot.decide(s);
            if (input.fire) fired++;
            g.api.web_fire_press(+input.firePressed);
            g.api.web_actions(input.aimX, input.aimY, +input.laser, 0, +input.shield);
            g.api.web_step(input.x, input.y, +input.fire, 0, 0);
        }
        const hits = g.stats().hits;
        assert(wall / flying < 0.1, `seed ${start}: at a wall ${wall} of ${flying} ticks`);
        assert(hits / fired > 0.8, `seed ${start}: ${hits} hits from ${fired} shots`);
    }
});

// The demo pilot used to park just past the end of the Bastion's marked ram lane (which moves
// left with the charging ship) and die to every ram, then chase its last engine below the field.
test('demo pilot beats the Bastion without dying to the ramming run', async () => {
    const { Pilot } = await import('../src/demo/pilot.mjs');
    const { S, BOSS_AT, BOSS } = await import('../src/runtime/scene-layout.mjs');
    const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
    for (const start of [1, 2]) {
        let seed = start;
        const g = await createRuntime(bytes, {
            random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0),
            storage: { getItem: () => null, setItem: () => {} },
        });
        g.api.web_boss_assist(1, 0);
        g.start(false);
        g.step();
        g.api.web_test_boss(20, 1, 0);
        const pilot = new Pilot(g);
        let deaths = 0,
            beaten = false,
            previous = g.state;
        for (let t = 0; t < 50 * 60 && !beaten; t++) {
            const s = g.scene();
            if (g.state === 'playing') {
                const input = pilot.decide(s);
                g.api.web_fire_press(+input.firePressed);
                g.api.web_actions(input.aimX, input.aimY, +input.laser, 0, +input.shield);
                g.api.web_step(input.x, input.y, +input.fire, 0, 0);
            } else {
                if (g.state === 'death' && !s[S.LIVES]) g.api.web_demo_lives(3);
                g.step();
            }
            if (g.state === 'death' && previous !== 'death') deaths++;
            previous = g.state;
            beaten = !!(g.scene()[BOSS_AT + BOSS.DEFEATED_MASK] & (1 << 3));
        }
        assert.ok(beaten, `seed ${start}: the Bastion still stands after 60 s`);
        assert.equal(deaths, 0, `seed ${start}: died ${deaths} times`);
    }
});
