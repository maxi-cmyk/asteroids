// The practice range (nextSteps.md H3): rock modes, waves, speed, pickups on demand, and that
// a practice run with tool changes still replays exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { S, BLOCKS } from '../src/runtime/scene-layout.mjs';
import { playReplay, sceneHash } from '../src/runtime/replay.mjs';
import { drillConfig, sanitizePractice } from '../src/state/practice.mjs';

const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
const storage = () => {
    const values = new Map();
    return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
};
const runtime = () => createRuntime(bytes, { storage: storage() });
const rocks = (scene) => {
    const out = [];
    for (let i = 0; i < BLOCKS.ROCKS.count; i++) {
        const at = BLOCKS.ROCKS.at + i * BLOCKS.ROCKS.stride;
        if (scene[at]) out.push({ x: scene[at + 1], vx: scene[at + 6] });
    }
    return out;
};
const ticks = (g, n) => {
    for (let i = 0; i < n; i++) g.step();
};

test('practice config is validated and clamped', () => {
    assert.deepEqual(sanitizePractice({ rocks: 'lava', wave: 99, speed: 7, refill: 'yes' }), {
        drill: 'targets',
        rocks: 'targets',
        wave: 30,
        speed: 100,
        refill: true,
        drops: true,
        hold: false,
    });
    assert.equal(drillConfig('waves', { wave: 12 }).rocks, 'waves');
    assert.equal(drillConfig('waves', { wave: 12 }).wave, 12, 'a drill keeps the chosen wave');
    assert.equal(drillConfig('nope', {}).drill, 'targets');
});

test('settings can assign practice config before starting a run', async () => {
    const g = await runtime();
    g.practiceConfig = sanitizePractice({ rocks: 'waves', wave: 7, speed: 125 });
    g.start(true);
    assert.equal(g.practiceConfig.wave, 7);
    assert.equal(g.scene()[S.WAVE], 7);
    assert.equal(g.scene()[S.PRACTICE_FLAGS] >> 8, 125);
});

test('rock modes: targets, real waves from a chosen wave, an endless stream, none', async () => {
    const g = await runtime();
    g.start(true);
    g.step();
    assert.equal(rocks(g.scene()).length, 3, 'targets');
    assert.equal(g.scene()[S.PRACTICE_ROCKS], 0);

    g.setPractice({ rocks: 'waves', wave: 7 });
    assert.equal(rocks(g.scene()).length, 0, 'switching mode starts the rocks again');
    ticks(g, 200);
    assert.equal(g.scene()[S.WAVE], 7);
    assert.ok(rocks(g.scene()).length > 0, 'wave 7 rocks arrive');
    g.practiceNextWave();
    assert.equal(g.scene()[S.WAVE], 8, 'next wave');
    assert.equal(g.practiceConfig.wave, 7, 'the saved starting wave is unchanged');

    g.setPractice({ rocks: 'stream', wave: 4 });
    ticks(g, 1500);
    assert.equal(g.scene()[S.WAVE], 4, 'a stream stays on its wave');
    assert.ok(g.scene()[S.PENDING_ROCKS] > 0 || rocks(g.scene()).length > 0);

    g.setPractice({ rocks: 'none' });
    ticks(g, 50);
    assert.equal(rocks(g.scene()).length, 0, 'none');
    g.practiceRespawn();
    assert.equal(rocks(g.scene()).length, 0);
});

test('rock speed scales rocks as they enter; refill off leaves the targets gone', async () => {
    const entry = async (speed) => {
        let seed = 7;
        const g = await createRuntime(bytes, {
            storage: storage(),
            random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0),
        });
        g.setPractice({ rocks: 'waves', wave: 3, speed });
        g.start(true);
        for (let i = 0; i < 400; i++) {
            g.step();
            const r = rocks(g.scene());
            if (r.length) return r[0].vx;
        }
        return null;
    };
    const normal = await entry(100),
        fast = await entry(150);
    assert.ok(normal < 0 && fast < 0);
    assert.ok(Math.abs(fast / normal - 1.5) < 1e-4, `${fast} vs ${normal}`);

    const g = await runtime();
    g.setPractice({ rocks: 'targets', refill: false });
    g.start(true);
    g.practiceClear();
    ticks(g, 120);
    assert.equal(rocks(g.scene()).length, 0, 'no refill');
    g.practiceRespawn();
    assert.equal(rocks(g.scene()).length, 3, 'respawn brings them back');
});

test('pickups on demand, and the laser made ready', async () => {
    const g = await runtime();
    g.start(true);
    g.step();
    g.practiceSpawn(2);
    assert.equal(g.scene()[S.PICKUP_ACTIVE], 1);
    assert.equal(g.scene()[S.PICKUP_KIND], 2);
    for (let i = 0; i < 80; i++) g.step({ laser: true });
    g.step();
    assert.ok(g.scene()[S.LASER_COOLDOWN_MS] > 0, 'the laser fired and is cooling down');
    g.practiceSpawn(3);
    assert.equal(g.scene()[S.LASER_COOLDOWN_MS], 0);
    // Outside practice the tools do nothing.
    g.menu();
    g.start(false);
    g.practiceSpawn(1);
    assert.equal(g.scene()[S.PICKUP_ACTIVE], 0);
});

test('a practice run with tool changes replays exactly', async () => {
    const g = await runtime();
    g.setPractice({ rocks: 'waves', wave: 5, speed: 125 });
    g.start(true);
    const live = [];
    for (let i = 0; i < 600; i++) {
        if (i === 100) g.practiceNextWave();
        if (i === 200) g.practiceSpawn(0);
        if (i === 300) g.setPractice({ rocks: 'stream', wave: 9, speed: 75 });
        if (i === 400) g.practiceClear();
        if (i === 450) g.practiceRespawn();
        g.step({ x: 2048 + Math.round(Math.sin(i / 20) * 1500), fire: i % 5 === 0 });
        live.push(sceneHash(g.host.memory, g.api.web_scene()));
    }
    g.replays.finish();
    const played = await playReplay(bytes, g.replay);
    assert.equal(played.ticks, live.length);
    assert.equal(
        played.hashes.findIndex((h, i) => h !== live[i]),
        -1,
    );
});
