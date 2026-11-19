#pragma once
// Sentinel and Picket
//
// The Sentinel (nextSteps.md P4.1): an armoured eye. Between attacks its plates
// stand apart and the eye is the window; each attack starts with a tell (the
// eye narrows, the plates shiver and close) and is warned from the eye (light
// in the seams). It slides on a rail after the pilot (boss/motion.h) and rolls
// as it slides. The plate throw sends plates out as boomerangs, leaving the eye
// bare while they fly; in phase 3 it sheds them for good and the eye stays
// open.

// Slots of boss.aux (floats the scene exports to the UI).
enum {
    AUX_SENTINEL_OPEN = 0, // 0 closed .. 1 open (plates apart)
    AUX_SENTINEL_BUSY = 1, // 1 while an attack runs
    AUX_SENTINEL_TELL = 2, // 1 in an attack's first 600 ms: the eye narrows
    AUX_SENTINEL_SEAM = 3, // 0..1 light through the shut plates' seams
    AUX_SENTINEL_ROLL = 4, // radians, as it slides on its rail
    AUX_SENTINEL_GAZE_X = 5,
    AUX_SENTINEL_GAZE_Y = 6, // what the eye looks at
    AUX_SENTINEL_SHED = 7,   // 1 once the plates are gone (phase 3)
    AUX_SENTINEL_BARE = 8,   // 1 while the eye can be hurt
    AUX_SENTINEL_PREV_Y = 9
};

// ================================================================ SENTINEL /
// PICKET
static const BossRow SEQ_SENTINEL[]
        = {{3, SA_LANCE, SA_FAN, SA_THROW},
           {5, SA_LANCE, SA_FAN, SA_VOLLEY, SA_THROW, SA_CROSS},
           {4, SA_LANCE, SA_FAN, SA_VOLLEY, SA_CROSS}};
static const BossRow SEQ_PICKET[] = {{1, SA_LANCE}};

// The plate throw: a 600 ms tell (the plates glow, their paths are drawn),
// then 1800 ms out and back.
static const unsigned long SENT_THROW_TELL = 600, SENT_THROW_FLY = 1800;
// Each plate's loop: how far out it flies, and which way it swings (out on one
// side, back on the other). Plate k sits at 45 + 90k degrees: 0 lower right,
// 1 lower left, 2 upper left, 3 upper right.
static const float SENT_FLIGHT[4][4] = {{-150, 84, 40, 30},
                                        {-170, 40, 0, 80},
                                        {-170, -40, 0, -80},
                                        {-150, -84, 40, -30}};
static const float SENT_PLATE_OUT = 38; // a plate's middle, out from the centre

static bool bs_sentinel_shed() {
    return boss.kind == BK_SENTINEL && boss.aux[AUX_SENTINEL_SHED] > .5f;
}
static void bs_sentinel_begin() {
    for (unsigned k = 0; k < 4; k++) {
        BossPart& p = boss.parts[k];
        p = {};
        p.exists = true;
        p.kind = PK_PLATE;
        p.slot = k;
        p.r = 26;
    }
}
// Where plate k is on the body.
static void bs_plate_home(unsigned k, float& x, float& y) {
    float a = (45 + 90 * k) * BOSS_PI / 180;
    x = boss.x + cosf(a) * SENT_PLATE_OUT;
    y = boss.y + sinf(a) * SENT_PLATE_OUT;
}
// Where a thrown plate is, u 0..1 through its loop.
static void bs_plate_loop(unsigned k, float u, float& x, float& y) {
    bs_plate_home(k, x, y);
    float e = u * u * (3 - 2 * u), out = sinf(BOSS_PI * e),
          swing = sinf(2 * BOSS_PI * e) * .6f;
    x += SENT_FLIGHT[k][0] * out + SENT_FLIGHT[k][2] * swing;
    y += SENT_FLIGHT[k][1] * out + SENT_FLIGHT[k][3] * swing;
}
static unsigned bs_throw_count() {
    return boss.phase >= 2 ? 4 : 2;
}
static bool bs_plate_thrown(unsigned k) {
    return bs_throw_count() == 4 || k == 1 || k == 2;
}
// When each attack's warning ends (the seams glow until then).
static unsigned long bs_sentinel_fire_at(int id) {
    switch (id) {
    case SA_FAN:
        return 700;
    case SA_VOLLEY:
        return 600;
    case SA_THROW:
        return SENT_THROW_TELL;
    default:
        return 900;
    }
}

