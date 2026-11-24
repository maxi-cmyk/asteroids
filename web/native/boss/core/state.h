#pragma once

// A steered serpent (the Zodiarch, nextSteps.md P3.1): the head's base
// position, heading and speed, its sideways wave, its current behaviour and
// goal, and the trail of head positions (2 px apart, a ring buffer) that the
// body is laid along. The lunge and the coil reshape the neck: `pull` slides
// the head back along the trail, `ext` stretches it down a straight lane.
static const unsigned SWIM_TRAIL = 240;
struct BossSwim {
    float bx = 0, by = 0, th = 0, v = 0, wave = 0, amp = 0, spin = 0;
    float gx = 0, gy = 0, cx = 0, cy = 0;
    int mode = 0, last = 0;
    unsigned long until = 0;
    float pull = 0, coil = 0, ext = 0, ext_a = 0;
    // The rotations: next sign, signs thrown in a row, next own attack.
    float next_sign = 0, sign_streak = 0, own_next = 0;
    // Ascendant: thrown already this fight; the next spawn of it is stronger.
    bool ascended = false, ascend_spawn = false;
    float trail[SWIM_TRAIL][2] = {};
    unsigned at = 0, n = 0;
};

// Ninefold's footwork (fights/ninefold/move.h): where it is, the move it is
// making between perches (from, to, how far it has gone, at what pace) and
// which way it faces.
struct BossFox {
    float x = 0, y = 0, fx = 0, fy = 0, tx = 0, ty = 0, dist = 0, speed = 0;
    int gait = 0, face = -1, perch = 7, pose = -1, react = 0, last_atk = 0;
    unsigned long phase_at = 0, react_at = 0;
};

struct BossShot {
    bool active = false;
    uint8_t family = 0;
    int8_t hp = 0;
    int8_t link = -1;
    float x = 0, y = 0;   // current position
    float bx = 0, by = 0; // sine baseline
    float dx = 0, dy = 0; // velocity per tick
    float turn = 0;       // radians per tick (curve) or turn limit (missile)
    float amp = 0, phase = 0;
    unsigned long born = 0, life = 0;
};
struct BossHazard {
    bool active = false;
    uint8_t kind = 0;
    float x = 0, y = 0, a = 0, b = 0, c = 0, d = 0, e = 0;
    unsigned long warn_total = 0, warn_left = 0, live_left = 0;
};
struct BossPart {
    bool exists = false;
    uint8_t kind = 0;
    uint8_t slot = 0;
    uint8_t state = 0;
    int8_t hp = 0;
    int8_t hp_max = 0;
    float x = 0, y = 0, r = 0, ang = 0;
    unsigned long until = 0; // revive time, or open-until for panels
    unsigned long fire_at = 0;
    // Zodiac creatures and decoys: where they came from and are going, a
    // partner, their hazards.
    float sx = 0, sy = 0, u = 0, v = 0;
    int8_t link = -1, hz0 = -1, hz1 = -1;
    bool lead = false;
};
static const unsigned BOSS_BODY_MAX = 40; // contact circles a fight may report
struct BossCircle {
    float x, y, r;
    uint8_t type, index, flags; // flags: 1 player shots, 2 laser
};
struct BossState {
    bool active = false;
    bool mini = false;
    bool practice = false;
    uint8_t kind = 0;
    uint8_t tier = 0;
    unsigned wave = 0;
    unsigned players = 1;
    unsigned health = 0;
    unsigned maximum = 0;
    unsigned kills = 0;
    unsigned cycle = 0;
    unsigned phase = 0; // 0 entrance, then 1..4
    unsigned long phase_started = 0;
    unsigned start_phase = 1; // boss practice can begin in a later phase
    unsigned long born = 0;
    unsigned long defeated = 0;
    unsigned long flash_until = 0;
    unsigned defeated_mask = 0;
    float x = 0, y = 0, home_x = 0, home_y = 0;
    float target_x = 40, target_y = 135;
    int atk = 0;
    unsigned long atk_t0 = 0, rest_until = 0;
    unsigned seq = 0, seq_total = 0;
    float aux[16] = {};
    float scratch[8]
            = {}; // per-attack randomness; only one attack runs at a time
    unsigned long stamp[6] = {};
    bool touched[2] = {};
    unsigned killer = 0;
    bool life_lost = false;
    unsigned lives_at_start = 0;
    uint8_t drops = 0;
    unsigned long shield_at = 0; // Ringwarden: when the next timed shield drops
    unsigned long deflect_at[2]
            = {}; // per pilot: when a mirror may throw the next shot back
    unsigned long camp_ms[2]
            = {}; // per pilot: time spent level with or behind the body
    unsigned long repel_at
            = 0; // earliest time for the next repel ring (boss/motion.h)
    unsigned repels = 0; // repel rings sent this fight (test telemetry)
    bool hold = false;   // keeps a wave open while a mini lives
    float armor = 0;
    unsigned hits_taken = 0;
    unsigned violations = 0, max_shots = 0, max_hazards = 0, entrance_hits = 0;
    unsigned min_corridor = 999, spawn_in_body = 0;
    float seg[28][3]
            = {}; // the Zodiarch's body: x, y, r per segment, neck first
    BossSwim swim
            = {};     // the Zodiarch's steering and the trail its body follows
    BossFox fox = {}; // Ninefold's footwork
    float block_fx[4][3]
            = {}; // shots stopped by a hard surface: x, y, incoming angle
    unsigned long block_at[4] = {};
    unsigned block_next = 0;
    unsigned seg_n = 0;
    BossShot shots[BOSS_SHOTS] = {};
    BossHazard hz[BOSS_HAZARDS] = {};
    BossPart parts[BOSS_PARTS] = {};
};
static BossState boss = {};
static BossCircle boss_circles[BOSS_CIRCLES];
static unsigned boss_circle_count = 0;
static bool boss_assist_long = false; // +30% telegraphs
static bool boss_assist_calm = false; // no pull, straight lens shots
static int boss_ascendant = -1; // the date's sign, thrown first (web_ascendant)
static unsigned boss_force_tier = 0; // practice picks a tier directly

