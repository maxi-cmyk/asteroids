#pragma once
// The engine's own sinf and cosf (nextSteps.md R3). They used to be imported
// from the browser's Math.sin and Math.cos, which V8 and JavaScriptCore may
// round differently, so the same inputs could play out differently on two
// machines. These use only IEEE double arithmetic, rint and floor, which
// WebAssembly defines exactly, so every runtime gets the same bits. Range
// reduction and kernels follow fdlibm (k_sin.c, k_cos.c): error far below one
// float ulp. Included once, from bridge.cpp.

static const double MATHF_2_OVER_PI = 6.36619772367581382433e-01;
static const double MATHF_PIO2_HI = 1.57079632673412561417e+00; // first 33 bits
static const double MATHF_PIO2_LO
        = 6.07710050650619224932e-11; // pi/2 - PIO2_HI

// sin(r) and cos(r) for |r| <= pi/4.
static double mathf_sin_kernel(double r) {
    double z = r * r;
    return r
           + r * z
                     * (-1.66666666666666324348e-01
                        + z
                                  * (8.33333333332248946124e-03
                                     + z
                                               * (-1.98412698298579493134e-04
                                                  + z
                                                            * (2.75573137070700676789e-06
                                                               + z
                                                                         * (-2.50507602534068634195e-08
                                                                            + z * 1.58969099521155010221e-10)))));
}
static double mathf_cos_kernel(double r) {
    double z = r * r;
    return 1.0 - 0.5 * z
           + z * z
                     * (4.16666666666666019037e-02
                        + z
                                  * (-1.38888888888741095749e-03
                                     + z
                                               * (2.48015872894767294178e-05
                                                  + z
                                                            * (-2.75573143513906633035e-07
                                                               + z
                                                                         * (2.08757232129817482790e-09
                                                                            + z * -1.13596475577881948265e-11)))));
}
// Reduces x to r in [-pi/4, pi/4] and returns the quadrant (0 to 3).
static int mathf_reduce(float x, double *r) {
    double k = __builtin_rint((double)x * MATHF_2_OVER_PI);
    *r = ((double)x - k * MATHF_PIO2_HI) - k * MATHF_PIO2_LO;
    return (int)(k - 4.0 * __builtin_floor(k * 0.25));
}

extern "C" float sinf(float x) {
    if (!(x - x == 0.0f)) {
        return x - x; // NaN for NaN and infinities
    }
    if (x == 0.0f) {
        return x; // keeps the sign of zero, as Math.sin does
    }
    double r;
    switch (mathf_reduce(x, &r)) {
    case 0:
        return (float)mathf_sin_kernel(r);
    case 1:
        return (float)mathf_cos_kernel(r);
    case 2:
        return (float)-mathf_sin_kernel(r);
    default:
        return (float)-mathf_cos_kernel(r);
    }
}
extern "C" float cosf(float x) {
    if (!(x - x == 0.0f)) {
        return x - x;
    }
    double r;
    switch (mathf_reduce(x, &r)) {
    case 0:
        return (float)mathf_cos_kernel(r);
    case 1:
        return (float)-mathf_sin_kernel(r);
    case 2:
        return (float)-mathf_cos_kernel(r);
    default:
        return (float)mathf_sin_kernel(r);
    }
}
