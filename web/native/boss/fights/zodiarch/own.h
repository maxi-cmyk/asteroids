#pragma once
// The dragon's own attacks between throws: the starfire breath and its rotation
// of eye laser, coil-spit, nova stars, lunge, black hole and meteor fall
// (nextSteps.md P2.3, P3). All but the coil-spit first
// settle: it turns to face the pilot (for attacks from the head) and comes to a
// stop, so every emitter stays put while its attack is warned.
static bool bs_breathing() {
    return boss.kind == BK_WARDEN && boss.aux[AUX_ZOD_BREATH] > .5f;
}
static bool bs_zod_holding() {
    return bs_breathing() || boss.aux[AUX_ZOD_HOLD] > .5f;
}
static bool bs_zod_is_own(int id) {
    return (id >= ZA_EYES && id <= ZA_METEOR) || id == ZA_LUNGE;
}
static bool bs_zod_settles(int id) {
    return id == ZA_BREATH || (bs_zod_is_own(id) && id != ZA_COILSPIT);
}
static bool bs_zod_faces(int id) {
    return id == ZA_BREATH || id == ZA_EYES || id == ZA_LUNGE;
}
// Its own attack `id` has begun: the pearl will surface where that attack comes
// from (ZOD_WEAK).
static void bs_zod_expose(int id) {
    for (const ZodWeak& w : ZOD_WEAK) {
        if (w.atk == (id >= ZA_SIGN && id <= ZA_CONJ ? ZA_SIGN : id)) {
            boss.aux[AUX_ZOD_SECTION] = w.seg;
            boss.stamp[STAMP_ZOD_WINDOW] = game_ms + w.at;
            boss.stamp[STAMP_ZOD_SHUT] = game_ms + w.at + w.open;
            return;
        }
    }
}
// Turning to face the pilot (if asked) and stopping; true once it has. Gives up
// waiting after 1.6 s, stopping where it is. `strict`: it must really face the
// pilot (no stopping early at an edge of the box).
static bool bs_zod_settled(bool face, bool strict = false) {
    BossSwim& s = boss.swim;
    if (s.mode != ZM_HOLD && s.mode != ZM_FACE) {
        bs_zod_behave(face ? ZM_FACE : ZM_HOLD, 4000);
    }
    if (s.mode == ZM_FACE) {
        float to = bs_atan2(boss.target_y - boss.y, boss.target_x - boss.x);
        // Facing the pilot, or near an edge of the box (it stops there, with
        // room for the turn it makes when it swims off again).
        float cx = cosf(s.th), cy = sinf(s.th);
        bool edge = (s.bx < ZOD_BOX_X0 + 50 && cx < 0)
                    || (s.bx > ZOD_BOX_X1 - 30 && cx > 0)
                    || (s.by < ZOD_BOX_Y0 + 35 && cy < 0)
                    || (s.by > ZOD_BOX_Y1 - 35 && cy > 0);
        if (fabsf(bs_wrap(s.th - to)) < (strict ? .3f : .6f)
            || (edge && !strict)) {
            s.mode = ZM_HOLD;
        }
    }
    boss.scratch[7] += 1;
    if (boss.scratch[7] > 80) {
        s.mode = ZM_HOLD;
        s.v = 0;
    }
    if (s.mode == ZM_HOLD && s.v < .12f) {
        s.v = 0;
        return true;
    }
    return false;
}
// Starfire breath (phase 3 on): head on only. It turns to face the pilot,
// stops, opens its jaw and breathes three fanned lanes straight out of its
// mouth, the middle one down the line the head points. If it could not come
// round to face the pilot it does not breathe.
static bool bs_zod_breath(unsigned long t) {
    float mx, my;
    bs_zod_jaw(mx, my);
    if (bs_at(t, 0)) {
        float a = boss.aux[AUX_ZOD_HEADING];
        float to = bs_angle_to(mx, my, boss.target_x, boss.target_y);
        if (fabsf(bs_wrap(a - to)) > .35f) {
            return true;
        }
        boss.aux[AUX_ZOD_BREATH] = 1;
        for (int k = -1; k <= 1; k++) {
            bs_hazard(HK_LANE, mx, my, a + k * .26f, 230, 10, 900, 600);
        }
    }
    if (t >= 1600) {
        boss.aux[AUX_ZOD_BREATH] = 0;
        return true;
    }
    return false;
}
// The lunge (P3.2): the neck draws back into an S while a lane from the jaw is
// warned (900 ms), the head strikes down it and bites, then stays stretched out
// with its forehead pearl open before sliding back. From phase 3 it strikes
// twice, the second lane warned during the first.
static float bs_lunge_aim(float jx, float jy) {
    float a = bs_angle_to(jx, jy, boss.target_x, boss.target_y);
    return BOSS_PI + bs_clamp(bs_wrap(a - BOSS_PI), -.6f, .6f);
}
// How far the head may strike from the coil point along `a`: never past x = 120
// at the snout.
static float bs_lunge_reach(float a) {
    float p0x = boss.scratch[3];
    return bs_clamp((p0x - 80 - 120) / bs_max(.3f, -cosf(a)), 0, 200);
}
static void bs_lunge_lane(float a) {
    float jx = boss.scratch[3] + cosf(a) * 72,
          jy = boss.scratch[4] + sinf(a) * 72;
    bs_hazard(HK_LANE, jx, jy, a, bs_lunge_reach(a) + 12, 20, 900, 400);
}
static bool bs_zod_lunge(unsigned long t) {
    BossSwim& s = boss.swim;
    bool twice = boss.phase >= 3;
    if (bs_at(t, 0)) {
        s.mode = ZM_LUNGE;
        // The coil point: 40 px back along the trail from the head.
        float hx, hy, want[1] = {40}, p0[1][2];
        bs_swim_head(hx, hy);
        bs_trail_walk(hx, hy, want, 1, p0);
        boss.scratch[3] = p0[0][0];
        boss.scratch[4] = p0[0][1];
        boss.scratch[0] = bs_lunge_aim(p0[0][0] - 72, p0[0][1]);
        bs_lunge_lane(boss.scratch[0]);
    }
    if (twice && bs_at(t, 900)) {
        boss.scratch[1] = bs_lunge_aim(boss.scratch[3] - 72, boss.scratch[4]);
        bs_lunge_lane(boss.scratch[1]);
    }
    // Strike k starts at `at`, bites at at + 250.
    auto strike = [&](unsigned long at, float a) {
        s.ext_a = a;
        s.ext = bs_lunge_reach(a) * bs_ease(bs_span(t, at, at + 250));
    };
    s.coil = bs_ease(bs_span(t, 0, 600));
    s.pull = 40 * s.coil;
    unsigned long last = twice ? 1800 : 900, back = last + 1150,
                  home = back + 600;
    if (t >= 900 && t < 1400
        && twice) { // the first strike, then straight back to the coil
        strike(900, boss.scratch[0]);
        if (t >= 1150) {
            s.ext = bs_lunge_reach(boss.scratch[0])
                    * (1 - bs_ease(bs_span(t, 1150, 1400)));
        }
    } else if (t >= last && t < back) {
        strike(last, twice ? boss.scratch[1] : boss.scratch[0]);
    } else if (t >= back) {
        float u = bs_ease(bs_span(t, back, home));
        s.ext = bs_lunge_reach(s.ext_a) * (1 - u);
        s.coil = 1 - u;
        s.pull = 40 * s.coil;
    } else if (t < 900 || (t >= 1400 && t < last)) {
        s.ext = 0;
    }
    if (t >= home + 50) {
        s.ext = s.pull = s.coil = 0;
        return true;
    }
    return false;
}
// The dragon's own attacks (P2.3, P3).
static bool bs_zod_own(int id, unsigned long t) {
    float tx = boss.target_x, ty = boss.target_y;
    switch (id) {
    case ZA_EYES: { // a beam from the eye sweeps a short arc through the pilot
        float ex, ey;
        bs_zod_eye(ex, ey);
        if (bs_at(t, 0)) {
            float a = bs_angle_to(ex, ey, tx, ty);
            // A narrow wedge (16 degrees): even pinned in a corner, a pilot can
            // step out of it.
            BossHazard *h = bs_hazard(
                    HK_BEAM, ex, ey, a - .14f, 0, a - .14f, 900, 700);
            if (h) {
                h->e = a + .14f;
                h->d = .28f / (700.0f / FRAME_TIME_MS);
            }
        }
        return t >= 1600;
    }
    case ZA_COILSPIT: { // it winds into a spiral, faces the pilot, fire climbs
                        // its body, it spits
        BossSwim& sw = boss.swim;
        bool big = boss.phase >= 2;
        if (bs_at(t, 0)) {
            bs_zod_behave(ZM_COIL, 4000);
            // The coil's centre sits beside the head, on the side toward the
            // middle of the box, so it winds in from where it is without first
            // swimming out of the box.
            float vx = cosf(sw.th), vy = sinf(sw.th), mx = 370 - sw.bx,
                  my = 135 - sw.by;
            float side = vx * my - vy * mx >= 0 ? 1.0f : -1.0f;
            sw.cx = bs_clamp(
                    sw.bx - vy * side * 55, ZOD_BOX_X0 + 55, ZOD_BOX_X1 - 15);
            sw.cy = bs_clamp(
                    sw.by + vx * side * 55, ZOD_BOX_Y0 + 40, ZOD_BOX_Y1 - 40);
            boss.scratch[6] = side;
        }
        if (t < 900) { // winding in: the goal runs round a shrinking circle
                       // ahead of it
            float r = 55 - 19 * (t / 900.0f),
                  a = bs_atan2(sw.by - sw.cy, sw.bx - sw.cx)
                      + boss.scratch[6] * .8f;
            sw.gx = sw.cx + r * cosf(a);
            sw.gy = sw.cy + r * sinf(a);
        } else if (t < 1200) { // turning out of the coil toward the pilot
            if (sw.mode == ZM_COIL) {
                bs_zod_behave(ZM_FACE, 4000);
            }
        } else if (sw.mode != ZM_HOLD) {
            bs_zod_behave(ZM_HOLD, 4000);
        }
        if (t >= 1200 && t < 2900) {
            boss.aux[AUX_ZOD_HOLD] = 1;
        }
        float mx, my;
        bs_zod_jaw(mx, my);
        if (bs_at(t, 1400)) {
            boss.scratch[0] = bs_angle_to(mx, my, tx, ty);
            boss.scratch[1] = mx;
            boss.scratch[2] = my;
            for (int k = -1; k <= 1; k++) {
                bs_hazard(HK_AIM,
                          mx,
                          my,
                          boss.scratch[0] + k * .3f,
                          70,
                          0,
                          900,
                          0);
            }
        }
        // Three streams of fire globs (four each from phase 2), 90 ms apart;
        // each bursts into two embers. Globs can be shot down.
        for (unsigned j = 0; j < (big ? 4u : 3u); j++) {
            if (bs_at(t, 2300 + j * 90)) {
                for (int k = -1; k <= 1; k++) {
                    bs_shot_at(SF_FIREBALL,
                               boss.scratch[1],
                               boss.scratch[2],
                               boss.scratch[0] + k * .3f,
                               2.2f,
                               1,
                               900);
                }
            }
        }
        if (t >= 2900) {
            boss.aux[AUX_ZOD_HOLD] = 0;
            bs_zod_behave(ZM_RISE, 1200);
            return true;
        }
        return false;
    }
    case ZA_NOVA: { // a star flung from each claw to a marked spot either side
                    // of the pilot
        if (bs_at(t, 0)) {
            for (unsigned k = 0; k < 2; k++) {
                float cx, cy;
                bs_zod_claw(k, cx, cy);
                float sx = bs_clamp(tx + 40, 30, 300),
                      sy = bs_clamp(ty + (k ? 45.0f : -45.0f), 20, 250);
                bs_nova(cx,
                        cy,
                        sx,
                        sy,
                        8,
                        bs_angle_to(sx, sy, tx, ty),
                        1.5f,
                        1700);
                bs_hazard(HK_TELL, sx, sy, 0, 18, 0, 1700, 0);
            }
        }
        return t >= 600;
    }
    case ZA_HOLE: { // a singularity flung from the forehead pearl well away
                    // from the pilot
        if (bs_at(t, 0)) {
            float sx = bs_clamp(tx + 150, 158, 300), sy = ty < 135 ? 210 : 60;
            bs_styled(bs_hazard(HK_TELL, sx, sy, 0, 30, 0, 900, 0), ZS_SWIRL);
            if (!boss_assist_calm) {
                bs_styled(bs_hazard(HK_PULL, sx, sy, 0, .8f, 0, 900, 3000), 1);
            } else {
                bs_styled(bs_hazard(HK_PULL, sx, sy, 0, 0, 0, 900, 3000),
                          1); // calm: no pull, still swallows shots
            }
            bs_styled(bs_hazard(HK_POOL, sx, sy, 0, 0, 18, 900, 3000), 1);
        }
        return t >= 900;
    }
    case ZA_METEOR: { // the tail fan flicks five meteors down curved, pre-drawn
                      // paths
        float fx, fy;
        bs_zod_tail(fx, fy);
        for (int k = -2; k <= 2; k++) {
            float a = bs_angle_to(fx, fy, tx, ty) + k * .22f,
                  turn = -k * .0035f, speed = 1.9f;
            if (bs_at(t, 0)) {
                BossHazard *h = bs_hazard(HK_ARC, fx, fy, a, 0, 520, 900, 0);
                if (h) {
                    h->d = speed;
                    h->e = turn;
                }
            }
            if (bs_at(t, 900)) {
                BossShot *s = bs_shot_at(SF_METEOR, fx, fy, a, speed);
                if (s) {
                    s->turn = turn;
                }
            }
        }
        return t >= 1100;
    }
    case ZA_LUNGE:
        return bs_zod_lunge(t);
    }
    return true;
}
// Room for one more sign of this class beside the ones already out?
