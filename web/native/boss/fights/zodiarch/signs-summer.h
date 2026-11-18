#pragma once
// The summer signs' attacks, `t` ms after the creature has formed. Each returns
// true when it is done. Every shot and wall leaves from an emitter on the
// figure (data.h SIGN_EMIT). the claws shoot out on tethers down two lanes and
// snap back
static bool bs_act_cancer(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    if (bs_at(t, 0)) {
        for (unsigned k = 0; k < 2; k++) {
            float cx, cy;
            bs_emit(p, k ? E_CLAW_FAR : E_CLAW_NEAR, cx, cy);
            float tx = bs_clamp(boss.target_x + 30 + k * 70, 30, 300),
                  ty = k ? 266 : 4;
            float a = bs_angle_to(cx, cy, tx, ty);
            bs_keep(p,
                    bs_styled(bs_hazard(HK_LANE,
                                        cx,
                                        cy,
                                        a,
                                        bs_dist(cx, cy, tx, ty),
                                        8,
                                        900,
                                        500),
                              ZS_TETHER),
                    k);
        }
    }
    return t >= 1500;
}
// roar ring, suns shed from the mane, then the crouch and the full pounce
static bool bs_act_leo(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    float mx, my;
    bs_emit(p, E_MOUTH, mx, my);
    if (bs_at(t, 0)) {
        BossHazard *h = bs_keep(p,
                                bs_hazard(HK_RING,
                                          mx,
                                          my,
                                          BOSS_PI + bs_rand(-.6f, .6f),
                                          30,
                                          .5f,
                                          900,
                                          1400));
        if (h) {
            h->d = 3.0f;
            h->e = 0;
        }
    }
    float nx, ny;
    bs_emit(p, E_MANE, nx, ny);
    for (unsigned k = 0; k < 3; k++) {
        float a0 = -2.5f + k * .7f, bx = nx + cosf(a0) * 28,
              by = ny + sinf(a0) * 28;
        float aim = bs_angle_to(bx, by, boss.target_x, boss.target_y)
                    + (float(k) - 1) * .22f;
        if (bs_at(t, 1300 + k * 180)) {
            bs_hazard(HK_AIM, bx, by, aim, 60, 0, 600, 0);
        }
        if (bs_at(t, 1900 + k * 180)) {
            bs_shot_at(SF_SUN, bx, by, aim, 1.7f);
        }
    }
    if (t >= 2400 && t < 2700) { // the crouch: back and down
        float e = bs_ease(bs_span(t, 2400, 2700));
        p.x = p.u + 12 * e;
        p.y = p.v + 6 * e;
    }
    if (bs_at(t, 2700)) {
        p.ang = bs_angle_to(p.x, p.y, boss.target_x, boss.target_y);
        bs_keep(p,
                bs_hazard(HK_LANE,
                          p.x,
                          p.y,
                          p.ang,
                          bs_edge_len(p.x, p.y, p.ang),
                          12,
                          900,
                          700),
                true);
    }
    if (t >= 3600) {
        float d = (t - 3600) * ZOD_RUN;
        p.x = p.u + 12 + cosf(p.ang) * d;
        p.y = p.v + 6 + sinf(p.ang) * d;
        return bs_offscreen(p.x, p.y);
    }
    return false;
}
// four seeds thrown from her hand become turrets; then Spica, a nova star
static bool bs_act_virgo(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    for (unsigned k = 0; k < 4; k++) {
        unsigned long at = k * 250;
        if (bs_at(t, at)) {
            float sx = 150 + k * 40 + bs_rand(-12, 12), sy = bs_rand(40, 230);
            float a = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
            BossHazard *h = bs_styled(
                    bs_hazard(HK_AIM, sx, sy, a, 480, 0, 900, 0), ZS_SEED);
            if (h) {
                h->d = k; // remembers which seed
            }
        }
        if (bs_at(t, at + 900 - FRAME_TIME_MS)) {
            for (const BossHazard& h : boss.hz) {
                if (h.active && h.kind == HK_AIM && h.e == ZS_SEED
                    && h.d == k) {
                    bs_shot_at(SF_NEEDLE, h.x, h.y, h.a, 2.2f);
                    break;
                }
            }
        }
    }
    if (bs_at(t, 1800)) {
        float wx, wy;
        bs_emit(p, E_WHEAT, wx, wy);
        float tx = bs_clamp(boss.target_x + 50, 40, 300),
              ty = bs_clamp(boss.target_y + (boss.target_y < 135 ? 55 : -55),
                            30,
                            240);
        bs_nova(wx,
                wy,
                tx,
                ty,
                8,
                bs_angle_to(tx, ty, boss.target_x, boss.target_y),
                1.5f,
                1700);
        bs_hazard(HK_TELL, tx, ty, 0, 18, 0, 1700, 0);
    }
    return t >= 2500;
}
