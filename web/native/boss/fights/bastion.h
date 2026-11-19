#pragma once
// Bastion and Gunnery

// Slots of boss.aux and boss.stamp.
enum {
    AUX_BASTION_CANNON = 0, // 1 while the nose cannon or broadside fires
    AUX_BASTION_PODS = 1,   // 1 while the missile pods are open
    AUX_BASTION_ARMOUR = 2, // hull plating shown in the scene
    AUX_BASTION_ROLL = 3,   // its bank (and list, once hurt)
    AUX_BASTION_THRUST = 4, // 0..1: how hard the engines burn
    AUX_BASTION_PREV_Y = 5, //
    AUX_BASTION_LOCK = 6,   // 0..1: the missile lock-on closing on the pilot
    AUX_BASTION_LANE = 7    // the ramming run's lane (y), while it runs
};
enum {
    AUX_GUNNERY_FIRING = 0
}; // 1 while the bolts attack runs
// Queued bolts (Bastion's MA_BOLTS echo and Gunnery): four floats per gun from
// AUX_BOLTS.
enum {
    AUX_BOLTS = 8,
    BOLT_STRIDE = 4,
    BOLT_X = 0,
    BOLT_Y = 1,
    BOLT_ANGLE = 2,
    BOLT_FIRE_AT = 3
};
enum {
    STAMP_BASTION_REVIVED = 2, // the guns came back once already
    STAMP_BASTION_GUNLESS_SINCE = 3
}; // when the last gun fell (0 = a gun stands)

// ================================================================ BASTION /
// GUNNERY
// The battleship (nextSteps.md P4.4). Its weak point is its engines, one on an
// outrigger on each flank near the stern: shots there hurt it, and while it
// thrusts hard (the ramming run) they count double. The hull turns shots away.
// Its three guns are hardpoints that take hits of their own, and knocking one
// out silences its attack: the nose cannon, the missile pods, the aft battery
// (the broadside). The ramming run (replaced the mines) needs no gun. It banks
// as it moves and lists as it is hurt; at half health it loses the engine that
// took more hits.
static const BossRow SEQ_BASTION[]
        = {{4, BA_CANNON, BA_MISSILE, BA_CANNON, BA_RAM},
           {4, BA_CANNON, BA_MISSILE, BA_BROAD, BA_RAM}};
static const BossRow SEQ_GUNNERY[] = {{2, MA_BOLTS, BA_MISSILE}};
static const float BASTION_ENGINE_X = 66, BASTION_ENGINE_Y = 98;
static const unsigned BASTION_ENGINE0 = 3; // parts 3 and 4
// The ramming run.
static const unsigned long RAM_RISE = 1200, RAM_CROSS = 1400, RAM_AWAY = 1200,
                           RAM_BACK = 1200;
