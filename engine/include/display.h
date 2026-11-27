#pragma once

#include <Adafruit_SSD1306.h>

// Why display_init failed (or DISPLAY_OK). A driver that merely allocated its frame buffer is not
// proof of a panel: the bus must answer at OLED_ADDR first.
enum DisplayStatus {
    DISPLAY_UNINITIALISED,
    DISPLAY_OK,
    DISPLAY_NO_ACK,
    DISPLAY_ALLOC_FAILED,
};

bool display_init();
DisplayStatus display_status();
Adafruit_SSD1306& display_get();
void display_hud(uint8_t lives,
                 uint32_t score,
                 uint8_t multiplier,
                 unsigned long chain_left_ms);
void display_flip();
void display_shake(uint8_t frames);
void display_shake_update();
