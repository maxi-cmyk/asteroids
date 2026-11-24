# Next steps

Updated 2026-11-23. This file contains remaining work in priority order. Completed work and the
previous full plan are in [the 2026-11-23 archive](docs/nextSteps-2026-11-23.archive.md);
earlier snapshots remain in `docs/nextSteps-*.archive.md`.

**Priority: finish the game features first, then playtest and tune, then LAN, then website
features and deployment.** No early public-site launch or v0.3 release blocks feature work.
Version numbers and release tags will be chosen at release time rather than determining this order.
Existing local co-op is the base for new multiplayer gameplay; build local versus before adding LAN.
Optional items remain optional and need an explicit build-or-defer decision before the feature phase ends.

The implemented rules live in `web/COMBAT.md`; art in `web/assets/ART.md`; architecture in
`web/ARCHITECTURE.md`; design rationale in `DESIGN-DECISIONS.md`; networking in
`docs/NETWORK-AND-SECURITY.md`; verification evidence in `docs/ACCEPTANCE.md`.

## Priority order

| Order | Stage | Remaining outcome |
| --- | --- | --- |
| 1 | HG1 | Complete controller/input acceptance of the showroom, ship drafts and colour controls; before S2 |
| 2 | S2 | Maximum-combo bonuses and co-op assists |
| 3 | C2 | Endless prestige, new rock types, starting prestige and presentation |
| 4 | C3 | Act 2, new bosses and minis using the new rock types |
| 5 | S6 local | Versus and sabotage on one machine |
| 6 | S7 | Run modifiers using the shared effect system |
| 7 | C4 | Achievements across the completed gameplay features |
| 8 | S8 | Barebones handheld features; decide on optional portability |
| 9 | Maintenance / B1 | Remaining refactors and reliable local/CI checks |
| 10 | R1 | **Still pending:** final feature-complete playtest and tuning, before LAN |
| 11 | S3 → S4 | Network foundation, LAN co-op/versus, diagnostics and two-machine acceptance |
| 12 | W1 → W2/S5 → optional W3 | Website, online rooms, optional accounts/saves/leaderboards |
| 13 | R6 → R8 | Final browser/hardware checks, release tag and production deployment |

Stage IDs are retained for existing references. Within each stage, implement its remaining
checklist in order. Routine automated verification continues throughout; R1 is the deferred
human playtest, not a reason to skip checks while building features.

## HG1. Hangar redesign (before S2)

The showroom reference layout was selected and implemented with six showroom ship drafts in
`web/assets/ships/drafts/`, separate browsing/equipping, a draggable six-stop rail, three
independent loadout slots, a test range, profile paint controls and retained legacy appearances.
Completed implementation is archived; final acceptance remains before S2.

- [ ] Complete desktop acceptance of profile switching, save failures and short-window fit;
  the reference composition and draft-art scale have been visually checked. Recheck
  contrast, readable comparisons, locked/equipped states and save-failure feedback.
- [ ] Exercise dragging, horizontal scrolling, touch swipes, keyboard and controller focus;
  verify profile switching, all three slots and six colour choices. Check reduced motion.
- [ ] Review the individual aiming-state drafts in `web/assets/ships/<id>/states.png` for
  final art approval. The six ship designs are approved; the old shared atlas is removed.

Ship customisation implementation details and tuning are in
[the loadout specification](docs/SHIP-CUSTOMISATION-PLAN.md); completed implementation work is
in [the archive](docs/nextSteps-2026-11-23.archive.md).

---

   ## S2. Maximum-combo bonuses (task 7)

Combo progression is per player; the configured maximum is currently ×5. The bonus rewards
*staying* at the cap, not reaching it.

**S2.1 Decide the numbers (blocks the rest).**
- [ ] Ordinary assist split: who gets what when two players damage the same rock? (The old
  plan required this to be defined before any bonus.) Proposed: killer 100% of the normal
  award, assister 0% in the ordinary case; the team bonus below is the only assist payout.
- [ ] Confirm starting tuning: two-second assist window; extra 25% of each eligible
  player's normal kill award; bonus only when the scorer was already at the cap *before*
  the event; each rock pays out once.
- [ ] Decide whether boss defeat and mini-boss defeat can earn it (proposed: no, they
  already have the flawless bonus).

**S2.2 Engine (`web/native/combat.h`, `coop.h`, `engine/core/scoring.c`).** Keep ESP32 and host
builds compiling. Put the single-player combo rule in the platform-free C17 core
(`engine/core/scoring.c`), not in `web/native/`, so the handheld gets it in S8 for free. Only
the co-op assist logic belongs in `web/native/coop.h`.
- [ ] Solo: add the capped-bonus award keyed to `max_multiplier`, not a literal 5.
- [ ] Co-op: per-rock assist record (player, tick of last hit); a split fragment starts a
  fresh record; expiry and the owner's death clear eligibility immediately; friendly-fire
  hits never qualify.
- [ ] Single award per rock, credited to the right player and counted once in the team
  total.
- [ ] Expose a `bonus` event to the scene (new field in `scene-layout.mjs`, written in
  `scene.h`, read by name; update the scene golden).

**S2.3 Tests.**
- [ ] Cap boundary (reaching vs. holding), one / both players capped, window expiry,
  simultaneous hits, death mid-window, pause mid-window, exactly-once, friendly fire,
  split fragments. Host tests for the C module; `coop.test.mjs` for the integration.
- [ ] Record the stored-format impact (none expected) and run `npm run check`,
  `sh engine/tests/run_host.sh`, and the ESP32 build.

---

## C2. Endless mode with prestige (planned 2026-11-22, was H5)

**Endless opens once Act 1 is finished.** It is today's 30-wave run that never ends, with the
prestige rules below. The new rock types are built here first; Act 2 (C3) reuses them.

**Today:** after wave 30 the run stays in the Outer rift forever. Bosses come back one tier
harder every 30 waves (`bs_tier_for` in `native/boss/lifecycle.h` already works out tier
= (wave − 1) / 30 on boss waves). Rock difficulty stops rising at wave 24, and the chain
multiplier always restarts at ×1 and caps at ×5 (`engine/core/scoring.c`).

**New rule:** clearing wave 30 starts **prestige 1** at wave 1 in the Celestial frontier, with
the region themes and music in order again, and **new rock types and patterns**, so no lap
plays like the one before. Each lap after that is prestige n + 1, with no end. At prestige *n*
the **base multiplier is n + 1** and the **cap is ×(5 + n)** (settled 2026-11-22): the chain
starts at ×(n + 1) and drops back to it, never to ×1. A player who has **cleared** a prestige
level can start a new run there.

**C2.1 Engine: the lap and the multiplier**
- [ ] Keep one absolute wave count inside the engine (wave 37 = prestige 1, wave 7), so boss
  tiers, records and replays need no second counter. Derive `prestige = (wave − 1) / 30` and
  `lap_wave = (wave − 1) % 30 + 1`; regions, boss kinds and mini-bosses use `lap_wave`. Boss
  tiers already follow the prestige level, but nothing caps them today (wave 121 would ask for
  tier V): clamp at IV, or decide what tier V+ means.
- [ ] Scoring (`engine/core/scoring.c`, so the ESP32 can reuse it): `score_set_base(state, base)`;
  `score_reset` returns to the base; the cap is base + 4. Clamp the base at ×99 and the score
  at the 32-bit maximum (saturating, never wrapping). Host tests.
- [ ] Scene: `PRESTIGE` and `LAP_WAVE` fields (named in `scene-layout.mjs`); `WAVE` stays
  absolute. Scene golden updated.

**C2.2 New rock types, one per prestige level.** Each lap adds one new type on top of the
ones before, and shows it from its first waves. Every type follows the fairness rules: a warning
of at least 700 ms before it can hurt, a shape that reads without colour, one hit or a clearly
shown health, nothing lethal off-screen. Proposed order (to tune; each is one engine kind plus a
painter and a sound):

