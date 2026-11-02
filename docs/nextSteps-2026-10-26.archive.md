# Next steps

Merged and rewritten 2026-10-26. The UI and look overhaul is finished, so the next
body of work is **bosses**: six distinct fights, one per region, plus six
mini-bosses, with their own art, projectiles and difficulty curve. Part A is that
plan. Part B is the earlier roadmap (finished UI tasks 1–5 and the unfinished
multiplayer, combo, LAN, hosted, versus and modifier tasks), kept in full.

**Contents:** Part A: Where we are · Decisions · The six bosses · Shared rules ·
Boss designs · Mini-bosses · Difficulty · Presentation · Technical plan ·
Milestones · Acceptance · Open questions · Concept art. Part B: Previous roadmap.

# Part A — Bosses and mini-bosses

## Where we are

Shipped and not to be rebuilt: Home / mode select / Hangar (seven hulls) / Settings /
Records / Help / Results on the violet theme; quiet HUD; practice from the Pause
menu; region scenery with slow-spinning worlds; Jersey 10 + Pixelify Sans;
controller menu navigation; local co-op. Details: `web/assets/ART.md`,
`docs/UI-NAVIGATION.md`.

**Status 2026-10-26: Milestones B0–B7 are built** (engine, art, UI, tests; see
Milestones). Left: human playtesting and tuning, tier 3+ scenery backdrops
(quasi-star, pulsar, magnetar) and the final sound pass. Where this plan and the
code differ, the code and `web/COMBAT.md` win; the differences are listed under
"Built differently" in Milestones.

Bosses before this work: one placeholder **Sentinel** every fifth wave with a
lance, a fan and a rectangle body.

## Decisions already made

- Bosses close regions: waves 5, 10, 15, 20, 25, 30, then the cycle repeats harder.
- **Quasi-stars, pulsars and magnetars stay backgrounds.** They are never bosses
  and never hurt the player. They can appear as scenery behind a tier-2+ fight.
- Health formula and defeat score above stay. Difficulty comes from patterns,
  tempo and telegraph length, not from bigger health bars.
- Hits use the existing rule: shield absorbs, otherwise a life, then the current
  post-hit protection. No new damage types.
- **Dying never resets a boss** (decided 2026-10-26): you return protected and the
  boss keeps its health. Same for mini-bosses.
- **Mini-bosses are in.** One per region, on its third wave, previewing the region
  boss with a single pattern (see "Mini-bosses").

## The six bosses at a glance

| Wave | Region | Boss | Idea | Signature mechanic | Main projectiles | Health |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | Celestial frontier | **Sentinel** | Armoured guardian drone, the tutorial | Plates open only while it rests | Lance lane, needles | 18 |
| 10 | Violet orbit | **Ringwarden** | Crystal gyroscope inside two ice rings | The rings shield the core; the laser pierces them | Ice shards, prism beam | 24 |
| 15 | Ember orbit | **Cinderforge** | Burning Dyson sphere around an artificial sun | Shell opens only at vents; plasma pools shrink your room | Plasma lobs, vent jets, ember bursts | 30 |
| 20 | Ruined moon | **Bastion** | Wrecked wedge-hulled capital ship | Destroy its three hardpoints to open the bridge | Aimed bolts, homing missiles, mines | 36 |
| 25 | Lunar passage | **Tidecaller** | Drifting deep-space jellyfish | Bubble shield you must pop first | Sine streams, tendril sweeps, spores | 42 |
| 30 | Outer rift | **Horizon Warden** | Machine wearing a black hole's lensing | Orbiting S-stars, a closing ring | Curving shots, spirals, ring waves | 48 |

After wave 30 the six repeat with a **tier** modifier (see Difficulty).

## Shared rules (apply to every boss)

**Units.** Playfield 480×270, one tick = 20 ms. Ship radius 7, ship speed
3.66 px/tick (183 px/s), player shot 18.75 px/tick. Bounds x 16–464, y 16–248.

**Telegraph language.** A player must read danger by shape, not only colour.

| Cue | Meaning | Minimum warning |
| --- | --- | --- |
| Dashed amber line | A lane or beam will fire along it | 900 ms |
| Pulsing pink ring on the floor | An area will land or erupt there | 900 ms |
| Dotted arc | A spread will fan across that arc | 600 ms |
| Thin aim line from a turret or gun | An aimed fast shot is coming | 500 ms |
| Boss flashes white for 80 ms | Damage landed (never a danger cue) | none |

**Hostile projectiles** are pink-orange with a dark rim. Ones you can shoot
(missiles, mines, bubbles, spores) get a white rim. Player shots stay cyan/amber.

**Families** (all speeds are px/tick; every one is slower than the ship's 3.66, so
running always works):

| Family | Radius | Speed | Notes |
| --- | --- | --- | --- |
| Needle | 2 | 2.2 | Straight; the Sentinel's fan shot today |
| Shard | 3 | 1.6 or 2.6 | Slow wall or fast pick-off |
| Bolt | 3 | 3.0 | Only with a 500 ms aim line |
| Sine bulb | 4 | 1.8 | ±24 px wave, 700 ms period |
| Spiral pellet | 2.5 | 1.7 | From a rotating emitter |
| Homing missile | 4 | 1.4 | Turns 0.04 rad/tick, expires at 4 s, 2 HP, shootable |
| Mine | 5 | 0.8 drift | Fuse 2 s, bursts into eight needles, 1 HP, shootable |
| Plasma lob | 5 | arc, 1.2 s flight | Lands on a marker and leaves a pool |

**Hazards:** lance lane (half-width 9, warn ≥900, active 320 ms); vent jet
(width 28, warn 900, active 500); plasma pool (radius 22, lasts 4 s, hurts on
contact); prism beam (width 10, sweeps at 0.9 rad/s); ring wave (band 8 px thick,
speed 2.0, with a gap of at least 50°); tendril arm (150 px, 0.8 rad/s, arc shown
first).

**Fairness rules** (also automated checks, see Milestone B0):
1. The entrance is harmless for 1.2 s.
2. A lethal hazard never appears without its warning above.
3. At least one safe path 42 px wide (three ship widths) exists at all times.
4. No more than 48 hostile projectiles and 6 hazards live at once.
5. The first attack of a fight is always the simplest pattern.
6. Dying never resets the boss; you come back protected and the boss keeps its health.
7. A boss body fills at most the right 55% of the field. Touching the body counts as a
   hit, nothing spawns inside it, and the left 45% is always open for dodging.

**Player tools.** Shots do 1, the laser does 8 once per discharge and pierces. Shield
absorbs one hit. Each fight drops one shield pickup when it enters phase 2 and one
multishot when it enters phase 3, so no boss needs a lucky drop.

## Boss designs

### 1. Sentinel — wave 5, Celestial frontier (tutorial)

- **Look.** A 220×220 spiked, cyclopean war-sphere: a heavy steel hull ringed by eight
  long spikes, four armoured plates (amber trim, rivets) closed over a single huge
  eye. When the plates swing open you see a slit-pupil eye glaring out of a dark
  socket under two angry brow plates. The eye (radius 33) is the core. Anchored at
  the right edge near (366, 135); about 80% of the screen's height.
- **Teaches:** read the dashed lane, shoot between attacks, use the laser on a rest.
- **Phases.** 100–60% *Patrol*, 60–0% *Alert*.
- **Attacks.**
  - **Lance** — locks your height, dashed amber lane for 900 ms, beam for 320 ms.
    Exists today.
  - **Fan** — three needles, ±0.28 rad, 2.2. Exists today.
  - **Needle volley** (Alert) — five needles aimed 120 ms apart at 1.8, so you must
    strafe, not stand.
  - **Cross lance** (Alert) — a horizontal and a vertical lane at once; the lanes
    cross away from your current position.
- **Weak point.** Plates are closed during attacks (shots do 0) and open during the
  950 ms rest. This turns "hold fire" into a rhythm.
- **Difficulty.** Rest 950 ms, telegraph 900 ms. The only boss where every fight
  can be won without moving more than a lane at a time.

### 2. Ringwarden — wave 10, Violet orbit

- **Look.** A 270×270 crystal crown: two rings of long ice blades (16 outer, 11 inner,
  each 30–42 px) around a dark violet void, with a faceted diamond in the middle
  whose slit eye glares through. Blades are shootable shards, so the whole thing
  bristles. Floats near (344, 135) and drifts ±40 px vertically.
- **Mechanic: the gap.** Ring shards block your shots and break (1 HP each, regrow
  after 6 s). The core is only hit when a gap lines up or a shard is broken. The
  **laser pierces both rings and hits the core**, so it is the answer, not a bonus.
- **Phases.** 100–66% *Orbit*, 66–33% *Prism*, 33–0% *Collapse*.
- **Attacks.**
  - **Shard burst** — 12 shards detach from the ring and fly outward at 1.6; the
    holes between them are the safe lanes. Ring slots refill after 3 s.
  - **Prism beam** (Prism) — a thin line from the core sweeps a 90° arc once; 800 ms
    telegraph as a dotted wedge, then a 10 px beam sweeping at 0.9 rad/s.
  - **Fast shard pick-off** (Prism) — three 2.6 shards aimed at you after an aim line.
  - **Ring collapse** (Collapse) — both rings contract to the core, then expand as a
    ring wave at 2.0 with a 70° gap that rotates each cycle.
- **Weak point.** Core is open for 2.5 s after a Collapse.
- **Difficulty.** Slow projectiles, many of them: this boss tests spatial
  reading and laser timing, not reflexes.

