# Ship customisations — specification

Implemented 2026-11-23 following approval of this plan. All six ship, primary and secondary
implementations are available through the Hangar. Tuning values are initial gameplay values;
human balance and physical-input acceptance remain R1. The accepted showroom Hangar is implemented; final visual/input acceptance
remains HG1 before S2. Browser visual verification of this implementation remains outstanding.

## Confirmed scope

- Six gameplay ships, six primary weapons and six secondary weapons, independently selected:
  **216 loadouts**. No fixed ship/weapon pairing or bonus for matching a kit.
- The Level 1 kit is available from the start. Clearing Levels 2–6 permanently grants their
  corresponding three options. This is the starter exception to the earlier rule that every
  first clear grants a new kit; Level 1 does not grant a seventh option.
- Unlocks belong to each profile. A co-op clear grants the kit to both participating profiles,
  even if one pilot has run out of lives, matching campaign clear credit.
- One equipped loadout per profile. The run captures it at launch; later Hangar changes affect
  the next run. Retry retains the run's loadout; choosing a different loadout requires returning
  to the Hangar. No mid-fight swaps.
- Campaign and Endless use earned choices. Practice can preview locked choices without earning
  progress or saving them as the normal equipped loadout. The demo uses an explicit valid kit.
- Build local solo/co-op first. LAN and online later carry the same loadout IDs and rules version.

## Kit progression

| Kit | Availability | Ship | Primary | Secondary | What it teaches |
| --- | --- | --- | --- | --- | --- |
| 1 | Available from the start | Vanguard | Repeater | Beam | Aiming, movement and an opening to charge |
| 2 | Clear Act 1 Level 2 | Dart | Twin shot | Rocket salvo | Fast repositioning and delayed damage |
| 3 | Clear Act 1 Level 3 | Lancer | Lance | Nova pulse | Lining up targets and making room |
| 4 | Clear Act 1 Level 4 | Wasp | Burst | Mine rack | Timing bursts and planning space |
| 5 | Clear Act 1 Level 5 | Hammer | Fan | Drone | Close-range coverage and sustained pressure |
| 6 | Clear Act 1 Level 6 | Moth | Seeker | Arc volley | Tracking targets and splitting attention |

Only progression pairs these rewards. A Dart with Fan and Beam is as valid as Vanguard with
Seeker and Drone. Results lists all newly granted options together; repeat clears award none.
Level 1 first-clear results show the normal level unlock, without pretending the starter kit is new.

## Ships: movement choices, independent of weapons

Keep starting lives, collision radius, invulnerability, pickup strength and damage rules identical.
Ship choice controls movement only. Faster ships trade immediate control for speed; slower ships
brake and reverse more precisely. No hidden damage or cooldown bonus tied to the chassis.

Initial tuning values below are relative to today's normal speed. Acceleration/braking times
are approximate 0→maximum and maximum→0 times, measured at the 20 ms simulation tick.
They introduce handling inertia, so this needs an explicit feel check before committing to it.

| Ship | Max speed | Acceleration | Braking | Role and drawback |
| --- | --- | --- | --- | --- |
| Vanguard | 1.00× | 140 ms | 100 ms | Balanced, predictable starter |
| Dart | 1.20× | 260 ms | 200 ms | Crosses the field quickly; requires room to stop |
| Lancer | 1.12× | 200 ms | 160 ms | Fast straight runs; less nimble in tight reversals |
| Wasp | 1.05× | 100 ms | 180 ms | Quick launch; carries momentum after release |
| Hammer | 0.85× | 60 ms | 20 ms | Precise short corrections; cannot race across the field |
| Moth | 0.95× | 180 ms | 40 ms | Stops cleanly; takes longer to build speed |

Retain the existing precision input, applying its speed scale after the ship's speed limit.
Normalize diagonal movement. Keyboard, stick and mouse aiming must use the same physics;
releasing input brakes rather than allowing indefinite drift. Death, pause, level transition
and respawn must not leave stale velocity. If inertia makes the game feel worse, revisit the
handling model before implementing all six ships rather than shipping six raw speed upgrades.

There are **seven cosmetic appearances** and six gameplay chassis. Existing Comet equipment
migrates to Vanguard handling unless the profile chooses another earned chassis; its appearance
is retained. The appearance selector changes visuals only, so Comet can also be worn with a
subsequently selected chassis. Appearance ownership never grants new weapons or adds a seventh
stat choice to the 216-loadout matrix.

## Primary weapons

Primary fire keeps the existing aiming and fire-button binding. A press requests one weapon
activation; cooldowns cap accepted activations so rapid clicking cannot bypass the weapon's
rate. Burst subshots are deterministic scheduled events. Decide separately whether hold-to-fire
should be introduced; this feature does not silently replace the current press-fire behaviour.

