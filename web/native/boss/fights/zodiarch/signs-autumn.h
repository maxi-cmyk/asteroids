#pragma once
// The autumn signs' attacks, `t` ms after the creature has formed. Each returns
// true when it is done. Every shot and wall leaves from an emitter on the
// figure (data.h SIGN_EMIT). tips the field toward the heavier pan; weights
// drop from the pans
static bool bs_act_libra(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    if (bs_at(t, 0) && !boss_assist_calm) {
        bs_keep(p,
                bs_hazard(HK_PULL,
                          240,
                          rock_random_bounded(2) ? 4 : 266,
                          0,
                          .45f,
                          0,
                          900,
                          2200));
    }
    for (unsigned k = 0; k < 5; k++) {
        if (bs_at(t, 900 + k * 300)) {
            float wx, wy;
            bs_emit(p, k % 2 ? E_PAN_FAR : E_PAN_NEAR, wx, wy);
            bs_shot_at(
                    SF_PELLET, wx, wy, BOSS_PI + (float(k) - 2) * .22f, 1.3f);
        }
    }
    return t >= 3200;
}
// everything from the stinger tip: a venom lash, then the sting itself
static bool bs_act_scorpio(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    float sx, sy;
    bs_emit(p, E_STING, sx, sy);
    if (bs_at(t, 0)) {
        float aim = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
        float a0 = aim - .5f, a1 = aim + .5f;
        if (boss.target_y > sy) {
            float swap = a0;
            a0 = a1;
            a1 = swap;
        }
        BossHazard *h
                = bs_keep(p, bs_hazard(HK_ARM, sx, sy, a0, 230, a0, 900, 800));
        if (h) {
            h->e = a1;
            h->d = (a1 - a0) / (800.0f / FRAME_TIME_MS);
        }
    }
    if (bs_at(t, 1700)) {
        bs_hazard(HK_AIM,
                  sx,
                  sy,
                  bs_angle_to(sx, sy, boss.target_x, boss.target_y),
                  120,
                  0,
                  700,
                  0);
    }
    if (bs_at(t, 2400)) {
        BossShot *s
                = bs_shot_at(SF_MISSILE,
                             sx,
                             sy,
                             bs_angle_to(sx, sy, boss.target_x, boss.target_y),
                             1.4f,
                             2,
                             4000);
        if (s) {
            s->turn = .035f;
        }
    }
    return t >= 2700;
}
// three aim lines from the arrowhead, then two volleys down them
static bool bs_act_sagittarius(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    float ax, ay;
    bs_emit(p, E_ARROW, ax, ay);
    if (bs_at(t, 0)) {
        p.ang = bs_angle_to(ax, ay, boss.target_x, boss.target_y);
        for (int k = -1; k <= 1; k++) {
            bs_hazard(HK_AIM, ax, ay, p.ang + k * .18f, 480, 0, 900, 0);
        }
    }
    for (unsigned v = 0; v < 2; v++) {
        if (bs_at(t, 900 + v * 140)) {
            for (int k = -1; k <= 1; k++) {
                bs_shot_at(SF_FAST, ax, ay, p.ang + k * .18f, 2.6f);
            }
        }
    }
    return t >= 1500;
}