static void bs_gate_update() {
    float want = boss.atk ? 0.0f : 1.0f;
    float rate = boss.kind == BK_SENTINEL ? .05f : .08f;
    boss.aux[AUX_SENTINEL_OPEN]
            += bs_clamp(want - boss.aux[AUX_SENTINEL_OPEN], -rate, rate);
    boss.aux[AUX_SENTINEL_BUSY] = boss.atk ? 1.0f : 0.0f;
    if (boss.kind == BK_PICKET && boss.phase) {
        boss.y = boss.home_y
                 + 36 * sinf(TWO_PI * bs_since(boss.born) / 7000.0f);
    }
}
static void bs_sentinel_update() {
    bs_gate_update();
    unsigned long t = boss.atk ? game_ms - boss.atk_t0 : 0;
    boss.aux[AUX_SENTINEL_TELL] = boss.atk && t < 600 ? 1.0f : 0.0f;
    float seam = 0;
    if (boss.atk && boss.atk != SA_THROW) {
        float fire = float(bs_sentinel_fire_at(boss.atk));
        seam = t < fire ? t / fire : bs_clamp(1 - (t - fire) / 300.0f, 0, 1);
    }
    boss.aux[AUX_SENTINEL_SEAM] = seam;
    // It rolls with its slide on the rail, like an eyeball turning.
    float vy = boss.aux[AUX_SENTINEL_PREV_Y]
                       ? boss.y - boss.aux[AUX_SENTINEL_PREV_Y]
                       : 0;
    boss.aux[AUX_SENTINEL_PREV_Y] = boss.y;
    float roll = bs_clamp(vy * .12f, -.12f, .12f);
    boss.aux[AUX_SENTINEL_ROLL] += (roll - boss.aux[AUX_SENTINEL_ROLL]) * .2f;
    boss.aux[AUX_SENTINEL_GAZE_X] = boss.target_x;
    boss.aux[AUX_SENTINEL_GAZE_Y] = boss.target_y;
    // The plates: on the body, thrown, or (phase 3) tumbling away.
    for (unsigned k = 0; k < 4; k++) {
        BossPart& p = boss.parts[k];
        if (!p.exists || p.kind != PK_PLATE) {
            continue;
        }
        if (p.state == 3) { // shed: tumbling off and gone after 1.7 s
            float u = (game_ms - p.until) / 1700.0f;
            float a = (45 + 90 * k) * BOSS_PI / 180;
            p.x = p.sx + cosf(a) * 160 * u;
            p.y = p.sy + sinf(a) * 120 * u + 160 * u * u;
            if (u >= 1) {
                p.exists = false;
            }
            continue;
        }
        if (boss.atk == SA_THROW && bs_plate_thrown(k)) {
            p.state = t < SENT_THROW_TELL ? 1 : 2;
            float u = t < SENT_THROW_TELL ? 0
                                          : bs_clamp(float(t - SENT_THROW_TELL)
                                                             / SENT_THROW_FLY,
                                                     0,
                                                     1);
            bs_plate_loop(k, u, p.x, p.y);
        } else {
            p.state = 0;
            bs_plate_home(k, p.x, p.y);
        }
    }
    bool flying = boss.atk == SA_THROW && t >= SENT_THROW_TELL
                  && t < SENT_THROW_TELL + SENT_THROW_FLY;
    boss.aux[AUX_SENTINEL_BARE]
            = bs_sentinel_shed() || flying || boss.aux[AUX_SENTINEL_OPEN] > .5f
                      ? 1.0f
                      : 0.0f;
}
// Phase 3: the plates come off for good.
static void bs_sentinel_phase(unsigned phase) {
    if (phase < 3 || bs_sentinel_shed()) {
        return;
    }
    boss.aux[AUX_SENTINEL_SHED] = 1;
    for (unsigned k = 0; k < 4; k++) {
        BossPart& p = boss.parts[k];
        if (p.exists && p.kind == PK_PLATE) {
            p.state = 3;
            p.until = game_ms;
            bs_plate_home(k, p.sx, p.sy);
        }
    }
    display_shake(1);
}
static bool bs_sentinel_run(int id, unsigned long t) {
    float mx = boss.x - (boss.kind == BK_PICKET ? 52 : 82), my = boss.y;
    float lane_x = boss.x - (boss.kind == BK_PICKET ? 10 : 30);
    switch (id) {
    case SA_LANCE:
        if (bs_at(t, 0)) {
            bs_hazard(HK_LANE,
                      lane_x,
                      boss.target_y,
                      BOSS_PI,
                      lane_x,
                      9,
                      900,
                      320);
        }
        return t >= 1240;
    case SA_FAN: {
        float ang = bs_angle_to(mx, my, boss.target_x, boss.target_y);
        if (bs_at(t, 0)) {
            bs_hazard(HK_ARC, mx, my, ang, .28f, 190, 700, 0);
        }
        if (bs_at(t, 700)) {
            for (int i = 0; i < 3; i++) {
                bs_shot_at(SF_NEEDLE, mx, my, ang + (i - 1) * .28f, 2.2f);
            }
        }
        return t >= 800;
    }
    case SA_VOLLEY: {
        unsigned n = bs_density(5);
        if (bs_at(t, 0)) {
            bs_hazard(HK_AIM,
                      mx,
                      my,
                      bs_angle_to(mx, my, boss.target_x, boss.target_y),
                      400,
                      0,
                      600,
                      0);
        }
        for (unsigned k = 0; k < n; k++) {
            if (bs_at(t, 600 + k * 120)) {
                float px = boss.target_x, py = boss.target_y;
                bs_nearest(mx, my, px, py);
                bs_shot_at(
                        SF_NEEDLE, mx, my, bs_angle_to(mx, my, px, py), 1.8f);
            }
        }
        return t >= 600 + n * 120 + 100;
    }
    case SA_CROSS:
        if (bs_at(t, 0)) {
            float vx = bs_clamp(boss.target_x > 160 ? boss.target_x - 90
                                                    : boss.target_x + 90,
                                40,
                                250);
            float hy = bs_clamp(boss.target_y > 135 ? boss.target_y - 80
                                                    : boss.target_y + 80,
                                40,
                                230);
            bs_hazard(HK_LANE, lane_x, hy, BOSS_PI, lane_x, 9, 900, 320);
            bs_hazard(HK_LANE, vx, 0, BOSS_PI / 2, 270, 9, 900, 320);
        }
        return t >= 1240;
    case SA_THROW: // the plates move in bs_sentinel_update
        return bs_sentinel_shed()
               || t >= SENT_THROW_TELL + SENT_THROW_FLY + 300;
    }
    return true;
}

