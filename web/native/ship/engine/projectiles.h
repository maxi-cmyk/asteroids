#pragma once
// Internal adapter: engine context is supplied by combat.h.
static void loadout_world_step(unsigned owner,
                               Ship& hull,
                               CombatState& weapons,
                               const Ship *other = nullptr,
                               bool friendly = false) {
    auto& state = loadouts[owner];
    if (!state.enabled) {
        return;
    }
    if (!hull.alive) {
        loadout_cancel(owner);
        return;
    }
    state.primary_left -= min(state.primary_left, unsigned(FRAME_TIME_MS));
    for (auto& p : state.shots) {
        if (!p.active) {
            continue;
        }
        if (p.wait) {
            if (!p.secondary && weapons.charging && state.secondary == 0) {
                p.active = false;
                continue;
            }
            p.wait -= min(p.wait, unsigned(FRAME_TIME_MS));
            if (!p.wait && !p.secondary) {
                weapons.spawned++;
            }
            continue;
        }
        p.age += FRAME_TIME_MS;
        if (p.age >= p.life) {
            p.active = false;
            continue;
        }
        if (p.kind == loadout::DRONE) {
            p.x = hull.position_x - 10;
            p.y = hull.position_y - 16;
            if (p.age >= p.next) {
                p.next = p.age + 300;
                Ship origin = hull;
                origin.position_x = p.x - weapons.aim_x * SHIP_BULLET_OFFSET;
                origin.position_y = p.y - weapons.aim_y * SHIP_BULLET_OFFSET;
                LoadoutEmitter emit = {owner, &origin, &weapons, true};
                loadout::ShotSpec shot;
                shot.damage = 2;
                shot.lateral = 0;
                loadout_spawn(&emit, shot);
            }
            continue;
        }
        if (p.kind == loadout::PULSE) {
            float radius = 80 * float(p.age) / p.life;
            for (unsigned i = 0; i < ASTEROID_MAX; i++) {
                if (rocks[i].active && !(p.rocks & (1u << i))
                    && bs_dist(p.x,
                               p.y,
                               rocks[i].position_x,
                               rocks[i].position_y)
                               < radius + rocks[i].radius) {
                    p.rocks |= 1u << i;
                    loadout_rock(owner, i, true, weapons, false);
                }
            }
            for (auto& shot : boss.shots) {
                if (shot.active
                    && (shot.family == SF_NEEDLE || shot.family == SF_SHARD
                        || shot.family == SF_BOLT || shot.family == SF_SINE
                        || shot.family == SF_PELLET || shot.family == SF_CURVE
                        || shot.family == SF_FAST || shot.family == SF_EMBER)
                    && bs_dist(p.x, p.y, shot.x, shot.y) < radius) {
                    shot.active = false;
                }
            }
            bs_build_circles();
            if (!p.boss_hit) {
                for (unsigned i = 0; i < boss_circle_count; i++) {
                    if (loadout_area_target(boss_circles[i])
                        && bs_dist(p.x,
                                   p.y,
                                   boss_circles[i].x,
                                   boss_circles[i].y)
                                   < radius + boss_circles[i].r) {
                        p.boss_hit = true;
                        loadout_boss_hit(i, owner, p.damage);
                        break;
                    }
                }
            }
            if (friendly && other && other->alive && !p.counted
                && bs_dist(p.x, p.y, other->position_x, other->position_y)
                           < radius + SHIP_RADIUS) {
                p.counted = true;
                boss_hit_hook(1 - owner);
            }
            continue;
        }
        if (p.kind == loadout::MINE) {
            bool near = false;
            for (int i = 0; i < ASTEROID_MAX; i++) {
                near |= rocks[i].active
                        && bs_dist(p.x,
                                   p.y,
                                   rocks[i].position_x,
                                   rocks[i].position_y)
                                   < 42 + rocks[i].radius;
            }
            bs_build_circles();
            for (unsigned i = 0; i < boss_circle_count; i++) {
                near |= loadout_area_target(boss_circles[i])
                        && bs_dist(p.x,
                                   p.y,
                                   boss_circles[i].x,
                                   boss_circles[i].y)
                                   < 42 + boss_circles[i].r;
            }
            if (!near || p.age < 200) {
                continue;
            }
            loadout_blast(owner, p, weapons, 48);
            p.active = false;
            for (unsigned i = 0; i < boss_circle_count; i++) {
                if (loadout_area_target(boss_circles[i])
                    && bs_dist(p.x, p.y, boss_circles[i].x, boss_circles[i].y)
                               < 48 + boss_circles[i].r) {
                    loadout_boss_hit(i, owner, p.damage);
                    break;
                }
            }
            if (friendly && other && other->alive
                && bs_dist(p.x, p.y, other->position_x, other->position_y)
                           < 48 + SHIP_RADIUS) {
                boss_hit_hook(1 - owner);
            }
            continue;
        }
        p.px = p.x;
        p.py = p.y;
        if (p.kind == loadout::SEEKER || p.kind == loadout::ROCKET) {
            loadout_seek(p);
        }
        p.x += p.vx;
        p.y += p.vy;
        bs_build_circles();
        int circle = bs_first_circle(p.px, p.py, p.x, p.y);
        float best = circle < 0 ? 2 : bs_entry(circle, p.px, p.py, p.x, p.y);
        int rock = -1;
        bool friend_hit = false;
        for (unsigned i = 0; i < ASTEROID_MAX; i++) {
            if (rocks[i].active && !(p.rocks & (1u << i))) {
                float t = loadout_entry(p,
                                        rocks[i].position_x,
                                        rocks[i].position_y,
                                        rocks[i].radius);
                if (t < best) {
                    best = t;
                    rock = i;
                    circle = -1;
                }
            }
        }
        if (friendly && other && other->alive) {
            float t = loadout_entry(
                    p, other->position_x, other->position_y, SHIP_RADIUS);
            if (t < best) {
                best = t;
                friend_hit = true;
                circle = rock = -1;
            }
        }
        if (best <= 1) {
            bool score_hit
                    = rock >= 0
                      || (circle >= 0 && boss_circles[circle].type != BC_BLOCK
                          && boss_circles[circle].type != BC_DEFLECT);
            if (!friend_hit && score_hit && !p.secondary && !p.counted) {
                weapons.hits++;
                p.counted = true;
            }
            if (friend_hit) {
                boss_hit_hook(1 - owner);
                p.active = false;
            } else if (circle >= 0) {
                loadout_boss_hit(circle, owner, p.damage);
                p.active = false;
            } else if (rock >= 0) {
                p.rocks |= 1u << rock;
                loadout_rock(owner, rock, p.secondary, weapons, !p.secondary);
                if (--p.pierce == 0) {
                    p.active = false;
                }
            }
            if (p.kind == loadout::ROCKET) {
                loadout_blast(owner, p, weapons, 28);
                p.active = false;
            }
        }
        if (p.x < 0 || p.x >= SCREEN_W || p.y < 0 || p.y >= SCREEN_H) {
            p.active = false;
        }
    }
}
