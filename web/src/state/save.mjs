// One save (nextSteps.md R4): everything this browser keeps about the players, as one
// versioned object that can be exported, imported and merged. The parts still live under
// their own storage keys (each module keeps reading its own); this module reads them all
// through the same validators, merges two saves, and writes a save back in one go.
// The fight log is a developer tool and is not part of a save.
import { PersonalBests, RECORDS_KEY, MIN_ACCURACY_SHOTS } from './records.mjs';
import { BossRecords, BOSS_RECORDS_KEY } from '../boss/records.mjs';
import { CoopLeaderboard, COOP_SCORE_KEYS } from './coop-records.mjs';
import { HANGAR_KEY, loadHangar, isHull, DEFAULT_HULL } from './hangar.mjs';
import { SETTINGS_KEY, loadProfiles } from './settings.mjs';
import { UNLOCKS_KEY } from '../boss/unlocks.mjs';
import { CAMPAIGN_KEY, normalizeProfile, mergeProfiles } from './campaign-data.mjs';

export const SAVE_FORMAT = 1;
export const SAVE_GAME = 'asteroids-oled-web';
export const SCORE_KEYS = { hd: 'asteroids.web.hd.scores-v3', oled: 'asteroids.web.scores-v3' };
const SCORE_BYTES = 42,
    SCORE_SLOTS = 5,
    SCORE_MAX = 999999;
const MAX_IMPORT_BYTES = 512 * 1024;

// ------------------------------------------------------------ top-five score tables
// The engine's 42-byte record (docs/PRD.md): version 1, a count, then five slots of a
// little-endian score and three initials plus a terminator.
export function decodeScores(bytes) {
    if (
        !Array.isArray(bytes) ||
        bytes.length !== SCORE_BYTES ||
        bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255) ||
        bytes[0] !== 1 ||
        bytes[1] > SCORE_SLOTS
    )
        return [];
    const entries = [];
    for (let i = 0; i < bytes[1]; i++) {
        const at = 2 + i * 8;
        const score =
            bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24);
        const initials = String.fromCharCode(...bytes.slice(at + 4, at + 7));
        if (
            score < 1 ||
            score > SCORE_MAX ||
            !/^[A-Z]{3}$/.test(initials) ||
            bytes[at + 7] !== 0 ||
            (i && score > entries[i - 1].score)
        )
            return [];
        entries.push({ initials, score });
    }
    return entries;
}
export function encodeScores(entries) {
    const bytes = Array(SCORE_BYTES).fill(0);
    bytes[0] = 1;
    bytes[1] = entries.length;
    entries.forEach(({ initials, score }, i) => {
        const at = 2 + i * 8;
        for (let b = 0; b < 4; b++) bytes[at + b] = (score >>> (8 * b)) & 255;
        for (let c = 0; c < 3; c++) bytes[at + 4 + c] = initials.charCodeAt(c);
    });
    return bytes;
}
// The best five of both lists; the same entry in both counts once.
function mergeTopFive(a, b, max = SCORE_MAX) {
    const seen = new Set();
    return [...a, ...b]
        .filter((e) => /^[A-Z]{3}$/.test(e.initials) && Number.isInteger(e.score))
        .filter((e) => e.score >= 1 && e.score <= max)
        .filter((e) => {
            const key = `${e.initials}:${e.score}`;
            return !seen.has(key) && seen.add(key);
        })
        .sort((x, y) => y.score - x.score)
        .slice(0, SCORE_SLOTS);
}

// ------------------------------------------------------------ reading and writing
function readJson(storage, key) {
    try {
        return JSON.parse(storage?.getItem(key) || 'null');
    } catch {
        return null;
    }
}

// The save held in `storage`, every part checked by the module that owns it.
export function readSave(storage) {
    const unlocks = readJson(storage, UNLOCKS_KEY);
    return {
        format: SAVE_FORMAT,
        game: SAVE_GAME,
        savedAt: new Date().toISOString(),
        scores: {
            hd: decodeScores(readJson(storage, SCORE_KEYS.hd)),
            oled: decodeScores(readJson(storage, SCORE_KEYS.oled)),
        },
        coopScores: COOP_SCORE_KEYS.map((_, ff) => new CoopLeaderboard(storage, !!ff).entries),
        records: new PersonalBests(storage).profiles,
        bossDefeats: new BossRecords(storage).profiles,
        campaign: [0, 1].map((i) =>
            normalizeProfile(readJson(storage, CAMPAIGN_KEY)?.profiles?.[i]),
        ),
        unlocks: {
            all: unlocks?.all === true,
            profiles: [0, 1].map((i) =>
                [
                    ...new Set(Array.isArray(unlocks?.profiles?.[i]) ? unlocks.profiles[i] : []),
                ].filter((id) => isHull(id) && id !== DEFAULT_HULL),
            ),
        },
        hangar: loadHangar(storage).profiles,
        settings: loadProfiles(storage),
    };
}

