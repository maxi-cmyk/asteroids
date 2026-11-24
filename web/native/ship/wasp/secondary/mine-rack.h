#pragma once
#include "../../contracts.h"
namespace loadout {
class MineRackSecondary {
    public:
    static void fire(WeaponContext& c) {
        for (int i = -1; i <= 1; i++) {
            ShotSpec a;
            a.kind = MINE;
            a.damage = 12;
            a.speed = 0;
            a.lateral = i * 22;
            a.life = 5000;
            c.emit(a);
        }
    }
};
} // namespace loadout
