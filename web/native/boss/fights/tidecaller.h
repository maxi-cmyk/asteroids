#pragma once
// Tidecaller and Moonjelly

// Slots of boss.aux and boss.stamp.
enum {
    AUX_TIDE_CLOCK = 0,   // seconds since the entrance, drives the swim
    AUX_TIDE_EXPOSED = 2, // 1 once no bubble guards the bell
    AUX_TIDE_SQUEEZE = 3, // 0..1: the bell contracting (each pulse's thrust)
    AUX_TIDE_LEAN = 4,    // it leans toward where it swims
    AUX_TIDE_RIM = 5,     // 0..1: light running along the bell before a stream
    AUX_TIDE_RIM_TO = 6   // where on the bell that stream starts (angle)
};
// Slots of boss.scratch, this attack's own random choices (shared with the
// Horizon Warden, which borrows these attacks, so they never live in boss.aux).
enum {
    SCR_TIDE_MUZZLE = 0, // this stream's muzzle height, relative to the bell
    SCR_TIDE_TILT = 1,   // this stream's aim error in radians
    SCR_TIDE_SEED = 2,   // random seed for the stream's uneven rhythm
    SCR_TIDE_GAP = 3
}; // 3..5: where each tidal wall's gap is
enum {
    AUX_JELLY_CLOCK = 0,
    AUX_JELLY_SQUEEZE = 1,
    AUX_JELLY_LEAN = 2
};
enum {
    STAMP_TIDE_BARE_SINCE
            = 0, // when the last bubble popped (0 = bubbles stand)
    STAMP_TIDE_REFORMED = 2
}; // the bubbles reformed once already

// ================================================================ TIDECALLER /
// MOONJELLY Faster, wider and less predictable than the bosses before it: the
// streams wander over the whole bell, and three attacks (a wall of pellets with
// a random gap, spores raining from the top, and whirlpools that open anywhere)
// come on top of the old kit.
static const BossRow SEQ_TIDE[]
        = {{4, TA_SINE, TA_RAIN, TA_SINE, TA_WALL},
           {6, TA_SINE, TA_TENDRIL, TA_WALL, TA_RAIN, TA_SPORE, TA_WHIRL},
           {7,
            TA_SINE,
            TA_TENDRIL,
            TA_WALL,
            TA_WHIRL,
            TA_PULSE,
            TA_RAIN,
            TA_SPORE}};
static const BossRow SEQ_MOONJELLY[] = {{1, MA_SINE6}};
// It swims in pulses (nextSteps.md P4.5): contract (300 ms, the thrust), glide
// (700 ms), relax (600 ms), from one stop to the next around its rest point.
static const unsigned long TIDE_PULSE = 1600;
static const float TIDE_STOPS[5][2]
        = {{0, 4}, {-26, -18}, {16, -10}, {-12, 26}, {24, 16}};
static float bs_tide_ease(float u) {
    u = bs_clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
}
// Where a swim on TIDE_STOPS (scaled by `k`) has the bell `ms` in: offset from
// the rest point, lean and squeeze.
static void bs_tide_swim(
        float ms, float k, float& dx, float& dy, float& lean, float& squeeze) {
    unsigned n = unsigned(ms / TIDE_PULSE);
    float u = (ms - n * float(TIDE_PULSE));
    const float *a = TIDE_STOPS[n % 5], *b = TIDE_STOPS[(n + 1) % 5];
    float moved;
    if (u < 300) {
        squeeze = bs_tide_ease(u / 300);
        moved = .35f * squeeze;
    } else if (u < 1000) {
        squeeze = 1 - bs_tide_ease((u - 300) / 700) * .7f;
        moved = .35f + .6f * sinf((u - 300) / 700 * BOSS_PI / 2);
    } else {
        squeeze = .3f * (1 - (u - 1000) / 600);
        moved = .95f + .05f * bs_clamp((u - 1000) / 600, 0, 1);
    }
    dx = k * (a[0] + (b[0] - a[0]) * moved);
    dy = k * (a[1] + (b[1] - a[1]) * moved);
    lean = bs_clamp((b[0] - a[0]) / 140, -.35f, .35f);
}
// Each bubble wanders its own way round the bell (rad/s across, down, phase).
static const float TIDE_WANDER[3][3]
        = {{1.3f, 1.7f, 0}, {1.1f, 2.1f, 2.1f}, {1.6f, 1.2f, 4.2f}};