// Checks a save from outside (an imported file) by loading it through the same validators:
// it is written into a scratch storage and read back. Anything malformed is dropped part by
// part; a file that is not a save at all throws.
export function parseSave(text) {
    if (typeof text !== 'string' || text.length > MAX_IMPORT_BYTES)
        throw new Error('That file is too large to be a save.');
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('That file is not a save (it is not JSON).');
    }
    if (data?.game !== SAVE_GAME || data.format !== SAVE_FORMAT)
        throw new Error('That file is not a save from this game.');
    const scratch = memoryStorage();
    const put = (key, value) => value !== undefined && scratch.setItem(key, JSON.stringify(value));
    put(SCORE_KEYS.hd, encodeScores(mergeTopFive(list(data.scores?.hd), [])));
    put(SCORE_KEYS.oled, encodeScores(mergeTopFive(list(data.scores?.oled), [])));
    COOP_SCORE_KEYS.forEach((key, ff) =>
        put(key, { version: 1, entries: mergeTopFive(list(data.coopScores?.[ff]), [], 1999998) }),
    );
    put(RECORDS_KEY, { version: 1, profiles: pair(data.records) });
    put(BOSS_RECORDS_KEY, { version: 1, profiles: pair(data.bossDefeats) });
    // A save from before the campaign has no such part: it reads back as no progress.
    put(CAMPAIGN_KEY, { version: 1, profiles: pair(data.campaign) });
    put(UNLOCKS_KEY, {
        version: 1,
        all: data.unlocks?.all === true,
        profiles: pair(data.unlocks?.profiles, []),
    });
    put(HANGAR_KEY, { version: 1, profiles: list(data.hangar) });
    if (data.settings) put(SETTINGS_KEY, data.settings);
    const save = readSave(scratch);
    save.savedAt = typeof data.savedAt === 'string' ? data.savedAt : null;
    save.hasSettings = !!data.settings;
    return save;
}
const list = (value) => (Array.isArray(value) ? value : []);
const pair = (value, empty = {}) =>
    [0, 1].map((i) =>
        Array.isArray(value) && value[i] && typeof value[i] === 'object' ? value[i] : empty,
    );

export function memoryStorage() {
    const values = new Map();
    return {
        getItem: (k) => (values.has(k) ? values.get(k) : null),
        setItem: (k, v) => values.set(k, String(v)),
        removeItem: (k) => values.delete(k),
    };
}

// Writes every part of a save. All or nothing: if any write fails, the earlier ones are put
// back. Returns true on success.
export function writeSave(storage, save) {
    const changes = [
        [SCORE_KEYS.hd, encodeScores(save.scores.hd)],
        [SCORE_KEYS.oled, encodeScores(save.scores.oled)],
        ...COOP_SCORE_KEYS.map((key, ff) => [key, { version: 1, entries: save.coopScores[ff] }]),
        [RECORDS_KEY, { version: 1, profiles: save.records }],
        [BOSS_RECORDS_KEY, { version: 1, profiles: save.bossDefeats }],
        [CAMPAIGN_KEY, { version: 1, profiles: save.campaign }],
        [UNLOCKS_KEY, { version: 1, ...save.unlocks }],
        [HANGAR_KEY, { version: 1, profiles: save.hangar }],
        [
            SETTINGS_KEY,
            {
                version: 2,
                activeProfile: save.settings.activeProfile,
                profiles: save.settings.profiles,
            },
        ],
    ];
    const previous = [];
    try {
        if (!storage) throw new Error('No storage');
        for (const [key] of changes) previous.push([key, storage.getItem(key)]);
        for (const [key, value] of changes) storage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        for (const [key, value] of previous) {
            try {
                if (value === null || value === undefined) storage.removeItem(key);
                else storage.setItem(key, value);
            } catch {
                /* the reload after an import shows what is there */
            }
        }
        return false;
    }
}

// ------------------------------------------------------------ merging
// Progress only grows, so merging two saves can never lose any: each best takes the larger
// value, unlocks are the union, top-five tables keep the best five of both. Boss defeats take
// the larger count, not the sum, so merging the same save twice changes nothing. Settings,
// the equipped hulls and the active profile are not progress: they come from one side,
// `settingsFrom` ('a' or 'b').
export function mergeSaves(a, b, { settingsFrom = 'a' } = {}) {
    const pick = settingsFrom === 'b' ? b : a;
    return {
        format: SAVE_FORMAT,
        game: SAVE_GAME,
        savedAt: new Date().toISOString(),
        scores: {
            hd: mergeTopFive(a.scores.hd, b.scores.hd),
            oled: mergeTopFive(a.scores.oled, b.scores.oled),
        },
        coopScores: [0, 1].map((ff) => mergeTopFive(a.coopScores[ff], b.coopScores[ff], 1999998)),
        records: [0, 1].map((i) => mergeBests(a.records[i], b.records[i])),
        bossDefeats: [0, 1].map((i) => {
            const out = { ...a.bossDefeats[i] };
            for (const [id, n] of Object.entries(b.bossDefeats[i]))
                out[id] = Math.max(out[id] || 0, n);
            return out;
        }),
        campaign: [0, 1].map((i) => mergeProfiles(a.campaign[i], b.campaign[i])),
        unlocks: {
            all: a.unlocks.all || b.unlocks.all,
            profiles: [0, 1].map((i) => [
                ...new Set([...a.unlocks.profiles[i], ...b.unlocks.profiles[i]]),
            ]),
        },
        hangar: [...pick.hangar],
        settings: pick.settings,
    };
}
function mergeBests(a, b) {
    const out = { ...a };
    for (const [key, theirs] of Object.entries(b)) {
        const ours = out[key];
        if (!ours) {
            out[key] = theirs;
            continue;
        }
        const next = {};
        for (const metric of ['score', 'wave', 'peakCps', 'longestChain'])
            next[metric] = Math.max(ours[metric], theirs[metric]);
        next.accuracy = betterAccuracy(ours.accuracy, theirs.accuracy);
        out[key] = next;
    }
    return out;
}
function betterAccuracy(x, y) {
    if (!x || x.shots < MIN_ACCURACY_SHOTS) return y ?? null;
    if (!y || y.shots < MIN_ACCURACY_SHOTS) return x;
    return y.hits / y.shots > x.hits / x.shots ? y : x;
}

// A save as a downloadable file's text; `build` (src/version.mjs) records which build wrote it.
export function saveFileText(save, build = null) {
    const { hasSettings, ...rest } = save; // eslint-disable-line no-unused-vars
    return JSON.stringify(build ? { ...rest, build } : rest, null, 1);
}
