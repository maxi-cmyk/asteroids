// Replays (nextSteps.md R3): a recorded run, played on a fresh engine, matches the live run
// scene for scene, even when the live engine had already been used for other runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { playReplay, sceneHash, engineFingerprint } from '../src/runtime/replay.mjs';
import { SeededRandom } from '../src/runtime/rng.mjs';

const bytes = await readFile(new URL('../dist/game.wasm', import.meta.url));
const memory = () => {
    const values = new Map();
    return {
        getItem: (k) => values.get(k) ?? null,
        setItem: (k, v) => values.set(k, String(v)),
        removeItem: (k) => values.delete(k),
    };
};
// A scripted pilot: wandering stick, bursts of fire, the laser now and then. Its own
// generator, so the inputs are the same on every run of the test.
function pilot(seed) {
    let s = seed >>> 0;
    const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    let x = 2048,
        y = 2048,
        tick = 0;
    return () => {
        tick++;
        x = Math.max(0, Math.min(4095, x + (r() - 0.5) * 700));
        y = Math.max(0, Math.min(4095, y + (r() - 0.5) * 700));
        return {
            x: Math.round(x),
            y: Math.round(y),
            fire: tick % 40 < 28,
            firePressed: tick % 40 === 0,
            aimX: Math.cos(tick / 50),
            aimY: Math.sin(tick / 37) * 0.6,
            laser: tick % 400 > 380,
        };
    };
}
const hashOf = (g) => sceneHash(g.host.memory, g.api.web_scene());

async function usedEngine() {
    const g = await createRuntime(bytes, { storage: memory() });
    // Use it first: a solo run and a co-op run that are thrown away.
    g.start(false);
    const warm = pilot(7);
    for (let i = 0; i < 900; i++) g.step(warm());
    g.abandon();
    g.startCoop({ friendlyFire: true });
    for (let i = 0; i < 400; i++) g.step({ players: [warm(), warm()] });
    g.abandon();
    for (let i = 0; i < 60; i++) g.step({});
    return g;
}

test('a boss-practice run replays on a fresh engine, tick for tick', async () => {
    const g = await usedEngine();
    g.bossAssist({ longWarnings: true, calm: false });
    g.start(true);
    g.bossPractice(2, 1, 1);
    const input = pilot(42);
    const live = [];
    for (let i = 0; i < 3000; i++) {
        g.step(input());
        live.push(hashOf(g));
    }
    g.menu(); // ends the practice run, which finishes its replay
    const replay = JSON.parse(JSON.stringify(g.replay)); // survives being stored as JSON
    assert.equal(replay.engine, engineFingerprint(bytes));
    assert.equal(replay.rules.practice, true);
    const played = await playReplay(bytes, replay);
    assert.equal(played.ticks, 3000);
    const first = played.hashes.findIndex((h, i) => h !== live[i]);
    assert.equal(first, -1, `replay diverged at tick ${first}`);
    // A different seed is a different run.
    const other = await playReplay(bytes, { ...replay, seed: 'f'.repeat(32) });
    assert.notEqual(other.final, played.final);
});

test('a solo run and a co-op run replay to the same scenes', async () => {
    const g = await usedEngine();
    g.start(false);
    const input = pilot(5);
    const solo = [];
    for (let i = 0; i < 5000 && g.recorder.run; i++) {
        g.step(input());
        solo.push(hashOf(g));
    }
    assert.equal(g.recorder.run, null, 'the scripted pilot should lose the run');
    const soloPlayed = await playReplay(bytes, g.replay);
    assert.equal(soloPlayed.ticks, solo.length);
    assert.equal(
        soloPlayed.hashes.findIndex((h, i) => h !== solo[i]),
        -1,
    );
    // An abandoned run keeps no replay of its own.
    const finished = g.replay;
    g.start(false);
    for (let i = 0; i < 50; i++) g.step(input());
    g.abandon();
    assert.equal(g.replay, finished);

    g.startCoop({ friendlyFire: false });
    const a = pilot(11),
        b = pilot(12);
    const coop = [];
    for (let i = 0; i < 2500; i++) {
        g.step({ players: [a(), b()] });
        coop.push(hashOf(g));
        if (g.api.web_state() === 6) break;
    }
    // End the tape as a finished run would.
    g.replays.finish();
    const played = await playReplay(bytes, g.replay);
    assert.equal(played.ticks, coop.length);
    assert.equal(
        played.hashes.findIndex((h, i) => h !== coop[i]),
        -1,
    );
});

test('runs of identical ticks are stored once', async () => {
    const g = await createRuntime(bytes, { storage: memory() });
    g.start(true);
    for (let i = 0; i < 1000; i++) g.step({}); // nobody touches anything
    g.menu();
    assert.ok(g.replay.ticks.length < 20, `${g.replay.ticks.length} groups`);
    assert.ok(JSON.stringify(g.replay).length < 4000);
});

