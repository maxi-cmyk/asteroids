#pragma once

// ---------------------------------------------------------------- pilots
static bool bs_alive(unsigned i) {
    return i < boss_hull_n && boss_hulls[i] && boss_hulls[i]->alive;
}
static unsigned bs_alive_count() {
    unsigned n = 0;
    for (unsigned i = 0; i < boss_hull_n; i++) {
        n += bs_alive(i);
    }
    return n;
}
static unsigned bs_lives_total() {
    unsigned n = 0;
    for (unsigned i = 0; i < boss_hull_n; i++) {
        n += boss_hulls[i] ? boss_hulls[i]->lives : 0;
    }
    return n;
}
// Aim memory for one attack: the nearer pilot, then every other attack the
// farther.
static void bs_acquire() {
    int pick = -1;
    unsigned alive = bs_alive_count();
    if (!alive) {
        return;
    }
    if (alive == 1) {
        for (unsigned i = 0; i < boss_hull_n; i++) {
            if (bs_alive(i)) {
                pick = i;
            }
        }
    } else {
        float d0 = bs_dist(boss.x,
                           boss.y,
                           boss_hulls[0]->position_x,
                           boss_hulls[0]->position_y);
        float d1 = bs_dist(boss.x,
                           boss.y,
                           boss_hulls[1]->position_x,
                           boss_hulls[1]->position_y);
        bool near_first = d0 <= d1;
        bool want_near
                = boss.seq_total % 2
                  == 1; // the first attack of a fight picks the nearer pilot
        pick = want_near == near_first ? 0 : 1;
    }
    boss.target_x = boss_hulls[pick]->position_x;
    boss.target_y = boss_hulls[pick]->position_y;
}
// Nearest pilot to a point, for homing and live aiming.
static bool bs_nearest(float x, float y, float& px, float& py) {
    float best = 1e9f;
    bool found = false;
    for (unsigned i = 0; i < boss_hull_n; i++) {
        if (!bs_alive(i)) {
            continue;
        }
        float d = bs_dist(
                x, y, boss_hulls[i]->position_x, boss_hulls[i]->position_y);
        if (d < best) {
            best = d;
            px = boss_hulls[i]->position_x;
            py = boss_hulls[i]->position_y;
            found = true;
        }
    }
    return found;
}
static void bs_hit_pilot(unsigned i) {
    boss.hits_taken++;
    if (boss.phase == 0) {
        boss.entrance_hits++;
    }
    boss_hit_hook(i);
}

