// Files the shipped page cannot work without but that are easy to lose (a gitignored folder, a
// generator nobody ran). The build refuses to package without them.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const REQUIRED_ASSETS = ['assets/weapons/icons.png'];

export function assertRequiredAssets(root) {
    const missing = REQUIRED_ASSETS.filter((file) => !existsSync(join(root, file)));
    if (missing.length) throw new Error(`Required assets missing: ${missing.join(', ')}`);
}
