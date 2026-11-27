import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIconStrip } from '../../tools/weapon-icons.mjs';
import { assertRequiredAssets, REQUIRED_ASSETS } from '../../tools/required-assets.mjs';

const root = new URL('../../', import.meta.url).pathname;

test('weapon icons.png is exactly what the generator produces', () => {
    const committed = readFileSync(new URL('../../assets/weapons/icons.png', import.meta.url));
    assert.deepEqual(Buffer.from(buildIconStrip()), committed);
});

test('the required-asset list names the weapon icon sheet and every entry exists in the repo', () => {
    assert.ok(REQUIRED_ASSETS.includes('assets/weapons/icons.png'));
    assert.doesNotThrow(() => assertRequiredAssets(root));
});

test('packaging fails, naming the path, when a required asset is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'assets-'));
    for (const file of REQUIRED_ASSETS) {
        if (file === 'assets/weapons/icons.png') continue;
        mkdirSync(join(dir, file, '..'), { recursive: true });
        writeFileSync(join(dir, file), 'x');
    }
    assert.throws(() => assertRequiredAssets(dir), /assets\/weapons\/icons\.png/);
});
