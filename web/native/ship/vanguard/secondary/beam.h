#pragma once
#include "../../contracts.h"
namespace loadout {
class BeamSecondary {
    public:
    static void fire(WeaponContext& c) {
        if (c.beam) {
            c.beam(c.data);
        }
    }
};
} // namespace loadout
