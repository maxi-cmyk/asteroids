// The engine's own sinf/cosf (web/native/mathf.h) against an independent reference (libm's
// long-double sinl/cosl of the same float), across the supported domain; outside it the result
// must still be finite and inside [-1, 1] (audit A10). Built with -fno-builtin.
#include <cassert>
#include <cfloat>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <initializer_list>
#include "../../../web/native/mathf.h"

static float from_bits(uint32_t bits) {
    float x;
    std::memcpy(&x, &bits, sizeof x);
    return x;
}

static double worst_error = 0;
static void check_close(float x) {
    long double s = sinl((long double)x), c = cosl((long double)x);
    double es = std::fabs((double)(sinf(x) - s)), ec = std::fabs((double)(cosf(x) - c));
    if (es > worst_error) worst_error = es;
    if (ec > worst_error) worst_error = ec;
    assert(es <= 6e-8 && ec <= 6e-8);
}

static void test_supported_domain_matches_the_reference() {
    uint32_t state = 9191;
    auto next = [&] { return state = state * 1664525u + 1013904223u; };
    for (int i = 0; i < 200000; i++) {
        float x = (float)((next() / 4294967296.0) * 2.0 - 1.0) * MATHF_MAX_ARG;
        check_close(x);
    }
    // Neighbourhoods of the quadrant boundaries, near zero and at the edge of the domain.
    const double half_pi = 1.57079632679489661923;
    for (long k : {1L, 2L, 3L, 4L, 100L, 5000L, 600000L}) {
        float centre = (float)(k * half_pi);
        float x = centre;
        for (int step = 0; step < 4; step++) {
            check_close(x);
            check_close(-x);
            x = std::nextafter(x, 0.0f);
        }
        x = centre;
        for (int step = 0; step < 4; step++) {
            if (x <= MATHF_MAX_ARG) check_close(x);
            x = std::nextafter(x, FLT_MAX);
        }
    }
    check_close(MATHF_MAX_ARG);
    check_close(-MATHF_MAX_ARG);
    assert(worst_error < 6e-8);
}

static void test_zero_and_non_finite_inputs() {
    assert(sinf(0.0f) == 0.0f && !std::signbit(sinf(0.0f)));
    assert(std::signbit(sinf(-0.0f)));
    assert(cosf(0.0f) == 1.0f && cosf(-0.0f) == 1.0f);
    for (float x : {INFINITY, -INFINITY, NAN}) {
        assert(std::isnan(sinf(x)));
        assert(std::isnan(cosf(x)));
    }
}

static void test_outside_the_domain_stays_finite_and_bounded() {
    float samples[] = {MATHF_MAX_ARG * 1.0001f, 1e7f, 1e10f, 1e15f, 1e20f, from_bits(0x60000000),
                       FLT_MAX, std::nextafter(FLT_MAX, 0.0f)};
    for (float x : samples)
        for (float sign : {1.0f, -1.0f}) {
            float s = sinf(sign * x), c = cosf(sign * x);
            assert(std::isfinite(s) && std::isfinite(c));
            assert(s >= -1.0f && s <= 1.0f && c >= -1.0f && c <= 1.0f);
        }
    // Every finite magnitude class, sampled by bit pattern.
    uint32_t state = 7;
    for (int i = 0; i < 100000; i++) {
        state = state * 1664525u + 1013904223u;
        float x = from_bits(state & 0x7fffffffu);
        if (!std::isfinite(x)) continue;
        float s = sinf(x), c = cosf(-x);
        assert(s >= -1.0f && s <= 1.0f && c >= -1.0f && c <= 1.0f);
    }
}

int main() {
    test_supported_domain_matches_the_reference();
    test_zero_and_non_finite_inputs();
    test_outside_the_domain_stays_finite_and_bounded();
    return 0;
}
