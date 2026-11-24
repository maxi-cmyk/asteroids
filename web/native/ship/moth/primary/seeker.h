#pragma once
#include "../../contracts.h"
namespace loadout {
class SeekerPrimary {
    public:
    static void fire(WeaponContext& c) {
        ShotSpec a = primary_spec(5);

        a.kind = SEEKER;
        c.emit(a);
    }
};
} // namespace loadout
