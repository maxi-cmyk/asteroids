#pragma once
// Internal adapter: engine context is supplied by combat.h.
static bool loadout_area_target(const BossCircle& circle) {
    return (circle.flags & 1) && circle.type != BC_SHOT;
}
static void loadout_award_solo(unsigned, uint32_t points) {
    combat_award(points);
}
static void (*loadout_award_hook)(unsigned, uint32_t) = loadout_award_solo;
static void loadout_no_stat(unsigned) {
}
static void loadout_boss_hit(unsigned circle, unsigned owner, unsigned damage) {
    // Own accuracy is counted once per projectile below. Secondary damage must
    // not inflate it.
    auto previous = boss_stat_hook;
    boss_stat_hook = loadout_no_stat;
    bs_circle_hit(circle, owner, damage, false);
    boss_stat_hook = previous;
}
static float
loadout_entry(const loadout::Projectile& p, float x, float y, float radius) {
    float dx = p.x - p.px, dy = p.y - p.py, ox = p.px - x, oy = p.py - y;
    float outside = ox * ox + oy * oy - radius * radius;
    if (outside <= 0) {
        return 0;
    }
    float len = dx * dx + dy * dy, projection = ox * dx + oy * dy,
          disc = projection * projection - len * outside;
    if (!len || disc < 0) {
        return 2;
    }
    float t = (-projection - sqrtf(disc)) / len;
    return t >= 0 && t <= 1 ? t : 2;
}
static void loadout_rock(unsigned owner,
                         int index,
                         bool secondary,
                         CombatState& weapons,
                         bool split = true) {
    if (!rocks[index].active) {
        return;
    }
    Asteroid rock = rocks[index];
    if (split && rock.size != AST_SMALL && free_slots() < 1) {
        return;
    }
    rocks[index].active = false;
    particles_spawn(rock.position_x, rock.position_y);
    loadout_award_hook(owner, asteroid_points(rock.size));
    if (secondary) {
        weapons.laser_kills++;
    }
    combat_drop(rock.position_x, rock.position_y);
    if (split && rock.size != AST_SMALL) {
        split_asteroid(rock);
    }
}
static void loadout_blast(unsigned owner,
                          loadout::Projectile& p,
                          CombatState& weapons,
                          float radius) {
    for (int i = 0; i < ASTEROID_MAX; i++) {
        if (rocks[i].active) {
            float dx = rocks[i].position_x - p.x,
                  dy = rocks[i].position_y - p.y;
            if (dx * dx + dy * dy
                < (radius + rocks[i].radius) * (radius + rocks[i].radius)) {
                loadout_rock(owner, i, true, weapons, false);
            }
        }
    }
}
static void loadout_seek(loadout::Projectile& p) {
    float tx = p.x + 100, ty = p.y, distance = 1e9f;
    bool found = false;
    for (int i = 0; i < ASTEROID_MAX; i++) {
        if (rocks[i].active && rocks[i].position_x >= 0
            && rocks[i].position_x < SCREEN_W) {
            float dx = rocks[i].position_x - p.x,
                  dy = rocks[i].position_y - p.y, d = dx * dx + dy * dy;
            if (d < distance) {
                distance = d;
                tx = rocks[i].position_x;
                ty = rocks[i].position_y;
                found = true;
            }
        }
    }
    bs_build_circles();
    for (unsigned i = 0; i < boss_circle_count; i++) {
        const auto& c = boss_circles[i];
        if (!(c.flags & 1) || (c.type != BC_CORE && c.type != BC_PART)) {
            continue;
        }
        float dx = c.x - p.x, dy = c.y - p.y, d = dx * dx + dy * dy;
        if (d < distance) {
            distance = d;
            tx = c.x;
            ty = c.y;
            found = true;
        }
    }
    if (found && distance > 1) {
        float speed = sqrtf(p.vx * p.vx + p.vy * p.vy),
              length = sqrtf(distance);
        float vx = p.vx * .94f + (tx - p.x) / length * speed * .06f,
              vy = p.vy * .94f + (ty - p.y) / length * speed * .06f;
        length = sqrtf(vx * vx + vy * vy);
        if (length > 0) {
            p.vx = vx / length * speed;
            p.vy = vy / length * speed;
        }
    }
}
