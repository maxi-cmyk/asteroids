import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { decodePng } from '../../tools/ship-art/png.mjs';
import { SHIPS } from '../../src/ship/catalogue.mjs';

test('state drafts use a bounded flat palette (eight steel, glass and fire colours plus two accent shades), binary alpha and sixteen distinct rotations', () => {
    for (const ship of SHIPS) {
        const path = new URL(`../../assets/ships/${ship.id}/states.png`, import.meta.url);
        const { width, height, pixels } = decodePng(readFileSync(path));
        assert.deepEqual([width, height], [544, 32]);
        const colours = new Set();
        for (let i = 0; i < pixels.length; i += 4) {
            assert.ok(pixels[i + 3] === 0 || pixels[i + 3] === 255, `${ship.id}: soft alpha`);
            if (pixels[i + 3]) colours.add(pixels.slice(i, i + 4).join(','));
        }
        assert.ok(colours.size <= 10, `${ship.id}: ${colours.size} colours`);
        const frames = new Set();
        for (let frame = 0; frame < 16; frame++) {
            const words = [];
            for (let y = 0; y < 32; y++)
                words.push(
                    ...pixels.slice(
                        (y * width + frame * 32) * 4,
                        (y * width + frame * 32 + 32) * 4,
                    ),
                );
            assert.ok(words.some(Boolean), `${ship.id}: empty state ${frame}`);
            frames.add(Buffer.from(words).toString('base64'));
        }
        assert.equal(frames.size, 16, `${ship.id}: repeated aiming states`);
    }
    assert.equal(existsSync(new URL('../../assets/ships.png', import.meta.url)), false);
});
