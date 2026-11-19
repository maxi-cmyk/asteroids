#pragma once
// Cinderforge and Cinderling

// Slots of boss.aux.
enum {
    AUX_FORGE_HEAT = 0,   // 0..1: the glow, lamps lit over five (eases)
    AUX_FORGE_OPEN = 1,   // 0..1: the chest doors open (the core can be shot)
    AUX_FORGE_BREATH = 2, // 0..1: the bellows' fill
    AUX_FORGE_HAMMER = 3, // the hammer arm's angle (0 hangs down, PI/2 at you)
    AUX_FORGE_LADLE = 4,  // the ladle arm's angle (the same sense, far side)
    AUX_FORGE_CORE = 5,   // 0 cool .. 2 white-hot
    AUX_FORGE_STEAM = 6,  // 0..1: steam from the shoulders and chimney
    AUX_FORGE_LAMPS = 7,  // heat lamps lit, 0..5
    AUX_FORGE_LIT = 8,    // 1 once this attack has lit its lamp
    AUX_FORGE_FLAME = 9   // 1 while its flame is driven into the floor
};
enum {
    AUX_CINDER_GLOW = 0,
    AUX_CINDER_OPEN = 1
}; // the mini's glow and open flag
enum {
    STAMP_FORGE_OPEN_UNTIL = 0
}; // the Cinderling: game_ms until which its shell stays open

// ================================================================ CINDERFORGE
// The furnace golem (nextSteps.md P4.3). Every attack lights a heat lamp on its
// belt (600 ms in); at five it must vent: its chest doors burst open, a ring of
// heat with one gap rolls out, and the core is bare for 3 s while it cools.
// Otherwise shots glance off the shell (the laser reaches the core at half).
// Its attacks come from parts you can see: the bellows blast, the hammer arm's
// anvil strikes, the ladle's lob (three at once from phase 3), and geysers it
// drives along the floor with its flame. Fire stays: pools and geysers leave
// scorched ground (see bs_scorch).
static const BossRow SEQ_FORGE[]
        = {{3, CA_LOB, CA_EMBER, CA_HAMMER},
           {4, CA_LOB, CA_GEYSER, CA_HAMMER, CA_EMBER},
           {4, CA_BARRAGE, CA_GEYSER, CA_HAMMER, CA_EMBER}};
static const unsigned FORGE_LAMPS = 5;
static const unsigned long FORGE_LAMP_AT = 600;
static const float FORGE_SHOULDER_X = 64, FORGE_SHOULDER_Y = -46,
                   FORGE_REACH = 96;
static const float FORGE_ARM_REST = .25f, FORGE_LADLE_REST = -.2f,
                   FORGE_HAMMER_UP = BOSS_PI + .4f, FORGE_HAMMER_DOWN = 1.7f;
// The bellows blast.
static const unsigned long FORGE_INHALE = 800, FORGE_EXHALE = 300;
// The hammer: raised by 600 ms, the column marked 900 ms, down at 900.
static const unsigned long FORGE_STRIKE_EVERY = 1000, FORGE_STRIKE_WARN = 900,
                           FORGE_STRIKE_LIVE = 380;
// The ladle: scoop, whip over the top, the blob away at 950 ms.
static const unsigned long FORGE_SCOOP = 700, FORGE_WHIP = 950,
                           FORGE_LADLE_BACK = 1600;
static const float FORGE_LADLE_DIP = .9f, FORGE_LADLE_OVER = -3.4f;
// Geysers: a breath, the flame driven down, then one every 180 ms.
static const unsigned long FORGE_GEYSER_AT = 600, FORGE_GEYSER_EVERY = 180;
// The vent.
static const unsigned long FORGE_VENT_WARN = 1000, FORGE_VENT_BARE = 3400,
                           FORGE_VENT_SHUT = 400;
static const BossRow SEQ_CINDERLING[] = {{1, CA_LOB}};

