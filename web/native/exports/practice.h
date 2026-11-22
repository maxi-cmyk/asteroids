#pragma once
// Practice tools: boss practice, assists and target dummies.
// Included inside bridge.cpp's extern "C" block.

// Boss practice: pick a boss (0-5) or mini-boss (6-11) and a tier. Lives are
// never lost; the fight is the whole room.
void web_boss_practice(int kind, int tier, int phase) {
#ifdef WEB_HD
    coop_active = false;
    boss_bind_solo();
    practice_mode = true;
    practice_goals = 0;
    practice_hits = 0;
    begin_game();
    combat_reset();
    boss = {};
    boss_begin_practice(constrain(kind, 0, int(BK_COUNT) - 1),
                        constrain(tier, 0, 3));
    if (phase > 1) {
        unsigned top = bs_phases() + (boss.tier >= 2 && !boss.mini ? 1 : 0);
        boss.start_phase = constrain(unsigned(phase), 1u, top);
        boss.health = bs_phase_health(boss.start_phase);
    }
    pending_asteroids = 0;
    ship.invincible_left = 0;
    ship.effects.double_fire_left_ms = 0;
    set_state(STATE_PLAYING);
#else
    (void)kind;
    (void)tier;
    (void)phase;
#endif
}
void web_boss_assist(int longer_warnings, int calm) {
#ifdef WEB_HD
    boss_assist_long = longer_warnings != 0;
    boss_assist_calm = calm != 0;
#else
    (void)longer_warnings;
    (void)calm;
#endif
}
// Ascendant (nextSteps.md R2): the sign of the real-world date (0 Aries .. 11
// Pisces, -1 none), which the Zodiarch throws first and a little stronger. The
// page passes it in; the engine never reads a clock, so replays stay exact.
void web_ascendant(int sign) {
#ifdef WEB_HD
    boss_ascendant = sign >= 0 && sign < 12 ? sign : -1;
#else
    (void)sign;
#endif
}
void web_practice_targets() {
#ifdef WEB_HD
    if (practice_mode) {
        practice_targets();
    }
#endif
}
// Switches the practice pickups on or off; an "on" pickup never runs out.
void web_practice_hold(int multishot, int double_fire) {
#ifdef WEB_HD
    practice_hold_multishot = multishot != 0;
    practice_hold_double_fire = double_fire != 0;
    if (!practice_hold_multishot) {
        ship.effects.multishot_left_ms = 0;
    }
    if (!practice_hold_double_fire) {
        ship.effects.double_fire_left_ms = 0;
    }
#else
    (void)multishot;
    (void)double_fire;
#endif
}
void web_practice_double_fire() {
#ifdef WEB_HD
    if (practice_mode) {
        ship.effects.double_fire_left_ms = 6000;
    }
#endif
}
void web_practice_multishot() {
#ifdef WEB_HD
    if (practice_mode) {
        ship.effects.multishot_left_ms = MULTISHOT_DURATION_MS;
    }
#endif
}

// The practice range (nextSteps.md H3). Every value is clamped, so a replay or a page can
// never put the engine somewhere play could not. Changing the rock mode or the wave starts
// the rocks again; speed, refill, drops and holding only change what comes next.
void web_practice_config(int rocks_mode,
                         int wave,
                         int speed_pct,
                         int refill,
                         int drops,
                         int hold_wave) {
#ifdef WEB_HD
    uint8_t mode = uint8_t(constrain(rocks_mode, 0, int(PRACTICE_NONE)));
    uint16_t start = uint16_t(constrain(wave, 1, 30));
    bool restart = mode != practice_rocks
                   || (mode != PRACTICE_TARGETS && mode != PRACTICE_NONE
                       && start != practice_wave);
    practice_rocks = mode;
    practice_wave = start;
    practice_speed_pct = uint16_t(constrain(speed_pct, 50, 150));
    practice_refill = refill != 0;
    practice_drops = drops != 0;
    practice_hold_wave = hold_wave != 0;
    if (restart && practice_mode && !boss.practice) {
        practice_apply_rocks();
    }
#else
    (void)rocks_mode;
    (void)wave;
    (void)speed_pct;
    (void)refill;
    (void)drops;
    (void)hold_wave;
#endif
}
// Puts a pickup (0 multishot, 1 shield, 2 2x fire) just ahead of the ship, replacing any
// pickup already out; 3 makes the laser ready at once.
void web_practice_spawn(int kind) {
#ifdef WEB_HD
    if (!practice_mode) {
        return;
    }
    if (kind == 3) {
        combat.cooldown_left_ms = 0;
        return;
    }
    pickup.kind = PickupKind(constrain(kind, 0, int(PICKUP_DOUBLE_FIRE)));
    pickup.position_x = constrain(ship.position_x + 70, float(SHIP_MIN_X), float(SHIP_MAX_X));
    pickup.position_y = ship.position_y;
    pickup.active = true;
#else
    (void)kind;
#endif
}
// Clear field: every rock gone; the current mode refills as it normally would.
void web_practice_clear() {
#ifdef WEB_HD
    if (practice_mode && !boss.practice) {
        memset(rocks, 0, sizeof(rocks));
        if (practice_rocks == PRACTICE_STREAM || practice_rocks == PRACTICE_WAVES) {
            pending_asteroids = 0;
        }
        practice_empty_since = 0;
    }
#endif
}
// Respawn now: the current mode's rocks start again (targets reappear, a wave restarts).
void web_practice_respawn() {
#ifdef WEB_HD
    if (practice_mode && !boss.practice) {
        practice_apply_rocks();
    }
#endif
}
// Next wave: in waves or stream, move on one wave (up to 30) and start it.
void web_practice_next_wave() {
#ifdef WEB_HD
    if (practice_mode && !boss.practice
        && (practice_rocks == PRACTICE_WAVES || practice_rocks == PRACTICE_STREAM)) {
        practice_wave = uint16_t(min(30, practice_wave + 1));
        practice_begin_wave();
    }
#endif
}
void web_practice_reset_stats() {
#ifdef WEB_HD
    practice_hits = 0;
#endif
}
