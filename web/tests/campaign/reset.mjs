import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_KEY } from '../../src/state/campaign-data.mjs';
import { CampaignProgress } from '../../src/state/campaign.mjs';
import { mergeSaves, parseSave, readSave, writeSave, saveFileText } from '../../src/state/save.mjs';
import { memory, engine } from './harness.mjs';

test('profile best reset persists, keeps progression and isolates the other profile', async () => {
    const storage = memory();
    const game = await engine(storage);
    const outcome = { cleared: true, timeMs: 60000, score: 5000, livesRemaining: 3 };
    const stats = { score: 5000, wave: 1, peakCps: 5, longestChain: 10, shots: 100, hits: 90 };
    for (const profile of [0, 1]) {
        for (const level of [1, 2, 3, 4, 5, 6]) game.campaign.record(profile, level, outcome);
        for (const practice of [false, true]) game.records.record(profile, { practice }, stats);
    }
    const before = readSave(storage);
    const other = structuredClone(game.campaign.profiles[1]);
    assert.equal(game.resetPersonalBests(0), true);
    assert.deepEqual(game.records.profiles[0], {});
    assert.notDeepEqual(game.records.profiles[1], {});
    assert.deepEqual(game.campaign.best(0, 1), { stars: 7, bestMs: 0, bestScore: 0 });
    assert.equal(game.campaign.endlessOpen(0), true);
    assert.equal(game.campaign.openLevels(0), 6);
    assert.deepEqual(game.campaign.profiles[1], other);
    const reloaded = await engine(storage);
    assert.deepEqual(reloaded.campaign.profiles, game.campaign.profiles);
    assert.deepEqual(reloaded.records.profiles, game.records.profiles);
    const exported = parseSave(saveFileText(readSave(storage), 'reset-test'));
    const target = memory();
    assert.equal(writeSave(target, mergeSaves(readSave(target), exported)), true);
    assert.deepEqual(readSave(target).campaign, exported.campaign);
    // Existing merge policy keeps the best; importing an older export can restore bests.
    assert.equal(mergeSaves(exported, before).campaign[0].levels[1].bestScore, 5000);
});

test('a refused campaign reset save reports failure and Retry saves both stores', async () => {
    const backing = memory();
    let refuseCampaign = false;
    const storage = {
        ...backing,
        setItem(key, value) {
            if (refuseCampaign && key === CAMPAIGN_KEY) throw new Error('Storage refused');
            backing.setItem(key, value);
        },
    };
    const game = await engine(storage);
    game.campaign.record(0, 1, { cleared: true, timeMs: 60000, score: 5000, livesRemaining: 3 });
    refuseCampaign = true;
    assert.equal(game.resetPersonalBests(0), false);
    assert.match(game.records.status, /^Could not save/);
    assert.equal(game.campaign.best(0, 1).bestMs, 0);
    refuseCampaign = false;
    assert.equal(game.savePersonalBests(), true);
    assert.equal(new CampaignProgress(storage).best(0, 1).bestMs, 0);
});
