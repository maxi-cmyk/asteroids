#pragma once
// The thrown creatures: counting, spawning, launching, dissolving and breaking
// them, plus the small helpers their attacks share.
// ---------------------------------------------------------------- the
// creatures
static bool bs_sign_live(const BossPart& p) {
    return p.exists && p.kind == PK_SIGN;
}
static unsigned bs_signs_alive() {
    unsigned n = 0;
    for (const BossPart& p : boss.parts) {
        n += bs_sign_live(p);
    }
    return n;
}
// Signs out (a pair counts once) and the classes of trouble they make.
static unsigned bs_signs_out(uint8_t *classes = nullptr,
                             unsigned *ranged = nullptr) {
    unsigned n = 0, r = 0;
    uint8_t cl = 0;
    for (const BossPart& p : boss.parts) {
        if (bs_sign_live(p) && p.lead && p.state != 2) {
            n++;
            cl |= SIGN_CLASS[p.slot];
            r += SIGN_CLASS[p.slot] == CL_RANGED;
        }
    }
    if (classes) {
        *classes = cl;
    }
    if (ranged) {
        *ranged = r;
    }
    return n;
}
static BossPart *bs_free_part() {
    for (BossPart& p : boss.parts) {
        if (!p.exists) {
            return &p;
        }
    }
    return nullptr;
}
static void bs_out_bit(unsigned sign, bool out) {
    unsigned mask = (unsigned)boss.aux[AUX_ZOD_OUT];
    mask = out ? mask | (1u << sign) : mask & ~(1u << sign);
    boss.aux[AUX_ZOD_OUT] = float(mask);
}
static bool bs_sign_is_out(unsigned sign) {
    return ((unsigned)boss.aux[AUX_ZOD_OUT] >> sign) & 1u;
}
static float bs_lane_y(float y) {
    return bs_clamp(y, 40, 230);
}
// A creature leaves the ring for its stage. Returns the part, or null if the
// pool is full.
static BossPart *
bs_sign_spawn(unsigned sign, float stage_x, float stage_y, bool lead) {
    BossPart *p = bs_free_part();
    if (!p) {
        return nullptr;
    }
    *p = {};
    p->exists = true;
    p->kind = PK_SIGN;
    p->slot = sign;
    // The Ascendant's key star takes one more hit.
    p->hp = p->hp_max
            = boss.swim.ascend_spawn && int(sign) == boss_ascendant ? 4 : 3;
    p->state = 0;
    p->r = 0;
    bs_zring_pos(sign, p->sx, p->sy);
    p->x = p->sx;
    p->y = p->sy;
    p->u = stage_x;
    p->v = stage_y;
    p->until = game_ms; // launch time
    p->lead = lead;
    bs_out_bit(sign, true);
    return p;
}
// Creatures form in front of the dragon's coils (x 185-215: the coils reach x
// 260 at the left of its swim, and a creature is up to 80 px either side of its
// centre).
static void bs_sign_launch(unsigned sign) {
    float ty = bs_lane_y(boss.target_y);
    switch (sign) {
    case SG_GEMINI: { // a twin's hand on each lane row, either side of the
                      // pilot
        float row_a = bs_clamp(ty - 60, 20, 188),
              row_b = bs_clamp(ty + 60, 20, 222);
        BossPart *a = bs_sign_spawn(
                sign,
                185,
                bs_clamp(row_a - SIGN_EMIT[SG_GEMINI][E_HAND][1], 24, 246),
                true);
        BossPart *b = bs_sign_spawn(
                sign,
                215,
                bs_clamp(row_b - SIGN_EMIT[SG_GEMINI][E_B_HAND][1], 24, 246),
                false);
        if (a && b) {
            a->link = int8_t(b - boss.parts);
            b->link = int8_t(a - boss.parts);
        }
        if (a) {
            a->fire_at = (unsigned long)ty;
        }
        break;
    }
    case SG_PISCES: { // the fish part as wide as the field allows
        BossPart *a = bs_sign_spawn(sign, 220, 40, true);
        BossPart *b = bs_sign_spawn(sign, 226, 230, false);
        if (a && b) {
            a->link = int8_t(b - boss.parts);
            b->link = int8_t(a - boss.parts);
        }
        break;
    }
    case SG_CANCER:
        bs_sign_spawn(sign, 190, 130, true);
        break;
    case SG_LIBRA:
        bs_sign_spawn(sign, 195, 125, true);
        break;
    case SG_SCORPIO:
        bs_sign_spawn(sign, 195, bs_clamp(ty, 70, 200), true);
        break;
    case SG_CAPRICORN:
        bs_sign_spawn(sign, 190, bs_clamp(ty, 80, 190), true);
        break;
    case SG_AQUARIUS:
        bs_sign_spawn(sign, 200, bs_clamp(ty + 20, 70, 210), true);
        break;
    case SG_ARIES:
    case SG_TAURUS:
        bs_sign_spawn(sign, 210, ty, true);
        break;
    default:
        bs_sign_spawn(sign, 200, bs_clamp(ty, 60, 210), true);
        break;
    }
}
static void bs_drop_hazard(int8_t& index) {
    if (index >= 0 && index < int8_t(BOSS_HAZARDS)) {
        boss.hz[index].active = false;
    }
    index = -1;
}
// Ends a creature: it dissolves back into the ring over ZOD_FADE_MS.
static void bs_sign_dissolve(BossPart& p) {
    if (p.state == 2) {
        return;
    }
    p.state = 2;
    p.fire_at = game_ms;
}
// The key star was shot out: the creature (and its partner) falls apart and
// takes its walls, pulls and cords with it, and the dragon is hurt. A broken
// creature keeps hp 0 while it fades, so the renderer can tell a break from a
// dissolve.
static void bs_sign_break(BossPart& p, unsigned owner) {
    BossPart *pair[2] = {&p, p.link >= 0 ? &boss.parts[p.link] : nullptr};
    for (BossPart *q : pair) {
        if (!q || !q->exists || q->kind != PK_SIGN) {
            continue;
        }
        bs_drop_hazard(q->hz0);
        bs_drop_hazard(q->hz1);
        bs_particles(q->x, q->y);
        q->hp = 0;
        bs_sign_dissolve(*q);
    }
    display_shake(1);
    bs_damage(owner, ZOD_BREAK_DAMAGE); // breaking a sign wounds the dragon too
}
static void bs_glide(BossPart& p, float x, float y, float step) {
    p.x += bs_clamp(x - p.x, -step, step);
    p.y += bs_clamp(y - p.y, -step, step);
}
static BossHazard *bs_keep(BossPart& p, BossHazard *h, bool second = false) {
    if (h) {
        (second ? p.hz1 : p.hz0) = int8_t(bs_hazard_index(h));
    }
    return h;
}
static BossHazard *bs_styled(BossHazard *h, float style) {
    if (h) {
        h->e = style;
    }
    return h;
}
// A star thrown from (x, y) to (tx, ty) that holds there and bursts into
// `sparks` after `life` ms; `gap` is the angle left empty in the burst (or < -9
// for none).
static BossShot *bs_nova(float x,
                         float y,
                         float tx,
                         float ty,
                         unsigned sparks,
                         float gap,
                         float speed,
                         unsigned long life) {
    BossShot *s = bs_shot(SF_NOVA, x, y, 0, 0, 0, life);
    if (!s) {
        return nullptr;
    }
    s->bx = tx;
    s->by = ty;
    s->amp = float(sparks);
    s->phase = gap;
    s->turn = speed;
    return s;
}
static float bs_ease(float u) {
    u = bs_clamp(u, 0, 1);
    return u * u * (3 - 2 * u);
}
static float bs_span(unsigned long t, unsigned long a, unsigned long b) {
    return bs_clamp((float(t) - a) / float(b - a), 0, 1);
}

// One creature's attack, `t` ms after it finished forming. Returns true when it
// is done.
