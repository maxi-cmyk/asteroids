#pragma once
// The rift: the Zodiarch (BK_WARDEN) and its herald Ninefold (BK_LENSIMP).
// Design: nextSteps.md P1.2 / P1.3. Art: web/tools/zodiac_art.py. Internal ids stay
// `warden` / `lensimp` so saves, records and unlocks carry over.

// ================================================================ THE ZODIARCH
// A star dragon swimming a figure of eight across the right of the field; its body follows
// the head's path, so it sweeps the space behind and beside it. A ring of the twelve zodiac
// signs turns behind it. Each attack throws a sign: its stars fly out and re-form into the
// sign's creature (700 ms, the warning), the creature carries out its attack, then dissolves
// back into the ring. Each creature shows one key star: shoot it to break the creature early,
// which also brings the next core window forward. The core is the pearl under its chin.
enum { AUX_ZOD_CLOCK = 0,      // swim clock (s); stops while it breathes
       AUX_ZOD_CORE_OPEN = 1,  // 1 while the pearl can be shot
       AUX_ZOD_BUSY = 2,       // 1 while an attack runs
       AUX_ZOD_OUT = 3,        // bit k set while sign k is out of the ring
       AUX_ZOD_PEARL_X = 4, AUX_ZOD_PEARL_Y = 5,
       AUX_ZOD_MOUTH = 6,      // 1 while the jaw is open (throwing or breathing)
       AUX_ZOD_BREATH = 7 };   // 1 while the starfire breath is warned or live
enum { STAMP_ZOD_WINDOW = 1 }; // start of the next (or current) core window

enum { SG_ARIES, SG_TAURUS, SG_GEMINI, SG_CANCER, SG_LEO, SG_VIRGO,
       SG_LIBRA, SG_SCORPIO, SG_SAGITTARIUS, SG_CAPRICORN, SG_AQUARIUS, SG_PISCES };

static const float ZOD_CX = 372, ZOD_CY = 135;     // centre of the swim and of the ring
static const float ZOD_AX = 92, ZOD_AY = 80;       // swim reach (keeps the snout right of x=216)
static const float ZOD_PERIOD = 16;                // seconds per figure of eight
static const float ZOD_RING_RX = 118, ZOD_RING_RY = 100;
static const unsigned ZOD_SEGMENTS = 26;
static const float ZOD_GAP = 13;                   // px between segment centres along the path
static const unsigned long ZOD_FORM_MS = 700, ZOD_FADE_MS = 400;
static const unsigned long ZOD_WINDOW_MS = 2500, ZOD_CLOSED_MS = 4500, ZOD_BREAK_SOONER_MS = 2000;
static const unsigned ZOD_BREAK_DAMAGE = 4;   // sub-hits a broken creature costs the dragon
// Key-star offsets from each creature's centre (zodiac_art.sign_cells), and how many hits break it.
static const float SIGN_KEY[12][2] = {{-24, -7}, {-7, -9}, {-12, -29}, {0, 2}, {-24, -6}, {-30, -36},
                                      {0, -27}, {11, -20}, {-46, -2}, {-29, -17}, {-18, -25}, {-13, -2}};
static const BossRow SEQ_ZOD[] = {
    {6, ZA_SIGN + SG_ARIES, ZA_SIGN + SG_CANCER, ZA_SIGN + SG_TAURUS, ZA_SIGN + SG_LEO,
        ZA_SIGN + SG_GEMINI, ZA_SIGN + SG_VIRGO},                                        // spring, summer
    {6, ZA_SIGN + SG_LIBRA, ZA_SIGN + SG_CAPRICORN, ZA_SIGN + SG_SCORPIO, ZA_SIGN + SG_AQUARIUS,
        ZA_SIGN + SG_SAGITTARIUS, ZA_SIGN + SG_PISCES},                                  // autumn, winter
    {1, ZA_BREATH}};
// The Great Conjunction draws from signs that leave room for each other (no walls of lanes).
static const uint8_t CONJ_SET[] = {SG_TAURUS, SG_LEO, SG_VIRGO, SG_SCORPIO, SG_SAGITTARIUS,
                                   SG_CAPRICORN, SG_AQUARIUS};