| Primary | Activation | Interval | Damage per projectile | Tradeoff |
| --- | --- | --- | --- | --- |
| Repeater | One straight bolt | 160 ms | 1 | Reliable starter; narrow coverage |
| Twin shot | Two parallel bolts | 320 ms | 1 each | Both must connect to match full damage |
| Lance | One fast penetrating shot, up to 3 rocks | 520 ms | 3 | Demands accurate aim; slower recovery |
| Burst | Three bolts, 60 ms apart | 480 ms | 1 each | Good tracking reward; burst cannot be cancelled into extra shots |
| Fan | Five bolts over a 24° arc | 800 ms | 1 each | Close-range coverage; distant targets catch fewer bolts |
| Seeker | One softly guided bolt | 200 ms | 1 | Forgives aim; slower travel, capped turn rate and lifetime |

These are initial balance values, not guaranteed damage output. Damage to a single boss must
respect its exposed target and defenses. Lance penetrates ordinary rocks, not closed boss armor;
one projectile cannot damage multiple circles of the same boss in a tick. Seekers choose valid
exposed targets deterministically and never reveal or hit an invulnerable weak point.

Define each projectile's speed, radius, lifetime, target priority, penetration and collision
budget in the weapon catalogue. Avoid introducing fractional health into the shared engine;
integer damage is sufficient. The web implementation must keep the handheld build working.

## Secondary weapons

One secondary slot uses the existing secondary/laser binding. Keep the shield binding for the
existing stored-shield pickup. Every ability has a visible ready/charging/cooldown state and
uses the same world-space aim direction captured according to its rule.

| Secondary | Behaviour | Windup | Cooldown | Cost / limit |
| --- | --- | --- | --- | --- |
| Beam | Existing aimed beam, one hit per target | 1.5 s | 5 s | Primary suppressed while charging; preserve current beam rules |
| Rocket salvo | Three aimed rockets with limited homing and a small blast | 0.4 s | 7 s | Slow arrival; one explosion damages a boss once |
| Nova pulse | Expanding short-range ring, clears ordinary bullets and damages exposed targets | 0.6 s | 9 s | Short reach; does not erase persistent hazards or armored attacks |
| Mine rack | Places three proximity mines near the ship | 0.2 s | 6 s | At most 3 active per pilot; 5 s lifetime; no off-screen hits |
| Drone | A companion fires toward the current aim for 4 s | 0.4 s | 10 s | One drone per pilot; moderate damage; no autonomous weak-point sniping |
| Arc volley | Five strong bolts in a forward fan | 0.5 s | 6 s | Wide coverage; concentrated damage requires close range |

Cooldown starts on release/activation, cannot be reset by equipping, and does not tick in pause.
Non-Beam windups initially allow primary fire; retune cooldowns against that advantage. Death
cancels charging and owned ability effects; specify respawn cooldown consistently (proposal:
retain remaining cooldown). All damage keeps the pilot's ownership through delayed effects.
Bombs and mines get visible lifetimes; pool exhaustion never creates invisible hits or a free retry.

Initial damage values are 8 per rocket, 18 for Nova, 12 per mine, 2 per drone bolt, and 6 per
Arc bolt. Beam retains its existing eight design hits. These are starting balance values;
R1 will compare damage, uptime and defensive utility against the existing Beam baseline.

## Pickups, scoring and mode rules

- Multishot adds the current two wing shots at ±45° from the activation's aim, using basic
  1-damage bolts. It does not recursively multiply a Fan or Burst. One pair per activation.
- Double fire repeats the weapon activation after the existing delay, once only. The delayed
  activation cannot itself trigger another repeat; its scheduled subshots retain ownership.
- Secondary fire is unaffected by primary-only pickups. Health and shield pickups retain their
  existing behaviour. Campaign bosses and minis continue to drop no hearts.
- Primary accuracy counts actual projectile hits/spawns, including burst subshots and wing
  shots; one penetrating projectile counts as a hit only once. Secondary statistics use a
  separate generic ability category, replacing Beam-specific UI labels without losing old saves.
- All offensive effects pass through the existing boss damage/armor rules and co-op ownership.
  Pause freezes timers. Friendly fire follows the selected mode rules and never earns score.
- Secondary bullet-clearing is useful, so it needs testing against the achievement and boss
  mechanics. It must not clear telegraphs, body contact or persistent hazard zones.
- Versus will use the same catalogue with mode-specific damage limits if needed; its first
  implementation comes later in the roadmap. Do not balance against unbuilt LAN behaviour now.
