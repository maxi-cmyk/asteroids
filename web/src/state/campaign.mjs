// Campaign progress per local profile (nextSteps.md C1): which levels are open, the stars and
// the best time and score of each cleared level. Stored under its own key and carried in the
// save file (state/save.mjs) like the other records.
import {
    CAMPAIGN_KEY,
    LEVEL_COUNT,
    STAR_CLEAR,
    emptyProfile,
    endlessForWave,
    floorForWave,
    isLevel,
    normalizeProfile,
    starCount,
    starsEarned,
} from './campaign-data.mjs';
import { furthestWave } from './records.mjs';

export class CampaignProgress {
    // `records` (the personal bests) lets a returning player's earlier runs open levels: see
    // `floorForWave`. What it opens is kept, so resetting the bests later does not lock it again.
    constructor(storage, records = null) {
        this.storage = storage;
        this.profiles = [emptyProfile(), emptyProfile()];
        this.saved = true;
        try {
            const data = JSON.parse(storage?.getItem(CAMPAIGN_KEY) || 'null');
            if (data?.version === 1 && Array.isArray(data.profiles) && data.profiles.length === 2)
                this.profiles = data.profiles.map(normalizeProfile);
        } catch {
            /* start empty */
        }
        if (records) this.#fromRecords(records);
    }
    #fromRecords(records) {
        let changed = false;
        this.profiles.forEach((profile, i) => {
            const wave = furthestWave(records, i);
            if (!wave) return;
            const floor = floorForWave(wave);
            if (floor > profile.floor) {
                profile.floor = floor;
                changed = true;
            }
            if (endlessForWave(wave) && !profile.endless) {
                profile.endless = true;
                changed = true;
            }
        });
        if (changed) this.#write();
    }
    #write() {
        try {
            this.storage?.setItem(
                CAMPAIGN_KEY,
                JSON.stringify({ version: 1, profiles: this.profiles }),
            );
            this.saved = !!this.storage;
        } catch {
            this.saved = false; // kept for this visit
        }
        return this.saved;
    }
    #of(profile) {
        return this.profiles[profile === 1 ? 1 : 0];
    }
    best(profile, level) {
        return this.#of(profile).levels[level] ?? null;
    }
    stars(profile, level) {
        return this.best(profile, level)?.stars ?? 0;
    }
    cleared(profile, level) {
        return !!(this.stars(profile, level) & STAR_CLEAR);
    }
    // Level 1 is always open; each clear opens the next; a returning player's floor opens more.
    isOpen(profile, level) {
        if (!isLevel(level)) return false;
        return level === 1 || level <= this.#of(profile).floor || this.cleared(profile, level - 1);
    }
    openLevels(profile) {
        let n = 0;
        while (n < LEVEL_COUNT && this.isOpen(profile, n + 1)) n++;
        return n;
    }
    // Endless opens when level 6 is cleared (Act 1 finished), or from an earlier wave-30 run.
    endlessOpen(profile) {
        return this.#of(profile).endless || this.cleared(profile, LEVEL_COUNT);
    }
    act1Done(profile) {
        return this.cleared(profile, LEVEL_COUNT);
    }
    totalStars(profile) {
        let n = 0;
        for (let level = 1; level <= LEVEL_COUNT; level++)
            n += starCount(this.stars(profile, level));
        return n;
    }
    // Records one pilot's run of a level: `outcome` is { cleared, timeMs, score, livesRemaining }.
    // A level that was not cleared changes nothing. Returns what the run earned and improved.
    record(profile, level, outcome) {
        const earned = isLevel(level) ? starsEarned(outcome, level) : 0;
        const result = { level, cleared: !!(earned & STAR_CLEAR), stars: earned, newStars: 0 };
        if (!result.cleared) return result;
        const entry = this.#of(profile).levels[level];
        const before = entry?.stars ?? 0;
        result.newStars = earned & ~before;
        result.firstClear = !(before & STAR_CLEAR);
        result.betterTime = outcome.timeMs > 0 && (!entry?.bestMs || outcome.timeMs < entry.bestMs);
        result.betterScore = outcome.score > (entry?.bestScore ?? 0);
        this.#of(profile).levels[level] = {
            stars: before | earned,
            bestMs: result.betterTime ? outcome.timeMs : (entry?.bestMs ?? 0),
            bestScore: result.betterScore ? outcome.score : (entry?.bestScore ?? 0),
        };
        result.saved = this.#write();
        return result;
    }
    reset() {
        this.profiles = [emptyProfile(), emptyProfile()];
    }
}
