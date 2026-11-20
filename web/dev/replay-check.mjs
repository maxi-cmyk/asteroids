// The cross-runtime replay check (nextSteps.md R3), shared by tests/replay.test.mjs (Node) and
// dev/replay.html (any browser): a scripted Zodiarch practice fight with a fixed seed and
// inputs built from integers only, recorded live and then replayed on a fresh engine. Its
// hashes must be the same in Node, Chrome, Safari and Firefox for the same game.wasm.
import { createRuntime } from '../src/runtime/runtime.mjs';
import { playReplay, sceneHash } from '../src/runtime/replay.mjs';

export const CHECK_SEED = 'c0ffee00deadbeef0123456789abcdef';

function memoryStorage() {
    const values = new Map();
    return {
        getItem: (k) => values.get(k) ?? null,
        setItem: (k, v) => values.set(k, String(v)),
        removeItem: (k) => values.delete(k),
    };
}

// Inputs from integer arithmetic only, so no runtime's Math rounding can change them.
function scriptedPilot() {
    let s = 2026;
    const r = (n) => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) % n;
    let x = 2048,
        y = 2048,
        tick = 0;
    return () => {
        tick++;
        x = Math.max(0, Math.min(4095, x + r(701) - 350));
        y = Math.max(0, Math.min(4095, y + r(701) - 350));
        return {
            x,
            y,
            fire: tick % 40 < 28,
            firePressed: tick % 40 === 0,
            aimX: ((tick * 7) % 200) / 100 - 1,
            aimY: ((tick * 3) % 120) / 100 - 0.6,
            laser: tick % 400 > 380,
        };
    };
}

export async function replayCheck(bytes, { ticks = 3000, kind = 5 } = {}) {
    const g = await createRuntime(bytes, { storage: memoryStorage() });
    g.start(true, { seed: CHECK_SEED });
    g.bossPractice(kind, 1, 1);
    const input = scriptedPilot();
    for (let i = 0; i < ticks; i++) g.step(input());
    const live = sceneHash(g.host.memory, g.api.web_scene());
    g.menu();
    const played = await playReplay(bytes, g.replay, { every: 1e9 });
    const hex = (h) => h.toString(16).padStart(8, '0');
    return {
        engine: g.replay.engine,
        ticks: played.ticks,
        live: hex(live),
        replay: hex(played.final),
        size: JSON.stringify(g.replay).length,
    };
}