static unsigned bs_bubbles() {
    unsigned n = 0;
    for (unsigned i = 0; i < 3; i++) {
        n += boss.parts[i].exists;
    }
    return n;
}
static void bs_tide_begin() {
    for (unsigned i = 0; i < 3; i++) {
        BossPart& p = boss.parts[i];
        p = {};
        p.exists = true;
        p.kind = PK_BUBBLE;
        p.slot = i;
        p.hp = p.hp_max = 2;
        p.r = 14;
    }
}
static void bs_tide_update() {
    boss.aux[AUX_TIDE_CLOCK] += FRAME_TIME_MS / 1000.0f;
    float clock = boss.aux[AUX_TIDE_CLOCK];
    float dx, dy, lean, squeeze;
    bs_tide_swim(clock * 1000, 1, dx, dy, lean, squeeze);
    boss.x = boss.home_x + dx;
    boss.y = boss.home_y + dy;
    boss.aux[AUX_TIDE_LEAN] += (lean - boss.aux[AUX_TIDE_LEAN]) * .08f;
    boss.aux[AUX_TIDE_SQUEEZE] = squeeze;
    boss.aux[AUX_TIDE_EXPOSED] = bs_bubbles() ? 0.0f : 1.0f;
    // Bioluminescence: before a stream, light runs along the bell to where it
    // will start.
    unsigned long t = boss.atk ? bs_since(boss.atk_t0) : 0;
    if (boss.atk == TA_SINE && t < 600) {
        float mx = boss.x - 78, my = boss.y + 4 + boss.scratch[SCR_TIDE_MUZZLE];
        boss.aux[AUX_TIDE_RIM] = t / 600.0f;
        boss.aux[AUX_TIDE_RIM_TO] = bs_atan2(my - (boss.y - 37), mx - boss.x);
    } else {
        boss.aux[AUX_TIDE_RIM] = 0;
    }
    // The bubbles drift in front of the bell, each its own way, guarding it;
    // a shot pushes one outward, away from the bell (p.u, p.v), and it drifts
    // back in.
    for (unsigned i = 0; i < 3; i++) {
        BossPart& p = boss.parts[i];
        const float *w = TIDE_WANDER[i];
        p.u *= .97f;
        p.v *= .97f;
        p.x = boss.x - 70 + cosf(clock * w[0] + w[2]) * 48
              + sinf(clock * w[1] * .7f) * 12 + p.u;
        p.y = bs_clamp(
                boss.y - 30 + sinf(clock * w[1] + w[2]) * 70 + p.v, 18, 252);
    }
    if (boss.phase && !bs_bubbles()) {
        if (!boss.stamp[STAMP_TIDE_BARE_SINCE]) {
            boss.stamp[STAMP_TIDE_BARE_SINCE] = game_ms;
        } else if (!boss.stamp[STAMP_TIDE_REFORMED]
                   && bs_since(boss.stamp[STAMP_TIDE_BARE_SINCE]) >= 3000) {
            for (unsigned i = 0; i < 3; i++) {
                boss.parts[i].exists = true;
                boss.parts[i].hp = 2;
                boss.parts[i].u = boss.parts[i].v = 0;
            }
            boss.stamp[STAMP_TIDE_REFORMED] = 1; // bubbles reform once
            boss.stamp[STAMP_TIDE_BARE_SINCE] = 0;
        }
    }
}
static void bs_sine_column(float mx,
                           float my,
                           float ang,
                           float phase,
                           float speed = 1.8f,
                           float amp = 24) {
    BossShot *s = bs_shot_at(SF_SINE, mx, my, ang, speed);
    if (s) {
        s->amp = amp;
        s->phase = phase;
    }
}
// A repeatable pseudo-random 0..1 for column k of a stream, from the stream's
// own seed.
static float bs_tide_noise(unsigned k, unsigned salt) {
    unsigned h = (unsigned)boss.scratch[SCR_TIDE_SEED] * 2654435761u
                 + k * 40503u + salt * 9973u;
    h ^= h >> 15;
    h *= 2246822519u;
    h ^= h >> 13;
    return (h % 1000) / 1000.0f;
}
static bool bs_tide_run(int id, unsigned long t) {
    switch (id) {
    case TA_SINE:
    case MA_SINE6: {
        bool mini = id == MA_SINE6;
        if (!mini && bs_at(t, 0)) {
            boss.scratch[SCR_TIDE_MUZZLE] = bs_rand(-62, 62);
            boss.scratch[SCR_TIDE_TILT] = bs_rand(-.16f, .16f);
            boss.scratch[SCR_TIDE_SEED] = float(1 + rock_random_bounded(60000));
        }
        float mx = boss.x - (mini ? 50 : 78),
              my = boss.y + (mini ? 10 : 4 + boss.scratch[SCR_TIDE_MUZZLE]);
        float ang = bs_angle_to(mx, my, boss.target_x, boss.target_y)
                    + (mini ? 0.0f : boss.scratch[SCR_TIDE_TILT]);
        unsigned n = mini ? 6 : bs_density(boss.phase >= 2 ? 16 : 13);
        unsigned long gap = mini ? 140 : 88;
        if (bs_at(t, 0)) {
            bs_hazard(HK_ARC, mx, my, ang, mini ? .12f : .3f, 260, 600, 0);
        }
        unsigned long at = 600;
        for (unsigned k = 0; k < n; k++) {
            if (bs_at(t, at)) {
                if (mini) {
                    bs_sine_column(mx, my, ang, 0);
                } else {
                    // Each column leaves from a slightly different height,
                    // speed and bearing.
                    float cy = my + (bs_tide_noise(k, 1) - .5f) * 40,
                          ca = ang + (bs_tide_noise(k, 2) - .5f) * .22f;
                    float speed = 1.6f + bs_tide_noise(k, 3) * .6f,
                          amp = 18 + bs_tide_noise(k, 4) * 14;
                    bs_sine_column(mx, cy, ca, 0, speed, amp);
                    if (boss.phase >= 2) {
                        bs_sine_column(mx, cy, ca, BOSS_PI, speed, amp);
                    }
                }
            }
            at += mini ? gap
                       : gap - 20 + (unsigned long)(bs_tide_noise(k, 5) * 50);
        }
        return t >= at + 100;
    }
    case TA_TENDRIL:
        if (bs_at(t, 0)) {
            float px = boss.x - 90;
            BossHazard *a = bs_hazard(HK_ARM,
                                      px,
                                      boss.y - 48,
                                      BOSS_PI + 1.3f,
                                      190,
                                      BOSS_PI + 1.3f,
                                      900,
                                      3272);
            if (a) {
                a->d = -.016f;
                a->e = BOSS_PI - 1.3f;
            }
            BossHazard *b = bs_hazard(HK_ARM,
                                      px,
                                      boss.y + 50,
                                      BOSS_PI - 1.3f,
                                      190,
                                      BOSS_PI - 1.3f,
                                      900,
                                      3272);
            if (b) {
                b->d = .016f;
                b->e = BOSS_PI + 1.3f;
            }
        }
        return t >= 900 + 3272 + 100;
    case TA_SPORE: {
        unsigned n = boss.phase <= 2 ? 1 : 2;
        for (unsigned k = 0; k < n; k++) {
            if (bs_at(t, 300 + k * 600)) {
                float sx = boss.x - 90, sy = boss.y - 10 + k * 20;
                float px = boss.target_x, py = boss.target_y;
                if (k) {
                    bs_nearest(sx, sy, px, py);
                }
                bs_shot_at(SF_SPORE,
                           sx,
                           sy,
                           bs_angle_to(sx, sy, px, py),
                           1.0f,
                           1,
                           2000);
            }
        }
        return t >= 300 + n * 600 + 400;
    }
    case TA_PULSE:
        if (bs_at(t, 0)) {
            float gap
                    = bs_angle_to(boss.x, boss.y, boss.target_x, boss.target_y)
                      + (boss.cycle % 2 ? .8f : -.8f);
            BossHazard *h = bs_hazard(
                    HK_RING, boss.x, boss.y - 37, gap, 66, .52f, 700, 4000);
            if (h) {
                h->d = 2.0f;
                h->e = 0;
            }
            bs_hazard(HK_TELL, boss.x, boss.y - 37, 0, 90, 0, 700, 0);
        }
        return t >= 800;
    case TA_WALL: {
        // A wall of pellets across the whole field with one gap. Two lines mark
        // each gap 700 ms before its wall leaves; every gap is somewhere new.
        unsigned walls = boss.phase >= 3 ? 3 : 2;
        for (unsigned w = 0; w < walls; w++) {
            unsigned long t0 = w * 1100;
            float& gapy = boss.scratch[SCR_TIDE_GAP + w];
            if (bs_at(t, t0)) {
                gapy = bs_rand(64, 206);
                bs_hazard(HK_AIM,
                          boss.x - 100,
                          gapy - 34,
                          BOSS_PI,
                          330,
                          0,
                          700,
                          0);
                bs_hazard(HK_AIM,
                          boss.x - 100,
                          gapy + 34,
                          BOSS_PI,
                          330,
                          0,
                          700,
                          0);
            }
            if (bs_at(t, t0 + 700)) {
                unsigned n = bs_density(17);
                for (unsigned i = 0; i < n; i++) {
                    float y = 12 + i * (246.0f / (n - 1));
                    if (fabsf(y - gapy) < 34) {
                        continue;
                    }
                    bs_shot_at(SF_PELLET, boss.x - 100, y, BOSS_PI, 1.45f);
                }
            }
        }
        return t >= walls * 1100 + 800;
    }
    case TA_RAIN: {
        // Spores fall from the top at random columns and burst into needles;
        // they can be shot early.
        unsigned n = bs_density(boss.phase >= 3 ? 7 : 5);
        for (unsigned k = 0; k < n; k++) {
            if (bs_at(t, 300 + k * 380)) {
                bs_shot(SF_SPORE,
                        bs_rand(70, 330),
                        -6,
                        bs_rand(-.1f, .1f),
                        1.15f,
                        1,
                        2300);
            }
        }
        return t >= 300 + n * 380 + 600;
    }
    case TA_WHIRL: {
        // Two whirlpools open anywhere but on the pilot: closing rings with a
        // turning gap.
        for (unsigned k = 0; k < 2; k++) {
            if (bs_at(t, k * 500)) {
                float rx = 200, ry = 135;
                for (unsigned tries = 0; tries < 30; tries++) {
                    rx = bs_rand(110, 330);
                    ry = bs_rand(60, 210);
                    bool ok = true;
                    for (unsigned p = 0; p < boss_hull_n; p++) {
                        if (bs_alive(p)
                            && bs_dist(rx,
                                       ry,
                                       boss_hulls[p]->position_x,
                                       boss_hulls[p]->position_y)
                                       < 105) {
                            ok = false;
                        }
                    }
                    for (const BossHazard& h : boss.hz) {
                        if (h.active && h.kind == HK_RING
                            && bs_dist(rx, ry, h.x, h.y) < 110) {
                            ok = false;
                        }
                    }
                    if (ok) {
                        break;
                    }
                }
                BossHazard *h = bs_hazard(HK_RING,
                                          rx,
                                          ry,
                                          bs_rand(-3.0f, 3.0f),
                                          76,
                                          .62f,
                                          1100,
                                          3400);
                if (h) {
                    h->d = -.22f;
                    h->e = k ? -.015f : .015f;
                }
                bs_hazard(HK_TELL, rx, ry, 0, 86, 0, 1100, 0);
            }
        }
        return t >= 500 + 1100 + 3400 + 100;
    }
    }
    return true;
}