| Prestige | New type | What it does | Counterplay |
| --- | --- | --- | --- |
| 14 | **Comet** | small, fast, straight; a glowing streak warns of its line 0.8 s ahead | step off the line; one hit |
| 15 | **Missile** | launched from the right edge, turns toward the ship at a limited rate, burns out after 4 s | outturn it or shoot it (one hit) |
| 16 | **Cluster rock** | a big rock that bursts into a ring of 6 fast shards when it breaks | break it far away, or dodge the ring |
| 17 | **Iron rock** | takes 3 hits (cracks show each one); the laser breaks it at once | focus fire or spend the laser |
| 18 | **Mine** | drifts slowly, pulses, then bursts into a short ring of shots unless shot first | shoot it early, or keep away from the ring |
| 19 | **Magnet rock** | pulls the ship gently toward it (none under calm forces) | fly against the pull; shoot it first |
| 20 | **Swarm** | 5–8 tiny drones flying in formation (line, V, wave) | sweep them; multishot shines |
| 21 | **Phase rock** | blinks between solid and ghost on a visible rhythm; only solid ones hurt or can be hit | time the shots |
| 9+ | **Remix** | no new type: every type so far, in new mixes and heavier waves | |

- [ ] **Patterns never repeat a lap:** each wave's spawn list comes from `(lap_wave, prestige)`
  and the run seed. Each prestige also adds formations (walls with a gap, V, spirals, crossing
  streams, an escort of comets around an iron rock). The share of new types rises over the
  lap, and the overall speed rises 8 % per prestige up to a cap. Still deterministic, so
  replays hold.
- [ ] **Engine:** rock kinds live in the web layer (`native/`), not `engine/src/asteroid.cpp`, which the
  ESP32 shares (M8 decides later whether any move to the handheld). The scene's rock block
  (stride 8) has no spare slot: put the kind in the `active` value (0 empty, 1 + kind), or
  widen the stride to 10 with a health and a timer slot (scene golden and layout test change).
- [ ] **Scoring per kind** (proposed): comet 2×, missile 3×, iron 4×, mine 2×, swarm drone 1×
  of a small rock, all times the multiplier.
- [ ] **Art and sound:** pixel painters in `src/render/layers/` (generated where it fits),
  one sound per type, the death bursts; the field guide gets a "Rocks" page.
- [ ] **First meeting:** the prestige card shows each new type (C2.4); Help explains them all.

**C2.3 Starting at a prestige level**
- [ ] A level counts as **cleared** when its wave 30 falls in a real run (not practice, not the
  demo). Each profile stores its highest cleared prestige (records, a new part of the R4 save;
  merge keeps the larger).
- [ ] Play → Endless shows **Start at** only once a level is cleared: *Prestige 0* and
  every cleared level (cleared prestige 1 → you may start at prestige 1). It remembers the last
  choice. Local co-op offers the lower of the two profiles' levels.
- [ ] Starting at prestige *n* begins at wave 1 of that lap (absolute wave 30n + 1) with the
  normal lives and no pickups, and the base multiplier ×(n + 1) from the first rock.
  `web_start` gains the start level (recorded in replays).
- [ ] Records: the top-five tables stay one list per mode, with each entry marked by its start
  level ("from P2"); personal bests note it too. Open question: separate boards per start level
  instead?

**C2.4 Presentation**
- [ ] **The prestige card** (settled 2026-11-22), after the Zodiarch on wave 30. Rocks are
  held off while it shows:
  - **0–5 s:** **PRESTIGE 1**, nothing else (the same family as the boss intro card).
  - **Then, briefly (about 2.5 s):** the new rock type, animated as it flies in play, with one
    sentence of **six words or fewer**. Proposed lines:

    | Prestige | Rock | Line |
    | --- | --- | --- |
    | 1 | Comet | Comets streak by on glowing trails. |
    | 2 | Missile | Missiles chase you until shot down. |
    | 3 | Cluster rock | Cluster rocks burst into shards. |
    | 4 | Iron rock | Iron rocks take three hits. |
    | 5 | Mine | Shoot mines before they burst. |
    | 6 | Magnet rock | Magnet rocks pull your ship. |
    | 7 | Swarm | Swarms fly in tight formation. |
    | 8 | Phase rock | Phase rocks hurt only when solid. |
    | 9+ | none | no second panel; the card ends at 5 s |

  - Then the region transition Outer rift → Celestial frontier, which needs a wrap gesture in
    `src/render/regions.mjs` (today `regionForWave` stops at the rift).
  - A run started at a prestige level shows the same card. A start at P3 shows comets,
    missiles and cluster rocks together under one line ("Watch out for these new rocks.").
  - Any fire press skips the explanation, never the 5 s title. With reduced motion the rock is
    shown still. A test checks every line is one sentence of six words or fewer.
  - This replaces the open question about a first-meeting tag: the card is the introduction.
- [ ] HUD: "P1 · WAVE 7" (just "WAVE 7" before prestige 1).
- [ ] `regionForWave`, music and menu look "furthest region reached" read the lap wave.
- [ ] Results and Records: highest wave shown as "P2 · W14"; personal bests "highest prestige"
  and "highest prestige cleared". The stored wave stays absolute, so old saves need no change.
- [ ] Practice (H3): the Waves drill takes a prestige level, and a "Rocks" drill shows each
  type on its own.
- [ ] Help: prestige, the base multiplier, starting levels and the rock types.

**Interactions:** co-op shares the lap and both chains use the same base; S2's maximum-combo
bonus keys on the current cap (5 + n), not ×5; the demo keeps lives forever, so it will reach
prestige and the new rocks (the demo pilot, H4, must learn to read rock kinds and dodge
missiles); the boss bot gets a run with new rock types in its wave tests.

**Tests:** wave 30 → prestige 1 wave 1 (region, boss kind, tier); no two laps produce the same
spawn list; each rock type's warning, health, scoring and burst; magnet off under calm forces;
multiplier base, cap and reset at n = 0, 1, 4, 98, 99; score saturation; start-at-level
unlocking (practice and demo never clear a level), its replay, and the save merge; old saves load
with nothing cleared.

---

## C3. Act 2 (after Endless)

- [ ] 6 levels with the Act 1 layout (5 waves, mini on wave 3, boss on wave 5), in remixed
  versions of the six regions.
- [ ] **Rock types from Endless (C2.2):** one new type taught per level, in prestige order
  (comet, missile, cluster rock, iron rock, mine, magnet rock); swarms and phase rocks stay
  Endless-only until a later act. Each level opens with its six-word line (C2.4).
- [ ] **New bosses and minis** (6 and 6), designed by you once the rock types exist, through
  the usual storyboard → your approval → build steps. Not before.
- [ ] Endless adds the Act 2 bosses to its rotation once they exist.
- [ ] Stars, progress, saves and screens as in Act 1.

---

## S6. Versus mode (task 10)

Build and verify local versus now using the existing local lobby. Reuse its rules and UI for
LAN and online later; those transports are not prerequisites for local versus.

- [ ] **S6.1 Rules in the engine.** Two players in the same asteroid field, timed round with
  a visible timer, equal starting resources, unlimited protected respawns, highest score
  wins, equal scores draw; co-op team bonuses and boss waves disabled.
- [ ] **S6.2 Interaction rules.** Friendly fire configurable and visible before ready;
  shots that hit the other player award nothing in this version; explicit rules for who
  gets the points for a rock both players hit, and for pickup contention.
