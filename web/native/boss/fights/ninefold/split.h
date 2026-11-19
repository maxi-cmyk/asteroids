#pragma once
// Ninefold's illusion as a split (nextSteps.md P2.1): it spins on the spot
// while its tails wrap it into a cocoon that shrinks to .6 (600 ms, the
// warning); the cocoon bursts and three foxes run to their places, each at its
// own pace. Only the real one has lit eyes; each decoy fires one needle. Pop
// both to see through it (a wet-dog shake, the mark opens). At the end the
// decoys run back into the real fox, which runs back to a perch and grows to
// full size.
//
// Decoys are parts (PK_DECOY): `u, v` where they run to, `ang` their speed,
// `state` 1 while running (0 seated), `link` 1 once they run home to vanish.
static void bs_fox_decoys_update() {
    for (unsigned i = 9; i < BOSS_PARTS; i++) {
        BossPart& p = boss.parts[i];
        if (!p.exists || p.kind != PK_DECOY || p.state != 1) {
            continue;
        }
        float d = bs_dist(p.x, p.y, p.u, p.v);
        if (d <= p.ang) {
            p.x = p.u;
            p.y = p.v;
            p.state = 0;
            if (p.link == 1) { // home: it runs into the real fox
                p.exists = false;
            }
            continue;
        }
        p.x += (p.u - p.x) / d * p.ang;
        p.y += (p.v - p.y) / d * p.ang;
    }
}
static unsigned bs_fox_decoys() {
    unsigned n = 0;
    for (unsigned i = 9; i < BOSS_PARTS; i++) {
        n += boss.parts[i].exists && boss.parts[i].kind == PK_DECOY;
    }
    return n;
}
static void bs_fox_split() {
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
        p->x = boss.fox.x;
        p->y = boss.fox.y;
        p->r = 16;
        p->u = FOX_ILLUSION_AT[k][0];
        p->v = FOX_ILLUSION_AT[k][1];
        p->ang = FOX_SPLIT_SPEED[k];
        p->state = 1;
    }
    bs_fox_go(FOX_ILLUSION_AT[real][0],
              FOX_ILLUSION_AT[real][1],
              FOX_SPLIT_SPEED[real]);
    bs_fox_phase(FG_RUN); // straight out of the cocoon, no crouch
    boss.scratch[0] = 1;  // up and not yet seen through
}
static bool bs_fox_illusion(unsigned long t) {
    BossFox& f = boss.fox;
    if (bs_at(t, 0)) {
        bs_hazard(HK_TELL, f.x, f.y, 0, 90, 0, 600, 0);
        boss.scratch[2] = 0; // when the decoys were called home (0: not yet)
    }
    if (t < 600) { // the cocoon: it spins, the tails wrap it, it shrinks
        f.pose = FP_COCOON_0 + int(t / 110) % 4;
        float u = t / 600.0f;
        boss.aux[AUX_FOX_SCALE]
                = 1 - (1 - FOX_ILLUSION_SCALE) * u * u * (3 - 2 * u);
        return false;
    }
    if (bs_at(t, 600)) {
        f.pose = -1;
        boss.aux[AUX_FOX_SCALE] = FOX_ILLUSION_SCALE;
        bs_fox_split();
    }
    if (bs_at(t, 1400)) { // each decoy aims a needle from its head
        for (unsigned i = 9; i < BOSS_PARTS; i++) {
            BossPart& p = boss.parts[i];
            if (!p.exists || p.kind != PK_DECOY) {
                continue;
            }
            float hx = p.x + FOX_POSE_HEAD[FP_SIT][0] * FOX_ILLUSION_SCALE,
                  hy = p.y + FOX_POSE_HEAD[FP_SIT][1] * FOX_ILLUSION_SCALE;
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
            if (h.active && h.kind == HK_AIM && h.warn_left <= FRAME_TIME_MS) {
                bs_shot_at(SF_NEEDLE, h.x, h.y, h.a, 2.2f);
            }
        }
    }
    if (t > 600 && !bs_fox_decoys() && boss.scratch[0] > .5f) {
        boss.scratch[0] = 0; // both popped: seen through
        bs_fox_open_core();
        bs_fox_react(FR_SHAKE);
    }
    // At 3600 (or once both are popped and it has settled) the decoys run home.
    if ((t >= 3600 || (t >= 2000 && !bs_fox_decoys())) && boss.scratch[2] == 0
        && f.gait == FG_SIT) {
        boss.scratch[2] = float(t);
        for (unsigned i = 9; i < BOSS_PARTS; i++) {
            BossPart& p = boss.parts[i];
            if (p.exists && p.kind == PK_DECOY) {
                p.u = f.x;
                p.v = f.y;
                p.state = 1;
                p.link = 1;
            }
        }
    }
    if (boss.scratch[2] == 0 || bs_fox_decoys()) {
        return false;
    }
    // All home: the small fox runs back to the nearest perch, then grows in one
    // shake.
    if (boss.scratch[2] > 0) {
        int best = 0;
        for (int k = 1; k < 9; k++) {
            if (bs_dist(FOX_PERCH_X[k % 3], FOX_PERCH_Y[k / 3], f.x, f.y)
                < bs_dist(FOX_PERCH_X[best % 3],
                          FOX_PERCH_Y[best / 3],
                          f.x,
                          f.y)) {
                best = k;
            }
        }
        boss.scratch[2] = -1;
        f.perch = best;
        bs_fox_go(FOX_PERCH_X[best % 3], FOX_PERCH_Y[best / 3], FOX_RUN_SPEED);
        bs_fox_phase(FG_RUN);
        boss.scratch[3] = 0;
    }
    if (f.gait != FG_SIT) {
        return false;
    }
    if (boss.scratch[3] == 0) {
        boss.scratch[3] = float(t);
    }
    float u = bs_clamp((t - boss.scratch[3]) / 500.0f, 0, 1);
    boss.aux[AUX_FOX_SCALE] = FOX_ILLUSION_SCALE + (1 - FOX_ILLUSION_SCALE) * u;
    f.pose = u < 1 ? FP_SHAKE_0 + int(t / 90) % 3 : -1;
    if (u >= 1) {
        boss.aux[AUX_FOX_SCALE] = 1;
        return true;
    }
    return false;
}
