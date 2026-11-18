#pragma once
// The rift: the Zodiarch (BK_WARDEN) and its herald Ninefold (BK_LENSIMP).
// Design: nextSteps.md P1.2 / P1.3 / P2 / P3. Internal ids stay `warden` /
// `lensimp` so saves, records and unlocks carry over. Each boss lives in its
// own files; this joins them up.
#include "zodiarch/data.h"
#include "zodiarch/swim.h"
#include "zodiarch/creatures.h"
#include "zodiarch/signs.h"
#include "zodiarch/own.h"
#include "zodiarch/fight.h"
#include "ninefold.h"

static const BossOps OPS_WARDEN = {372,
                                   135,
                                   2,
                                   3,
                                   {70, 35},
                                   {1000, 850, 700},
                                   bs_zod_begin,
                                   bs_zod_update,
                                   bs_zod_pick,
                                   bs_zod_run,
                                   bs_zod_circles,
                                   bs_zod_body,
                                   bs_zod_phase,
                                   nullptr,
                                   bs_zod_hit};
static const BossOps OPS_LENSIMP = {340,
                                    135,
                                    6,
                                    1,
                                    {0, 0},
                                    {1000, 1000, 1000},
                                    bs_fox_begin,
                                    bs_fox_update,
                                    bs_fox_pick,
                                    bs_fox_run,
                                    bs_fox_circles,
                                    bs_fox_body,
                                    nullptr,
                                    nullptr,
                                    bs_fox_hit};