static void bs_zod_path(float clock, float& x, float& y) {
    float w = TWO_PI / ZOD_PERIOD;
    x = ZOD_CX + ZOD_AX * sinf(w * clock);
    y = ZOD_CY + ZOD_AY * sinf(2 * w * clock);
}
static void bs_zring_pos(unsigned sign, float& x, float& y) {
    float a = -BOSS_PI / 2 + sign * TWO_PI / 12 + boss.aux[AUX_ZOD_CLOCK] * .05f;
    x = ZOD_CX + ZOD_RING_RX * cosf(a);
    y = ZOD_CY + ZOD_RING_RY * sinf(a);
}
static float bs_entrance_offset() {
    if (boss.phase) return 0;
    float t = bs_min(1, bs_since(boss.born) / float(BOSS_ENTRANCE_MS));
    return 160 * (1 - t) * (1 - t);
}
// Head, pearl and the body: the segments sit at fixed arc-length steps back along the path.
static void bs_zod_place() {
    float off = bs_entrance_offset(), clock = boss.aux[AUX_ZOD_CLOCK];
    float hx, hy;
    bs_zod_path(clock, hx, hy);
    boss.x = hx + off;
    boss.y = hy;
    boss.aux[AUX_ZOD_PEARL_X] = boss.x - 56;
    boss.aux[AUX_ZOD_PEARL_Y] = boss.y + 24;
    float px = hx, py = hy, walked = 0, c = clock;
    boss.seg_n = ZOD_SEGMENTS;
    for (unsigned k = 0; k < ZOD_SEGMENTS; k++) {
        float want = k * ZOD_GAP;
        for (unsigned guard = 0; walked < want && guard < 400; guard++) {
            c -= .02f;
            float nx, ny;
            bs_zod_path(c, nx, ny);
            walked += bs_dist(px, py, nx, ny);
            px = nx;
            py = ny;
        }
        boss.seg[k][0] = px + off;
        boss.seg[k][1] = py;
        boss.seg[k][2] = 20 - k * 10.0f / (ZOD_SEGMENTS - 1);
    }
}
static void bs_zod_begin() {
    boss.aux[AUX_ZOD_CLOCK] = 0;
    boss.stamp[STAMP_ZOD_WINDOW] = game_ms + BOSS_ENTRANCE_MS + 4000;
    bs_zod_place();
}

