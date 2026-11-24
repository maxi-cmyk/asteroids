import test from 'node:test';
import assert from 'node:assert/strict';
import { SHIPS, PRIMARIES, SECONDARIES } from '../../src/ship/catalogue.mjs';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { S } from '../../src/runtime/scene-layout.mjs';
import { playReplay, sceneHash } from '../../src/runtime/replay.mjs';
import { bytes, unlocked, shots } from './harness.mjs';

test('all 216 loadouts launch, fire, activate an ability remain bounded and replay exactly', async () => {
    const store = unlocked(),
        g = await createRuntime(bytes, { loadouts: store });
    let combinations = 0;
    for (let a = 0; a < 6; a++)
        for (let b = 0; b < 6; b++)
            for (let c = 0; c < 6; c++) {
                store.profiles[0].equipped = {
                    ship: SHIPS[a].id,
                    primary: PRIMARIES[b].id,
                    secondary: SECONDARIES[c].id,
                };
                g.start(true, { seed: '0123456789abcdef0123456789abcdef' });
                g.setPractice({ rocks: 'none' });
                const hashes = [];
                for (let t = 0; t < 100; t++) {
                    g.step({ x: 4095, aimX: 1, firePressed: t % 8 === 0, laser: t < 90 });
                    hashes.push(sceneHash(g.host.memory, g.api.web_scene()));
                }
                const s = g.scene();
                assert.equal(s[S.LOADOUT_ENABLED], 1);
                assert.equal(s[S.SHIP_TYPE], a);
                assert.equal(s[S.PRIMARY_TYPE], b);
                assert.equal(s[S.SECONDARY_TYPE], c);
                assert.ok(g.stats().spawned > 0, `${a}/${b}/${c} primary fired`);
                assert.ok(g.stats().laserShots > 0, `${a}/${b}/${c} secondary activated`);
                assert.ok(shots(g).length <= 48);
                assert.ok([...s].every(Number.isFinite));
                g.menu();
                const played = await playReplay(bytes, g.replay);
                assert.deepEqual(
                    played.hashes.slice(0, hashes.length),
                    hashes,
                    `${a}/${b}/${c} replay`,
                );
                combinations++;
            }
    assert.equal(combinations, 216);
});

test('every secondary family replays its full extended scene exactly', async () => {
    for (let i = 0; i < 6; i++) {
        const store = unlocked();
        store.profiles[0].equipped = {
            ship: SHIPS[i].id,
            primary: PRIMARIES[i].id,
            secondary: SECONDARIES[i].id,
        };
        const g = await createRuntime(bytes, { loadouts: store });
        g.start(true, { seed: '0123456789abcdef0123456789abcdef' });
        const hashes = [];
        for (let t = 0; t < 140; t++) {
            g.step({ aimX: 1, firePressed: t % 8 === 0, laser: t < 110 });
            hashes.push(sceneHash(g.host.memory, g.api.web_scene()));
        }
        g.menu();
        const replay = g.replay;
        assert.ok(replay.ticks.length);
        const played = await playReplay(bytes, replay);
        assert.deepEqual(played.hashes.slice(0, hashes.length), hashes, SECONDARIES[i].name);
    }
});
