#pragma once
// The rift: the Zodiarch (BK_WARDEN) and its herald Ninefold (BK_LENSIMP).
// Design: nextSteps.md P1.2 / P1.3. Art: web/tools/zodiac_art.py. Internal ids stay
// `warden` / `lensimp` so saves, records and unlocks carry over.

// ================================================================ THE ZODIARCH
// A star dragon swimming a figure of eight across the right of the field; its body follows
// the head's path, so it sweeps the space behind and beside it. A ring of the twelve zodiac
// signs turns behind it. It throws signs: their stars fly out and re-form into the sign's
// creature (700 ms, the warning) in front of its coils, the creature carries out its attack,
// then dissolves back into the ring. Up to one sign is out in phase 1, two in phase 2, three
// in phase 3 and four in the frenzy, and between throws it attacks on its own. Every shot and
// wall leaves from a visible point on a body (nextSteps.md P2.3): the emitters below. Each
// creature shows one key star: shoot it to break the creature early, which also brings the
// next core window forward. The core is the pearl under its chin.
enum { AUX_ZOD_CLOCK = 0,      // swim clock (s); stops while it breathes or attacks itself
       AUX_ZOD_CORE_OPEN = 1,  // 1 while the pearl can be shot
       AUX_ZOD_BUSY = 2,       // 1 while an attack runs
       AUX_ZOD_OUT = 3,        // bit k set while sign k is out of the ring
       AUX_ZOD_PEARL_X = 4, AUX_ZOD_PEARL_Y = 5,
       AUX_ZOD_MOUTH = 6,      // 1 while the jaw is open (throwing or breathing)
       AUX_ZOD_BREATH = 7,     // 1 while the starfire breath is warned or live
       AUX_ZOD_HOLD = 8,       // 1 while it holds still for one of its own attacks
       AUX_ZOD_NEXT = 9,       // the next sign in its rotation
       AUX_ZOD_LAST_SIGN = 10,  // signs thrown in a row since its last own attack
       AUX_ZOD_OWN_NEXT = 11 }; // the next of its own attacks in its rotation
enum { STAMP_ZOD_WINDOW = 1 }; // start of the next (or current) core window

enum { SG_ARIES, SG_TAURUS, SG_GEMINI, SG_CANCER, SG_LEO, SG_VIRGO,
       SG_LIBRA, SG_SCORPIO, SG_SAGITTARIUS, SG_CAPRICORN, SG_AQUARIUS, SG_PISCES };

static const float ZOD_CX = 372, ZOD_CY = 135;     // centre of the swim and of the ring
static const float ZOD_AX = 92, ZOD_AY = 80;       // swim reach (keeps the snout right of x=216)
static const float ZOD_PERIOD = 16;                // seconds per figure of eight
static const float ZOD_RING_RX = 118, ZOD_RING_RY = 100;
static const unsigned ZOD_SEGMENTS = 26;
static const float ZOD_GAP = 13;                   // px between segment centres along the path
static const unsigned long ZOD_FORM_MS = 700, ZOD_FADE_MS = 400, ZOD_BREAK_FADE_MS = 900;
static const unsigned long ZOD_WINDOW_MS = 2500, ZOD_CLOSED_MS = 4500, ZOD_BREAK_SOONER_MS = 2000;
static const unsigned ZOD_BREAK_DAMAGE = 2;   // sub-hits a broken creature costs the dragon (several are out at once)
static const float ZOD_RUN = 1.1f;            // px per ms: a charge (Aries, Taurus, Leo's pounce)
// Key-star offsets from each creature's centre in its strike frame (zodiac_myth.game_cells);
// three hits break it. Contact stays a 12 px circle at the centre (8 for a fish): a charging
// creature's lane is warned for that width, so the bigger P2 art never reaches past it.
static const float SIGN_KEY[12][2] = {{-34, -7}, {-38, 5}, {1, -33}, {4, 17}, {-20, -6}, {-48, -42}, {-45, 17}, {-2, 14}, {-54, -26}, {55, 4}, {17, -21}, {10, 2}};
// Emitters: where each creature's attacks come out, from its centre in the strike frame
// (zodiac_myth.EMIT_POINTS; mirrored as SIGN_EMIT in src/boss/scene.mjs).
enum { E_HORNS = 0, E_HOOVES = 1,                       // Aries
       E_EYE = 0, E_MUZZLE = 1,                         // Taurus
       E_HAND = 0, E_B_HAND = 1,                        // Gemini (B is the second twin)
       E_CLAW_NEAR = 0, E_CLAW_FAR = 1,                 // Cancer
       E_MOUTH = 0, E_LEO_EYE = 1, E_MANE = 2,          // Leo
       E_WHEAT = 0, E_V_HAND = 1,                       // Virgo
       E_PAN_NEAR = 0, E_PAN_FAR = 1,                   // Libra
       E_STING = 0,                                     // Scorpius
       E_ARROW = 0,                                     // Sagittarius
       E_URN = 0,                                       // Aquarius
       E_FISH_MOUTH = 0 };                              // Pisces
static const float SIGN_EMIT[12][3][2] = {
    {{-48, 4}, {-34, 38}, {0, 0}},   {{-38, 5}, {-52, 14}, {0, 0}},   {{-18, -58}, {-28, -24}, {0, 0}},
    {{-50, -26}, {32, -34}, {0, 0}}, {{-58, -15}, {-48, -23}, {-32, -20}}, {{-48, -42}, {-42, -28}, {0, 0}},
    {{-45, 14}, {45, -8}, {0, 0}},   {{16, -25}, {62, 10}, {0, 0}},   {{-54, -26}, {0, 0}, {0, 0}},
    {{-52, 2}, {54, 4}, {0, 0}},     {{-5, -42}, {0, 0}, {0, 0}},     {{26, -2}, {0, 0}, {0, 0}}};
static void bs_emit(const BossPart& p, unsigned which, float& x, float& y) {
    x = p.x + SIGN_EMIT[p.slot][which][0];
    y = p.y + SIGN_EMIT[p.slot][which][1];
}
// What kind of trouble each sign makes, for deciding which can share the field.
enum { CL_WALL = 1, CL_CHARGE = 2, CL_FIELD = 4, CL_RANGED = 8 };
static const uint8_t SIGN_CLASS[12] = {CL_CHARGE, CL_CHARGE, CL_WALL, CL_WALL, CL_CHARGE, CL_RANGED,
                                       CL_FIELD, CL_RANGED, CL_RANGED, CL_RANGED, CL_RANGED, CL_WALL};
