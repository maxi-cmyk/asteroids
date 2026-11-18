#pragma once
#include "../../include/config.h"

// Browser-only geometry. The OLED target retains include/config.h unchanged.
#ifdef WEB_HD
#undef SCREEN_W
#undef SCREEN_H
#undef HUD_HEIGHT
#undef PLAY_AREA_Y
#undef SHIP_RADIUS
#undef SHIP_X
#undef SHIP_MAX_SPEED
#undef BULLET_SPEED
#undef MULTISHOT_DIAGONAL_SPEED
#undef PICKUP_RADIUS
#undef PICKUP_SPEED
#undef ASTEROID_LARGE_R
#undef ASTEROID_MEDIUM_R
#undef ASTEROID_SMALL_R
#undef SHIP_NOSE_OFFSET
#undef SHIP_TAIL_OFFSET
#undef SHIP_BULLET_OFFSET
#undef EFFECT_BAR_WIDTH
#undef EFFECT_BAR_HEIGHT
#undef EFFECT_BAR_GAP
#undef SHIP_MIN_X
#undef SHIP_MAX_X
#undef SHIP_MIN_Y
#undef SHIP_MAX_Y
#undef SHIP_HULL_CIRCLES
#undef SHIP_HULL_COUNT
#undef ROCK_CONTACT_SCALE
#undef PICKUP_CUE_MS
#define SCREEN_W 480
#define SCREEN_H 270
#define HUD_HEIGHT 0
#define PLAY_AREA_Y 0
#define SHIP_RADIUS 7
#define SHIP_X 45
// Reduce web movement response by 25% after analog normalization.
#define SHIP_MAX_SPEED 3.65625f
#define BULLET_SPEED 18.75f
// Side shots are ~8.6 degrees from aim (previously ~17.5 degrees).
#define MULTISHOT_DIAGONAL_SPEED 2.8125f
#define PICKUP_RADIUS 6
#define PICKUP_SPEED 1.125f
// A health pickup restores one life, up to this many.
#define PICKUP_HEALTH_MAX_LIVES 5
#define ASTEROID_LARGE_R 16
#define ASTEROID_MEDIUM_R 10
#define ASTEROID_SMALL_R 6
#define SHIP_NOSE_OFFSET 11
#define SHIP_TAIL_OFFSET 12
#define SHIP_BULLET_OFFSET 13
#define EFFECT_BAR_WIDTH 20
#define EFFECT_BAR_HEIGHT 2
#define EFFECT_BAR_GAP 3
#define SHIP_MIN_X 16
#define SHIP_MAX_X (SCREEN_W - 16)
#define SHIP_MIN_Y 16
#define SHIP_MAX_Y (SCREEN_H - 22)
// Measured from the seven hull sprites (facing right): a body about 14 px tall
// from -9 to +3 and a 4 px nose out to +12. Tail, core, nose; each a pixel
// inside the art so near misses that look like misses are misses.
#define SHIP_HULL_CIRCLES {{-8.0f, 4.0f}, {-1.0f, 6.0f}, {8.0f, 3.0f}}
#define SHIP_HULL_COUNT 3
// Mean rock silhouette is ~0.88 of the radius (measured from sprites.png).
#define ROCK_CONTACT_SCALE 0.85f
// Long enough for each pickup's own collect animation
// (render/layers/collect.mjs).
#define PICKUP_CUE_MS 600UL
#endif