// ---------------------------------------------------------------- the creatures
static bool bs_sign_live(const BossPart& p) { return p.exists && p.kind == PK_SIGN; }
static unsigned bs_signs_alive() {
    unsigned n = 0;
    for (const BossPart& p : boss.parts) n += bs_sign_live(p);
    return n;
}
static BossPart *bs_free_part() {
    for (BossPart& p : boss.parts)
        if (!p.exists) return &p;
    return nullptr;
}
static void bs_out_bit(unsigned sign, bool out) {
    unsigned mask = (unsigned)boss.aux[AUX_ZOD_OUT];
    mask = out ? mask | (1u << sign) : mask & ~(1u << sign);
    boss.aux[AUX_ZOD_OUT] = float(mask);
}
static float bs_lane_y(float y) { return bs_clamp(y, 40, 230); }
// A creature leaves the ring for its stage. Returns the part, or null if the pool is full.
static BossPart *bs_sign_spawn(unsigned sign, float stage_x, float stage_y, bool lead) {
    BossPart *p = bs_free_part();
    if (!p) return nullptr;
    *p = {};
    p->exists = true;
    p->kind = PK_SIGN;
    p->slot = sign;
    p->hp = p->hp_max = 3;
    p->state = 0;
    p->r = 0;
    bs_zring_pos(sign, p->sx, p->sy);
    p->x = p->sx;
    p->y = p->sy;
    p->u = stage_x;
    p->v = stage_y;
    p->until = game_ms;           // launch time
    p->lead = lead;
    bs_out_bit(sign, true);
    return p;
}
static void bs_sign_launch(unsigned sign) {
    float ty = bs_lane_y(boss.target_y), tx = boss.target_x;
    switch (sign) {
    case SG_GEMINI: {
        BossPart *a = bs_sign_spawn(sign, 330, bs_clamp(ty - 80, 24, 246), true);
        BossPart *b = bs_sign_spawn(sign, 330, bs_clamp(ty + 80, 24, 246), false);
        if (a && b) { a->link = int8_t(b - boss.parts); b->link = int8_t(a - boss.parts); }
        if (a) a->fire_at = (unsigned long)ty;
        break;
    }
    case SG_PISCES: {
        BossPart *a = bs_sign_spawn(sign, 420, bs_clamp(ty - 40, 24, 246), true);
        BossPart *b = bs_sign_spawn(sign, 420, bs_clamp(ty + 40, 24, 246), false);
        if (a && b) { a->link = int8_t(b - boss.parts); b->link = int8_t(a - boss.parts); }
        break;
    }
    case SG_CANCER:    bs_sign_spawn(sign, 410, 135, true); break;
    case SG_VIRGO:     bs_sign_spawn(sign, 410, 135, true); break;
    case SG_LIBRA:     bs_sign_spawn(sign, 400, 135, true); break;
    case SG_CAPRICORN: bs_sign_spawn(sign, 300, 292, true); break;     // dives off the bottom
    case SG_AQUARIUS:  bs_sign_spawn(sign, 430, bs_rand(70, 200), true); break;
    default:           bs_sign_spawn(sign, 440, ty, true); break;
    }
    (void)tx;
}
static void bs_drop_hazard(int8_t& index) {
    if (index >= 0 && index < int8_t(BOSS_HAZARDS)) boss.hz[index].active = false;
    index = -1;
}
// Ends a creature: it dissolves back into the ring over ZOD_FADE_MS.
static void bs_sign_dissolve(BossPart& p) {
    if (p.state == 2) return;
    p.state = 2;
    p.fire_at = game_ms;
}
// The key star was shot out: the creature (and its partner) falls apart and takes its walls,
// pulls and cords with it; the pearl's next window comes 2 s sooner, and the dragon is hurt.
static void bs_sign_break(BossPart& p, unsigned owner) {
    BossPart *pair[2] = {&p, p.link >= 0 ? &boss.parts[p.link] : nullptr};
    for (BossPart *q : pair) {
        if (!q || !q->exists || q->kind != PK_SIGN) continue;
        bs_drop_hazard(q->hz0);
        bs_drop_hazard(q->hz1);
        bs_particles(q->x, q->y);
        bs_sign_dissolve(*q);
    }
    unsigned long& window = boss.stamp[STAMP_ZOD_WINDOW];
    window = window > game_ms + ZOD_BREAK_SOONER_MS ? window - ZOD_BREAK_SOONER_MS : game_ms;
    display_shake(1);
    bs_damage(owner, ZOD_BREAK_DAMAGE);   // breaking a sign wounds the dragon too
}
static void bs_glide(BossPart& p, float x, float y, float step) {
    p.x += bs_clamp(x - p.x, -step, step);
    p.y += bs_clamp(y - p.y, -step, step);
}
static BossHazard *bs_keep(BossPart& p, BossHazard *h, bool second = false) {
    if (h) (second ? p.hz1 : p.hz0) = int8_t(bs_hazard_index(h));
    return h;
}
// One creature's attack, `t` ms after it finished forming. Returns true when it is done.
static bool bs_sign_act(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    switch (p.slot) {
    case SG_ARIES:      // lines up on the pilot's row, then charges across it
        if (bs_at(t, 0)) bs_keep(p, bs_hazard(HK_LANE, 476, y, BOSS_PI, 480, 13, 900, 450));
        if (t >= 900 && t < 1350) p.x = 440 - (t - 900) * (480.0f / 450);
        return t >= 1450;
    case SG_TAURUS:     // stampedes half the field, then the star knot bursts into seven
        if (bs_at(t, 0)) bs_keep(p, bs_hazard(HK_LANE, 470, y, BOSS_PI, 210, 14, 900, 500));
        if (t >= 900 && t < 1400) p.x = 440 - (t - 900) * (180.0f / 500);
        if (bs_at(t, 1400)) {
            unsigned n = bs_density(7);
            float spin = bs_rand(0, TWO_PI / n);
            for (unsigned k = 0; k < n; k++) bs_shot_at(SF_PELLET, x - 20, y, spin + k * TWO_PI / n, 1.4f);
        }
        return t >= 1600;
    case SG_GEMINI: {   // the twins close in from above and below; two walls, then two nearer
        if (!p.lead) return false;   // the lead twin runs both
        BossPart *q = p.link >= 0 ? &boss.parts[p.link] : nullptr;
        float ty = float(p.fire_at);
        if (bs_at(t, 0)) {
            bs_keep(p, bs_hazard(HK_LANE, 476, ty - 60, BOSS_PI, 480, 10, 900, 400));
            bs_keep(p, bs_hazard(HK_LANE, 476, ty + 60, BOSS_PI, 480, 10, 900, 400), true);
        }
        if (bs_at(t, 1400)) {
            bs_keep(p, bs_hazard(HK_LANE, 476, ty - 34, BOSS_PI, 480, 10, 900, 400));
            bs_keep(p, bs_hazard(HK_LANE, 476, ty + 34, BOSS_PI, 480, 10, 900, 400), true);
        }
        float gap = t < 1400 ? 60 : 34;
        bs_glide(p, 330, ty - gap, 1.5f);
        if (q && q->exists && q->state == 1) bs_glide(*q, 330, ty + gap, 1.5f);
        bool done = t >= 2800;
        if (done && q && q->exists) bs_sign_dissolve(*q);
        return done;
    }
    case SG_CANCER: {   // claws pinch two columns from top and bottom, each leaving a gap
        p.y = 135 + 30 * sinf(t / 260.0f);
        if (bs_at(t, 0)) {
            float x1 = bs_clamp(boss.target_x + 30, 120, 300);
            for (unsigned k = 0; k < 2; k++) {
                float cx = x1 + k * 90, gy = bs_rand(70, 200);
                BossHazard *top = bs_hazard(HK_LANE, cx, 0, BOSS_PI / 2, gy - 36, 10, 900, 700);
                BossHazard *bot = bs_hazard(HK_LANE, cx, 270, -BOSS_PI / 2, 270 - (gy + 36), 10, 900, 700);
                bs_keep(p, k ? bot : top, k);
            }
        }
        return t >= 1800;
    }
    case SG_LEO: {      // a roar (a ring with one safe notch), then a pounce down a lane
        if (bs_at(t, 0)) {
            BossHazard *h = bs_keep(p, bs_hazard(HK_RING, x, y, BOSS_PI + bs_rand(-.6f, .6f), 30, .5f, 700, 1400));
            if (h) { h->d = 3.0f; h->e = 0; }
        }
        if (bs_at(t, 1500)) {
            p.sx = bs_angle_to(x, y, boss.target_x, boss.target_y);
            bs_keep(p, bs_hazard(HK_LANE, x, y, p.sx, 320, 12, 900, 300), true);
        }
        if (t >= 2400 && t < 2700) {
            p.x += cosf(p.sx) * 320 / 15;
            p.y += sinf(p.sx) * 320 / 15;
        }
        return t >= 2900;
    }
    case SG_VIRGO:      // sows seeds that become turrets, one aimed needle each
        for (unsigned k = 0; k < 4; k++) {
            unsigned long at = k * 400;
            if (bs_at(t, at)) {
                float sx = 190 + k * 60 + bs_rand(-12, 12), sy = bs_rand(50, 220);
                float a = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
                BossHazard *h = bs_hazard(HK_AIM, sx, sy, a, 480, 0, 500, 0);
                if (h) h->d = k; // remembers which seed
            }
            if (bs_at(t, at + 500))
                for (const BossHazard& h : boss.hz)
                    if (h.active && h.kind == HK_AIM && h.d == k && h.warn_left <= FRAME_TIME_MS) {
                        bs_shot_at(SF_NEEDLE, h.x, h.y, h.a, 2.2f);
                        break;
                    }
        }
        return t >= 2400;
    case SG_LIBRA:      // tips the field toward the heavier pan, and drops weights
        if (bs_at(t, 0) && !boss_assist_calm)
            bs_keep(p, bs_hazard(HK_PULL, 240, rock_random_bounded(2) ? 4 : 266, 0, .45f, 0, 900, 2200));
        for (unsigned k = 0; k < 5; k++)
            if (bs_at(t, 900 + k * 300))
                bs_shot_at(SF_PELLET, x - 20, y + 20, BOSS_PI + (k - 2) * .22f, 1.3f);
        return t >= 3200;
    case SG_SCORPIO:    // a tail lash sweeps past, then the sting homes in
        if (bs_at(t, 0)) {
            float a0 = boss.target_y < y ? BOSS_PI + .9f : BOSS_PI - .9f;
            BossHazard *h = bs_keep(p, bs_hazard(HK_ARM, x, y, a0, 210, a0, 900, 900));
            if (h) h->d = boss.target_y < y ? -.04f : .04f;
        }
        if (bs_at(t, 2000)) {
            BossShot *s = bs_shot_at(SF_MISSILE, x - 10, y - 20, bs_angle_to(x, y, boss.target_x, boss.target_y), 1.4f, 2, 4000);
            if (s) s->turn = .035f;
        }
        return t >= 2600;
    case SG_SAGITTARIUS: { // three aim lines, then an arrow volley down them
        if (bs_at(t, 0)) {
            p.sx = bs_angle_to(x - 46, y, boss.target_x, boss.target_y);
            for (int k = -1; k <= 1; k++) bs_hazard(HK_AIM, x - 46, y, p.sx + k * .18f, 480, 0, 600, 0);
        }
        for (unsigned v = 0; v < 2; v++)
            if (bs_at(t, 600 + v * 140))
                for (int k = -1; k <= 1; k++) bs_shot_at(SF_FAST, x - 46, y, p.sx + k * .18f, 2.6f);
        return t >= 1200;
    }
    case SG_CAPRICORN: { // gone below; rises again in a wave of stars, one gap in it
        if (bs_at(t, 0)) {
            unsigned gap = rock_random_bounded(8);
            for (unsigned k = 0; k < 8; k++)
                if (k != gap) bs_shot(SF_PELLET, 60 + k * 50, 274, 0, -1.5f);
        }
        if (t >= 300) bs_glide(p, 300, 135, 2.0f);
        return t >= 1600;
    }
    case SG_AQUARIUS: { // pours a sine stream of star droplets across the field
        float a = bs_angle_to(x - 18, y - 25, boss.target_x, boss.target_y);
        if (bs_at(t, 0)) bs_hazard(HK_ARC, x - 18, y - 25, a, .12f, 260, 500, 0);
        unsigned n = bs_density(12);
        for (unsigned k = 0; k < n; k++)
            if (bs_at(t, 500 + k * 140)) bs_sine_column(x - 18, y - 25, a, 0, 1.6f, 18);
        return t >= 500 + n * 140 + 200;
    }
    case SG_PISCES: {   // two fish on a cord home in slowly; the cord between them is lethal
        if (!p.lead) return false;
        BossPart *q = p.link >= 0 ? &boss.parts[p.link] : nullptr;
        if (!q || !q->exists) return true;
        if (bs_at(t, 0)) bs_keep(p, bs_hazard(HK_LANE, p.x, p.y, 0, 1, 3, 900, 3600));
        if (t >= 900) {
            bs_glide(p, boss.target_x + 40, boss.target_y - 34, .55f);
            bs_glide(*q, boss.target_x + 40, boss.target_y + 34, .55f);
        }
        if (p.hz0 >= 0) {
            BossHazard& h = boss.hz[p.hz0];
            if (h.active && h.kind == HK_LANE) {
                h.x = p.x; h.y = p.y;
                h.a = bs_angle_to(p.x, p.y, q->x, q->y);
                h.b = bs_dist(p.x, p.y, q->x, q->y);
            }
        }
        bool done = t >= 900 + 3600;
        if (done) bs_sign_dissolve(*q);
        return done;
    }
    }
    return true;
}
static void bs_signs_tick() {
    for (unsigned i = 0; i < BOSS_PARTS; i++) {
        BossPart& p = boss.parts[i];
        if (!bs_sign_live(p)) continue;
        unsigned long t = game_ms - p.until;
        if (p.state == 2) {
            unsigned long gone = game_ms - p.fire_at;
            p.r = 1 - bs_min(1, gone / float(ZOD_FADE_MS));
            if (gone >= ZOD_FADE_MS) {
                p.exists = false;
                bool still = false;
                for (const BossPart& q : boss.parts) still |= bs_sign_live(q) && q.slot == p.slot;
                if (!still) bs_out_bit(p.slot, false);
            }
            continue;
        }
        if (t < ZOD_FORM_MS) {     // re-forming out of the ring: the warning
            float e = t / float(ZOD_FORM_MS);
            e = 1 - (1 - e) * (1 - e);
            p.state = 0;
            p.r = e;
            p.x = p.sx + (p.u - p.sx) * e;
            p.y = p.sy + (p.v - p.sy) * e;
            continue;
        }
        if (p.state == 0) { p.state = 1; p.r = 1; p.x = p.u; p.y = p.v; }
        if (p.slot == SG_GEMINI || p.slot == SG_PISCES) {
            if (!p.lead) continue;   // the lead one runs the pair
        }
        if (bs_sign_act(p, t - ZOD_FORM_MS)) {
            bs_drop_hazard(p.hz0);
            bs_drop_hazard(p.hz1);
            bs_sign_dissolve(p);
        }
    }
}

