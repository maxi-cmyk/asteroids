#pragma once
// The Zodiarch's ids, constants and tables: aux slots, signs, swim and ring
// geometry, key stars and emitters per creature, sign classes and the throw
// rotation. Design: nextSteps.md P1.2, P2.3, P3. Art: web/tools/zodiac_myth.py.
// ================================================================ THE ZODIARCH
// A star dragon that steers itself through the right of the field (nextSteps.md
// P3.1): it stalks the pilot's row, surges across, glides, rears before a
// summon and dives behind the ring; its body follows the trail its head leaves,
// so it only ever curves. A ring of the twelve zodiac signs turns behind it. It
// calls signs down: each sign's constellation flies from the ring and the
// creature forms where it lands (900 ms, the warning), carries out its attack,
// then dissolves back into the ring. Up to one sign is out in phase 1, two in
// phase 2, three in phase 3 and four in the frenzy, and between throws it
// attacks on its own, first turning to face the pilot and settling. Every shot
// and wall leaves from a visible point on a body: the emitters below. Each
// creature shows one key star: shoot it to break the creature early, which
// also wounds the dragon. The core is its pearl: it rests in the forehead under
// two brow scales, and with each of its own attacks it surfaces on the part of
// the body that attack comes from (the throat, a claw, the tail...), where it
// can be hurt for a few seconds (ZOD_WEAK below).
enum {
    AUX_ZOD_CLOCK = 0,     // ring clock (s); stops while it holds still
    AUX_ZOD_CORE_OPEN = 1, // 1 while the pearl can be shot
    AUX_ZOD_SECTION = 2,   // where the pearl is: -1 the forehead, else a body
                           // segment
    AUX_ZOD_OUT = 3,       // bit k set while sign k is out of the ring
    AUX_ZOD_PEARL_X = 4,
    AUX_ZOD_PEARL_Y = 5,
    AUX_ZOD_MOUTH = 6,    // 1 while the jaw is open (throwing, breathing,
                          // spitting, lunging)
    AUX_ZOD_BREATH = 7,   // 1 while the starfire breath is warned or live
    AUX_ZOD_HOLD = 8,     // 1 while it holds still for one of its own attacks
    AUX_ZOD_PATH_X = 9,   // where the head will be in 0.6 s (-1: hidden)
    AUX_ZOD_PATH_Y = 10,  // (the path dots; the rotations live in boss.swim)
    AUX_ZOD_PATH_TH = 11, // and its heading then
    AUX_ZOD_HEADING = 12, // the way the head points as drawn (radians; mirrored
                          // past 90°)
    AUX_ZOD_SPEED = 13,   // swim speed, px per tick (the renderer paddles the
                          // legs by it)
    AUX_ZOD_PEARL = 14, // the pearl window: > 0 open (time left, 1..0), < 0 the
                        // tell (-0..-1)
    AUX_ZOD_MODE = 15
}; // what it is doing (ZM_*), for the renderer
enum {
    STAMP_ZOD_WINDOW = 1, // the pearl surfaces then (its tell comes before)
    STAMP_ZOD_SHUT = 2    // and sinks back then
};

// Behaviours (P3.1): chosen between attacks, never the same twice in a row.
enum {
    ZM_CRUISE,
    ZM_STALK,
    ZM_SURGE,
    ZM_GLIDE,
    ZM_REAR,
    ZM_DIVE,
    ZM_RISE,
    ZM_FACE,
    ZM_HOLD,
    ZM_COIL,
    ZM_LUNGE
};
static const float ZOD_BOX_X0 = 305, ZOD_BOX_X1 = 445, ZOD_BOX_Y0 = 45,
                   ZOD_BOX_Y1 = 225;
static const float ZOD_TURN_R = 48; // px: the tightest turn while swimming
static const float ZOD_WAVE = 5,
                   ZOD_WAVE_LEN = 130; // the serpent's sideways wave
static const float ZOD_EASE = .08f; // per tick: speed changes take about 400 ms
// Points on the head, in its left-facing frame from the head's point on the
// trail (the frame turns with the head; zodiac art: the head is drawn 24 px
// ahead of that point).
static const float ZOD_EYE[2] = {-38, -12}, ZOD_JAW[2] = {-72, 3},
                   ZOD_BROW[2] = {-27, -17};
static const unsigned long ZOD_TELL_MS
        = 600; // the brow scales twitch before the window

enum {
    SG_ARIES,
    SG_TAURUS,
    SG_GEMINI,
    SG_CANCER,
    SG_LEO,
    SG_VIRGO,
    SG_LIBRA,
    SG_SCORPIO,
    SG_SAGITTARIUS,
    SG_CAPRICORN,
    SG_AQUARIUS,
    SG_PISCES
};

static const float ZOD_CX = 372, ZOD_CY = 135; // centre of the ring
static const float ZOD_RING_RX = 118, ZOD_RING_RY = 100;
static const unsigned ZOD_SEGMENTS = 26;
static const float ZOD_GAP = 13; // px between segment centres along the path
static const unsigned long ZOD_FORM_MS = 900, ZOD_FADE_MS = 400,
                           ZOD_BREAK_FADE_MS = 900;
static const unsigned ZOD_BREAK_DAMAGE
        = 3; // sub-hits a broken creature costs the dragon (several are out at
             // once)
static const float ZOD_RUN
        = 1.1f; // px per ms: a charge (Aries, Taurus, Leo's pounce)
