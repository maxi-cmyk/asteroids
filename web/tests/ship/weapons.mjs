import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIMARIES, SECONDARIES } from '../../src/ship/catalogue.mjs';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { S, BLOCKS } from '../../src/runtime/scene-layout.mjs';
import { bytes, unlocked, random, tick, shots } from './harness.mjs';

test('primary patterns and damage are distinct; cooldown and pause cannot create free shots', async () => {
    const store = unlocked(),
        g = await createRuntime(bytes, { loadouts: store, random: random() });
    const expected = [1, 2, 1, 3, 5, 1];
    for (let i = 0; i < 6; i++) {
        store.profiles[0].equipped.primary = PRIMARIES[i].id;
        g.start(true);
        g.setPractice({ rocks: 'none' });
        g.step({ aimX: 1, firePressed: true });
        tick(g, 10, { aimX: 1 });
        assert.equal(g.stats().spawned, expected[i], PRIMARIES[i].name);
        if (i === 2) assert.equal(shots(g)[0][7], 3);
    }
    g.start(true);
    g.setPractice({ rocks: 'none' });
    g.step({ firePressed: true, aimX: 1 });
    const count = g.stats().spawned;
    g.step({ firePressed: true });
    assert.equal(g.stats().spawned, count);
    g.pause();
    const before = [...g.scene()];
    tick(g, 100);
    assert.equal(g.scene()[S.PRIMARY_COOLDOWN], before[S.PRIMARY_COOLDOWN]);
});

test('death cancels owned effects, queued burst shots do not inflate accuracy, and mid-run swaps are refused', async () => {
    const store = unlocked(),
        g = await createRuntime(bytes, { loadouts: store, random: random() });
    store.profiles[0].equipped = { ship: 'vanguard', primary: 'burst', secondary: 'drone' };
    g.start(true);
    g.setPractice({ rocks: 'none' });
    g.step({ firePressed: true, aimX: 1 });
    assert.equal(g.stats().spawned, 1, 'pending burst rounds have not spawned');
    g.api.web_loadout(0, 5, 5, 5, 1);
    assert.equal(g.scene()[S.PRIMARY_TYPE], 3, 'active kit is immutable');
    g.startCoop();
    while (g.state === 'countdown') g.step();
    tick(g, 30, { players: [{ firePressed: true, aimX: 1, laser: true }, {}] });
    g.api.web_test_coop(0, 3, 0);
    g.api.web_test_coop(0, 7, 1);
    tick(g, 1, { players: [{}, {}] });
    const a = g.coopPlayers()[0].scene,
        b = BLOCKS.LOADOUT_SHOTS;
    assert.equal(a[S.SHIP_ALIVE], 0);
    for (let i = 0; i < b.count; i++)
        assert.equal(a[b.at + i * b.stride], 0, 'dead pilot owns no live effects');
});

test('ability classes emit their own patterns and cooldown lengths', async () => {
    const store = unlocked(),
        g = await createRuntime(bytes, { loadouts: store, random: random() });
    const kinds = [null, 2, 3, 4, 5, 0],
        counts = [0, 3, 1, 3, 1, 5];
    for (let i = 0; i < 6; i++) {
        store.profiles[0].equipped.secondary = SECONDARIES[i].id;
        g.start(true);
        g.setPractice({ rocks: 'none' });
        tick(g, Math.ceil(SECONDARIES[i].windup / 20) + 2, { laser: true, aimX: 1 });
        if (i === 1) tick(g, 8, { aimX: 1 });
        const active = shots(g);
        assert.equal(g.stats().laserShots, 1);
        assert.equal(g.scene()[S.SECONDARY_COOLDOWN], SECONDARIES[i].cooldown);
        if (i === 0) assert.ok(g.scene()[S.BEAM_MS] > 0);
        else {
            assert.equal(
                active.filter((p) => p[3] === kinds[i]).length,
                counts[i],
                SECONDARIES[i].name,
            );
        }
        const before = g.scene()[S.LASER_COOLDOWN_MS];
        g.pause();
        tick(g, 40);
        assert.equal(g.scene()[S.LASER_COOLDOWN_MS], before);
    }
});
