import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { S } from '../../src/runtime/scene-layout.mjs';
import { bytes, unlocked, random, tick } from './harness.mjs';

test('ship handling varies; retry retains the captured loadout after equipment changes', async () => {
    const store = unlocked(),
        g = await createRuntime(bytes, { loadouts: store, random: random() });
    const distances = [];
    for (const ship of ['hammer', 'dart']) {
        store.equip(0, 'ship', ship);
        g.start(true);
        g.setPractice({ rocks: 'none' });
        tick(g, 40, { x: 4095 });
        distances.push(g.scene()[S.SHIP_X]);
    }
    assert.ok(distances[1] > distances[0]);
    store.equip(0, 'ship', 'dart');
    g.startLevel(1);
    store.equip(0, 'ship', 'hammer');
    g.restartLevel();
    assert.equal(g.scene()[S.SHIP_TYPE], 1);
});
