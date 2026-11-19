#pragma once
// Ringwarden and Shardling

// Slots of boss.aux.
enum {
    AUX_RING_SCALE = 0,      // radius scale of both rings (collapse shrinks it)
    AUX_RING_OUTER_SPIN = 1, // angle of the outer ring
    AUX_RING_INNER_SPIN = 2, // angle of the inner ring
    AUX_RING_CHARGING = 3,   // 1 while the core glows for a burst or prism
    AUX_RING_OUTER_TILT
            = 4, // how far the outer ring is tipped away (0 faces you)
    AUX_RING_OUTER_AXIS = 5, // how its ellipse is turned on screen
    AUX_RING_INNER_TILT = 6, // the same for the inner ring
    AUX_RING_INNER_AXIS = 7, //
    AUX_RING_ECLIPSE
            = 8,        // 1 while the lane from the left into the core is clear
    AUX_RING_HALO = 9,  // the outer ring's radius scale (the halo lock)
    AUX_RING_LEAN = 10, // the lean into its drift
    AUX_RING_PREV_Y = 11,    //
    AUX_RING_LOCK = 12,      // 0..1: the outer ring held to the halo's gap
    AUX_RING_LOCK_SPIN = 13, // the spin it is held at
    AUX_RING_HALO_GAP = 14   // the halo's gap angle (for the painter)
};
enum {
    AUX_SHARD_SPIN = 2,   // angle of the three orbiting blades
    AUX_SHARD_KITE_X = 4, // x the mini drifts toward (0 = home)
    AUX_SHARD_TILT = 5,   // its blades' ring tips away (0 faces you)
    AUX_SHARD_AXIS = 6    // and turns on screen (nextSteps.md P4.6)
};

// ================================================================ RINGWARDEN
// The crystal gyroscope (nextSteps.md P4.2). Two rings of blades tilt in 3D
// (ellipses that squash and turn) and each has a gap of empty slots: the outer
// ring slots 0..2, the inner ring slots 0..1. The gaps turn opposite ways on a
// 14 s clock that slows as they meet in front of the core: the eclipse, a clear
// lane straight in. Whole blades split the prism beam into shards; the halo
// lock throws the outer ring out to the edge of the field and back, with one
// gap of a fixed 80 px to thread.
static const BossRow SEQ_RING[]
        = {{2, RA_BURST, RA_BURST},
           {4, RA_BURST, RA_PRISM, RA_HALO, RA_PRISM},
           {4, RA_COLLAPSE, RA_BURST, RA_PRISM, RA_HALO}};
static const unsigned long RING_CLOCK_MS = 14000;
static const float RING_DWELL = .55f; // how much the gaps slow as they meet
static const float RING_HALO_MAX = 3.0f, RING_HALO_GAP = 40.0f;
static const unsigned long RING_HALO_WARN = 900, RING_HALO_OUT = 1000,
                           RING_HALO_HOLD = 500, RING_HALO_IN = 1800;