static const float RAM_HALF = 70; // half the lane's height
// Marks the run's lane (its `e`): live, the danger is the ship itself, so the
// renderer draws no band (src/boss/scene.mjs RAM_LANE).
static const float RAM_STYLE = 20;
static void bs_bastion_xy(unsigned i, float& x, float& y) {
    static const float off[3][2] = {{8, -56}, {-28, 58}, {50, 56}};
    float c = cosf(boss.aux[AUX_BASTION_ROLL]),
          s = sinf(boss.aux[AUX_BASTION_ROLL]);
    float dx = i < 3 ? off[i][0] : BASTION_ENGINE_X,
          dy = i < 3 ? off[i][1]
                     : (i == BASTION_ENGINE0 ? -1 : 1) * BASTION_ENGINE_Y;
    x = boss.x + dx * c - dy * s;
    y = boss.y + dx * s + dy * c;
}
static void bs_bastion_begin() {
    static const float r[3] = {34, 28, 24};
    for (unsigned i = 0; i < 3; i++) {
        BossPart& p = boss.parts[i];
        p = {};
        p.exists = true;
        p.kind = PK_HARD;
        p.slot = i;
        p.hp = p.hp_max = 6;
        p.r = r[i];
    }
    for (unsigned k = 0; k < 2; k++) {
        BossPart& p = boss.parts[BASTION_ENGINE0 + k];
        p = {};
        p.exists = true;
        p.kind = PK_ENGINE;
        p.slot = k;
        p.hp = 0; // hits taken (picks which engine dies at half health)
        p.r = 20;
    }
    boss.aux[AUX_BASTION_THRUST] = .3f;
    boss.aux[AUX_BASTION_PREV_Y] = boss.y;
}
static void bs_bastion_revive(int hp) {
    for (unsigned i = 0; i < 3; i++) {
        BossPart& p = boss.parts[i];
        p.exists = true;
        p.hp = p.hp_max = hp;
    }
}
// Bolts wait on their aim lines (the Horizon Warden borrows this for its
// Bastion cannon).
static void bs_bolts_tick() {
    for (unsigned k = 0; k < 2; k++) {
        float& fire = boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_FIRE_AT];
        if (fire > 0 && game_ms >= (unsigned long)fire) {
            bs_shot_at(SF_BOLT,
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_X],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_Y],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_ANGLE],
                       3.0f);
            fire = 0;
        }
    }
}
static float bs_bastion_ease(float u) {
    u = bs_clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
}
// Where the ramming run has the ship, from the rest point (x, y), t ms in.
static void
bs_bastion_ram_pose(unsigned long t, float& x, float& y, float& th) {
    float lane = boss.aux[AUX_BASTION_LANE], hx = x, hy = y;
    if (t < RAM_RISE) {
        y = hy + (lane - hy) * bs_bastion_ease(t / 700.0f);
        x = hx + 10 * bs_clamp((t - 700.0f) / 500, 0, 1);
        th = .6f + .4f * bs_clamp((t - 600.0f) / 600, 0, 1);
    } else if (t < RAM_RISE + RAM_CROSS) {
        float u = (t - RAM_RISE) / float(RAM_CROSS);
        x = hx + 10 - 800 * (u * sqrtf(u));
        y = lane;
        th = 1;
    } else if (t < RAM_RISE + RAM_CROSS + RAM_AWAY) {
        x = 900; // off the field, coming round
        th = .5f;
    } else {
        float u = (t - RAM_RISE - RAM_CROSS - RAM_AWAY) / float(RAM_BACK);
        x = 820 + (hx - 820) * bs_bastion_ease(u);
        th = .6f;
    }
}
static unsigned bs_bastion_dead_guns() {
    unsigned n = 0;
    for (unsigned i = 0; i < 3; i++) {
        n += !boss.parts[i].exists;
    }
    return n;
}
static void bs_bastion_update() {
    float thrust = .3f;
    if (boss.atk == BA_RAM) {
        bs_bastion_ram_pose(bs_since(boss.atk_t0), boss.x, boss.y, thrust);
        boss.camp_ms[0] = boss.camp_ms[1]
                = 0; // it passes you; that is not camping
    }
    float vy = boss.y - boss.aux[AUX_BASTION_PREV_Y];
    boss.aux[AUX_BASTION_PREV_Y] = boss.y;
    if (fabsf(vy) > 20) {
        vy = 0; // it came back round from the far side
    }
    // It banks into its turns, burns harder to turn, and lists as it is hurt.
    unsigned dead = bs_bastion_dead_guns()
                    + (boss.parts[BASTION_ENGINE0].state
                       + boss.parts[BASTION_ENGINE0 + 1].state);
    float roll = bs_clamp(vy * .08f, -.14f, .14f) + .04f * dead;
    boss.aux[AUX_BASTION_ROLL] += (roll - boss.aux[AUX_BASTION_ROLL]) * .08f;
    thrust = bs_max(thrust, bs_clamp(.3f + fabsf(vy) * .7f, 0, 1));
    boss.aux[AUX_BASTION_THRUST]
            += (thrust - boss.aux[AUX_BASTION_THRUST]) * .15f;
    for (unsigned i = 0; i < 5; i++) {
        bs_bastion_xy(i, boss.parts[i].x, boss.parts[i].y);
    }
    bool any = false;
    for (unsigned i = 0; i < 3; i++) {
        any |= boss.parts[i].exists;
    }
    if (any) {
        boss.stamp[STAMP_BASTION_GUNLESS_SINCE] = 0;
    } else if (!boss.stamp[STAMP_BASTION_GUNLESS_SINCE]) {
        boss.stamp[STAMP_BASTION_GUNLESS_SINCE] = game_ms;
    } else if (!boss.stamp[STAMP_BASTION_REVIVED]
               && bs_since(boss.stamp[STAMP_BASTION_GUNLESS_SINCE]) >= 8000) {
        bs_bastion_revive(6);
        boss.stamp[STAMP_BASTION_REVIVED] = 1;
        boss.stamp[STAMP_BASTION_GUNLESS_SINCE] = 0;
    }
    boss.aux[AUX_BASTION_CANNON]
            = boss.atk == BA_CANNON || boss.atk == BA_BROAD ? 1.0f : 0.0f;
    boss.aux[AUX_BASTION_PODS] = boss.atk == BA_MISSILE ? 1.0f : 0.0f;
    boss.aux[AUX_BASTION_LOCK]
            = boss.atk == BA_MISSILE
                      ? bs_clamp(bs_since(boss.atk_t0) / 600.0f, 0, 1)
                      : 0.0f;
    boss.aux[AUX_BASTION_ARMOUR] = .6f + .3f * (boss.phase > 1);
    bs_bolts_tick();
}
static void
bs_bolt(unsigned k, float x, float y, float tx, float ty, unsigned long delay) {
    float ang = bs_angle_to(x, y, tx, ty);
    bs_hazard(HK_AIM, x, y, ang, 520, 0, 500, 0);
    boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_X] = x;
    boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_Y] = y;
    boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_ANGLE] = ang;
    boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_FIRE_AT]
            = float(game_ms + 500 + delay);
}
// A gun knocked out silences its attack; the ramming run needs none.
static int bs_bastion_pick() {
    const BossRow *rows = SEQ_BASTION;
    unsigned idx = boss.phase >= 2 ? 1 : 0;
    const uint8_t *row = rows[idx];
    for (unsigned k = 0; k < row[0]; k++) {
        int id = row[1 + (boss.seq + k) % row[0]];
        bool ok = id == BA_RAM || (id == BA_CANNON && boss.parts[0].exists)
                  || (id == BA_MISSILE && boss.parts[1].exists)
                  || (id == BA_BROAD && boss.parts[2].exists);
        if (ok) {
            boss.seq += k;
            return id;
        }
    }
    return 0;
}
static bool bs_bastion_run(int id, unsigned long t) {
    switch (id) {
    case BA_CANNON: {
        unsigned n = boss.phase == 1 ? 1 : 2;
        for (unsigned k = 0; k < n; k++) {
            if (bs_at(t, k * 400)) {
                float tx = boss.target_x, ty = boss.target_y;
                if (k) {
                    bs_nearest(boss.x, boss.y, tx, ty);
                }
                static const float turret[3][2]
                        = {{-40, -44}, {8, -58}, {56, -71}};
                unsigned which = (boss.seq + k) % 3;
                bs_bolt(k,
                        boss.x + turret[which][0] - 28,
                        boss.y + turret[which][1],
                        tx,
                        ty,
                        0);
            }
        }
        return t >= (n - 1) * 400 + 700;
    }
    case BA_MISSILE: {
        // A lock-on settles on the pilot (600 ms), then the tubes fire.
        unsigned n = boss.mini ? 1 : (boss.phase == 1 ? 2 : 3);
        float sx = boss.mini ? boss.x - 20 : boss.x - 30,
              sy = boss.mini ? boss.y + 48 : boss.y + 76;
        for (unsigned k = 0; k < n; k++) {
            if (bs_at(t, 600 + k * 600)) {
                float px = boss.target_x, py = boss.target_y;
                bs_nearest(sx, sy, px, py);
                BossShot *s = bs_shot_at(SF_MISSILE,
                                         sx,
                                         sy,
                                         bs_angle_to(sx, sy, px, py),
                                         1.4f,
                                         2,
                                         4000);
                if (s) {
                    s->turn = .04f;
                }
            }
        }
        return t >= 600 + n * 600 + 200;
    }
    case BA_RAM: {
        // It rises to the lane on the pilot's half, bow on, the lane marked
        // edge to edge; then it crosses the field with its engines blazing,
        // leaving a wake of debris, and comes back in from the right.
        if (bs_at(t, 0)) {
            float lane = boss.target_y < 135 ? 70 : 200;
            boss.aux[AUX_BASTION_LANE] = lane;
            BossHazard *h = bs_hazard(HK_LANE,
                                      SCREEN_W + 10,
                                      lane,
                                      BOSS_PI,
                                      SCREEN_W + 20,
                                      RAM_HALF,
                                      RAM_RISE,
                                      RAM_CROSS);
            boss.scratch[0] = h ? float(h - boss.hz) + 1 : 0;
            if (h) {
                h->e = RAM_STYLE;
            }
        }
        // Once it goes, the danger is the ship: the lane runs from its stern
        // to its bow as it crosses.
        if (t >= RAM_RISE && boss.scratch[0] > 0) {
            BossHazard& h = boss.hz[unsigned(boss.scratch[0]) - 1];
            if (h.active && h.kind == HK_LANE && h.e == RAM_STYLE) {
                h.x = boss.x + 170;
                h.b = 340;
            }
        }
        unsigned long cross = t - RAM_RISE;
        if (t >= RAM_RISE && t < RAM_RISE + RAM_CROSS
            && cross % 160 < FRAME_TIME_MS && boss.x + 170 < SCREEN_W) {
            bs_shot(SF_PELLET,
                    boss.x + 170,
                    boss.aux[AUX_BASTION_LANE] + bs_rand(-55, 55),
                    bs_rand(-.35f, .1f),
                    bs_rand(-.15f, .15f),
                    1,
                    2500);
        }
        return t >= RAM_RISE + RAM_CROSS + RAM_AWAY + RAM_BACK;
    }
    case BA_BROAD: {
        if (bs_at(t, 0)) {
            bs_hazard(HK_ARC,
                      boss.x - 40,
                      boss.y,
                      BOSS_PI,
                      BOSS_PI / 2,
                      220,
                      800,
                      0);
        }
        for (unsigned i = 0; i < 10; i++) {
            if (bs_at(t, 800 + i * 110)) {
                float xs = 60 + (i / 2) * 40, edge = 84 * (xs - 4) / 254;
                bool top = i % 2 == 0;
                float x = boss.x - 170 + xs,
                      y = boss.y - 98 + (top ? 98 - edge - 8 : 98 + edge + 8);
                float px = boss.target_x, py = boss.target_y;
                bs_nearest(x, y, px, py);
                bs_shot_at(SF_NEEDLE, x, y, bs_angle_to(x, y, px, py), 2.2f);
            }
        }
        return t >= 800 + 10 * 110 + 200;
    }
    case MA_BOLTS: {
        float gx = boss.x - 66;
        if (bs_at(t, 0)) {
            bs_bolt(0, gx, boss.y - 10, boss.target_x, boss.target_y, 0);
            bs_bolt(1, gx, boss.y + 10, boss.target_x, boss.target_y, 0);
        }
        return t >= 700;
    }
    }
    return true;
}

