import test from 'node:test';
import assert from 'node:assert/strict';
import { SHIPS, STARTER, kitForLevel } from '../../src/ship/catalogue.mjs';
import { Loadouts, LOADOUT_KEY, sanitizeLoadoutProfile } from '../../src/state/loadouts.mjs';
import {
    memoryStorage,
    readSave,
    writeSave,
    mergeSaves,
    parseSave,
    saveFileText,
} from '../../src/state/save.mjs';
import { CAMPAIGN_KEY } from '../../src/state/campaign-data.mjs';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { bytes, unlocked, random } from './harness.mjs';

test('starter, level grants, locked slots, migration, save merge and failed writes', () => {
    const storage = memoryStorage(),
        store = new Loadouts(storage);
    assert.deepEqual(store.get(0), STARTER);
    assert.equal(store.equip(0, 'primary', 'lance'), false);
    assert.deepEqual(store.grant(0, 3), kitForLevel(3));
    assert.equal(store.grant(0, 3), null);
    assert.equal(store.equip(0, 'primary', 'lance'), true);
    assert.equal(store.get(1).primary, 'repeater');
    assert.equal(new Loadouts(storage).get(0).primary, 'lance');
    const saved = readSave(storage),
        other = memoryStorage();
    assert.equal(writeSave(other, parseSave(saveFileText(saved))), true);
    assert.deepEqual(new Loadouts(other).get(0), store.get(0));
    const extra = unlocked();
    extra.equip(0, 'secondary', 'drone');
    extra.save();
    const merged = mergeSaves(saved, readSave(extra.storage));
    assert.deepEqual(merged.loadouts[0].grants, [1, 2, 3, 4, 5, 6]);
    assert.equal(
        merged.loadouts[0].equipped.primary,
        'lance',
        'local equipped preference is retained',
    );
    assert.deepEqual(
        sanitizeLoadoutProfile({ grants: [7, -1], equipped: { ship: 'hammer' } }).equipped,
        STARTER,
    );
    const legacy = memoryStorage();
    legacy.setItem(
        CAMPAIGN_KEY,
        JSON.stringify({ version: 1, profiles: [{ levels: { 2: { stars: 1 } } }, {}] }),
    );
    assert.equal(new Loadouts(legacy).owns(0, 'secondary', 'rocket-salvo'), true);
    const broken = new Loadouts({
        getItem() {
            return null;
        },
        setItem() {
            throw Error('full');
        },
    });
    broken.grant(0, 2);
    assert.equal(broken.equip(0, 'ship', 'dart'), true);
    assert.match(broken.status, /visit/);
    storage.setItem(LOADOUT_KEY, 'broken');
    assert.deepEqual(new Loadouts(storage).get(0), STARTER);
});

test('a first level clear grants that kit to each profile exactly once', async () => {
    const store = new Loadouts(memoryStorage()),
        g = await createRuntime(bytes, { loadouts: store, random: random() });
    g.startLevel(2, { profiles: [0, 1] });
    // Exercise the public campaign credit boundary with a completed cooperative result.
    g.recorder.result = {
        profile: 0,
        score: 1000,
        players: [
            { profile: 0, score: 600 },
            { profile: 1, score: 400 },
        ],
        levelRun: {
            level: 2,
            cleared: true,
            timeMs: 60000,
            livesLost: [0, 1],
            livesRemaining: [3, 2],
        },
    };
    g.campaignRun.credit();
    assert.equal(g.result.levelRun.newKits.length, 2);
    assert.equal(store.owns(0, 'primary', 'twin-shot'), true);
    assert.equal(store.owns(1, 'secondary', 'rocket-salvo'), true);
    g.campaignRun.credit();
    assert.deepEqual(
        store.profiles.map((p) => p.grants),
        [
            [1, 2],
            [1, 2],
        ],
    );
});

test('the starter loadout clears campaign levels and awards persistent kit progression', async () => {
    const { Pilot } = await import('../../src/demo/pilot.mjs');
    const store = new Loadouts(memoryStorage()),
        g = await createRuntime(bytes, {
            loadouts: store,
            storage: store.storage,
            random: random(),
        });
    for (let level = 1; level <= 6; level++) {
        g.startLevel(level);
        const pilot = new Pilot(g);
        for (let t = 0; t < 18000 && g.state !== 'results'; t++)
            g.step(g.state === 'playing' ? pilot.decide(g.scene()) : {});
        assert.equal(g.result?.levelRun.cleared, true, `starter clears level ${level}`);
        assert.equal(store.owns(0, 'ship', SHIPS[level - 1].id), true);
    }
    assert.deepEqual(new Loadouts(store.storage).profiles[0].grants, [1, 2, 3, 4, 5, 6]);
});
