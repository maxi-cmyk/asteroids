#pragma once
#include "../contracts.h"
namespace loadout {
class DartShip {
    public:
    static void step(MotionContext& c) {
        c.step(SHIP_TUNING[1]);
    }
};
} // namespace loadout