- Standard records remain grouped by existing mode/rules. Record the loadout and catalogue
  version in run/replay metadata; do not fragment the boards into 216 empty rankings.

## Hangar and launch flow

Use the dedicated Hangar subpage with the accepted showroom composition: specs on the left,
one large preview on the right, thumbnail rail underneath, and the equipped three-slot dock
with separate Equip/Test actions at the bottom:

1. Choose the profile, then one of three labelled sections: Ship, Primary fire, Secondary fire.
2. Drag the six-stop slider, swipe the stage, scroll horizontally, or choose a named option
   to preview without equipping. Show actual values and its tradeoff,
   not generic five-bar ratings. Locked options show "Clear Act 1 Level N" and a preview.
3. A separate Equip action commits only the selected slot. Keep a visible equipped-loadout
   summary while browsing. Six named paint colours apply per profile and persist through saves;
   paint changes immediately without altering gameplay stats.
4. A safe preview range demonstrates movement, projectile pattern and secondary cooldown;
   it grants no score, records, stars or unlocks. Previewing a locked choice stays isolated.
5. The launch/lobby shows each pilot's loadout. Results shows newly unlocked items and offers
   a route to the Hangar without replacing Next level, Retry or Level select.

Keyboard and controller need predictable navigation within each section, distinct focus and
selected states, and a return path. Screen readers receive selection, lock reason and cooldown
state. Reduced motion removes preview camera effects and reward flashes.

## Class and folder structure (requested 2026-11-23)

Each ship type, primary weapon and secondary weapon has its own class and source file. Group
files under the kit that introduces them for navigation, while registering the three categories
independently. A folder is an ownership/location convention, not a restriction on equipping.

```text
web/native/ship/
  contracts.h                # motion/weapon contexts, ShipOps and WeaponOps signatures
  state.h                    # bounded per-pilot movement, weapon and ability state
  registry.h                 # three independent ID → operations registries
  system.h                   # engine adapter assembly
  engine/                    # emission, controls, damage and projectile stepping
  vanguard/
    ship.h                   # VanguardShip
    primary/repeater.h       # RepeaterPrimary
    secondary/beam.h         # BeamSecondary
  dart/
    ship.h                   # DartShip
    primary/twin-shot.h      # TwinShotPrimary
    secondary/rocket-salvo.h # RocketSalvoSecondary
  lancer/
    ship.h                   # LancerShip
    primary/lance.h          # LancePrimary
    secondary/nova-pulse.h   # NovaPulseSecondary
  wasp/
    ship.h                   # WaspShip
    primary/burst.h          # BurstPrimary
    secondary/mine-rack.h    # MineRackSecondary
  hammer/
    ship.h                   # HammerShip
    primary/fan.h            # FanPrimary
    secondary/drone.h        # DroneSecondary
  moth/
    ship.h                   # MothShip
    primary/seeker.h         # SeekerPrimary
    secondary/arc-volley.h   # ArcVolleySecondary
web/src/ship/
  catalogue.mjs              # IDs, display metadata, tuning and reward definitions
  motion-prediction.mjs      # scripted steering estimate; WASM owns movement
  preview.mjs                # scene-driven Hangar preview coordination
```

Gameplay classes live in C++ because damage, movement and firing are simulated in WASM. Do not
implement a second gameplay class hierarchy in JavaScript. Browser modules own presentation and
profile selection; use matching feature paths for weapon-specific painters when warranted.

Class contracts:

| Class family | Responsibilities | State ownership |
| --- | --- | --- |
| Ship type | Configure movement and update movement from normalized inputs | One movement state per pilot |
| Primary weapon | Accept an activation, schedule subshots, update/cancel pending shots | One primary state per pilot |
| Secondary weapon | Charge, activate, tick cooldown/effects, cancel on death and expose readiness | One secondary state per pilot |

Use explicit context/state parameters and small typed operations tables, following the existing
boss operations pattern. Classes can expose static methods; the registry dispatches them by ID.
This gives every implementation its own class without heap allocation, singleton mutable timers,
or a giant switch in `combat.h`. The shared state containers belong to each pilot; two pilots
using the same weapon never share charge, targets or cooldowns. Keep fields bounded for snapshots
and deterministic replays; no references to DOM, profile storage or audio in gameplay classes.

For example, `RepeaterPrimary::fire(context, state)` may emit into that pilot's projectile pool;
`BeamSecondary::tick(context, state)` advances only that pilot's charge. The loadout assembler
selects a `ShipOps`, a `PrimaryOps` and a `SecondaryOps` separately. Equipping Dart + Repeater +
Drone references classes from three folders without copying or inheriting weapons between ships.

