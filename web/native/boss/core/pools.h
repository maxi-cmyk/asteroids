#pragma once

// ---------------------------------------------------------------- pools
static float bs_shot_radius(uint8_t f) {
    static const float r[]
            = {2, 3, 3, 4, 2.5f, 4, 5, 5, 18, 2, 2.5f, 3, 6, 3.5f, 3.5f, 4};
    return r[f];
}
static bool bs_shootable(uint8_t f) {
    return f == SF_MISSILE || f == SF_MINE || f == SF_LOB || f == SF_SPORE
           || f == SF_FIREBALL;
}
static unsigned bs_shot_count() {
    unsigned n = 0;
    for (const BossShot& s : boss.shots) {
        n += s.active;
    }
    return n;
}
static bool bs_lethal_kind(uint8_t k) {
    return k <= HK_ARM;
}
static unsigned bs_lethal_count() {
    unsigned n = 0;
    for (const BossHazard& h : boss.hz) {
        n += h.active && bs_lethal_kind(h.kind);
    }
    return n;
}
static int bs_shot_index(const BossShot *s) {
    return s ? int(s - boss.shots) : -1;
}
static BossShot *bs_shot(uint8_t family,
                         float x,
                         float y,
                         float dx,
                         float dy,
                         int hp = 0,
                         unsigned long life = 0) {
    if (bs_shot_count() >= BOSS_SHOTS) {
        return nullptr;
    }
    for (BossShot& s : boss.shots) {
        if (s.active) {
            continue;
        }
        s = {};
        s.active = true;
        s.family = family;
        s.hp = hp;
        s.x = s.bx = x;
        s.y = s.by = y;
        s.dx = dx;
        s.dy = dy;
        s.born = game_ms;
        s.life = life;
        unsigned n = bs_shot_count();
        if (n > boss.max_shots) {
            boss.max_shots = n;
        }
        return &s;
    }
    return nullptr;
}
static BossShot *bs_shot_at(uint8_t family,
                            float x,
                            float y,
                            float angle,
                            float speed,
                            int hp = 0,
                            unsigned long life = 0) {
    return bs_shot(
            family, x, y, cosf(angle) * speed, sinf(angle) * speed, hp, life);
}
static unsigned long bs_warn_min(uint8_t kind) {
    return kind == HK_RING ? 700 : bs_lethal_kind(kind) ? 900 : 0;
}
static BossHazard *bs_hazard(uint8_t kind,
                             float x,
                             float y,
                             float a,
                             float b,
                             float c,
                             unsigned long warn,
                             unsigned long live) {
    if (bs_lethal_kind(kind) && bs_lethal_count() >= BOSS_LETHAL_CAP) {
        return nullptr;
    }
    if (boss_assist_long) {
        warn = warn * 13 / 10;
    }
    for (BossHazard& h : boss.hz) {
        if (h.active) {
            continue;
        }
        h = {};
        h.active = true;
        h.kind = kind;
        h.x = x;
        h.y = y;
        h.a = a;
        h.b = b;
        h.c = c;
        h.warn_total = h.warn_left = warn;
        h.live_left = live;
        unsigned n = bs_lethal_count();
        if (n > boss.max_hazards) {
            boss.max_hazards = n;
        }
        return &h;
    }
    return nullptr;
}
static int bs_hazard_index(const BossHazard *h) {
    return h ? int(h - boss.hz) : -1;
}
static void bs_clear_threats() {
    for (BossShot& s : boss.shots) {
        s.active = false;
    }
    for (BossHazard& h : boss.hz) {
        h.active = false;
    }
}
static BossPart *bs_part(unsigned i) {
    return &boss.parts[i];
}
