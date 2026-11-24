#pragma once
// Boss framework constants and identifiers. Assembled by ../core.h.

static const unsigned long BOSS_ENTRANCE_MS = 1400;
static const unsigned long BOSS_RECOVERY_MS = 1200;
static const float BOSS_PI = 3.14159265f;
static const unsigned BOSS_SHOTS = 48;
static const unsigned BOSS_HAZARDS = 16;
static const unsigned BOSS_LETHAL_CAP = 6;
static const unsigned BOSS_PARTS = 32;
static const unsigned BOSS_CIRCLES = 112;

enum BossKind : uint8_t {
    BK_SENTINEL,
    BK_RINGWARDEN,
    BK_CINDERFORGE,
    BK_BASTION,
    BK_TIDECALLER,
    BK_WARDEN,
    BK_PICKET,
    BK_SHARDLING,
    BK_CINDERLING,
    BK_GUNNERY,
    BK_MOONJELLY,
    BK_LENSIMP,
    BK_COUNT
};
enum ShotFamily : uint8_t {
    SF_NEEDLE,
    SF_SHARD,
    SF_BOLT,
    SF_SINE,
    SF_PELLET,
    SF_MISSILE,
    SF_MINE,
    SF_LOB,
    SF_SPORE,
    SF_EMBER,
    SF_CURVE,
    SF_FAST,
    SF_FIREBALL, // slow, shootable (pops harmlessly); splits into five embers
                 // when its life ends
    SF_NOVA,  // flies to (bx, by) and holds; bursts into `amp` sparks when its
              // life ends
    SF_SUN,   // a small sun shed from Leo's mane
    SF_METEOR // falls on a curve (turn per tick), like SF_CURVE
};
enum HazardKind : uint8_t {
    HK_LANE,
    HK_POOL,
    HK_BEAM,
    HK_RING,
    HK_ARM, // lethal when live
    HK_TELL,
    HK_ARC,
    HK_AIM,
    HK_PULL, // warnings and forces
    HK_BURN  // scorched ground: burns whoever stands in it
};
enum PartKind : uint8_t {
    PK_BLADE,
    PK_PANEL,
    PK_HARD,
    PK_BUBBLE,
    PK_STAR,
    PK_ORB,
    PK_SIGN,  // a zodiac creature the Zodiarch threw (slot = sign 0..11)
    PK_TAIL,  // one of Ninefold's nine tails (slot = tail 0..8)
    PK_DECOY, // one of Ninefold's illusions
    PK_PLATE, // one of the Sentinel's plates (slot = plate 0..3)
    PK_ENGINE // one of the Bastion's engines (slot 0 top, 1 bottom; state 1
              // dead)
};
// BC_DEFLECT throws player shots and the laser back at whoever fired them.
enum CircleType : uint8_t {
    BC_CORE,
    BC_BLOCK,
    BC_PART,
    BC_SHOT,
    BC_DEFLECT
};
enum {
    SA_LANCE = 1,
    SA_FAN,
    SA_VOLLEY,
    SA_CROSS,
    SA_THROW, // the plate throw (P4.1)
    RA_BURST = 10,
    RA_PRISM,
    RA_HALO, // the halo lock (replaced the pick-off)
    RA_COLLAPSE,
    CA_LOB = 20,
    CA_JETS,
    CA_EMBER,
    CA_NOVA,
    CA_HAMMER,
    CA_BARRAGE,
    CA_GEYSER,
    CA_VENT,
    BA_CANNON = 30,
    BA_MISSILE,
    BA_RAM, // the ramming run (replaced the mines)
    BA_BROAD,
    TA_SINE = 40,
    TA_TENDRIL,
    TA_SPORE,
    TA_PULSE,
    TA_WALL,
    TA_RAIN,
    TA_WHIRL,
    WA_SPIRAL = 50,
    WA_CURVE,
    WA_ACCRETE,
    WA_PULL,
    WX_BURST,
    WX_JETS,
    WX_NOVA,
    WX_CLOAK,
    MA_BOLTS = 60,
    MA_SHARDS,
    MA_CURVE1,
    MA_BLINK,
    MA_SINE6,
    ZA_SIGN = 70, // + sign 0..11: the Zodiarch throws that sign (70 Aries .. 81
                  // Pisces)
    ZA_CONJ = 82,
    ZA_BREATH, // Great Conjunction (three signs at once), starfire breath
    ZA_EYES = 84,
    ZA_COILSPIT,
    ZA_NOVA,
    ZA_HOLE,
    ZA_METEOR,
    ZA_NET_RETIRED, // the dragon's own (P2.3, P3; 89 was the net)
    NA_COMETS = 90,
    NA_FOXFIRE,
    NA_ILLUSION,
    NA_BLINK,     // Ninefold
    ZA_LUNGE = 94 // the Zodiarch strikes down a warned lane (P3.2)
};

