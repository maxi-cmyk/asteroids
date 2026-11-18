#pragma once
// ================================================================ NINEFOLD
// A fox of the rift, star-filled like its master, with nine tails fanned behind
// it. Every hit on a tail reaches the fox; as its health falls the tails come
// away one by one (the tails left are its health bar). Losing a tail, or seeing
// through an illusion, opens the forehead mark (the core) for 2.5 s. It fires
// comets from its tails, sends foxfire, splits into illusions and blinks across
// the field.
enum {
    AUX_FOX_CLOCK = 0,
    AUX_FOX_BLINK = 1,
    AUX_FOX_OPEN = 2,
    AUX_FOX_TAILS = 3,
    AUX_FOX_ILLUSION = 4,
    AUX_FOX_SCALE = 5
};
enum {
    STAMP_FOX_BLINK_UNTIL = 3,
    STAMP_FOX_OPEN_UNTIL = 4
};
// Offsets from the fox's frame centre (zodiac_art.fox_geometry).
static const float FOX_TAIL[9][2] = {{-18, -22},
                                     {-2, -27},
                                     {15, -28},
                                     {31, -24},
                                     {45, -16},
                                     {56, -5},
                                     {63, 8},
                                     {65, 23},
                                     {63, 38}};
static const float FOX_HEAD[3] = {-35, -40, 17}, FOX_MARK[2] = {-33, -54},
                   FOX_BODY[3] = {-19, 22, 30};
static const BossRow SEQ_FOX[]
        = {{4, NA_COMETS, NA_FOXFIRE, NA_ILLUSION, NA_BLINK}};
// Tail sway (zodiac_art.py FOX_BEND_*): a wave runs across the fan every 2.4 s;
// a tail bent `b` steps turns about its root by about b * .035 rad where its
// hit point sits.
static const float FOX_TAIL_BASE[2] = {-1, 30}, FOX_SWAY_PERIOD = 2.4f,
                   FOX_SWAY_RAD = .035f;
// An illusion: three foxes drawn at .6 size, spread so none overlaps another
// much or leaves the screen; the real one takes one of the three places.
static const float FOX_ILLUSION_SCALE = .6f;
static const float FOX_ILLUSION_AT[3][2] = {{330, 54}, {404, 135}, {330, 216}};

static float bs_fox_scale() {
    return boss.aux[AUX_FOX_SCALE] > 0 ? boss.aux[AUX_FOX_SCALE] : 1.0f;
}
static float bs_fox_bend(unsigned i) {
    return 2.0f
           * sinf(TWO_PI * boss.aux[AUX_FOX_CLOCK] / FOX_SWAY_PERIOD
                  - i * .55f);
}
// Where tail i's hit point sits this tick, around a fox centred at (x, y) drawn
// at scale s.
static void
bs_fox_tail_at(unsigned i, float x, float y, float s, float& ox, float& oy) {
    float a = bs_fox_bend(i) * FOX_SWAY_RAD, c = cosf(a), n = sinf(a);
    float dx = FOX_TAIL[i][0] - FOX_TAIL_BASE[0],
          dy = FOX_TAIL[i][1] - FOX_TAIL_BASE[1];
    ox = x + (FOX_TAIL_BASE[0] + dx * c - dy * n) * s;
    oy = y + (FOX_TAIL_BASE[1] + dx * n + dy * c) * s;
}