static const BossRow SEQ_ZOD[] = {
    {6, ZA_SIGN + SG_ARIES, ZA_SIGN + SG_CANCER, ZA_SIGN + SG_TAURUS, ZA_SIGN + SG_LEO,
        ZA_SIGN + SG_GEMINI, ZA_SIGN + SG_VIRGO},                                        // spring, summer
    {6, ZA_SIGN + SG_LIBRA, ZA_SIGN + SG_CAPRICORN, ZA_SIGN + SG_SCORPIO, ZA_SIGN + SG_AQUARIUS,
        ZA_SIGN + SG_SAGITTARIUS, ZA_SIGN + SG_PISCES},                                  // autumn, winter
    {1, ZA_BREATH}};
// The Great Conjunction draws from signs that leave room for each other (no walls of lanes).
static const uint8_t CONJ_SET[] = {SG_TAURUS, SG_LEO, SG_VIRGO, SG_SCORPIO, SG_SAGITTARIUS,
                                   SG_CAPRICORN, SG_AQUARIUS};
// Hazard styles the renderer reads from `e` (lanes, aims, tells) or `d` (arcs).
enum { ZS_PLAIN = 0, ZS_NET = 1, ZS_TETHER = 2, ZS_CORD = 3, ZS_SEED = 5, ZS_SWIRL = 8,
       ZS_SPLASH = 9, ZS_FISH = 11 };

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
// The dragon's own emitters (mirrored as ZOD_EMIT in src/boss/scene.mjs).
static void bs_zod_eye(float& x, float& y) { x = boss.x - 38; y = boss.y - 12; }
static void bs_zod_jaw(float& x, float& y) { x = boss.x - 72; y = boss.y + 3; }
static void bs_zod_claw(unsigned k, float& x, float& y) {
    const float *s = boss.seg[k ? 15 : 4];
    x = s[0] - 4;
    y = s[1] + s[2] * .55f + 20;
}
static void bs_zod_tail(float& x, float& y) { x = boss.seg[ZOD_SEGMENTS - 1][0]; y = boss.seg[ZOD_SEGMENTS - 1][1]; }
static void bs_zod_begin() {
    boss.aux[AUX_ZOD_CLOCK] = 0;
    boss.stamp[STAMP_ZOD_WINDOW] = game_ms + BOSS_ENTRANCE_MS + 4000;
    bs_zod_place();
}
// How far from (x, y) along `a` to just past the edge of the screen.
static float bs_edge_len(float x, float y, float a) {
    float ca = cosf(a), sa = sinf(a), best = 600;
    if (ca < -.01f) best = bs_min(best, (x + 40) / -ca);
    if (ca > .01f) best = bs_min(best, (SCREEN_W + 40 - x) / ca);
    if (sa < -.01f) best = bs_min(best, (y + 40) / -sa);
    if (sa > .01f) best = bs_min(best, (SCREEN_H + 40 - y) / sa);
    return best;
}
static bool bs_offscreen(float x, float y) { return x < -70 || x > SCREEN_W + 70 || y < -70 || y > SCREEN_H + 70; }

