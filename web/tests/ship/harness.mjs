import { readFile } from 'node:fs/promises';
import { Loadouts } from '../../src/state/loadouts.mjs';
import { memoryStorage } from '../../src/state/save.mjs';
import { BLOCKS } from '../../src/runtime/scene-layout.mjs';
const bytes = await readFile(new URL('../../dist/test.wasm', import.meta.url));
function unlocked(storage = memoryStorage()) {
    const store = new Loadouts(storage);
    store.profiles.forEach((p) => (p.grants = [1, 2, 3, 4, 5, 6]));
    return store;
}
const random = () => {
    let seed = 7;
    return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
};
const tick = (g, n, input = {}) => {
    for (let i = 0; i < n; i++) g.step(input);
};
const shots = (g) => {
    const s = g.scene(),
        b = BLOCKS.LOADOUT_SHOTS;
    return Array.from({ length: b.count }, (_, i) =>
        s.subarray(b.at + i * b.stride, b.at + (i + 1) * b.stride),
    ).filter((p) => p[0]);
};

export { bytes, unlocked, random, tick, shots };
