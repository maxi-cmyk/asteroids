#pragma once
#include "../../contracts.h"
namespace loadout {
class TwinShotPrimary {
    public:
    static void fire(WeaponContext& c) {
        ShotSpec a = primary_spec(1);
        a.lateral = -4;
        c.emit(a);
        a.lateral = 4;
        c.emit(a);
    }
};
} // namespace loadout
