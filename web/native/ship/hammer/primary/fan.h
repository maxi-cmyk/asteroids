#pragma once
#include "../../contracts.h"
namespace loadout {
class FanPrimary {
    public:
    static void fire(WeaponContext& c) {
        for (int i = -2; i <= 2; i++) {
            ShotSpec a = primary_spec(4);
            a.angle = i * 0.10471976f;
            c.emit(a);
        }
    }
};
} // namespace loadout
