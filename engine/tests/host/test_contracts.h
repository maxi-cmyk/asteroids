// Edge contracts for the small shared helpers (audit A11, A12): the RNG interval arithmetic and
// the Arduino `map` stand-in, plus the joystick path that used to divide by zero.
#pragma once
#include <climits>

static void test_random_range_intervals() {
    assert(rock_random_range(7, 7) == 7); // empty
    assert(rock_random_range(9, 3) == 9); // reversed
    for (int i = 0; i < 200; i++) {
        long negative = rock_random_range(-10, -5);
        assert(negative >= -10 && negative < -5);
        long crossing = rock_random_range(-5, 5);
        assert(crossing >= -5 && crossing < 5);
        // The widest interval a 32-bit long can hold (the ESP32's width), valid on any host.
        long wide = rock_random_range(-2147483647L - 1, 2147483647L);
        assert(wide >= -2147483647L - 1 && wide < 2147483647L);
    }
    // Spans a uint32_t cannot hold (only possible where long is 64-bit) are unsupported: the
    // lower bound comes back, with no signed overflow on the way.
    if (sizeof(long) > 4) {
        assert(rock_random_range(LONG_MIN, LONG_MAX) == LONG_MIN);
        assert(rock_random_range(0, 5000000000L) == 0);
    }
}

static void test_map_guards_an_empty_input_range() {
    // Arduino-ESP32's map returns the middle of the output range instead of dividing by zero.
    assert(map(5, 3, 3, 0, 100) == 50);
    assert(map(0, 0, 0, -100, 0) == -50);
    assert(map(7, 0, 10, 0, 100) == 70); // ordinary use is unchanged
    assert(map(2048, 2048, 4095, 0, 100) == 0);
}

static void test_zero_calibration_centre_reads_as_centred() {
    joystick_raw_x = 0;
    joystick_raw_y = 0;
    input_init(); // calibrates the centre to 0
    input_update();
    // A stick with no travel below its centre has nothing to deflect: it reads as centred
    // (not as full deflection from a midpoint fallback).
    assert(input_get().joystick_x == 0.0f);
    assert(input_get().joystick_y == 0.0f);
    joystick_raw_x = TEST_ADC_CENTER;
    joystick_raw_y = TEST_ADC_CENTER;
    input_init();
    input_update();
    assert(input_get().joystick_x == 0.0f);
}