- [ ] **S6.3 Sabotage pickups.** A second pickup family, versus only. Collecting one fires
  a harmful effect at the **opponent**, never the collector. They are the comeback and
  chaos layer, so they must be readable, brief and counterable. Subtasks:
  - [ ] **Effect list (first release).**

    | Effect | What the victim gets | Length | Counterplay |
    | --- | --- | --- | --- |
    | **Rock rush** (faster asteroids) | The next 6 rocks spawn faster and aimed at the victim's height | until used up | Move off the lane; entrance warning stays at least 700 ms |
    | **Summon mini-boss** | A small mini-boss (Picket, Shardling or Gunnery family) appears on the victim's side and attacks only the victim | 15–25 s or until killed | Kill it or outlast it; it reuses the mini-boss engine |
    | **Jam** (disable weapon) | Primary fire stops; the laser still works | 4 s | Dodge; the laser pickup is the counter |
    | **Slow** | Ship speed ×0.7 | 5 s | A shield absorbs the next sabotage |

    Later candidates, only after the first four test well: **Fog** (HUD and far rocks dim),
    **Swap lanes**, **Decoy pickup**, **Reverse controls** (opt-in only, see accessibility).
  - [ ] **Shared-field problem.** Both players see one field, so "faster asteroids" cannot
    be a global speed change. Implement effects as **targeted**: rocks and summoned bosses
    carry a `target_player`, and only they are boosted or hostile to that player; other
    pilots still collide with them as normal rocks. Define collision, kill credit and
    scoring for targeted objects (proposed: the first to kill a targeted rock scores it;
    a summoned mini-boss scores nothing for either side).
  - [ ] **Fairness rules.** A telegraph on the victim's screen at least 700 ms before the
    effect starts (icon, border flash and a distinct sound), the sender shown
    ("P1 sabotage"); at most one sabotage active per victim; 8 s immunity afterwards;
    a shield pickup also blocks one sabotage; no effect can be lethal by itself; death
    clears all active effects like every other threat.
  - [ ] **Spawning and balance.** Sabotage pickups share the existing "none visible"
    pickup rule and drop at a lower rate than helpful ones; looks unmistakable by shape
    (skull or spike outline, red-orange, white rim) not colour alone; weighted toward
    the trailing player to keep rounds close. Tune rate and weights from play logs.
  - [ ] **Engine.** Effects are data (id, length, apply, expire) in one table. S6 builds it
    first; S7 run modifiers reuse it, so "faster asteroids" is one implementation.
    The server owns them in network play; clients only see the effect in the scene
    (add a per-player effect field to `scene-layout.mjs`, scene golden updated) and an
    event for the cue.
  - [ ] **Interactions to define.** Boss waves are off in versus, so a summoned mini-boss
    is the only boss; friendly fire on or off must not change who a mini-boss targets;
    pause freezes timers; a disconnect clears effects on the leaver and keeps theirs
    on the opponent until they expire.
  - [ ] **Options.** A lobby toggle, **Sabotage: on / off** (default on), plus
    per-effect switches if tuning needs them, shown before ready and locked for the round.
    Versus records note whether sabotage was on, so the two ranking contexts stay apart.
  - [ ] **Accessibility.** Calm-forces style assist: sabotage can be set to *warn only* for
    a player (shows the cue, applies nothing), and any control-reversing effect stays
    out of the default list. Reduced motion respected for the cue.
- [ ] **S6.4 UI.** Mode choice in the Play flow, round-length option, sabotage option,
  countdown, effect icons and timers beside each player's HUD strip, results and rematch
  screen listing sabotage landed and suffered, versus records separate from solo and co-op.
- [ ] **S6.5 Settings lock.** Options fixed once players ready; identical for both local pilots; verify both machines later in S4.
- [ ] **S6.6 Tests.** Ties, simultaneous kills, time expiry with projectiles in flight, late
  hits, disconnects, both local input combinations, locally. Repeat over LAN in S4 and online in W2. Sabotage: each effect applies
  only to the victim, never the collector; telegraph minimum holds; immunity and shield
  block; one active at a time; clears on death and pause; targeted rocks and summoned
  mini-bosses score as defined; simultaneous pickup of two sabotages; effects expire exactly
  once and the scene golden covers the new fields.

---

## S7. Run modifiers (after local versus)

Build local behaviour first. Network consistency is a later acceptance task in S4/W2.

- [ ] **S7.1 Definitions in data.** One table: id, name, exact effect text, engine flag.
  Start with **faster asteroids**, **one life**, **power-ups only**.
- [ ] **S7.2 Engine.** Faster asteroids scales speeds without breaking entrance warnings
  (700 ms minimum). One life ends the run on the first loss. Power-ups only means the
  player starts with an offensive effect and pickups replenish it; ordinary primary
  fire works only while it is active, and shield or laser pickups must never strand
  play (guarantee at least one offensive pickup is always obtainable).
- [ ] **S7.3 UI.** Choice before starting, with the exact effect shown; locked once players
  are ready; active modifiers shown in Pause and Results.
- [ ] **S7.4 Records.** Separate personal bests per preset; standard records unchanged.
- [ ] **S7.5 Compatibility.** One preset at a time at first. Decide per pairing with boss
  waves (does one-life make bosses unfair?), co-op and versus, and verify identical
  application on every network client.
- [ ] **S7.6 Tests.** Spawn fairness, pickup availability, life rules, boss behaviour and
  network consistency for each supported preset and mode pair.

---

## C4. Achievements (planned 2026-11-22, was H6)

**Toast:** when an achievement is earned, a trophy icon with its name appears **top
centre** of the playfield and is gone **0.5 s** after its first pixel (in about 80 ms, hold,
out about 120 ms), so it never covers the field for longer than that. Several at once share one toast
("3 achievements"). With reduced motion it appears and disappears without sliding. A short chime
plays at the effects volume. Earning one never pauses the run. Results then lists what was earned
this run, and Records → **Achievements** shows them all.

**Data and rules:**
- [ ] One table, `src/achievements/list.mjs`: id, name, how to earn it, icon, category,
  hidden or not, and for counters the target (for example 100 bosses).
- [ ] A pure `AchievementWatcher` that reads the scene and the run stats each tick and at the
  end of a run, and returns what was earned. It never touches the engine, so a replay earns
  exactly the same achievements (and W3 can check them on the server later). Facts the scene
  lacks (for example "flawless" on a defeat) become scene fields or events, named in
  `scene-layout.mjs`.
- [ ] Practice and the demo never earn achievements, as with hull unlocks.
- [ ] Storage: `asteroids.web.achievements-v1` (id → date first earned, plus counters), a
  new part of the R4 save; merging keeps the union and the earliest date.

**The list** (accepted 2026-11-22: your basics, marked ★, and all the suggestions). Numbers
are provisional until the final R1 playtest; names are placeholders. Tiered ones (bronze,
silver, gold) are one achievement with steps, each step with its own toast.

| Category | Achievement | How to earn it | Tiers |
| --- | --- | --- | --- |
| Bosses ★ | First of its kind | defeat each of the 6 bosses (one per boss) | 6 |
| Bosses ★ | Small fry | defeat each of the 6 mini-bosses (one per mini) | 6 |
| Bosses ★ | Clean sweep | defeat 3 bosses or minis in a row without taking a hit · all 12 in a row | 3 → 12 |
| Bosses ★ | Against the clock | defeat a boss in under its bot time (COMBAT.md; e.g. Sentinel 27 s, Zodiarch 48 s) | per boss |
| Bosses | Untouched | defeat any boss without taking a hit (the flawless bonus) | |
| Bosses | Tiered up | defeat a tier II, III and IV boss | 3 |
| Bosses | Boss hunter | 25 / 100 / 500 boss and mini defeats in total | 3 |
| Rocks ★ | Rockslide | destroy 8 / 12 / 16 rocks within 3 s | 3 |
| Rocks | Quarryman | 1,000 / 10,000 / 100,000 rocks in total | 3 |
| Rocks | One beam, many rocks | destroy 4 / 6 rocks with one laser | 2 |
| Score ★ | High roller | score 100 k / 1 M / 10 M in one run | 3 |
| Score | Max chain | reach the multiplier cap · hold it for 10 s | 2 |
| Score | Big base | reach a ×5 / ×10 base multiplier (prestige 4 / 9) | 2 |
| Campaign | Chapter and verse | clear each Act 1 level | 6 |
| Campaign | Act 1 | finish Act 1 (opens Endless) | |
| Campaign | Star pilot | 6 / 12 / all 18 Act 1 stars | 3 |
| Progress | Full circuit | clear wave 30 in Endless | |
| Progress | Prestige | reach prestige 1 / 3 / 5 / 10 | 4 |
| Progress | Iron hull | clear a level without losing a life (separate from the net-lives star) | |
| Skill | Sharpshooter | a run with 90 % accuracy and at least 200 shots | |
| Skill | No wasted shots | 50 kills in a row without a miss | |
| Skill | Saved by the shield | a stored shield blocks a hit that would have killed you | |
| Skill | Close shave | finish a wave on your last life with the multiplier at its cap | |
| Skill | Laser only | clear a wave without firing your main gun | |
| Skill | Steady hands | defeat a mini-boss using only precision mode | |
| Signature | one per boss, around its mechanic (examples): Sentinel, hit the eye on the first plate opening; Ringwarden, break every blade before the halo lock; Cinderforge, kill it in its first vent of the last phase; Bastion, never touched by the ramming run; Tidecaller, pop every bubble within 5 s; Zodiarch, defeat today's Ascendant sign first; Ninefold, never shoot a decoy | | 7 |
| Pickups | Fully loaded | multishot and 2× fire active at once | |
| Pickups | Collector | collect every pickup kind in one run | |
| Hangar | Fleet | unlock every hull · defeat a boss with each hull | 2 |
| Co-op | Wingmates | finish a co-op run · both players alive when a boss falls | 2 |
| Rock types | one per prestige rock type (C2.2): destroy 50 comets, 50 missiles, 25 cluster rocks, 25 iron rocks, 25 mines before they burst, 25 magnet rocks, 10 whole swarms, 50 phase rocks | | 8 |
| Prestige start | start a run at a cleared prestige level (C2.3) | | |
| Hidden | a few surprises, e.g. let the demo play for 5 minutes, open How to Play mid-boss, die to the very first rock | | |