static int bs_sentinel_pick() {
    return bs_seq_pick(SEQ_SENTINEL, 3);
}
static int bs_picket_pick() {
    return bs_seq_pick(SEQ_PICKET, 1);
}
static bool bs_open_gate() {
    return boss.aux[AUX_SENTINEL_OPEN] > .5f;
}
static void bs_sentinel_circles() {
    // Plates in flight stop shots like the shell does.
    for (unsigned k = 0; k < 4; k++) {
        const BossPart& p = boss.parts[k];
        if (p.exists && p.kind == PK_PLATE && p.state == 2) {
            bs_circle(p.x, p.y, p.r, BC_BLOCK, 0, 1);
        }
    }
    if (boss.aux[AUX_SENTINEL_BARE] > .5f) {
        bs_circle(boss.x, boss.y, 33, BC_CORE, 0, 3);
    } else {
        bs_circle(boss.x, boss.y, 72, BC_BLOCK, 0, 1);
    }
}
static void bs_picket_circles() {
    if (bs_open_gate()) {
        bs_circle(boss.x, boss.y, 18, BC_CORE, 0, 3);
    } else {
        bs_circle(boss.x, boss.y, 40, BC_BLOCK, 0, 1);
    }
}
static unsigned bs_sentinel_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y, 72);
    for (unsigned k = 0; k < 4; k++) {
        const BossPart& p = boss.parts[k];
        if (p.exists && p.kind == PK_PLATE && p.state == 2) {
            bs_guard_body(out, n, p.x, p.y, 22);
        }
    }
    return n;
}
static unsigned bs_picket_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y, 40);
    return n;
}
//                                   home        k  phases cut        rest ms
static const BossOps OPS_SENTINEL = {366,
                                     135,
                                     3,
                                     3,
                                     {60, 30},
                                     {950, 800, 600},
                                     bs_sentinel_begin,
                                     bs_sentinel_update,
                                     bs_sentinel_pick,
                                     bs_sentinel_run,
                                     bs_sentinel_circles,
                                     bs_sentinel_body,
                                     bs_sentinel_phase,
                                     nullptr,
                                     nullptr};
static const BossOps OPS_PICKET = {380,
                                   135,
                                   5,
                                   1,
                                   {0, 0},
                                   {1100, 1100, 1100},
                                   nullptr,
                                   bs_gate_update,
                                   bs_picket_pick,
                                   bs_sentinel_run,
                                   bs_picket_circles,
                                   bs_picket_body,
                                   nullptr,
                                   nullptr,
                                   nullptr};
