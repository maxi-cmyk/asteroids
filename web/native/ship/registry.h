#pragma once
#include "vanguard/ship.h"
#include "vanguard/primary/repeater.h"
#include "vanguard/secondary/beam.h"
#include "dart/ship.h"
#include "dart/primary/twin-shot.h"
#include "dart/secondary/rocket-salvo.h"
#include "lancer/ship.h"
#include "lancer/primary/lance.h"
#include "lancer/secondary/nova-pulse.h"
#include "wasp/ship.h"
#include "wasp/primary/burst.h"
#include "wasp/secondary/mine-rack.h"
#include "hammer/ship.h"
#include "hammer/primary/fan.h"
#include "hammer/secondary/drone.h"
#include "moth/ship.h"
#include "moth/primary/seeker.h"
#include "moth/secondary/arc-volley.h"
namespace loadout {
static constexpr ShipOps SHIPS[] = {{VanguardShip::step},
                                    {DartShip::step},
                                    {LancerShip::step},
                                    {WaspShip::step},
                                    {HammerShip::step},
                                    {MothShip::step}};
static constexpr WeaponOps PRIMARIES[] = {{RepeaterPrimary::fire},
                                          {TwinShotPrimary::fire},
                                          {LancePrimary::fire},
                                          {BurstPrimary::fire},
                                          {FanPrimary::fire},
                                          {SeekerPrimary::fire}};
static constexpr WeaponOps SECONDARIES[] = {{BeamSecondary::fire},
                                            {RocketSalvoSecondary::fire},
                                            {NovaPulseSecondary::fire},
                                            {MineRackSecondary::fire},
                                            {DroneSecondary::fire},
                                            {ArcVolleySecondary::fire}};
} // namespace loadout

static_assert(sizeof(loadout::SHIPS) / sizeof(loadout::ShipOps)
                      == LOADOUT_SHIP_COUNT,
              "ship registry must match catalogue");
static_assert(sizeof(loadout::PRIMARIES) / sizeof(loadout::WeaponOps)
                      == LOADOUT_PRIMARY_COUNT,
              "primary registry must match catalogue");
static_assert(sizeof(loadout::SECONDARIES) / sizeof(loadout::WeaponOps)
                      == LOADOUT_SECONDARY_COUNT,
              "secondary registry must match catalogue");
