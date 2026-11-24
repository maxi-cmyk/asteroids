#pragma once
#include "../../contracts.h"
namespace loadout {
class ArcVolleySecondary {
    public:
    static void fire(WeaponContext& c) {
        for (int i = -2; i <= 2; i++) {
            ShotSpec a;
            a.damage = 6;
            a.speed = 22;
            a.angle = i * .18f;
            c.emit(a);
        }
    }
};
} // namespace loadout
