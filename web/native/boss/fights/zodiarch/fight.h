#pragma once
// The Zodiarch's fight: the per-tick update (swim clock, pearl window), what
// fits on the field together, picking and running attacks, hit circles and
// contact.

static bool bs_zod_open() {
    return game_ms >= boss.stamp[STAMP_ZOD_WINDOW]
           && game_ms < boss.stamp[STAMP_ZOD_SHUT];
}

static void bs_zod_update() {
    // The ring turns while it swims and holds while it does; the head steers
    // (swim.h).
    if (boss.phase && !bs_zod_holding()) {
        boss.aux[AUX_ZOD_CLOCK] += FRAME_TIME_MS / 1000.0f;
    }
    bs_zod_steer();
    bs_zod_place();
    bs_zod_lookahead();
    boss.aux[AUX_ZOD_SPEED] = boss.swim.v;
    boss.aux[AUX_ZOD_MODE] = float(boss.swim.mode);
    if (!boss.phase) {
        return;
    }
    // The pearl surfaces with each of its own attacks (bs_zod_expose), after a
    // 600 ms tell, and sinks back a few seconds later.
    unsigned long w = boss.stamp[STAMP_ZOD_WINDOW],
                  shut = boss.stamp[STAMP_ZOD_SHUT];
    bool open = bs_zod_open();
    boss.aux[AUX_ZOD_CORE_OPEN] = open ? 1.0f : 0.0f;
    if (open) {
        boss.aux[AUX_ZOD_PEARL] = (shut - game_ms) / float(shut - w);
    } else if (game_ms < w && game_ms + ZOD_TELL_MS >= w) {
        boss.aux[AUX_ZOD_PEARL] = -(1 - (w - game_ms) / float(ZOD_TELL_MS));
    } else {
        boss.aux[AUX_ZOD_PEARL] = 0;
        if (game_ms >= shut) {
            boss.aux[AUX_ZOD_SECTION] = -1; // back in the forehead
        }
    }
    unsigned long t = boss.atk ? game_ms - boss.atk_t0 : 0;
    bool throwing
            = boss.atk >= ZA_SIGN && boss.atk <= ZA_CONJ && t % 1200 < 300;
    bool spitting = boss.atk == ZA_COILSPIT && t >= 1400 && t < 2700;
    bool lunging = boss.atk == ZA_LUNGE && boss.swim.coil > .3f;
    boss.aux[AUX_ZOD_MOUTH]
            = throwing || bs_breathing() || spitting || lunging ? 1.0f : 0.0f;
    if (!boss.atk) {
        boss.aux[AUX_ZOD_HOLD] = 0;
        boss.scratch[7] = 0;
    }
    bs_signs_tick();
}
// At most two signs out at once (one in phase 1).
static unsigned bs_zod_limit() {
    return boss.phase >= 2 ? 2 : 1;
}
static bool bs_sign_fits(unsigned sign) {
    uint8_t classes = 0;
    unsigned ranged = 0, n = bs_signs_out(&classes, &ranged);
    if (n >= bs_zod_limit() || bs_sign_is_out(sign)) {
        return false;
    }
    uint8_t cl = SIGN_CLASS[sign];
    if (cl == CL_RANGED) {
        return ranged < 2;
    }
    if (cl == CL_FIELD) {
        for (const BossHazard& h : boss.hz) {
            if (h.active && h.kind == HK_PULL) {
                return false;
            }
        }
    }
    return !(classes & cl);
}
static bool bs_own_fits(int id) {
    uint8_t classes = 0;
    bs_signs_out(&classes);
    if (id == ZA_HOLE) {
        if (classes & CL_FIELD) {
            return false;
        }
        for (const BossHazard& h : boss.hz) {
            if (h.active && h.kind == HK_PULL) {
                return false;
            }
        }
    }
    if (id == ZA_BREATH && (classes & CL_WALL)) {
        return false;
    }
    if (id == ZA_LUNGE && (classes & (CL_WALL | CL_CHARGE))) {
        return false;
    }
    return true;
}
static unsigned long bs_conj_at(unsigned k) {
    return k * 1200;
}
// Before its own attacks it settles (own.h): the attack's clock starts once it
// has.
static bool bs_zod_run(int id, unsigned long t) {
    if (bs_zod_settles(id) && boss.aux[AUX_ZOD_HOLD] < .5f) {
        if (bs_zod_settled(bs_zod_faces(id), id == ZA_BREATH)) {
            boss.aux[AUX_ZOD_HOLD] = 1;
        }
        boss.atk_t0 = game_ms + FRAME_TIME_MS;
        return false;
    }
    if (bs_at(t, 0)) {
        bs_zod_expose(id);
    }
    if (id == ZA_BREATH) {
        return bs_zod_breath(t);
    }
    if (bs_zod_is_own(id)) {
        return bs_zod_own(id, t);
    }
    // A summon: it rears its head toward the ring as it calls the sign down.
    if (id >= ZA_SIGN && id <= ZA_CONJ && boss.swim.mode < ZM_FACE
        && (bs_at(t, 0) || (id == ZA_CONJ && t % 1200 < FRAME_TIME_MS))) {
        bs_zod_behave(ZM_REAR, 900);
    }
    if (id == ZA_CONJ) {
        // Two signs from two sides of the ring, thrown 1.2 s apart.
        for (unsigned k = 0; k < 2; k++) {
            if (bs_at(t, bs_conj_at(k))) {
                for (unsigned tries = 0; tries < 20; tries++) {
                    uint8_t s = CONJ_SET[rock_random_bounded(sizeof(CONJ_SET))];
                    if (bs_sign_fits(s)) {
                        bs_sign_launch(s);
                        break;
                    }
                }
            }
        }
        return t >= bs_conj_at(1) + ZOD_FORM_MS + 300;
    }
    if (bs_at(t, 0)) {
        bs_sign_launch(unsigned(id - ZA_SIGN));
    }
    // The sign acts on its own; the dragon moves on (with the shortest rest,
    // 700 ms, the next throw is 1.2 s after this one).
    return t >= 500;
}
// Its own attacks by phase: the coil-spit from phase 1; eye lasers, nova stars
// and the lunge from phase 2; the black hole, meteor fall and breath from phase
// 3.
static int bs_zod_own_pick() {
    static const int pool[] = {ZA_COILSPIT,
                               ZA_EYES,
                               ZA_NOVA,
                               ZA_LUNGE,
                               ZA_HOLE,
                               ZA_METEOR,
                               ZA_BREATH};
    unsigned avail = boss.phase >= 3 ? 7 : boss.phase >= 2 ? 4 : 1;
    // One that does not fit yet keeps its turn, as the signs do.
    unsigned k0 = unsigned(boss.swim.own_next) % avail;
    for (unsigned j = 0; j < avail; j++) {
        int id = pool[(k0 + j) % avail];
        if (!bs_own_fits(id)) {
            continue;
        }
        if (j == 0) {
            boss.swim.own_next = float(k0 + 1);
        }
        return id;
    }
    return 0;
}
// The next sign: the season's rotation in phases 1 and 2, the whole ring after
// that, skipping any that would not fit beside the signs already out. 0 if none
// fits.
static int bs_zod_sign_pick() {
    // Ascendant: the date's sign comes first, once, ahead of the rotation.
    boss.swim.ascend_spawn = false;
    if (!boss.swim.ascended && boss_ascendant >= 0
        && bs_sign_fits(unsigned(boss_ascendant))) {
        boss.swim.ascended = true;
        boss.swim.ascend_spawn = true;
        return ZA_SIGN + boss_ascendant;
    }
    if (boss.phase >= 3) {
        for (unsigned tries = 0; tries < 12; tries++) {
            int id = ZA_SIGN + int(rock_random_bounded(12));
            if (bs_sign_fits(unsigned(id - ZA_SIGN))) {
                return id;
            }
        }
        return 0;
    }
    // A sign that does not fit yet keeps its turn: the rotation only moves past
    // the one thrown.
    const uint8_t *row = SEQ_ZOD[boss.phase - 1];
    unsigned k0 = unsigned(boss.swim.next_sign) % row[0];
    for (unsigned j = 0; j < row[0]; j++) {
        unsigned k = (k0 + j) % row[0];
        if (!bs_sign_fits(unsigned(row[1 + k] - ZA_SIGN))) {
            continue;
        }
        if (j == 0) {
            boss.swim.next_sign = float(k0 + 1);
        }
        return row[1 + k];
    }
    return 0;
}
static int bs_zod_pick() {
    if (bs_frenzy() && boss.seq_total % 4 == 0 && bs_signs_out() == 0) {
        return ZA_CONJ;
    }
    // A sign whenever none is out; otherwise a few throws in a row while there
    // is room, then one of its own (in phases 1 and 2 it alternates; in phase
    // 3: sign, sign, own...).
    unsigned out = bs_signs_out(), limit = bs_zod_limit();
    float streak = boss.swim.sign_streak;
    // From phase 3 it throws both in a row (its own attacks run longer: it
    // settles first), so two signs really are out together.
    float run = boss.phase >= 3 ? limit : limit - 1;
    bool sign_turn = out == 0 || (out < limit && streak < run);
    int id = sign_turn ? bs_zod_sign_pick() : 0;
    if (id) {
        boss.swim.sign_streak = streak + 1;
    } else {
        id = bs_zod_own_pick();
        if (id) {
            boss.swim.sign_streak = 0;
        }
    }
    return id;
}
static void bs_zod_circles() {
    // The head stops shots (the laser passes through), shaped to leave the
    // forehead pearl uncovered: shots at the brow reach the pearl first. The
    // body is only a contact hazard: it coils between the pilot and the pearl
    // too often to soak shots fairly.
    float hx, hy;
    bs_zod_local(-12, 4, hx, hy);
    bs_circle(hx, hy, 15, BC_BLOCK, 0, 1);
    bs_zod_local(
            -54, 4, hx, hy); // the snout, low: shots at the brow pass over it
    bs_circle(hx, hy, 8, BC_BLOCK, 0, 1);
    float px = boss.aux[AUX_ZOD_PEARL_X], py = boss.aux[AUX_ZOD_PEARL_Y];
    bool open = boss.aux[AUX_ZOD_CORE_OPEN] > .5f,
         brow = boss.aux[AUX_ZOD_SECTION] < 0;
    // The brow scales stop shots unless the pearl is open under them.
    if (!(open && brow)) {
        float bx, by;
        bs_zod_local(ZOD_BROW[0], ZOD_BROW[1], bx, by);
        bs_circle(bx, by, 13, BC_BLOCK, 0, 1);
    }
    // The pearl: open, it takes shots; shut, only the laser reaches it.
    bs_circle(px, py, 13, BC_CORE, 0, open ? 3 : 2);
    for (unsigned i = 0; i < BOSS_PARTS; i++) {
        const BossPart& p = boss.parts[i];
        if (!bs_sign_live(p) || p.state != 1) {
            continue;
        }
        bs_circle(p.x + SIGN_KEY[p.slot][0],
                  p.y + SIGN_KEY[p.slot][1],
                  8,
                  BC_PART,
                  i,
                  3);
    }
    // A black hole swallows the pilots' shots that pass through it (the laser
    // goes by).
    for (const BossHazard& h : boss.hz) {
        if (h.active && h.kind == HK_PULL && h.e == 1 && !h.warn_left) {
            bs_circle(h.x, h.y, 28, BC_BLOCK, 0, 1);
        }
    }
}
static unsigned bs_zod_body(float *out) {
    unsigned n = 0;
    // The head, measured against the turned head frames (nextSteps.md R2):
    // skull, eye, snout and throat, plus the lower jaw shut or dropped. Within
    // 3 px of the drawn edge (leaning the player's way) except the last 12 px
    // of the snout tip, left out so contact never reaches left of x = 216; the
    // thin horns, mane and brow spike are left out too, and the neck segment
    // covers their roots.
    static const float HEAD[][3]
            = {{-14, -2, 17}, {-38, -3, 10}, {-57, -2, 8}, {-30, 9, 9}};
    static const float SHUT[][3] = {{-52, 7, 6}};
    static const float OPEN[][3] = {{-50, 13, 6}, {-60, 11, 4}};
    bool open = boss.aux[AUX_ZOD_MOUTH] > .5f;
    float hx, hy;
    for (const float *c : HEAD) {
        bs_zod_local(c[0], c[1], hx, hy);
        bs_guard_body(out, n, hx, hy, c[2]);
    }
    for (unsigned i = 0; i < (open ? 2u : 1u); i++) {
        const float *c = open ? OPEN[i] : SHUT[i];
        bs_zod_local(c[0], c[1], hx, hy);
        bs_guard_body(out, n, hx, hy, c[2]);
    }
    for (unsigned k = 0; k < boss.seg_n; k++) {
        bs_guard_body(
                out, n, boss.seg[k][0], boss.seg[k][1], boss.seg[k][2] * .9f);
    }
    for (const BossPart& p : boss.parts) {
        if (bs_sign_live(p) && p.state == 1) {
            bs_guard_body(out, n, p.x, p.y, p.slot == SG_PISCES ? 8 : 12);
        }
    }
    return n;
}
static void
bs_zod_hit(BossPart& p, unsigned owner, unsigned damage, bool laser) {
    if (p.kind != PK_SIGN || p.state != 1) {
        return;
    }
    unsigned hurt = laser ? p.hp : damage;
    p.hp = hurt >= (unsigned)p.hp ? 0 : p.hp - hurt;
    if (p.hp <= 0) {
        bs_sign_break(p, owner);
    }
}
static void bs_zod_phase(unsigned) {
}
