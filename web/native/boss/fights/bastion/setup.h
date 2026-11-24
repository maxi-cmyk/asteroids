#pragma once
// Bastion and Gunnery

// Slots of boss.aux and boss.stamp.
enum {
    AUX_BASTION_CANNON = 0, // 1 while the nose cannon or broadside fires
    AUX_BASTION_PODS = 1,   // 1 while the missile pods are open
    AUX_BASTION_ARMOUR = 2, // hull plating shown in the scene
    AUX_BASTION_ROLL = 3,   // its bank (and list, once hurt)
    AUX_BASTION_THRUST = 4, // 0..1: how hard the engines burn
    AUX_BASTION_PREV_Y = 5, //
    AUX_BASTION_LOCK = 6,   // 0..1: the missile lock-on closing on the pilot
    AUX_BASTION_LANE = 7    // the ramming run's lane (y), while it runs
};
enum {
    AUX_GUNNERY_FIRING = 0
}; // 1 while the bolts attack runs
// Queued bolts (Bastion's MA_BOLTS echo and Gunnery): four floats per gun from
// AUX_BOLTS.
enum {
    AUX_BOLTS = 8,
    BOLT_STRIDE = 4,
    BOLT_X = 0,
    BOLT_Y = 1,
    BOLT_ANGLE = 2,
    BOLT_FIRE_AT = 3
};
enum {
    STAMP_BASTION_REVIVED = 2, // the guns came back once already
    STAMP_BASTION_GUNLESS_SINCE = 3
}; // when the last gun fell (0 = a gun stands)

// ================================================================ BASTION /
// GUNNERY
// The battleship (nextSteps.md P4.4). Its weak point is its engines, one on an
// outrigger on each flank near the stern: shots there hurt it, and while it
// thrusts hard (the ramming run) they count double. The hull turns shots away.
// Its three guns are hardpoints that take hits of their own, and knocking one
// out silences its attack: the nose cannon, the missile pods, the aft battery
// (the broadside). The ramming run (replaced the mines) needs no gun. It banks
// as it moves and lists as it is hurt; at half health it loses the engine that
// took more hits.
static const BossRow SEQ_BASTION[]
        = {{4, BA_CANNON, BA_MISSILE, BA_CANNON, BA_RAM},
           {4, BA_CANNON, BA_MISSILE, BA_BROAD, BA_RAM}};
static const BossRow SEQ_GUNNERY[] = {{2, MA_BOLTS, BA_MISSILE}};
static const float BASTION_ENGINE_X = 66, BASTION_ENGINE_Y = 98;
static const unsigned BASTION_ENGINE0 = 3; // parts 3 and 4
// The ramming run.
static const unsigned long RAM_RISE = 1200, RAM_CROSS = 1400, RAM_AWAY = 1200,
                           RAM_BACK = 1200;
static const float RAM_HALF = 70; // half the lane's height
// The lane can slope: the ship dives or climbs across the field (dy per px it
// travels left), never so steeply that the lane leaves the field.
static const float RAM_SLOPE_MAX = .2f;
static const float RAM_BACKOFF = 70; // how far right it pulls back to turn
// boss.scratch while a ramming run is on: the lanes' hazard slots (+1), the
// second lane's height and slope, and whether there is a second pass.
enum {
    RAM_HZ = 0,
    RAM_SLOPE = 1,
    RAM_TWICE = 2,
    RAM_LANE2 = 3,
    RAM_SLOPE2 = 4,
    RAM_HZ2 = 5
};
// Marks the run's lane (its `e`): live, the danger is the ship itself, so the
// renderer draws no band (src/boss/scene.mjs RAM_LANE).
static const float RAM_STYLE = 20;
static void bs_bastion_xy(unsigned i, float& x, float& y) {
    static const float off[3][2] = {{8, -56}, {-28, 58}, {50, 56}};
    float c = cosf(boss.aux[AUX_BASTION_ROLL]),
          s = sinf(boss.aux[AUX_BASTION_ROLL]);
    float dx = i < 3 ? off[i][0] : BASTION_ENGINE_X,
          dy = i < 3 ? off[i][1]
                     : (i == BASTION_ENGINE0 ? -1 : 1) * BASTION_ENGINE_Y;
    x = boss.x + dx * c - dy * s;
    y = boss.y + dx * s + dy * c;
}
static void bs_bastion_begin() {
    static const float r[3] = {34, 28, 24};
    for (unsigned i = 0; i < 3; i++) {
        BossPart& p = boss.parts[i];
        p = {};
        p.exists = true;
        p.kind = PK_HARD;
        p.slot = i;
        p.hp = p.hp_max = 6;
        p.r = r[i];
    }
    for (unsigned k = 0; k < 2; k++) {
        BossPart& p = boss.parts[BASTION_ENGINE0 + k];
        p = {};
        p.exists = true;
        p.kind = PK_ENGINE;
        p.slot = k;
        p.hp = 0; // hits taken (picks which engine dies at half health)
        p.r = 20;
    }
    boss.aux[AUX_BASTION_THRUST] = .3f;
    boss.aux[AUX_BASTION_PREV_Y] = boss.y;
}
static void bs_bastion_revive(int hp) {
    for (unsigned i = 0; i < 3; i++) {
        BossPart& p = boss.parts[i];
        p.exists = true;
        p.hp = p.hp_max = hp;
    }
}
// Bolts wait on their aim lines (the Horizon Warden borrows this for its
// Bastion cannon).
static void bs_bolts_tick() {
    for (unsigned k = 0; k < 2; k++) {
        float& fire = boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_FIRE_AT];
        if (fire > 0 && game_ms >= (unsigned long)fire) {
            bs_shot_at(SF_BOLT,
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_X],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_Y],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_ANGLE],
                       3.0f);
            fire = 0;
        }
    }
}
