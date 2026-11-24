#pragma once
#include <stdint.h>
#include "../Arduino.h"
#include "ship_data.h"

namespace loadout {
enum Kind {
    BOLT,
    SEEKER,
    ROCKET,
    PULSE,
    MINE,
    DRONE
};
struct ShotSpec {
    float angle = 0, lateral = 0, speed = 18.75f;
    unsigned damage = 1, kind = BOLT, pierce = 1, delay = 0, life = 1800;
};
inline ShotSpec primary_spec(unsigned id) {
    ShotSpec spec;
    spec.speed = PRIMARY_SPEED[id];
    spec.damage = PRIMARY_DAMAGE[id];
    return spec;
}
struct WeaponContext {
    void *data;
    bool (*spawn)(void *, const ShotSpec&);
    void (*beam)(void *) = nullptr;
    void emit(const ShotSpec& spec) {
        spawn(data, spec);
    }
};
struct MotionContext {
    float x, y, vx, vy;
    void step(const ShipTuning& tuning) {
        float tx = x * tuning.speed, ty = y * tuning.speed;
        bool braking = x == 0 && y == 0;
        float amount = tuning.speed * 20
                       / float(braking ? tuning.braking : tuning.acceleration);
        float dx = tx - vx, dy = ty - vy;
        float length = sqrtf(dx * dx + dy * dy);
        float scale = length > amount ? amount / length : 1;
        vx += dx * scale;
        vy += dy * scale;
    }
};
struct ShipOps {
    void (*step)(MotionContext&);
};
struct WeaponOps {
    void (*fire)(WeaponContext&);
};
} // namespace loadout
