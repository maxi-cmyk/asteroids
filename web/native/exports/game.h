#pragma once
// The run: init, per-tick step, start, menu and demo.
// Included inside bridge.cpp's extern "C" block.

void web_init() {
    display_init();
    input_init();
    sound_init();
    game_init();
#ifdef WEB_HD
    combat_reset();
#endif
    sound_play(SFX_MENU_SELECT);
    game_update();
}
void web_fire_press(int pressed) {
    browser_fire_edge = pressed != 0;
}
void web_step(int raw_x, int raw_y, int fire, int click, int pause) {
    browser_ms += FRAME_TIME_MS;
#ifdef WEB_HD
    if (coop_active) {
        if (pause && (state == STATE_PLAYING || state == STATE_COUNTDOWN)) {
            web_coop_pause(1);
        } else if (pause && state == STATE_PAUSED) {
            web_coop_pause(0);
        } else {
            if (state == STATE_PLAYING) {
                visual_ms += FRAME_TIME_MS;
            }
            coop_update();
        }
        sound_update();
        return;
    }
#endif
    // Browser demos start only through the explicit Home action.
    if (state == STATE_MENU) {
        state_entered_ms = browser_ms;
    }
    browser_x = constrain(raw_x, 0, 4095);
    browser_y = constrain(raw_y, 0, 4095);
    browser_fire = fire;
    browser_click = click;
#ifdef WEB_HD
    bool previous_fire_held = input_state.fire_held;
#endif
    input_update();
#ifdef WEB_HD
    // Browser buttons are already digital samples, not mechanical contacts.
    // Do not make a quick press/release survive the OLED debounce window.
    input_state.fire_held = browser_fire;
    input_state.fire_pressed
            = browser_fire_edge || (browser_fire && !previous_fire_held);
    browser_fire_edge = false;
    // Web controls apply the configurable radial deadzone before conversion.
    input_state.joystick_x
            = (browser_x - 2048) / (browser_x >= 2048 ? 2047.0f : 2048.0f);
    input_state.joystick_y
            = (browser_y - 2048) / (browser_y >= 2048 ? 2047.0f : 2048.0f);
#endif
    // Options / Escape is an additional browser shortcut; L3 still uses the
    // production double-click debounce path.
    if (pause) {
        input_state.pause_triggered = true;
    }
    if (state == STATE_PLAYING || state == STATE_DEATH_ANIM
        || state == STATE_DEMO) {
        visual_ms += FRAME_TIME_MS;
    }
#ifdef WEB_HD
    combat_game_update();
#else
    game_update();
#endif
    sound_update();
}
// The two clocks a run starts from: a replay restores them on a fresh engine
// (nextSteps.md R3). Nothing else survives from earlier runs.
unsigned long web_clock(int which) {
    return which ? visual_ms : browser_ms;
}
void web_set_clock(unsigned long browser, unsigned long visual) {
    browser_ms = browser;
    visual_ms = visual;
}
void web_audio_step() {
    sound_advance(FRAME_TIME_MS);
}
void web_start(int practice) {
#ifdef WEB_HD
    loadout_reset();
    level_reset();
    coop_active = false;
    boss_bind_solo();
    practice_mode = practice != 0;
    practice_hold_multishot = practice_hold_double_fire = false;
    practice_goals = 0;
    begin_game();
    combat_reset();
    boss = {};
    if (practice_mode) {
        practice_hits = 0;
        practice_apply_rocks();
        combat.shield_stored = true;
        ship.invincible_left = 0;
        set_state(STATE_PLAYING);
    }
#else
    (void)practice;
    begin_game();
#endif
}
// Campaign Act 1 (nextSteps.md C1): level 1-6 for one or two pilots, from the
// level's first wave with the usual three lives and a x1 multiplier. Level n is
// waves 5n-4 to 5n.
void web_start_level(int level, int players, int friendly) {
#ifdef WEB_HD
    loadout_reset();
    practice_mode = false;
    practice_hold_multishot = practice_hold_double_fire = false;
    practice_goals = 0;
    if (players >= 2) {
        coop_begin(friendly != 0);
    } else {
        coop_active = false;
        boss_bind_solo();
        begin_game();
        combat_reset();
        boss = {};
    }
    level_begin(level);
#else
    (void)level;
    (void)players;
    (void)friendly;
    begin_game();
#endif
}
void web_demo() {
#ifdef WEB_HD
    loadout_reset();
    level_reset();
#endif
    begin_game();
    demo_reset(demo);
    demo_running = true;
    set_state(STATE_DEMO);
}
// The Home demo has no run to lose: its engine hands the pilot lives back when
// they run out.
void web_demo_lives(int lives) {
    ship.lives = lives;
}
void web_menu() {
    demo_running = false;
    menu_input_ready = false;
#ifdef WEB_HD
    level_reset();
    coop_active = false;
    practice_mode = false;
    practice_hold_multishot = practice_hold_double_fire = false;
    ship.effects.double_fire_left_ms = 0;
    combat_reset();
    boss = {};
    boss_bind_solo();
#endif
    sound_stop();
    set_state(STATE_MENU);
}
void web_reload_scores() {
    highscore_init();
    saved_rank = -1;
}
void web_actions(
        float aim_x, float aim_y, int laser, int precision, int shield) {
#ifdef WEB_HD
    if (!__builtin_isfinite(aim_x) || !__builtin_isfinite(aim_y)) {
        aim_x = 0;
        aim_y = 0;
    }
    combat_input = {constrain(aim_x, -1.0f, 1.0f),
                    constrain(aim_y, -1.0f, 1.0f),
                    bool(laser),
                    bool(precision),
                    bool(shield)};
#else
    (void)aim_x;
    (void)aim_y;
    (void)laser;
    (void)precision;
    (void)shield;
#endif
}

// Captured immediately after a run starts; replay records the IDs and catalogue
// version.
void web_loadout(
        int owner, int ship_id, int primary, int secondary, int version) {
#ifdef WEB_HD
    if (owner < 0 || owner > 1 || version != LOADOUT_DATA_VERSION
        || game_ms != 0) {
        return;
    }
    auto& s = loadouts[owner];
    s = {};
    s.enabled = true;
    s.ship = ship_id >= 0 && ship_id < 6 ? ship_id : 0;
    s.primary = primary >= 0 && primary < 6 ? primary : 0;
    s.secondary = secondary >= 0 && secondary < 6 ? secondary : 0;
#else
    (void)owner;
    (void)ship_id;
    (void)primary;
    (void)secondary;
    (void)version;
#endif
}
