#pragma once
#include "../contracts.h"
namespace loadout {
class LancerShip {
    public:
    static void step(MotionContext& c) {
        c.step(SHIP_TUNING[2]);
    }
};
} // namespace loadout
