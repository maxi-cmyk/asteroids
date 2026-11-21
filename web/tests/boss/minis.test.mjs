// The mini-bosses (P4.6).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRANCE, KINDS, bossState, practiceGame, set, ticks } from './harness.mjs';

test('the minis borrow their bosses’ motion: the Shardling tilts, the Moonjelly pulses (P4.6)', async () => {
    const shard = await practiceGame(7, 0, 11);
    set(shard, 5, 1e9);
    ticks(shard, ENTRANCE);
    let flat = 99;
    for (let i = 0; i < 200; i++) {
        shard.step();
        const b = bossState(shard.scene());
        flat = Math.min(flat, Math.cos(b.aux[KINDS[7].aux.tilt]));
    }
    assert(flat < 0.5, 'the blades’ ring tips well away from flat');
    const jelly = await practiceGame(10, 0, 11);
    set(jelly, 5, 1e9);
    ticks(jelly, ENTRANCE);
    let most = 0;
    for (let i = 0; i < 100; i++) {
        jelly.step();
        most = Math.max(most, bossState(jelly.scene()).aux[KINDS[10].aux.squeeze]);
    }
    assert(most > 0.9, 'the Moonjelly contracts as it swims');
});