test('replays refuse another build, a bad seed and an unknown format', async () => {
    const g = await createRuntime(bytes, { storage: memory() });
    g.start(true);
    for (let i = 0; i < 10; i++) g.step({});
    g.menu();
    const r = g.replay;
    await assert.rejects(playReplay(bytes, { ...r, engine: 'deadbeef' }), /another build/);
    await assert.rejects(playReplay(bytes, { ...r, seed: 'x' }), /seed/);
    await assert.rejects(playReplay(bytes, { ...r, format: 9 }), /format/);
});

test('the seeded generator is the same sequence on every runtime', () => {
    const r = new SeededRandom('0123456789abcdef0123456789abcdef');
    const values = Array.from({ length: 5 }, () => r.next());
    // Fixed values: if these change, every stored replay breaks.
    assert.deepEqual(values, [3530455095, 2738071380, 2303632856, 2328069915, 2463861768]);
    r.reseed('0123456789abcdef0123456789abcdef');
    assert.deepEqual(
        Array.from({ length: 5 }, () => r.next()),
        values,
    );
});

test('the cross-runtime check agrees with itself in Node (compare with dev/replay.html)', async () => {
    const { replayCheck } = await import('../dev/replay-check.mjs');
    const result = await replayCheck(bytes);
    console.log('replay check (Node):', JSON.stringify(result));
    assert.equal(result.live, result.replay);
    assert.equal(result.ticks, 3000);
});

test('the compact replay file round-trips exactly and is far smaller than JSON', async () => {
    const { encodeReplay, decodeReplay } = await import('../src/runtime/replay-codec.mjs');
    const g = await usedEngine();
    g.ascendant(7);
    g.start(true);
    g.bossPractice(5, 0, 1);
    const input = pilot(9);
    for (let i = 0; i < 3000; i++) g.step(input());
    const live = hashOf(g);
    g.menu();
    const file = encodeReplay(g.replay);
    const back = decodeReplay(file);
    assert.deepEqual(back, JSON.parse(JSON.stringify(g.replay)));
    assert(
        Object.is(
            decodeReplay(encodeReplay({ ...g.replay, ticks: [[1, [[2, -0, 0.5]]]] }))
                .ticks[0][1][0][1],
            -0,
        ),
    );
    const json = JSON.stringify(g.replay).length;
    assert(file.length * 3 < json, `${file.length} bytes vs ${json} as JSON`);
    const played = await playReplay(bytes, back);
    assert.equal(played.final, live);
    // Not a replay, cut short, or with junk after it: refused.
    assert.throws(() => decodeReplay(new Uint8Array([1, 2, 3, 4, 5])), /Not a replay/);
    assert.throws(() => decodeReplay(file.slice(0, file.length - 3)), /cut short|trailing|bad/);
    assert.throws(() => decodeReplay(new Uint8Array([...file, 0])), /trailing/);
});

// ---- replay schema (audit A04/A05): a tape is fully validated before any engine call --------
const { validateReplay, REPLAY_LIMITS, CALL_ARITY, RECORDED_CALLS } = await import(
    '../src/runtime/replay-schema.mjs'
);
const { ReplayPlayer } = await import('../src/runtime/replay.mjs');
const { encodeReplay, decodeReplay } = await import('../src/runtime/replay-codec.mjs');
const STEP = [0, 2048, 2048, 0, 0, 0]; // web_step has 5 arguments (id 0 + 5 values)
const tape = (over = {}) => ({
    format: 1,
    engine: engineFingerprint(bytes),
    seed: '0123456789abcdef0123456789abcdef',
    clock: [0, 0],
    scores: null,
    rules: {},
    settings: [],
    ticks: [[1, [STEP]]],
    ...over,
});

test('the call-arity table matches the engine exports', async () => {
    const g = await createRuntime(bytes, { storage: memory() });
    RECORDED_CALLS.forEach((name, id) =>
        assert.equal(CALL_ARITY[id], g.host.api[name].length, name),
    );
});

test('a real recorded run and a terminal partial group are valid tapes', async () => {
    const g = await createRuntime(bytes, { storage: memory() });
    g.start(true); // a practice run keeps its tape when it ends
    const fly = pilot(3);
    for (let i = 0; i < 120; i++) g.step(fly());
    g.menu();
    assert.doesNotThrow(() => validateReplay(g.replay));
    assert.doesNotThrow(() =>
        validateReplay(
            tape({
                ticks: [
                    [1, [STEP]],
                    [1, [[3]]],
                ],
            }),
        ),
    );
    assert.doesNotThrow(() => validateReplay(tape({ clock: [0, 2 ** 32 - 1] })));
});

