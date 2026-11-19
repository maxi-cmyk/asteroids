#pragma once
// Ninefold's footwork (nextSteps.md P2.1): choosing a perch, the trot and the
// gallop between perches (rise or crouch, move, stand or skid, turn back to
// face left, sit), what it looks like sitting, and where the points of the
// current pose are.
static float bs_fox_scale() {
    return boss.aux[AUX_FOX_SCALE] > 0 ? boss.aux[AUX_FOX_SCALE] : 1.0f;
}
static int bs_fox_pose_now() {
    int p = int(boss.aux[AUX_FOX_POSE]);
    return p >= 0 && p < FP_COUNT ? p : FP_SIT;
}
// A pose offset (facing left, full size) turned to the way it faces and scaled.
static void bs_fox_at(const float *off, float& x, float& y) {
    float s = bs_fox_scale();
    x = boss.x + (boss.aux[AUX_FOX_FACE] > 0 ? -off[0] : off[0]) * s;
    y = boss.y + off[1] * s;
}

// ---------------------------------------------------------------- moves
static void bs_fox_go(float tx, float ty, float speed = 0) {
    BossFox& f = boss.fox;
    f.fx = f.x;
    f.fy = f.y;
    f.tx = tx;
    f.ty = ty;
    f.dist = 0;
    float d = bs_dist(f.x, f.y, tx, ty);
    bool walk = speed == 0 && d < FOX_WALK_MAX;
    f.speed = speed > 0 ? speed : walk ? FOX_WALK_SPEED : FOX_RUN_SPEED;
    f.gait = walk ? FG_RISE : FG_CROUCH;
    f.phase_at = game_ms;
    if (fabsf(tx - f.x) > 1) {
        f.face = tx > f.x ? 1 : -1;
    }
}
// The next perch: never the one it is on, the nearest pilot's row preferred
// (with a little chance), and for a blink one well away vertically.
static int bs_fox_pick_perch(bool far) {
    int best = boss.fox.perch;
    float best_score = 1e9f;
    for (int k = 0; k < 9; k++) {
        if (k == boss.fox.perch) {
            continue;
        }
        float px = FOX_PERCH_X[k % 3], py = FOX_PERCH_Y[k / 3];
        float score = fabsf(py - boss.target_y) + bs_rand(0, 40);
        if (far) {
            score = -fabsf(py - boss.fox.y) + bs_rand(0, 30);
        }
        if (bs_dist(px, py, boss.fox.x, boss.fox.y) < 20) {
            continue;
        }
        if (score < best_score) {
            best_score = score;
            best = k;
        }
    }
    return best;
}
static void bs_fox_to_perch(int k) {
    boss.fox.perch = k;
    bs_fox_go(FOX_PERCH_X[k % 3], FOX_PERCH_Y[k / 3]);
}
static unsigned long bs_fox_in_phase() {
    return game_ms - boss.fox.phase_at;
}
static void bs_fox_phase(int gait) {
    boss.fox.gait = gait;
    boss.fox.phase_at = game_ms;
}
// One tick of the current move.
static void bs_fox_move() {
    BossFox& f = boss.fox;
    unsigned long in = bs_fox_in_phase();
    switch (f.gait) {
    case FG_RISE:
        if (in >= 200) {
            bs_fox_phase(FG_WALK);
        }
        break;
    case FG_CROUCH:
        if (in >= 300) {
            bs_fox_phase(FG_RUN);
        }
        break;
    case FG_WALK:
    case FG_RUN: {
        float d = bs_dist(f.x, f.y, f.tx, f.ty);
        float step = bs_min(d, f.speed);
        if (d > .01f) {
            f.x += (f.tx - f.x) / d * step;
            f.y += (f.ty - f.y) / d * step;
        }
        f.dist += step;
        if (d <= f.speed) {
            f.x = f.tx;
            f.y = f.ty;
            bs_fox_phase(FG_STOP);
        }
        break;
    }
    case FG_STOP:
        if (in >= (f.speed > FOX_WALK_SPEED ? 400u : 150u)) {
            bs_fox_phase(f.face > 0 ? FG_TURN : FG_SIT);
        }
        break;
    case FG_TURN:
        if (in >= 150) {
            f.face = -1;
            bs_fox_phase(FG_SIT);
        }
        break;
    default:
        break;
    }
}
// What it looks like sitting: a blink of its eyes now and then, its weight
// shifting, its head following the pilot, and bristling when one comes close.
static int bs_fox_sit_pose() {
    unsigned long c = bs_since(boss.born);
    if (c % 3700 < 140) {
        return FP_SIT_BLINK;
    }
    if (c % 5300 < 400) {
        return FP_SIT_SHIFT;
    }
    float dx = boss.x - boss.target_x, dy = boss.target_y - boss.y;
    if (fabsf(dx) < 150 && fabsf(dy) < 90) {
        return FP_SIT_BRISTLE;
    }
    return dy < -45 ? FP_SIT_UP : dy > 45 ? FP_SIT_DOWN : FP_SIT;
}
// The pose of the move it is making (when no attack has set one).
static int bs_fox_move_pose() {
    BossFox& f = boss.fox;
    switch (f.gait) {
    case FG_RISE:
        return FP_RISE;
    case FG_CROUCH:
        return FP_CROUCH;
    case FG_WALK:
        return FP_WALK_0 + int(f.dist / FOX_WALK_STRIDE) % 4;
    case FG_RUN: {
        float slope = (f.ty - f.fy) / bs_max(1, fabsf(f.tx - f.fx));
        int base = slope < -.25f  ? FP_RUN_UP_0
                   : slope > .25f ? FP_RUN_DOWN_0
                                  : FP_RUN_0;
        return base + int(f.dist / FOX_RUN_STRIDE) % 6;
    }
    case FG_STOP:
        return f.speed > FOX_WALK_SPEED ? FP_SKID : FP_STAND;
    case FG_TURN:
        return FP_STAND;
    default:
        return bs_fox_sit_pose();
    }
}