### 3. Cinderforge — wave 15, Ember orbit

- **Look.** A burning **Dyson sphere**: a 300×300 megastructure, a spiked iron cage
  (14 prongs, a 236 px sphere) of charred ribs and armoured panels around an
  artificial sun. About 40% of the cells are open lattice with the fire burning
  through; seams glow red; a dithered ember halo surrounds it. Core radius 34 behind
  the shell. Fills the right half of the screen at about (340, 135) and turns very
  slowly. Palette: charcoal and iron against `#8a1004` to `#ff6a14` to `#fff6c8` fire.
- **Mechanic: venting.** The shell is armour; shots bounce off panels and lattice
  alike. The core is only hit through a **vent**, a panel that swings open to release
  a jet. Each vent stays open for 2 s. Panels can also be **broken** (3 HP each) to
  make a permanent window, but every broken panel adds one jet to later volleys, so
  opening the sphere trades damage for danger.
- **Phases.** 100–66% *Stoke*, 66–33% *Boil*, 33–0% *Supernova*.
- **Attacks.**
  - **Flare lob** — a marker ring on the floor under where you stand; a blob of plasma
    arcs in over 1.2 s and leaves a radius-22 **plasma pool** for 4 s. Shooting a lob
    splits it into three slow embers instead, so shooting is a trade.
  - **Vent jets** (Boil) — three panels swing open and fire straight jets (width 28)
    outward along the dashed lines; 900 ms warning, 500 ms of fire. Jet angles follow
    the open panels, so you read the sphere to read the lanes.
  - **Ember burst** (Boil) — a 7-spark fan at 2.4 aimed near you.
  - **Nova pulse** (Supernova) — the shell blows half its panels off, the sun swells,
    and a ring wave (2.0, 60° gap) expands from the core; the core is fully open for
    2 s afterward.
- **Weak point.** Open vents and broken windows. Laser pierces the shell at half damage.
- **Difficulty.** The first boss that punishes standing still: pools persist across
  patterns and the sphere takes up half the field.

### 4. Bastion — wave 20, Ruined moon

- **Look.** A wrecked **capital ship in the wedge-dreadnought mould**: a 340×196 hull
  with its nose pointing at you, dark gunmetal plating stepped back in armour bands,
  a lit central trench with red-orange running lights, rows of small turrets along
  both edges, and a raised bridge tower at the stern with two shield domes and a
  slit-pupil eye window (the core, radius 17). Three engine nozzles burn at the stern.
  Battle damage: a shot-away corner and glowing cracks, fitting the ruined moon.
  Original design in the style of a classic sci-fi star destroyer, not a copy. About
  (318, 138); the stern runs a little off-screen.
- **Mechanic: hardpoints.** Three weapon groups, each a sub-target with 6 HP: the
  **dorsal cannon bank** (three turrets along the upper edge), the **missile bay**
  (belly, forward) and the **launch bay** (rear underside). Destroying a group stops
  its attack. The bridge takes **half damage while any hardpoint lives**.
  Hardpoints rebuild once, 8 s after the last falls, so rushing the bridge works but is
  slower than clearing them.
- **Phases.** 100–50% *Battle line*, 50–0% *Damage control* (hardpoints return with +1
  HP and faster fire; engines flare).
- **Attacks.**
  - **Dorsal cannons** — red aim line for 500 ms, then a 3.0 bolt; the three turrets
    take turns, and two in a row on Damage control.
  - **Missile bay** — two homing missiles (1.4, 4 s, 2 HP, shootable), fired 600 ms
    apart. They die to shots, so one correct answer exists.
  - **Launch bay** — drops mines that drift left; each bursts into eight needles after
    2 s or when shot. Shooting one near the boss clears it safely; near you, it does not.
  - **Broadside** (Damage control) — every turret fires in sequence along the hull, a
    dotted arc showing the order, so the pressure comes from tempo, not new shapes.
- **Weak point.** The bridge is always hittable but armoured; the laser ignores the
  armour.
- **Difficulty.** The highest projectile count so far; the answer is prioritising.

### 5. Tidecaller — wave 25, Lunar passage

- **Look.** A 230×290 deep-sea horror: a huge teal bell (196 px across) with a fanged
  jagged skirt and ribbed dome, a magenta slit-pupil eye (the core, radius 36) and
  glowing pink spots, eight thick barbed tendrils (6 px, magenta tips) trailing off
  the bottom of the screen. Bubbles orbit it. Drifts in a slow figure of eight
  around (356, 142). It echoes the alien pilots in `inspo/02`, redrawn originally.
- **Mechanic: bubble shield.** The boss spawns three orbiting bubbles; while any
  survives the bell takes no damage. Bubbles have 2 HP, pop with shots, and reform
  once after 10 s. Popping a bubble releases a harmless sparkle. The laser pops
  all three.
- **Phases.** 100–70% *Drift*, 70–35% *Surge*, 35–0% *Storm*.
- **Attacks.**
  - **Sine stream** — a column of ten bulbs, each wave offset 700 ms, travelling left.
    Safe path is the trough between waves.
  - **Tendril sweep** (Surge) — two tendrils sweep 150° arcs across the field with a
    glowing arc shown first; the gap closes then reopens.
  - **Spore cloud** (Surge) — a slow radius-18 cloud that splits into four spores when
    shot or after 2 s. Shootable, and splitting near you is the risk.
  - **Riptide** (Storm) — all of the above in alternation with 20% shorter rests,
    plus a bell pulse ring wave (2.0, 60° gap) every third cycle.
- **Weak point.** Bell opens when all bubbles are down; exposed for 3 s.
- **Difficulty.** Visually calm but the busiest screen so far, with many overlapping
  weaves rather than single heavy hits.

### 6. Horizon Warden — wave 30, Outer rift (finale)

- **Look.** A 330×330 colossal eye: a black void (radius 48) ringed by an amber lensing
  halo that is brightest at the lower left, with a white-hot vertical slit in the
  middle. Around it six violet armour plates with amber trim and a crown of twelve
  spikes. Four small satellite turrets, the **S-stars**, orbit on dotted elliptical
  paths (the same four orbits as the background). Fills the right half and is
  cropped by the screen edge, about (338, 135).
- **Mechanic: orbits and a closing ring.** S-stars fire an aimed shot each time they
  pass nearest the player. Each has 5 HP and dies to shots; losing all four ends the
  aimed fire. The core opens only while the S-stars' orbits line up (a visible
  chime and a 2 s window every ~8 s) or when all four are down.
- **Phases.** 100–70% *Orbit*, 70–35% *Lens*, 35–0% *Singularity*.
- **Attacks.**
  - **S-star shot** — each star fires one 2.2 needle as it passes nearest you, about
    every 4 s per star, staggered so shots never arrive together.
  - **Spiral bloom** (Lens) — a three-arm spiral of pellets at 1.7; the arm gaps
    sweep slowly, so the safe lane circles with the arms.
  - **Lens curve** (Lens) — shots that bend: angular velocity 0.012 rad/tick, always
    curving away from the core so you can lead them.
  - **Accretion ring** (Singularity) — a closing ring of 40 dots with a rotating
    60° gap; each pass is 6% smaller, to a minimum of 32 px of safe room.
  - **Event pull** (Singularity, once, telegraphed 1.2 s) — a 1.5 s nudge toward the
    core at 0.8 px/tick. A mild pull, optional under "reduce forces" (see
    Accessibility).
- **Weak point.** Aligned orbits, or every S-star down. The laser works any time.
- **Difficulty.** The only fight that mixes aimed fire, curved fire and zone
  control; it asks for everything the earlier five taught.

## Mini-bosses

One per region, on **wave 3 of the region** (waves 3, 8, 13, 18, 23, 28). Each is a
short fight (15–25 s) built around **one** of its boss's patterns, so it teaches
what the boss will ask. Ordinary asteroid pressure drops to about half during one.
Same fairness rules as the bosses, same hit rules, dying never resets it.

**Hull.** Each mini-boss is a small *cousin* of its region boss: same palette and
silhouette language at 150–200 px, so the player recognises the family. Beating a
mini-boss for the first time **unlocks the matching Hangar hull** (the stock
Vanguard stays free). The hulls were authored as unlock tiers, from the all-rounder
up:

| Wave | Mini-boss | Hull (look) | Unlocks hull | Pattern it previews | Health |
| --- | --- | --- | --- | --- | --- |
| 3 | **Picket** | 150 px spiked hexagon with one furious eye (Sentinel family) | **Dart** | Lance lane only | 6 |
| 8 | **Shardling** | 170 px void core with three orbiting ice blades (Ringwarden family) | **Lancer** | Three-shard aimed burst; kites close in between bursts | 8 |
| 13 | **Cinderling** | 150 px spiked ember cage: a small burning sphere, a few cells open (Cinderforge family) | **Wasp** | One plasma lob and one pool at a time | 10 |
| 18 | **Gunnery** | 200×108 wedge-hulled corvette, twin forward guns, an eye in the bridge (Bastion family) | **Hammer** | Aimed bolt pair with aim lines, then one homing missile | 12 |
| 23 | **Moonjelly** | 150×190 fanged jellyfish with one slit eye (Tidecaller family) | **Moth** | Six-bulb sine stream; slow figure-eight drift | 14 |
| 28 | **Lens Imp** | 170 px spiked black eye in an amber ring, one orbiting star (Warden family) | **Comet** | One curving shot led by an aim line; short blink with a 700 ms tell | 16 |