Generate immutable tuning/ID tables from `web/src/ship/catalogue.mjs`; handwritten C++ classes
own behaviour. Each ID has exactly one implementation and one catalogue entry. Validate registry
coverage at build/test time. Shared helpers cover collision, aim and bounded spawning; a weapon
module contains only that weapon's pattern and rules. Add files by responsibility rather than
splitting every few lines or imposing a fixed line limit on generated tables.

Ship-specific tests follow the same tree under `web/tests/ship/` when implementation starts.
Keep one weapon family's behaviour and integration cases together, and a separate loadout matrix
suite for all 216 combinations. These classes and the separate scene-driven preview are now implemented.

## Data, engine and migration

Modules and contracts:

| Layer | Change |
| --- | --- |
| Catalogue | `web/src/ship/catalogue.mjs`: stable IDs, reward mapping and validation; generate C++ tuning/ID tables at build time |
| Profile store | `web/src/state/loadouts.mjs`: equipped slots and grants per profile, validation, persistence and storage-failure status |
| Engine | Capture validated loadout IDs at start; individual ship/weapon classes and per-pilot state in `web/native/ship/<type>/` |
| Scene | Named per-pilot equipped IDs and ability state, typed projectile/owned effect data; update `scene-layout.mjs`, decoder and goldens together |
| Runtime | Pass the captured loadout through solo/co-op starts, restart, level advance, practice and demo |
| Renderer/audio | Extend existing player/projectile/effect layers and sound observers; keep the scene sufficient to reconstruct every effect |
| Saves | Add a validated versioned loadout section to the unified save; preserve settings and other profile's progress |
| Replay | Version the rules/catalogue, capture both pilots' IDs; retain legacy default behaviour when replaying old recordings |

Do not trust an equipped ID merely because it exists: earned modes also check that the profile
owns it. Malformed, removed or unowned choices fall back per slot to the starter kit. Practice
preview permissions are separate from persistent grants.

Implemented migration:

- Grant the starter kit to everyone; derive new kit grants from recorded campaign clears.
- Preserve existing hull entitlements as appearances. Old mini-boss grants do not automatically
  grant unrelated new primary/secondary weapons; the kit progression uses campaign clears.
- Map a current hull to its matching gameplay chassis only when owned; otherwise use Vanguard
  handling while preserving the old cosmetic appearance. Comet maps to Vanguard as specified above.
- Merge grants by union. Equip choices use the existing local-preference policy when importing;
  never equip a locked item. Best-stat reset keeps grants; the semantics of a complete browser
  record clear must be documented alongside the existing retained cosmetic unlocks.
- Returning profiles with wave-based level access but no recorded clears get the starter plus
  their preserved appearances; opening a level is not a claimed clear.
- No migration invents clears, stars or weapon unlocks. Save export/import and partial-storage
  failure get explicit tests. Cross-version replay incompatibility must produce an understandable
  error if legacy behaviour cannot be maintained; never silently replay with different weapons.

## Implementation and verification status

The approved SC1–SC6 implementation is built: catalogue and progression, per-pilot ship and
weapon classes, independent selectors, safe preview, rewards, run capture/retry, unified saves,
HUD, secondary labels, input diagnostics, demo starter kit and replay metadata.

Automated verification enumerates all **216 combinations**, checks launch/firing/activation,
bounded finite scenes and exact full-scene replay. Additional checks cover every primary against
each boss family, distinct primary/secondary patterns, owned effects cancelled on death, queued
burst accounting, immutable active-run loadouts, independent co-op state, first-clear kit credit,
profile isolation, migration, save round-trip/merge and refused writes. All 18 ship/weapon headers
compile independently; generated catalogue and registry dimensions are checked at compile time.
Existing legacy scene goldens remain unchanged by hashing their original ABI prefix; new loadout
replay tests cover the full extended scene. The existing build-fingerprint compatibility error
continues to reject older incompatible recordings.

Low-level `createRuntime` callers without a Loadouts store retain the legacy rule path, which
supports the existing engine clients and tests. The browser application always supplies the
profile loadout store; preview and demo explicitly configure their kit in isolated engines.

## Remaining design and acceptance work

- HG1: visually verify the implemented carousel, ship drafts, paint controls and input flows before S2.
- R1: verify visual layout, keyboard/controller feel and two-device co-op; measure clear times,
  survival, primary accuracy and secondary utility. Tune the 216-loadout space from evidence.
- Human balancing is not established by smoke tests or replay determinism. Keep the current
  handling/weapon values provisional until that scheduled final playtest.
- The future achievements and versus stages will integrate their own rules with the captured
  loadout/ability fields. LAN and website work remain after features and R1.
