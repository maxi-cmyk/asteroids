// The shape of a replay tape and the budgets that keep playing one bounded (audit A04/A05).
// `validateReplay` is pure: it touches no engine, so a malformed or oversized tape is refused
// before any WASM is instantiated or called. Binary files get the same limits in the codec.

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
    'web_start_level',
    'web_loadout',
];
// How many arguments each recorded call takes (tests check this against the engine's exports).
export const CALL_ARITY = [
    5, 1, 5, 0, 1, 0, 1, 9, 1, 0, 0, 0, 2, 3, 2, 0, 0, 1, 2, 1, 6, 1, 0, 0, 0, 0, 3, 5,
];
// Settings that persist across runs: their latest values open every replay.
export const SETTINGS = ['web_boss_assist', 'web_ascendant', 'web_practice_config'];

const TICKS = 50 * 60 * 60; // an hour of play; longer runs are not kept
export const REPLAY_LIMITS = {
    ticks: TICKS,
    groups: TICKS, // a group is at least one tick
    callsPerGroup: 64,
    expandedCalls: TICKS * 16, // calls made over the whole run, repeats counted
    settings: 16,
};

const SETTING_IDS = new Set(SETTINGS.map((name) => RECORDED_CALLS.indexOf(name)));
const count = (n) => Number.isSafeInteger(n) && n >= 1;

function checkCall(call, what) {
    if (!Array.isArray(call)) throw new Error(`Replay ${what} is malformed`);
    const [id, ...args] = call;
    if (!Number.isInteger(id) || id < 0 || id >= RECORDED_CALLS.length)
        throw new Error(`Replay calls unknown ${id}`);
    if (args.length !== CALL_ARITY[id])
        throw new Error(`Replay ${what} has the wrong number of arguments`);
    if (!args.every((v) => typeof v === 'number' && Number.isFinite(v)))
        throw new Error(`Replay ${what} has a bad argument`);
    return id;
}

// Checks a replay object completely and returns it unchanged: after this nothing in it needs
// coercing, and its play is bounded by `limits`. Throws on the first problem.
export function validateReplay(replay, limits = REPLAY_LIMITS) {
    const { clock, settings, ticks } = replay ?? {};
    if (
        !Array.isArray(clock) ||
        clock.length !== 2 ||
        !clock.every((v) => Number.isSafeInteger(v) && v >= 0 && v < 2 ** 32)
    )
        throw new Error('Replay clock is malformed');
    if (!Array.isArray(settings) || !Array.isArray(ticks)) throw new Error('Replay is malformed');
    if (settings.length > limits.settings) throw new Error('Replay has too many settings');
    for (const call of settings)
        if (!SETTING_IDS.has(checkCall(call, 'setting')))
            throw new Error('Replay setting is not a setting call');
    if (ticks.length > limits.groups) throw new Error('Replay has too many groups');
    let length = 0,
        work = 0;
    for (const group of ticks) {
        if (!Array.isArray(group) || group.length !== 2 || !Array.isArray(group[1]))
            throw new Error('Replay group is malformed');
        const [repeat, calls] = group;
        if (!count(repeat)) throw new Error('Replay repeat count is malformed');
        if (calls.length > limits.callsPerGroup) throw new Error('Replay group has too many calls');
        for (const call of calls) checkCall(call, 'call');
        length += repeat;
        work += repeat * calls.length;
        if (length > limits.ticks) throw new Error('Replay is too long');
        if (work > limits.expandedCalls) throw new Error('Replay would do too much work');
    }
    return replay;
}