Health is `6 + 2 × region index`, times players in co-op. Defeat awards
`400 + 100 × region index` through the normal multiplier, once. Mini-bosses never
appear in practice unless chosen in Boss practice.

**Unlocks need a small save.** A new `asteroids.web.unlocks-v1` key (per profile,
like the Hangar) stores unlocked hull ids; Hangar shows locked hulls dimmed with
their requirement ("Defeat Picket on wave 3"). Existing players start with all
hulls unlocked until the first mini-boss exists, so nothing is taken away.

## Concept art

Local renders (gitignored workshop, regenerate with `python3 assets/make_bosses.py`
using the project venv): `assets/bosses/bosses-{spawn,attack,death}.png` and
`assets/bosses/minibosses-{spawn,attack,death}.png`. Each sheet shows all six
characters in their own region. The attack sheets show the telegraph language and
projectile families as specified here.

## Difficulty

**Health** stays `(18 + 6 × (min(10, wave/5) − 1)) × players`, in *design hits*.
The engine splits each design hit into sub-hits (`BOSS_K`: Sentinel 3, Ringwarden 6,
Cinderforge 7, Bastion 5, Tidecaller 5, Warden 4; minis 5, 8, 5, 8, 8, 6), so a
primary shot is one sub-hit and the laser is still eight design hits. Without the
split a perfect pilot killed the Sentinel in 6 s. The scripted pilot in
`web/tests/boss-bot.mjs` (6 shots/s, perfect aim, careful dodging) now clears the
fights in 28 / 29 / 37 / 41 / 44 / 55 s (bosses) and 15 / 15 / 19 / 17 / 19 / 23 s
(minis); people are expected to take about 1.5× as long. Targets, from a typical
effective 0.5 damage/second against open windows:

| Boss | Wave | Health | Target fight (solo) |
| --- | --- | --- | --- |
| Sentinel | 5 | 18 | 35–50 s |
| Ringwarden | 10 | 24 | 45–60 s |
| Cinderforge | 15 | 30 | 55–70 s |
| Bastion | 20 | 36 | 60–80 s |
| Tidecaller | 25 | 42 | 70–90 s |
| Horizon Warden | 30 | 48 | 80–110 s |

**Tiers after wave 30.** Boss index = `(wave/5 − 1) mod 6`; tier = `floor((wave/5 − 1) / 6)`.

| Tier | Waves | Changes |
| --- | --- | --- |
| 0 | 5–30 | As designed above |
| 1 | 35–60 | Rests 15% shorter, +1 attack per phase, health ×1.2 (level cap unchanged) |
| 2 | 65–90 | Telegraph never shorter than the minimum above; projectile density ×1.25; a bonus fourth phase |
| 3+ | 95+ | Repeats tier 2, scaling only score and background (scenery varies, including quasi-star, pulsar and magnetar behind the fight) |

**Co-op.** Health × players (existing). Patterns track the nearer pilot and, every
other cycle, the farther one, so neither can hide. Projectile and hazard caps do
not double.

**Scoring.** Base score unchanged. Add a **flawless** bonus of +50% for no life
lost during the fight, and credit the player who lands the killing blow, as now.