static int bs_tide_pick() {
    return bs_seq_pick(SEQ_TIDE, 3);
}
static int bs_moonjelly_pick() {
    return MA_SINE6;
}
static void bs_moonjelly_update() {
    boss.aux[AUX_JELLY_CLOCK] += FRAME_TIME_MS / 1000.0f;
    float dx, dy, lean, squeeze;
    bs_tide_swim(
            boss.aux[AUX_JELLY_CLOCK] * 1000 + 400, .8f, dx, dy, lean, squeeze);
    boss.x = boss.home_x + dx;
    boss.y = boss.home_y + dy;
    boss.aux[AUX_JELLY_LEAN] += (lean - boss.aux[AUX_JELLY_LEAN]) * .08f;
    boss.aux[AUX_JELLY_SQUEEZE] = squeeze;
}
static void bs_tide_circles() {
    for (unsigned i = 0; i < 3; i++) {
        if (boss.parts[i].exists) {
            bs_circle(boss.parts[i].x, boss.parts[i].y, 14, BC_PART, i, 3);
        }
    }
    if (bs_bubbles()) {
        bs_circle(boss.x, boss.y - 37, 72, BC_BLOCK, 0, 1);
        bs_circle(boss.x, boss.y - 37, 72, BC_CORE, 0, 2);
    } else {
        bs_circle(boss.x, boss.y - 37, 72, BC_CORE, 0, 3);
    }
}
static void bs_moonjelly_circles() {
    bs_circle(boss.x, boss.y - 25, 44, BC_CORE, 0, 3);
}
static unsigned bs_tide_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y - 37, 74);
    return n;
}
static unsigned bs_moonjelly_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y - 25, 46);
    return n;
}
static void bs_pop_bubbles() {
    for (unsigned i = 0; i < 3; i++) {
        if (boss.parts[i].exists) {
            boss.parts[i].exists = false;
            bs_particles(boss.parts[i].x, boss.parts[i].y);
        }
    }
}
// A laser through the bell pops every bubble guarding it.
static unsigned bs_tide_soak(unsigned damage, bool laser) {
    if (laser) {
        bs_pop_bubbles();
    }
    return damage;
}
static void bs_tide_hit(BossPart& p, unsigned, unsigned damage, bool laser) {
    if (laser) {
        bs_pop_bubbles();
        return;
    }
    p.hp = damage >= (unsigned)p.hp ? 0 : p.hp - damage;
    if (p.hp <= 0) {
        p.exists = false;
        bs_particles(p.x, p.y);
    } else {
        // Pushed outward, away from the bell: it stays in front of you.
        float dx = p.x - boss.x, dy = p.y - (boss.y - 37);
        float len = bs_max(1.0f, sqrtf(dx * dx + dy * dy));
        p.u = bs_clamp(p.u + dx / len * 36, -60, 60);
        p.v = bs_clamp(p.v + dy / len * 36, -60, 60);
    }
}
static const BossOps OPS_TIDECALLER = {356,
                                       142,
                                       5,
                                       3,
                                       {70, 35},
                                       {800, 700, 520},
                                       bs_tide_begin,
                                       bs_tide_update,
                                       bs_tide_pick,
                                       bs_tide_run,
                                       bs_tide_circles,
                                       bs_tide_body,
                                       nullptr,
                                       bs_tide_soak,
                                       bs_tide_hit};
static const BossOps OPS_MOONJELLY = {380,
                                      140,
                                      8,
                                      1,
                                      {0, 0},
                                      {1300, 1300, 1300},
                                      nullptr,
                                      bs_moonjelly_update,
                                      bs_moonjelly_pick,
                                      bs_tide_run,
                                      bs_moonjelly_circles,
                                      bs_moonjelly_body,
                                      nullptr,
                                      nullptr,
                                      nullptr};