// ---------------------------------------------------------------- the creatures
static bool bs_sign_live(const BossPart& p) { return p.exists && p.kind == PK_SIGN; }
static unsigned bs_signs_alive() {
    unsigned n = 0;
    for (const BossPart& p : boss.parts) n += bs_sign_live(p);
    return n;
}
// Signs out (a pair counts once) and the classes of trouble they make.
static unsigned bs_signs_out(uint8_t *classes = nullptr, unsigned *ranged = nullptr) {
    unsigned n = 0, r = 0;
    uint8_t cl = 0;
    for (const BossPart& p : boss.parts)
        if (bs_sign_live(p) && p.lead && p.state != 2) {
            n++;
            cl |= SIGN_CLASS[p.slot];
            r += SIGN_CLASS[p.slot] == CL_RANGED;
        }
    if (classes) *classes = cl;
    if (ranged) *ranged = r;
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
static bool bs_sign_is_out(unsigned sign) { return ((unsigned)boss.aux[AUX_ZOD_OUT] >> sign) & 1u; }
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
// Creatures form in front of the dragon's coils (x 185-215: the coils reach x 260 at the
// left of its swim, and a creature is up to 80 px either side of its centre).
static void bs_sign_launch(unsigned sign) {
    float ty = bs_lane_y(boss.target_y);
    switch (sign) {
    case SG_GEMINI: {   // a twin's hand on each lane row, either side of the pilot
        float row_a = bs_clamp(ty - 60, 20, 188), row_b = bs_clamp(ty + 60, 20, 222);
        BossPart *a = bs_sign_spawn(sign, 185, bs_clamp(row_a - SIGN_EMIT[SG_GEMINI][E_HAND][1], 24, 246), true);
        BossPart *b = bs_sign_spawn(sign, 215, bs_clamp(row_b - SIGN_EMIT[SG_GEMINI][E_B_HAND][1], 24, 246), false);
        if (a && b) { a->link = int8_t(b - boss.parts); b->link = int8_t(a - boss.parts); }
        if (a) a->fire_at = (unsigned long)ty;
        break;
    }
    case SG_PISCES: {   // the fish part as wide as the field allows
        BossPart *a = bs_sign_spawn(sign, 220, 40, true);
        BossPart *b = bs_sign_spawn(sign, 226, 230, false);
        if (a && b) { a->link = int8_t(b - boss.parts); b->link = int8_t(a - boss.parts); }
        break;
    }
    case SG_CANCER:    bs_sign_spawn(sign, 190, 130, true); break;
    case SG_LIBRA:     bs_sign_spawn(sign, 195, 125, true); break;
    case SG_SCORPIO:   bs_sign_spawn(sign, 195, bs_clamp(ty, 70, 200), true); break;
    case SG_CAPRICORN: bs_sign_spawn(sign, 190, bs_clamp(ty, 80, 190), true); break;
    case SG_AQUARIUS:  bs_sign_spawn(sign, 200, bs_clamp(ty + 20, 70, 210), true); break;
    case SG_ARIES:
    case SG_TAURUS:    bs_sign_spawn(sign, 210, ty, true); break;
    default:           bs_sign_spawn(sign, 200, bs_clamp(ty, 60, 210), true); break;
    }
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
// A broken creature keeps hp 0 while it fades, so the renderer can tell a break from a dissolve.
static void bs_sign_break(BossPart& p, unsigned owner) {
    BossPart *pair[2] = {&p, p.link >= 0 ? &boss.parts[p.link] : nullptr};
    for (BossPart *q : pair) {
        if (!q || !q->exists || q->kind != PK_SIGN) continue;
        bs_drop_hazard(q->hz0);
        bs_drop_hazard(q->hz1);
        bs_particles(q->x, q->y);
        q->hp = 0;
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
static BossHazard *bs_styled(BossHazard *h, float style) {
    if (h) h->e = style;
    return h;
}
// A star thrown from (x, y) to (tx, ty) that holds there and bursts into `sparks` after
// `life` ms; `gap` is the angle left empty in the burst (or < -9 for none).
static BossShot *bs_nova(float x, float y, float tx, float ty, unsigned sparks, float gap, float speed, unsigned long life) {
    BossShot *s = bs_shot(SF_NOVA, x, y, 0, 0, 0, life);
    if (!s) return nullptr;
    s->bx = tx;
    s->by = ty;
    s->amp = float(sparks);
    s->phase = gap;
    s->turn = speed;
    return s;
}
static float bs_ease(float u) { u = bs_clamp(u, 0, 1); return u * u * (3 - 2 * u); }
static float bs_span(unsigned long t, unsigned long a, unsigned long b) { return bs_clamp((float(t) - a) / float(b - a), 0, 1); }

// One creature's attack, `t` ms after it finished forming. Returns true when it is done.
static bool bs_sign_act(BossPart& p, unsigned long t) {
    float x = p.x, y = p.y;
    switch (p.slot) {
    case SG_ARIES: {    // light on the horns, a lane from the ram to the edge, and the full charge
        if (bs_at(t, 0)) bs_keep(p, bs_hazard(HK_LANE, p.u + SIGN_EMIT[SG_ARIES][E_HORNS][0], y, BOSS_PI, p.u + 40, 13, 900, 500));
        if (t >= 900) p.x = p.u - (t - 900) * ZOD_RUN;
        return p.x < -70;
    }
    case SG_TAURUS: {   // Aldebaran sweeps a beam; then the stampede, the knot bursting as it passes
        if (bs_at(t, 0)) {
            float ex, ey;
            bs_emit(p, E_EYE, ex, ey);
            float a = bs_angle_to(ex, ey, boss.target_x, boss.target_y);
            BossHazard *h = bs_keep(p, bs_hazard(HK_BEAM, ex, ey, a - .14f, 0, a - .14f, 900, 600));
            if (h) { h->e = a + .14f; h->d = .28f / (600.0f / FRAME_TIME_MS); }
        }
        if (bs_at(t, 1500)) bs_keep(p, bs_hazard(HK_LANE, p.u + SIGN_EMIT[SG_TAURUS][E_MUZZLE][0], y, BOSS_PI, p.u + 40, 14, 900, 500), true);
        if (t >= 2400) {
            p.x = p.u - (t - 2400) * ZOD_RUN;
            if (p.ang == 0 && p.x <= boss.target_x + 60) {
                p.ang = 1;
                unsigned n = bs_density(7);
                float spin = bs_rand(0, TWO_PI / n);
                for (unsigned k = 0; k < n; k++) bs_shot_at(SF_PELLET, p.x - 20, y, spin + k * TWO_PI / n, 1.4f);
            }
        }
        return p.x < -70;
    }
    case SG_GEMINI: {   // a beam from each twin's hand; they step closer and fire again
        if (!p.lead) return false;   // the lead twin runs both
        BossPart *q = p.link >= 0 ? &boss.parts[p.link] : nullptr;
        float ty = float(p.fire_at);
        for (unsigned round = 0; round < 2; round++) {
            float gap = round ? 34 : 60;
            float row_a = bs_clamp(ty - gap, 20, 188), row_b = bs_clamp(ty + gap, 20, 222);
            if (round && t >= 1300 && t < 1700) {
                bs_glide(p, p.u, bs_clamp(row_a - SIGN_EMIT[SG_GEMINI][E_HAND][1], 24, 246), 1.5f);
                if (q && q->exists && q->state == 1) bs_glide(*q, q->u, bs_clamp(row_b - SIGN_EMIT[SG_GEMINI][E_B_HAND][1], 24, 246), 1.5f);
            }
            if (bs_at(t, round * 1700)) {
                float hx = p.x + SIGN_EMIT[SG_GEMINI][E_HAND][0];
                bs_keep(p, bs_hazard(HK_LANE, hx, row_a, BOSS_PI, hx + 40, 10, 900, 400));
                if (q && q->exists) {
                    float bx = q->x + SIGN_EMIT[SG_GEMINI][E_B_HAND][0];
                    bs_keep(p, bs_hazard(HK_LANE, bx, row_b, BOSS_PI, bx + 40, 10, 900, 400), true);
                }
            }
        }
        bool done = t >= 3000;
        if (done && q && q->exists) bs_sign_dissolve(*q);
        return done;
    }
    case SG_CANCER: {   // the claws shoot out on tethers down two lanes and snap back
        if (bs_at(t, 0))
            for (unsigned k = 0; k < 2; k++) {
                float cx, cy;
                bs_emit(p, k ? E_CLAW_FAR : E_CLAW_NEAR, cx, cy);
                float tx = bs_clamp(boss.target_x + 30 + k * 70, 30, 300), ty = k ? 266 : 4;
                float a = bs_angle_to(cx, cy, tx, ty);
                bs_keep(p, bs_styled(bs_hazard(HK_LANE, cx, cy, a, bs_dist(cx, cy, tx, ty), 8, 900, 500), ZS_TETHER), k);
            }
        return t >= 1500;
    }
    case SG_LEO: {      // roar ring, suns shed from the mane, then the crouch and the full pounce
        float mx, my;
        bs_emit(p, E_MOUTH, mx, my);
        if (bs_at(t, 0)) {
            BossHazard *h = bs_keep(p, bs_hazard(HK_RING, mx, my, BOSS_PI + bs_rand(-.6f, .6f), 30, .5f, 900, 1400));
            if (h) { h->d = 3.0f; h->e = 0; }
        }
        float nx, ny;
        bs_emit(p, E_MANE, nx, ny);
        for (unsigned k = 0; k < 3; k++) {
            float a0 = -2.5f + k * .7f, bx = nx + cosf(a0) * 28, by = ny + sinf(a0) * 28;
            float aim = bs_angle_to(bx, by, boss.target_x, boss.target_y) + (float(k) - 1) * .22f;
            if (bs_at(t, 1300 + k * 180)) bs_hazard(HK_AIM, bx, by, aim, 60, 0, 600, 0);
            if (bs_at(t, 1900 + k * 180)) bs_shot_at(SF_SUN, bx, by, aim, 1.7f);
        }
        if (t >= 2400 && t < 2700) {     // the crouch: back and down
            float e = bs_ease(bs_span(t, 2400, 2700));
            p.x = p.u + 12 * e;
            p.y = p.v + 6 * e;
        }
        if (bs_at(t, 2700)) {
            p.ang = bs_angle_to(p.x, p.y, boss.target_x, boss.target_y);
            bs_keep(p, bs_hazard(HK_LANE, p.x, p.y, p.ang, bs_edge_len(p.x, p.y, p.ang), 12, 900, 700), true);
        }
        if (t >= 3600) {
            float d = (t - 3600) * ZOD_RUN;
            p.x = p.u + 12 + cosf(p.ang) * d;
            p.y = p.v + 6 + sinf(p.ang) * d;
            return bs_offscreen(p.x, p.y);
        }
        return false;
    }
    case SG_VIRGO: {    // four seeds thrown from her hand become turrets; then Spica, a nova star
        for (unsigned k = 0; k < 4; k++) {
            unsigned long at = k * 250;
            if (bs_at(t, at)) {
                float sx = 150 + k * 40 + bs_rand(-12, 12), sy = bs_rand(40, 230);
                float a = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
                BossHazard *h = bs_styled(bs_hazard(HK_AIM, sx, sy, a, 480, 0, 900, 0), ZS_SEED);
                if (h) h->d = k; // remembers which seed
            }
            if (bs_at(t, at + 900 - FRAME_TIME_MS))
                for (const BossHazard& h : boss.hz)
                    if (h.active && h.kind == HK_AIM && h.e == ZS_SEED && h.d == k) {
                        bs_shot_at(SF_NEEDLE, h.x, h.y, h.a, 2.2f);
                        break;
                    }
        }
        if (bs_at(t, 1800)) {
            float wx, wy;
            bs_emit(p, E_WHEAT, wx, wy);
            float tx = bs_clamp(boss.target_x + 50, 40, 300), ty = bs_clamp(boss.target_y + (boss.target_y < 135 ? 55 : -55), 30, 240);
            bs_nova(wx, wy, tx, ty, 8, bs_angle_to(tx, ty, boss.target_x, boss.target_y), 1.5f, 1700);
            bs_hazard(HK_TELL, tx, ty, 0, 18, 0, 1700, 0);
        }
        return t >= 2500;
    }
    case SG_LIBRA:      // tips the field toward the heavier pan; weights drop from the pans
        if (bs_at(t, 0) && !boss_assist_calm)
            bs_keep(p, bs_hazard(HK_PULL, 240, rock_random_bounded(2) ? 4 : 266, 0, .45f, 0, 900, 2200));
        for (unsigned k = 0; k < 5; k++)
            if (bs_at(t, 900 + k * 300)) {
                float wx, wy;
                bs_emit(p, k % 2 ? E_PAN_FAR : E_PAN_NEAR, wx, wy);
                bs_shot_at(SF_PELLET, wx, wy, BOSS_PI + (float(k) - 2) * .22f, 1.3f);
            }
        return t >= 3200;
    case SG_SCORPIO: {  // everything from the stinger tip: a venom lash, then the sting itself
        float sx, sy;
        bs_emit(p, E_STING, sx, sy);
        if (bs_at(t, 0)) {
            float aim = bs_angle_to(sx, sy, boss.target_x, boss.target_y);
            float a0 = aim - .5f, a1 = aim + .5f;
            if (boss.target_y > sy) { float swap = a0; a0 = a1; a1 = swap; }
            BossHazard *h = bs_keep(p, bs_hazard(HK_ARM, sx, sy, a0, 230, a0, 900, 800));
            if (h) { h->e = a1; h->d = (a1 - a0) / (800.0f / FRAME_TIME_MS); }
        }
        if (bs_at(t, 1700)) bs_hazard(HK_AIM, sx, sy, bs_angle_to(sx, sy, boss.target_x, boss.target_y), 120, 0, 700, 0);
        if (bs_at(t, 2400)) {
            BossShot *s = bs_shot_at(SF_MISSILE, sx, sy, bs_angle_to(sx, sy, boss.target_x, boss.target_y), 1.4f, 2, 4000);
            if (s) s->turn = .035f;
        }
        return t >= 2700;
    }
    case SG_SAGITTARIUS: { // three aim lines from the arrowhead, then two volleys down them
        float ax, ay;
        bs_emit(p, E_ARROW, ax, ay);
        if (bs_at(t, 0)) {
            p.ang = bs_angle_to(ax, ay, boss.target_x, boss.target_y);
            for (int k = -1; k <= 1; k++) bs_hazard(HK_AIM, ax, ay, p.ang + k * .18f, 480, 0, 900, 0);
        }
        for (unsigned v = 0; v < 2; v++)
            if (bs_at(t, 900 + v * 140))
                for (int k = -1; k <= 1; k++) bs_shot_at(SF_FAST, ax, ay, p.ang + k * .18f, 2.6f);
        return t >= 1500;
    }
    case SG_CAPRICORN: { // a hard dive, a big splash, two waves of stars out of it, the leap back
        float splash_x = p.u - 10, splash_y = 266;
        if (t < 350) {
            float u = t / 350.0f;
            p.x = p.u - 10 * u;
            p.y = p.v + u * u * 200;
        } else if (t < 1000) p.y = p.v + 200;
        else if (t < 1500) {
            float u = 1 - bs_span(t, 1000, 1500);
            p.y = p.v + 200 * (u * u * u);
        }
        if (bs_at(t, 0)) bs_styled(bs_hazard(HK_TELL, splash_x, splash_y, 0, 24, 0, 1000, 0), ZS_SPLASH);
        static const unsigned FAN = 15;
        float pilot = bs_angle_to(splash_x, splash_y, boss.target_x, boss.target_y);
        if (bs_at(t, 360)) {
            BossHazard *h = bs_hazard(HK_ARC, splash_x, splash_y, -BOSS_PI / 2, BOSS_PI / 2 - .12f, 160, 640, 0);
            if (h) h->d = FAN;
        }
        for (unsigned w = 0; w < 2; w++) {
            if (!bs_at(t, 1000 + w * 280)) continue;
            unsigned n = w ? FAN - 1 : FAN, gap = 0;
            float best = 9;
            for (unsigned k = 0; k < n; k++) {
                float a = BOSS_PI + .12f + (BOSS_PI - .24f) * (k + (w ? .5f : 0)) / (FAN - 1);
                float off = fabsf(bs_wrap(a - pilot));
                if (off < best) { best = off; gap = k; }
            }
            for (unsigned k = 0; k < n; k++) {
                if (k == gap || (w && k == gap + 1)) continue;
                float a = BOSS_PI + .12f + (BOSS_PI - .24f) * (k + (w ? .5f : 0)) / (FAN - 1);
                bs_shot_at(SF_PELLET, splash_x, splash_y, a, w ? 1.3f : 1.7f);
            }
        }
        return t >= 2000;
    }
    case SG_AQUARIUS: { // a stream of droplets that hang where they land, fuse and burst
        float ux, uy;
        bs_emit(p, E_URN, ux, uy);
        float a = bs_angle_to(ux, uy, boss.target_x, boss.target_y);
        if (bs_at(t, 0)) p.ang = a;
        a = p.ang;
        if (bs_at(t, 0)) bs_hazard(HK_ARC, ux, uy, a, .12f, 260, 600, 0);
        unsigned ranged = 0;
        bs_signs_out(nullptr, &ranged);
        unsigned n = bs_density(ranged > 1 ? 8 : 12);
        for (unsigned k = 0; k < n; k++)
            if (bs_at(t, 600 + k * 95)) {
                float reach = 70 + float((k * 53) % 5) * 34 + (k % 2) * 12;
                float wave = sinf(reach / 18 + k) * 12;
                float tx = ux + cosf(a) * reach - sinf(a) * wave, ty = uy + sinf(a) * reach + cosf(a) * wave;
                bs_nova(ux, uy, tx, ty, 6, -10, 1.2f, 1750);
            }
        return t >= 600 + n * 95 + 300;
    }
    case SG_PISCES: {   // two passes: slip between the fish, then the cord fills the gap
        if (!p.lead) return false;
        BossPart *q = p.link >= 0 ? &boss.parts[p.link] : nullptr;
        if (!q || !q->exists) return true;
        float part_y = bs_ease(bs_span(t, 2300, 2900));
        p.y = 40 + (96 - 40) * part_y;
        q->y = 230 + (176 - 230) * part_y;
        float fx = t < 2300 ? 220 + (30 - 220) * bs_ease(bs_span(t, 900, 2300)) : 30 + (360 - 30) * bs_ease(bs_span(t, 2700, 4300));
        p.x = fx;
        q->x = fx + 6;
        bool turned = t >= 2300;
        BossPart *fish[2] = {&p, q};
        p.r = q->r = turned ? 1 : -1;     // the art faces right; r < 0 while they swim left (drawn flipped)
        if (bs_at(t, 0))
            for (BossPart *f : fish) bs_styled(bs_hazard(HK_AIM, f->x - 30, f->y, BOSS_PI, 260, 0, 900, 0), ZS_FISH);
        if (bs_at(t, 2300))
            for (BossPart *f : fish) bs_styled(bs_hazard(HK_AIM, f->x + 30, f->y, 0, 300, 0, 700, 0), ZS_FISH);
        if (bs_at(t, 2400)) bs_keep(p, bs_styled(bs_hazard(HK_LANE, p.x, p.y, 0, 1, 3, 900, 1900), ZS_CORD));
        if (p.hz0 >= 0) {
            BossHazard& h = boss.hz[p.hz0];
            float back = turned ? -26.0f : 26.0f;
            if (h.active && h.kind == HK_LANE) {
                h.x = p.x + back; h.y = p.y;
                h.a = bs_angle_to(h.x, h.y, q->x + back, q->y);
                h.b = bs_dist(h.x, h.y, q->x + back, q->y);
            }
        }
        bool done = t >= 4300;
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
            unsigned long gone = game_ms - p.fire_at, fade = p.hp <= 0 ? ZOD_BREAK_FADE_MS : ZOD_FADE_MS;
            p.r = 1 - bs_min(1, gone / float(fade));
            if (gone >= fade) {
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
static bool bs_zod_holding() { return bs_breathing() || boss.aux[AUX_ZOD_HOLD] > .5f; }
static void bs_zod_update() {
    // It swims at half speed while the pearl is open (the opening is a real chance), and holds
    // still while it breathes or makes one of its own attacks (its emitters stay put).
    if (boss.phase && !bs_zod_holding())
        boss.aux[AUX_ZOD_CLOCK] += FRAME_TIME_MS / 1000.0f * (boss.aux[AUX_ZOD_CORE_OPEN] > .5f ? .5f : 1.0f);
    bs_zod_place();
    if (!boss.phase) return;
    // The pearl opens for 2.5 s every 7 s (sooner each time a creature is broken).
    if (game_ms >= boss.stamp[STAMP_ZOD_WINDOW] + ZOD_WINDOW_MS) boss.stamp[STAMP_ZOD_WINDOW] = game_ms + ZOD_CLOSED_MS;
    boss.aux[AUX_ZOD_CORE_OPEN] = game_ms >= boss.stamp[STAMP_ZOD_WINDOW] && game_ms < boss.stamp[STAMP_ZOD_WINDOW] + ZOD_WINDOW_MS ? 1.0f : 0.0f;
    boss.aux[AUX_ZOD_BUSY] = boss.atk ? 1.0f : 0.0f;
    bool throwing = boss.atk && boss.atk >= ZA_SIGN && boss.atk <= ZA_CONJ && (game_ms - boss.atk_t0) % 1200 < ZOD_FORM_MS;
    boss.aux[AUX_ZOD_MOUTH] = throwing || bs_breathing() || boss.atk == ZA_FIREBALL ? 1.0f : 0.0f;
    if (!boss.atk) boss.aux[AUX_ZOD_HOLD] = 0;
    bs_signs_tick();
}
// Starfire breath (phase 3 on): it stops, opens its jaw and breathes three fanned lanes.
static bool bs_zod_breath(unsigned long t) {
    float mx, my;
    bs_zod_jaw(mx, my);
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
// The dragon's own attacks (P2.3). Each holds the dragon still while it is warned.
static bool bs_zod_own(int id, unsigned long t) {
    boss.aux[AUX_ZOD_HOLD] = 1;
    float tx = boss.target_x, ty = boss.target_y;
    switch (id) {
    case ZA_EYES: {     // a beam from the eye sweeps a short arc through the pilot
        float ex, ey;
        bs_zod_eye(ex, ey);
        if (bs_at(t, 0)) {
            float a = bs_angle_to(ex, ey, tx, ty);
            // A narrow wedge (16 degrees): even pinned in a corner, a pilot can step out of it.
            BossHazard *h = bs_hazard(HK_BEAM, ex, ey, a - .14f, 0, a - .14f, 900, 700);
            if (h) { h->e = a + .14f; h->d = .28f / (700.0f / FRAME_TIME_MS); }
        }
        return t >= 1600;
    }
    case ZA_FIREBALL: { // three slow fireballs from the jaws, each splitting into five embers
        float mx, my;
        bs_zod_jaw(mx, my);
        float a = bs_angle_to(mx, my, tx, ty);
        if (bs_at(t, 0)) boss.scratch[0] = a;
        a = boss.scratch[0];
        if (bs_at(t, 0))
            for (int k = -1; k <= 1; k++) bs_hazard(HK_AIM, mx, my, a + k * .3f, 70, 0, 900, 0);
        if (bs_at(t, 900))
            for (int k = -1; k <= 1; k++) bs_shot_at(SF_FIREBALL, mx, my, a + k * .3f, 1.1f, 1, 1200);
        return t >= 1100;
    }
    case ZA_NOVA: {     // a star flung from each claw to a marked spot either side of the pilot
        if (bs_at(t, 0))
            for (unsigned k = 0; k < 2; k++) {
                float cx, cy;
                bs_zod_claw(k, cx, cy);
                float sx = bs_clamp(tx + 40, 30, 300), sy = bs_clamp(ty + (k ? 45.0f : -45.0f), 20, 250);
                bs_nova(cx, cy, sx, sy, 8, bs_angle_to(sx, sy, tx, ty), 1.5f, 1700);
                bs_hazard(HK_TELL, sx, sy, 0, 18, 0, 1700, 0);
            }
        return t >= 600;
    }
    case ZA_HOLE: {     // a singularity flung from the pearl well away from the pilot
        if (bs_at(t, 0)) {
            float sx = bs_clamp(tx + 150, 140, 300), sy = ty < 135 ? 205 : 65;
            bs_styled(bs_hazard(HK_TELL, sx, sy, 0, 24, 0, 900, 0), ZS_SWIRL);
            if (!boss_assist_calm) bs_styled(bs_hazard(HK_PULL, sx, sy, 0, .8f, 0, 900, 3000), 1);
            else bs_styled(bs_hazard(HK_PULL, sx, sy, 0, 0, 0, 900, 3000), 1);   // calm: no pull, still swallows shots
            bs_styled(bs_hazard(HK_POOL, sx, sy, 0, 0, 10, 900, 3000), 1);
        }
        return t >= 900;
    }
    case ZA_METEOR: {   // the tail fan flicks five meteors down curved, pre-drawn paths
        float fx, fy;
        bs_zod_tail(fx, fy);
        for (int k = -2; k <= 2; k++) {
            float a = bs_angle_to(fx, fy, tx, ty) + k * .22f, turn = -k * .0035f, speed = 1.9f;
            if (bs_at(t, 0)) {
                BossHazard *h = bs_hazard(HK_ARC, fx, fy, a, 0, 520, 900, 0);
                if (h) { h->d = speed; h->e = turn; }
            }
            if (bs_at(t, 900)) {
                BossShot *s = bs_shot_at(SF_METEOR, fx, fy, a, speed);
                if (s) s->turn = turn;
            }
        }
        return t >= 1100;
    }
    case ZA_NET: {      // three ring stars join with lines that turn lethal for 1.5 s
        if (bs_at(t, 0)) {
            static const uint8_t corners[3] = {SG_CAPRICORN, SG_PISCES, SG_TAURUS};
            float px[3], py[3];
            for (unsigned k = 0; k < 3; k++) bs_zring_pos(corners[k], px[k], py[k]);
            for (unsigned k = 0; k < 3; k++) {
                unsigned j = (k + 1) % 3;
                bs_styled(bs_hazard(HK_LANE, px[k], py[k], bs_angle_to(px[k], py[k], px[j], py[j]),
                                    bs_dist(px[k], py[k], px[j], py[j]), 2.5f, 900, 1500), ZS_NET);
            }
        }
        return t >= 900;
    }
    }
    return true;
}
// Room for one more sign of this class beside the ones already out?
static bool bs_sign_fits(unsigned sign) {
    uint8_t classes = 0;
    unsigned ranged = 0, n = bs_signs_out(&classes, &ranged);
    unsigned limit = bs_frenzy() ? 4 : boss.phase >= 3 ? 3 : boss.phase;
    if (n >= limit || bs_sign_is_out(sign)) return false;
    uint8_t cl = SIGN_CLASS[sign];
    if (cl == CL_RANGED) return ranged < 2;
    if (cl == CL_FIELD) {
        for (const BossHazard& h : boss.hz) if (h.active && h.kind == HK_PULL) return false;
    }
    return !(classes & cl);
}
static bool bs_own_fits(int id) {
    uint8_t classes = 0;
    bs_signs_out(&classes);
    if (id == ZA_HOLE) {
        if (classes & CL_FIELD) return false;
        for (const BossHazard& h : boss.hz) if (h.active && h.kind == HK_PULL) return false;
    }
    if ((id == ZA_NET || id == ZA_BREATH) && (classes & CL_WALL)) return false;
    return true;
}
static unsigned long bs_conj_at(unsigned k) { return k * 1200; }
static bool bs_zod_run(int id, unsigned long t) {
    if (id == ZA_BREATH) return bs_zod_breath(t);
    if (id >= ZA_EYES && id <= ZA_NET) return bs_zod_own(id, t);
    if (id == ZA_CONJ) {
        // Three signs from three sides of the ring, thrown 1.2 s apart.
        for (unsigned k = 0; k < 3; k++)
            if (bs_at(t, bs_conj_at(k)))
                for (unsigned tries = 0; tries < 20; tries++) {
                    uint8_t s = CONJ_SET[rock_random_bounded(sizeof(CONJ_SET))];
                    if (bs_sign_fits(s)) { bs_sign_launch(s); break; }
                }
        return t >= bs_conj_at(2) + ZOD_FORM_MS + 300;
    }
    if (bs_at(t, 0)) bs_sign_launch(unsigned(id - ZA_SIGN));
    // The sign acts on its own; the dragon moves on (with the shortest rest, 700 ms, the next
    // throw is 1.2 s after this one).
    return t >= 500;
}
// Its own attacks by phase: fireballs from phase 1; eye lasers and nova stars from phase 2;
// the black hole, meteor fall, net and breath from phase 3.
static int bs_zod_own_pick() {
    static const int pool[] = {ZA_FIREBALL, ZA_EYES, ZA_NOVA, ZA_HOLE, ZA_METEOR, ZA_NET, ZA_BREATH};
    unsigned avail = boss.phase >= 3 ? 7 : boss.phase >= 2 ? 3 : 1;
    // One that does not fit yet keeps its turn, as the signs do.
    unsigned k0 = unsigned(boss.aux[AUX_ZOD_OWN_NEXT]) % avail;
    for (unsigned j = 0; j < avail; j++) {
        int id = pool[(k0 + j) % avail];
        if (!bs_own_fits(id)) continue;
        if (j == 0) boss.aux[AUX_ZOD_OWN_NEXT] = float(k0 + 1);
        return id;
    }
    return 0;
}
// The next sign: the season's rotation in phases 1 and 2, the whole ring after that, skipping
// any that would not fit beside the signs already out. 0 if none fits.
static int bs_zod_sign_pick() {
    if (boss.phase >= 3) {
        for (unsigned tries = 0; tries < 12; tries++) {
            int id = ZA_SIGN + int(rock_random_bounded(12));
            if (bs_sign_fits(unsigned(id - ZA_SIGN))) return id;
        }
        return 0;
    }
    // A sign that does not fit yet keeps its turn: the rotation only moves past the one thrown.
    const uint8_t *row = SEQ_ZOD[boss.phase - 1];
    unsigned k0 = unsigned(boss.aux[AUX_ZOD_NEXT]) % row[0];
    for (unsigned j = 0; j < row[0]; j++) {
        unsigned k = (k0 + j) % row[0];
        if (!bs_sign_fits(unsigned(row[1 + k] - ZA_SIGN))) continue;
        if (j == 0) boss.aux[AUX_ZOD_NEXT] = float(k0 + 1);
        return row[1 + k];
    }
    return 0;
}
static int bs_zod_pick() {
    if (bs_frenzy() && boss.seq_total % 4 == 0 && bs_signs_out() == 0) return ZA_CONJ;
    // A sign whenever none is out; otherwise up to (limit - 1) throws in a row while there is
    // room, then one of its own (so in phase 3: sign, sign, own...; in phase 1 it alternates).
    unsigned out = bs_signs_out(), limit = bs_frenzy() ? 4 : boss.phase >= 3 ? 3 : boss.phase;
    float streak = boss.aux[AUX_ZOD_LAST_SIGN];
    bool sign_turn = out == 0 || (out < limit && streak < limit - 1);
    int id = sign_turn ? bs_zod_sign_pick() : 0;
    if (id) boss.aux[AUX_ZOD_LAST_SIGN] = streak + 1;
    else {
        id = bs_zod_own_pick();
        if (id) boss.aux[AUX_ZOD_LAST_SIGN] = 0;
    }
    return id;
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
    // A black hole swallows the pilots' shots that pass through it (the laser goes by).
    for (const BossHazard& h : boss.hz)
        if (h.active && h.kind == HK_PULL && h.e == 1 && !h.warn_left) bs_circle(h.x, h.y, 16, BC_BLOCK, 0, 1);
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
       AUX_FOX_ILLUSION = 4, AUX_FOX_SCALE = 5 };
enum { STAMP_FOX_BLINK_UNTIL = 3, STAMP_FOX_OPEN_UNTIL = 4 };
// Offsets from the fox's frame centre (zodiac_art.fox_geometry).
static const float FOX_TAIL[9][2] = {{-18, -22}, {-2, -27}, {15, -28}, {31, -24}, {45, -16},
                                     {56, -5}, {63, 8}, {65, 23}, {63, 38}};
static const float FOX_HEAD[3] = {-35, -40, 17}, FOX_MARK[2] = {-33, -54}, FOX_BODY[3] = {-19, 22, 30};
static const BossRow SEQ_FOX[] = {{4, NA_COMETS, NA_FOXFIRE, NA_ILLUSION, NA_BLINK}};
// Tail sway (zodiac_art.py FOX_BEND_*): a wave runs across the fan every 2.4 s; a tail bent
// `b` steps turns about its root by about b * .035 rad where its hit point sits.
static const float FOX_TAIL_BASE[2] = {-1, 30}, FOX_SWAY_PERIOD = 2.4f, FOX_SWAY_RAD = .035f;
// An illusion: three foxes drawn at .6 size, spread so none overlaps another much or leaves
// the screen; the real one takes one of the three places.
static const float FOX_ILLUSION_SCALE = .6f;
static const float FOX_ILLUSION_AT[3][2] = {{330, 54}, {404, 135}, {330, 216}};

static float bs_fox_scale() { return boss.aux[AUX_FOX_SCALE] > 0 ? boss.aux[AUX_FOX_SCALE] : 1.0f; }
static float bs_fox_bend(unsigned i) {
    return 2.0f * sinf(TWO_PI * boss.aux[AUX_FOX_CLOCK] / FOX_SWAY_PERIOD - i * .55f);
}
// Where tail i's hit point sits this tick, around a fox centred at (x, y) drawn at scale s.
static void bs_fox_tail_at(unsigned i, float x, float y, float s, float& ox, float& oy) {
    float a = bs_fox_bend(i) * FOX_SWAY_RAD, c = cosf(a), n = sinf(a);
    float dx = FOX_TAIL[i][0] - FOX_TAIL_BASE[0], dy = FOX_TAIL[i][1] - FOX_TAIL_BASE[1];
    ox = x + (FOX_TAIL_BASE[0] + dx * c - dy * n) * s;
    oy = y + (FOX_TAIL_BASE[1] + dx * n + dy * c) * s;
}

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
    boss.aux[AUX_FOX_SCALE] = 1;
}
static void bs_fox_open_core() { boss.stamp[STAMP_FOX_OPEN_UNTIL] = game_ms + 2500; }
static void bs_fox_update() {
    boss.aux[AUX_FOX_CLOCK] += FRAME_TIME_MS / 1000.0f;
    const float s = bs_fox_scale();
    for (unsigned i = 0; i < 9; i++) bs_fox_tail_at(i, boss.x, boss.y, s, boss.parts[i].x, boss.parts[i].y);
    // Illusion decoys glide out from the fox to their places rather than popping in.
    for (unsigned i = 9; i < BOSS_PARTS; i++) {
        BossPart& p = boss.parts[i];
        if (!p.exists || p.kind != PK_DECOY) continue;
        p.x += (p.u - p.x) * .18f;
        p.y += (p.v - p.y) * .18f;
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
// A height for the blink that keeps the whole fox on screen (ears to paws: -80..+74).
static float bs_fox_free_y(float avoid) {
    float y = bs_rand(88, 192);
    if (fabsf(y - avoid) < 45) y = y < 140 ? y + 55 : y - 55;
    return bs_clamp(y, 88, 192);
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
            float sx, sy;
            bs_fox_tail_at(i, x, y, bs_fox_scale(), sx, sy);
            sx += 10 * bs_fox_scale();
            sy -= 6 * bs_fox_scale();
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
                float k2 = bs_fox_scale();
                float sx = x + (FOX_HEAD[0] + cosf(a) * 24) * k2, sy = y + (FOX_HEAD[1] + 40 + sinf(a) * 24) * k2;
                BossShot *s = bs_shot_at(SF_MISSILE, sx, sy, a, 1.4f, 2, 3600);
                if (s) s->turn = .03f;
            }
        return t >= 1600;
    case NA_ILLUSION: { // it shrinks into three foxes; only the real one has lit eyes. Pop both decoys to see through it
        const BossOps& o = bs_ops();
        if (bs_at(t, 0)) bs_hazard(HK_TELL, x, y, 0, 90, 0, 600, 0);
        if (bs_at(t, 600)) {
            boss.aux[AUX_FOX_SCALE] = FOX_ILLUSION_SCALE;
            unsigned real = rock_random_bounded(3);
            boss.scratch[1] = float(real);
            for (unsigned k = 0; k < 3; k++) {
                if (k == real) continue;
                BossPart *p = nullptr;
                for (unsigned i = 9; i < BOSS_PARTS; i++)
                    if (!boss.parts[i].exists) { p = &boss.parts[i]; break; }
                if (!p) continue;
                *p = {};
                p->exists = true; p->kind = PK_DECOY; p->slot = k; p->hp = p->hp_max = 2;
                p->x = boss.x; p->y = boss.y; p->r = 16;
                p->u = FOX_ILLUSION_AT[k][0]; p->v = FOX_ILLUSION_AT[k][1];
            }
            boss.scratch[0] = 1; // illusion up and not yet seen through
        }
        if (t > 600 && t < 3600) {   // the real fox glides to its own place
            unsigned real = unsigned(boss.scratch[1]);
            boss.home_x += (FOX_ILLUSION_AT[real][0] - boss.home_x) * .18f;
            boss.home_y += (FOX_ILLUSION_AT[real][1] - boss.home_y) * .18f;
        }
        if (bs_at(t, 1400))
            for (unsigned i = 9; i < BOSS_PARTS; i++) {
                BossPart& p = boss.parts[i];
                if (!p.exists || p.kind != PK_DECOY) continue;
                float hx = p.x + FOX_HEAD[0] * FOX_ILLUSION_SCALE, hy = p.y + FOX_HEAD[1] * FOX_ILLUSION_SCALE;
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
        if (bs_at(t, 3600))
            for (unsigned i = 9; i < BOSS_PARTS; i++)
                if (boss.parts[i].kind == PK_DECOY) boss.parts[i].exists = false;
        if (t >= 3600) {   // back to its own place, then full size again
            boss.home_x += (o.home_x - boss.home_x) * .2f;
            boss.home_y += (o.home_y - boss.home_y) * .2f;
        }
        if (t >= 4000) {
            boss.aux[AUX_FOX_SCALE] = 1;
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
    const float s = bs_fox_scale();
    for (unsigned i = 0; i < 9; i++)
        if (boss.parts[i].exists) bs_circle(boss.parts[i].x, boss.parts[i].y, 10 * s, BC_PART, i, 3);
    // The forehead mark: open after a lost tail or a solved illusion; the laser always reaches it.
    bs_circle(boss.x + FOX_MARK[0] * s, boss.y + FOX_MARK[1] * s, 8 * s + 2 * (1 - s), BC_CORE, 0, bs_fox_open() ? 3 : 2);
    // The body and head do not soak shots: the tails fanned behind them stay reachable.
    for (unsigned i = 9; i < BOSS_PARTS; i++)
        if (boss.parts[i].exists && boss.parts[i].kind == PK_DECOY)
            bs_circle(boss.parts[i].x + FOX_BODY[0] * FOX_ILLUSION_SCALE, boss.parts[i].y + FOX_BODY[1] * FOX_ILLUSION_SCALE,
                      26 * FOX_ILLUSION_SCALE, BC_PART, i, 3);
}
static unsigned bs_fox_body(float *out) {
    unsigned n = 0;
    if (bs_blinking()) return 0;
    const float s = bs_fox_scale();
    bs_guard_body(out, n, boss.x + FOX_BODY[0] * s, boss.y + FOX_BODY[1] * s, FOX_BODY[2] * s);
    bs_guard_body(out, n, boss.x + FOX_HEAD[0] * s, boss.y + FOX_HEAD[1] * s, FOX_HEAD[2] * s);
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
