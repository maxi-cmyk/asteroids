// Weapon icons for the Hangar. node web/tools/make-weapon-icons.mjs
// Writes assets/weapons/icons.png (one 24x24 cell per weapon: primaries, then secondaries, in
// catalogue order).
import { writeFileSync, mkdirSync } from 'node:fs';
import { encodePng } from './ship-art/png.mjs';
import { blank, blit } from './ship-art/raster.mjs';
import { drawIcon, SIZE } from './ship-art/weapons.mjs';
import { PRIMARIES, SECONDARIES } from '../src/ship/catalogue.mjs';

const weapons = [...PRIMARIES, ...SECONDARIES];
const root = new URL('../assets/weapons/', import.meta.url);
mkdirSync(root, { recursive: true });
const strip = blank(weapons.length * SIZE, SIZE);
weapons.forEach((weapon, i) => {
    blit(strip, weapons.length * SIZE, drawIcon(weapon.id), SIZE, SIZE, i * SIZE, 0);
});
writeFileSync(new URL('icons.png', root), encodePng(weapons.length * SIZE, SIZE, strip));

console.log(`weapons: ${weapons.length} icons`);
