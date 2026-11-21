#pragma once
// Ninefold's attacks, each with a body (nextSteps.md P2.1): the comets whip
// from its tails over an arched back, the foxfire is scooped and tossed from
// its jaws, the blink is a leap that dissolves into stars and lands on another
// perch, and the illusion is a split: a cocoon of tails, then three smaller
// foxes running to their places out of step.
static unsigned bs_fox_tails() {
    unsigned n = 0;
    for (unsigned i = 0; i < 9; i++) {
        n += boss.parts[i].exists && boss.parts[i].kind == PK_TAIL;
    }
    return n;
}
static void bs_fox_open_core() {
    boss.stamp[STAMP_FOX_OPEN_UNTIL] = game_ms + 2500;
}
static void bs_fox_react(int kind) {
    if (boss.fox.gait == FG_SIT) {
        boss.fox.react = kind;
        boss.fox.react_at = game_ms;
    }
}

// The comets: the tails draw up over its back (700 ms), then whip forward one
// after another; each comet leaves its tail's tip down a warned line. Fewer
// tails, fewer but faster comets.
static bool bs_fox_comets(unsigned long t) {
    unsigned tails = bs_fox_tails(), n = bs_max(2, (tails + 1) / 2);
    float speed = 1.8f + (9 - tails) * .12f;
    unsigned long end = 800 + n * 150 + 500;
    boss.fox.pose = t < 700 || t >= end - 300 ? FP_ARCH_0 : FP_ARCH_1;
    for (unsigned k = 0; k < n; k++) {
        unsigned i = (k * 9 / n) % 9;
        if (bs_at(t, 300 + k * 150)) {
            float sx, sy;
            bs_fox_at(FOX_POSE_TAIL[FP_ARCH_1][i], sx, sy);
            float a = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
            BossHazard *h = bs_hazard(HK_AIM, sx, sy, a, 480, 0, 500, 0);
            if (h) {
                h->d = k;
            }
        }
        if (bs_at(t, 800 + k * 150)) {
            for (const BossHazard& h : boss.hz) {
                if (h.active && h.kind == HK_AIM && h.d == k
                    && h.warn_left <= FRAME_TIME_MS) {
                    bs_shot_at(SF_FAST, h.x, h.y, h.a, speed);
                    break;
                }
            }
        }
    }
    return t >= end;
}
// Foxfire: it ducks and scoops while the flames gather in its jaws (700 ms),
// tosses its head to throw three slow homing wisps, then licks its chops and
// shakes its head.
static bool bs_fox_foxfire(unsigned long t) {
    // Then it licks its chops (out, up to the nose, out) and shakes its head.
    boss.fox.pose = t < 700        ? FP_TOSS_0
                    : t < 1500     ? FP_TOSS_1
                    : t < 1770     ? (t - 1500) / 90 % 2 ? FP_LICK_1 : FP_LICK_0
                    : (t / 70) % 2 ? FP_SIT_UP
                                   : FP_SIT_DOWN;
    for (unsigned k = 0; k < 3; k++) {
        if (bs_at(t, 700 + k * 250)) {
            float a = BOSS_PI + (k - 1.0f) * .9f, sx, sy;
            bs_fox_at(FOX_POSE_JAW[FP_TOSS_1], sx, sy);
            BossShot *s = bs_shot_at(SF_MISSILE, sx, sy, a, 1.4f, 2, 3600);
            if (s) {
                s->turn = .03f;
            }
        }
    }
    return t >= 1900;
}
// The blink: a crouch with its rear wiggling (the warning), a leap that lifts
// it 70 px and dissolves it into stars at the top, then it reforms above
// another perch, lands front paws first and skids.
static bool bs_fox_blink(unsigned long t) {
    BossFox& f = boss.fox;
    const float lift = 70;
    if (bs_at(t, 0)) {
        bs_hazard(HK_TELL, f.x, f.y, 0, 80, 0, 500, 0);
        boss.scratch[0] = float(bs_fox_pick_perch(true));
    }
    if (t < 500) {
        f.pose = FP_CROUCH;
        return false;
    }
    int k = int(boss.scratch[0]);
    float nx = FOX_PERCH_X[k % 3], ny = FOX_PERCH_Y[k / 3];
    if (t < 1000) {
        f.pose = FP_LEAP;
        boss.aux[AUX_FOX_ALPHA] = 1 - bs_clamp((t - 800) / 150.0f, 0, 1);
        boss.scratch[1] = -lift * bs_clamp((t - 500) / 400.0f, 0, 1);
        if (bs_at(t, 880)) {
            boss.stamp[STAMP_FOX_BLINK_UNTIL] = game_ms + 300;
        }
        return false;
    }
    if (bs_at(t, 1000)) { // gone: it is above the next perch now
        f.perch = k;
        f.face = nx > f.x + 1 ? 1 : nx < f.x - 1 ? -1 : f.face;
        f.x = f.fx = f.tx = nx;
        f.y = f.fy = f.ty = ny;
    }
    if (t < 1500) {
        float u = bs_clamp((t - 1100) / 400.0f, 0, 1);
        f.pose = u < .85f ? FP_LEAP : FP_LAND;
        boss.aux[AUX_FOX_ALPHA] = bs_clamp((t - 1100) / 130.0f, 0, 1);
        boss.scratch[1] = -lift * (1 - u * u);
        return false;
    }
    boss.scratch[1] = 0;
    boss.aux[AUX_FOX_ALPHA] = 1;
    f.pose = -1;
    f.speed = FOX_RUN_SPEED;
    if (bs_at(t, 1500)) {
        bs_fox_phase(FG_STOP); // the skid, then it turns back if it must
    }
    return t >= 1500;
}
