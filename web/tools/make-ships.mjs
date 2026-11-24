// Author per-ship draft aiming states before the next gameplay build.
// node web/tools/make-ships.mjs — no dependencies and no shared ships.png output.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encodePng, decodePng } from './ship-art/png.mjs';
import { blank, body, aiming, blit } from './ship-art/raster.mjs';
import { accentLayers } from './ship-art/accents.mjs';
const root = new URL('../assets/ships/', import.meta.url);
const ids = ['vanguard', 'dart', 'lancer', 'wasp', 'hammer', 'moth', 'comet'];
const hulls = [];
for (const id of ids) {
    const directory = new URL(`${id}/`, root);
    mkdirSync(directory, { recursive: true });
    let pixels;
    if (id === 'comet') pixels = decodePng(readFileSync(new URL('states.png', directory))).pixels;
    else {
        const model = JSON.parse(readFileSync(new URL('design.json', directory), 'utf8'));
        const base = body({ ...model, layers: [...model.layers, ...accentLayers(id)] });
        pixels = blank(544, 32);
        for (let i = 0; i < 16; i++) blit(pixels, 544, aiming(base, i), 32, 32, i * 32, 0);
        blit(pixels, 544, base, 24, 16, 516, 8);
        writeFileSync(new URL('states.png', directory), encodePng(544, 32, pixels));
    }
    const prefix = id === 'vanguard' ? 'ship' : `hull-${id}`;
    const cells = Object.fromEntries(
        Array.from({ length: 16 }, (_, i) => [
            `${prefix}-aim-${i}`,
            { x: i * 32, y: 0, w: 32, h: 32 },
        ]),
    );
    cells[id === 'vanguard' ? 'ship' : `${prefix}-icon`] = { x: 516, y: 8, w: 24, h: 16 };
    const manifest = {
        version: 1,
        id,
        image: `./assets/ships/${id}/states.png`,
        width: 544,
        height: 32,
        direction0: 'right',
        stepDegrees: 22.5,
        cells,
    };
    writeFileSync(new URL('states.json', directory), JSON.stringify(manifest, null, 2) + '\n');
    hulls.push({ id, manifest: `./assets/ships/${id}/states.json` });
}
writeFileSync(new URL('index.json', root), JSON.stringify({ version: 1, hulls }, null, 2) + '\n');
console.log(`Drafted ${hulls.length} individual state sheets in ${fileURLToPath(root)}`);