static bool bs_ring_gap(unsigned i) {
    return i < 16 ? i <= 2 : i - 16 <= 1;
}
// Where blade i is on screen, and its depth (z > 0: in front of the core).
static void bs_ring_place(unsigned i, float& x, float& y, float& z) {
    bool outer = i < 16;
    unsigned count = outer ? 16 : 11, slot = outer ? i : i - 16;
    float spin = boss.aux[outer ? AUX_RING_OUTER_SPIN : AUX_RING_INNER_SPIN];
    float tilt = boss.aux[outer ? AUX_RING_OUTER_TILT : AUX_RING_INNER_TILT];
    float axis = boss.aux[outer ? AUX_RING_OUTER_AXIS : AUX_RING_INNER_AXIS];
    float radius = (outer ? 106.0f * boss.aux[AUX_RING_HALO] : 70.0f)
                   * boss.aux[AUX_RING_SCALE];
    float a = slot * TWO_PI / count + spin;
    float px = cosf(a) * radius, py = sinf(a) * radius * cosf(tilt);
    z = sinf(a) * radius * sinf(tilt);
    x = boss.x + px * cosf(axis) - py * sinf(axis);
    y = boss.y + px * sinf(axis) + py * cosf(axis);
}
static void bs_ring_pos(unsigned i, float& x, float& y) {
    float z;
    bs_ring_place(i, x, y, z);
}
// The gaps' clock: phase 0 is the eclipse (both gaps facing the pilot's side).
static float bs_ring_phase() {
    float u = (bs_since(boss.born) % RING_CLOCK_MS) / float(RING_CLOCK_MS);
    return TWO_PI * u - RING_DWELL * sinf(TWO_PI * u);
}
static void bs_ring_update() {
    float t = bs_since(boss.born) / 1000.0f;
    boss.y = boss.home_y + 40 * sinf(TWO_PI * t / 8.0f);
    float vy = boss.y - boss.aux[AUX_RING_PREV_Y];
    boss.aux[AUX_RING_PREV_Y] = boss.y;
    float lean = bs_clamp(vy * .5f, -.25f, .25f);
    boss.aux[AUX_RING_LEAN] += (lean - boss.aux[AUX_RING_LEAN]) * .05f;
    lean = boss.aux[AUX_RING_LEAN];
    // The precession: each ring tips and turns on its own slow wobble.
    boss.aux[AUX_RING_OUTER_TILT] = .6f + .25f * sinf(t / 2.1f);
    boss.aux[AUX_RING_OUTER_AXIS] = .2f * sinf(t / 3.3f) + lean;
    boss.aux[AUX_RING_INNER_TILT] = .5f + .3f * sinf(t / 1.7f + 1);
    boss.aux[AUX_RING_INNER_AXIS] = .2f * sinf(t / 2.6f + 2) + lean;
    // The gaps: the outer one's middle is slot 1, the inner one's slot 0.5.
    float phi = bs_ring_phase();
    float outer = BOSS_PI + phi - TWO_PI / 16;
    float lock = boss.aux[AUX_RING_LOCK];
    if (lock > 0) {
        float w = lock * lock * (3 - 2 * lock);
        outer += w * bs_wrap(boss.aux[AUX_RING_LOCK_SPIN] - outer);
        if (boss.atk != RA_HALO) {
            boss.aux[AUX_RING_LOCK] = bs_max(0.0f, lock - 1.0f / 36);
        }
    }
    boss.aux[AUX_RING_OUTER_SPIN] = outer;
    boss.aux[AUX_RING_INNER_SPIN] = BOSS_PI - phi - .5f * TWO_PI / 11;
    if (boss.atk != RA_COLLAPSE) {
        boss.aux[AUX_RING_SCALE] = 1 + .02f * sinf(t * 2);
    }
    if (boss.atk != RA_HALO) {
        boss.aux[AUX_RING_HALO] = 1;
    }
    boss.aux[AUX_RING_CHARGING]
            = boss.atk == RA_BURST || boss.atk == RA_PRISM ? 1.0f : 0.0f;
    bool clear = true;
    for (unsigned i = 0; i < 27; i++) {
        BossPart& p = boss.parts[i];
        if (!p.exists && p.until && game_ms >= p.until) {
            p.exists = true;
            p.hp = 1;
            p.until = 0;
        }
        float z;
        bs_ring_place(i, p.x, p.y, z);
        p.state = z < 0 ? 1 : 0; // behind the core (drawn dimmer)
        if (p.exists && p.x < boss.x - 10 && fabsf(p.y - boss.y) < p.r + 10) {
            clear = false;
        }
    }
    boss.aux[AUX_RING_ECLIPSE] = clear ? 1.0f : 0.0f;
}
static void bs_ring_spawn_parts() {
    for (unsigned i = 0; i < 27; i++) {
        BossPart& p = boss.parts[i];
        p = {};
        p.exists = !bs_ring_gap(i); // the gaps never regrow
        p.kind = PK_BLADE;
        p.slot = i;
        p.hp = p.hp_max = 1;
        p.r = i < 16 ? 14 : 12;
    }
    boss.aux[AUX_RING_SCALE] = boss.aux[AUX_RING_HALO] = 1;
    boss.aux[AUX_RING_PREV_Y] = boss.y;
}
static void bs_ring_break(BossPart& p, unsigned long regrow) {
    p.exists = false;
    p.until = game_ms + regrow;
    bs_particles(p.x, p.y);
}
// The prism beam crossed a whole blade: it splits into two shards there.
static void bs_ring_prism_split(float from, float to) {
    unsigned n = 0;
    for (unsigned i = 0; i < 27; i++) {
        if (boss.parts[i].fire_at && bs_since(boss.parts[i].fire_at) < 3000) {
            n++;
        }
    }
    unsigned cap = bs_density(10) / 2;
    for (unsigned i = 0; i < 27 && n < cap; i++) {
        BossPart& p = boss.parts[i];
        if (!p.exists || (p.fire_at && bs_since(p.fire_at) < 3000)) {
            continue;
        }
        float a = bs_angle_to(boss.x, boss.y, p.x, p.y);
        float d0 = bs_wrap(a - from), d1 = bs_wrap(a - to);
        if ((d0 > 0) == (d1 > 0) || fabsf(d0) > .5f) {
            continue;
        }
        p.fire_at = game_ms;
        n++;
        bs_shot_at(SF_SHARD, p.x, p.y, to - .5f, 1.7f);
        bs_shot_at(SF_SHARD, p.x, p.y, to + .5f, 1.7f);
    }
}
static bool bs_ring_run(int id, unsigned long t) {
    switch (id) {
    case RA_BURST: {
        if (bs_at(t, 0)) {
            bs_hazard(HK_TELL, boss.x, boss.y, 0, 124, 0, 700, 0);
        }
        if (bs_at(t, 700)) {
            unsigned n = bs_density(12), made = 0;
            for (unsigned k = 0; k < 16 && made < n; k += 2) {
                BossPart& p = boss.parts[k];
                if (!p.exists) {
                    continue;
                }
                float a = bs_angle_to(boss.x, boss.y, p.x, p.y);
                bs_shot_at(SF_SHARD, p.x, p.y, a, 1.6f);
                bs_ring_break(p, 3000);
                made++;
            }
            for (unsigned k = 0; k < 11 && made < n; k += 3) {
                BossPart& p = boss.parts[16 + k];
                if (!p.exists) {
                    continue;
                }
                bs_shot_at(SF_SHARD,
                           p.x,
                           p.y,
                           bs_angle_to(boss.x, boss.y, p.x, p.y),
                           1.6f);
                bs_ring_break(p, 3000);
                made++;
            }
        }
        return t >= 1000;
    }
    case RA_PRISM: {
        // scratch: 0 the beam's angle last tick (it moves on its own).
        if (bs_at(t, 0)) {
            float mid
                    = bs_angle_to(boss.x, boss.y, boss.target_x, boss.target_y);
            float dir = rock_random_bounded(2) ? 1.0f : -1.0f;
            float start = mid - dir * .785f, rate = dir * .018f;
            BossHazard *h = bs_hazard(
                    HK_BEAM, boss.x, boss.y, start, 0, start, 900, 1745);
            if (h) {
                h->d = rate;
                h->e = start + dir * 1.5708f;
            }
            boss.scratch[0] = start;
        }
        if (t > 900 && t < 900 + 1745) {
            for (const BossHazard& h : boss.hz) {
                if (h.active && h.kind == HK_BEAM && !h.warn_left) {
                    bs_ring_prism_split(boss.scratch[0], h.a);
                    boss.scratch[0] = h.a;
                    break;
                }
            }
        }
        return t >= 900 + 1745 + 100;
    }
    case RA_HALO: {
        // scratch: 0 the hazard's index + 1.
        float gap = BOSS_PI + .32f * sinf(t / 1300.0f);
        unsigned long live = RING_HALO_OUT + RING_HALO_HOLD + RING_HALO_IN;
        if (bs_at(t, 0)) {
            BossHazard *h = bs_hazard(HK_RING,
                                      boss.x,
                                      boss.y,
                                      gap,
                                      106,
                                      RING_HALO_GAP / 106,
                                      RING_HALO_WARN,
                                      live);
            boss.scratch[0] = h ? float(h - boss.hz) + 1 : 0;
            if (h) {
                h->d = h->e = 0; // the fight drives its radius and gap
            }
        }
        float scale = 1;
        if (t >= RING_HALO_WARN) {
            unsigned long u = t - RING_HALO_WARN;
            float k = u < RING_HALO_OUT ? u / float(RING_HALO_OUT)
                      : u < RING_HALO_OUT + RING_HALO_HOLD
                              ? 1
                              : 1
                                        - bs_min(1.0f,
                                                 (u - RING_HALO_OUT
                                                  - RING_HALO_HOLD)
                                                         / float(RING_HALO_IN));
            k = k * k * (3 - 2 * k);
            scale = 1 + (RING_HALO_MAX - 1) * k;
        }
        boss.aux[AUX_RING_HALO] = scale;
        boss.aux[AUX_RING_HALO_GAP] = gap;
        boss.aux[AUX_RING_LOCK_SPIN] = gap - TWO_PI / 16;
        boss.aux[AUX_RING_LOCK] = bs_min(1.0f, t / float(RING_HALO_WARN));
        if (boss.scratch[0] > 0) {
            BossHazard& h = boss.hz[unsigned(boss.scratch[0]) - 1];
            if (h.active && h.kind == HK_RING) {
                float r = 106 * scale * boss.aux[AUX_RING_SCALE];
                h.x = boss.x;
                h.y = boss.y;
                h.a = gap;
                h.b = r;
                h.c = RING_HALO_GAP / r;
            }
        }
        return t >= RING_HALO_WARN + live + 100;
    }
    case RA_COLLAPSE:
        if (bs_at(t, 0)) {
            float gap
                    = bs_angle_to(boss.x, boss.y, boss.target_x, boss.target_y)
                      + (boss.cycle % 2 ? 1.0f : -1.0f);
            BossHazard *h = bs_hazard(
                    HK_RING, boss.x, boss.y, gap, 40, .61f, 1200, 4500);
            if (h) {
                h->d = 2.0f;
                h->e = 0;
            }
            bs_hazard(HK_TELL, boss.x, boss.y, 0, 120, 0, 1200, 0);
        }
        if (t < 1200) {
            boss.aux[AUX_RING_SCALE] = 1 - .8f * (t / 1200.0f);
        }
        if (bs_at(t, 1200)) {
            boss.aux[AUX_RING_SCALE] = 1;
            for (unsigned i = 0; i < 27; i++) {
                BossPart& p = boss.parts[i];
                if (p.exists) {
                    bs_ring_break(p, 2500);
                }
            }
            display_shake(1);
        }
        return t >= 1300;
    }
    return true;
}
// ================================================================ SHARDLING
// Where blade k is: on a ring that tilts and wobbles, like the Ringwarden's.
static void bs_shard_blade(unsigned k, float& x, float& y) {
    float a = boss.aux[AUX_SHARD_SPIN] + k * TWO_PI / 3;
    float px = cosf(a) * 46, py = sinf(a) * 46 * cosf(boss.aux[AUX_SHARD_TILT]);
    float c = cosf(boss.aux[AUX_SHARD_AXIS]),
          s = sinf(boss.aux[AUX_SHARD_AXIS]);
    x = boss.x + px * c - py * s;
    y = boss.y + px * s + py * c;
}
static void bs_shardling_update() {
    boss.aux[AUX_SHARD_SPIN] += .02f;
    float t = bs_since(boss.born) / 1000.0f;
    boss.aux[AUX_SHARD_TILT] = .9f + .35f * sinf(t / .9f);
    boss.aux[AUX_SHARD_AXIS] = .4f * sinf(t / 1.4f);
    float want = boss.aux[AUX_SHARD_KITE_X] > 0 ? boss.aux[AUX_SHARD_KITE_X]
                                                : boss.home_x;
    boss.x += bs_clamp(want - boss.x, -1.1f, 1.1f);
    boss.y += bs_clamp(bs_clamp(boss.target_y, 70, 205) - boss.y, -.8f, .8f);
}
static bool bs_shardling_run(int id, unsigned long t) {
    (void)id;
    float ang = bs_angle_to(boss.x, boss.y, boss.target_x, boss.target_y);
    float mx = boss.x + cosf(ang) * 62, my = boss.y + sinf(ang) * 62;
    if (bs_at(t, 0)) {
        bs_hazard(HK_AIM, mx, my, ang, 480, 0, 500, 0);
        boss.aux[AUX_SHARD_KITE_X] = 300; // kite in
    }
    for (int k = 0; k < 3; k++) {
        if (bs_at(t, 500 + k * 150)) {
            bs_shot_at(SF_FAST, mx, my, ang, 2.6f);
        }
    }
    if (bs_at(t, 1100)) {
        boss.aux[AUX_SHARD_KITE_X] = boss.home_x;
    }
    return t >= 1200;
}

