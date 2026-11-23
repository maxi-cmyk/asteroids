// Campaign Act 1 as data (nextSteps.md C1): the six levels, the three stars, and how a
// profile's progress is validated and merged. Pure: no storage, no DOM, no engine.
import { REGIONS } from '../render/regions.mjs';
import { KINDS } from '../boss/scene.mjs';

export const CAMPAIGN_KEY = 'asteroids.web.campaign-v1';
export const LEVEL_COUNT = 6;
export const WAVES_PER_LEVEL = 5;

// Stars are a bit mask: clear it, finish with at least the starting lives, clear it under par time.
export const STAR_CLEAR = 1;
export const STAR_LIVES = 2;
export const CAMPAIGN_START_LIVES = 3;
export const STAR_PAR = 4;
export const STAR_BITS = Object.freeze([STAR_CLEAR, STAR_LIVES, STAR_PAR]);
export const STAR_NAMES = Object.freeze([
    'Clear the level',
    'Finish with 3+ lives',
    'Under the time target',
]);

// Par time per level, in seconds: the scripted pilot's time for that level times 1.5, rounded
// to five seconds (`node tests/level-baseline.mjs`, results in web/COMBAT.md). Tuned after the
// playtest.
export const PAR_SECONDS = Object.freeze([75, 90, 115, 110, 95, 115]);

// Level n covers waves 5n-4 to 5n of the region of the same number: its mini-boss is on wave 3
// and its boss on wave 5.
export const LEVELS = Object.freeze(
    Array.from({ length: LEVEL_COUNT }, (_, i) =>
        Object.freeze({
            level: i + 1,
            region: REGIONS[i],
            firstWave: i * WAVES_PER_LEVEL + 1,
            bossWave: (i + 1) * WAVES_PER_LEVEL,
            miniKind: 6 + i,
            bossKind: i,
            mini: KINDS[6 + i].name,
            boss: KINDS[i].name,
            parMs: PAR_SECONDS[i] * 1000,
        }),
    ),
);
// Minutes and seconds, as 1:12.
export function clock(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export const isLevel = (n) => Number.isInteger(n) && n >= 1 && n <= LEVEL_COUNT;
export const levelInfo = (n) => (isLevel(n) ? LEVELS[n - 1] : null);

// The stars one pilot earned in a run: `cleared`, their net lives remaining, and the level's
// time against par. A level that was not cleared earns none.
export function starsEarned({ cleared, timeMs, livesRemaining }, level) {
    if (!cleared) return 0;
    let stars = STAR_CLEAR;
    if (livesRemaining >= CAMPAIGN_START_LIVES) stars |= STAR_LIVES;
    const info = levelInfo(level);
    if (info && timeMs > 0 && timeMs < info.parMs) stars |= STAR_PAR;
    return stars;
}
export const starCount = (mask) => STAR_BITS.reduce((n, bit) => n + (mask & bit ? 1 : 0), 0);

// A returning player's save has no campaign part: a highest wave past a level's boss opens the
// levels up to there (no stars), and reaching wave 30 also opens Endless.
export function floorForWave(wave) {
    return Math.max(1, Math.min(LEVEL_COUNT, Math.floor((wave - 1) / WAVES_PER_LEVEL) + 1));
}
export const endlessForWave = (wave) => wave >= LEVEL_COUNT * WAVES_PER_LEVEL;

const whole = (v, max) => Number.isSafeInteger(v) && v >= 0 && v <= max;
export const emptyProfile = () => ({ floor: 1, endless: false, levels: {} });
// One profile's progress with anything malformed dropped; never throws.
export function normalizeProfile(raw) {
    const out = emptyProfile();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    if (whole(raw.floor, LEVEL_COUNT) && raw.floor >= 1) out.floor = raw.floor;
    out.endless = raw.endless === true;
    for (const [key, entry] of Object.entries(raw.levels ?? {})) {
        const level = Number(key);
        if (!isLevel(level) || !entry || typeof entry !== 'object') continue;
        const stars = whole(entry.stars, 7) ? entry.stars : 0;
        if (!(stars & STAR_CLEAR)) continue; // only cleared levels are kept
        out.levels[level] = {
            stars,
            bestMs: whole(entry.bestMs, 1e9) ? entry.bestMs : 0,
            bestScore: whole(entry.bestScore, 1e9) ? entry.bestScore : 0,
        };
    }
    return out;
}
// Progress only grows: stars are united, the best time is the lower one that exists, the best
// score the higher, and what is open stays open.
export function mergeProfiles(a, b) {
    const out = emptyProfile();
    const x = normalizeProfile(a),
        y = normalizeProfile(b);
    out.floor = Math.max(x.floor, y.floor);
    out.endless = x.endless || y.endless;
    for (let level = 1; level <= LEVEL_COUNT; level++) {
        const p = x.levels[level],
            q = y.levels[level];
        if (!p && !q) continue;
        const times = [p?.bestMs, q?.bestMs].filter((t) => t > 0);
        out.levels[level] = {
            stars: (p?.stars ?? 0) | (q?.stars ?? 0),
            bestMs: times.length ? Math.min(...times) : 0,
            bestScore: Math.max(p?.bestScore ?? 0, q?.bestScore ?? 0),
        };
    }
    return out;
}
