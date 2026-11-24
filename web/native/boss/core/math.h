#pragma once

// ---------------------------------------------------------------- maths
static float bs_clamp(float v, float lo, float hi) {
    return v < lo ? lo : v > hi ? hi : v;
}
static float bs_min(float a, float b) {
    return a < b ? a : b;
}
static float bs_max(float a, float b) {
    return a > b ? a : b;
}
static float bs_wrap(float a) {
    while (a > BOSS_PI) {
        a -= TWO_PI;
    }
    while (a < -BOSS_PI) {
        a += TWO_PI;
    }
    return a;
}
static float bs_atan2(float y, float x) {
    float ax = fabsf(x), ay = fabsf(y);
    float hi = bs_max(ax, ay), lo = bs_min(ax, ay);
    if (hi == 0) {
        return 0;
    }
    float a = lo / hi, s = a * a;
    float r = ((-0.0464964749f * s + 0.15931422f) * s - 0.327622764f) * s * a
              + a;
    if (ay > ax) {
        r = 1.57079637f - r;
    }
    if (x < 0) {
        r = BOSS_PI - r;
    }
    return y < 0 ? -r : r;
}
static float bs_rand(float lo, float hi) {
    return lo + (hi - lo) * (rock_random_bounded(1000) / 1000.0f);
}
static unsigned long bs_since(unsigned long t) {
    return game_ms >= t ? game_ms - t : 0;
}
static bool bs_at(unsigned long t, unsigned long ms) {
    return t >= ms && t < ms + FRAME_TIME_MS;
}
static float bs_dist(float x0, float y0, float x1, float y1) {
    float dx = x1 - x0, dy = y1 - y0;
    return sqrtf(dx * dx + dy * dy);
}

