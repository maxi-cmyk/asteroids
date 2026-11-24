#pragma once
// Internal adapter: engine context is supplied by combat.h.
struct LoadoutEmitter {
    unsigned owner;
    Ship *hull;
    CombatState *weapons;
    bool secondary;
};
static bool loadout_spawn(void *data, const loadout::ShotSpec& spec) {
    auto& c = *static_cast<LoadoutEmitter *>(data);
    auto& state = loadouts[c.owner];
    for (auto& shot : state.shots) {
        if (!shot.active) {
            shot = {};
            shot.active = true;
            shot.secondary = c.secondary;
            shot.kind = spec.kind;
            shot.damage = spec.damage;
            shot.pierce = spec.pierce;
            shot.wait = spec.delay;
            shot.life = spec.life;
            float a = bs_atan2(c.weapons->aim_y, c.weapons->aim_x) + spec.angle;
            shot.x = c.hull->position_x + c.weapons->aim_x * SHIP_BULLET_OFFSET
                     - c.weapons->aim_y * spec.lateral;
            shot.y = c.hull->position_y + c.weapons->aim_y * SHIP_BULLET_OFFSET
                     + c.weapons->aim_x * spec.lateral;
            if (spec.kind == loadout::PULSE) {
                shot.x = c.hull->position_x;
                shot.y = c.hull->position_y;
            }
            shot.px = shot.x;
            shot.py = shot.y;
            shot.vx = cosf(a) * spec.speed;
            shot.vy = sinf(a) * spec.speed;
            if (!c.secondary && !shot.wait) {
                c.weapons->spawned++;
            }
            return true;
        }
    }
    return false;
}
