#pragma once
#include "../contracts.h"
namespace loadout {
class MothShip {
    public:
    static void step(MotionContext& c) {
        c.step(SHIP_TUNING[5]);
    }
};
} // namespace loadout
