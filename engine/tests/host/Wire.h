#pragma once
#include <cstdint>
// Host stand-in for the Arduino I2C bus: records what display_init does to it and lets a test
// make the device NACK.
struct TwoWire {
    int begin_calls = 0;
    int begin_sda = -1;
    int begin_scl = -1;
    unsigned long set_clock_calls = 0;
    int probe_address = -1;
    int probe_calls = 0;
    uint8_t end_result = 0; // 0 = ACK, 2 = NACK on address, 3 = NACK on data
    void begin(int sda, int scl) {
        ++begin_calls;
        begin_sda = sda;
        begin_scl = scl;
    }
    void setClock(unsigned long) {
        ++set_clock_calls;
    }
    void beginTransmission(uint8_t address) {
        probe_address = address;
        ++probe_calls;
    }
    uint8_t endTransmission() {
        return end_result;
    }
};
inline TwoWire Wire;
