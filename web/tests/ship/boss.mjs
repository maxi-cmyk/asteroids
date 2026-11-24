import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIMARIES, STARTER } from '../../src/ship/catalogue.mjs';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { S } from '../../src/runtime/scene-layout.mjs';
import { bytes, unlocked, random } from './harness.mjs';

test('every primary family can damage every boss family through its mechanic route', async () => {
    const { BossBot } = await import('../boss-bot.mjs');
    const store = unlocked(),
        g = await createRuntime(bytes, { loadouts: store, random: random() });
    for (let primary = 0; primary < 6; primary++)
        for (let kind = 0; kind < 6; kind++) {
            store.profiles[0].equipped = { ...STARTER, primary: PRIMARIES[primary].id };
            g.start(true);
            g.api.web_boss_practice(kind, 0, 1);
            g.api.web_test_boss_set(5, 1000000);
            const initial = g.scene()[S.BOSS_HEALTH],
                bot = new BossBot(g);
            for (let t = 0; t < 3000 && g.scene()[S.BOSS_HEALTH] === initial; t++) bot.step();
            assert.ok(
                g.scene()[S.BOSS_HEALTH] < initial,
                `${PRIMARIES[primary].name} damages boss ${kind}`,
            );
            assert.ok(g.stats().hits <= g.stats().spawned, 'accuracy counts each projectile once');
        }
});
