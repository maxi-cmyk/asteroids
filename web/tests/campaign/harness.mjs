import { readFile } from 'node:fs/promises';
import { createRuntime } from '../../src/runtime/runtime.mjs';
import { Pilot } from '../../src/demo/pilot.mjs';

const bytes = await readFile(new URL('../../dist/game.wasm', import.meta.url));
const memory = () => {
    const values = new Map();
    return {
        getItem: (k) => values.get(k) ?? null,
        setItem: (k, v) => values.set(k, String(v)),
        removeItem: (k) => values.delete(k),
        keys: () => [...values.keys()],
    };
};
const seeded = (seed) => {
    let s = seed >>> 0;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0);
};
const engine = (storage = memory(), seed = 7, profile = 0) =>
    createRuntime(bytes, { storage, random: seeded(seed), profile: () => profile });

// Flies the running level with the scripted pilot (or leaves the ship idle) until its result.
function fly(game, { idle = false, limit = 30000 } = {}) {
    const pilot = new Pilot(game);
    for (let i = 0; i < limit && game.state !== 'results'; i++)
        game.step(game.state === 'playing' && !idle ? pilot.decide(game.scene()) : {});
    return game.result;
}

export { bytes, memory, seeded, engine, fly };
