#pragma once
// How the Zodiarch swims and where its parts are (nextSteps.md P3.1): the head
// steers toward a goal with a capped turn (so the tightest bend is 48 px
// across, far wider than the 13 px between segments), a sideways wave gives the
// serpent S, and the body is laid along the trail the head leaves. The head
// turns with its heading; its eye, jaw and forehead pearl turn with it.
static void bs_zring_pos(unsigned sign, float& x, float& y) {
    float a = -BOSS_PI / 2 + sign * TWO_PI / 12
              + boss.aux[AUX_ZOD_CLOCK] * .05f;
    x = ZOD_CX + ZOD_RING_RX * cosf(a);
    y = ZOD_CY + ZOD_RING_RY * sinf(a);
}
static float bs_entrance_offset() {
    if (boss.phase) {
        return 0;
    }
    float t = bs_min(1, bs_since(boss.born) / float(BOSS_ENTRANCE_MS));
    return 160 * (1 - t) * (1 - t);
}

// ---------------------------------------------------------------- the trail
static void bs_trail_push(float x, float y) {
    BossSwim& s = boss.swim;
    s.at = (s.at + 1) % SWIM_TRAIL;
    s.trail[s.at][0] = x;
    s.trail[s.at][1] = y;
    if (s.n < SWIM_TRAIL) {
        s.n++;
    }
}
// A straight, gently waved trail behind a head at (x, y) pointing along `th`.
static void bs_trail_reset(float x, float y, float th) {
    BossSwim& s = boss.swim;
    s.n = 0;
    s.at = SWIM_TRAIL - 1;
    for (int k = SWIM_TRAIL - 1; k >= 0; k--) {
        float a = -2.0f * k, w = ZOD_WAVE * sinf(a * TWO_PI / ZOD_WAVE_LEN);
        bs_trail_push(x + cosf(th) * a - sinf(th) * w,
                      y + sinf(th) * a + cosf(th) * w);
    }
}
// Points `want[k]` px back along the trail from (x, y); `want` ascends.
static void bs_trail_walk(
        float x, float y, const float *want, unsigned count, float (*out)[2]) {
    const BossSwim& s = boss.swim;
    float px = x, py = y, walked = 0;
    unsigned k = 0;
    for (unsigned i = 0; i < s.n && k < count; i++) {
        const float *q = s.trail[(s.at + SWIM_TRAIL - i) % SWIM_TRAIL];
        float d = bs_dist(px, py, q[0], q[1]);
        while (k < count && walked + d >= want[k]) {
            float u = d > 0 ? (want[k] - walked) / d : 0;
            out[k][0] = px + (q[0] - px) * u;
            out[k][1] = py + (q[1] - py) * u;
            k++;
        }
        walked += d;
        px = q[0];
        py = q[1];
    }
    for (; k < count; k++) {
        out[k][0] = px;
        out[k][1] = py;
    }
}
// The head's point now: the steered base plus the sideways wave.
static void bs_swim_head(float& x, float& y) {
    const BossSwim& s = boss.swim;
    float w = s.amp * sinf(s.wave);
    x = s.bx - sinf(s.th) * w;
    y = s.by + cosf(s.th) * w;
}

// ---------------------------------------------------------------- the head's
// frame A point given in the head's left-facing frame (from its point on the
// trail), in the field. Past 90 degrees the head is drawn mirrored (horns up),
// so the frame mirrors with it.
static void bs_zod_local(float dx, float dy, float& x, float& y) {
    float a = boss.aux[AUX_ZOD_HEADING];
    bool right = cosf(a) > 0;
    float r = right ? a : a - BOSS_PI, lx = right ? -dx : dx;
    x = boss.x + lx * cosf(r) - dy * sinf(r);
    y = boss.y + lx * sinf(r) + dy * cosf(r);
}
static void bs_zod_eye(float& x, float& y) {
    bs_zod_local(ZOD_EYE[0], ZOD_EYE[1], x, y);
}
static void bs_zod_jaw(float& x, float& y) {
    bs_zod_local(ZOD_JAW[0], ZOD_JAW[1], x, y);
}
// A front (k 0) or back (k 1) claw: below the body on its belly side.
static void bs_zod_claw(unsigned k, float& x, float& y) {
    unsigned i = k ? 15 : 4;
    const float *s = boss.seg[i], *a = boss.seg[i - 1], *b = boss.seg[i + 1];
    float dx = a[0] - b[0], dy = a[1] - b[1],
          n = bs_max(.001f, sqrtf(dx * dx + dy * dy));
    float nx = -dy / n, ny = dx / n;
    if (ny < 0) {
        nx = -nx;
        ny = -ny;
    }
    x = s[0] + nx * (s[2] * .55f + 20);
    y = s[1] + ny * (s[2] * .55f + 20);
}
static void bs_zod_tail(float& x, float& y) {
    x = boss.seg[ZOD_SEGMENTS - 1][0];
    y = boss.seg[ZOD_SEGMENTS - 1][1];
}

