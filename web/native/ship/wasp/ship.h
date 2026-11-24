#pragma once
#include "../contracts.h"
namespace loadout {
class WaspShip {
    public:
    static void step(MotionContext& c) {
        c.step(SHIP_TUNING[3]);
    }
};
} // namespace loadout
