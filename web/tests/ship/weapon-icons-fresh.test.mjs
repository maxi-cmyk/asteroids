import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodePng } from '../../tools/ship-art/png.mjs';
import { buildIconStrip } from '../../tools/weapon-icons.mjs';
import { assertRequiredAssets, REQUIRED_ASSETS } from '../../tools/required-assets.mjs';

const root = new URL('../../', import.meta.url).pathname;

// Pixels, not file bytes: deflate output may differ between zlib builds and CPUs.
test('weapon icons.png has exactly the pixels the generator produces', () => {
    const committed = decodePng(
        readFileSync(new URL('../../assets/weapons/icons.png', import.meta.url)),
    );
    const fresh = decodePng(Buffer.from(buildIconStrip()));
    assert.equal(committed.width, fresh.width);
    assert.equal(committed.height, fresh.height);
    assert.ok(Buffer.from(committed.pixels).equals(Buffer.from(fresh.pixels)));
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
