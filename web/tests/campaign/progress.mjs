import test from 'node:test';
import assert from 'node:assert/strict';
import { SCORE_KEY } from '../../src/runtime/runtime.mjs';
import {
    CAMPAIGN_KEY,
    STAR_CLEAR,
    STAR_LIVES,
    STAR_PAR,
    endlessForWave,
    floorForWave,
} from '../../src/state/campaign-data.mjs';
import { CampaignProgress } from '../../src/state/campaign.mjs';
import { PersonalBests, clearBrowserRecords, rulesKey } from '../../src/state/records.mjs';
import { memory } from './harness.mjs';

// ---------------------------------------------------------------- progress
test('level 1 is open, each clear opens the next, and clearing level 6 opens Endless', () => {
    const progress = new CampaignProgress(memory());
    assert.equal(progress.openLevels(0), 1);
    assert.ok(progress.isOpen(0, 1) && !progress.isOpen(0, 2));
    assert.equal(progress.endlessOpen(0), false);
    const clear = { cleared: true, timeMs: 60000, score: 5000, livesRemaining: 3 };
    for (let level = 1; level <= 5; level++) {
        progress.record(0, level, clear);
        assert.equal(progress.openLevels(0), level + 1);
        assert.equal(progress.endlessOpen(0), false);
    }
    assert.ok(!progress.act1Done(0));
    const last = progress.record(0, 6, clear);
    assert.ok(last.firstClear && progress.act1Done(0) && progress.endlessOpen(0));
    assert.equal(progress.totalStars(0), 6 * 3 /* every level flawless and under par */);
    // Profiles are separate.
    assert.equal(progress.openLevels(1), 1);
    assert.equal(progress.endlessOpen(1), false);
    // A level that is not open, or not a level, cannot be recorded or opened.
    assert.equal(progress.isOpen(0, 0), false);
    assert.equal(progress.isOpen(0, 7), false);
    assert.equal(progress.record(0, 9, clear).cleared, false);
});

test('a failed level changes nothing; a clear keeps the best stars, the lowest time and the highest score', () => {
    const storage = memory();
    const progress = new CampaignProgress(storage);
    assert.equal(
        progress.record(0, 1, { cleared: false, timeMs: 0, score: 9999, livesRemaining: 0 })
            .cleared,
        false,
    );
    assert.equal(storage.getItem(CAMPAIGN_KEY), null, 'nothing was written');
    const first = progress.record(0, 1, {
        cleared: true,
        timeMs: 100000,
        score: 4000,
        livesRemaining: 1,
    });
    assert.ok(first.firstClear && first.betterTime && first.betterScore);
    assert.equal(first.newStars, STAR_CLEAR);
    const second = progress.record(0, 1, {
        cleared: true,
        timeMs: 70000,
        score: 3000,
        livesRemaining: 3,
    });
    assert.ok(!second.firstClear && second.betterTime && !second.betterScore);
    assert.equal(second.newStars, STAR_LIVES | STAR_PAR);
    assert.deepEqual(progress.best(0, 1), { stars: 7, bestMs: 70000, bestScore: 4000 });
    // A worse run later takes nothing away.
    const third = progress.record(0, 1, {
        cleared: true,
        timeMs: 200000,
        score: 100,
        livesRemaining: 0,
    });
    assert.equal(third.newStars, 0);
    assert.deepEqual(progress.best(0, 1), { stars: 7, bestMs: 70000, bestScore: 4000 });
    // It survives a reload, and a broken value in storage is dropped rather than trusted.
    assert.deepEqual(new CampaignProgress(storage).best(0, 1), progress.best(0, 1));
    storage.setItem(
        CAMPAIGN_KEY,
        '{"version":1,"profiles":[{"levels":{"1":{"stars":99},"x":{}}},7]}',
    );
    assert.equal(new CampaignProgress(storage).stars(0, 1), 0);
    storage.setItem(CAMPAIGN_KEY, 'not json');
    assert.equal(new CampaignProgress(storage).openLevels(0), 1);
});

test('a storage failure keeps the progress for this visit and says so', () => {
    const storage = memory();
    storage.setItem = () => {
        throw new Error('full');
    };
    const progress = new CampaignProgress(storage);
    const result = progress.record(0, 1, {
        cleared: true,
        timeMs: 1000,
        score: 1,
        livesRemaining: 3,
    });
    assert.equal(result.saved, false);
    assert.ok(progress.cleared(0, 1));
});

// ---------------------------------------------------------------- returning players
test('a returning player’s earlier waves open levels (no stars), and wave 30 opens Endless', () => {
    assert.deepEqual(
        [1, 5, 6, 10, 11, 25, 26, 30, 31].map(floorForWave),
        [1, 1, 2, 2, 3, 5, 6, 6, 6],
    );
    assert.deepEqual([29, 30, 31].map(endlessForWave), [false, true, true]);
    const records = new PersonalBests(memory());
    const best = (wave, practice = false) => ({ score: 1, wave, peakCps: 1, longestChain: 1 });
    records.profiles[0][rulesKey({ mode: 'solo' })] = best(12);
    records.profiles[1][rulesKey({ mode: 'solo' })] = best(30);
    // Practice never counts, whatever wave it reached.
    records.profiles[0][rulesKey({ mode: 'solo', practice: true })] = best(30);
    const storage = memory();
    const progress = new CampaignProgress(storage, records);
    assert.equal(progress.openLevels(0), 3, 'wave 12 is past the level 2 boss');
    assert.equal(progress.endlessOpen(0), false);
    assert.equal(progress.openLevels(1), 6);
    assert.equal(progress.endlessOpen(1), true);
    assert.equal(progress.totalStars(0) + progress.totalStars(1), 0, 'no stars are given');
    // What was opened stays open after the records are cleared.
    const clearedRecords = new PersonalBests(memory());
    const later = new CampaignProgress(storage, clearedRecords);
    assert.equal(later.openLevels(0), 3);
    assert.equal(later.endlessOpen(1), true);
    // A new player has the same single open level as before.
    assert.equal(new CampaignProgress(memory(), new PersonalBests(memory())).openLevels(0), 1);
});

test('Clear this browser’s records also clears the campaign', () => {
    const storage = memory();
    new CampaignProgress(storage).record(0, 1, {
        cleared: true,
        timeMs: 1,
        score: 1,
        livesRemaining: 3,
    });
    assert.ok(storage.getItem(CAMPAIGN_KEY));
    assert.ok(clearBrowserRecords(storage, SCORE_KEY).ok);
    assert.equal(new CampaignProgress(storage).stars(0, 1), 0);
});