Some rules need facts the scene lacks today and become scene events: a hit taken this
fight (have `HITS_TAKEN`), kills by the laser in one beam, "killing blow prevented" by the
shield, the boss mechanic events for the signature ones, and the fight timer (from the
boss state). The watcher's tests list each one.

**UI:**
- [ ] The toast element and its CSS (top centre, above the HUD, `aria-live` polite so screen
  readers hear it without it taking focus). Share one queue with the hull-unlock toast, which
  moves to Results so nothing big covers play.
- [ ] Records → Achievements: a grid of icons. Earned ones show the date. Locked ones are
  dimmed, with how to earn them, or "???" if hidden. Counters show progress ("37 / 100").
  Reachable by keyboard and controller.
- [ ] Icons: a 16 px pixel trophy plus an emblem per category, made by a `tools/` script like
  the other art (no third-party art).

**Tests:** each rule on scripted scenes; a replay earns the same set; the toast is gone by
0.5 s; practice and the demo earn nothing; save import and merge; old saves without the part
load empty.

**Settled 2026-11-22:** the multiplier cap rises to ×(5 + n); laps do not repeat (C2.2).
All suggested achievements are in (2026-11-22). **Open:** the exact numbers, after the
playtest.

---

## S8. ESP32 handheld: barebones single-player release

S8 work happens on a feature branch off `dev`; the handheld-only code is in `firmware/` (B1). The firmware (`engine/` and `firmware/`) is the original game: rocks, waves,
multishot and shield pickups, chain scoring, a persistent top-five table with initials, a
demo, buzzer sound, on a 128×64 monochrome OLED with a joystick and one fire button. It
has **no bosses, no aim, no laser and no hulls**. The web engine already compiles the
shared `engine/src/*.cpp` files (see `web/native/bridge.cpp`) and layers co-op, bosses and
combat on top in `web/native/`, so the two share a base. The goal of this stage is a
polished, small handheld build that is also a good hardware and C++ learning project, not
parity with the browser.

**Hardware limits to design around:** 128×64 one-bit display, one fire button and one
stick that only moves the ship in 2D. There is **no aiming**: shots always go right, so the
player lines up a shot by moving to the target's height. Also: a passive buzzer (one tone at
a time, no music files), about
520 kB RAM and a few MB of flash shared with the radio stack (Wi-Fi stays on for entropy),
I²C refresh time that caps frame rate.

**S8.0 Scope (settled 2026-10-26).** The "barebones" set:
- **In:** everything the firmware already does, the single-player combo rule from S2,
  region pacing as a simple wave counter shown on the HUD, one boss (see S8.3), the
  highscore table with initials, pause, demo.
- **Out:** co-op, versus, any network, hulls and unlocks, settings screens beyond a
  volume/mute toggle, music, tiers, modifiers (one-life could be a boot-time option later).
Scope confirmed: the existing firmware game, the combo rule and the Sentinel-lite boss. Anything you want from the web game that is not here
needs a one-line justification, since each feature costs flash, RAM and frame time.

**S8.1 Baseline and budget.** Tools: PlatformIO, serial monitor.
- [ ] Build the current firmware and record flash and RAM use (`pio run -t size`), frame
  time per loop, I²C refresh time, and worst-case entity counts. Add the numbers to
  `docs/SETUP.md` so every later change is compared against them.
- [ ] Set budgets: for example under 60% of flash, under 50% of free heap at the worst
  moment, 30 fps minimum with a full bullet pool and particles.

**S8.2 Pull shared logic into the platform-free core.** Tools: strict C17 flags, host tests.
- [ ] Move rules that both builds need out of `web/native/` and `engine/src/*.cpp` into
  `engine/core/` (the C17 scoring, difficulty and score-table modules already show the style):
  chain/combo rule from S2, any boss state machine from S8.3, wave and region pacing.
- [ ] Each new core module gets C-compatible headers, the existing `.clang-format`
  (`tools/format-core.sh`), and host tests in `engine/tests/host/`. The web build must keep passing
  its goldens after each move; moves are separate commits from behaviour changes.

**S8.3 One boss, simplified for a right-shooting ship.** The web bosses assume mouse or
stick aim, a laser and a 480×270 field, so none transfers directly. With no aiming, every
hit the player lands comes from matching the boss's height, so the boss must hold still
or move slowly enough to be lined up, and its weak point must be on that firing line.
- [ ] Proposed: a **Sentinel-lite** every fifth wave. A plate-rhythm fight with shots only
  while the plate is open, a lance lane with a 900 ms dashed warning, and a three-needle
  fan; no phases beyond "Alert" below 50% health. About 12–18 hits to kill.
- [ ] Keep the fairness rules that survive the port: harmless entrance, every lethal
  hazard warned, a safe corridor at least three ship widths (ship is 7 px on a 64 px
  screen, so use roughly 24 px), projectile cap, dying never resets the boss.
- [ ] Draw it in 1-bit with a pre-made bitmap in flash (`PROGMEM`-style constants), not
  generated at runtime. Tool: a small script in `web/tools/` that converts a PNG to a C array.
- [ ] Warning cues on a monochrome screen: a dashed line, a blinking line, and a
  buzzer rising tone, since colour is unavailable.
- [ ] Host-test the boss logic through the same C17 core; fight-length target 30–45 s.

**S8.4 Input and feel.**
- [ ] Re-check joystick calibration at boot, deadzone, diagonal speed cap, double-click
  pause and debounce with the final game; adjust constants in `config.h` only.
