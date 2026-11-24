#pragma once
#include "contracts.h"
namespace loadout {
static constexpr unsigned CAPACITY = 48;
struct Projectile {
    bool active = false, secondary = false, counted = false, boss_hit = false;
    float x = 0, y = 0, px = 0, py = 0, vx = 0, vy = 0;
    unsigned kind = 0, damage = 1, pierce = 1, wait = 0, life = 0, age = 0,
             next = 0;
    uint32_t rocks = 0;
};
struct State {
    bool enabled = false;
    unsigned ship = 0, primary = 0, secondary = 0;
    float vx = 0, vy = 0;
    unsigned primary_left = 0;
    Projectile shots[CAPACITY] = {};
};
} // namespace loadout
static loadout::State loadouts[2] = {};
static unsigned loadout_owner = 0;
static void loadout_reset() {
    loadouts[0] = {};
    loadouts[1] = {};
    loadout_owner = 0;
}
