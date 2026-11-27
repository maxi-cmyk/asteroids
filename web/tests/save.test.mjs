// One save (nextSteps.md R4): read, export, import and merge every part a browser keeps.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    readSave,
    parseSave,
    writeSave,
    mergeSaves,
    saveFileText,
    memoryStorage,
    decodeScores,
    encodeScores,
    SCORE_KEYS,
} from '../src/state/save.mjs';
import { PersonalBests, rulesKey } from '../src/state/records.mjs';
import { BossRecords } from '../src/boss/records.mjs';
import { CoopLeaderboard } from '../src/state/coop-records.mjs';
import { createUnlocks } from '../src/boss/unlocks.mjs';
import { saveHangar } from '../src/state/hangar.mjs';
import { loadProfiles, saveProfiles } from '../src/state/settings.mjs';

const solo = { mode: 'solo', friendlyFire: false, modifiers: [], practice: false };
const run = (score, extra = {}) => ({
    score,
    wave: 3,
    peakCps: 4,
    longestChain: 9,
    shots: 100,
    hits: 50,
    ...extra,
});

// A browser that has played: bests, boss defeats, an unlock, a hull, settings, scores.
function playedBrowser({ score = 1200, hits = 50, hull = 'dart', initials = 'MAX' } = {}) {
    const storage = memoryStorage();
    // Unlocks first: on a browser that already has records they would all be granted.
    createUnlocks(storage).grant(0, 'dart');
    new PersonalBests(storage).record(0, solo, run(score, { hits }));
    new BossRecords(storage).record(0, 1 << 0);
    saveHangar(storage, { profiles: [hull, 'vanguard'] });
    const profiles = loadProfiles(storage);
    profiles.profiles[0].volume = 0.9;
    saveProfiles(storage, profiles);
    storage.setItem(SCORE_KEYS.hd, JSON.stringify(encodeScores([{ initials, score }])));
    new CoopLeaderboard(storage, false).save(1, 'TWO', 3000);
    return storage;
}

test('score tables round-trip and refuse malformed records', () => {
    const entries = [
        { initials: 'AAA', score: 999999 },
        { initials: 'BCD', score: 400 },
    ];
    assert.deepEqual(decodeScores(encodeScores(entries)), entries);
    const bad = encodeScores(entries);
    bad[6] = 97; // lowercase initial
    assert.deepEqual(decodeScores(bad), []);
    assert.deepEqual(decodeScores(encodeScores([...entries].reverse())), []); // not descending
    assert.deepEqual(decodeScores('nope'), []);
});

test('a save exports and imports into an empty browser unchanged', () => {
    const from = readSave(playedBrowser());
    const text = saveFileText(from);
    const imported = parseSave(text);
    const empty = memoryStorage();
    assert.ok(writeSave(empty, mergeSaves(readSave(empty), imported, { settingsFrom: 'b' })));
    const after = readSave(empty);
    for (const part of [
        'scores',
        'coopScores',
        'records',
        'bossDefeats',
        'unlocks',
        'hangar',
        'settings',
    ])
        assert.deepEqual(after[part], from[part], part);
    // And the game's own modules read it back.
    assert.equal(new PersonalBests(empty).get(0, solo).score, 1200);
    assert.ok(createUnlocks(empty).isUnlocked(0, 'dart'));
});

test('merging keeps the best of both and never loses progress', () => {
    const a = readSave(playedBrowser({ score: 1200, hits: 50, initials: 'AAA' }));
    const b = readSave(playedBrowser({ score: 900, hits: 90, hull: 'moth', initials: 'BBB' }));
    b.records[0][rulesKey(solo)].wave = 7;
    b.unlocks.profiles[1] = ['moth'];
    b.bossDefeats[0].sentinel = 5;
    const m = mergeSaves(a, b);
    const best = m.records[0][rulesKey(solo)];
    assert.equal(best.score, 1200); // a's
    assert.equal(best.wave, 7); // b's
    assert.deepEqual(best.accuracy, { hits: 90, shots: 100 }); // b's is better
    assert.deepEqual(
        m.scores.hd.map((e) => e.initials),
        ['AAA', 'BBB'],
    );
    assert.deepEqual(m.unlocks.profiles, [['dart'], ['moth']]);
    assert.equal(m.bossDefeats[0].sentinel, 5);
    assert.deepEqual(m.hangar, a.hangar); // settings side: a
    assert.deepEqual(mergeSaves(a, b, { settingsFrom: 'b' }).hangar, b.hangar);
    // Idempotent: merging the same save again changes nothing.
    const again = mergeSaves(m, b);
    for (const part of ['scores', 'coopScores', 'records', 'bossDefeats', 'unlocks'])
        assert.deepEqual(again[part], m[part], part);
    // Order does not matter for progress.
    const flipped = mergeSaves(b, a);
    for (const part of ['scores', 'records', 'bossDefeats'])
        assert.deepEqual(flipped[part], m[part], part);
});

