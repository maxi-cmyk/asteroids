#pragma once
// Boss movement: no fight is a turret any more.
//
// Each boss has a rest point (`home_x/home_y`) that its own update draws around
// (a bob, a figure of eight). Between attacks the framework steers that rest
// point toward the pilot's row and slides it back and forth, within limits per
// boss. It never moves while an attack runs, so a lane or beam that was warned
// stays where it was shown.
//
// Hiding behind or beside the body is answered too: a pilot level with or
// behind the boss's centre for 1.2 s sets off a repel, a ring that expands from
// the boss with its one gap facing the open field, so the way out is forward.
// Warned like every ring (900 ms).

struct BossMotion {
    float left;     // how far the rest point may slide left of its origin (px)
    float vertical; // how far above or below its origin it may go (px)
    float speed;    // px per tick
    bool own;       // the fight moves the body itself (the Shardling kites)
};
// Ranges keep every body at x >= 216 (the "right 55%" rule) and the core on
// screen.
static const BossMotion BOSS_MOTION[BK_COUNT] = {
        {40, 45, 1.0f, false}, // Sentinel
        {15, 20, 1.0f, false}, // Ringwarden (bobs 40 on its own)
        {6,
         25,
         0.8f,
         false}, // Cinderforge (its panel ring nearly fills the room)
        {16, 40, 0.9f, false}, // Bastion
        {30, 25, 1.0f, false}, // Tidecaller (loops on its own)
        {0, 0, 0.0f, true},    // Zodiarch (swims its own figure of eight)
        {60, 20, 1.4f, false}, // Picket (bobs 36 on its own)
        {0, 0, 0.0f, true},    // Shardling
        {60, 60, 1.4f, false}, // Cinderling
        {50, 40, 1.4f, false}, // Gunnery (bobs 20 on its own)
        {60, 35, 1.4f, false}, // Moonjelly (loops on its own)
        {60, 50, 1.4f, false}, // Ninefold
};
static const unsigned long BOSS_CAMP_MS
        = 1200; // level with or behind the centre this long
static const unsigned long BOSS_REPEL_GAP_MS
        = 3000; // at most one repel per 3 s
static const float BOSS_CAMP_MARGIN
        = 30; // "level with" starts this far in front

static float bs_step_toward(float from, float to, float step) {
    return from + bs_clamp(to - from, -step, step);
}

// Between attacks: follow the nearest pilot's row and sweep left and back (12 s
// period).
static void bs_motion_steer() {
    const BossMotion& m = BOSS_MOTION[boss.kind % BK_COUNT];
    if (m.own) {
        return;
    }
    const BossOps& o = bs_ops();
    if (!boss.atk) {
        // Follow the nearest pilot who is in front. A pilot level with or
        // behind the body is not chased: the boss drifts back to its own height
        // so the way out stays open (the repel ring deals with campers).
        float want_y = o.home_y, best = 1e9f;
        for (unsigned p = 0; p < boss_hull_n; p++) {
            if (!bs_alive(p)
                || boss_hulls[p]->position_x > boss.x - BOSS_CAMP_MARGIN) {
                continue;
            }
            float d = bs_dist(boss.x,
                              boss.y,
                              boss_hulls[p]->position_x,
                              boss_hulls[p]->position_y);
            if (d < best) {
                best = d;
                want_y = bs_clamp(boss_hulls[p]->position_y,
                                  o.home_y - m.vertical,
                                  o.home_y + m.vertical);
            }
        }
        float sweep = .5f - .5f * cosf(TWO_PI * bs_since(boss.born) / 12000.0f);
        float want_x = o.home_x - m.left * sweep;
        boss.home_x = bs_step_toward(boss.home_x, want_x, m.speed);
        boss.home_y = bs_step_toward(boss.home_y, want_y, m.speed);
    }
    // The fight's own update may add its bob or loop around this.
    boss.x = boss.home_x;
    boss.y = boss.home_y;
}

static void bs_motion_repel() {
    bool camping = false;
    for (unsigned p = 0; p < boss_hull_n && p < 2; p++) {
        if (bs_alive(p)
            && boss_hulls[p]->position_x > boss.x - BOSS_CAMP_MARGIN) {
            boss.camp_ms[p] += FRAME_TIME_MS;
        } else {
            boss.camp_ms[p] = 0;
        }
        camping |= boss.camp_ms[p] >= BOSS_CAMP_MS;
    }
    if (!camping || game_ms < boss.repel_at) {
        return;
    }
    // Gap centred on the open field (to the left), expanding fast enough to
    // sweep the space behind and beside the body before it fades.
    BossHazard *h
            = bs_hazard(HK_RING, boss.x, boss.y, BOSS_PI, 30, .8f, 900, 1200);
    if (!h) {
        return; // the lethal cap is full; try again next tick
    }
    h->d = 3.5f;
    h->e = 0;
    boss.repels++;
    boss.repel_at = game_ms + BOSS_REPEL_GAP_MS;
    boss.camp_ms[0] = boss.camp_ms[1] = 0;
}

static void bs_motion() {
    bs_motion_steer();
    bs_motion_repel();
}