static void combat_ship_hit();
static void combat_award(uint32_t points);

// How one kind of boss differs. Every fight family (boss/fights/*.h) supplies a
// row per kind; the framework never switches on the kind itself. Hooks marked
// "may be null" are skipped when absent. Health is stated in design hits
// (nextSteps.md); `k` splits each into sub-hits so the open windows, not raw
// fire rate, set the fight length: a primary shot is one sub-hit, the laser
// stays worth eight design hits.
struct BossOps {
    float home_x, home_y; // where the body rests once the entrance is over
    uint8_t k;            // sub-hits per design hit
    uint8_t phases;       // phases before the tier 2+ frenzy
    uint8_t cut[2]; // health percentages where phases 2 and 3 begin (0 = none)
    unsigned rest[3]; // rest between attacks in phases 1, 2, 3+ (ms)
    void (*begin)();  // parts and state at the start (may be null)
    void (*update)(); // passive motion each tick
    int (*pick)();    // the next attack id, 0 for none
    bool (*run)(int id,
                unsigned long t); // advance an attack; true when it is over
    void (*circles)();            // hit circles for player shots (bs_circle)
    unsigned (*body)(
            float *out); // contact circles for the ship: x, y, r triples
    void (*phase)(unsigned phase); // a new phase began (may be null)
    unsigned (*soak)(unsigned damage,
                     bool laser); // armour in front of the core (may be null)
    void (*hit)(BossPart& part,
                unsigned owner,
                unsigned damage,
                bool laser); // sub-target (may be null)
};
static const BossOps& bs_ops_for(unsigned kind); // boss/ops.h
static const BossOps& bs_ops();                  // the current fight's row

// ---------------------------------------------------------------- pilots
static Ship *boss_hulls[2] = {&ship, nullptr};
static unsigned boss_hull_n = 1;
static void boss_hit_solo(unsigned) {
    combat_ship_hit();
}
static void boss_award_solo(unsigned, uint32_t points) {
    combat_award(points);
    run_destroyed--; // Boss kills have their own counter, not asteroid kills.
}
static void boss_stat_solo(unsigned) {
    combat.hits++;
}
static void (*boss_hit_hook)(unsigned) = boss_hit_solo;
static void (*boss_award_hook)(unsigned, uint32_t) = boss_award_solo;
static void (*boss_stat_hook)(unsigned) = boss_stat_solo;
static void boss_bind_solo() {
    boss_hulls[0] = &ship;
    boss_hulls[1] = nullptr;
    boss_hull_n = 1;
    boss_hit_hook = boss_hit_solo;
    boss_award_hook = boss_award_solo;
    boss_stat_hook = boss_stat_solo;
}