// Key-star offsets from each creature's centre in its strike frame
// (zodiac_myth.game_cells); three hits break it. Contact stays a 12 px circle
// at the centre (8 for a fish): a charging creature's lane is warned for that
// width, so the bigger P2 art never reaches past it.
static const float SIGN_KEY[12][2] = {{-34, -7},
                                      {-38, 5},
                                      {1, -33},
                                      {4, 17},
                                      {-20, -6},
                                      {-48, -42},
                                      {-45, 17},
                                      {-2, 14},
                                      {-54, -26},
                                      {55, 4},
                                      {17, -21},
                                      {10, 2}};
// Emitters: where each creature's attacks come out, from its centre in the
// strike frame (zodiac_myth.EMIT_POINTS; mirrored as SIGN_EMIT in
// src/boss/scene.mjs).
enum {
    E_HORNS = 0,
    E_HOOVES = 1, // Aries
    E_EYE = 0,
    E_MUZZLE = 1, // Taurus
    E_HAND = 0,
    E_B_HAND = 1, // Gemini (B is the second twin)
    E_CLAW_NEAR = 0,
    E_CLAW_FAR = 1, // Cancer
    E_MOUTH = 0,
    E_LEO_EYE = 1,
    E_MANE = 2, // Leo
    E_WHEAT = 0,
    E_V_HAND = 1, // Virgo
    E_PAN_NEAR = 0,
    E_PAN_FAR = 1, // Libra
    E_STING = 0,   // Scorpius
    E_ARROW = 0,   // Sagittarius
    E_URN = 0,     // Aquarius
    E_FISH_MOUTH = 0
}; // Pisces
static const float SIGN_EMIT[12][3][2] = {{{-48, 4}, {-34, 38}, {0, 0}},
                                          {{-38, 5}, {-52, 14}, {0, 0}},
                                          {{-18, -58}, {-28, -24}, {0, 0}},
                                          {{-50, -26}, {32, -34}, {0, 0}},
                                          {{-58, -15}, {-48, -23}, {-32, -20}},
                                          {{-48, -42}, {-42, -28}, {0, 0}},
                                          {{-45, 14}, {45, -8}, {0, 0}},
                                          {{16, -25}, {62, 10}, {0, 0}},
                                          {{-54, -26}, {0, 0}, {0, 0}},
                                          {{-52, 2}, {54, 4}, {0, 0}},
                                          {{-5, -42}, {0, 0}, {0, 0}},
                                          {{26, -2}, {0, 0}, {0, 0}}};
static void bs_emit(const BossPart& p, unsigned which, float& x, float& y) {
    x = p.x + SIGN_EMIT[p.slot][which][0];
    y = p.y + SIGN_EMIT[p.slot][which][1];
}
// Where the pearl surfaces for each of its own attacks, and when: `seg` is the
// body segment (-1 the forehead), `at` ms into the attack (after it settles),
// for `open` ms; the brow scales or the body's scales twitch for ZOD_TELL_MS
// before.
struct ZodWeak {
    int atk;
    int8_t seg;
    uint16_t at, open;
};
static const ZodWeak ZOD_WEAK[]
        = {{ZA_EYES, -1, 600, 2600}, // the forehead, above the eye it fires
           {ZA_HOLE, -1, 600, 3000}, // the forehead: it throws from the pearl
           {ZA_COILSPIT, 3, 1400, 2200}, // the throat, as the fire climbs it
           {ZA_BREATH, 2, 600, 2800},    // the throat
           {ZA_LUNGE, 8, 900, 3000},     // the stretched neck
           {ZA_NOVA, 15, 600, 3000},     // the hind claw that flings a star
           {ZA_METEOR, 23, 600, 3000},   // the tail fan
           {ZA_SIGN, 5, 600, 2400}};     // a summon: the chest, as it rears
// What kind of trouble each sign makes, for deciding which can share the field.
enum {
    CL_WALL = 1,
    CL_CHARGE = 2,
    CL_FIELD = 4,
    CL_RANGED = 8
};
static const uint8_t SIGN_CLASS[12] = {CL_CHARGE,
                                       CL_CHARGE,
                                       CL_WALL,
                                       CL_WALL,
                                       CL_CHARGE,
                                       CL_RANGED,
                                       CL_FIELD,
                                       CL_RANGED,
                                       CL_RANGED,
                                       CL_RANGED,
                                       CL_RANGED,
                                       CL_WALL};
static const BossRow SEQ_ZOD[] = {{6,
                                   ZA_SIGN + SG_ARIES,
                                   ZA_SIGN + SG_CANCER,
                                   ZA_SIGN + SG_TAURUS,
                                   ZA_SIGN + SG_LEO,
                                   ZA_SIGN + SG_GEMINI,
                                   ZA_SIGN + SG_VIRGO}, // spring, summer
                                  {6,
                                   ZA_SIGN + SG_LIBRA,
                                   ZA_SIGN + SG_CAPRICORN,
                                   ZA_SIGN + SG_SCORPIO,
                                   ZA_SIGN + SG_AQUARIUS,
                                   ZA_SIGN + SG_SAGITTARIUS,
                                   ZA_SIGN + SG_PISCES}, // autumn, winter
                                  {1, ZA_BREATH}};
// The Great Conjunction draws from signs that leave room for each other (no
// walls of lanes).
static const uint8_t CONJ_SET[] = {SG_TAURUS,
                                   SG_LEO,
                                   SG_VIRGO,
                                   SG_SCORPIO,
                                   SG_SAGITTARIUS,
                                   SG_CAPRICORN,
                                   SG_AQUARIUS};
// Hazard styles the renderer reads from `e` (lanes, aims, tells) or `d` (arcs).
enum {
    ZS_PLAIN = 0,
    ZS_TETHER = 2,
    ZS_CORD = 3,
    ZS_SEED = 5,
    ZS_SWIRL = 8,
    ZS_SPLASH = 9,
    ZS_FISH = 11
};
