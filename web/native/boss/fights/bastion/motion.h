#pragma once

// The rise lasts as long as the lane's warning (longer with the longer-warnings
// assist), so the hull never crosses a lane that is still only marked.
static unsigned long bs_bastion_rise() {
    return boss_assist_long ? RAM_RISE * 13 / 10 : RAM_RISE;
}
// Height of a lane starting at (SCREEN_W + 10, y0) with slope k, at x.
static float bs_bastion_lane_y(float y0, float k, float x) {
    return y0 + k * (SCREEN_W + 10 - x);
}
// Picks a lane near the pilot's row (not just top or bottom half), sometimes
// sloping, and keeps both of its ends inside the field.
static void bs_bastion_pick_lane(float& y0, float& k, float avoid) {
    for (int tries = 0; tries < 6; tries++) {
        y0 = bs_clamp(boss.target_y + bs_rand(-45, 45), 60, 210);
        k = bs_rand(0, 100) < 45 ? bs_rand(-RAM_SLOPE_MAX, RAM_SLOPE_MAX) : 0;
        float end = bs_bastion_lane_y(y0, k, -10);
        if (end < 75 || end > 195) {
            k = 0;
        }
        if (avoid < 0 || fabsf(y0 - avoid) > 60) {
            return;
        }
    }
    y0 = avoid < 135 ? 200 : 70;
}
static float bs_bastion_ease(float u) {
    u = bs_clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
}
// Where the ramming run has the ship, from the rest point (x, y), t ms in:
// it rises to the lane's start, crosses along it (diving or climbing if the
// lane slopes), and either comes round to rest from the right or, on a second
// pass, comes straight back in along another lane first. `pitch` is the hull's
// angle along a sloping lane.
static void bs_bastion_ram_pose(
        unsigned long t, float& x, float& y, float& th, float& pitch) {
    const unsigned long rise = bs_bastion_rise();
    float lane = boss.aux[AUX_BASTION_LANE], k = boss.scratch[RAM_SLOPE];
    float hx = x, hy = y;
    pitch = 0;
    if (t < rise) {
        float u = t / float(rise);
        float on = bs_bastion_lane_y(lane, k, hx + RAM_BACKOFF);
        y = hy + (on - hy) * bs_bastion_ease(u * 1.7f);
        // It pulls back to the right as it turns to the lane, so the nose
        // never sweeps the pilot's row on the way up.
        x = hx + RAM_BACKOFF * bs_bastion_ease(u * 1.6f);
        th = .6f + .4f * bs_clamp((u - .5f) / .5f, 0, 1);
        pitch = -bs_atan2(k, 1) * bs_clamp((u - .5f) / .5f, 0, 1);
        return;
    }
    t -= rise;
    if (t < RAM_CROSS) {
        float u = t / float(RAM_CROSS);
        x = hx + RAM_BACKOFF - 850 * (u * sqrtf(u));
        y = bs_bastion_lane_y(lane, k, x);
        th = 1;
        pitch = -bs_atan2(k, 1);
        return;
    }
    t -= RAM_CROSS;
    if (boss.scratch[RAM_TWICE] > 0) {
        if (t < RAM_AWAY) {
            x = 900; // off the field, turning for the second pass
            y = bs_bastion_lane_y(boss.scratch[RAM_LANE2],
                                  boss.scratch[RAM_SLOPE2],
                                  SCREEN_W);
            th = .8f;
            return;
        }
        t -= RAM_AWAY;
        if (t < RAM_CROSS) {
            float u = t / float(RAM_CROSS), k2 = boss.scratch[RAM_SLOPE2];
            x = SCREEN_W + 180 - 900 * u;
            y = bs_bastion_lane_y(boss.scratch[RAM_LANE2], k2, x);
            th = 1;
            pitch = -bs_atan2(k2, 1);
            return;
        }
        t -= RAM_CROSS;
    }
    if (t < RAM_AWAY) {
        x = 900; // off the field, coming round
        y = hy;
        th = .5f;
    } else {
        float u = (t - RAM_AWAY) / float(RAM_BACK);
        x = 820 + (hx - 820) * bs_bastion_ease(u);
        y = hy;
        th = .6f;
    }
}
static unsigned long bs_bastion_ram_total() {
    return bs_bastion_rise() + RAM_CROSS + RAM_AWAY + RAM_BACK
           + (boss.scratch[RAM_TWICE] > 0 ? RAM_AWAY + RAM_CROSS : 0);
}
static unsigned bs_bastion_dead_guns() {
    unsigned n = 0;
    for (unsigned i = 0; i < 3; i++) {
        n += !boss.parts[i].exists;
    }
    return n;
}
static void bs_bastion_update() {
    float thrust = .3f, pitch = 0;
    bool ramming = boss.atk == BA_RAM;
    if (ramming) {
        bs_bastion_ram_pose(
                bs_since(boss.atk_t0), boss.x, boss.y, thrust, pitch);
        boss.camp_ms[0] = boss.camp_ms[1]
                = 0; // it passes you; that is not camping
    }
    float vy = boss.y - boss.aux[AUX_BASTION_PREV_Y];
    boss.aux[AUX_BASTION_PREV_Y] = boss.y;
    if (fabsf(vy) > 20) {
        vy = 0; // it came back round from the far side
    }
    // It banks into its turns (nose up as it climbs, down as it dives), burns
    // harder to turn, and lists toward the side whose engine it lost; along a
    // sloping ram lane the hull points down the lane.
    float list = .03f
                 * (float(boss.parts[BASTION_ENGINE0].state)
                    - float(boss.parts[BASTION_ENGINE0 + 1].state));
    float bank
            = ramming && pitch != 0 ? pitch : bs_clamp(-vy * .08f, -.1f, .1f);
    float roll = bank + list;
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
