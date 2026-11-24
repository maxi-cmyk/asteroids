import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePng } from '../../tools/ship-art/png.mjs';
import { HangarSelection } from '../../src/state/hangar-selection.mjs';
import { Loadouts } from '../../src/state/loadouts.mjs';
import { loadHangar, saveHangar, HANGAR_KEY } from '../../src/state/hangar.mjs';
import { recolourPaint } from '../../src/ship/paint.mjs';
import {
    memoryStorage,
    readSave,
    parseSave,
    saveFileText,
    writeSave,
    mergeSaves,
} from '../../src/state/save.mjs';
import { SHIPS, PRIMARIES, SECONDARIES } from '../../src/ship/catalogue.mjs';

test('carousel previews independently, clamps selection and equips only unlocked items', () => {
    const store = new Loadouts(memoryStorage());
    const browser = new HangarSelection(store);
    browser.select('ship', 5);
    assert.equal(browser.item.id, 'moth');
    assert.equal(browser.locked, true);
    assert.equal(browser.equip(), false);
    assert.equal(store.get(0).ship, 'vanguard');
    store.grant(0, 2);
    browser.select('primary', 1);
    assert.equal(browser.equip(), true);
    assert.equal(store.get(0).primary, 'twin-shot');
    assert.equal(store.get(0).ship, 'vanguard');
    browser.select('ship', 100);
    assert.equal(browser.index, 5);
    browser.select('ship', -10);
    assert.equal(browser.index, 0);
    browser.open(1);
    assert.equal(browser.item.id, 'vanguard');
    assert.equal(browser.kit.primary, 'repeater');
});

test('paint migrates old saves and round-trips per profile through import and merge', () => {
    const storage = memoryStorage();
    storage.setItem(HANGAR_KEY, JSON.stringify({ profiles: ['dart', 'moth'] }));
    assert.deepEqual(loadHangar(storage).paints, ['cobalt', 'cobalt']);
    const hangar = loadHangar(storage);
    hangar.paints = ['crimson', 'jade'];
    assert.equal(saveHangar(storage, hangar), true);
    const imported = parseSave(saveFileText(readSave(storage)));
    assert.deepEqual(imported.shipPaint, ['crimson', 'jade']);
    const target = memoryStorage();
    writeSave(target, imported);
    assert.deepEqual(loadHangar(target).paints, ['crimson', 'jade']);
    const other = readSave(memoryStorage());
    assert.deepEqual(mergeSaves(imported, other, { settingsFrom: 'b' }).shipPaint, [
        'cobalt',
        'cobalt',
    ]);
    storage.setItem(HANGAR_KEY, JSON.stringify({ paints: ['arbitrary', 7] }));
    assert.deepEqual(loadHangar(storage).paints, ['cobalt', 'cobalt']);
    assert.equal(
        saveHangar(
            {
                setItem() {
                    throw Error('full');
                },
            },
            hangar,
        ),
        false,
    );
});

test('paint swaps only the two accent shades and preserves steel, glass, fire and alpha', () => {
    const source = new Uint8ClampedArray([
        0x37, 0x65, 0xe8, 255, 0x24, 0x49, 0xae, 255, 0x90, 0x96, 0xae, 255, 0x72, 0xe1, 0xef, 255,
        250, 140, 20, 255, 0, 0, 0, 0,
    ]);
    const painted = recolourPaint(source.slice(), 'crimson');
    assert.deepEqual([...painted.slice(0, 3)], [0xe6, 0x50, 0x69]);
    assert.ok(painted[4] < 0xe6 && painted[4] > 0x50 * 0.5 && painted[6] < painted[0]);
    assert.deepEqual(painted.slice(8), source.slice(8));
    assert.deepEqual(recolourPaint(source.slice(), 'cobalt'), source);
});

test('weapon icons cover every primary and secondary with flat binary-alpha art', () => {
    const { width, height, pixels } = decodePng(
        readFileSync(new URL('../../assets/weapons/icons.png', import.meta.url)),
    );
    const weapons = [...PRIMARIES, ...SECONDARIES];
    assert.deepEqual([width, height], [weapons.length * 24, 24]);
    const seen = new Set();
    weapons.forEach((weapon, i) => {
        const cell = [];
        for (let y = 0; y < 24; y++)
            cell.push(...pixels.slice((y * width + i * 24) * 4, (y * width + i * 24 + 24) * 4));
        assert.ok(
            cell.some((v, at) => at % 4 === 3 && v === 255),
            `${weapon.id}: empty icon`,
        );
        assert.ok(
            cell.every((v, at) => at % 4 !== 3 || v === 0 || v === 255),
            `${weapon.id}: soft alpha`,
        );
        seen.add(Buffer.from(cell).toString('base64'));
    });
    assert.equal(seen.size, weapons.length, 'every icon is distinct');
});

test('every ship keeps accent pixels that paint can recolour', () => {
    for (const ship of SHIPS) {
        const { pixels } = decodePng(
            readFileSync(new URL(`../../assets/ships/${ship.id}/states.png`, import.meta.url)),
        );
        const before = pixels.slice();
        recolourPaint(pixels, 'crimson');
        let changed = 0;
        for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i] !== before[i] || pixels[i + 2] !== before[i + 2]) changed++;
        assert.ok(
            changed >= 8 && changed < before.length / 4 / 6,
            `${ship.id}: ${changed} accent pixels`,
        );
    }
});
