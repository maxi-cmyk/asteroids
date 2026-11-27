// The weapon icon strip: one 24x24 cell per weapon, primaries then secondaries, as PNG bytes.
// Shared by tools/make-weapon-icons.mjs (which writes it) and the test that keeps the committed
// assets/weapons/icons.png identical to it.
import { encodePng } from './ship-art/png.mjs';
import { blank, blit } from './ship-art/raster.mjs';
import { drawIcon, SIZE } from './ship-art/weapons.mjs';
import { PRIMARIES, SECONDARIES } from '../src/ship/catalogue.mjs';

export const WEAPONS = [...PRIMARIES, ...SECONDARIES];

export function buildIconStrip() {
    const strip = blank(WEAPONS.length * SIZE, SIZE);
    WEAPONS.forEach((weapon, i) => {
        blit(strip, WEAPONS.length * SIZE, drawIcon(weapon.id), SIZE, SIZE, i * SIZE, 0);
    });
    return encodePng(WEAPONS.length * SIZE, SIZE, strip);
}
