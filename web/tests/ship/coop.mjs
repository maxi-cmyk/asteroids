import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { S } from '../../src/runtime/scene-layout.mjs';
import { bytes, unlocked, random } from './harness.mjs';

test('co-op loadouts keep independent IDs, shots and cooldowns', async () => {
    const store = unlocked();
    store.profiles[0].equipped = { ship: 'dart', primary: 'fan', secondary: 'drone' };
    store.profiles[1].equipped = { ship: 'hammer', primary: 'lance', secondary: 'rocket-salvo' };
    const g = await createRuntime(bytes, { loadouts: store, random: random() });
    g.startCoop();
    while (g.state === 'countdown') g.step();
    for (let i = 0; i < 35; i++)
        g.step({
            players: [
                { aimX: 1, firePressed: i === 0, laser: true },
                { aimX: 1, firePressed: i === 0 },
            ],
        });
    const [a, b] = g.coopPlayers();
    assert.equal(a.scene[S.SHIP_TYPE], 1);
    assert.equal(b.scene[S.SHIP_TYPE], 4);
    assert.ok(a.scene[S.LASER_COOLDOWN_MS] > 0);
    assert.equal(b.scene[S.LASER_COOLDOWN_MS], 0);
    assert.equal(a.stats.spawned, 5);
    assert.equal(b.stats.spawned, 1);
});
