#pragma once

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
        // It rises to a lane near the pilot's row, bow on, the lane marked edge
        // to edge (sometimes sloping: it dives or climbs across); then it
        // crosses the field with its engines blazing, leaving a wake of debris.
        // From phase 2 it may turn off the field and make a second pass along
        // another lane, marked while it is out of sight, before coming home.
        const unsigned long rise = bs_bastion_rise();
        if (bs_at(t, 0)) {
            float lane, k;
            bs_bastion_pick_lane(lane, k, -1);
            boss.aux[AUX_BASTION_LANE] = lane;
            boss.scratch[RAM_SLOPE] = k;
            boss.scratch[RAM_TWICE]
                    = boss.phase >= 2 && bs_rand(0, 100) < 50 ? 1.0f : 0.0f;
            BossHazard *h = bs_hazard(HK_LANE,
                                      SCREEN_W + 10,
                                      lane,
                                      bs_atan2(k, -1),
                                      (SCREEN_W + 20) * sqrtf(1 + k * k),
                                      RAM_HALF,
                                      RAM_RISE,
                                      RAM_CROSS);
            boss.scratch[RAM_HZ] = h ? float(h - boss.hz) + 1 : 0;
            boss.scratch[RAM_HZ2] = 0;
            if (h) {
                h->e = RAM_STYLE;
            }
        }
        // The second lane is marked as the ship leaves the field, for as long
        // as it is out of sight.
        if (boss.scratch[RAM_TWICE] > 0 && bs_at(t, rise + RAM_CROSS)) {
            float lane2, k2;
            bs_bastion_pick_lane(lane2, k2, boss.aux[AUX_BASTION_LANE]);
            boss.scratch[RAM_LANE2] = lane2;
            boss.scratch[RAM_SLOPE2] = k2;
            BossHazard *h2 = bs_hazard(HK_LANE,
                                       SCREEN_W + 10,
                                       lane2,
                                       bs_atan2(k2, -1),
                                       (SCREEN_W + 20) * sqrtf(1 + k2 * k2),
                                       RAM_HALF,
                                       RAM_AWAY,
                                       RAM_CROSS);
            boss.scratch[RAM_HZ2] = h2 ? float(h2 - boss.hz) + 1 : 0;
            if (h2) {
                h2->e = RAM_STYLE;
            }
        }
        // Once it goes, the danger is the ship: the lane runs from its stern
        // to its bow as it crosses.
        bool second = boss.scratch[RAM_TWICE] > 0 && t >= rise + RAM_CROSS;
        unsigned slot = unsigned(boss.scratch[second ? RAM_HZ2 : RAM_HZ]);
        float k = boss.scratch[second ? RAM_SLOPE2 : RAM_SLOPE],
              y0
              = second ? boss.scratch[RAM_LANE2] : boss.aux[AUX_BASTION_LANE];
        bool crossing = second ? t >= rise + RAM_CROSS + RAM_AWAY
                                         && t < rise + 2 * RAM_CROSS + RAM_AWAY
                               : t >= rise && t < rise + RAM_CROSS;
        if (crossing && slot > 0) {
            BossHazard& h = boss.hz[slot - 1];
            if (h.active && h.kind == HK_LANE && h.e == RAM_STYLE) {
                h.x = boss.x + 170;
                h.y = bs_bastion_lane_y(y0, k, h.x);
                h.b = 340 * sqrtf(1 + k * k);
            }
        }
        unsigned long since
                = second ? t - rise - RAM_CROSS - RAM_AWAY : t - rise;
        if (crossing && since % 160 < FRAME_TIME_MS
            && boss.x + 170 < SCREEN_W) {
            bs_shot(SF_PELLET,
                    boss.x + 170,
                    bs_bastion_lane_y(y0, k, boss.x + 170) + bs_rand(-55, 55),
                    bs_rand(-.35f, .1f),
                    bs_rand(-.15f, .15f),
                    1,
                    2500);
        }
        return t >= bs_bastion_ram_total();
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

