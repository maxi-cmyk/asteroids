#pragma once

#include <Arduino.h>
#include "weapon.h"
#include "powerup.h"
#include <Adafruit_SSD1306.h>

struct Ship {
    WeaponState weapon;
    PowerupEffects effects;
    float position_x;
    float position_y;
    float facing_x; // unit aim direction; (0, 0) counts as facing right
    float facing_y;
    bool alive;
    uint8_t lives;
    unsigned long invincible_left;
};

void ship_init(Ship& ship);
void ship_update(Ship& ship, float joystick_x, float joystick_y);
void ship_draw(const Ship& ship,
               Adafruit_SSD1306& display,
               unsigned long game_ms = 0);
void ship_die(Ship& ship);
// Contact shape (SHIP_HULL_CIRCLES): circle `index` placed along the ship's
// facing.
void ship_hull_circle(
        const Ship& ship, int index, float& x, float& y, float& radius);
// True when a circle at (x, y) with `radius` overlaps the ship's contact shape.
bool ship_touches(const Ship& ship, float x, float y, float radius);
// Farthest the contact shape reaches along the facing (for tests and spawn
// spacing).
float ship_hull_reach();
void ship_respawn(Ship& ship,
                  float position_x,
                  float position_y,
                  unsigned long game_ms = 0);
