#pragma once
#include "../../contracts.h"
namespace loadout {
class RocketSalvoSecondary {
    public:
    static void fire(WeaponContext& c) {
        for (int i = -1; i <= 1; i++) {
            ShotSpec a;
            a.kind = ROCKET;
            a.damage = 8;
            a.speed = 8;
            a.angle = i * .15f;
            a.delay = (i + 1) * 80;
            a.life = 2400;
            c.emit(a);
        }
    }
};
} // namespace loadout