test('imports refuse files that are not saves and drop bad parts', () => {
    assert.throws(() => parseSave('not json'), /not JSON/);
    assert.throws(() => parseSave('{"game":"other","format":1}'), /not a save/);
    assert.throws(() => parseSave('x'.repeat(600_000)), /too large/);
    const save = JSON.parse(saveFileText(readSave(playedBrowser())));
    save.records[0]['["solo",false,[],false]'].score = -5; // tampered best
    save.scores.hd.push({ initials: 'lol', score: 5 }); // bad initials
    save.unlocks.profiles[0].push('battleship'); // not a hull
    save.bossDefeats[0].nobody = 3; // not a boss
    const parsed = parseSave(JSON.stringify(save));
    assert.deepEqual(parsed.records[0], {});
    assert.deepEqual(
        parsed.scores.hd.map((e) => e.initials),
        ['MAX'],
    );
    assert.deepEqual(parsed.unlocks.profiles[0], ['dart']);
    assert.equal(parsed.bossDefeats[0].nobody, undefined);
    assert.equal(parsed.hasSettings, true);
});

test('a failed write puts every part back', () => {
    const storage = playedBrowser();
    const before = readSave(storage);
    let writes = 0;
    const flaky = {
        ...storage,
        getItem: storage.getItem,
        removeItem: storage.removeItem,
        setItem: (k, v) => {
            if (++writes === 4) throw new Error('quota');
            storage.setItem(k, v);
        },
    };
    const other = readSave(playedBrowser({ score: 5000, initials: 'ZZZ' }));
    assert.equal(writeSave(flaky, mergeSaves(before, other)), false);
    const after = readSave(storage);
    for (const part of [
        'scores',
        'coopScores',
        'records',
        'bossDefeats',
        'unlocks',
        'hangar',
        'settings',
    ])
        assert.deepEqual(after[part], before[part], part);
});

// ---- write outcomes (audit A06): committed, restored (verified unchanged) or partial ----------
const { writeSaveDetailed, MAX_IMPORT_BYTES, checkImportSize } = await import(
    '../src/state/save.mjs'
);
// A storage whose writes start failing after `allow` of them; `restores` keeps the rest working.
function limited(base, allow, { persistent = true } = {}) {
    let writes = 0;
    return {
        getItem: (k) => base.getItem(k),
        removeItem: (k) => {
            if (persistent && writes >= allow) throw new Error('denied');
            base.removeItem(k);
        },
        setItem: (k, v) => {
            writes++;
            if (writes > allow && (persistent || writes === allow + 1)) throw new Error('quota');
            base.setItem(k, v);
        },
    };
}
const incomingSave = () =>
    mergeSaves(readSave(playedBrowser()), readSave(playedBrowser({ score: 9000 })));
const dump = (storage) => JSON.stringify({ ...readSave(storage), savedAt: null }); // savedAt is the read time

test('writeSaveDetailed: a clean write is committed', () => {
    const storage = playedBrowser();
    assert.equal(writeSaveDetailed(storage, incomingSave()), 'committed');
    assert.equal(writeSave(playedBrowser(), incomingSave()), true);
});

test('writeSaveDetailed: a one-off failure is restored and verified unchanged', () => {
    const base = playedBrowser();
    const before = dump(base);
    assert.equal(
        writeSaveDetailed(limited(base, 3, { persistent: false }), incomingSave()),
        'restored',
    );
    assert.equal(dump(base), before);
});

test('writeSaveDetailed: writes that fail from the start leave nothing changed, so restored', () => {
    const base = playedBrowser();
    const before = dump(base);
    assert.equal(writeSaveDetailed(limited(base, 0), incomingSave()), 'restored');
    assert.equal(dump(base), before);
    assert.equal(writeSave(limited(base, 0), incomingSave()), false);
});

test('writeSaveDetailed: a persistent failure after a partial write is reported as partial', () => {
    const base = playedBrowser();
    const before = dump(base);
    assert.equal(writeSaveDetailed(limited(base, 1), incomingSave()), 'partial');
    assert.notEqual(dump(base), before); // the state really did change
});

test('writeSaveDetailed: keys that did not exist are removed again on a one-off failure', () => {
    const base = memoryStorage();
    assert.equal(
        writeSaveDetailed(limited(base, 3, { persistent: false }), incomingSave()),
        'restored',
    );
    assert.equal(base.getItem(SCORE_KEYS.hd), null);
});

test('writeSaveDetailed: unreadable storage writes nothing and says nothing changed', () => {
    let wrote = 0;
    const storage = {
        getItem: () => {
            throw new Error('blocked');
        },
        setItem: () => wrote++,
        removeItem: () => wrote++,
    };
    assert.equal(writeSaveDetailed(storage, incomingSave()), 'restored');
    assert.equal(wrote, 0);
});

// ---- file size (audit A07): refuse before reading ---------------------------------------------
test('checkImportSize refuses over-limit files without reading them', () => {
    const file = (size) => ({
        size,
        text: () => assert.fail('read'),
        arrayBuffer: () => assert.fail('read'),
    });
    assert.throws(() => checkImportSize(file(MAX_IMPORT_BYTES + 1), MAX_IMPORT_BYTES), /too large/);
    assert.doesNotThrow(() => checkImportSize(file(MAX_IMPORT_BYTES), MAX_IMPORT_BYTES));
});

test('parseSave measures text in bytes, not UTF-16 units', () => {
    const wide = '€'.repeat(Math.ceil(MAX_IMPORT_BYTES / 3) + 10); // fewer units than bytes
    assert.ok(wide.length < MAX_IMPORT_BYTES);
    assert.throws(() => parseSave(wide), /too large/);
});