// ---------------------------------------------------------------- the fight
static bool bs_breathing() { return boss.kind == BK_WARDEN && boss.aux[AUX_ZOD_BREATH] > .5f; }
static void bs_zod_update() {
    // It swims at half speed while the pearl is open (the opening is a real chance), and holds
    // still while it breathes.
    if (boss.phase && !bs_breathing())
        boss.aux[AUX_ZOD_CLOCK] += FRAME_TIME_MS / 1000.0f * (boss.aux[AUX_ZOD_CORE_OPEN] > .5f ? .5f : 1.0f);
    bs_zod_place();
    if (!boss.phase) return;
    // The pearl opens for 2.5 s every 7 s (sooner each time a creature is broken).
    if (game_ms >= boss.stamp[STAMP_ZOD_WINDOW] + ZOD_WINDOW_MS) boss.stamp[STAMP_ZOD_WINDOW] = game_ms + ZOD_CLOSED_MS;
    boss.aux[AUX_ZOD_CORE_OPEN] = game_ms >= boss.stamp[STAMP_ZOD_WINDOW] && game_ms < boss.stamp[STAMP_ZOD_WINDOW] + ZOD_WINDOW_MS ? 1.0f : 0.0f;
    boss.aux[AUX_ZOD_BUSY] = boss.atk ? 1.0f : 0.0f;
    bool throwing = boss.atk && boss.atk != ZA_BREATH && game_ms - boss.atk_t0 < ZOD_FORM_MS;
    boss.aux[AUX_ZOD_MOUTH] = throwing || bs_breathing() ? 1.0f : 0.0f;
    bs_signs_tick();
}
// Starfire breath (phase 3 on): it stops, opens its jaw and breathes three fanned lanes.
static bool bs_zod_breath(unsigned long t) {
    float mx = boss.x - 70, my = boss.y + 4;
    if (bs_at(t, 0)) {
        boss.aux[AUX_ZOD_BREATH] = 1;
        float a = bs_angle_to(mx, my, boss.target_x, boss.target_y);
        // Only forward, and short of the corners, so there is always a way out sideways.
        // The outer lanes stay within 0.5 rad of straight ahead, so the corners are never inside one.
        a = bs_clamp(bs_wrap(a - BOSS_PI), -.24f, .24f) + BOSS_PI;
        for (int k = -1; k <= 1; k++) bs_hazard(HK_LANE, mx, my, a + k * .26f, 230, 10, 900, 600);
    }
    if (t >= 1600) { boss.aux[AUX_ZOD_BREATH] = 0; return true; }
    return false;
}
static bool bs_zod_run(int id, unsigned long t) {
    if (id == ZA_BREATH) return bs_zod_breath(t);
    if (bs_at(t, 0)) {
        if (id == ZA_CONJ) {
            // Three signs from three sides of the ring at once.
            uint8_t picks[3];
            unsigned n = 0;
            for (unsigned tries = 0; n < 3 && tries < 40; tries++) {
                uint8_t s = CONJ_SET[rock_random_bounded(sizeof(CONJ_SET))];
                bool dup = false;
                for (unsigned j = 0; j < n; j++) dup |= picks[j] == s;
                if (!dup) picks[n++] = s;
            }
            for (unsigned j = 0; j < n; j++) bs_sign_launch(picks[j]);
        } else bs_sign_launch(unsigned(id - ZA_SIGN));
    }
    return t >= ZOD_FORM_MS + 100 && !bs_signs_alive();
}
static int bs_zod_pick() {
    if (bs_frenzy() && boss.seq_total % 2 == 0) return ZA_CONJ;
    if (boss.phase >= 3) {
        if (boss.seq_total % 3 == 0) return ZA_BREATH;
        return ZA_SIGN + int(rock_random_bounded(12));   // the whole ring
    }
    return bs_seq_pick(SEQ_ZOD, 3);
}
static void bs_zod_circles() {
    // The head soaks shots (the laser passes through). The body is only a contact hazard: it
    // coils between the pilot and the pearl too often to soak shots fairly.
    bs_circle(boss.x - 14, boss.y - 2, 18, BC_BLOCK, 0, 1);
    bs_circle(boss.x - 52, boss.y - 3, 10, BC_BLOCK, 0, 1);
    float px = boss.aux[AUX_ZOD_PEARL_X], py = boss.aux[AUX_ZOD_PEARL_Y];
    // The pearl: shots land only while it is open; the laser always reaches it.
    if (boss.aux[AUX_ZOD_CORE_OPEN] > .5f) bs_circle(px, py, 14, BC_CORE, 0, 3);
    else bs_circle(px, py, 14, BC_CORE, 0, 2);
    for (unsigned i = 0; i < BOSS_PARTS; i++) {
        const BossPart& p = boss.parts[i];
        if (!bs_sign_live(p) || p.state != 1) continue;
        bs_circle(p.x + SIGN_KEY[p.slot][0], p.y + SIGN_KEY[p.slot][1], 8, BC_PART, i, 3);
    }
}
static unsigned bs_zod_body(float *out) {
    unsigned n = 0;
    bs_guard_body(out, n, boss.x - 14, boss.y - 2, 17);
    bs_guard_body(out, n, boss.x - 52, boss.y - 3, 9);
    for (unsigned k = 0; k < boss.seg_n; k++)
        bs_guard_body(out, n, boss.seg[k][0], boss.seg[k][1], boss.seg[k][2] * .9f);
    for (const BossPart& p : boss.parts)
        if (bs_sign_live(p) && p.state == 1) bs_guard_body(out, n, p.x, p.y, p.slot == SG_PISCES ? 8 : 12);
    return n;
}
static void bs_zod_hit(BossPart& p, unsigned owner, unsigned damage, bool laser) {
    if (p.kind != PK_SIGN || p.state != 1) return;
    unsigned hurt = laser ? p.hp : damage;
    p.hp = hurt >= (unsigned)p.hp ? 0 : p.hp - hurt;
    if (p.hp <= 0) bs_sign_break(p, owner);
}
static void bs_zod_phase(unsigned) {}