static void bs_gunnery_update() {
    boss.y = boss.home_y + 20 * sinf(TWO_PI * bs_since(boss.born) / 6000.0f);
    for (unsigned k = 0; k < 2; k++) {
        float& fire = boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_FIRE_AT];
        if (fire > 0 && game_ms >= (unsigned long)fire) {
            bs_shot_at(SF_BOLT,
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_X],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_Y],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_ANGLE],
                       3.0f);
            fire = 0;
        }
    }
    boss.aux[AUX_GUNNERY_FIRING] = boss.atk == MA_BOLTS ? 1.0f : 0.0f;
}
static int bs_gunnery_pick() {
    return bs_seq_pick(SEQ_GUNNERY, 1);
}
// The guns take hits of their own; the engines are where it is hurt; the hull
// turns shots away.
static void bs_bastion_circles() {
    for (unsigned i = 0; i < 5; i++) {
        const BossPart& p = boss.parts[i];
        if (p.exists && !(p.kind == PK_ENGINE && p.state)) {
            bs_circle(p.x, p.y, p.r, BC_PART, i, 3);
        }
    }
    float c = cosf(boss.aux[AUX_BASTION_ROLL]),
          s = sinf(boss.aux[AUX_BASTION_ROLL]);
    static const float hull[4][3]
            = {{-64, 0, 24}, {-24, 0, 40}, {26, 0, 60}, {86, 0, 70}};
    for (const auto& h : hull) {
        bs_circle(boss.x + h[0] * c, boss.y + h[0] * s, h[2], BC_BLOCK, 0, 1);
    }
}
static void bs_gunnery_circles() {
    bs_circle(boss.x + 68, boss.y, 15, BC_CORE, 0, 3);
}
static unsigned bs_bastion_body(float *out) {
    unsigned n = 0;
    float x = boss.x, y = boss.y;
    bs_guard_body(out, n, x - 64, y, 24);
    bs_guard_body(out, n, x - 24, y, 40);
    bs_guard_body(out, n, x + 26, y, 60);
    bs_guard_body(out, n, x + 86, y, 70);
    return n;
}
static unsigned bs_gunnery_body(float *out) {
    unsigned n = 0;
    float x = boss.x, y = boss.y;
    // Fitted to the light-cruiser hull (half-height ~14 at -70, ~24 at -30, ~37
    // at +20; the rear circle stays inside the hull between the two nacelles).
    bs_guard_body(out, n, x - 70, y, 12);
    bs_guard_body(out, n, x - 30, y, 24);
    bs_guard_body(out, n, x + 20, y, 36);
    bs_guard_body(out, n, x + 70, y, 36);
    return n;
}
// At half health it loses the engine that took more hits: it smokes, has no
// trail, and can no longer be hurt there. The guns come back too.
static void bs_bastion_phase(unsigned phase) {
    if (phase >= 2) {
        bs_bastion_revive(7);
        boss.stamp[STAMP_BASTION_GUNLESS_SINCE] = 0;
        BossPart& top = boss.parts[BASTION_ENGINE0];
        BossPart& bottom = boss.parts[BASTION_ENGINE0 + 1];
        BossPart& lost = top.hp >= bottom.hp ? top : bottom;
        if (!top.state && !bottom.state) {
            lost.state = 1;
            bs_particles(lost.x, lost.y);
            display_shake(2);
        }
    }
}
static void
bs_bastion_hit(BossPart& p, unsigned owner, unsigned damage, bool laser) {
    if (p.kind == PK_ENGINE) {
        // Its weak point: double while it thrusts hard.
        unsigned d = laser ? damage * bs_ops().k : damage;
        if (!laser && boss.aux[AUX_BASTION_THRUST] >= .8f) {
            d *= 2;
        }
        p.hp = p.hp < 120 ? p.hp + 1 : p.hp;
        bs_core_damage(owner, d, laser);
        return;
    }
    p.hp = damage >= (unsigned)p.hp ? 0 : p.hp - damage;
    if (p.hp <= 0) {
        p.exists = false;
        bs_particles(p.x, p.y);
        display_shake(1);
        sound_play(SFX_ASTEROID_SMALL);
    }
}
static const BossOps OPS_BASTION = {324,
                                    138,
                                    5,
                                    2,
                                    {50, 0},
                                    {1300, 1000, 1000},
                                    bs_bastion_begin,
                                    bs_bastion_update,
                                    bs_bastion_pick,
                                    bs_bastion_run,
                                    bs_bastion_circles,
                                    bs_bastion_body,
                                    bs_bastion_phase,
                                    nullptr,
                                    bs_bastion_hit};
static const BossOps OPS_GUNNERY = {372,
                                    135,
                                    8,
                                    1,
                                    {0, 0},
                                    {1100, 1100, 1100},
                                    nullptr,
                                    bs_gunnery_update,
                                    bs_gunnery_pick,
                                    bs_bastion_run,
                                    bs_gunnery_circles,
                                    bs_gunnery_body,
                                    nullptr,
                                    nullptr,
                                    nullptr};