static float bs_forge_ease(float u) {
    u = bs_clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
}
static float bs_forge_lerp(float a, float b, float u) {
    return a + (b - a) * bs_forge_ease(u);
}
// Where an arm's tool is: the hammer's shoulder faces the pilot (side -1), the
// ladle's is on the far side (+1).
static void bs_forge_arm_end(int side, float a, float& x, float& y) {
    x = boss.x + side * FORGE_SHOULDER_X - sinf(a) * FORGE_REACH;
    y = boss.y + FORGE_SHOULDER_Y + cosf(a) * FORGE_REACH;
}
static void bs_forge_begin() {
    for (unsigned i = 0; i < 8; i++) {
        boss.parts[i] = {};
    }
    boss.aux[AUX_FORGE_HAMMER] = FORGE_ARM_REST;
    boss.aux[AUX_FORGE_LADLE] = FORGE_LADLE_REST;
    boss.aux[AUX_FORGE_BREATH] = .3f;
}
static unsigned bs_forge_strikes() {
    return boss.phase >= 2 ? bs_density(3) : 2;
}
static unsigned bs_forge_geysers() {
    return bs_density(4);
}
// The body's pose follows the attack's clock, so the arm comes down exactly as
// the column of fire does.
static void bs_forge_pose(unsigned long t) {
    float idle = .3f + .15f * sinf(bs_since(boss.born) / 500.0f);
    float breath = idle, hammer = FORGE_ARM_REST, ladle = FORGE_LADLE_REST;
    float flame = 0;
    switch (boss.atk) {
    case CA_EMBER:
        breath = t < FORGE_INHALE
                         ? bs_forge_lerp(idle, 1, t / float(FORGE_INHALE))
                         : bs_forge_lerp(1,
                                         .1f,
                                         (t - FORGE_INHALE)
                                                 / float(FORGE_EXHALE));
        break;
    case CA_HAMMER: {
        unsigned n = bs_forge_strikes();
        unsigned k = bs_min(n - 1, t / FORGE_STRIKE_EVERY);
        unsigned long u = t - k * FORGE_STRIKE_EVERY;
        float from = k ? FORGE_HAMMER_DOWN : FORGE_ARM_REST;
        if (u < FORGE_STRIKE_WARN) {
            hammer = bs_forge_lerp(from, FORGE_HAMMER_UP, u / 600.0f);
        } else if (u < FORGE_STRIKE_WARN + 60) {
            hammer = bs_forge_lerp(FORGE_HAMMER_UP,
                                   FORGE_HAMMER_DOWN,
                                   (u - FORGE_STRIKE_WARN) / 60.0f);
        } else {
            hammer = bs_forge_lerp(FORGE_HAMMER_DOWN,
                                   FORGE_ARM_REST,
                                   (u - FORGE_STRIKE_WARN - 60) / 300.0f);
        }
        breath = bs_forge_lerp(idle, .8f, t / 600.0f);
        break;
    }
    case CA_LOB:
    case CA_BARRAGE:
        if (t < FORGE_SCOOP) {
            ladle = bs_forge_lerp(
                    FORGE_LADLE_REST, FORGE_LADLE_DIP, t / float(FORGE_SCOOP));
        } else if (t < FORGE_WHIP) {
            ladle = bs_forge_lerp(FORGE_LADLE_DIP,
                                  FORGE_LADLE_OVER,
                                  (t - FORGE_SCOOP)
                                          / float(FORGE_WHIP - FORGE_SCOOP));
        } else {
            ladle = bs_forge_lerp(
                    FORGE_LADLE_OVER,
                    FORGE_LADLE_REST,
                    (t - FORGE_WHIP) / float(FORGE_LADLE_BACK - FORGE_WHIP));
        }
        breath = bs_forge_lerp(idle, .7f, t / 600.0f);
        break;
    case CA_GEYSER:
        breath = t < FORGE_GEYSER_AT
                         ? bs_forge_lerp(idle, 1, t / float(FORGE_GEYSER_AT))
                         : bs_forge_lerp(
                                   1, .1f, (t - FORGE_GEYSER_AT) / 300.0f);
        flame = t >= FORGE_GEYSER_AT && t < FORGE_GEYSER_AT + 400 ? 1 : 0;
        break;
    case CA_VENT:
        breath = .1f;
        break;
    }
    boss.aux[AUX_FORGE_BREATH] = breath;
    boss.aux[AUX_FORGE_HAMMER] = hammer;
    boss.aux[AUX_FORGE_LADLE] = ladle;
    boss.aux[AUX_FORGE_FLAME] = flame;
}
static void bs_forge_update() {
    unsigned long t = boss.atk ? bs_since(boss.atk_t0) : 0;
    bs_forge_pose(t);
    // A lamp for each attack, 600 ms in.
    if (!boss.atk) {
        boss.aux[AUX_FORGE_LIT] = 0;
    } else if (boss.atk != CA_VENT && t >= FORGE_LAMP_AT
               && boss.aux[AUX_FORGE_LIT] < .5f) {
        boss.aux[AUX_FORGE_LIT] = 1;
        boss.aux[AUX_FORGE_LAMPS]
                = bs_min(FORGE_LAMPS, boss.aux[AUX_FORGE_LAMPS] + 1);
    }
    float heat = boss.aux[AUX_FORGE_LAMPS] / FORGE_LAMPS;
    float open = 0, core = 0, steam = 0;
    if (boss.atk == CA_VENT) {
        unsigned long bare = FORGE_VENT_WARN + FORGE_VENT_BARE;
        steam = t < bare ? 1 : 0;
        if (t >= FORGE_VENT_WARN) {
            open = t < bare ? bs_forge_ease((t - FORGE_VENT_WARN) / 200.0f)
                            : 1
                                      - bs_forge_ease((t - bare)
                                                      / float(FORGE_VENT_SHUT));
            core = t < FORGE_VENT_WARN + 1800 ? 2 : 1;
            heat = 1
                   - bs_clamp((t - FORGE_VENT_WARN) / float(FORGE_VENT_BARE),
                              0,
                              1);
        }
    }
    boss.aux[AUX_FORGE_HEAT] += (heat - boss.aux[AUX_FORGE_HEAT]) * .1f;
    boss.aux[AUX_FORGE_OPEN] = open;
    boss.aux[AUX_FORGE_CORE] = core;
    boss.aux[AUX_FORGE_STEAM] = steam;
}
static bool bs_forge_open() {
    return boss.aux[AUX_FORGE_OPEN] > .5f;
}
// A blob of molten metal onto a marked spot: it lands as the mark runs out and
// leaves a pool that burns down to a scorch.
static void bs_lob(float tx, float ty, float sx, float sy) {
    tx = bs_clamp(tx, 36, 330);
    ty = bs_clamp(ty, 36, 240);
    BossShot *s
            = bs_shot(SF_LOB, sx, sy, (tx - sx) / 60, (ty - sy) / 60, 1, 1200);
    BossHazard *h = bs_hazard(HK_POOL, tx, ty, 0, 0, 22, 1200, 4000);
    if (s && h) {
        s->link = bs_hazard_index(h);
    } else if (s && !h) {
        s->active = false;
    } else if (h && !s) {
        h->active = false;
    }
}
static bool bs_forge_run(int id, unsigned long t) {
    // The furnace mouth, at the front of the body.
    float mx = boss.x - 40, my = boss.y + 2;
    switch (id) {
    case CA_EMBER: {
        // The bellows blast: a long breath in with the cone marked, then a
        // cone of embers out of the furnace mouth.
        float ang = bs_angle_to(mx, my, boss.target_x, boss.target_y);
        if (bs_at(t, 0)) {
            boss.scratch[0] = ang;
            bs_hazard(HK_ARC, mx, my, ang, .35f, 300, FORGE_INHALE, 0);
        }
        if (bs_at(t, FORGE_INHALE)) {
            unsigned n = bs_density(9);
            for (unsigned i = 0; i < n; i++) {
                float a = boss.scratch[0] + (i / float(n - 1) - .5f) * .7f;
                bs_shot_at(SF_EMBER, mx, my, a, 2.1f + (i % 3) * .25f);
            }
        }
        return t >= FORGE_INHALE + FORGE_EXHALE;
    }
    case CA_HAMMER: {
        // The anvil strikes, from the hammer arm: full-height columns of fire,
        // each marked while the hammer is raised. The first falls on the
        // pilot's column, the rest 70-110 px from the last; each leaves a
        // scorch on the floor.
        unsigned n = bs_forge_strikes();
        for (unsigned k = 0; k < n && k < 6; k++) {
            unsigned long at = k * FORGE_STRIKE_EVERY;
            if (bs_at(t, at)) {
                float x = k ? boss.scratch[k - 1]
                                          + (rock_random_bounded(2) ? 1 : -1)
                                                    * bs_rand(70, 110)
                            : boss.target_x + bs_rand(-25, 25);
                x = bs_clamp(x, 45, 280);
                if (k && fabsf(x - boss.scratch[k - 1]) < 60) {
                    x = x < 170 ? x + 90 : x - 90;
                }
                boss.scratch[k] = x;
                bs_hazard(HK_LANE,
                          x,
                          0,
                          BOSS_PI / 2,
                          270,
                          15,
                          FORGE_STRIKE_WARN,
                          FORGE_STRIKE_LIVE);
            }
            if (bs_at(t, at + FORGE_STRIKE_WARN)) {
                display_shake(1);
            }
            if (bs_at(t, at + FORGE_STRIKE_WARN + FORGE_STRIKE_LIVE)) {
                bs_scorch(boss.scratch[k], 252, 12, 4000);
            }
        }
        return t >= (n - 1) * FORGE_STRIKE_EVERY + FORGE_STRIKE_WARN
                            + FORGE_STRIKE_LIVE + 100;
    }
    case CA_LOB:
    case CA_BARRAGE: {
        // The ladle scoops, whips over the top and lobs: one blob in phase 1,
        // two in phase 2, three at once from phase 3 (the barrage).
        if (bs_at(t, FORGE_WHIP)) {
            float cx, cy;
            bs_forge_arm_end(1, FORGE_LADLE_OVER, cx, cy);
            cy = bs_max(24.0f, cy);
            unsigned n = id == CA_BARRAGE ? 3 : boss.phase >= 2 ? 2 : 1;
            for (unsigned k = 0; k < n; k++) {
                float tx = boss.target_x, ty = boss.target_y;
                if (n == 2) {
                    tx += k ? 60 : -20;
                    ty += k ? bs_rand(-60, 60) : 0;
                } else if (n == 3) {
                    tx += (int(k) - 1) * 75 + bs_rand(-20, 20);
                    ty += bs_rand(-70, 70);
                }
                bs_lob(tx, ty, cx, cy);
            }
        }
        return t >= FORGE_WHIP + 1300;
    }
    case CA_GEYSER: {
        // It drives its flame into the floor; geysers burst up one after
        // another along the floor toward the pilot, each marked first and each
        // leaving a scorch.
        unsigned n = bs_forge_geysers();
        if (bs_at(t, 0)) {
            float from = boss.x - 70,
                  to = bs_clamp(boss.target_x, 40, from - 60 * (n - 1));
            for (unsigned k = 0; k < n && k < 6; k++) {
                boss.scratch[k] = from + (to - from) * k / float(n - 1);
            }
        }
        for (unsigned k = 0; k < n && k < 6; k++) {
            unsigned long at = FORGE_GEYSER_AT + k * FORGE_GEYSER_EVERY;
            if (bs_at(t, at)) {
                bs_hazard(HK_LANE,
                          boss.scratch[k],
                          262,
                          -BOSS_PI / 2,
                          bs_rand(130, 170),
                          11,
                          900,
                          450);
            }
            if (bs_at(t, at + 900 + 450)) {
                bs_scorch(boss.scratch[k], 252, 12, 4000);
            }
        }
        return t >= FORGE_GEYSER_AT + (n - 1) * FORGE_GEYSER_EVERY + 900 + 450
                            + 100;
    }
    case CA_VENT: {
        // Full heat: it vents. A ring of heat with one gap rolls out from the
        // core as the doors burst open; then the core is bare while it cools.
        if (bs_at(t, 0)) {
            float gap
                    = bs_angle_to(boss.x, boss.y, boss.target_x, boss.target_y)
                      + (boss.cycle % 2 ? .45f : -.45f);
            BossHazard *h = bs_hazard(HK_RING,
                                      boss.x,
                                      boss.y + 2,
                                      gap,
                                      40,
                                      .52f,
                                      FORGE_VENT_WARN,
                                      4200);
            if (h) {
                h->d = 2.0f;
                h->e = 0;
            }
            bs_hazard(HK_TELL, boss.x, boss.y, 0, 132, 0, FORGE_VENT_WARN, 0);
        }
        if (bs_at(t, FORGE_VENT_WARN)) {
            display_shake(2);
        }
        unsigned long done
                = FORGE_VENT_WARN + FORGE_VENT_BARE + FORGE_VENT_SHUT;
        if (t >= done) {
            boss.aux[AUX_FORGE_LAMPS] = 0; // cooled
            return true;
        }
        return false;
    }
    }
    return true;
}

