// Replays (nextSteps.md R3): a run is the engine build, its seed, the leaderboard bytes the
// engine read, and every engine call that changes state from the start of the run. A fresh
// engine fed the same calls ends in the same scene, bit for bit, on any runtime: the engine
// takes no floats from the host (native/mathf.h) and its randomness is seeded (rng.mjs).
import { SCENE_FLOATS } from './scene-layout.mjs';
import { SeededRandom, randomSeed, validSeed } from './rng.mjs';
import { WasmHost } from './wasm-host.mjs';

export const REPLAY_FORMAT = 1;

// Engine calls that change its state, in a fixed order: a call is stored as its index here.
// Anything not listed only reads (web_scene, web_state, web_stats...) and is not recorded.
export const RECORDED_CALLS = [
    'web_step',
    'web_fire_press',
    'web_actions',
    'web_audio_step',
    'web_start',
    'web_menu',
    'web_coop_start',
    'web_coop_input',
    'web_coop_pause',
    'web_practice_targets',
    'web_practice_double_fire',
    'web_practice_multishot',
    'web_practice_hold',
    'web_boss_practice',
    'web_boss_assist',
    'web_reload_scores',
    'web_demo',
    'web_demo_lives',
    'web_set_clock',
    'web_ascendant',
    'web_practice_config',
    'web_practice_spawn',
    'web_practice_clear',
    'web_practice_respawn',
    'web_practice_next_wave',
    'web_practice_reset_stats',
];
// Settings that persist across runs: their latest values open every replay.
const SETTINGS = ['web_boss_assist', 'web_ascendant', 'web_practice_config'];
const LIMIT_TICKS = 50 * 60 * 60; // an hour of play; longer runs are not kept

// A short fingerprint of the engine build (FNV-1a over the WASM bytes). A replay only plays on
// the build that made it.
export function engineFingerprint(bytes) {
    const view = new Uint8Array(bytes);
    let h = 0x811c9dc5;
    for (let i = 0; i < view.length; i++) h = Math.imul(h ^ view[i], 0x01000193) >>> 0;
    return h.toString(16).padStart(8, '0') + view.length.toString(16);
}

// A hash of the scene (its float bits), for comparing two runs.
export function sceneHash(memory, pointer) {
    const words = new Uint32Array(memory.buffer, pointer, SCENE_FLOATS);
    let h = 0x811c9dc5;
    for (let i = 0; i < words.length; i++) h = Math.imul(h ^ words[i], 0x01000193) >>> 0;
    return h;
}

// Wraps the engine's exports so state-changing calls are written to the tape while recording.
// Ticks end at each web_step; runs of identical ticks are stored once with a count.
export class ReplayRecorder {
    constructor(api, { fingerprint, rng, storage, scoreKey }) {
        this.fingerprint = fingerprint;
        this.rng = rng;
        this.storage = storage;
        this.scoreKey = scoreKey;
        this.settings = {};
        this.clock = (which) => api.web_clock(which) >>> 0;
        this.tape = null; // the replay being recorded
        this.last = null; // the last finished replay
        const recorded = new Set(RECORDED_CALLS);
        this.api = { ...api };
        for (const name of Object.keys(api)) {
            if (!recorded.has(name)) continue;
            const call = api[name];
            const id = RECORDED_CALLS.indexOf(name);
            this.api[name] = (...args) => {
                if (SETTINGS.includes(name)) this.settings[name] = args;
                if (this.tape) this.#write(id, args);
                return call(...args);
            };
        }
    }
    get recording() {
        return !!this.tape;
    }
    // Starts a tape: a fresh seed for the run, then every state-changing call. Call it before
    // the engine call that starts the run; `rules` describe the run.
    begin(rules, seed) {
        if (!this.rng) return; // a test supplied its own randomness: nothing to replay
        this.rng.reseed(seed ?? randomSeed());
        let scores = null;
        try {
            scores = this.storage?.getItem(this.scoreKey) ?? null;
        } catch {
            scores = null;
        }
        this.tape = {
            format: REPLAY_FORMAT,
            engine: this.fingerprint,
            seed: this.rng.seed,
            clock: [this.clock(0), this.clock(1)],
            scores,
            rules,
            settings: SETTINGS.filter((n) => this.settings[n]).map((n) => [
                RECORDED_CALLS.indexOf(n),
                ...this.settings[n],
            ]),
            ticks: [], // [count, [[call, ...args], ...]] per run of identical ticks
            length: 0,
        };
        this.group = [];
        this.groupKey = '';
    }
    #write(id, args) {
        const values = args.map((v) => (typeof v === 'number' ? Math.fround(v) : +v));
        this.group.push([id, ...values]);
        if (id !== 0) return;
        const key = JSON.stringify(this.group);
        const ticks = this.tape.ticks;
        if (key === this.groupKey) ticks[ticks.length - 1][0]++;
        else ticks.push([1, this.group]);
        this.groupKey = key;
        this.group = [];
        if (++this.tape.length > LIMIT_TICKS) this.discard();
    }
    // Ends the tape and keeps it as `last`.
    finish() {
        if (!this.tape) return null;
        if (this.group.length) this.tape.ticks.push([1, this.group]);
        this.last = this.tape;
        this.tape = null;
        return this.last;
    }
    discard() {
        this.tape = null;
    }
}

