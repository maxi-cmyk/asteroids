import { PRACTICE_DEFAULTS, PRACTICE_ROCKS, sanitizePractice } from '../state/practice.mjs';

// Practice configuration, held pickups and direct practice/assist engine commands.
export class PracticeTools {
    constructor(api) {
        this.api = api;
    }
    resetTargets() {
        this.api.web_practice_targets();
    }
    // The practice range (nextSteps.md H3). `practiceConfig` is kept between runs, so the next
    // practice starts the same way; each change reaches a running practice at once.
    practiceConfig = { ...PRACTICE_DEFAULTS };
    setPractice(config) {
        this.practiceConfig = sanitizePractice({ ...this.practiceConfig, ...config });
        this.sendConfig();
    }
    sendConfig() {
        const c = this.practiceConfig;
        this.api.web_practice_config(
            PRACTICE_ROCKS.indexOf(c.rocks),
            c.wave,
            c.speed,
            +c.refill,
            +c.drops,
            +c.hold,
        );
    }
    practiceSpawn(kind) {
        this.api.web_practice_spawn(kind);
    }
    practiceClear() {
        this.api.web_practice_clear();
    }
    practiceRespawn() {
        this.api.web_practice_respawn();
    }
    practiceNextWave() {
        this.api.web_practice_next_wave();
    }
    practiceResetStats() {
        this.api.web_practice_reset_stats();
    }
    doubleFire() {
        this.api.web_practice_double_fire();
    }
    multishot() {
        this.api.web_practice_multishot();
    }
    // Practice pickups that stay on until switched off; both can be on together.
    practiceHold = { multishot: false, doubleFire: false };
    togglePractice(kind) {
        this.practiceHold[kind] = !this.practiceHold[kind];
        this.#applyHold();
    }
    #applyHold() {
        const { multishot, doubleFire } = this.practiceHold;
        this.api.web_practice_hold(+multishot, +doubleFire);
    }
    clearHold() {
        this.practiceHold = { multishot: false, doubleFire: false };
    }
    // Boss practice: a practice run whose room holds one chosen fight (0-5 bosses, 6-11 minis).
    bossPractice(kind, tier = 0, phase = 1) {
        this.api.web_boss_practice(kind, tier, phase);
    }
    // Assists change telegraph length and forces only; scoring is unaffected.
    // The Zodiarch throws this sign first, a little stronger (-1: none). The page passes the
    // date's sign (src/boss/zodiarch/ascendant.mjs); tests leave it off.
    ascendant(sign = -1) {
        this.api.web_ascendant?.(sign);
    }
    bossAssist({ longWarnings = false, calm = false } = {}) {
        this.api.web_boss_assist(+longWarnings, +calm);
    }
}
