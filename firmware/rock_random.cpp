#include "rock_random.h"
#include <WiFi.h>
#include <esp_random.h>
#include <cstdlib>

static bool entropy_ready = false;
static const int RANDOM_REJECTION_LIMIT = 32;

bool rock_random_init() {
    // RF provides continuous entropy without taking over the joystick ADC.
    // No credentials, association, scanning, or network service is needed.
    WiFi.persistent(false);
    WiFi.setAutoReconnect(false);
    entropy_ready = WiFi.mode(WIFI_STA) && WiFi.setSleep(false);
    return entropy_ready;
}

uint32_t rock_random_bounded(uint32_t upper) {
    if (!entropy_ready) {
        abort();
    }

    if (!upper) {
        return 0;
    }

    // Reject the incomplete interval at the bottom of the 32-bit range.
    uint32_t threshold = uint32_t(-upper) % upper;

    for (int attempt = 0; attempt < RANDOM_REJECTION_LIMIT; attempt++) {
        uint32_t value = esp_random();
        if (value >= threshold) {
            return value % upper;
        }
    }

    // Never silently substitute a biased result or software PRNG.
    abort();
}

// A value in [lower, upper). An empty or reversed interval returns `lower`, and so does one wider
// than a 32-bit draw can cover (impossible on the ESP32, whose long is 32-bit; the host's is
// 64). The span is computed in unsigned arithmetic so no interval can overflow a signed long.
long rock_random_range(long lower, long upper) {
    if (upper <= lower) {
        return lower;
    }

    unsigned long span = (unsigned long)upper - (unsigned long)lower;
    if (span > UINT32_MAX) {
        return lower;
    }

    unsigned long offset = rock_random_bounded(uint32_t(span));
    return long((unsigned long)lower + offset);
}