// A replay loaded into a fresh engine, played a tick at a time (`step`) or all at once
// (`playReplay`). Throws on a replay from another build or of the wrong shape.
export class ReplayPlayer {
    static async open(bytes, replay, { scoreKey = 'replay', tone } = {}) {
        if (replay?.format !== REPLAY_FORMAT) throw new Error('Unknown replay format');
        if (replay.engine !== engineFingerprint(bytes))
            throw new Error('Replay is from another build');
        if (!validSeed(replay.seed)) throw new Error('Replay seed is malformed');
        if (!Array.isArray(replay.clock) || replay.clock.some((v) => !(v >= 0 && v < 2 ** 32)))
            throw new Error('Replay clock is malformed');
        if (!Array.isArray(replay.ticks) || !Array.isArray(replay.settings))
            throw new Error('Replay is malformed');
        const values = new Map(
            typeof replay.scores === 'string' ? [[scoreKey, replay.scores]] : [],
        );
        const storage = {
            getItem: (k) => values.get(k) ?? null,
            setItem: (k, v) => values.set(k, String(v)),
            removeItem: (k) => values.delete(k),
        };
        const rng = new SeededRandom(replay.seed);
        const host = await WasmHost.load(bytes, {
            storage,
            scoreKey,
            tone,
            random: () => rng.next(),
        });
        host.api.web_init();
        rng.reseed(replay.seed);
        return new ReplayPlayer(host, replay);
    }
    constructor(host, replay) {
        this.host = host;
        this.api = host.api;
        this.replay = replay;
        this.tick = 0;
        this.length = replay.ticks.reduce((n, [count]) => n + count, 0);
        if (!(this.length <= LIMIT_TICKS)) throw new Error('Replay is too long');
        this.group = 0;
        this.left = replay.ticks[0]?.[0] ?? 0;
        this.api.web_set_clock(...replay.clock);
        replay.settings.forEach((call) => this.#call(call));
    }
    #call(call) {
        const [id, ...args] = Array.isArray(call) ? call : [];
        const name = RECORDED_CALLS[id];
        if (!Number.isInteger(id) || typeof this.api[name] !== 'function')
            throw new Error(`Replay calls unknown ${id}`);
        if (!args.every(Number.isFinite)) throw new Error('Replay holds a bad value');
        this.api[name](...args);
    }
    get done() {
        return this.tick >= this.length;
    }
    // Plays the next tick; false once the replay is over.
    step() {
        if (this.done) return false;
        while (this.left === 0) this.left = this.replay.ticks[++this.group][0];
        this.replay.ticks[this.group][1].forEach((call) => this.#call(call));
        this.left--;
        this.tick++;
        return true;
    }
    scene() {
        return new Float32Array(this.host.memory.buffer, this.api.web_scene(), SCENE_FLOATS);
    }
    hash() {
        return sceneHash(this.host.memory, this.api.web_scene());
    }
}

// Plays a whole replay. Returns the scene hash after every `every` ticks and the final hash.
export async function playReplay(bytes, replay, { every = 1 } = {}) {
    const player = await ReplayPlayer.open(bytes, replay);
    const hashes = [];
    while (player.step()) if (player.tick % every === 0) hashes.push(player.hash());
    return { ticks: player.tick, hashes, final: player.hash(), host: player.host };
}