static unsigned bs_fox_tails() {
    unsigned n = 0;
    for (unsigned i = 0; i < 9; i++) {
        n += boss.parts[i].exists && boss.parts[i].kind == PK_TAIL;
    }
    return n;
}
static bool bs_fox_open() {
    return boss.kind == BK_LENSIMP
           && game_ms < boss.stamp[STAMP_FOX_OPEN_UNTIL];
}
static bool bs_blinking() {
    return boss.kind == BK_LENSIMP && boss.stamp[STAMP_FOX_BLINK_UNTIL]
           && game_ms < boss.stamp[STAMP_FOX_BLINK_UNTIL];
}
static void bs_fox_begin() {
    for (unsigned i = 0; i < 9; i++) {
        BossPart& p = boss.parts[i];
        p = {};
        p.exists = true;
        p.kind = PK_TAIL;
        p.slot = i;
        p.r = 10;
    }
    boss.aux[AUX_FOX_SCALE] = 1;
}
static void bs_fox_open_core() {
    boss.stamp[STAMP_FOX_OPEN_UNTIL] = game_ms + 2500;
}
static void bs_fox_update() {
    boss.aux[AUX_FOX_CLOCK] += FRAME_TIME_MS / 1000.0f;
    const float s = bs_fox_scale();
    for (unsigned i = 0; i < 9; i++) {
        bs_fox_tail_at(i, boss.x, boss.y, s, boss.parts[i].x, boss.parts[i].y);
    }
    // Illusion decoys glide out from the fox to their places rather than
    // popping in.
    for (unsigned i = 9; i < BOSS_PARTS; i++) {
        BossPart& p = boss.parts[i];
        if (!p.exists || p.kind != PK_DECOY) {
            continue;
        }
        p.x += (p.u - p.x) * .18f;
        p.y += (p.v - p.y) * .18f;
    }
    // Health is the tail count: shed tails (outermost first) down to ceil(9 *
    // health / max).
    unsigned want
            = boss.maximum ? (9 * boss.health + boss.maximum - 1) / boss.maximum
                           : 9;
    for (int i = 8; i >= 0 && bs_fox_tails() > want; i--) {
        BossPart& p = boss.parts[i];
        if (!p.exists) {
            continue;
        }
        p.exists = false;
        bs_particles(p.x, p.y);
        bs_fox_open_core();
        display_shake(1);
    }
    boss.aux[AUX_FOX_TAILS] = float(bs_fox_tails());
    boss.aux[AUX_FOX_OPEN] = bs_fox_open() ? 1.0f : 0.0f;
    boss.aux[AUX_FOX_BLINK] = bs_blinking() ? 1.0f : 0.0f;
    unsigned decoys = 0;
    for (unsigned i = 9; i < BOSS_PARTS; i++) {
        decoys += boss.parts[i].exists && boss.parts[i].kind == PK_DECOY;
    }
    boss.aux[AUX_FOX_ILLUSION] = float(decoys);
}
// A height for the blink that keeps the whole fox on screen (ears to paws:
// -80..+74).
static float bs_fox_free_y(float avoid) {
    float y = bs_rand(88, 192);
    if (fabsf(y - avoid) < 45) {
        y = y < 140 ? y + 55 : y - 55;
    }
    return bs_clamp(y, 88, 192);
}
static bool bs_fox_run(int id, unsigned long t) {
    float x = boss.x, y = boss.y;
    switch (id) {
    case NA_COMETS: { // the tails flick comets down aim lines; fewer tails,
                      // fewer but faster
        unsigned tails = bs_fox_tails();
        unsigned n = bs_max(2, (tails + 1) / 2);
        float speed = 1.8f + (9 - tails) * .12f;
        for (unsigned k = 0; k < n; k++) {
            unsigned i = (k * 9 / n) % 9;
            float sx, sy;
            bs_fox_tail_at(i, x, y, bs_fox_scale(), sx, sy);
            sx += 10 * bs_fox_scale();
            sy -= 6 * bs_fox_scale();
            if (bs_at(t, k * 150)) {
                float a = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
                BossHazard *h = bs_hazard(HK_AIM, sx, sy, a, 480, 0, 500, 0);
                if (h) {
                    h->d = k;
                }
            }
            if (bs_at(t, k * 150 + 500)) {
                for (const BossHazard& h : boss.hz) {
                    if (h.active && h.kind == HK_AIM && h.d == k
                        && h.warn_left <= FRAME_TIME_MS) {
                        bs_shot_at(SF_FAST, h.x, h.y, h.a, speed);
                        break;
                    }
                }
            }
        }
        return t >= n * 150 + 700;
    }
    case NA_FOXFIRE: // three slow wisps that home in; two hits put one out
        for (unsigned k = 0; k < 3; k++) {
            if (bs_at(t, k * 400)) {
                float a = BOSS_PI + (k - 1.0f) * .9f;
                float k2 = bs_fox_scale();
                float sx = x + (FOX_HEAD[0] + cosf(a) * 24) * k2,
                      sy = y + (FOX_HEAD[1] + 40 + sinf(a) * 24) * k2;
                BossShot *s = bs_shot_at(SF_MISSILE, sx, sy, a, 1.4f, 2, 3600);
                if (s) {
                    s->turn = .03f;
                }
            }
        }
        return t >= 1600;
    case NA_ILLUSION: { // it shrinks into three foxes; only the real one has
                        // lit eyes. Pop both decoys to see through it
        const BossOps& o = bs_ops();
        if (bs_at(t, 0)) {
            bs_hazard(HK_TELL, x, y, 0, 90, 0, 600, 0);
        }
        if (bs_at(t, 600)) {
            boss.aux[AUX_FOX_SCALE] = FOX_ILLUSION_SCALE;
            unsigned real = rock_random_bounded(3);
            boss.scratch[1] = float(real);
            for (unsigned k = 0; k < 3; k++) {
                if (k == real) {
                    continue;
                }
                BossPart *p = nullptr;
                for (unsigned i = 9; i < BOSS_PARTS; i++) {
                    if (!boss.parts[i].exists) {
                        p = &boss.parts[i];
                        break;
                    }
                }
                if (!p) {
                    continue;
                }
                *p = {};
                p->exists = true;
                p->kind = PK_DECOY;
                p->slot = k;
                p->hp = p->hp_max = 2;
                p->x = boss.x;
                p->y = boss.y;
                p->r = 16;
                p->u = FOX_ILLUSION_AT[k][0];
                p->v = FOX_ILLUSION_AT[k][1];
            }
            boss.scratch[0] = 1; // illusion up and not yet seen through
        }
        if (t > 600 && t < 3600) { // the real fox glides to its own place
            unsigned real = unsigned(boss.scratch[1]);
            boss.home_x += (FOX_ILLUSION_AT[real][0] - boss.home_x) * .18f;
            boss.home_y += (FOX_ILLUSION_AT[real][1] - boss.home_y) * .18f;
        }
        if (bs_at(t, 1400)) {
            for (unsigned i = 9; i < BOSS_PARTS; i++) {
                BossPart& p = boss.parts[i];
                if (!p.exists || p.kind != PK_DECOY) {
                    continue;
                }
                float hx = p.x + FOX_HEAD[0] * FOX_ILLUSION_SCALE,
                      hy = p.y + FOX_HEAD[1] * FOX_ILLUSION_SCALE;
                bs_hazard(HK_AIM,
                          hx,
                          hy,
                          bs_angle_to(hx, hy, boss.target_x, boss.target_y),
                          480,
                          0,
                          500,
                          0);
            }
        }
        if (bs_at(t, 1900)) {
            for (const BossHazard& h : boss.hz) {
                if (h.active && h.kind == HK_AIM
                    && h.warn_left <= FRAME_TIME_MS) {
                    bs_shot_at(SF_NEEDLE, h.x, h.y, h.a, 2.2f);
                }
            }
        }
        unsigned left = 0;
        for (unsigned i = 9; i < BOSS_PARTS; i++) {
            left += boss.parts[i].exists && boss.parts[i].kind == PK_DECOY;
        }
        if (t > 600 && !left
            && boss.scratch[0] > .5f) { // both popped: seen through
            boss.scratch[0] = 0;
            bs_fox_open_core();
        }
        if (bs_at(t, 3600)) {
            for (unsigned i = 9; i < BOSS_PARTS; i++) {
                if (boss.parts[i].kind == PK_DECOY) {
                    boss.parts[i].exists = false;
                }
            }
        }
        if (t >= 3600) { // back to its own place, then full size again
            boss.home_x += (o.home_x - boss.home_x) * .2f;
            boss.home_y += (o.home_y - boss.home_y) * .2f;
        }
        if (t >= 4000) {
            boss.aux[AUX_FOX_SCALE] = 1;
            return true;
        }
        return false;
    }
    case NA_BLINK: // a shimmer, then it is gone and back at another height
        if (bs_at(t, 0)) {
            bs_hazard(HK_TELL, x, y, 0, 80, 0, 500, 0);
            boss.stamp[STAMP_FOX_BLINK_UNTIL] = game_ms + 1000;
        }
        if (bs_at(t, 500)) {
            float ny = bs_fox_free_y(boss.home_y);
            boss.home_y = ny;
            boss.y = ny;
        }
        return t >= 1100;
    }
    return true;
}
static int bs_fox_pick() {
    return bs_seq_pick(SEQ_FOX, 1);
}
static void bs_fox_circles() {
    if (bs_blinking()) {
        return;
    }
    const float s = bs_fox_scale();
    for (unsigned i = 0; i < 9; i++) {
        if (boss.parts[i].exists) {
            bs_circle(boss.parts[i].x, boss.parts[i].y, 10 * s, BC_PART, i, 3);
        }
    }
    // The forehead mark: open after a lost tail or a solved illusion; the laser
    // always reaches it.
    bs_circle(boss.x + FOX_MARK[0] * s,
              boss.y + FOX_MARK[1] * s,
              8 * s + 2 * (1 - s),
              BC_CORE,
              0,
              bs_fox_open() ? 3 : 2);
    // The body and head do not soak shots: the tails fanned behind them stay
    // reachable.
    for (unsigned i = 9; i < BOSS_PARTS; i++) {
        if (boss.parts[i].exists && boss.parts[i].kind == PK_DECOY) {
            bs_circle(boss.parts[i].x + FOX_BODY[0] * FOX_ILLUSION_SCALE,
                      boss.parts[i].y + FOX_BODY[1] * FOX_ILLUSION_SCALE,
                      26 * FOX_ILLUSION_SCALE,
                      BC_PART,
                      i,
                      3);
        }
    }
}
static unsigned bs_fox_body(float *out) {
    unsigned n = 0;
    if (bs_blinking()) {
        return 0;
    }
    const float s = bs_fox_scale();
    bs_guard_body(out,
                  n,
                  boss.x + FOX_BODY[0] * s,
                  boss.y + FOX_BODY[1] * s,
                  FOX_BODY[2] * s);
    bs_guard_body(out,
                  n,
                  boss.x + FOX_HEAD[0] * s,
                  boss.y + FOX_HEAD[1] * s,
                  FOX_HEAD[2] * s);
    return n;
}
static void
bs_fox_hit(BossPart& p, unsigned owner, unsigned damage, bool laser) {
    if (p.kind == PK_TAIL) { // a tail hit reaches the fox; the tail falls with
                             // its health
        bs_damage(owner, laser ? damage * bs_ops().k : damage);
        boss.flash_until = game_ms + 80;
        return;
    }
    if (p.kind == PK_DECOY) {
        unsigned hurt = laser ? p.hp : damage;
        p.hp = hurt >= (unsigned)p.hp ? 0 : p.hp - hurt;
        if (p.hp <= 0) {
            p.exists = false;
            bs_particles(p.x, p.y);
        }
    }
}
