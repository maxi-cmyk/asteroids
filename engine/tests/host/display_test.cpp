// display_init against a mock I2C bus and driver (audit A08/A09): the intended transfer clock
// reaches the driver, and a display that does not answer is told apart from a failed allocation.
#include <cassert>
#include "Arduino.h"
#include "../../include/config.h"
#include "../../src/display.cpp"

// The driver is constructed once, as a static; the test checks that construction.
static void test_transfer_clock_reaches_the_driver() {
    assert(display_get().clk_during == OLED_I2C_CLOCK_HZ);
}

static void test_ack_and_allocation_give_ok() {
    Wire = TwoWire();
    assert(display_init());
    assert(display_status() == DISPLAY_OK);
    assert(Wire.probe_address == OLED_ADDR);
    assert(display_get().begin_address == OLED_ADDR);
}

static void test_missing_display_is_a_nack_not_an_allocation_failure() {
    Wire = TwoWire();
    Wire.end_result = 2;
    const int begins = display_get().begin_calls;
    assert(!display_init());
    assert(display_status() == DISPLAY_NO_ACK);
    assert(display_get().begin_calls == begins); // the driver was never asked to initialise
}

static void test_failed_allocation_is_reported_distinctly() {
    Wire = TwoWire();
    display_get().begin_result = false;
    assert(!display_init());
    assert(display_status() == DISPLAY_ALLOC_FAILED);
    display_get().begin_result = true;
}

int main() {
    test_transfer_clock_reaches_the_driver();
    test_ack_and_allocation_give_ok();
    test_missing_display_is_a_nack_not_an_allocation_failure();
    test_failed_allocation_is_reported_distinctly();
    return 0;
}
