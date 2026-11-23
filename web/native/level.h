#pragma once

// Campaign levels (nextSteps.md C1). A level is five waves in one region: rocks, rocks, a
// mini-boss on wave 3, rocks, then the region's boss on wave 5. Level n covers waves
// 5n-4 to 5n, so the waves, regions, minis and bosses are the ones an Endless run meets at
// those numbers; nothing about them is special-cased.
//
// The level ends when the wave-5 boss falls. The boss's death plays for up to three seconds
// (`deathMs` in src/boss/death.mjs), then the engine enters STATE_LEVEL_CLEAR and stops. The
// rocks are held back while it plays, so the wave counter never moves on. Running out of
// lives ends the level through the ordinary game-over, without the leaderboard.
static const unsigned LEVEL_COUNT = 6;
static const unsigned LEVEL_WAVES = 5;
static const unsigned long LEVEL_CLEAR_DELAY_MS = 3200;

struct LevelRun {
    bool active = false;
    uint8_t index = 0; // 1-6
    uint16_t first_wave = 0;
    uint16_t last_wave = 0; // the boss's wave
    bool final_fell = false; // the boss is down; the clear is on its way
    bool cleared = false;
    unsigned long time_ms = 0; // game time at which the boss fell
    unsigned lives_lost[2] = {}; // by pilot; solo uses slot 0
    unsigned hits = 0;       // every landed hit, shield-absorbed ones included
};
static LevelRun level_run = {};

static void level_reset() {
    level_run = {};
}
// Starts level `index` at its first wave. Call it right after the run has begun.
static void level_begin(int index) {
    level_run = {};
    level_run.active = true;
    level_run.index = uint8_t(constrain(index, 1, int(LEVEL_COUNT)));
    level_run.first_wave = uint16_t((level_run.index - 1) * LEVEL_WAVES + 1);
    level_run.last_wave = uint16_t(level_run.index * LEVEL_WAVES);
    wave_number = level_run.first_wave;
    prepare_wave(0);
}
static void level_hit(unsigned owner, bool died) {
    if (!level_run.active) {
        return;
    }
    level_run.hits++;
    if (died) {
        level_run.lives_lost[owner & 1]++;
    }
}
// Called as a boss falls. Only the wave-5 boss of the level counts (not a mini, not practice).
static void level_boss_defeated(bool mini, bool practice, unsigned wave) {
    if (level_run.active && !level_run.final_fell && !mini && !practice
        && wave == level_run.last_wave) {
        level_run.final_fell = true;
        level_run.time_ms = game_ms;
    }
}
// Once the boss has been down long enough for its death to play, the level is clear.
static void level_tick() {
    if (level_run.active && level_run.final_fell && !level_run.cleared
        && state == STATE_PLAYING
        && game_ms - level_run.time_ms >= LEVEL_CLEAR_DELAY_MS) {
        level_run.cleared = true;
        set_state(STATE_LEVEL_CLEAR);
    }
}
