#pragma once
// Test-build hooks: scenarios and direct state edits for the browser test suite.
// Included inside bridge.cpp's extern "C" block.

void web_test_coop(int owner, int field, float value) {
#ifdef WEB_HD
    if (owner < 0 || owner > 1) return;
    CoopPlayer& player = coop_players[owner];
    if (field == 0) { set_state(STATE_PLAYING); pending_asteroids = 1;
        next_spawn_ms = game_ms + 1000000; memset(rocks, 0, sizeof(rocks)); }
    if (field == 1) player.hull.position_x = value;
    if (field == 2) player.hull.position_y = value;
    if (field == 3) player.hull.invincible_left = value;
    if (field == 4) player.hull.lives = value;
    if (field == 5) player.hull.effects.multishot_left_ms = value;
    if (field == 6) player.hull.effects.double_fire_left_ms = value;
    if (field == 7) coop_hit(owner);
    if (field == 8) player.weapons.shield_stored = value;
    if (field == 9) pickup = {player.hull.position_x, player.hull.position_y,
                              PickupKind(int(value)), true};
    if (field == 10) spawn_asteroid(value, player.hull.position_y, AST_SMALL, 0, 0);
    coop_load(0);
#endif
}
void web_test_boss(int wave, int players, int health) {
#ifdef WEB_HD
    wave_number = wave;
    boss_begin(players);
    if (health > 0) boss.health = health;
#endif
}
// Stress fixture (dev/stress.html): top the boss's shot pool up to its cap of 48 and its lethal
// hazards up to the cap of 6, so the renderer meets the heaviest scene a fight can build. Call it
// once per tick; the pilot should be untouchable (web_test_boss_set 5).
void web_test_boss_stress() {
#ifdef WEB_HD
    static const uint8_t families[] = {SF_NEEDLE, SF_SINE, SF_PELLET, SF_CURVE, SF_SPORE, SF_BOLT};
    static const uint8_t kinds[] = {HK_LANE, HK_RING, HK_BEAM, HK_ARM, HK_LANE, HK_RING};
    if (!boss.active) return;
    for (unsigned i = 0; bs_shot_count() < BOSS_SHOTS && i < BOSS_SHOTS; i++)
        bs_shot_at(families[i % 6], boss.x - 40, 30 + float((i * 37) % 210),
                   BOSS_PI + (float(i % 9) - 4) * .07f, .5f + float(i % 4) * .15f, 0, 6000);
    for (unsigned i = 0; bs_lethal_count() < BOSS_LETHAL_CAP && i < BOSS_LETHAL_CAP; i++) {
        uint8_t kind = kinds[i % 6];
        float y = 40 + float((i * 41) % 190);
        if (kind == HK_RING) bs_hazard(kind, boss.x, boss.y, 1.0f, 110.0f + float(i) * 14, .52f, 900, 6000);
        else bs_hazard(kind, boss.x - 20, y, BOSS_PI + (float(i) - 2) * .1f, 420, 14, 900, 6000);
    }
#endif
}
// Fairness telemetry gathered by the test build: warnings, caps, corridor.
const float *web_test_boss_stats() {
    static float values[16];
#ifdef WEB_HD
    values[0] = boss.violations;
    values[1] = boss.max_shots;
    values[2] = boss.max_hazards;
    values[3] = boss.entrance_hits;
    values[4] = boss.min_corridor;
    values[5] = boss.hits_taken;
    values[6] = boss.health;
    values[7] = boss.phase;
    values[8] = boss.defeated_mask;
    values[9] = boss.kind;
    values[10] = boss.life_lost;
    values[11] = boss.maximum;
    values[12] = boss.repels;
#endif
    return values;
}
// The contact circles now ship in every build (web_boss_body in read.h, for the demo pilot).
const float *web_test_boss_body() {
    return web_boss_body();
}
void web_test_boss_set(int field, float value) {
#ifdef WEB_HD
    if (field == 0) bs_damage(0, boss.health > unsigned(value) ? boss.health - unsigned(value) : 0);
    if (field == 1) { boss.health = unsigned(value); }
    if (field == 2) boss.rest_until = 0;
    if (field == 3) { ship.position_x = value; }
    if (field == 4) { ship.position_y = value; }
    if (field == 5) { ship.invincible_left = unsigned(value); }
    if (field == 6) { boss.stamp[0] = 0; for (BossPart& p : boss.parts) if (p.exists) { p.hp = 1; } }
    if (field == 7) { boss_assist_long = value != 0; }
    if (field == 8) { for (BossPart& p : boss.parts) p.exists = false; }
    if (field == 9) {   // one primary hit on part `value`, wherever its circle is
        bs_build_circles();
        for (unsigned i = 0; i < boss_circle_count; i++)
            if (boss_circles[i].type == BC_PART && boss_circles[i].index == unsigned(value)) {
                bs_circle_hit(i, 0, 1, false);
                break;
            }
    }
    if (field == 10) {  // start attack `value` now (the attack gallery and tests)
        boss.atk = int(value);
        boss.atk_t0 = game_ms + FRAME_TIME_MS;   // the next tick is its first (t = 0)
        bs_acquire();
    }
    if (field == 11) boss.rest_until = game_ms + (unsigned long)value;   // hold the next attack off
#endif
}
void web_test_pickup(int kind) {
    pickup = {ship.position_x, ship.position_y, PickupKind(kind), true};
}
void web_test_overlap() {
    ship.invincible_left = 0;
    spawn_asteroid(ship.position_x, ship.position_y, AST_SMALL, 0, 0);
}
void web_scenario(int scenario) {
    begin_game();
    set_state(STATE_PLAYING);
    pending_asteroids = 0;
    memset(rocks, 0, sizeof(rocks));
    ship.invincible_left = 0;
#ifdef WEB_HD
    combat_reset();
    boss = {};
#endif
    if (scenario == 1) {
        ship.effects.multishot_left_ms = MULTISHOT_DURATION_MS;
    }
    if (scenario == 2) {
        ship.effects.shield = true;
        spawn_asteroid(ship.position_x, ship.position_y, AST_SMALL, 0, 0);
    }
    if (scenario == 3) {
        ship.lives = 1;
        score = 1234;
        spawn_asteroid(ship.position_x, ship.position_y, AST_SMALL, 0, 0);
    }
    if (scenario == 4) {
        // Repeated primary fire scenario.
    }
    if (scenario == 5) {
        spawn_asteroid(240, 135, AST_LARGE, 0, 0);
        spawn_asteroid(320, 70, AST_MEDIUM, 0, 0);
        spawn_asteroid(390, 200, AST_SMALL, 0, 0);
        pickup = {160, 190, PICKUP_MULTISHOT, true};
        ship.effects.shield = true;
        ship.effects.multishot_left_ms = MULTISHOT_DURATION_MS;
    }
#ifdef WEB_HD
    if (scenario == 17 || scenario == 18) {
        pickup = {ship.position_x, ship.position_y, PICKUP_DOUBLE_FIRE, true};
        if (scenario == 18) ship.effects.multishot_left_ms = MULTISHOT_DURATION_MS;
    }
    if (scenario == 19) {
        spawn_asteroid(320, 135, AST_SMALL, 0, 0);
    }
    if (scenario >= 9) {
        ship.position_x = 240;
        ship.position_y = 135;
        pending_asteroids = 1;
        next_spawn_ms = game_ms + 1000000;
        if (scenario == 17 || scenario == 18) {
            pickup.position_x = ship.position_x;
            pickup.position_y = ship.position_y;
        }
    }
    if (scenario == 10) {
        spawn_asteroid(320, 135, AST_SMALL, 0, 0);
        spawn_asteroid(400, 135, AST_LARGE, 0, 0);
        spawn_asteroid(160, 135, AST_SMALL, 0, 0);
        spawn_asteroid(320, 180, AST_SMALL, 0, 0);
    }
    if (scenario == 15 || scenario == 16) {
        // Keep existing bullets stationary so the test can fill the pool.
        ship.effects.multishot_left_ms = MULTISHOT_DURATION_MS;
        for (int i = 0; i < BULLET_MAX - (scenario == 15 ? 2 : 0); i++) {
            spawn_bullet(i, 20, 20, 0, 0);
        }
    }
    if (scenario == 14) {
        for (int i = 0; i < ASTEROID_MAX; i++) {
            spawn_asteroid(300 + i * 3, 135, AST_LARGE, 0, 0);
        }
    }
    if (scenario == 11) {
        pickup = {ship.position_x, ship.position_y, PICKUP_SHIELD, true};
    }
    if (scenario == 12) {
        combat.shield_stored = true;
        spawn_asteroid(ship.position_x, ship.position_y, AST_SMALL, 0, 0);
    }
    if (scenario == 13) {
        for (int i = 0; i < 100; i++) {
            weapon_shot_succeeded(ship.weapon, game_ms);
        }
    }
#endif
    if (scenario == 7 || scenario == 8) {
        // Straight ahead of a ship facing right: the nose circle meets the rock's contact circle.
        float separation = ship_hull_reach() + ASTEROID_SMALL_R * ROCK_CONTACT_SCALE;
        spawn_asteroid(ship.position_x + separation + (scenario == 7 ? -1 : 1),
                       ship.position_y,
                       AST_SMALL,
                       0,
                       0);
    }
    if (scenario == 20) {
        // Just off the flank: above the hull's core with a 1 px gap between the contact
        // circles. The old single 7 px circle counted this as a hit.
        spawn_asteroid(ship.position_x - 1,
                       ship.position_y - (6 + ASTEROID_SMALL_R * ROCK_CONTACT_SCALE + 1),
                       AST_SMALL, 0, 0);
    }
    if (scenario == 21) {
        // Half past the right edge, level with the ship: its centre is off screen.
        spawn_asteroid(SCREEN_W + ASTEROID_SMALL_R / 2, ship.position_y, AST_SMALL, 0, 0);
    }
    if (scenario == 6) {
        pending_asteroids = 1;
        next_spawn_ms = game_ms + SPAWN_WARNING_MS;
        pending_spawn_y = SCREEN_H / 2;
    }
}
