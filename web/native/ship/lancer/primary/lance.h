#pragma once
#include "../../contracts.h"
namespace loadout {
class LancePrimary {
    public:
    static void fire(WeaponContext& c) {
        ShotSpec a = primary_spec(2);

        a.pierce = 3;
        c.emit(a);
    }
};
} // namespace loadout
