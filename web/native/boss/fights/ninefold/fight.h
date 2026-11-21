#pragma once
// Ninefold's fight (nextSteps.md P2.1): the per-tick update (footwork, the pose
// it shows, tails as health, reactions), picking and running attacks only once
// it has sat down, its hit circles and contact, all from the current pose.
static bool bs_fox_open() {
    return boss.kind == BK_LENSIMP
           && game_ms < boss.stamp[STAMP_FOX_OPEN_UNTIL];
}
static bool bs_blinking() {
    return boss.kind == BK_LENSIMP && boss.stamp[STAMP_FOX_BLINK_UNTIL]
           && game_ms < boss.stamp[STAMP_FOX_BLINK_UNTIL];
}
static void bs_fox_begin() {
    for (unsigned i = 0; i < 9; i++) {
        BossPart& p = boss.parts[i];
        p = {};
        p.exists = true;
        p.kind = PK_TAIL;
        p.slot = i;
        p.r = 10;
    }
    boss.fox = {};
    boss.fox.perch = 5; // its home, (340, 140): it gallops in to it and skids
    boss.fox.x = boss.fox.tx = boss.home_x;
    boss.fox.y = boss.fox.ty = boss.home_y;
    boss.aux[AUX_FOX_SCALE] = 1;
    boss.aux[AUX_FOX_ALPHA] = 1;
    boss.aux[AUX_FOX_FACE] = -1;
}
// The reaction drawn while it sits: a yelp and a full turn to look at its
// tails, or a wet-dog shake. Returns the pose, or -1 when there is none.
static int bs_fox_react_pose() {
    BossFox& f = boss.fox;
    unsigned long in = game_ms - f.react_at;
    // A tail lost: it yelps (400 ms), turns a full circle on the spot to look
    // at its tails (900 ms; the face runs -1 to 1 and back as a cosine, so the
    // renderer squeezes it through side-on), then glares at the pilot (400 ms).
    // The mark is open throughout: the daze is the window.
    if (f.react == FR_YELP && in < 1700) {
        if (in < 400) {
            return FP_YELP;
        }
        if (in < 1300) {
            float u = (in - 400) / 900.0f;
            boss.aux[AUX_FOX_FACE] = -cosf(u * TWO_PI);
            return FP_WALK_0 + int((in - 400) / 110) % 4;
        }
        boss.aux[AUX_FOX_FACE] = -1;
        return FP_SIT_BRISTLE;
    }
    if (f.react == FR_SHAKE && in < 900) {
        return in < 600 ? FP_SHAKE_0 + int(in / 90) % 3 : FP_STAND;
    }
    f.react = FR_NONE;
    return -1;
}
static void bs_fox_update() {
    BossFox& f = boss.fox;
    boss.aux[AUX_FOX_CLOCK] += FRAME_TIME_MS / 1000.0f;
    if (!boss.phase) {
        // The entrance: it gallops in from the right (the framework slides it).
        f.x = boss.home_x;
        f.y = boss.home_y;
        f.gait = FG_RUN;
        f.dist = (boss.home_x + 160 - boss.x);
        f.fx = f.tx = f.x;
        f.fy = f.ty = f.y;
        f.speed = FOX_RUN_SPEED;
        f.phase_at = game_ms;
    } else {
        // After an attack it moves to another perch (the blink and the
        // illusion have already moved it).
        if (f.last_atk && !boss.atk && f.last_atk != NA_BLINK
            && f.last_atk != NA_ILLUSION && f.gait == FG_SIT) {
            bs_fox_to_perch(bs_fox_pick_perch(false));
        }
        f.last_atk = boss.atk;
        if (!boss.atk) {
            f.pose = -1;
        }
        bs_fox_move();
        boss.x = boss.home_x = f.x;
        boss.y = boss.home_y = f.y;
        if (boss.atk == NA_BLINK) {
            boss.y += boss.scratch[1];
        }
    }
    int react = f.gait == FG_SIT && f.pose < 0 ? bs_fox_react_pose() : -1;
    if (react < 0) {
        boss.aux[AUX_FOX_FACE] = float(f.face);
    }
    int pose = react >= 0 ? react : f.pose >= 0 ? f.pose : bs_fox_move_pose();
    boss.aux[AUX_FOX_POSE] = float(pose);
    boss.aux[AUX_FOX_STEP] = float(int(
            f.dist
            / (f.speed > FOX_WALK_SPEED ? FOX_RUN_STRIDE : FOX_WALK_STRIDE)));
    float s = bs_fox_scale();
    for (unsigned i = 0; i < 9; i++) {
        float x, y;
        float off[2] = {FOX_POSE_TAIL[pose][i][0], FOX_POSE_TAIL[pose][i][1]};
        x = boss.x + (boss.aux[AUX_FOX_FACE] > 0 ? -off[0] : off[0]) * s;
        y = boss.y + off[1] * s;
        boss.parts[i].x = x;
        boss.parts[i].y = y;
    }
    bs_fox_decoys_update();
    // Health is the tail count: shed tails (outermost first) down to ceil(9 *
    // health / max).
    unsigned want
            = boss.maximum ? (9 * boss.health + boss.maximum - 1) / boss.maximum
                           : 9;
    for (int i = 8; i >= 0 && bs_fox_tails() > want; i--) {
        BossPart& p = boss.parts[i];
        if (!p.exists) {
            continue;
        }
        p.exists = false;
        bs_particles(p.x, p.y);
        bs_fox_open_core();
        bs_fox_react(FR_YELP);
        display_shake(1);
    }
    boss.aux[AUX_FOX_TAILS] = float(bs_fox_tails());
    boss.aux[AUX_FOX_OPEN] = bs_fox_open() ? 1.0f : 0.0f;
    boss.aux[AUX_FOX_BLINK] = bs_blinking() ? 1.0f : 0.0f;
    boss.aux[AUX_FOX_ILLUSION] = float(bs_fox_decoys());
}
static bool bs_fox_run(int id, unsigned long t) {
    switch (id) {
    case NA_COMETS:
        return bs_fox_comets(t);
    case NA_FOXFIRE:
        return bs_fox_foxfire(t);
    case NA_ILLUSION:
        return bs_fox_illusion(t) || t > 12000;
    case NA_BLINK:
        return bs_fox_blink(t);
    }
    return true;
}
// Attacks start only once it has sat down: it never moves while one is warned.
static int bs_fox_pick() {
    if (boss.fox.gait != FG_SIT) {
        return 0;
    }
    return bs_seq_pick(SEQ_FOX, 1);
}
static void bs_fox_circles() {
    if (bs_blinking()) {
        return;
    }
    const float s = bs_fox_scale();
    for (unsigned i = 0; i < 9; i++) {
        if (boss.parts[i].exists) {
            bs_circle(boss.parts[i].x, boss.parts[i].y, 10 * s, BC_PART, i, 3);
        }
    }
    // The forehead mark: open after a lost tail or a solved illusion; the laser
    // always reaches it.
    float mx, my;
    bs_fox_at(FOX_POSE_MARK[bs_fox_pose_now()], mx, my);
    bs_circle(mx, my, 8 * s + 2 * (1 - s), BC_CORE, 0, bs_fox_open() ? 3 : 2);
    // The body and head do not soak shots: the tails fanned behind them stay
    // reachable.
    for (unsigned i = 9; i < BOSS_PARTS; i++) {
        if (boss.parts[i].exists && boss.parts[i].kind == PK_DECOY) {
            bs_circle(boss.parts[i].x
                              + FOX_POSE_BODY[FP_SIT][0] * FOX_ILLUSION_SCALE,
                      boss.parts[i].y
                              + FOX_POSE_BODY[FP_SIT][1] * FOX_ILLUSION_SCALE,
                      26 * FOX_ILLUSION_SCALE,
                      BC_PART,
                      i,
                      3);
        }
    }
}
static unsigned bs_fox_body(float *out) {
    unsigned n = 0;
    if (bs_blinking() || boss.aux[AUX_FOX_ALPHA] < .5f) {
        return 0;
    }
    const float s = bs_fox_scale();
    int pose = bs_fox_pose_now();
    float x, y;
    bs_fox_at(FOX_POSE_BODY[pose], x, y);
    bs_guard_body(out, n, x, y, FOX_POSE_BODY[pose][2] * s);
    bs_fox_at(FOX_POSE_HEAD[pose], x, y);
    bs_guard_body(out, n, x, y, FOX_POSE_HEAD[pose][2] * s);
    return n;
}
static void
bs_fox_hit(BossPart& p, unsigned owner, unsigned damage, bool laser) {
    if (p.kind == PK_TAIL) { // a tail hit reaches the fox; the tail falls with
                             // its health
        bs_damage(owner, laser ? damage * bs_ops().k : damage);
        boss.flash_until = game_ms + 80;
        return;
    }
    if (p.kind == PK_DECOY) {
        unsigned hurt = laser ? p.hp : damage;
        p.hp = hurt >= (unsigned)p.hp ? 0 : p.hp - hurt;
        if (p.hp <= 0) {
            p.exists = false;
            bs_particles(p.x, p.y);
        }
    }
}
