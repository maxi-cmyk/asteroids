#pragma once
#include "../../contracts.h"
namespace loadout {
class RepeaterPrimary {
    public:
    static void fire(WeaponContext& c) {
        c.emit(primary_spec(0));
    }
};
} // namespace loadout