// ================================================================ NINEFOLD
// A fox of the rift, star-filled like its master, with nine tails fanned behind it. Every hit
// on a tail reaches the fox; as its health falls the tails come away one by one (the tails left
// are its health bar). Losing a tail, or seeing through an illusion, opens the forehead mark
// (the core) for 2.5 s. It fires comets from its tails, sends foxfire, splits into illusions
// and blinks across the field.
enum { AUX_FOX_CLOCK = 0, AUX_FOX_BLINK = 1, AUX_FOX_OPEN = 2, AUX_FOX_TAILS = 3,
       AUX_FOX_ILLUSION = 4 };
enum { STAMP_FOX_BLINK_UNTIL = 3, STAMP_FOX_OPEN_UNTIL = 4 };
// Offsets from the fox's frame centre (zodiac_art.fox_geometry).
static const float FOX_TAIL[9][2] = {{-18, -22}, {-2, -27}, {15, -28}, {31, -24}, {45, -16},
                                     {56, -5}, {63, 8}, {65, 23}, {63, 38}};
static const float FOX_HEAD[3] = {-35, -40, 17}, FOX_MARK[2] = {-33, -54}, FOX_BODY[3] = {-19, 22, 30};
static const BossRow SEQ_FOX[] = {{4, NA_COMETS, NA_FOXFIRE, NA_ILLUSION, NA_BLINK}};