- [ ] Decide what the single fire button does for pickups: shots only, no laser (the
  web's 1.5 s charge needs a second input). Optional: hold-to-charge laser if you want it.

**S8.5 Display and sound.**
- [ ] HUD fits 128×64: lives, score, chain multiplier and timer underline, wave, boss
  health bar. Check legibility at arm's length; keep the 3-letter initials flow.
- [ ] Buzzer: effects only, plus a short boss sting and the tell tone before a lance. Keep
  notes within the passive buzzer's clear range; make sure sounds never block the loop.

**S8.6 Verification.** Tools: ESP32, PlatformIO, serial monitor, host harness.
- [ ] `sh engine/tests/run_host.sh` (strict C17 + UBSan) and the PlatformIO build are green.
- [ ] Flash and play: a full run past wave 5 and the boss, pause, game over, initials,
  power cycle and confirm the table persists, a corrupted table loads empty, 10-minute
  soak with no heap growth or watchdog reset.
- [ ] Update `README.md` (controls, rules) and `docs/SETUP.md` (wiring, flashing, budget).

**S8.7 Make it portable (optional).** Tools: battery, charger board, enclosure.
- [ ] Power from a LiPo through a charger board; measure runtime. With Wi-Fi left on for
  entropy the draw is higher: evaluate whether the hardware RNG alone is enough once the
  radio is off, and keep the "never use a software PRNG" rule if so.
- [ ] Enclosure, button placement, a power switch, and a photo for the README.

**S8 done when:** the handheld plays a full run including one boss on real hardware,
host and strict-C17 checks pass, the budgets hold, and the README describes the build.

---

## Maintenance and B1 follow-up (before R1)

Architecture review and staged changes: [Modularisation plan](docs/MODULARISATION-PLAN.md).
The current file split improves navigation; narrower runtime dependencies and explicit C++
contexts/translation units still need M1–M5 before the LAN protocol is frozen.

- [ ] M5 art tools and M8 shared C++ clean-up: use the retained plans in
  `docs/nextSteps-2026-11-19.archive.md`. Keep structural moves separate from behaviour changes;
  shared `engine/src/asteroid.cpp` and `engine/src/game.cpp` affect both browser and ESP32.
- [ ] Save the feature work in reviewable commits on `dev`, keeping structural moves and
  behaviour changes separate where still possible. The old pre-move baseline instructions
  are historical; do not reset or undo the current folder layout.
- [ ] Verify `.github/workflows/check.yml` on GitHub: Linux LLVM/`wasm-ld`, web checks,
  engine host tests and conditional PlatformIO build. Workflow authoring is complete;
  a verified hosted run is not recorded. Fix failures found there.

The folder split, `dev` branch, branch/folder docs and formatting clean-up are complete and
archived. Work on `dev`; keep the release workflow in the standing rules below. Branch
protection and deployment wiring are final-release tasks, not gameplay prerequisites.

---

## R1. Final feature playtest and tuning — still open, deferred

**Do this after the gameplay feature phase, immediately before starting S3/S4 LAN work.**
It is not a prerequisite for building the remaining local features. Release tagging waits until R8.
R1 must pass before LAN development and public website publishing; repeat targeted checks
if later networking or website changes affect gameplay.

- [ ] **Final feature-complete playtest** (2–4 people; `docs/PLAYTEST-PROTOCOL.md`; the fight log exports
  JSON). Targets: the Sentinel cleared first try by a new player with 3 lives; the Zodiarch
  takes most players several attempts; fight lengths inside the COMBAT.md table, with people
  taking about 1.5× the bot.
- [ ] **Questions to answer in play:**
  - **Tidecaller:** does the new bubble shield make it clear the bubbles go first? Should the
    bell take damage only while it contracts (now: any time)?
  - **Bastion:** the ramming run was reworked on 2026-11-22 (lanes near your row, some
    sloping, a second pass from phase 2; it banks both ways). Does it feel threatening and
    fair? The bot is touched under once a fight.
    Its outriggers (±98 px) reach past the lane (±70 px) without hurting: widen the lane or
    let the engines hurt.
  - **Cinderforge:** do people land enough shots in a vent (the bot needs two vents; people
    are expected to need three or four)?
  - **Ringwarden:** most bot hits come from the repel ring and the prism beam. Are they
    readable?
  - **Zodiarch:** does its body curling into a loose ring after some attacks read as natural?
  - **Ninefold:** does it need the fox run for variety?
- [ ] **Tune from the logs:** `BOSS_K`, rest lengths, window lengths, per-attack frequency,
  pickup drops at phases 2 and 3. One change per commit, with the evidence in the message.
- [ ] **Re-verify after tuning:** every boss beatable without pickups or laser at 1×
  multiplier, each with a faster mechanic route. Re-run `node tests/boss-baseline.mjs 5 0,1,2`
  (the 2026-11-20 pre-tuning baseline: all 36 fights beaten, no faults) and update `COMBAT.md`.
- [ ] **Full feature acceptance:** play all campaign levels with keyboard and controller;
  verify a co-op level on two physical input devices. Check the final results layout at
  shipped sizes, clear/failure/final-level states, new unlocks, save migration, all weapon
  families, prestige, Act 2, achievements, versus and modifier combinations. Tune the
  level time targets and loadout tradeoffs from real play, including the 3+ lives star.
- [ ] **Design questions:**
  - Event pull: keep or cut (calm forces already removes it).
- [ ] **Only if the playtest asks for them:**
  - **The fox run** for Ninefold, if the fight needs more variety.
  - **A boss backstop barrier**, if someone finds a safe spot behind a boss.

---

## The three ways to play together

All multiplayer (co-op in S4/S5, versus in S6) is offered as three options in one lobby,
using one rules engine and one codebase:

| Option | Where the game runs | Who needs what | Built in |
| --- | --- | --- | --- |
| **Local** | In each browser, one computer, no server | Two input devices on one machine | Done (local co-op); versus in S6 |
| **LAN** | The same Node server, started on one player's computer (`npm run host`) | Both on the same network; the guest opens `http://<host-ip>:<port>/` | S4 |
| **Online** | The same server in a container on a cloud host | Internet; a room code or invite link; `wss://` | S5 |

Rules: the lobby never shows an option that does not work yet (Local first, then LAN,
then Online); the server image for Online is the same program as `npm run host`, so LAN
and Online cannot drift apart. On LAN that server also serves the page (same origin); online
the page comes from Vercel and connects to the room server at `wss://rooms.<domain>/ws`
(decision N3 in `docs/NETWORK-AND-SECURITY.md`).

---

### LAN vetting notes (recheck when S3 starts)

Risks found when the S3 and S4 plan was checked against the code.

- **The scene is bigger than the plan assumed.** S3.3's 1408 floats was measured before P3
  and P4 added boss aux slots and parts. Re-measure `scene-layout.mjs` first; the codec
  target (under 20 kB/s per client) stays.
- **Painter memory.** Several painters remember earlier frames (shatters, exhaust and missile
  trails, tendrils, the blocked-shot sparks). With snapshots at 25 Hz and interpolation they
  will see half as many distinct frames, and a dropped snapshot looks like a part vanishing
  (a Ringwarden blade "shattering" on a hiccup). S3.2 must list every painter that compares
  frames and either move the fact into the event list (blade broken, missile destroyed) or
  make the painter tolerant of gaps.
- **Sound.** The boss sound observer also compares scenes; the same audit applies.
- **`ws` is still needed.** Node has a built-in WebSocket *client* but no server; `ws` stays
  the one runtime dependency (decision 2). Ask before installing it.
- **Browsers' local-network rules.** Chrome now asks permission before a public site talks to
  a private address. The same-origin design (the guest opens `http://<host-ip>:<port>/`
  served by the host itself) avoids it; keep it, and never offer LAN from the public site.
- **Gamepads on the guest.** The Gamepad API only works in a secure context or on
  `localhost` in some browsers; a guest on `http://192.168.x.x` may lose gamepad access.
  Test this first in S4 (Chrome, Safari, Firefox); if it bites, the host serves HTTPS with a
  self-signed certificate (a one-time browser warning) or the guest uses the keyboard.
- **Joining.** Show the join address as a QR code and a short link in the host lobby as well
  as text; typing an IP and port is the most common failure.

---

## S3. Network foundation (after R1; for LAN and hosted play)

The engine is deterministic since v0.3 (own `sinf`/`cosf`, seeded runs, replays), but online
play still uses a **single authoritative server whose snapshots clients only render**: a late
joiner or a reconnect needs no catch-up simulation, and a modified client cannot change a result.
Replays are for desync checks and tests. Clients never advance the simulation themselves.

The renderer, boss painters and boss sound observer already read only the **scene**
(`Float32Array` at `scene-layout.mjs`), so a client can be a thin renderer fed scenes.

**S3.1 Spike: headless engine under Node.** Tools: Node, `wasm-host.mjs`.
- [ ] Run `WasmHost` in a Node process with no DOM (the tests already do this); loop it at
  exactly 20 ms ticks with a drift-corrected timer; confirm CPU cost per room per tick,
  so S5 can size hosting.
- [ ] Confirm which parts of the engine need the browser (audio, storage bridge, records)
  and give each a no-op or server-side implementation.

**S3.2 Scene completeness audit** (starting list of known cases in `docs/NETWORK-AND-SECURITY.md` §7).
- [ ] Verify the scene alone is enough to render everything and to drive every sound cue.
  List what is derived from local state today (hit blips, score pops, pickup sounds,
  boss cues) and move any missing facts into the scene or into an **event list** appended
  to each snapshot.
- [ ] Identify state not in the scene that a late joiner or reconnecting client would need
  (record tables, unlock state, run statistics).

**S3.3 Snapshot format.** Tools: Node, a small codec test.
- [ ] Measure the current scene length and raw bytes per client at 50 ticks/s; the old
  1408-float estimate is obsolete. Design a compact binary snapshot: quantised int16
  positions, only live entities, delta against the last acknowledged snapshot, snapshots
  at 25 Hz with client interpolation. Target under 20 kB/s per client in busy boss fights.
- [ ] Write the codec as a pure module shared by server and client with round-trip and
  fuzz tests against random scenes and the boss scene.

**S3.4 Input protocol.**
- [ ] Sequenced input frames `{seq, tick, stick, aim, buttons}` sent at the tick rate;
  server stores the latest per player, ignores duplicates and stale frames, caps queue
  length, and acknowledges `seq` in every snapshot.
- [ ] Define the server-side input delay buffer (one tick) and what happens when an input
  is late (repeat the last, never stall the room).

**S3.5 Write `docs/NET-PROTOCOL.md`** (decisions N1–N12 and S1–S17 live in `docs/NETWORK-AND-SECURITY.md`; settle the open ones first). Message list with version byte, hello / join / ready
/ start / input / snapshot / event / pause / ping / leave / error, build hash for the
compatibility check, size limits, and the reconnect handshake. Review before building S4.

**S3 done when:** a headless server tick loop runs a full co-op fight from recorded inputs,
the codec round-trips, and the protocol document is agreed.

---

## S4. LAN co-op and versus (after S3)

First network release: the completed co-op and versus rules on two machines, one hosting.

**S4.1 Server package** (`web/server/`, Node, depends on `ws`).
- [ ] Room object: owns one headless engine, two player slots, the latched roster,
  the tick loop, snapshot fan-out and the shared run options (friendly fire).
- [ ] Authority rules: the server owns collisions, damage, pickups, RNG, scores, combos
  and power-up expiry; a client never submits a score or damage result.
- [ ] Security for LAN (see `docs/NETWORK-AND-SECURITY.md` §5–6): explicit opt-in to listen on all
  interfaces with a printed warning, optional passcode, WebSocket `Origin` check, message size and
  rate limits, and a lobby note that LAN traffic is not encrypted.
- [ ] `npm run host` starts the server and serves the built game from the same port so the
  other machine simply opens `http://<host-ip>:<port>/`; print the LAN addresses.
- [ ] Host setup note in `docs/SETUP.md`: firewall prompt on macOS, same-subnet
  requirement, and what to do when AP isolation blocks peers.

**S4.2 Client network layer** (`src/net/`).
- [ ] `NetSession` implementing the same interface as `SoloSession` / `CoopSession`
  (`app/sessions.mjs`), so screens and renderer do not branch on "network".
- [ ] Snapshot buffer with interpolation delay of about two snapshots; input send loop;
  local input feedback for the player's own ship (decide in S4.6 whether prediction is
  needed).
