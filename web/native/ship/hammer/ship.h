#pragma once
#include "../contracts.h"
namespace loadout {
class HammerShip {
    public:
    static void step(MotionContext& c) {
        c.step(SHIP_TUNING[4]);
    }
};
} // namespace loadout