test('malformed clocks are rejected', () => {
    for (const clock of [[], [1], [1, 2, 3], ['1.5', 2], [1.5, 0], [-1, 0], [0, 2 ** 32], [NaN, 0]])
        assert.throws(() => validateReplay(tape({ clock })), /clock/, JSON.stringify(clock));
});

test('repeat counts must be safe integers of at least one', () => {
    for (const count of [0, -1, 1.5, '2', NaN, Infinity, 2 ** 53])
        assert.throws(() => validateReplay(tape({ ticks: [[count, [STEP]]] })), /repeat|count/);
});

test('calls need a known id, exact arity and finite arguments', () => {
    const bad = [
        [2], // web_actions with no arguments
        [0, 1, 2], // web_step with too few
        [99],
        [1.5],
        [3, 1], // web_audio_step takes none
        [1, NaN],
        [1, '5'],
        'not a call',
    ];
    for (const call of bad)
        assert.throws(
            () => validateReplay(tape({ ticks: [[1, [call]]] })),
            /call|argument|unknown/,
        );
    assert.throws(() => validateReplay(tape({ settings: [[2]] })), /setting/);
    assert.throws(() => validateReplay(tape({ settings: [[3]] })), /setting/); // not a setting call
});

test('work budgets: repetition cannot hide expanded calls, and groups stay small', () => {
    const many = Array.from({ length: 63 }, () => [3]);
    const ticks = REPLAY_LIMITS.ticks;
    assert.doesNotThrow(() => validateReplay(tape({ ticks: [[ticks, [[3], [3], [3]]]] })));
    assert.throws(() => validateReplay(tape({ ticks: [[ticks, many]] })), /too much work/);
    const wide = Array.from({ length: REPLAY_LIMITS.callsPerGroup + 1 }, () => [3]);
    assert.throws(() => validateReplay(tape({ ticks: [[1, wide]] })), /too many calls/);
    assert.throws(() => validateReplay(tape({ ticks: [[ticks + 1, [STEP]]] })), /too long/);
});

test('a malformed tape is refused before the engine is instantiated', async () => {
    const real = WebAssembly.instantiate;
    let loads = 0;
    WebAssembly.instantiate = (...args) => (loads++, real(...args));
    try {
        for (const bad of [
            tape({ clock: [] }),
            tape({ settings: [[2]] }),
            tape({ ticks: [[1.5, [STEP]]] }),
        ])
            await assert.rejects(ReplayPlayer.open(bytes, bad));
        assert.equal(loads, 0);
    } finally {
        WebAssembly.instantiate = real;
    }
});

test('the replay file decoder refuses oversized shapes before building them', () => {
    const wide = Array.from({ length: REPLAY_LIMITS.callsPerGroup + 1 }, () => [3]);
    const file = encodeReplay(tape({ ticks: [[1, wide]] }));
    assert.throws(() => decodeReplay(file), /too many calls|bad call/);
    const groups = encodeReplay(
        tape({ ticks: Array.from({ length: REPLAY_LIMITS.groups + 1 }, () => [1, [[3]]]) }),
    );
    assert.throws(() => decodeReplay(groups), /too many groups|too large/);
});

// ---- replay file intake (audit A07) ------------------------------------------------------------
const { readReplayFile } = await import('../src/runtime/replay-file.mjs');
const { MAX_REPLAY_BYTES } = await import('../src/runtime/replay-codec.mjs');
const fileOf = (data, size = data.length) => ({
    size,
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
    text: () => assert.fail('the JSON route must reuse the one read'),
});

test('an over-limit replay file is refused before either reader runs', async () => {
    const throwing = {
        size: MAX_REPLAY_BYTES + 1,
        arrayBuffer: () => assert.fail('read'),
        text: () => assert.fail('read'),
    };
    await assert.rejects(readReplayFile(throwing), /too large/);
});

test('both replay file routes read the file once and accept the exact limit', async () => {
    const object = tape();
    const json = new TextEncoder().encode(JSON.stringify(object));
    assert.deepEqual(await readReplayFile(fileOf(json)), object);
    assert.deepEqual(await readReplayFile(fileOf(encodeReplay(object))), object);
    await assert.rejects(readReplayFile(fileOf(json, MAX_REPLAY_BYTES + 1)), /too large/);
    const edge = fileOf(json, MAX_REPLAY_BYTES);
    assert.deepEqual(await readReplayFile(edge), object);
});

test('a file that is not a replay is refused with a plain message', async () => {
    await assert.rejects(readReplayFile(fileOf(new TextEncoder().encode('{nope'))), /not a replay/);
});