static int bs_forge_pick() {
    if (boss.aux[AUX_FORGE_LAMPS] >= FORGE_LAMPS) {
        return CA_VENT;
    }
    return bs_seq_pick(SEQ_FORGE, 3);
}
// ================================================================ CINDERLING
// A lob in the air or a pool burning keeps the little forge from lobbing again.
static int bs_cinderling_pick() {
    for (const BossHazard& h : boss.hz) {
        if (h.active && h.kind == HK_POOL) {
            return 0;
        }
    }
    for (const BossShot& s : boss.shots) {
        if (s.active && s.family == SF_LOB) {
            return 0;
        }
    }
    return CA_LOB;
}
static bool bs_cinderling_run(int id, unsigned long t) {
    (void)id;
    if (bs_at(t, 0)) {
        bs_lob(boss.target_x, boss.target_y, boss.x - 100, boss.y - 30);
        boss.stamp[STAMP_FORGE_OPEN_UNTIL] = game_ms + 2300;
    }
    return t >= 1300;
}
static void bs_cinderling_update() {
    boss.aux[AUX_CINDER_GLOW] = .5f + .1f * sinf(bs_since(boss.born) / 260.0f);
    boss.aux[AUX_CINDER_OPEN]
            = game_ms < boss.stamp[STAMP_FORGE_OPEN_UNTIL] ? 1.0f : 0.0f;
}
// The shell (torso, head, bellows) stops shots; the core only takes them while
// the doors are open. The laser pierces the shell (at half, see the soak).
static void bs_forge_circles() {
    bs_circle(boss.x, boss.y + 2, 26, BC_CORE, 0, bs_forge_open() ? 3 : 2);
    if (!bs_forge_open()) {
        bs_circle(boss.x, boss.y - 4, 66, BC_BLOCK, 0, 1);
    } else {
        // Open: the shell around the mouth still blocks, but not in front.
        bs_circle(boss.x, boss.y - 60, 34, BC_BLOCK, 0, 1);
        bs_circle(boss.x + 40, boss.y, 30, BC_BLOCK, 0, 1);
    }
    bs_circle(boss.x, boss.y - 76, 24, BC_BLOCK, 0, 1);
    bs_circle(boss.x, boss.y + 82, 34, BC_BLOCK, 0, 1);
}
// The Cinderling is a half-size golem (nextSteps.md P4.6): its shell blocks
// shots until it vents after a lob.
static void bs_cinderling_circles() {
    bool open = boss.aux[AUX_CINDER_OPEN] > .5f;
    bs_circle(boss.x, boss.y + 1, 14, BC_CORE, 0, open ? 3 : 2);
    if (!open) {
        bs_circle(boss.x, boss.y - 2, 34, BC_BLOCK, 0, 1);
    }
    bs_circle(boss.x, boss.y - 38, 12, BC_BLOCK, 0, 1);
    bs_circle(boss.x, boss.y + 42, 16, BC_BLOCK, 0, 1);
}
static unsigned bs_forge_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y - 4, 62);
    bs_guard_body(out, n, boss.x, boss.y - 76, 22);
    bs_guard_body(out, n, boss.x, boss.y + 82, 32);
    return n;
}
static unsigned bs_cinderling_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y - 2, 32);
    bs_guard_body(out, n, boss.x, boss.y - 38, 12);
    bs_guard_body(out, n, boss.x, boss.y + 42, 16);
    return n;
}
// The shell blunts the laser unless the doors are open; while it vents, shots
// into the bare core count double ("hit it hard while it vents").
static unsigned bs_forge_soak(unsigned damage, bool laser) {
    if (!bs_forge_open()) {
        return laser ? damage / 2 : damage;
    }
    return laser ? damage : damage * 2;
}
static const BossOps OPS_CINDERFORGE = {360,
                                        130,
                                        2,
                                        3,
                                        {66, 33},
                                        {900, 750, 650},
                                        bs_forge_begin,
                                        bs_forge_update,
                                        bs_forge_pick,
                                        bs_forge_run,
                                        bs_forge_circles,
                                        bs_forge_body,
                                        nullptr,
                                        bs_forge_soak,
                                        nullptr};
static const BossOps OPS_CINDERLING = {380,
                                       135,
                                       5,
                                       1,
                                       {0, 0},
                                       {900, 900, 900},
                                       nullptr,
                                       bs_cinderling_update,
                                       bs_cinderling_pick,
                                       bs_cinderling_run,
                                       bs_cinderling_circles,
                                       bs_cinderling_body,
                                       nullptr,
                                       nullptr,
                                       nullptr};