static unsigned bs_fox_tails() {
    unsigned n = 0;
    for (unsigned i = 0; i < 9; i++) n += boss.parts[i].exists && boss.parts[i].kind == PK_TAIL;
    return n;
}
static bool bs_fox_open() { return boss.kind == BK_LENSIMP && game_ms < boss.stamp[STAMP_FOX_OPEN_UNTIL]; }
static bool bs_blinking() {
    return boss.kind == BK_LENSIMP && boss.stamp[STAMP_FOX_BLINK_UNTIL] && game_ms < boss.stamp[STAMP_FOX_BLINK_UNTIL];
}
static void bs_fox_begin() {
    for (unsigned i = 0; i < 9; i++) {
        BossPart& p = boss.parts[i];
        p = {};
        p.exists = true; p.kind = PK_TAIL; p.slot = i; p.r = 10;
    }
}
static void bs_fox_open_core() { boss.stamp[STAMP_FOX_OPEN_UNTIL] = game_ms + 2500; }
static void bs_fox_update() {
    boss.aux[AUX_FOX_CLOCK] += FRAME_TIME_MS / 1000.0f;
    for (unsigned i = 0; i < 9; i++) {
        BossPart& p = boss.parts[i];
        p.x = boss.x + FOX_TAIL[i][0];
        p.y = boss.y + FOX_TAIL[i][1];
    }
    // Health is the tail count: shed tails (outermost first) down to ceil(9 * health / max).
    unsigned want = boss.maximum ? (9 * boss.health + boss.maximum - 1) / boss.maximum : 9;
    for (int i = 8; i >= 0 && bs_fox_tails() > want; i--) {
        BossPart& p = boss.parts[i];
        if (!p.exists) continue;
        p.exists = false;
        bs_particles(p.x, p.y);
        bs_fox_open_core();
        display_shake(1);
    }
    boss.aux[AUX_FOX_TAILS] = float(bs_fox_tails());
    boss.aux[AUX_FOX_OPEN] = bs_fox_open() ? 1.0f : 0.0f;
    boss.aux[AUX_FOX_BLINK] = bs_blinking() ? 1.0f : 0.0f;
    unsigned decoys = 0;
    for (unsigned i = 9; i < BOSS_PARTS; i++) decoys += boss.parts[i].exists && boss.parts[i].kind == PK_DECOY;
    boss.aux[AUX_FOX_ILLUSION] = float(decoys);
}
static float bs_fox_free_y(float avoid) {
    float y = bs_rand(70, 200);
    if (fabsf(y - avoid) < 50) y = y < 135 ? y + 60 : y - 60;
    return bs_clamp(y, 60, 210);
}
static bool bs_fox_run(int id, unsigned long t) {
    float x = boss.x, y = boss.y;
    switch (id) {
    case NA_COMETS: {   // the tails flick comets down aim lines; fewer tails, fewer but faster
        unsigned tails = bs_fox_tails();
        unsigned n = bs_max(2, (tails + 1) / 2);
        float speed = 1.8f + (9 - tails) * .12f;
        for (unsigned k = 0; k < n; k++) {
            unsigned i = (k * 9 / n) % 9;
            float sx = x + FOX_TAIL[i][0] + 10, sy = y + FOX_TAIL[i][1] - 6;
            if (bs_at(t, k * 150)) {
                float a = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
                BossHazard *h = bs_hazard(HK_AIM, sx, sy, a, 480, 0, 500, 0);
                if (h) h->d = k;
            }
            if (bs_at(t, k * 150 + 500))
                for (const BossHazard& h : boss.hz)
                    if (h.active && h.kind == HK_AIM && h.d == k && h.warn_left <= FRAME_TIME_MS) {
                        bs_shot_at(SF_FAST, h.x, h.y, h.a, speed);
                        break;
                    }
        }
        return t >= n * 150 + 700;
    }
    case NA_FOXFIRE:    // three slow wisps that home in; two hits put one out
        for (unsigned k = 0; k < 3; k++)
            if (bs_at(t, k * 400)) {
                float a = BOSS_PI + (k - 1.0f) * .9f;
                float sx = x + FOX_HEAD[0] + cosf(a) * 24, sy = y + FOX_HEAD[1] + 40 + sinf(a) * 24;
                BossShot *s = bs_shot_at(SF_MISSILE, sx, sy, a, 1.4f, 2, 3600);
                if (s) s->turn = .03f;
            }
        return t >= 1600;
    case NA_ILLUSION: { // two decoys appear; only the real fox has lit eyes. Pop both to see through it
        if (bs_at(t, 0)) bs_hazard(HK_TELL, x, y, 0, 90, 0, 600, 0);
        if (bs_at(t, 600)) {
            float ys[3] = {70, 135, 200};
            unsigned real = rock_random_bounded(3);
            for (unsigned k = 0; k < 3; k++) {
                if (k == real) { boss.home_y = ys[k]; boss.y = ys[k]; continue; }
                BossPart *p = nullptr;
                for (unsigned i = 9; i < BOSS_PARTS; i++)
                    if (!boss.parts[i].exists) { p = &boss.parts[i]; break; }
                if (!p) continue;
                *p = {};
                p->exists = true; p->kind = PK_DECOY; p->slot = k; p->hp = p->hp_max = 2;
                p->x = boss.x; p->y = ys[k]; p->r = 22;
            }
            boss.scratch[0] = 1; // illusion up and not yet seen through
        }
        if (bs_at(t, 1400))
            for (unsigned i = 9; i < BOSS_PARTS; i++) {
                BossPart& p = boss.parts[i];
                if (!p.exists || p.kind != PK_DECOY) continue;
                float hx = p.x + FOX_HEAD[0], hy = p.y + FOX_HEAD[1];
                bs_hazard(HK_AIM, hx, hy, bs_angle_to(hx, hy, boss.target_x, boss.target_y), 480, 0, 500, 0);
            }
        if (bs_at(t, 1900))
            for (const BossHazard& h : boss.hz)
                if (h.active && h.kind == HK_AIM && h.warn_left <= FRAME_TIME_MS) bs_shot_at(SF_NEEDLE, h.x, h.y, h.a, 2.2f);
        unsigned left = 0;
        for (unsigned i = 9; i < BOSS_PARTS; i++) left += boss.parts[i].exists && boss.parts[i].kind == PK_DECOY;
        if (t > 600 && !left && boss.scratch[0] > .5f) {   // both popped: seen through
            boss.scratch[0] = 0;
            bs_fox_open_core();
        }
        if (t >= 3600) {
            for (unsigned i = 9; i < BOSS_PARTS; i++)
                if (boss.parts[i].kind == PK_DECOY) boss.parts[i].exists = false;
            return true;
        }
        return false;
    }
    case NA_BLINK:      // a shimmer, then it is gone and back at another height
        if (bs_at(t, 0)) {
            bs_hazard(HK_TELL, x, y, 0, 80, 0, 500, 0);
            boss.stamp[STAMP_FOX_BLINK_UNTIL] = game_ms + 1000;
        }
        if (bs_at(t, 500)) {
            float ny = bs_fox_free_y(boss.home_y);
            boss.home_y = ny;
            boss.y = ny;
        }
        return t >= 1100;
    }
    return true;
}
static int bs_fox_pick() { return bs_seq_pick(SEQ_FOX, 1); }
static void bs_fox_circles() {
    if (bs_blinking()) return;
    for (unsigned i = 0; i < 9; i++)
        if (boss.parts[i].exists) bs_circle(boss.parts[i].x, boss.parts[i].y, 10, BC_PART, i, 3);
    // The forehead mark: open after a lost tail or a solved illusion; the laser always reaches it.
    bs_circle(boss.x + FOX_MARK[0], boss.y + FOX_MARK[1], 8, BC_CORE, 0, bs_fox_open() ? 3 : 2);
    // The body and head do not soak shots: the tails fanned behind them stay reachable.
    for (unsigned i = 9; i < BOSS_PARTS; i++)
        if (boss.parts[i].exists && boss.parts[i].kind == PK_DECOY)
            bs_circle(boss.parts[i].x + FOX_BODY[0], boss.parts[i].y + FOX_BODY[1], 26, BC_PART, i, 3);
}
static unsigned bs_fox_body(float *out) {
    unsigned n = 0;
    if (bs_blinking()) return 0;
    bs_guard_body(out, n, boss.x + FOX_BODY[0], boss.y + FOX_BODY[1], FOX_BODY[2]);
    bs_guard_body(out, n, boss.x + FOX_HEAD[0], boss.y + FOX_HEAD[1], FOX_HEAD[2]);
    return n;
}
static void bs_fox_hit(BossPart& p, unsigned owner, unsigned damage, bool laser) {
    if (p.kind == PK_TAIL) {         // a tail hit reaches the fox; the tail falls with its health
        bs_damage(owner, laser ? damage * bs_ops().k : damage);
        boss.flash_until = game_ms + 80;
        return;
    }
    if (p.kind == PK_DECOY) {
        unsigned hurt = laser ? p.hp : damage;
        p.hp = hurt >= (unsigned)p.hp ? 0 : p.hp - hurt;
        if (p.hp <= 0) { p.exists = false; bs_particles(p.x, p.y); }
    }
}

static const BossOps OPS_WARDEN = {372, 135, 4, 3, {70, 35}, {1000, 850, 700},
    bs_zod_begin, bs_zod_update, bs_zod_pick, bs_zod_run, bs_zod_circles,
    bs_zod_body, bs_zod_phase, nullptr, bs_zod_hit};
static const BossOps OPS_LENSIMP = {340, 135, 6, 1, {0, 0}, {1000, 1000, 1000},
    bs_fox_begin, bs_fox_update, bs_fox_pick, bs_fox_run, bs_fox_circles,
    bs_fox_body, nullptr, nullptr, bs_fox_hit};
