import test from 'node:test';
import assert from 'node:assert/strict';
import { STAR_CLEAR, mergeProfiles, normalizeProfile } from '../../src/state/campaign-data.mjs';
import { CampaignProgress } from '../../src/state/campaign.mjs';
import { mergeSaves, parseSave, readSave, writeSave, saveFileText } from '../../src/state/save.mjs';
import { memory } from './harness.mjs';

// ---------------------------------------------------------------- the save
test('campaign progress is part of the save: it round-trips, merges and tolerates old saves', () => {
    const a = memory(),
        b = memory();
    const pa = new CampaignProgress(a),
        pb = new CampaignProgress(b);
    pa.record(0, 1, { cleared: true, timeMs: 90000, score: 1000, livesRemaining: 2 });
    pb.record(0, 1, { cleared: true, timeMs: 60000, score: 800, livesRemaining: 3 });
    pb.record(0, 2, { cleared: true, timeMs: 80000, score: 900, livesRemaining: 1 });
    pb.record(1, 1, { cleared: true, timeMs: 70000, score: 700, livesRemaining: 3 });
    const saveA = readSave(a),
        saveB = readSave(b);
    assert.equal(saveA.campaign[0].levels[1].stars, STAR_CLEAR);
    const merged = mergeSaves(saveA, saveB);
    assert.deepEqual(merged.campaign[0].levels[1], { stars: 7, bestMs: 60000, bestScore: 1000 });
    assert.ok(merged.campaign[0].levels[2] && merged.campaign[1].levels[1]);
    // Merging twice changes nothing.
    assert.deepEqual(mergeSaves(merged, saveB).campaign, merged.campaign);
    // Written to a fresh browser, it reads back the same.
    const target = memory();
    assert.ok(writeSave(target, merged));
    assert.deepEqual(readSave(target).campaign, merged.campaign);
    assert.equal(new CampaignProgress(target).stars(0, 1), 7);
    // The exported file parses back to the same progress.
    const parsed = parseSave(saveFileText(merged));
    assert.deepEqual(parsed.campaign, merged.campaign);
    // A save from before the campaign has no such part and reads as no progress.
    const old = JSON.parse(saveFileText(merged));
    delete old.campaign;
    const oldParsed = parseSave(JSON.stringify(old));
    assert.deepEqual(
        oldParsed.campaign.map((p) => Object.keys(p.levels).length),
        [0, 0],
    );
});

test('progress is validated and merged without losing anything', () => {
    assert.deepEqual(normalizeProfile(null), { floor: 1, endless: false, levels: {} });
    const messy = normalizeProfile({
        floor: 99,
        endless: 'yes',
        levels: {
            1: { stars: 3, bestMs: -5, bestScore: 'x' },
            2: { stars: 6 },
            9: { stars: 7 },
            3: 'no',
        },
    });
    assert.equal(messy.floor, 1);
    assert.equal(messy.endless, false);
    assert.deepEqual(Object.keys(messy.levels), ['1'], 'only cleared, real levels remain');
    assert.deepEqual(messy.levels[1], { stars: 3, bestMs: 0, bestScore: 0 });
    const merged = mergeProfiles(
        { floor: 3, endless: false, levels: { 1: { stars: 1, bestMs: 0, bestScore: 5 } } },
        { floor: 2, endless: true, levels: { 1: { stars: 4 | 1, bestMs: 50000, bestScore: 2 } } },
    );
    assert.equal(merged.floor, 3);
    assert.equal(merged.endless, true);
    assert.deepEqual(merged.levels[1], { stars: 5, bestMs: 50000, bestScore: 5 });
});
