#pragma once
// The winter signs' attacks, `t` ms after the creature has formed. Each returns
// true when it is done. Every shot and wall leaves from an emitter on the
// figure (data.h SIGN_EMIT). a hard dive, a big splash, two waves of stars out
// of it, the leap back
static bool bs_act_capricorn(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    float splash_x = p.u - 10, splash_y = 266;
    if (t < 350) {
        float u = t / 350.0f;
        p.x = p.u - 10 * u;
        p.y = p.v + u * u * 200;
    } else if (t < 1000) {
        p.y = p.v + 200;
    } else if (t < 1500) {
        float u = 1 - bs_span(t, 1000, 1500);
        p.y = p.v + 200 * (u * u * u);
    }
    if (bs_at(t, 0)) {
        bs_styled(bs_hazard(HK_TELL, splash_x, splash_y, 0, 24, 0, 1000, 0),
                  ZS_SPLASH);
    }
    static const unsigned FAN = 15;
    float pilot = bs_angle_to(splash_x, splash_y, boss.target_x, boss.target_y);
    if (bs_at(t, 360)) {
        BossHazard *h = bs_hazard(HK_ARC,
                                  splash_x,
                                  splash_y,
                                  -BOSS_PI / 2,
                                  BOSS_PI / 2 - .12f,
                                  160,
                                  640,
                                  0);
        if (h) {
            h->d = FAN;
        }
    }
    for (unsigned w = 0; w < 2; w++) {
        if (!bs_at(t, 1000 + w * 280)) {
            continue;
        }
        unsigned n = w ? FAN - 1 : FAN, gap = 0;
        float best = 9;
        for (unsigned k = 0; k < n; k++) {
            float a = BOSS_PI + .12f
                      + (BOSS_PI - .24f) * (k + (w ? .5f : 0)) / (FAN - 1);
            float off = fabsf(bs_wrap(a - pilot));
            if (off < best) {
                best = off;
                gap = k;
            }
        }
        for (unsigned k = 0; k < n; k++) {
            if (k == gap || (w && k == gap + 1)) {
                continue;
            }
            float a = BOSS_PI + .12f
                      + (BOSS_PI - .24f) * (k + (w ? .5f : 0)) / (FAN - 1);
            bs_shot_at(SF_PELLET, splash_x, splash_y, a, w ? 1.3f : 1.7f);
        }
    }
    return t >= 2000;
}
// a stream of droplets that hang where they land, fuse and burst
static bool bs_act_aquarius(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    float ux, uy;
    bs_emit(p, E_URN, ux, uy);
    float a = bs_angle_to(ux, uy, boss.target_x, boss.target_y);
    if (bs_at(t, 0)) {
        p.ang = a;
    }
    a = p.ang;
    if (bs_at(t, 0)) {
        bs_hazard(HK_ARC, ux, uy, a, .12f, 260, 600, 0);
    }
    unsigned ranged = 0;
    bs_signs_out(nullptr, &ranged);
    unsigned n = bs_density(ranged > 1 ? 8 : 12);
    for (unsigned k = 0; k < n; k++) {
        if (bs_at(t, 600 + k * 95)) {
            float reach = 70 + float((k * 53) % 5) * 34 + (k % 2) * 12;
            float wave = sinf(reach / 18 + k) * 12;
            float tx = ux + cosf(a) * reach - sinf(a) * wave,
                  ty = uy + sinf(a) * reach + cosf(a) * wave;
            bs_nova(ux, uy, tx, ty, 6, -10, 1.2f, 1750);
        }
    }
    return t >= 600 + n * 95 + 300;
}
// two passes: slip between the fish, then the cord fills the gap
static bool bs_act_pisces(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    (void)x;
    (void)y;
    if (!p.lead) {
        return false;
    }
    BossPart *q = p.link >= 0 ? &boss.parts[p.link] : nullptr;
    if (!q || !q->exists) {
        return true;
    }
    float part_y = bs_ease(bs_span(t, 2300, 2900));
    p.y = 40 + (96 - 40) * part_y;
    q->y = 230 + (176 - 230) * part_y;
    float fx = t < 2300 ? 220 + (30 - 220) * bs_ease(bs_span(t, 900, 2300))
                        : 30 + (360 - 30) * bs_ease(bs_span(t, 2700, 4300));
    p.x = fx;
    q->x = fx + 6;
    bool turned = t >= 2300;
    BossPart *fish[2] = {&p, q};
    p.r = q->r = turned ? 1 : -1; // the art faces right; r < 0 while they swim
                                  // left (drawn flipped)
    if (bs_at(t, 0)) {
        for (BossPart *f : fish) {
            bs_styled(
                    bs_hazard(HK_AIM, f->x - 30, f->y, BOSS_PI, 260, 0, 900, 0),
                    ZS_FISH);
        }
    }
    if (bs_at(t, 2300)) {
        for (BossPart *f : fish) {
            bs_styled(bs_hazard(HK_AIM, f->x + 30, f->y, 0, 300, 0, 700, 0),
                      ZS_FISH);
        }
    }
    if (bs_at(t, 2400)) {
        bs_keep(p,
                bs_styled(bs_hazard(HK_LANE, p.x, p.y, 0, 1, 3, 900, 1900),
                          ZS_CORD));
    }
    if (p.hz0 >= 0) {
        BossHazard& h = boss.hz[p.hz0];
        float back = turned ? -26.0f : 26.0f;
        if (h.active && h.kind == HK_LANE) {
            h.x = p.x + back;
            h.y = p.y;
            h.a = bs_angle_to(h.x, h.y, q->x + back, q->y);
            h.b = bs_dist(h.x, h.y, q->x + back, q->y);
        }
    }
    bool done = t >= 4300;
    if (done) {
        bs_sign_dissolve(*q);
    }
    return done;
    return true;
}