// ---------------------------------------------------------------- placing the
// body Segment k sits k * 13 px back from the head. The lunge reshapes the
// neck: the head slides `pull` px back along the trail (the coil point), then
// `ext` px out down a straight lane; the coil also bends the first eight
// segments into an S. Holding still, a slow wave still runs down the body (it
// breathes).
static void bs_zod_place() {
    BossSwim& s = boss.swim;
    float off = bs_entrance_offset();
    float hx, hy;
    bs_swim_head(hx, hy);
    float want[ZOD_SEGMENTS], pts[ZOD_SEGMENTS][2];
    for (unsigned k = 0; k < ZOD_SEGMENTS; k++) {
        want[k] = s.pull + bs_max(0, k * ZOD_GAP - s.ext);
    }
    bs_trail_walk(hx, hy, want, ZOD_SEGMENTS, pts);
    float base[2] = {s.pull, s.pull + 8}, p0[2][2];
    bs_trail_walk(hx, hy, base, 2, p0);
    float ca = cosf(s.ext_a), sa = sinf(s.ext_a);
    float headx = p0[0][0] + ca * s.ext, heady = p0[0][1] + sa * s.ext;
    for (unsigned k = 0; k < ZOD_SEGMENTS && k * ZOD_GAP < s.ext; k++) {
        pts[k][0] = headx - ca * k * ZOD_GAP;
        pts[k][1] = heady - sa * k * ZOD_GAP;
    }
    float still = boss.phase ? bs_clamp(1 - s.v / .6f, 0, 1) : 0;
    boss.seg_n = ZOD_SEGMENTS;
    for (unsigned k = 0; k < ZOD_SEGMENTS; k++) {
        const float *a = pts[k ? k - 1 : 0],
                    *b = pts[k + 1 < ZOD_SEGMENTS ? k + 1 : k];
        float dx = a[0] - b[0], dy = a[1] - b[1],
              n = bs_max(.001f, sqrtf(dx * dx + dy * dy));
        float side = 0;
        if (k) {
            side += still * (.8f + 2.2f * k / ZOD_SEGMENTS)
                    * sinf(game_ms * BOSS_PI / 1000.0f - .45f * k);
        }
        if (k && k <= 8) {
            side += s.coil * 18 * sinf(k * BOSS_PI / 4.5f);
        }
        boss.seg[k][0] = pts[k][0] - dy / n * side + off;
        boss.seg[k][1] = pts[k][1] + dx / n * side;
        boss.seg[k][2] = 20 - k * 10.0f / (ZOD_SEGMENTS - 1);
    }
    boss.x = headx + off;
    boss.y = heady;
    // The head points along the trail (or down the lane), turned up to 25
    // degrees toward the pilot; it stops turning while it holds still, so its
    // emitters stay put.
    float heading
            = s.ext > 0 ? s.ext_a
                        : bs_atan2(p0[0][1] - p0[1][1], p0[0][0] - p0[1][0]);
    if (boss.aux[AUX_ZOD_HOLD] < .5f || s.ext > 0) {
        float to = bs_atan2(boss.target_y - boss.y, boss.target_x - boss.x);
        float look = s.ext > 0 || !boss.phase
                             ? 0
                             : bs_clamp(bs_wrap(to - heading), -.44f, .44f);
        boss.aux[AUX_ZOD_HEADING] = bs_wrap(heading + look);
    }
    // The pearl: in the forehead, or surfaced on a segment of the body.
    float px, py;
    // A section off the screen (the tail past the right edge) gives way to the
    // nearest one toward the head that is on it, so the pearl can be reached.
    int seg = int(boss.aux[AUX_ZOD_SECTION]);
    while (seg > 0
           && (boss.seg[seg][0] > SCREEN_W - 14 || boss.seg[seg][1] < 14
               || boss.seg[seg][1] > SCREEN_H - 14)) {
        seg--;
    }
    if (seg >= 0 && seg < int(ZOD_SEGMENTS)) {
        px = boss.seg[seg][0];
        py = boss.seg[seg][1];
    } else {
        bs_zod_local(ZOD_BROW[0], ZOD_BROW[1], px, py);
    }
    boss.aux[AUX_ZOD_PEARL_X] = px;
    boss.aux[AUX_ZOD_PEARL_Y] = py;
}

