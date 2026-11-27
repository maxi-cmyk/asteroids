// Retry and pause-menu Restart relaunch the run's captured pilot and kit (nextSteps.md A03),
// whatever the active profile became in the meantime; Next level and fresh launches do not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { bytes, unlocked, random } from './ship/harness.mjs';

async function setup(active) {
    const store = unlocked();
    const runtime = await createRuntime(bytes, {
        loadouts: store,
        random: random(),
        profile: () => active.value,
    });
    return { store, runtime };
}

test('Restart after the active profile changes keeps the run profile and its captured kit', async () => {
    const active = { value: 0 };
    const { store, runtime } = await setup(active);
    store.equip(0, 'ship', 'dart');
    runtime.startLevel(1);
    const kit = structuredClone(runtime.runLoadouts);
    active.value = 1;
    store.equip(1, 'ship', 'hammer');
    runtime.restartLevel();
    assert.equal(runtime.recorder.run.profile, 0);
    assert.deepEqual(runtime.runLoadouts, kit);
});

test('a fresh level launch uses the profile that is active now', async () => {
    const active = { value: 0 };
    const { runtime } = await setup(active);
    runtime.startLevel(1);
    active.value = 1;
    runtime.startLevel(1);
    assert.equal(runtime.recorder.run.profile, 1);
});

test('reversed-profile co-op Restart keeps each pilot with their own kit', async () => {
    const active = { value: 0 };
    const { store, runtime } = await setup(active);
    store.equip(0, 'ship', 'dart');
    store.equip(1, 'ship', 'hammer');
    runtime.startLevel(1, { profiles: [1, 0] });
    const kit = structuredClone(runtime.runLoadouts);
    store.equip(0, 'ship', 'hammer');
    store.equip(1, 'ship', 'dart');
    runtime.restartLevel();
    assert.deepEqual(runtime.level.profiles, [1, 0]);
    assert.deepEqual(runtime.runLoadouts, kit);
});

test('the Retry and Restart buttons use App.restartLevel; Next level uses runLevel', async () => {
    const handlers = new Map();
    globalThis.document = {
        querySelectorAll: () => [],
        getElementById: (id) => ({
            addEventListener: (_, fn) => handlers.set(id, fn),
        }),
    };
    globalThis.window = { addEventListener: () => {} };
    const { installActions } = await import('../src/app/ui-actions.mjs');
    const calls = [];
    const app = {
        runtime: {
            level: { level: 3 },
            runProfile: 0,
            nextLevel: () => 4,
            campaign: { isOpen: () => true },
        },
        restartLevel: () => calls.push(['restart']),
        runLevel: (level) => calls.push(['run', level]),
    };
    installActions(app);
    handlers.get('levelRetry')();
    handlers.get('restartLevel')();
    handlers.get('levelNext')();
    delete globalThis.document;
    delete globalThis.window;
    assert.deepEqual(calls, [['restart'], ['restart'], ['run', 4]]);
});