- [ ] Connection state machine: connecting, lobby, playing, paused, reconnecting, closed.

**S4.3 Lobby UI.**
- [ ] Play → Co-op / Versus → **Local** / **LAN** / **Online** (see "The three ways to play
  together"; only built options appear). LAN: **Host game** shows the address and a room
  code, **Join game** accepts either. Online (S5): create or join by room code. Player slots, colours, profile choice, ready states, friendly-fire
  setting visible to both, build-version mismatch message.
- [ ] Reuse the local co-op lobby components and release-before-start guards; navigation
  works with mouse, keyboard and controller. Add nothing to Home that does not work.

**S4.4 Pause.**
- [ ] A pause request goes to the server; the server pauses the room and tells everyone who
  asked; only the requester (or host) resumes. A client never freezes alone.

**S4.5 Disconnect and reconnect.**
- [ ] 10-second grace period: the room pauses, the ship stays, the other player sees
  "waiting for P2"; the returning client resumes with the same slot using a resume token.
- [ ] No host migration. If the host process ends, clients get a clear message and return to
  the lobby. A finished run's result is delivered before the room closes and never lost
  silently.

**S4.6 Diagnostics.**
- [ ] Measure RTT, jitter, snapshot staleness and loss at the client; show them in lobby and
  Pause; show a small gameplay warning only when quality is degraded.
- [ ] Decide on client-side prediction from measurements: if input-to-motion latency on a
  good LAN exceeds about 80 ms, predict the local ship's movement only (never damage).

**S4.7 Records for network play.**
- [ ] Network co-op results use a separate record namespace from local co-op and solo.
  Each player's machine keeps its own personal bests; the host keeps no accounts.

**S4.8 Automated tests.**
- [ ] Unit: codec, input sequencing, room state machine, reconnect token. Integration: a
  Node script spawns the server and two scripted clients that play a boss fight from
  recorded inputs and assert identical final score on both screens and on the server.
- [ ] Optional Playwright test that opens two contexts through host → join → ready → play.

**S4.9 Real-network acceptance.** Tools: second computer, net-conditioner proxy, gamepads.
- [ ] Two machines over LAN: co-op and versus, with a gamepad on each; also verify the
  completed loadouts, campaign progression, modifiers, achievements and scoring rules.
- [ ] Inject latency (50, 100, 200 ms), jitter, 2–5% loss, duplicate and late inputs, and a
  reconnect; scores and attribution agree on both machines.
- [ ] Host departure and late join handled cleanly.
- [ ] Document results in `docs/ACCEPTANCE.md`; two tabs on one machine are not acceptance.

---

## Website features — after LAN acceptance

Build W1, then W2/S5, then W3 only if selected. Prepare and test privately; public production
deployment is the final R8 step after R6. A static-only early launch is no longer a priority.
Use the existing planned stack (Vercel page/API, Railway rooms, Redis, optional Postgres/Clerk),
rechecking platform behaviour and pricing when work starts. Online co-op and versus reuse the
completed LAN server and local rules. Deployment must not become a prerequisite for gameplay work.

---

### W1. Static site (the completed local game)

Include the completed campaign, Endless, loadouts, local co-op/versus, modifiers and achievements.

- [ ] **Host: Vercel** (chosen 2026-11-19). A `vercel.json` at the repo root with
  `buildCommand` (`cd web && npm ci && npm run build`), `outputDirectory` `web/dist/site`, and the
  headers below. Vercel's build machines run Linux, so `web/build.mjs` must find `clang` and
  `wasm-ld` there (it looks for Homebrew paths first): either install LLVM in the build
  command, or (simpler) build `dist/` in GitHub Actions and deploy it with the Vercel CLI
  (`vercel deploy --prebuilt`, from `dist/site/`). Check which works before W1.
- [ ] **Previews:** production deploys from `main` (every merge there is a tagged release);
  `dev` is staging on a fixed preview alias; feature-branch previews are protected or off; a
  `firmware/`-only commit skips the build (B1 has the table).
- [ ] Recheck hosting plan terms, limits and costs before provisioning.
- [ ] **Headers** (in `vercel.json`): `Content-Type: application/wasm` for `.wasm`; a strict
  `Content-Security-Policy` (`default-src 'self'`; no inline scripts, which also keeps the
  page dependency-free); `X-Content-Type-Options`, `Referrer-Policy`. Long cache lifetimes on
  hashed asset names, short on `index.html`, so an update never mixes old and new files.
- [ ] **Asset names with a content hash** in the build, so a cached old `game.wasm` can never
  pair with a new page.
- [ ] **Offline and install (optional):** a service worker and manifest make it installable
  and playable offline. Cheap once hashed names exist.
- [ ] **Privacy note** in Help: nothing leaves the browser in W1.
- [ ] **Error reports (optional):** none by default. If wanted, a self-hosted endpoint on the W2
  server that receives stack traces only, never records or settings.
- [ ] Acceptance: Chrome, Safari, Firefox, a mid laptop, the stress budget; records survive a
  refresh and a new deploy.

---

### W2. Online rooms (was S5; the full checklist follows)

Stack chosen 2026-11-19: **Vercel** for the page and API, **Railway** for the room server, **Redis**
and (with W3) **Postgres**, all three in one Railway project. The S5 plan below stands with
these notes:
- **Railway has no sticky sessions** (its docs: nearest region, then a random replica). Two
  players in one room must reach the same process, so the room service runs **one replica**.
  To grow, add room *services* (`rooms-1`, `rooms-2`, or one per region), each with its own
  domain, and keep a room directory in Redis (`room:<code>` → that service's URL) so a joiner
  is sent to the right one. Never add replicas to a room service.
- **Redis does the shared bookkeeping, not the game:** the room directory, rate-limit counters
  (shared by every room server and every Vercel function, which cannot count on their own),
  reconnect tokens with the 10 s grace as their TTL, and later a leaderboard cache. Room state
  stays in the room server's memory (50 Hz is far too fast for Redis round trips) and saves and
  runs go to Postgres (Redis can lose recent writes on a restart). Details:
  `docs/NETWORK-AND-SECURITY.md` §1.
- **Measure first.** S3.1's per-room tick cost decides the room service's CPU and `MAX_ROOMS`.
  Railway bills CPU and memory by use, so a busy room server costs more than the $5 minimum.
- **Private networking:** the room server reaches Redis and Postgres over Railway's private
  network. Vercel functions are outside it, so they connect through Railway's public TCP proxy
  with TLS and a password; keep those credentials in Vercel environment variables only.
- **LAN needs no Redis:** `npm run host` keeps its directory and counters in memory. The server
  takes a `REDIS_URL` and falls back to in-memory when it is missing, so one program serves both.
- **Not on Vercel.** Vercel Functions now accept WebSockets, but a function cannot hold a room:
  two players' sockets can land on different instances, nothing ticks between messages, and a
  50 Hz loop is the most expensive thing to run under Vercel's active-CPU billing. Rooms stay a
  long-lived Node process on Railway (the reasoning is in
  `docs/NETWORK-AND-SECURITY.md` §1).
- **Where the page comes from.** The page is on Vercel and the room server lives at its own
  address (`wss://rooms.<domain>/ws`). That is the "Server URL" case in
  S5.1, so it becomes the default rather than the option: the server's `ALLOWED_ORIGINS` holds
  the site's origin, and the page's CSP `connect-src` allows the server.
- **Room codes, no accounts** (S1, S2): W2 works without W3. A `ROOM_CREATE_KEY` is not usable
  on a public site (anyone can read it from the page); use per-IP limits and `MAX_ROOMS`, or
  require a signed-in account to *create* rooms once W3 exists.

---

## S5. Online rooms in detail (W2, task 9)

Same rules and protocol as LAN, on the public internet with private rooms. The Online
option runs the same server as `npm run host`, packaged as a container.

**Where to host.** The game server is a long-running process holding rooms in memory and
ticking 50 times a second, so it needs a host that keeps a process and WebSocket
connections alive. Check current prices, regions and free-tier limits before choosing; they
change often.

**Planned host:** Railway, with Redis and optional W3 Postgres; Vercel serves the page/API.
Revalidate capabilities, regions and pricing before provisioning; comparisons are in the archive.

Recommended path: develop with `cloudflared` or `ngrok` tunnelling to your laptop, then
deploy the container to Railway as one service with one replica, plus a Redis service. Add a
second room service (another region, or more capacity) only when needed, through the Redis
room directory.

- [ ] **S5.1 Container and build.** Subtasks:
  - [ ] `Dockerfile`, multi-stage. Stage 1 (Debian or Ubuntu base) installs `clang`, `lld`
    and Node, then runs `npm ci` and `npm run build` to produce `dist/` including
    `game.wasm`. Check that `web/build.mjs` finds the compiler off macOS (it looks for
    Homebrew paths, then `clang++` / `wasm-ld` on `PATH`) and that wasm32 compilation works
    with the distro's LLVM version. Stage 2 (`node:*-slim`) copies only `web/server/`,
    `dist/` and production dependencies, runs as a non-root user, exposes `PORT`, and has a
    `HEALTHCHECK` against the health endpoint.
  - [ ] `.dockerignore`: `node_modules`, `.pio`, `inspo`, `docs`, `tests`, screenshots and
    reference sheets, so the image stays small and secrets or local notes never ship.
  - [ ] Environment variables: `PORT`, `MAX_ROOMS`, `MAX_ROOMS_PER_IP`, `ALLOWED_ORIGINS`,
    `LOG_LEVEL`, `REGION`, `PUBLIC_URL` (this service's own `wss://` address, written to the
    room directory), `REDIS_URL` (optional: in-memory without it, as on LAN), `DATABASE_URL` (W3), and a build id exposed to the version handshake. Defaults make
    `docker run -p 4173:4173 asteroids` work for **LAN** too.
  - [ ] Origins: online, the page on Vercel connects to `wss://rooms.<domain>/ws` (built into
    the release page; `ALLOWED_ORIGINS` on the server holds the site's origins). On LAN the
    server serves the page itself and the client uses `ws://<same host>/ws`. An optional
    **Server URL** field in Online settings lets someone point the page at a self-hosted
    server (`wss://` only).
  - [ ] Config kept in `deploy/`: `railway.json` (build from the Dockerfile, one replica, the
    health check path, restart policy) and the Railway project's service list (rooms, Redis,
    Postgres) written down as dashboard steps; `vercel.json` for the page.
  - [ ] CI (GitHub Actions): on a tag, run `npm run check` and host tests, build the image,
    push to GitHub Container Registry, then trigger the chosen host's deploy.
  - [ ] Keepalive: send a WebSocket ping about every 20 s so platform proxies with idle
    timeouts do not drop quiet connections; handle the platform's graceful redeploy signal.
- [ ] **S5.2 Rooms.** Private room codes, capacity limits per room and per server, ready
  checks, idle and abandoned room cleanup, per-connection message size and rate limits,
  input validation (reject out-of-range stick values, malformed frames, wrong version).
- [ ] **S5.3 Errors users can read.** Room not found, room full, incompatible version, server
  busy, connection lost. A completed result is delivered or stored for retrieval, never
  dropped silently.
- [ ] **S5.4 Operations.** Structured logs (room created, joined, left, ended, errors),
  a graceful shutdown that tells clients, restart behaviour, and a one-page runbook.
  Public matchmaking and accounts are out of scope; local profiles and private rooms only.
- [ ] **S5.5 Capacity.** Use the S3.1 per-room CPU cost to set the room cap; run a load test
  with scripted bot clients (reuse the boss bot) to find the point where tick time slips,
  then size the instance (CPU matters more than memory).
- [ ] **S5.6 Security pass.** Work through the checklist and tests in
  `docs/NETWORK-AND-SECURITY.md` §5 and §8: origin check, message validation and rate limits, room
  code entropy and join limits, per-IP and global caps, usage limits (Railway and Vercel),
  security headers and CSP, log retention, dependency and container audit, no secrets in the image.
- [ ] **S5.7 Acceptance.** Two machines on different networks, TLS in place, high latency
  and loss, reconnect, several simultaneous rooms, server restart mid-run. Repeat once
  with the page on a static host pointing at the server, and once with the same image run
  locally for LAN.

---

### W3. Accounts, cloud saves and leaderboards (optional; decide before building)

**First decide what accounts are for.** The current design deliberately has none (decision N6
in `docs/NETWORK-AND-SECURITY.md`: nothing to leak or breach). Accounts are worth it for:
1. **Progress on every device** (cloud saves of the save file, `src/state/save.mjs`).
2. **Global leaderboards** that mean something.
3. **Friends and invites** instead of room codes (later).

Guests must keep the whole game: an account adds sync and leaderboards and is never required
to play. If none of the three matters yet, skip W3; W1 and W2 work without it.

**Planned stack:** Clerk with Postgres in the Railway project. Reconfirm provider capabilities,
pricing, production-domain requirements and regional legal requirements before implementation.
Historical provider comparisons and prices are in the archive.

**Design (with Clerk + Railway Postgres):**
- [ ] **Only servers touch the database.** The browser signs in with Clerk and sends its
  session token to the **API** (Vercel Functions under `/api`, beside the page: saves,
  boards, replay checks) and, for online play, to the room server on the WebSocket handshake.
  Both verify it and read or write Postgres. The room server's database role may only insert
  finished runs. No database keys in the page.
- [ ] **Tables:** `players` (Clerk user id, initials, created), `saves` (player, save JSON,
  format version, updated), `runs` (player, mode, rules key, score, seed, replay blob,
  verified, created), leaderboard views over `runs`. No email or name stored by the game:
  Clerk holds them.
- [ ] **Cloud save sync:** on sign-in, merge the local save and the cloud save with the save merge
  rule (bests take the larger, unlocks the union, settings the newer) and write the result to
  both. Never overwrite either side blindly.
- [ ] **Leaderboards only from runs the server saw or re-ran.** A score typed into the page
  is worthless, so a board entry must be either an online run (W2, the server simulated it) or
  a solo run whose replay the server re-simulates to the same score. Replays are capped
  in size and length; re-simulation runs in an API function (WASM under Node), so it never
  touches the room server, with a per-player rate limit so it cannot run up the bill.
  Separate boards per rules key (mode, friendly fire, modifiers), as records are today.
- [ ] **Developer role:** once accounts exist, developer tools on the live site (dev pages,
  replay viewer, the fight log) are served only to accounts with a `developer` role (Clerk
  public metadata, checked on the server for every dev request, never by hiding a button
  alone). Until then they exist only on the local dev server.
- [ ] **Names on public boards:** keep the three-letter initials (no free text, nothing to
  moderate; decision S6). If free names are ever wanted, they need a filter and a report
  button.
- [ ] **Account deletion:** a button in Settings, plus Clerk's user-deleted webhook removing the
  player's rows. Export of their data (their save plus their runs) on request.
- [ ] **Legal pages:** privacy policy (what is stored, where, for how long, which vendors), terms,
  and a minimum age (children's data rules such as COPPA in the US, GDPR in the EU and the
  PDPA in Singapore make under-13 sign-ups the riskiest case; say "13 or older to create an
  account" and keep guest play open to everyone). Clerk's cookies are essential, so no cookie
  banner is needed if nothing else sets cookies; confirm for the regions you launch in.

**Security changes W3 brings** (update `docs/NETWORK-AND-SECURITY.md` when building):
- [ ] Decision N6 changes from "no accounts" to "optional accounts held by Clerk".
- [ ] Account takeover is now in scope (Clerk handles passwords, codes and sessions; turn on
  bot protection and email verification).
- [ ] New secrets: the Clerk secret key and the database URL, as platform secrets only.
- [ ] Database backups (check what Railway's Postgres backups cover on your plan; export
  weekly to storage you own once there are real players).
- [ ] Rate limits on `/api` and on replay submission; replay size and length caps.

---

## R6. Final release checks (after LAN and website implementation)

Music rights and code licence checks are complete and archived. Verify licences again only
if new assets or dependencies were added.

- [ ] Stress on a mid-range laptop; the recorded hardware coverage is an M4 MacBook Pro.
  Run `cd web && npm run stress`, then open
  `stress.html?auto=1&boss=5&phase=2&seconds=60` with the window in front. Expect no frame
  over 25 ms after the first; record a valid run in `docs/ACCEPTANCE.md`.
- [ ] Firefox replay: open `replay.html?check=1`; compare its hash with Safari, Chromium
  and Node, and record the result.
- [ ] Run final Chrome/Safari/Firefox checks against the staged build; verify records survive
  refresh and a new deploy, input works on supported devices, and offline behaviour works
  if the optional install feature was selected.
- [ ] Re-run feature, LAN and online acceptance affected by changes made after R1. Record
  actual evidence; R1 itself stays incomplete until its human playtest has happened.

## R8. Release and deploy — last

- [ ] Protect `main`: pull requests and passing checks required, no force-push or deletion.
  Keep `main` the default branch. Protect `dev` from force-push and deletion; direct pushes
  remain allowed. Confirm CI is green on both branches.
- [ ] Wire staging and production only in W1/W2: `main` is production, `dev` has a fixed
  protected staging alias, feature previews are protected or off. Separate staging and
  production Redis/Postgres. Skip site builds for firmware-only changes; room-service
  watch paths cover `web/server/**`, `engine/**` and the native code used by the host.
- [ ] Run `cd web && npm run check`, `sh engine/tests/run_host.sh`, and `pio run` on the
  release candidate. Update README, COMBAT, Help, SETUP, ACCEPTANCE and CHANGELOG.
- [ ] Confirm R1, R6, S4 real-network acceptance and the selected website acceptance are
  complete. Choose the release version, date the CHANGELOG and remove obsolete unreleased notes.
- [ ] Open `dev` → `main`, review the staged result, merge with a merge commit, tag the merge
  on `main` and push the tag. Deploy the tested site and selected room services, then smoke-test
  the production build and record rollback instructions.

---

## Standing rules (every stage)

- Solo and practice keep working at every commit.
- Branches (B1): work on `dev`; `main` only by a release pull request from `dev` or a hotfix;
  every merge to `main` is tagged.
- Before merging: `cd web && npm run check`, `sh engine/tests/run_host.sh` from the repo root,
  and a PlatformIO build whenever shared C/C++ changes (the web build compiles `engine/src/*.cpp`
  directly, so a firmware edit can move web goldens and the reverse). A new scene field means the
  scene golden and layout test change in the same commit.
- Per-player shot ownership, 2× pending events, laser and shield state, CPS, accuracy,
  chains, results and profile records carry through every mode. Friendly hits never count
  as enemy accuracy or score.
- New modes appear in navigation only when they work. Reuse Home → Play, lobby, pause,
  results and Records instead of adding pages.
- Update COMBAT, README, SETUP, Help and `CHANGELOG.md` with each release.
- Keep evidence types separate in `docs/ACCEPTANCE.md`: automated, rendered, physical
  input, two-machine. Anything not performed stays unchecked.

---

## Open decisions

Settled decisions, including music rights, the code licence and the starter-kit availability,
are in the archive. Resolve gameplay decisions during the feature phase; network and hosting
decisions wait for their stages.

| # | Question | Blocks | Proposed |
| --- | --- | --- | --- |
| Loadout | Six ship handling models, weapon identities and old cosmetic migration | SC1 | Review the detailed customisation proposal |
| 26 | A domain name | W1 (and Clerk production) | Buy one before W1 |
| 23 | Do we want accounts at all, and for what (cloud saves, global boards, friends)? | W3 | Optional accounts, guests keep the full game; build after W2 |
| 24 | Auth and database provider | W3 | Clerk, with Postgres in the Railway project; only servers touch the database |
| 1 | Ordinary assist split in co-op | S2 | The killer gets the award; the team bonus is the only assist payout |
| 2 | Allow `ws` as the one runtime dependency, and put the server in `web/server/` | S4 | Yes |
| 3 | Client-side prediction for the local ship | S4.6 | Decide after measuring LAN latency |
| 6 | Versus round length and rematch rules | S6 | 3 minutes, best of one |
| 7 | Modifier combinations | S7.5 | One at a time first |
| 11 | Portable power and enclosure | S8.7 | Optional; do after the firmware is accepted |
| 12 | Sabotage: who scores targeted rocks and summoned mini-bosses | S6.3 | The first to kill a rock scores it; a mini-boss scores nothing |
| 13 | Sabotage in co-op or solo, or versus only | S6.3 | Versus only |
| 14 | Keep or cut "Reverse controls" | S6.3 | Cut from the default list; revisit with accessibility feedback |

---

## Tools needed

**Already installed and used:** Node 26, Homebrew `llvm` + `lld`, Xcode command-line tools,
PlatformIO, Prettier, ESLint, `postcss`, Python 3 with Pillow, NumPy and fontTools, the
built-in browser pane, Safari, Chrome, `web/tests/boss-bot.mjs` and `web/tests/boss-baseline.mjs`.

**To acquire (ask before installing any package):**

| Tool | Needed by | Notes |
| --- | --- | --- |
| 2–4 playtesters, a screen recorder, a notes sheet | R1 | Real-player tuning |
| A mid-range laptop | R6 | Stress budget |
| Firefox | R6, W1 | Replay check and browser acceptance |
| A domain name | W1, W3 | Clerk production needs one |
| Vercel account (and the Vercel CLI if deploying a prebuilt `dist/site/` from CI) | W1 | Recheck plan terms and limits before provisioning |
| Two physical gamepads, ideally an identical pair plus a different brand | S4, S6 | Same model twice is an acceptance case |
| A second computer on the same network, and a phone hotspot for a different network | S4, W2 | Two browser tabs are not acceptance |
| `ws` npm package | S4 | The one new runtime dependency |
| Playwright (dev dependency, optional) | S4.8 | Two-context lobby tests |
| A lossy/latency proxy script (`web/dev/net-conditioner.mjs`) | S4.9 | Written in Node |
| `cloudflared` or `ngrok` | W2 testing | A quick `wss` tunnel before real hosting |
| Docker (Desktop or Colima), GitHub Container Registry, GitHub Actions | W2 | Build and test the image locally first |
| Railway account and CLI; a Redis service in the project | W2 | Set a usage limit before the first deploy |
| A Redis client in the room server (e.g. `ioredis` or `redis`) | W2 | A second runtime dependency after `ws`; ask before installing |
| Clerk account; Postgres in the Railway project; `@clerk/backend` and a Postgres client in the API and room server | W3 | Only if W3 goes ahead |
| ESP32 DevKit, SSD1306 OLED, joystick, button, passive buzzer; PlatformIO monitor | S8 | Wiring is in `firmware/HARDWARE.md` |
| Battery, charger board and an enclosure | S8.7 | Optional |
