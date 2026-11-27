// Weapon icons for the Hangar. node web/tools/make-weapon-icons.mjs
// Writes assets/weapons/icons.png (one 24x24 cell per weapon: primaries, then secondaries, in
// catalogue order). The PNG is committed; tests/ship/weapon-icons-fresh.test.mjs fails if it
// drifts from this generator.
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildIconStrip, WEAPONS } from './weapon-icons.mjs';

const root = new URL('../assets/weapons/', import.meta.url);
mkdirSync(root, { recursive: true });
writeFileSync(new URL('icons.png', root), buildIconStrip());

console.log(`weapons: ${WEAPONS.length} icons`);