**Assists** (opt-in later): "long warnings" (+30% telegraph) and "reduce forces"
(disables Event pull and Lens curve's bend).

## Presentation

**Art style: the boss-destroyed draft** (`assets/screenshots/design-draft-boss.png`). Bosses are
drawn as chunky 4 px blocks (one block is a quarter of a native pixel step, so they read coarser
than the ship and rocks), built from flat low-poly facets in five flat shades per material with
no gradients and no fine dither. Each has a dark silhouette, an amber rim where the light
catches its upper-left edge, and sparse dark speckle blocks for texture. Glows are four flat
steps, never smooth blobs, and the defeat is a stepped ragged fireball with thin rays and
angular shards cut from the boss's own sprite. Every boss has its own death sequence
(`web/boss-death.mjs`, see COMBAT.md). Bosses are **big**, 220–340 px across, so a
boss is 60–90% of the screen height and dwarfs the 32 px player ship. Every boss has an
unmistakable face: a slit-pupil eye, a spiked crown or a fanged skirt. Minis are the same
style at 150–200 px. Reference renders: `assets/bosses/attacks-*.png`.

- **Intro card.** A 1.4 s entrance: name in Jersey 10 with the sunset gradient,
  region name below, boss slides in. Gameplay frozen only for the card, never longer.
- **Health bar.** A slim bar under the top HUD with notches at phase thresholds.
  A short flash on a threshold crossing. Hidden during the entrance.
- **Damage states.** Three sprite states per boss (pristine, cracked, critical).
  Flash white 80 ms per hit.
- **Defeat.** The existing finale (`fx.mjs bossBlast`), but chunks come from the
  boss's own sprite, plus the Results line "Defeated: Ringwarden".
- **Sound.** One entrance sting and one tell tick per boss, all synthesized in
  `audio.mjs`. The tell tick plays 200 ms before a lethal hazard goes live.
- **Reduced motion.** No screen flash or shake on boss hits; projectiles unchanged.

## Technical plan

The shape of `boss.h` is a single hard-wired fight with six shots; that cannot
carry six bosses.

**Engine (C++ in `web/native/`).**
- `boss.h` becomes a table of `BossDef` (name, health table, sprite size, core
  radius, phase thresholds, attack list) plus one `BossRun` state.
- Attacks are small state machines: `warn → live → rest`, each with its own timer
  and a function that fills the projectile or hazard pool.
- `BossShot shots[64]` with a family tag, velocity, angular velocity, life, hit
  points, shootable flag. `BossHazard hazards[8]` with kind, geometry, warn, live.
- Deterministic: all timing from `game_ms`; randomness from the run's existing seeded
  generator so tests and replays agree.
- Scene buffer: first 512 floats unchanged; grow the tail from 64 to about 400
  floats (boss header + 64 shots × 4 + 8 hazards × 8 + sub-targets); bump the
  scene version and keep `web_test_boss` working.
- Co-op: unchanged attribution, `boss_participation`, health scaling.

**Browser.**
- `bosses.png` + `bosses.json` from `web/tools/make-bosses.py`: boss bodies, three
  damage states, ring blades, hardpoints, tendril frames, projectile sprites. Sheets are
  large (a boss is up to 340×196), so each boss gets its own strip and loads when its
  region is first reached.
- `renderer.mjs` boss layer draws by family from the manifest; a `bossui` module owns
  the intro card and health bar.
- `fx.mjs bossBlast` takes the sprite for per-boss chunks.

**Practice.** Add **Boss practice** to the Pause practice tools: pick a boss and
tier, no lives lost, results show time and hits. This is how patterns get tuned.

## Milestones

Each milestone ends with `npm test` green and a browser check. **All of B0–B7 are
done** (173 web tests green; browser-checked on every boss and the first three
minis); B8 is mostly done.

- [x] **B0 Foundations.** Shared engine (`native/boss.h`): shot and hazard pools,
  hit circles, scheduler, tiers, co-op hooks; scene ABI v2 (`boss-scene.mjs`);
  renderer boss layer (`boss-render.mjs`); entrance card and health bar
  (`bossui.mjs`); Boss practice in the Pause practice tools. Automated fairness
  checks: warnings, caps, corridor, entrance, body room, over every fight at tiers
  I–III.
- [x] **B1 Sentinel remake + Picket.** Art and damage states, plate rhythm, the
  Volley and Cross lance; Picket; the **unlock save** (`unlocks.mjs`) and the
  Hangar's locked state (Dart).
- [x] **B2 Ringwarden + Shardling.** Blades, gaps, laser pierce; burst, prism,
  pick-off, collapse. Unlocks Lancer.
- [x] **B3 Cinderforge + Cinderling.** Vent panels and broken windows, plasma pools,
  lob splitting, nova pulse. Unlocks Wasp.
- [x] **B4 Bastion + Gunnery.** Hardpoints, homing missiles, mines, damage-control
  phase, one rebuild. Unlocks Hammer.
- [x] **B5 Tidecaller + Moonjelly.** Bubble shield, sine streams, tendril sweeps,
  spores, bell pulse. Unlocks Moth.
- [x] **B6 Horizon Warden + Lens Imp.** S-star orbits, window, spiral, lens curve,
  accretion ring, pull; the blink. Unlocks Comet.
- [x] **B7 Tiers and endless.** Boss cycle by wave, tier modifiers, flawless bonus.
  - [x] Tier 3+ scenery: quasi-star, pulsar and magnetar behind the fight (waves 93+
    and boss practice tier IV). `backgrounds.mjs` fades one in over 0.7 s and dims the
    region's own scenery; the object follows `(boss % 6 + tier − 3) mod 3`, so every
    boss meets all three across tiers 3–5. The pulsar and magnetar beams turn once per
    9 s (held still by reduced motion); strips are in `worlds.png`.
- [ ] **B8 Polish.**
  - [x] Audio: designed per boss in `boss-sound.mjs` (see "Sound design" below), plus
    the tell tick 200 ms before a lethal hazard goes live (`audio.mjs`).
  - [x] Attack reference: `boss-attacks.html` (Developer tools) photographs every
    attack from the live engine with its warning, answer and sounds.
  - [x] Assists: longer warnings and calm forces (Settings → Display).
  - [x] Results and Records show bosses and mini-bosses defeated by name.
  - [x] Difficulty pass with the scripted pilot (see Difficulty).
  - [ ] Difficulty pass with real people; tune `BOSS_K`, rests and window lengths.
  - [x] A distinct defeat sound per boss, and hit, part-break, phase and window cues.

Order: B0 first; B1–B6 in wave order; B7 and B8 after B1–B3 were playable.

### Built differently from the designs above

- Prism beam telegraph is 900 ms (not 800) so every lane and beam meets the same
  minimum; the Tendrils are 190 px long (not 150) because 150 px left the left third
  of the field untouchable.
- The Accretion ring closes around **where each pilot stands** when it appears
  (radius 96 shrinking 6% per pass to 48, collapsing to 32 px), with a rotating
  60° gap; a ring that closed on the boss would never reach a pilot at the edge.
- Tidecaller's bubbles reform once, 3 s after the last falls; a laser through the
  bell also pops every bubble.
- The Warden's core window is a timed 2 s every 8 s, announced by the halo, not a
  geometric alignment of the orbits.
- The first attack of a fight picks the nearer pilot, the next the farther, and so on.
- Hull unlock mapping is as proposed (Picket → Dart … Lens Imp → Comet). Players
  who already had a Hangar, records or leaderboard keep every hull.
- Event pull stays in, with a "calm forces" assist that removes it.

### Sound design

All synthesised (no samples), one timbre per boss, in `boss-sound.mjs`; minis borrow
their parent's voice a fifth higher. Each attack has a **charge** sound shaped to its
warning and a **release** sound at the lethal moment (hazard live or shot spawned).

| Boss | Timbre | Charge / release examples | Defeat |
| --- | --- | --- | --- |
| Sentinel | servo saws, square zaps | lance: rising 9 Hz-warbled whine, then a noise-and-square zap | servo winds down, six hull hits, then a crash |
| Ringwarden | glass: high sines, tinks | burst: five swelling partials, then shards tink out; prism: pure rising sine, then a hum | cascade of shattering glass over a falling chord |
| Cinderforge | fire: filtered noise, rumble | lob: rising whoosh, then thump and sizzle on landing; jets: gas hiss, then a roar | the sun swells, cracks the shell, goes out in a roar and crackle |
| Bastion | ordnance: square thumps, klaxon | cannon: aim whine, then a boom; missiles: beeps, then a launch whoosh; mines: clunk and beep | chain explosions down the hull, then a long groan and break |
| Tidecaller | water: gliding sines, bloops | sine: rising bloops; tendrils: whale-low glide; bubble pop: a quick pop pair | the bell deflates with a falling cry and escaping bubbles |
| Horizon Warden | cosmic: detuned drones, sub | spiral: detuned swirl; accretion: collapsing shimmer; pull: sub swell with inward noise; window: bell chime | reversed swell, a silence, then the sub-bass and a shimmer |

Also: entrance sting per boss, plate/hatch servo on the Sentinel, hit blip (rate-limited),
phase stinger, and window chimes. Automated checks: every sound is audible, bounded and
under 5 s; every defeat is distinct; the game triggers the right sections during a
real fight at every kind (`tests/boss-sound.test.mjs`).

## Acceptance

- Every boss is beatable without a pickup, without the laser, and at 1× multiplier.
- Every boss has a faster route using its mechanic (laser through Ringwarden's rings,
  hardpoint priority on Bastion, vent timing on Cinderforge, bubble popping on Tidecaller).
- A new player can clear Sentinel first try with 3 lives; Horizon Warden should take
  most players several attempts.
- Telegraph minimums hold in automated tests; no lethal hazard ever appears unwarned.
- 60 fps on a mid laptop with the maximum 48 projectiles and 6 hazards alive.
- Co-op keeps its roster latched at entry; a disconnect never resizes a boss.

## Open questions

1. ~~Hull unlock mapping.~~ Implemented as proposed (see "Built differently"); change
   `hull` in `boss-scene.mjs` KINDS to remap.
2. Is the Event pull acceptable at all, given how much the game avoids forces? It is
   in with a calm-forces assist; cut it if playtesting dislikes it.
3. Should a mini-boss also appear before wave 5 on first-time runs, or stay
   strictly on wave 3? Proposed: strictly wave 3.
4. Boss practice: include mini-bosses in the same picker? Proposed yes, tagged.

---

# Part B — Previous roadmap (2026-10-23), kept in full

Tasks 1–5 (navigation, utility screens, visual system, restructure) are **done**;
the look pass, Hangar, new Settings, Results, Practice and boss-free HUD work in
the second half of October 2026 also finished that direction (see
`docs/UI-NAVIGATION.md`). Tasks 6 onward are open or partly done. References to
preview GIFs, `assets/task1-layouts/` and similar are historical: those files were
removed on 2026-10-26.

### Direction and boundaries

The next priority is the interface around the game. The current page puts the
playfield, HUD, practice tools, records, help, settings entry points, and utility
buttons into one long document. Players must scan unrelated controls and scroll
to switch tasks. Give each task a clear destination and a predictable way back.

**Confirmed direction:** a game-style Home menu with focused screens for Play,
Practice, Records, Settings, and How to Play. The game should feel like a finished
arcade game when launching, configuring, learning, reviewing results, and leaving
a run. Keep the current gameplay mechanics and pixel-art identity. Home now uses
the animated blue-moon reference (index 03); starting Play has a short ship-warp
sequence. Preview GIFs are for approval before integrating either effect.

Target laptop/desktop browsers with mouse/keyboard and controllers. Support
resized desktop windows, browser zoom, and fullscreen. Mobile gameplay and touch
controls remain outside scope. Preserve ESP32 behavior unless a later task
explicitly includes it. Proposed future gameplay numbers remain playtest targets.

Already implemented; preserve rather than rebuild:

- Tighter web multishot, independent input profiles, sensitivity settings,
  calibration, remapping, and explicit Apply for saved settings.
- Six-second 2× fire pickup with an 80 ms second-event gap, no held repeats,
  pause-safe timing, and cancellation on death/exit/new run.
- CPS, projectile accuracy, longest chain, run summaries, and personal bests.
  Best accuracy requires at least 50 projectiles; practice records are separate.
- Results inside the gameplay panel, before initials saving or the leaderboard;
  Continue consumes its input and requires another fresh press to save initials.
- Laser charge of 1.5 seconds and cooldown of 5 seconds.

Physical controller feel/drift, pickup balance, and simultaneous player attribution
still need acceptance. Local co-op is implemented in task 6; LAN, hosted multiplayer and versus remain
planned. Record namespaces alone do not implement those future modes.

### 1. Plan the screen structure and navigation — design complete

Deliverables: [screen map and transition/state specification](docs/UI-NAVIGATION.md),
[layout overview](assets/task1-layouts/overview.png), and twelve full-size rough
layouts at 1440×900 and 960×540. See the specification for individual images.
Static artifacts were rendered and reviewed; live browser/controller acceptance
belongs to implementation tasks 2–5.

| Screen | Main purpose | Content and next actions |
| --- | --- | --- |
| Home | Choose what to do | Play as the primary action; Practice, Records, Settings, How to Play as a short menu. Compact active-profile and controller status. |
| Launch warp | Enter a new run | Approved first-person cockpit warp, fresh Skip action, then the existing countdown. No active-game time advances. |
| Play | Play a normal run | Existing playfield and essential HUD; pause and small sound/fullscreen utilities. No records, help columns, or settings forms underneath. |
| Practice | Try the controls safely | Existing practice gameplay with a compact progress cue; detailed target/power-up tools in Practice tools from Pause. End practice opens its results. |
| Records | Review saved performance | Top-five leaderboard and personal bests as separate views; profile and normal/practice selectors; sample sizes, empty states, save status, deliberate reset. |
| Settings | Configure a local profile | Focused categories for Controls, Calibration, Audio, and Display; stable Apply/Back actions and visible pending/saved state. |
| How to Play | Learn controls and rules | Keyboard/mouse and controller views, aiming/fire/laser/shield/pickup explanations, and a direct Try in Practice action. |
| Pause | Manage the current run | Resume first, then Settings, How to Play, and Quit to Home; add Practice tools only for practice runs. |
| Results | Review the finished run | Current full summary in the game area; Continue to initials if qualified, otherwise leaderboard. Practice returns Home. |
| Initials / post-run leaderboard | Complete score saving | Preserve save/retry/failure handling; then offer Play Again and Home. |

- [x] Sketch Home, Play/Pause, Settings, Records, Help, and Results at ordinary
      desktop size and a short/resized window. Show actual content and long labels.
- [x] Keep Home a concise game menu, without a dashboard of equal-weight cards,
      a wall of statistics, or a long marketing introduction.
- [x] Use one consistent Back/Home placement and a visible screen title.
      Only the current screen's content and actions should be presented.
- [x] Define the main sequences explicitly:
      Home → Play → Pause → Resume;
      Pause → Settings/Help → Pause;
      final death → Results → Initials (if qualified) → Leaderboard → Play Again/Home;
      Home → Practice → Results → Home;
      Home → Records/Settings/Help → Home.
- [x] Keep normal Play one action from Home. Do not introduce an extra solo setup
      screen now. Expand Play into mode selection when local multiplayer exists.
- [x] Do not display nonfunctional LAN, versus, or modifier choices before their
      implementations are ready. Reserve their place in the structure only.

Design acceptance: the paired sketches expose starting, practice, controls,
records, and Back without the former long-page structure. The specification
covers paused-run preservation, dirty drafts, history/reload, consumed actions,
and Results → Initials → Leaderboard. Functional acceptance remains task 5.

### 2. Build the navigation shell and focused play view

Completed 2026-10-23. Browser shell, utility routes, viewport fitting, and run-preserving navigation are implemented. Gameplay tuning is unchanged.

Validation: 86 web tests and the HD build pass. Safari checks covered Home, Practice/Pause, Help/Back, Settings draft discard, Records, and quit confirmation. Physical controller navigation remains to be accepted on hardware. Home currently uses a static frame of the approved preview; animation and warp integration remain in task 4.

- [x] Introduce explicit browser screen state separate from WASM game state.
      Keep one runtime alive across Pause → Settings/Help → Pause; returning
      must preserve the same score, lives, bullets, effects, and active timers.
- [x] Give Home and each utility destination its own view. Stable destinations
      may use hashes such as `#home`, `#records`, `#settings`, and `#help`.
      Do not serialize a live run into the URL or imply a reload resumes it.
- [x] Define browser Back/Forward and direct links: utility links can open their
      view; a reload defaults to a safe non-playing state. Navigation away from
      an active run pauses first and requires an explicit choice before abandoning it.
- [x] Fit the playfield and essential HUD to the available viewport, preserving
      its 16:9 aspect and 480×270 simulation coordinates. Retain correct mouse
      aim mapping, pixel rendering, fullscreen sizing, and collision geometry.
- [x] Remove the always-visible help columns, records disclosure, debug information,
      and unrelated toolbar actions from the play view. Keep diagnostics and the
      asset gallery accessible through a secondary developer entry, not Home's
      primary menu or ordinary gameplay.
- [x] Present practice actions inside its own view. Keep ordinary runs clear of
      target-reset and power-up test buttons.
- [x] Stop hidden screens receiving input or keyboard focus. Limit simulation,
      input sampling, animation, and audio to the states that need them; do not
      let an idle attract demo start behind Records, Settings, Help, or Results.
- [x] Keep the manual demo within Home's intended presentation (task 3 replaces idle autoplay). Exiting it consumes
      the input and returns to an actionable menu; a fresh action starts a run.
- [x] Avoid page scrolling for Home and ordinary desktop gameplay. Allow deliberate
      content scrolling within longer utility views and results on short windows;
      never hide essential actions with an unconditional overflow lock.

Likely implementation areas: `web/index.html`, `web/app.mjs`, `web/style.css`,
`web/controls.mjs`, and `web/runtime.mjs`. Extract small navigation/view modules
where useful; keep simulation changes out of this UI milestone. Update
`web/build.mjs` to package any new browser modules.

Acceptance: moving between the menu and utility screens feels intentional;
Pause → Settings → Back returns to the paused run with no accidental restart,
progress loss, simulation tick, or stray shot.

### 3. Redesign the utility screens and pause/results flow

Completed 2026-10-23. Existing gameplay and stored records are preserved.

- [x] Add a Home **Watch demo** button. Remove browser idle autoplay. Isolate the
      browser demo engine and shared autopilot under `web/demo/`; use a separate
      WASM runtime with no storage or audio. Stop it on leaving Home. Consume exit
      input so it cannot start a player run. Keep firmware idle behavior unchanged.

- [x] Split Settings into readable categories. Controls contains response/deadzones
      and keyboard/controller bindings; Calibration contains stick plots, drift
      sampling, suggestions, and input preview; Audio and Display contain their
      existing settings. Keep the selected local profile visible throughout.
- [x] Preserve one pending settings draft across categories. Apply saves explicitly;
      Back with unapplied changes offers Apply, Discard, or Stay. Returning to
      a paused run does not automatically resume it. Never silently apply a
      calibration suggestion or reset another profile.
- [x] Give Records a clear distinction between the initials leaderboard and
      per-profile personal bests. Show the rules/profile context, accuracy sample,
      no-record state, unavailable storage, and failed-save feedback. Reset remains
      deliberate and explains which records it affects.
- [x] Organize How to Play into short, scannable sections. Show the relevant input
      device and current bindings instead of presenting duplicate control lists.
      Keep ability timings current. Launch Practice from Home/help; from paused
      help, avoid replacing the active run without an explicit quit choice.
- [x] Replace the sparse Pause presentation with Resume, Settings, Help, and Quit
      to Home. Make quitting a clear run-ending choice; opening settings/help
      keeps the run paused. Handle controller reconnection before Resume.
- [x] Retain Results as the first post-run screen in the play area, with the full
      statistics and one clear Continue action. Keep results, initials entry,
      save failure/retry, and the post-save leaderboard as distinct steps.
- [x] Give the final leaderboard explicit Play Again and Home actions, rather
      than leaving retry behavior discoverable only through footer instructions.
      Preserve release guards, in-flight-shot accounting, and exactly-once saves.
- [x] Move sound/fullscreen controls to stable, secondary positions. Keep a compact
      device status; expand connection guidance only when a device is missing,
      unsupported, or disconnected.

Validation: 88 web tests, the HD production build, and UBSan host gameplay
checks pass. Safari confirmed manual demo entry/exit, category switching with
a pending draft and discard, current keyboard help, Practice results, and the
separate leaderboard/personal-best layout. Physical controller reconnection
acceptance and the complete viewport matrix remain open.

Acceptance: each screen has a primary action and a predictable exit. Settings
and Records can be used without scanning gameplay controls or unrelated content.

### 4. Refine the visual system and menu input

Implemented 2026-10-24 for the current solo browser game. Shared menus/input,
Home/launch presentation, regions/transitions, and the first sentinel are complete.
Physical input/performance acceptance remains in task 5; multiplayer integration
is deferred to tasks 6–8. Optional 4E retains the existing approved sprites.

Validation: 114 web tests and the production HD build pass. Safari checked
Home/launch, keyboard-only categories, Display controls, browser zoom, fullscreen,
and all five transition/boss stress fixtures (synthetic visual scenes). GIF v2
storyboards were reviewed. Physical controller and network checks are not claimed.

- [x] Retain the pixel-art identity, dark arcade setting, and readable HUD accents.
      Review optional ship/effect reskins against the reference plan below; keep
      the existing sprites until a coherent replacement set is approved.
      Build hierarchy with readable typography, spacing, alignment, and focus
      states. Use pixel lettering for game identity where suitable; make longer
      instructions and settings labels comfortably readable.
- [x] Define shared menu items, buttons, screen headings, tabs, field labels,
      status messages, and spacing. Avoid accumulating one-off panel styles.
- [x] Support mouse, keyboard, and controller navigation throughout Home, Settings,
      Records, Help, Pause, and Results. Define directional navigation, confirm,
      Back, repeat delay, and active-device prompts; mouse-only menus are incomplete.
- [x] Keep menu actions separate from gameplay bindings. Give reserved confirm/Back
      controls consistent behavior; explain any conflicts with custom mappings.
      Moving a slider or confirming a menu item must never fire a weapon.
- [x] Require release on screen entry/reconnection so held triggers, Cross, Enter,
      or Space cannot activate the next screen, start a run, or save initials.
- [x] Restore focus to the invoking menu item on Back. Scope Escape/Back to the
      current interaction: cancel rebinding first, then leave the category/screen.
- [x] Add restrained transitions and clear selected/hover/pressed/disabled states.
      Respect reduced motion; transitions must not delay actions or alter timers.
- [x] Handle loading, WASM/art failure, empty records, failed saves, long controller
      names, no controller, and unsupported mapping within the relevant screen.

Acceptance: all destinations and essential actions work without a mouse, focus
is always visible, and the UI remains readable in fullscreen and resized windows.

#### 4A. Reference-led art direction and asset preparation

Status 2026-10-24: gameplay backgrounds are original procedural pixel art; Home
keeps its approved blue-moon poster with a separately drawn overlay. Watermarked
stock previews remain inspiration only. Inventory and conventions are in
[web/assets/ART.md](web/assets/ART.md).

Local reference library: **[inspo/](inspo/README.md)**. All nine chat references
are stored there unchanged, numbered 01–09 below; the folder is Git-ignored.
Consult these files when planning compositions, palettes, animated layers,
sprite adaptations, and the destination-specific transitions in 4C.1. The
index maps each image to its intended use; `inspo/manifest.json` records source
batch/order, dimensions, and checksums. Keep this folder separate from runtime
assets; create approved production files under `web/assets` later.

Uses the original five references plus four additional location images.
Reference numbers 6–9 below follow the order of the second batch. These are
inspiration and proposed uses; final selection, names, and palettes remain
provisional until wide compositions and readability have been reviewed. Do not generate, extract,
license, or integrate artwork as part of this planning pass.

| Reference | Recommended role | Adaptation |
| --- | --- | --- |
| [1](inspo/01-purple-planet-meteors.png): purple/pink planet with meteors | Violet-region palette and alternate scenery inspiration | Put the planet beside the menu with a quiet area behind text. Slow cloud-band movement and sparse stars; reduce brightness/detail for gameplay. |
| [2](inspo/02-aliens-planets-effects-sheet.png): aliens, planets, stars, explosions | Palette/effect inspiration; candidate warm planetary region | Plan transparent effect frames and planet layers from clean source assets. Alien characters can decorate Help/menu art; enemy behavior is a later feature decision. |
| [3](inspo/03-blue-moons-warp.png): blue moons and central warp burst | Confirmed animated Home background; Lunar-region and transition inspiration | Keep the moons fixed. Emit particles from the central blue glow, rotate particles/rays slowly clockwise, and add restrained irregular flicker. A calmer derivative is needed for gameplay. |
| [4](inspo/04-ships-ufo-planets-sheet.png): ships, UFOs, planets, small effects | Candidate ship/asteroid/effect visual refresh | Choose one matching pixel scale and lighting direction. Treat alternate ships as cosmetic unless a separate mechanics task is authorized. |
| [5](inspo/05-black-hole-ring.png): black hole/accretion ring | Later-region scenery; optional alternate Home backdrop | Keep the dark center and dim the outer ring behind play. Animate ring/cloud layers gently; no gravity, screen distortion, or collision changes. |
| [6](inspo/06-planetary-panorama.png): planetary panorama with rocky horizon | Opening region: Celestial frontier | Already landscape; split distant planets, stars, and a thin lower horizon. Dim the horizon and keep it decorative, without implying a new ground boundary. |
| [7](inspo/07-red-planet-pink-terrain.png): red planet above pink terrain | Ember region | Recompose the square preview into a wide scene; slow layered terrain drift with a quiet middle/upper play area. Reduce saturated pink behind bullets and pickups. |
| [8](inspo/08-ruined-city-pale-moon.png): ruined city beneath a pale moon | Ruined-moon region; possible quiet Records backdrop | Widen the portrait composition, keep skyline silhouettes mostly low/at edges, and mute wthe large moon. Remove or redesign the upward light trails that could be confused with shots. |
| [9](inspo/09-purple-gas-giant-wide.png): purple gas giant with horizontal bands | Violet gameplay-region candidate; Home uses reference 03 | The supplied 368×280 image is wider than the first square reference but still needs a 16:9 recomposition. Use restrained cloud-band scroll and sparse horizontal star drift; keep menu text away from the planet. |

- [x] Inventory incoming images by intended role: Home backdrop, gameplay region,
      transition, ship, asteroid, pickup, or effect. Record dimensions, source,
      usable resolution, pixel scale, transparency, and permission/attribution.
      Watermarked previews remain references; obtain authorized clean originals
      or create original art. Do not remove watermarks or ship preview crops.
- [x] Choose a consistent base pixel grid, palette treatment, light direction,
      and level of detail. The supplied references have different styles and
      resolutions; do not paste them together unchanged.
- [x] Compose backgrounds for the existing landscape 16:9 playfield. The square
      planet scene and portrait warp scene need deliberate recomposition or
      a new wide version; avoid stretching or cropping away the key subject.
- [x] Prepare a layered scene where possible: dark base, distant planet/nebula,
      sparse stars, optional slow cloud/ring layer. A flattened picture cannot
      independently animate its planet, stars, clouds, and meteors without
      additional layers or newly authored frames.
- [x] Keep source artwork and a small runtime atlas/manifest distinct. Record
      anchors, frame bounds, loop timing, layer order, and fallback colors.
      Use clean low-resolution layers/sprite frames for controllable motion;
      avoid making the entire background a continuously playing video/GIF.

#### 4B. Animated backgrounds matched to each screen

Status 2026-10-24: implemented in `web/presentation.mjs` and `web/backgrounds.mjs`.
The approved v2 GIF studies exist in `assets/` and their storyboards were reviewed.
Home redraws its pixel overlay at 20 fps; launch uses a fixed first-person cockpit,
forward-only integrated star travel, fresh Skip/Cancel actions, an independent
clock, blur freeze, and reduced motion. Display has motion/brightness preferences.

Current direction overrides earlier Home candidates: use inspiration reference
03, with outward central particles and slowly clockwise rays with local flicker.
Review clips and browser-engine research are indexed in [assets/README.md](assets/README.md).
The GIF studies do not implement the eventual menu, Skip action, or gameplay gate.

Build one Home scene and one gameplay-region prototype before commissioning
or preparing the entire background set.

- [x] Use reference 03 for Home: fixed blue moons around a central source,
      outward-moving particles, slowly clockwise-spinning particle/ray directions,
      and irregular local brightness flicker. Do not rotate the moons or flash
      the entire image. Keep the menu's reading area dark and controls stationary.
      The eight-second GIF prototype uses a 5°/second clockwise ray field.
- [x] Review `assets/home-blue-moons-preview-v2.gif` and
      `assets/start-game-warp-pov-v2.gif` before implementing the final effects.
      These are 960×540 animation studies, not runtime performance evidence. Home
      v2 uses a jitterier 20 fps pixel treatment; warp v2 uses a first-person
      cockpit viewpoint at 25 fps. Original clips remain available for comparison.
- [x] Add the initial Play launch sequence from first-person ship POV: a
      restrained cockpit/window frame surrounds blue-white stars that stretch
      and rush past as the ship accelerates, then settle on arrival. Do not
      show an exterior third-person ship during this sequence. Prototype is about 2.4 seconds of action plus an arrival hold for
      GIF review. It is a separate one-shot sequence from short region transitions.
      Start the normal countdown/game clock only after it completes. A fresh
      Skip action can advance it; consume that input before gameplay starts.
      Reduced motion replaces the tunnel with a brief calm scene change.
- [x] Keep menu labels on a stable dark surface or quiet part of the composition.
      Animation must not move controls, compete with the selected menu item,
      or delay confirmation. Settings, Records, and Help use a dimmer/static
      variant so reading remains comfortable.
- [x] For play, retain a calm center and clear incoming-rock/spawn-warning edges.
      Keep the large planet mostly static, with two or three faint star/cloud
      layers drifting at different speeds. Match the established right-to-left
      motion; decorative particles must not resemble damaging projectiles.
- [x] Reserve bright streaks, large meteors, and warp flashes for Home or a
      controlled transition. Do not use the reference 3 starburst at full
      brightness throughout combat, or pulse the whole screen repeatedly.
- [x] Use a presentation clock independent of gameplay RNG. Freeze gameplay
      scenery and transitions when paused; stop hidden/blurred views doing
      unnecessary animation. Respect reduced motion with static backgrounds
      and simple scene changes while leaving weapon feedback readable.
- [x] Offer background motion/brightness controls in Display if the prototype
      needs them. These affect decoration only, not asteroid motion, timing,
      contrast of essential warnings, or the run's scoring context.

#### 4C. Five-wave regions and transitions

Status 2026-10-24: all five destination gestures are implemented and ready.
Region context is shown in Results. Exact boundaries/timing are tested; the asset
gallery includes busy midpoint fixtures using the real renderer. These are static
synthetic visual checks; sustained physical-device play/performance remains task 5.

Five-wave groups create a sense of travel without changing the wave rules.
Use the new images to expand the proposed itinerary. The sequence below is a
recommended draft, not a final asset assignment. Names describe scenery only;
they do not introduce planetary landing, ground collisions, or new hazards.

| Waves | Proposed region | Background direction |
| --- | --- | --- |
| 1–5 | Celestial frontier | New planetary panorama (reference 6): a wide, clear opening location with distant worlds and a low rocky horizon. |
| 6–10 | Violet orbit | New wide purple gas giant (reference 9), with cloud-band motion; original reference 1 informs the palette. |
| 11–15 | Ember orbit | Red planet and pink terrain (reference 7), dimmed/recomposed for a wide playfield. |
| 16–20 | Ruined moon | Pale moon and abandoned-city silhouettes (reference 8), widened and kept behind the combat area. |
| 21–25 | Lunar passage | Calm blue moons/starfield derived from original reference 3, without the constant central starburst. |
| 26–30 | Outer rift | Original black hole/accretion ring (reference 5), as a late-run visual destination. |
| 31 onward | Continue Outer rift initially | Extend with more five-wave regions later; do not silently reset to opening scenery. |

- [x] Define regions as data: stable ID, display name, first/last wave, layer
      assets, motion settings, and static fallback. Derive the region from
      the authoritative wave, never from elapsed time, score, or random choice.
- [x] Test exact boundaries: waves 5/6, 10/11, 15/16, 20/21, 25/26, 30/31,
      retries, and direct test
      scenarios starting at a later wave. Stay in the same region through
      deaths/respawns. A new run starts in the first region. Practice uses a
      fixed calm background; optional visual previews belong outside scored play.
- [x] At a new region, run its destination-specific background transition
      using the shared timing/visibility rules in 4C.1. A short region-name cue
      uses the existing wave-cue space; it must not delay control or spawning.
      Keep player, bullets, pickups, and warnings above all scenery effects.
- [x] Use a restrained crossfade when a unique transition is not ready. Do not
      add a safe period, pause combat, move the gameplay camera, or change spawn
      timing to accommodate scenery. The unique effect is presentation only.
- [x] Preload the current and next region without blocking the next wave.
      Retain the previous scene or fall back to the existing starfield if an
      image is late/missing; decode failures must not freeze or restart a run.
- [x] Add region context to the wave cue/results if useful without crowding the
      HUD. Region identity is cosmetic; existing scores and personal-best
      categories stay comparable. New art alone does not create a run modifier.
- [x] Keep regional progression as presentation metadata for future multiplayer:
      peers derive the same region from the host wave, while decorative layers
      need no authoritative per-star synchronization.

##### 4C.1. Distinct, smooth, fast location transitions

Each destination gets a recognizable visual gesture, with one consistent
short pacing envelope. Avoid repeating a full-screen warp for every region.
The durations below are initial tuning targets, measured in active presentation
time; each entire transition should settle within about 450–700 ms. The wave
cue can remain briefly afterward without extending the transition.

| Boundary | Proposed transition | Visual behavior | Target |
| --- | --- | --- | --- |
| 5 → 6: Frontier to Violet | Orbital pass | Departing planet/horizon drifts slightly left as the gas giant's curved limb enters; crossfade the distant stars. No full-screen zoom. | 550 ms |
| 10 → 11: Violet to Ember | Atmospheric sweep | Purple cloud bands give way to a dim amber/pink band moving across the background, revealing the red world and low terrain. | 600 ms |
| 15 → 16: Ember to Ruined moon | Skyline emergence | Warm terrain fades to dark foreground silhouettes while the pale moon appears behind them; use a small parallax offset rather than a camera drop. | 650 ms |
| 20 → 21: Ruined moon to Lunar passage | Cloud clearance | A thin, dim background haze clears sideways; the city silhouettes dissolve and cool moonlight/star colors take over. | 500 ms |
| 25 → 26: Lunar passage to Outer rift | Ring convergence | A few distant star traces curve toward the emerging ring while the moon fades; the ring settles at its final position. No gameplay-layer distortion. | 650 ms |

- [x] Use a shared three-part envelope: brief anticipation in the outgoing
      background, overlapping reveal, then quick settle. Keep it continuous
      with no black frame, loading card, full-white flash, or input lock.
- [x] Build motion from a small number of layers, with pixel-aligned positions
      and easing that settles promptly. Do not stretch the entire screenshot
      or use blur/large camera shakes as a substitute for distinct motion.
- [x] Keep the combat area and spawn warnings readable at the transition's
      busiest frame, not just at its endpoints. Atmospheric bands, silhouettes,
      and ring traces remain background artwork even during their reveal.
- [x] Keep the planet/city subject consistent between its reveal and idle loop:
      no visible position snap, mismatched scale, or abrupt animation reset.
- [x] Freeze the transition exactly on pause/blur and resume its remaining time.
      Death/respawn must not replay it; a new run clears it. Starting directly
      in a later-wave test scene loads that region without replaying earlier travel.
- [x] Schedule one transition per region boundary, not per wave or render frame.
      If a later region is selected before an effect finishes, settle on the
      current authoritative destination rather than queueing travel cutscenes.
- [x] Reduced motion uses a short, low-contrast crossfade or immediate background
      replacement, with the same region cue and fully available controls.
      A missing destination layer uses the static/starfield fallback and
      never holds gameplay waiting for the transition.
- [x] Prototype Orbital pass and Ring convergence first to prove the transitions
      can feel distinct under the same fast timing. Use the simpler shared fade
      for the remaining destinations until each has been visually verified.

##### 4C.2. Boss waves

Moved here from the former task 10 so boss encounters share the five-wave
region itinerary. This is the first gameplay-affecting item in task 4: it is
exempt from the "no new gameplay during the UI overhaul" boundary and from the
sprite-only limits in 4E, and it depends on the region data above. Cadence is one sentinel on every fifth wave (5, 10, ...), closing each region.
Damage, telegraphs, latched health scaling, recovery, capped points, and future
assist policy are documented in `web/COMBAT.md`. Current runtime is solo; future
co-op and host replication do not exist yet.

- [x] Start with one boss at a predictable wave interval, using a small set
      of clearly telegraphed attacks and visible weak points/health.
- [x] Keep attacks compatible with direct 2D movement and leave a safe dodge
      route; reduce ordinary asteroid pressure during the encounter.
- [x] Scale health/pressure for active player count without sudden mid-fight
      changes on disconnect. Define boss points, assist credit, and how
      capped-combo bonuses apply before tuning rewards.
- [x] Give a clear entrance cue, readable phases, and a recovery interval
      after defeat. No new art system or large boss roster in the first pass.
- [x] Verify current solo damage/dodging, shields, multishot plus 2× accounting,
      pause, points, recovery, and retry isolation. Keep movement bounds unchanged.
      Co-op attribution/readability, friendly fire, and authoritative replication
      are deferred integration acceptance in tasks 6–8; do not claim them tested.
- [x] Keep the region transition and boss entrance from overlapping confusingly:
      a boss wave at a region boundary shows the region cue first, never delays
      controls or spawning, and keeps boss attacks above all scenery.

#### 4D. Settings, options panel, and How to Play UI overhaul

Status 2026-10-24: shared fonts/tokens/cards/focus states are in `web/theme.css`.
Settings category navigation works with arrows and controller fields; Back exits
editing/rebinding before leaving. Safari checked normal, zoomed, and fullscreen
reading layouts. Long device identifiers wrap in calibration/diagnostics; normal
screens use compact device labels. Task 5 retains the broader physical matrix and
legacy stylesheet cleanup as part of the planned code restructuring.

A second, visual pass over the utility screens built in task 3. Their flows
and behavior are settled; this task improves layout, hierarchy, and polish
using the shared components from the start of task 4 and the art direction
from 4A. It does not change gameplay, stored settings, or record formats.

- [x] **Typography:** every screen currently falls back to the system
      monospace (`SFMono-Regular`, Consolas), which reads as a code editor
      rather than an 8-bit space arcade. Replace it with two fonts, both SIL
      Open Font License and self-hosted:
      - *Primary (identity and display):* **Press Start 2P**. Use it for the
        game title, screen headings, Home and pause menu items, tabs, buttons,
        and the leaderboard rank/initials. It is wide, so keep it to short
        labels at sizes that are multiples of 8 px (8, 16, 24) to stay crisp,
        and avoid it for sentences.
      - *Secondary (reading text):* **VT323**. Use it for settings
        labels, descriptions, How to Play text, status messages, and record
        values. Chosen over Pixelify Sans after a rendered comparison: Pixelify's
        5 reads as S and its E as Ɛ, VT323 stays legible at 19–21 px.
      - Add `@font-face` rules with `font-display: swap`, subset to Latin, and
        list `monospace` as the final fallback so a failed load never blocks
        the UI. Add the font files and licenses to `web/assets/` and to the
        `build.mjs` copy list, and credit them next to the existing third-party
        license. Check that the pixel fonts render crisply at each size on
        standard and high-DPI screens, and keep tabular numbers for scores and
        timers.
      - Define the two families, size scale, line height, and letter spacing as
        shared tokens in `style.css`, then remove the per-element font-family
        and ad hoc sizes in `shell.css` (for example the Home `h1`).
      - Check readability for the longest labels, controller names, and the
        HUD at small viewport sizes, and keep browser zoom and minimum-size
        behavior working.
- [x] **Settings:** redesign the category navigation (Controls, Calibration,
      Audio, Display) as a clear tab or side-list layout with the active
      category and profile always visible. Group related fields, align labels
      and values, and keep Apply, Reset, and Back in one stable footer that
      shows pending-change state.
- [x] **Options panel:** give the pause/options panel (Resume, Settings, Help,
      Quit to Home) and the Records reset/clear controls a consistent card
      treatment, a clear primary action, and distinct destructive styling with
      the existing confirm and cancel steps. Keep it legible over every
      region background and over a paused run.
- [x] **How to Play:** turn the sections into scannable cards with the active
      device's bindings, short ability summaries with current timings, and a
      clear Practice entry. Avoid long text blocks and duplicate control lists.
- [x] Use only the shared menu components: headings, tabs, buttons, field
      labels, status messages, spacing, and focus states. Remove one-off panel
      styles rather than adding new ones.
- [x] Preserve mouse, keyboard, and controller navigation, focus restoration
      on Back, rebinding cancel order, and release guards. Respect reduced
      motion; transitions must not delay actions.
- [x] Verify contrast and readable type at fullscreen, resized windows, and
      browser zoom, with long controller names, no controller, and empty or
      failed-storage states. Keep rendered and physical-input evidence separate.

#### 4E. Optional gameplay sprite refresh — deferred

Decision for this milestone: retain the existing coherent ship/exhaust/rock/
explosion/pickup set, transparent atlas, and sixteen aim directions. No replacement
set is approved or needed to complete task 4. The original sprites have been
reviewed against the new backgrounds in the asset-gallery stress fixtures.

If a replacement is requested later, prepare original or authorized frames at a
consistent pixel scale. Preserve the seven-pixel ship radius, rock radii, movement
bounds, shot origins, bullet speed, rotation, and effect timings. Test multishot,
2× fire, laser, shield, and invulnerability against every background. New UFOs,
weapons, selectable statistics, gravity, and region hazards require separate scope.

Suggested sequence: approve one wide composition → prototype animated Home →
prove one dim gameplay region with current sprites → prove two distinct fast transition motifs →
incorporate the remaining background references and destination transitions → add boss waves (4C.2) →
overhaul Settings, options, and How to Play (4D) → consider the sprite refresh (4E).

### 5. Restructure the code, verify, and finish the UI overhaul

Implementation completed on 2026-10-24. Architecture, ownership, CS101 style
conventions and stable storage contracts: `docs/ARCHITECTURE.md`.
Detailed verification and remaining hands-on checks: `docs/ACCEPTANCE.md`.

- [x] Split browser screens and rendering out of the entry point; cache static
      DOM IDs; retain independent input, storage, audio, calibration and demo.
- [x] Organize CSS into shared primitives, screen rules, shell layout and theme;
      remove obsolete standalone fullscreen and pause-position rules.
- [x] Extract scoring state, difficulty and leaderboard codec/state into actual
      C17 modules with C-compatible headers and thin legacy C++ adapters.
      Remaining entity/run C++ is intentionally a later staged migration.
- [x] Apply the supplied C style to extracted modules; add contributor module
      guide, scoped formatter configurations and formatter command.
- [x] Add original Home/flight chiptunes, independent music toggle beside sound,
      draftable per-profile preference and warp cue. Defaults remain silent.
- [x] Shorten game-over tail by 1.5x (1000 → 665 ms before tick quantization),
      and let audio finish while Results freezes the simulation.
- [x] Confirmed browser record reset clears native/live/persisted tables and both
      personal-best profiles; preserve settings/unrelated keys and rollback errors.
- [x] Pass 117 browser/WASM checks, strict C17 and host/UBSan checks, production
      build and ESP32 compilation. Recheck Safari navigation, play/pause/help,
      Settings/Audio, Practice Results/Home and increased zoom.
- [ ] Complete physical controller/listening acceptance and the exhaustive
      visual/performance matrix in `docs/ACCEPTANCE.md`. These require hands-on
      evidence and are not replaced by builds or synthetic fixtures.

### 6. Local multiplayer and friendly fire

Implemented 2026-10-25 for the browser. Automated and synthetic-controller
browser checks are recorded in `docs/ACCEPTANCE.md`; physical two-person
acceptance remains open.
Builds on the UI implementation (tasks 1–5); outstanding physical acceptance
remains open. First release: two-player co-op on one computer, **two ships on
one shared 480×270 playfield, with no split screen or separate cameras**.
Implementation order, explicit rules and failure-case acceptance are in
[the task 6 implementation scope](docs/LOCAL-COOP-SCOPE.md).

- [x] Support controller + keyboard and controller + controller.
- [x] Add a join screen with explicit device assignment, player colors,
      independent profiles, ready states, and release-before-start guards.
      One device must never control both ships.
- [x] Give each player independent movement, aim, weapons, power-up timers,
      lives, score, and combo. Use three lives each initially; show the team
      total alongside individual scores. A pickup belongs to its collector.
- [x] Retain safe protected respawns while lives remain. An eliminated player
      spectates; the run ends when both players are eliminated. No revives.
- [x] Let either player pause local play. Pause on controller disconnect and
      allow reassignment/reconnection before resuming the same run.
- [x] Add a friendly-fire lobby toggle, off by default and fixed for the run.
      When enabled, damaging weapons can hit the other player; shields and
      respawn protection apply as they do to enemy damage.
- [x] Friendly-fire damage follows normal life/combo-loss rules, awards no
      score or combo progress, and is excluded from enemy-hit accuracy.
      Tag every projectile with its owner; prevent self-hits at spawn.
- [x] Make ships, shots, HUDs, lives, and active effects distinguishable with
      labels/shapes as well as color. Use persistent P1/P2 ship markers and
      matching compact HUD strips outside the arena, with team score/wave
      centrally placed. Keep labels visible during blinking and separate them
      when ships overlap. Show the friendly-fire setting clearly.
- [x] Separate world updates from player updates: advance the world, pickup
      movement, boss attacks and shared clock once per tick. Give each player
      independent respawn/combat/scoring state and bounded projectile capacity.
      One player's death must not freeze or clear the teammate's state.
- [x] Define deterministic collision/pickup ordering, boss targeting and a
      single boss award; version the scene contract and isolate co-op storage.
      See the linked scope for baseline rules and stress cases.
- [x] Verify simultaneous hits, shared pickups, respawns, elimination, friendly
      fire, pause and input ownership with deterministic WASM/input tests; check
      lobby, two-ship rendering and disconnect/reassignment in the browser with
      explicitly synthetic controller fixtures.
- [ ] Accept physical two-person play with controller + keyboard and two
      controllers, plus target-browser sustained performance and viewport matrix.

### 7. Maximum-combo bonuses

Depends on task 6 for independent player and assist attribution.

- [ ] Keep combo progression independent per player. Use the configured
      maximum multiplier (currently 5×), not a separate hard-coded cap.
- [ ] Award an additional combo bonus only for a player already at their
      maximum before the scoring event. Reaching the cap does not itself
      trigger the extra bonus; ordinary below-cap scoring stays unchanged.
- [ ] For co-op, add a team bonus when both players damage the same asteroid
      within a short assist window and it is destroyed while both players
      are at their individual maximum combo. Each asteroid pays out once.
- [ ] Start tuning with a two-second assist window and an extra 25% of each
      eligible player's normal kill/assist award. Define the ordinary assist
      split first; do not duplicate the full kill award for both players.
- [ ] Credit bonus points to the relevant player and include them once in
      the team total. Show a brief bonus cue without obscuring incoming rocks.
- [ ] Expiry or death removes eligibility immediately. Friendly-fire hits
      never qualify; a new split fragment has its own assist record.
- [ ] Verify the cap boundary, one/both players capped, assist expiry,
      simultaneous hits, death, pause, and exactly-once awards.

### 8. LAN multiplayer and network diagnostics

Depends on stable local co-op and scoring (tasks 6–7).
First network release: the same two-player co-op rules on separate machines.

- [ ] Choose and document the browser-compatible transport and host setup.
      Explain any local server/signaling process required to host on LAN.
- [ ] Use one authoritative host/server for collisions, damage, pickups,
      RNG, scores, combos, and power-up expiry. Clients send sequenced inputs;
      do not trust client-submitted score or damage results.
- [ ] Add host/join, address or room-code entry, player assignments, ready
      states, and shared run options including friendly fire.
- [ ] Synchronize the full game state with interpolation and input feedback
      suitable for responsive movement; bound catch-up work and queues.
- [ ] Define network pause explicitly: request a shared pause through the
      authority, rather than freezing a client independently.
- [ ] Add a short reconnect grace period. First release has no host migration;
      if the host leaves, end cleanly with an explanation and return to lobby.
- [ ] Show ping, connection quality, and reconnect status in lobby/pause UI;
      show a small gameplay warning only when quality is degraded. Report
      measured RTT, jitter, and loss/staleness where the transport exposes it.
- [ ] Verify on two machines over LAN, including late/duplicate inputs,
      latency, jitter, packet loss, reconnects, host departure, and consistent
      state/score attribution. Two tabs alone are insufficient acceptance.

### 9. Hosted-server multiplayer

Depends on stable LAN authority and synchronization.

- [ ] Provide a deployable authoritative server and documented host/join
      setup for players outside the LAN, using secure browser connections.
- [ ] Add private rooms/codes, room capacity, ready checks, input validation,
      connection limits, and cleanup for empty or abandoned rooms.
- [ ] Reuse LAN gameplay rules, reconnect handling, and diagnostics. Clearly
      explain room-not-found, full-room, incompatible-version, and server
      failure cases; never silently lose a completed result.
- [ ] Define hosting configuration, server lifecycle, and basic operational
      logs before deployment. Public matchmaking and accounts are outside
      the first release; use local profiles and private rooms initially.
- [ ] Verify two machines on different networks, secure connections,
      latency/loss, reconnects, simultaneous rooms, and server restart.

### 10. Versus mode

- [ ] Begin with a two-player timed score race in the same asteroid field;
      reuse local and network lobbies rather than adding a separate stack.
- [ ] Provide a visible round timer, individual scores, equal starting
      resources, protected respawns, and a results/rematch screen.
- [ ] Use unlimited respawns during the timed round initially. Highest score
      wins; equal scores are a draw. Disable co-op team bonuses.
- [ ] Keep friendly fire configurable and visible before readying; enemy
      player hits award no asteroid score or combo progress in this version.
- [ ] Make pickup competition and kill attribution explicit. Lock settings
      for the round and keep versus records separate from co-op/solo.
- [ ] Verify ties, simultaneous kills, time expiry, late projectiles,
      disconnects, and fairness with both local input combinations and LAN.

### 11. Run modifiers

- [ ] Start with faster asteroids, one-life, and power-ups-only presets.
      Define power-ups-only as starting with an offensive power-up and
      replenishing pickups; ordinary primary fire works only while that
      offensive effect is active, so laser/shield pickups cannot strand play.
- [ ] Show each modifier's exact effect before starting. Lock choices once
      players are ready and apply them identically on every client.
- [ ] Begin with individually selectable presets; support combinations only
      after compatibility checks, particularly versus and boss encounters.
- [ ] Keep preset-specific personal bests separate from standard records;
      display active modifiers in pause and results screens.
- [ ] Verify spawn fairness, pickup availability, life rules, boss behavior,
      and network consistency for every supported preset/mode pairing.

### Cross-stage completion rules

- [ ] Keep solo/practice working throughout. Run appropriate web/host/build checks
      for affected code; build ESP32 whenever shared production sources change.
- [ ] Carry per-player shot ownership, 2× pending events, laser/shield state, CPS,
      accuracy, chains, results, and profile records through local/network modes.
      Friendly hits never count as enemy accuracy or scoring progress.
- [ ] Add new modes to the navigation only when functional. Reuse the Home/Play,
      lobby, pause, results, and Records structure instead of adding another long page.
- [ ] Document controls, rules, record contexts, and hosting requirements with each
      release. Keep automated, rendered, physical-input, and two-machine evidence
      distinct; unperformed acceptance remains unchecked.

### Decisions reserved for later

The navigation direction and gameplay-preservation boundary are settled.
Five-wave regions are the proposed art progression; their artwork/names above
are provisional until the remaining references are reviewed. Exact
visual compositions should be reviewed through the rough layouts in task 1.
Network transport/hosting, ordinary assist splitting, boss cadence, versus round
length, and modifier combinations require their own decisions when those tasks
begin; none should be silently invented during the UI overhaul.
