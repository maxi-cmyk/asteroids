import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    HULLS,
    DEFAULT_HULL,
    HANGAR_KEY,
    hullSprite,
    hullIcon,
    sanitizeHangar,
    loadHangar,
    saveHangar,
} from '../src/state/hangar.mjs';

const memory = () => {
    const data = new Map();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), data };
};

test('unknown, missing or malformed choices fall back to the stock hull per profile', () => {
    assert.deepEqual(sanitizeHangar(null).profiles, [DEFAULT_HULL, DEFAULT_HULL]);
    assert.deepEqual(sanitizeHangar({ profiles: ['dart', 'nonsense'] }).profiles, [
        'dart',
        DEFAULT_HULL,
    ]);
    assert.deepEqual(sanitizeHangar({ profiles: 'dart' }).profiles, [DEFAULT_HULL, DEFAULT_HULL]);
});

test('choices round-trip through storage and survive corrupt data', () => {
    const storage = memory();
    assert.equal(saveHangar(storage, { profiles: ['moth', 'comet'] }), true);
    assert.deepEqual(loadHangar(storage).profiles, ['moth', 'comet']);
    storage.setItem(HANGAR_KEY, '{not json');
    assert.deepEqual(loadHangar(storage).profiles, [DEFAULT_HULL, DEFAULT_HULL]);
    assert.equal(
        saveHangar(
            {
                setItem() {
                    throw new Error('full');
                },
            },
            { profiles: [] },
        ),
        false,
    );
});

test('the stock hull uses the original atlas names; others use hull cells', () => {
    assert.equal(hullSprite('vanguard', 3), 'ship-aim-3');
    assert.equal(hullSprite('wasp', 15), 'hull-wasp-aim-15');
    assert.equal(hullSprite('bogus', 0), 'ship-aim-0');
    assert.equal(hullIcon('vanguard'), 'ship');
    assert.equal(hullIcon('hammer'), 'hull-hammer-icon');
});

test('each ship owns sixteen aiming cells and an icon in an independent PNG', () => {
    const index = JSON.parse(readFileSync(new URL('../assets/ships/index.json', import.meta.url)));
    assert.equal(index.hulls.length, HULLS.length);
    for (const hull of HULLS) {
        const entry = index.hulls.find((entry) => entry.id === hull.id);
        assert.ok(entry, hull.id);
        const meta = JSON.parse(
            readFileSync(new URL(`../${entry.manifest.slice(2)}`, import.meta.url)),
        );
        assert.equal(meta.id, hull.id);
        assert.equal(meta.direction0, 'right');
        assert.equal(meta.stepDegrees, 22.5);
        for (let n = 0; n < 16; n++)
            assert.deepEqual(meta.cells[hullSprite(hull.id, n)], { x: n * 32, y: 0, w: 32, h: 32 });
        assert.deepEqual(meta.cells[hullIcon(hull.id)], { x: 516, y: 8, w: 24, h: 16 });
    }
    assert.equal(new Set(HULLS.map((h) => h.id)).size, HULLS.length);
});
