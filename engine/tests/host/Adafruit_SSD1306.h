#pragma once
#include <cstdint>
#include <algorithm>
#include "Wire.h"
#define SSD1306_SWITCHCAPVCC 0
#define SSD1306_SETDISPLAYOFFSET 0xD3
#define SSD1306_WHITE 1
#define SSD1306_BLACK 0
class Adafruit_SSD1306 {
    public:
    // What display_init asked of the driver (the real constructor's defaults are 400 / 100 kHz).
    uint32_t clk_during = 400000UL;
    uint32_t clk_after = 100000UL;
    TwoWire *bus = nullptr;
    int begin_calls = 0;
    int begin_address = -1;
    bool begin_result = true; // false mimics a failed frame-buffer allocation
    int commands = 0;
    int display_calls = 0;
    Adafruit_SSD1306() = default;
    Adafruit_SSD1306(int, int, TwoWire *wire, int, uint32_t during = 400000UL, uint32_t after = 100000UL)
        : clk_during(during), clk_after(after), bus(wire) {
    }
    bool begin(int, int address) {
        ++begin_calls;
        begin_address = address;
        return begin_result;
    }
    const uint8_t *getBuffer() {
        return nullptr;
    }
    void display() {
        ++display_calls;
    }
    void ssd1306_command(uint8_t) {
        ++commands;
    }
    int outline_calls = 0;
    int fill_calls = 0;
    int triangle_calls = 0;
    int bar_x = 0;
    int bar_y = 0;
    int bar_width = 0;
    int bar_height = 0;
    int fill_width = 0;
    void drawRect(int x, int y, int width, int height, int) {
        ++outline_calls;
        bar_x = x;
        bar_y = y;
        bar_width = width;
        bar_height = height;
    }
    void fillRect(int, int, int width, int, int) {
        ++fill_calls;
        fill_width = width;
    }
    int triangle_min_x = 0;
    int triangle_max_x = 0;
    int triangle_min_y = 0;
    int triangle_max_y = 0;
    int line_x = 0;
    int line_y = 0;
    int line_width = 0;
    void drawTriangle(int x1, int y1, int x2, int y2, int x3, int y3, int) {
        ++triangle_calls;
        triangle_min_x = std::min(x1, std::min(x2, x3));
        triangle_max_x = std::max(x1, std::max(x2, x3));
        triangle_min_y = std::min(y1, std::min(y2, y3));
        triangle_max_y = std::max(y1, std::max(y2, y3));
    }

    template <class... T> void drawLine(T...) {
    }

    void drawFastHLine(int x, int y, int width, int) {
        line_x = x;
        line_y = y;
        line_width = width;
    }

    template <class... T> void drawPixel(T...) {
    }

    template <class... T> void setTextSize(T...) {
    }

    template <class... T> void setTextColor(T...) {
    }

    template <class... T> void setCursor(T...) {
    }

    template <class... T> void print(T...) {
    }

    template <class... T> void printf(T...) {
    }

    void clearDisplay() {
    }
};
