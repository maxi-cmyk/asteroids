#pragma once
#include "../../contracts.h"
namespace loadout {
class DroneSecondary {
    public:
    static void fire(WeaponContext& c) {
        ShotSpec a;
        a.kind = DRONE;
        a.speed = 0;
        a.damage = 2;
        a.life = 4000;
        c.emit(a);
    }
};
} // namespace loadout