// ---------------------------------------------------------------- steering
static float bs_zod_speed(int mode) {
    switch (mode) {
    case ZM_STALK:
        return 1.0f;
    case ZM_SURGE:
        return 3.6f;
    case ZM_GLIDE:
        return 1.3f;
    case ZM_DIVE:
        return 2.2f;
    case ZM_RISE:
        return 2.0f;
    case ZM_REAR:
        return 1.4f;
    case ZM_FACE:
        return 1.0f;
    case ZM_COIL:
        return 4.0f;
    case ZM_HOLD:
    case ZM_LUNGE:
        return 0;
    default:
        return 1.4f;
    }
}
static void bs_zod_goal_for(int mode) {
    BossSwim& s = boss.swim;
    switch (mode) {
    case ZM_STALK:
        s.gx = 350;
        s.gy = bs_clamp(boss.target_y, ZOD_BOX_Y0 + 10, ZOD_BOX_Y1 - 10);
        break;
    case ZM_SURGE:
        s.gx = bs_rand(390, 440);
        s.gy = s.by > 135 ? ZOD_BOX_Y0 + 10 : ZOD_BOX_Y1 - 10;
        break;
    case ZM_GLIDE:
        s.gx = s.bx + cosf(s.th) * 90;
        s.gy = s.by + sinf(s.th) * 90;
        break;
    case ZM_DIVE:
        s.gx = bs_rand(340, 420);
        s.gy = ZOD_BOX_Y1 + 10;
        break;
    case ZM_RISE:
        s.gx = bs_rand(310, 350);
        s.gy = ZOD_BOX_Y0 + 30;
        break;
    case ZM_REAR:
        s.gx = bs_max(s.bx - 30, ZOD_BOX_X0 + 40);
        s.gy = bs_max(ZOD_BOX_Y0, s.by - 80);
        break;
    default:
        s.gx = bs_rand(ZOD_BOX_X0 + 20, ZOD_BOX_X1 - 10);
        s.gy = bs_rand(ZOD_BOX_Y0 + 15, ZOD_BOX_Y1 - 15);
        break;
    }
    s.gx = bs_clamp(s.gx, ZOD_BOX_X0, ZOD_BOX_X1);
    s.gy = bs_clamp(s.gy, ZOD_BOX_Y0 - 10, ZOD_BOX_Y1 + 10);
}
static void bs_zod_behave(int mode, unsigned long ms) {
    BossSwim& s = boss.swim;
    if (mode != s.mode) {
        s.last = s.mode;
    }
    s.mode = mode;
    s.until = game_ms + ms;
    bs_zod_goal_for(mode);
}
// The next move between attacks: a surge glides out, a dive rises behind the
// ring, and otherwise never the same move twice running, so it never settles
// into a loop.
static void bs_zod_choose() {
    BossSwim& s = boss.swim;
    if (s.mode == ZM_SURGE) {
        return bs_zod_behave(ZM_GLIDE, 1200);
    }
    if (s.mode == ZM_DIVE) {
        return bs_zod_behave(ZM_RISE, 1400);
    }
    static const uint8_t moves[] = {ZM_STALK,
                                    ZM_STALK,
                                    ZM_CRUISE,
                                    ZM_CRUISE,
                                    ZM_SURGE,
                                    ZM_SURGE,
                                    ZM_DIVE};
    int m = ZM_CRUISE;
    for (unsigned tries = 0; tries < 8; tries++) {
        m = moves[rock_random_bounded(sizeof(moves))];
        if (m != s.mode && m != s.last) {
            break;
        }
    }
    bs_zod_behave(m,
                  m == ZM_STALK   ? 2600
                  : m == ZM_SURGE ? 650
                  : m == ZM_DIVE  ? 1300
                                  : 2200);
}
// The steering's motion for one tick, on a copy of the swim's state, so the
// same code runs the swim and its look-ahead (the path dots).
struct ZodMove {
    float bx, by, th, v, wave, amp, spin, gx, gy;
    int mode;
};
static ZodMove bs_zod_move_of(const BossSwim& s) {
    return {s.bx, s.by, s.th, s.v, s.wave, s.amp, s.spin, s.gx, s.gy, s.mode};
}
// Moves `s` one tick toward its goal; returns how far the goal was.
static float bs_zod_move(ZodMove& s) {
    // A soft wall: heading toward an edge of the box and within a turn of it,
    // it turns back (it starts 35 to 55 px out, inside its 48 px turn at speed;
    // the snout stays right of x = 216).
    if (s.mode < ZM_FACE) {
        float cx = cosf(s.th), cy = sinf(s.th);
        // Each wall also picks the way round that swings away from it, not
        // along it.
        if (s.bx < ZOD_BOX_X0 + 55 && cx < 0) {
            s.gx = bs_max(s.gx, s.bx + 120);
            s.spin = cy > 0 ? -1.0f : 1.0f;
        }
        if (s.bx > ZOD_BOX_X1 - 35 && cx > 0) {
            s.gx = bs_min(s.gx, s.bx - 120);
            s.spin = cy > 0 ? 1.0f : -1.0f;
        }
        if (s.by < ZOD_BOX_Y0 + 35 && cy < 0) {
            s.gy = bs_max(s.gy, s.by + 100);
            s.spin = cx < 0 ? -1.0f : 1.0f;
        }
        if (s.by > ZOD_BOX_Y1 - 35 && cy > 0) {
            s.gy = bs_min(s.gy, s.by - 100);
            s.spin = cx < 0 ? 1.0f : -1.0f;
        }
    }
    float d = bs_dist(s.bx, s.by, s.gx, s.gy);
    float target = bs_zod_speed(s.mode);
    // Arriving, it slows and stops (still breathing) rather than circling its
    // goal.
    if (s.mode == ZM_STALK || s.mode == ZM_REAR) {
        target = d < 22 ? 0 : bs_min(target, d * .03f);
    }
    if (s.mode == ZM_FACE) {
        target = bs_min(target, d * .03f + .15f);
    }
    if (boss.aux[AUX_ZOD_CORE_OPEN] > .5f) {
        target *= .6f;
    }
    float ease = s.mode == ZM_HOLD || s.mode == ZM_LUNGE ? .16f
                 : s.mode == ZM_COIL                     ? .14f
                                                         : ZOD_EASE;
    s.v += (target - s.v) * ease;
    // Slow, it can turn tighter (26 px, as when it sets off from a stop near an
    // edge); at speed, no tighter than 48 px.
    float radius
            = s.mode == ZM_COIL ? 34
              : s.mode == ZM_FACE
                      ? 30
                      : 26
                                + (ZOD_TURN_R - 26)
                                          * bs_clamp((s.v - .5f) / 1.0f, 0, 1);
    // Past the edge of the box and still heading out: an emergency turn (22
    // px), still a curve, never a fold; the snout (61 px ahead of the head)
    // stays right of x = 216.
    float hx0 = cosf(s.th), hy0 = sinf(s.th);
    if ((s.bx < ZOD_BOX_X0 + 10 && hx0 < 0) || (s.bx > ZOD_BOX_X1 && hx0 > 0)
        || (s.by < ZOD_BOX_Y0 - 10 && hy0 < 0)
        || (s.by > ZOD_BOX_Y1 + 10 && hy0 > 0)) {
        radius = 22;
    }
    float want = bs_atan2(s.gy - s.by, s.gx - s.bx), turn = s.v / radius;
    // A goal nearly behind it: keep turning the way it already is, so a U-turn
    // is finished rather than flipping side to side as the goal shifts (which
    // would drift it straight on).
    float diff = bs_wrap(want - s.th);
    bool walled = s.mode < ZM_FACE
                  && (s.bx < ZOD_BOX_X0 + 55 || s.bx > ZOD_BOX_X1 - 35
                      || s.by < ZOD_BOX_Y0 + 35 || s.by > ZOD_BOX_Y1 - 35);
    if ((fabsf(diff) > 2.3f || (walled && fabsf(diff) > 1.2f)) && s.spin != 0) {
        diff = s.spin * fabsf(diff);
    } else if (fabsf(diff) > .05f) {
        s.spin = diff > 0 ? 1.0f : -1.0f;
    }
    s.th = bs_wrap(s.th + bs_clamp(diff, -turn, turn));
    s.bx += cosf(s.th) * s.v;
    s.by += sinf(s.th) * s.v;
    s.wave += s.v * TWO_PI / ZOD_WAVE_LEN;
    s.amp += ((s.mode == ZM_COIL ? 1.5f : ZOD_WAVE) - s.amp) * .05f;
    return d;
}
// Where the head will be in 0.6 s if it keeps its goal (nextSteps.md R2: the
// path dots), as aux x, y and heading; x is -1 while it holds still or turns
// on the spot, so the dots hide.
static void bs_zod_lookahead() {
    BossSwim& s = boss.swim;
    if (s.mode >= ZM_FACE || s.v < .3f) {
        boss.aux[AUX_ZOD_PATH_X] = -1;
        return;
    }
    ZodMove m = bs_zod_move_of(s);
    for (unsigned i = 0; i < 30; i++) {
        bs_zod_move(m);
    }
    float w = m.amp * sinf(m.wave);
    boss.aux[AUX_ZOD_PATH_X] = m.bx - sinf(m.th) * w;
    boss.aux[AUX_ZOD_PATH_Y] = m.by + cosf(m.th) * w;
    boss.aux[AUX_ZOD_PATH_TH] = m.th;
}
static void bs_zod_steer() {
    BossSwim& s = boss.swim;
    bool free = !boss.atk || (boss.atk >= ZA_SIGN && boss.atk <= ZA_CONJ);
    if (free && (s.mode >= ZM_FACE || game_ms >= s.until)) {
        bs_zod_choose();
    }
    float hx, hy;
    bs_swim_head(hx, hy);
    if (s.mode == ZM_STALK) {
        s.gy = bs_clamp(boss.target_y, ZOD_BOX_Y0 + 10, ZOD_BOX_Y1 - 10);
    }
    if (s.mode == ZM_FACE) {
        float a = bs_atan2(boss.target_y - hy, boss.target_x - hx);
        s.gx = hx + cosf(a) * 100;
        s.gy = hy + sinf(a) * 100;
    }
    ZodMove m = bs_zod_move_of(s);
    float d = bs_zod_move(m);
    s.bx = m.bx;
    s.by = m.by;
    s.th = m.th;
    s.v = m.v;
    s.wave = m.wave;
    s.amp = m.amp;
    s.spin = m.spin;
    s.gx = m.gx;
    s.gy = m.gy;
    // Done with a goal: pick the next move (a stalk lingers on the pilot's row
    // until its time).
    if (free && d < 14 && s.mode != ZM_STALK && s.mode < ZM_FACE) {
        s.until = game_ms;
    }
    bs_swim_head(hx, hy);
    const float *last = s.trail[s.at];
    if (bs_dist(hx, hy, last[0], last[1]) >= 2) {
        bs_trail_push(hx, hy);
    }
}
static void bs_zod_begin() {
    BossSwim& s = boss.swim;
    s = BossSwim{};
    s.bx = 420;
    s.by = 135;
    s.th = BOSS_PI;
    s.v = 1.2f;
    s.amp = ZOD_WAVE;
    bs_trail_reset(s.bx, s.by, s.th);
    bs_zod_behave(ZM_CRUISE, 2000);
    s.gx = 360;
    s.gy = 135;
    boss.aux[AUX_ZOD_CLOCK] = 0;
    boss.aux[AUX_ZOD_HEADING] = BOSS_PI;
    boss.stamp[STAMP_ZOD_WINDOW] = boss.stamp[STAMP_ZOD_SHUT] = 0;
    boss.aux[AUX_ZOD_SECTION] = -1;
    bs_zod_place();
}
// How far from (x, y) along `a` to just past the edge of the screen.
static float bs_edge_len(float x, float y, float a) {
    float ca = cosf(a), sa = sinf(a), best = 600;
    if (ca < -.01f) {
        best = bs_min(best, (x + 40) / -ca);
    }
    if (ca > .01f) {
        best = bs_min(best, (SCREEN_W + 40 - x) / ca);
    }
    if (sa < -.01f) {
        best = bs_min(best, (y + 40) / -sa);
    }
    if (sa > .01f) {
        best = bs_min(best, (SCREEN_H + 40 - y) / sa);
    }
    return best;
}
static bool bs_offscreen(float x, float y) {
    return x < -70 || x > SCREEN_W + 70 || y < -70 || y > SCREEN_H + 70;
}
