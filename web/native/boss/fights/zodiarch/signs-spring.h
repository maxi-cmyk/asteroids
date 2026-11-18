#pragma once
// The spring signs' attacks, `t` ms after the creature has formed. Each returns
// true when it is done. Every shot and wall leaves from an emitter on the
// figure (data.h SIGN_EMIT). light on the horns, a lane from the ram to the
// edge, and the full charge
static bool bs_act_aries(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    if (bs_at(t, 0)) {
        bs_keep(p,
                bs_hazard(HK_LANE,
                          p.u + SIGN_EMIT[SG_ARIES][E_HORNS][0],
                          y,
                          BOSS_PI,
                          p.u + 40,
                          13,
                          900,
                          500));
    }
    if (t >= 900) {
        p.x = p.u - (t - 900) * ZOD_RUN;
    }
    return p.x < -70;
}
// Aldebaran sweeps a beam; then the stampede, the knot bursting as it passes
static bool bs_act_taurus(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    if (bs_at(t, 0)) {
        float ex, ey;
        bs_emit(p, E_EYE, ex, ey);
        float a = bs_angle_to(ex, ey, boss.target_x, boss.target_y);
        BossHazard *h = bs_keep(
                p, bs_hazard(HK_BEAM, ex, ey, a - .14f, 0, a - .14f, 900, 600));
        if (h) {
            h->e = a + .14f;
            h->d = .28f / (600.0f / FRAME_TIME_MS);
        }
    }
    if (bs_at(t, 1500)) {
        bs_keep(p,
                bs_hazard(HK_LANE,
                          p.u + SIGN_EMIT[SG_TAURUS][E_MUZZLE][0],
                          y,
                          BOSS_PI,
                          p.u + 40,
                          14,
                          900,
                          500),
                true);
    }
    if (t >= 2400) {
        p.x = p.u - (t - 2400) * ZOD_RUN;
        if (p.ang == 0 && p.x <= boss.target_x + 60) {
            p.ang = 1;
            unsigned n = bs_density(7);
            float spin = bs_rand(0, TWO_PI / n);
            for (unsigned k = 0; k < n; k++) {
                bs_shot_at(SF_PELLET, p.x - 20, y, spin + k * TWO_PI / n, 1.4f);
            }
        }
    }
    return p.x < -70;
}
// a beam from each twin's hand; they step closer and fire again
static bool bs_act_gemini(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    if (!p.lead) {
        return false; // the lead twin runs both
    }
    BossPart *q = p.link >= 0 ? &boss.parts[p.link] : nullptr;
    float ty = float(p.fire_at);
    for (unsigned round = 0; round < 2; round++) {
        float gap = round ? 34 : 60;
        float row_a = bs_clamp(ty - gap, 20, 188),
              row_b = bs_clamp(ty + gap, 20, 222);
        if (round && t >= 1300 && t < 1700) {
            bs_glide(p,
                     p.u,
                     bs_clamp(row_a - SIGN_EMIT[SG_GEMINI][E_HAND][1], 24, 246),
                     1.5f);
            if (q && q->exists && q->state == 1) {
                bs_glide(*q,
                         q->u,
                         bs_clamp(row_b - SIGN_EMIT[SG_GEMINI][E_B_HAND][1],
                                  24,
                                  246),
                         1.5f);
            }
        }
        if (bs_at(t, round * 1700)) {
            float hx = p.x + SIGN_EMIT[SG_GEMINI][E_HAND][0];
            bs_keep(p,
                    bs_hazard(HK_LANE,
                              hx,
                              row_a,
                              BOSS_PI,
                              hx + 40,
                              10,
                              900,
                              400));
            if (q && q->exists) {
                float bx = q->x + SIGN_EMIT[SG_GEMINI][E_B_HAND][0];
                bs_keep(p,
                        bs_hazard(HK_LANE,
                                  bx,
                                  row_b,
                                  BOSS_PI,
                                  bx + 40,
                                  10,
                                  900,
                                  400),
                        true);
            }
        }
    }
    bool done = t >= 3000;
    if (done && q && q->exists) {
        bs_sign_dissolve(*q);
    }
    return done;
}
