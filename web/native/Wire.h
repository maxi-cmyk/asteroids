#pragma once
struct BrowserWire {
    void begin(int, int) {
    }
    void setClock(unsigned long) {
    }
    // The browser has no bus: a "panel" always answers.
    void beginTransmission(unsigned char) {
    }
    unsigned char endTransmission() {
        return 0;
    }
};
inline BrowserWire Wire;
