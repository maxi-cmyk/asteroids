#pragma once
#include "../contracts.h"
namespace loadout {
class VanguardShip {
    public:
    static void step(MotionContext& c) {
        c.step(SHIP_TUNING[0]);
    }
};
} // namespace loadout
