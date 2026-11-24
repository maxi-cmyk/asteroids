#pragma once
#include "../../contracts.h"
namespace loadout {
class BurstPrimary {
    public:
    static void fire(WeaponContext& c) {
        for (unsigned i = 0; i < 3; i++) {
            ShotSpec a = primary_spec(3);
            a.delay = i * 60;
            c.emit(a);
        }
    }
};
} // namespace loadout
