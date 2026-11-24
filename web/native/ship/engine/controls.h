#pragma once
// Internal adapter: engine context is supplied by combat.h.
static void loadout_activate_beam() {
    loadout::WeaponContext c
            = {nullptr, nullptr, [](void *) { combat_prepare_beam(); }};
    loadout::SECONDARIES[0].fire(c);
}
static void loadout_cancel(unsigned owner) {
    auto& s = loadouts[owner];
    s.vx = s.vy = 0;
    s.primary_left = 0;
    for (auto& shot : s.shots) {
        shot.active = false;
    }
}
static bool loadout_primary(bool repeat) {
    auto& s = loadouts[loadout_owner];
    if (!repeat && s.primary_left) {
        combat.primary_rate_blocked++;
        return false;
    }
    if (!repeat) {
        s.primary_left = PRIMARY_INTERVAL[s.primary];
    }
    unsigned before = combat.spawned;
    LoadoutEmitter emitter = {loadout_owner, &ship, &combat, false};
    loadout::WeaponContext c = {&emitter, loadout_spawn};
    loadout::PRIMARIES[s.primary].fire(c);
    if (ship.effects.multishot_left_ms) {
        loadout::ShotSpec a;
        a.angle = .78539816f;
        c.emit(a);
        a.angle = -.78539816f;
        c.emit(a);
    }
    bool fired = combat.spawned > before;
    if (fired) {
        combat.primary_volleys++;
        weapon_shot_succeeded(ship.weapon, game_ms);
        sound_play(SFX_SHOOT);
        if (practice_mode) {
            practice_goals |= 4;
        }
    } else {
        combat.primary_pool_blocked++;
    }
    return fired;
}
static void loadout_move(const InputState& input) {
    auto& s = loadouts[loadout_owner];
    if (!ship.alive) {
        s.vx = s.vy = 0;
        return;
    }
    float length = max(1.0f,
                       sqrtf(input.joystick_x * input.joystick_x
                             + input.joystick_y * input.joystick_y));
    float precision = combat_input.precision ? PRECISION_SPEED_SCALE : 1;
    loadout::MotionContext c = {input.joystick_x / length * precision,
                                input.joystick_y / length * precision,
                                s.vx,
                                s.vy};
    loadout::SHIPS[s.ship].step(c);
    s.vx = c.vx;
    s.vy = c.vy;
    ship_update(ship, 0, 0); // shared effect and invulnerability timers
    ship.position_x = constrain(ship.position_x + s.vx * SHIP_MAX_SPEED,
                                float(SHIP_MIN_X),
                                float(SHIP_MAX_X));
    ship.position_y = constrain(ship.position_y + s.vy * SHIP_MAX_SPEED,
                                float(SHIP_MIN_Y),
                                float(SHIP_MAX_Y));
}
static bool loadout_secondary(bool pressed) {
    auto& s = loadouts[loadout_owner];
    combat.cooldown_left_ms
            -= min(combat.cooldown_left_ms, (unsigned long)FRAME_TIME_MS);
    combat.beam_left_ms = 0;
    if (pressed && !combat.cooldown_left_ms) {
        combat.charging = true;
        combat.charge_started_ms = game_ms;
    }
    if (!combat_input.laser) {
        combat.charging = false;
    }
    if (combat.charging
        && game_ms - combat.charge_started_ms
                   >= SECONDARY_WINDUP[s.secondary]) {
        combat.charging = false;
        combat.cooldown_left_ms = SECONDARY_COOLDOWN[s.secondary];
        combat.laser_shots++;
        LoadoutEmitter emitter = {loadout_owner, &ship, &combat, true};
        loadout::WeaponContext c = {&emitter, loadout_spawn};
        loadout::SECONDARIES[s.secondary].fire(c);
        sound_play(SFX_ASTEROID_LARGE);
        if (practice_mode) {
            practice_goals |= 8;
        }
    }
    return false; // custom abilities resolve in the shared projectile phase,
                  // not as a laser
}