static int bs_ring_pick() {
    return bs_seq_pick(SEQ_RING, 3);
}
static void bs_ring_circles() {
    for (unsigned i = 0; i < 27; i++) {
        if (boss.parts[i].exists) {
            bs_circle(boss.parts[i].x,
                      boss.parts[i].y,
                      boss.parts[i].r,
                      BC_PART,
                      i,
                      3);
        }
    }
    bs_circle(boss.x, boss.y, 26, BC_CORE, 0, 3);
}
static unsigned bs_ring_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y, 28);
    // While the halo lock is out, its light is the danger: the outer blades
    // riding it do not touch.
    bool halo = boss.aux[AUX_RING_HALO] > 1.02f;
    for (unsigned i = 0; i < 27 && n < 32; i++) {
        if (boss.parts[i].exists && !(halo && i < 16)) {
            bs_guard_body(out,
                          n,
                          boss.parts[i].x,
                          boss.parts[i].y,
                          boss.parts[i].r - 2);
        }
    }
    return n;
}
// A blade hit: it breaks and regrows after six seconds.
static void bs_ring_hit(BossPart& p, unsigned, unsigned, bool) {
    bs_ring_break(p, 6000);
}
static void bs_shardling_circles() {
    for (unsigned k = 0; k < 3; k++) {
        float bx, by;
        bs_shard_blade(k, bx, by);
        bs_circle(bx, by, 11, BC_BLOCK, 0, 1);
    }
    bs_circle(boss.x, boss.y, 22, BC_CORE, 0, 3);
}
static unsigned bs_shardling_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x, boss.y, 24);
    for (unsigned k = 0; k < 3; k++) {
        float bx, by;
        bs_shard_blade(k, bx, by);
        bs_guard_body(out, n, bx, by, 11);
    }
    return n;
}
static int bs_shardling_pick() {
    return MA_SHARDS;
}
static const BossOps OPS_RINGWARDEN = {352,
                                       135,
                                       6,
                                       3,
                                       {66, 33},
                                       {1200, 1100, 1000},
                                       bs_ring_spawn_parts,
                                       bs_ring_update,
                                       bs_ring_pick,
                                       bs_ring_run,
                                       bs_ring_circles,
                                       bs_ring_body,
                                       nullptr,
                                       nullptr,
                                       bs_ring_hit};
static const BossOps OPS_SHARDLING = {370,
                                      135,
                                      8,
                                      1,
                                      {0, 0},
                                      {1000, 1000, 1000},
                                      nullptr,
                                      bs_shardling_update,
                                      bs_shardling_pick,
                                      bs_shardling_run,
                                      bs_shardling_circles,
                                      bs_shardling_body,
                                      nullptr,
                                      nullptr,
                                      nullptr};
