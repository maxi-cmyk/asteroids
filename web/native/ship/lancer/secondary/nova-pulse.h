#pragma once
#include "../../contracts.h"
namespace loadout {
class NovaPulseSecondary {
    public:
    static void fire(WeaponContext& c) {
        ShotSpec a;
        a.kind = PULSE;
        a.damage = 18;
        a.speed = 0;
        a.life = 600;
        c.emit(a);
    }
};
} // namespace loadout
