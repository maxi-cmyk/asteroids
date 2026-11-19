#pragma once
// Ninefold's ids and constants (nextSteps.md P2.1). A fox of the rift,
// star-filled like its master, with nine tails fanned behind it. Every hit on a
// tail reaches the fox; as its health falls the tails come away one by one (the
// tails left are its health bar). Losing a tail, or seeing through an illusion,
// opens the forehead mark (the core) for 2.5 s. It moves like a fox: it sits on
// a perch, trots or gallops to the next between attacks, and every attack has a
// body (the poses in poses.h, generated from tools/fox_poses.py).
#include "poses.h"

enum {
    AUX_FOX_CLOCK = 0,
    AUX_FOX_BLINK = 1, // 1 while it is gone (the blink's leap, between dissolve
                       // and return)
    AUX_FOX_OPEN = 2,
    AUX_FOX_TAILS = 3,
    AUX_FOX_ILLUSION = 4,
    AUX_FOX_SCALE = 5,
    AUX_FOX_POSE = 6,  // FP_* for the renderer
    AUX_FOX_FACE = 7,  // -1 facing left (as drawn), 1 right (mirrored)
    AUX_FOX_ALPHA = 8, // 0..1, the leap's fade
    AUX_FOX_STEP = 9   // footfalls so far in the current move (paw prints)
};
enum {
    STAMP_FOX_BLINK_UNTIL = 3,
    STAMP_FOX_OPEN_UNTIL = 4
};
// Gaits, in the order a move runs through them.
enum {
    FG_SIT,
    FG_RISE,   // 200 ms, before a trot
    FG_CROUCH, // 300 ms, before a gallop
    FG_WALK,
    FG_RUN,
    FG_STOP, // the trot stands (150 ms), the gallop skids (400 ms)
    FG_TURN  // 150 ms, back round to face left before it sits
};
// Reactions drawn over whatever it is doing while it sits.
enum {
    FR_NONE,
    FR_YELP, // a tail lost: yelp, then a look round at its tails
    FR_SHAKE // seen through: a wet-dog shake
};
// The perches: a 3 x 3 grid. x stays within 300..340: standing or galloping,
// its head reaches 84 px ahead of its centre (and must stay right of x 216),
// and sitting at 340 its tails just stay on screen. Ears to paws it spans
// -80..+74.
static const float FOX_PERCH_X[3] = {300, 320, 340},
                   FOX_PERCH_Y[3] = {92, 140, 188};
static const float FOX_WALK_SPEED = 1.2f, FOX_RUN_SPEED = 3.2f; // px per tick
static const float FOX_WALK_MAX = 90; // longer moves are a gallop
static const float FOX_WALK_STRIDE = 9,
                   FOX_RUN_STRIDE = 12.8f; // px per frame of the cycle
static const BossRow SEQ_FOX[]
        = {{4, NA_COMETS, NA_FOXFIRE, NA_ILLUSION, NA_BLINK}};
// An illusion: three foxes drawn at .6 size, spread so none overlaps another
// much or leaves the screen; the real one takes one of the three places.
static const float FOX_ILLUSION_SCALE = .6f;
static const float FOX_ILLUSION_AT[3][2] = {{330, 54}, {380, 135}, {330, 216}};
// The decoys' and the real fox's run speeds out of the cocoon, by place: they
// arrive out of step, so timing never gives the real one away.
static const float FOX_SPLIT_SPEED[3] = {2.6f, 3.4f, 3.0f};
