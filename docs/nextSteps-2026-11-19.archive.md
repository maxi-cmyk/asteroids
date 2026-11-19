# Next steps

Rewritten 2026-11-18, with every finished task removed. The full previous plan (P0 to P2 as
built, with their notes and deviations) is in `docs/nextSteps-2026-11-18.archive.md`, and the
one before that in `docs/nextSteps-2026-10-26.archive.md`. The rules as built live in
`web/COMBAT.md` (engine internals in `web/combat/`), art in `web/assets/ART.md`, code layout in
`web/ARCHITECTURE.md`, design reasons in `DESIGN-DECISIONS.md`, and network and security in
`docs/NETWORK-AND-SECURITY.md`.

**Focus now: P3 and P2.1 are built (the Zodiarch and Ninefold move like living things); next P4, the other bosses' upgrades, starting with the Sentinel.** After that, the order is the
same as before: the open boss polish (P2), then close-out, combo, network, versus,
modifiers, and last the handheld.

**Contents:** Roadmap · M Modularise · P3 Zodiarch, a living dragon · P4 Other boss upgrades (brainstorm) · P2 Open boss polish ·
S0 Boss close-out · S2 Combo bonuses · The three ways to play together · S3 Net foundation ·
S4 LAN · S5 Hosted · S6 Versus · S7 Modifiers · S8 ESP32 handheld · Standing rules ·
Open decisions · Tools

---

## Roadmap

| Stage | Goal | Depends on | Size |
| --- | --- | --- | --- |
| M | Modularise: split oversized files by concern (M1 done with P3) | none; one split per commit | M |
| **P3** | **Built 2026-11-18** (boss-bar icon, whiskers, hit-circle overlay open). Zodiarch as a living dragon: purposeful serpent movement, summons you can follow, coil-spit, a lunge, a bigger black hole, the pearl and readable weak points; revised: the pearl surfaces where each attack comes from, two signs at most** | none (do first) | XL |
| P4 | **Next, in boss order (Sentinel first).** Upgrades for the five region bosses (and a touch for the minis), using the Zodiarch toolkit: bodies that move with intent, attacks you can read, weak points that follow the attack | P3; pick and storyboard first | L to XL |
| P2 | Open boss polish: **P2.1 built 2026-11-19** (Ninefold walks, runs, contorts, splits); next P2.2, the Zodiarch creatures' idle, tell and recoil motion | P3 for the Zodiarch part | L |
| S0 | Boss close-out: playtest sessions, tuning, design questions | P3, P2 | M |
| S2 | Maximum-combo bonuses (task 7) | co-op, scoring | M |
| S3 | Network foundation: headless engine, snapshot format, protocol | S2 recommended | L |
| S4 | LAN co-op (task 8) | S3 | XL |
| S5 | Hosted rooms (task 9) | S4 | L |
| S6 | Versus (task 10) | S4 (S5 for online) | M |
| S7 | Run modifiers (task 11) | S2; S4/S5 for networked consistency | M |
| S8 | Barebones single-player ESP32 build | S0 to S2 at least | L |

S3 to S6 never touch firmware, so S8 can start once S2 is done. S7.1 to S7.4 need no
network and can slot in after S2.

---

## M. Modularise: files you can read and vet in one sitting (2026-11-18)

The project has grown files that do too much: the biggest mix several bosses, data tables and
logic, or every test of a whole system. Measured (lines / top-level functions):

| File | Lines | Functions | What it mixes |
| --- | --- | --- | --- |
| `web/native/boss/fights/warden.h` | 1049 | 58 | two bosses (Zodiarch and Ninefold); the Zodiarch's data, swim, twelve creatures (one 250-line switch), its own attacks and its scheduler |
| `web/tests/boss.test.mjs` | 1024 | 59 | every boss's tests plus the shared fairness checks |
| `web/dev/zodiarch-storyboard.mjs` | 1560 | 40 | drawing kit, twelve signs, the dragon's attacks, the creature states, the page |
| `web/dev/zodiarch-living.mjs` | 1343 | 51 | steering kit, dragon drawing, nine tiles, the page |
| `web/tools/zodiac_myth.py` | 945 | 29 | twelve figure drawings, emitter points, sheet export |
| `web/tools/boss_art.py` | 494 | 40 | the drawing library and several bosses' sprites |
| `web/src/boss/guide.mjs` | 676 | 0 | one data table for every boss |
| `web/src/boss/zodiac.mjs` | 431 | 12 | the ring, the creatures (with hurt and break) and the dragon's body |
| `web/src/boss/body-painters.mjs` | 331 | 14 | every boss's body painter in one file |
| `src/asteroid.cpp`, `src/game.cpp` | 529, 414 | 19, 17 | shared with the ESP32 build, so last and carefully |

**Rules (every file, from now on)**
- **One concern per file**, with a header comment of 1 to 3 lines saying what it owns and where
  its design lives (the nextSteps section or the COMBAT.md heading).
- **Soft limits:** about 300 lines and about 15 functions. Over that, split by concern, not
  alphabetically. Pure data tables (sprite geometry, guide text, emitter points) live in their
  own files and do not count toward the limit.
- **One folder per boss** once it needs more than one file: `web/native/boss/fights/<boss>/`,
  `web/src/boss/<boss>/` (painter, fx, art geometry), `web/tools/<boss>/` for its art. The
  sound books already work this way (`src/boss/sound/book/<boss>.mjs`).
- **No behaviour changes in a split commit.** A split only moves code; goldens and the bot
  numbers must not move, so the check is `npm run check`, `tests/run_host.sh` and the OLED build
  with no golden updates. Behaviour changes come in their own commits.
- **Tests mirror the source:** `web/tests/boss/<boss>.test.mjs` next to a shared
  `web/tests/boss/fairness.test.mjs`. The test script globs `tests/**/*.test.mjs`.

- **Formatting:** C and C++ follow the repo's `.clang-format` (80 columns, braces on every
  block; run `clang-format -i` on a file you touch), JS and CSS follow `web/.prettierrc.json`
  (`npx prettier --write`). Every file passed both on 2026-11-18.

**The splits, in order**
- [x] **M1 Zodiarch and Ninefold** (done with P3, since P3 rewrites most of it):
  - `fights/warden.h` becomes a short include list plus the two `BossOps` rows.
  - `fights/zodiarch/`: `data.h` (ids, constants, emitter and key-star tables), `swim.h`
    (steering, trail, body, head frame, emitters), `creatures.h` (spawn, launch, dissolve,
    break), `signs-spring.h` / `signs-summer.h` / `signs-autumn.h` / `signs-winter.h` (one
    function per sign instead of the switch), `signs.h` (dispatch and the per-tick update),
    `own.h` (its own attacks), `fight.h` (scheduling, hit circles, the update).
  - `fights/ninefold.h`.
  - `src/boss/zodiarch/`: `ring.mjs`, `creatures.mjs`, `dragon.mjs` (body and head),
    `fx.mjs` (was `zodiac-fx.mjs`), `painter.mjs` (its body painter).
- [ ] **M2 Boss tests:** `boss.test.mjs` into `tests/boss/` (fairness, framework, one file per
  boss); shared helpers in `tests/boss/helpers.mjs`. Change the test glob.
- [ ] **M3 Body painters:** `body-painters.mjs` becomes an index that imports one painter per
  boss from `src/boss/<boss>/painter.mjs`; the same for the larger hazard and shot painters.
- [x] **M4 Storyboards and stylesheets** (2026-11-18). Each storyboard page is now a short page
  script plus a folder of modules under 310 lines: `dev/zodiarch-storyboard/` (kit, one file per
  season of signs, the dragon's own, four creature-state files) and `dev/zodiarch-living/` (kit,
  body, one file per tile). Whole statements were moved with a parser, so no code changed
  except `dragonDraw` becoming a shared `view.dragon` object. Every tile hashed the same,
  pixel for pixel, before and after. The two pages keep their own kits rather than sharing one:
  their backdrops and pilots differ, and merging them would change pixels. `styles/shell.css`
  (723 lines) and `styles/theme/guide.css` (416) became ordered `@import` lists over
  `styles/shell/` and `styles/theme/guide/`, with the rules unchanged. Still a little over:
  `dev/boss-attacks.mjs` (368), `dev/boss-states.mjs` (320) and `settings.css`, `screens.css`,
  `base.css` (343 to 359).
- [ ] **M5 Art tools:** `zodiac_myth.py` into `tools/zodiac/` (one module per season of
  figures, plus `emitters.py` and `export.py`); `boss_art.py` into a drawing library and one
  module per boss sheet. Regenerated sheets must be byte-identical.
- [ ] **M6 Guide data:** `guide.mjs` into `src/boss/guide/<boss>.mjs` data files and a small
  index; the guide test checks the same keys.
- [ ] **M7 Scene mirror:** `scene.mjs` keeps the layout and decoders; per-boss constants
  (`SIGN_EMIT`, `NINEFOLD`, `ZODIARCH`...) move beside their boss in `src/boss/<boss>/`.
- [ ] **M8 Shared C++ (last):** `src/asteroid.cpp` and `src/game.cpp` split by concern (rocks,
  ship, scoring glue, state machine), keeping the ESP32 build green at every step.

---

## P3. Zodiarch: a living dragon (2026-11-18)

**Built 2026-11-18.** Everything below is in the game except the five items left unticked.
Deviations from the plan, found while building and measuring:
- **The swim box** is x 305 to 445 (head point), y 45 to 225. A soft wall turns it back 35 to
  55 px from each edge and picks the way round that swings away from the edge; past the edge
  an emergency turn of 22 px takes over. A hard position clamp was tried and dropped: it
  folded the neck against the edge.
- **Turning** is no tighter than 48 px at speed but 26 px when slow (setting off from a stop
  near an edge needs it). The sharpest bend between neighbouring segments measured is 35°; the
  test allows 40° (the old loop folded the neck by 110° to 180°). A goal nearly behind keeps
  the turn going the same way (it used to flip and drift straight on).
- **Stalk and rear stop** at their goal (still breathing) instead of slowing to a crawl: a
  crawl circled the goal, which looked like the old loop.
- **Settling** before its own attacks (face the pilot, stop) takes up to 1.6 s; the attack
  clock starts once it has. The coil-spit does not settle (the coil is its approach).
- **Balance:** the forehead pearl is partly hidden by the head, so the window is now 3 s every
  6.5 s (was 2.5 every 7), its circle 13 px, the snout's blocking circle smaller and lower, and
  the dragon comes round to stalk forehead first when the window opens. Health is 3 sub-hits
  per design hit (was 4) and a break costs it 3 (was 2). From phase 3 it throws three signs in a
  row. Bot: 54 / 61 / 61 s, 0.8 to 1.2 hits (was 47 / 54 / 54).
- **Summon length** is 900 ms (decision 21); the dragon rears and its eye beam runs during the
  wake, not before it (the engine does not know a throw in advance).
- **Path dots** ahead of the head are gone for now: the steering has no cheap look-ahead to
  send. **Boss-bar pearl icon**, **whiskers** and the **hit-circle overlay** are not built.
- **Blocked-shot sparks** are drawn for every boss (`src/boss/feedback.mjs`), not only the
  Zodiarch.
- **Still to watch in play:** in its small box the 338 px body still curls into a loose
  ring after some attacks; it no longer circles a point, but a playtest should say whether
  that reads as natural.

**Revised 2026-11-18 after a playtest (the boss was too hard; the timed forehead window felt
arbitrary):**
- [x] **The pearl moves to the attack.** It rests shut in the forehead. Each attack brings it
  up on the part of the body that attack comes from (`ZOD_WEAK` in `zodiarch/data.h`), after
  the 600 ms twitch, for 2.2 to 3 s; then it sinks back.
  While its section is off the screen (the tail past the right edge) it shows on the nearest
  segment toward the head that is on it, so it can always be reached.

  | Attack | Where it surfaces | Opens (ms into the attack) | Open for |
  |---|---|---|---|
  | Eye laser, black hole | forehead | 600 | 2.6 s, 3 s |
  | Coil-spit | throat (segment 3) | 1400 | 2.2 s |
  | Breath | throat (segment 2) | 600 | 2.8 s |
  | Lunge | stretched neck (8) | 900 | 3 s |
  | Nova stars | hind claw (15) | 600 | 3 s |
  | Meteor fall | tail fan (23) | 600 | 3 s |
  | Any summon | chest (5) | 600 | 2.4 s |

  The timed window, the lunge's forced window, the stalk toward the pilot when it opened, and
  "breaking a creature brings the window sooner" are gone. A break still costs the dragon 3
  sub-hits. The brow scales always stop shots unless the pearl is open under them.
- [x] **The constellation net is removed** (attack id 89 stays retired).
- [x] **The starfire breath is head on only.** It settles facing the pilot within 0.3 rad (no
  early stop at an edge of the box) and breathes along the head's heading, straight out of its
  mouth; if it could not come round in 1.6 s it skips the breath.
- [x] **At most two signs out** (one in phase 1, two from phase 2, the frenzy too); the Great
  Conjunction throws two. Phase 3 throws both in a row, then attacks itself.
- [x] **Health 2 sub-hits per design hit** (was 3): with the pearl on a moving body the bot hit
  it less often (72 / 89 / 90 s at 3). Bot now 48 / 55 / 54 s.

**From playtest:**
1. It swims round and round the same loop. It should be more active and move naturally,
   without the sharp bends in the body.
2. The creatures seem to appear out of nowhere.
3. The fireball should become an attack where it coils up and then spits fire.
4. The black hole should be bigger.
5. It needs a lunge.
6. Nothing shows when it can be hurt or where. The pearl moves to its **forehead**
   (decided).

Same rule as before: **storyboard first** for approval, then build.

**What is wrong today (measured in the code)**
- **It swims a fixed loop.** The head follows a figure of eight (`bs_zod_path` in
  `web/native/boss/fights/warden.h`: 92 × 80 px around (372, 135), 16 s a loop), forever and
  at the same speed. Nothing it does depends on where the pilot is.
- **The head never turns.** The head sprite is always drawn facing left, unrotated
  (`body-painters.mjs`, `warden`). For half of every loop it swims **right**, so the neck
  leaves the back of the head at up to 180°. At the ends of the eight it moves straight up or
  down, which puts a 90° kink just behind the jaw.
- **Stops are instant.** The swim clock freezes for the breath and its own attacks, and halves
  the moment the pearl opens, so it halts dead and lurches off again.
- **A held dragon is a frozen chain.** The 26 segments are round discs with no motion of their
  own. The legs always hang straight down.
- **Creatures appear out of nowhere.** The dragon makes no gesture when it summons. The source
  is the faint ring, about 120 px away: a few 1 px stars drift from it while the creature
  simply fades in where it will stand (`drawCreature`, 700 ms).
- **The black hole is small for what it does.** Its lethal core has a radius of 10 px and is
  drawn 10 px across; it blocks shots in a 16 px radius and the swirl around it is 14 to 34 px.
- **Shots vanish with no sign of why.**
  - The head and neck (`BC_BLOCK`) eat shots silently.
  - The closed pearl lets bullets straight through.
  - Key stars look like any other star.
  - The pearl window has no warning before it opens and no timer while it is open.

### P3.1 Movement: a dragon with intent, not a loop

**Steering (the base layer)**
- [x] **The head steers.** It has a position, a heading and a speed, replacing
  `AUX_ZOD_CLOCK`.
  - Each tick it turns toward its current goal at a capped turn rate (about 110°/s
    cruising, 180°/s in a surge). The minimum turn radius stays at 40 px or more, over three
    times the 13 px segment gap, so the body can never kink.
  - It stays in today's swim box (x 280 to 464, y 55 to 215, snout right of x = 216), except
    during a lunge.
- [x] **It swims like a serpent.** A sideways wave is added to the steered path: about 6 px,
  with a 1.2 s period while cruising and faster in a surge, so the body travels in an S, the
  way an eel or a sky dragon moves, even when its course is straight.
- [x] **The body follows a trail.** A ring buffer of head positions, sampled every 2 px of
  travel (about 180 points), holds the trail; segments sit at fixed arc lengths back along it.
  It is deterministic and uses only the existing boss RNG.

**Behaviours (what it chooses to do)**

Between attacks, a small behaviour picker chooses the next move from the pilot's position and
what it last did. It never picks the same move twice in a row, so it never settles into a loop.

| Behaviour | What it does | When |
| --- | --- | --- |
| **Stalk** | It drifts toward the pilot's row and slows, with its head low and level, eyes on them. | It wants to attack from the head next |
| **Surge** | A fast burst of 0.5 s along a wide S to the other half of the box, then a glide that slows down. | The pilot has stayed on one row for 2 s, or it has been stalking a while |
| **Rear** | The head rises high and the body hangs below it, in an S. | Before every summon (P3.4) |
| **Dive and rise** | It drops below a row and climbs back up behind the ring's stars, with a dip in its brightness as it passes behind them. | Cosmetic variety in the open, no more than once every 8 s |
| **Coil** | It winds into a tight spiral on the spot. | Before the coil-spit (P3.5), and in phase 3 as a pause |
| **Recoil** | When the pearl is hit, the head jerks back 8 px and up, and the body shudders back along its length. | On damage |

- [ ] **The head is alive while it swims.**
  - The head tracks the pilot within ±25° of its heading: a separate look angle, chosen from
    the pre-turned frames.
  - The jaw opens slightly in a surge.
  - The whiskers trail the motion: drawn from the last two head positions.
- [x] **Before any attack from the head** (eye laser, breath, coil-spit, lunge), it turns to
  face the pilot first; that turn is the start of the tell. It may face right while cruising,
  but it never fires from its head while facing away.

**The head turns, and so does everything attached to it**
- [x] **Head art.** New frames pre-rotated nearest-neighbour by the art tool:
  - 22.5° steps from −90° to +90° off "facing left" (9 angles), mouth open and closed, with
    the forehead pearl closed and open (P3.3);
  - facing right is the same frames mirrored, so the horns stay on top;
  - the damage overlays get the same treatment.
- [x] **Head-relative points.** Every point measured from the head goes through one helper,
  `bs_zod_local(dx, dy, &x, &y)`, mirrored in `src/boss/scene.mjs` as `zodLocal`. That
  covers:
  - the eye and the jaw;
  - the forehead pearl;
  - the head hit circles and their contact circles;
  - the breath fan.

  The heading and the look angle go to the scene in spare aux slots (12 to 15 are free).
- [x] **Legs.** They sit perpendicular to the local spine and paddle faster in a surge. In a
  rear, they reach forward. The tail fan already follows the last segment.

**Easing and holding**
- [x] **Ease every change.** Speed changes ease over about 400 ms: into and out of holds, and
  into the pearl window (0.6×).
  - Attacks that need it still start only once it has stopped.
  - The hold flag is set when it starts slowing, so emitters still never move while an attack
    is warned.
- [x] **A held dragon still breathes.** The serpent wave keeps running down the body at a
  third of its size (2 to 3 px, larger towards the tail).
  - The contact circles move with it.
  - The corridor test proves that a warned lane stays clear.
- [ ] **Path dots.** The faint dots ahead of the head come from a 0.6 s look-ahead of the
  steering. They stay hidden while it holds.

**Tests**
- [x] Over a 120 s fight at every tier, at every tick:
  - the bend between neighbouring segments is at most 30°;
  - the heading is within 5° of the direction of travel;
  - no segment jumps more than its speed in one tick;
  - the snout is right of x = 216 (except during a lunge);
  - the `min_corridor` is at least 42;
  - the anti-camp repel still fires.
- [x] **No loops:** over 120 s the head's positions cover at least 60% of the swim box's
  cells, and no 16 s stretch repeats another.
- [x] Boss-bot: re-measure the clear time and hits, then update `web/COMBAT.md`. Update the
  scene golden, `boss-states.html` and `zodiarch-attacks.html`, and check the emitters with
  the head turned.

### P3.2 Lunge (a new attack of its own, `ZA_LUNGE`)

The neck is long enough to strike. The lunge is fast and dangerous, and it leaves the dragon
open.

| Time | What happens |
| --- | --- |
| 0 to 600 ms: **coil** | It slows to a stop and turns to face the pilot. The neck draws back into a tight S, the head pulling back about 40 px, the jaw opening and the eye flaring. A hiss rises. |
| 0 to 900 ms: **warning** | A lane from the jaw along the strike line, aimed where the pilot was at the start and then locked. It is as wide as the head's contact plus 8 px. The reach stops at x = 120, so the far left always stays clear. |
| 900 to 1150 ms: **strike** | The head shoots along the lane, easing out, and the body pours after it along the trail. A bite flash and a snap at full reach. |
| 1150 to 2050 ms: **overextended** | It stays at full reach, panting. The **forehead pearl opens**, now close to the pilot: the reward for dodging. |
| 2050 to 2650 ms: **retract** | It slides back along its own trail and swims on. |

- [x] **When it appears:** phase 2 and up.
  - In phase 3 it can **double-lunge**: the second lane is warned while the first strike is
    still happening, and each lane gets its full 900 ms.
  - Never alongside a charging or wall sign.
- [x] **Fairness:**
  - The lane covers the whole path of the head and neck: the strike starts at the coil point,
    and the body behind it only travels where it already was. Test: at no tick is there a body
    contact circle outside the lane or the trail.
  - Lethal hazards stay at 6 or fewer, and the corridor stays at 42 or more.
- [x] **Overextension:** the pearl window opens for it and then runs out as normal. It does not
  move the 7 s rhythm forward.
- [x] **Sound, guide and bot:**
  - Sound book: the hiss and the snap.
  - Field guide entry.
  - Check that the demo pilot reads it like any lane.
  - Re-measure the bot.

### P3.3 Readable weak points: the pearl in its forehead

**One rule, three looks, used everywhere in the fight**

| What happens to a shot | Look | Sound |
| --- | --- | --- |
| **Hurts it** | pink burst, the boss bar ticks | the existing hit sound |
| **Stopped** | gold spark glancing off the surface | a dull "tink" |
| **Passes through** | nothing | nothing |

**Where: the forehead pearl** (decided)
- [x] **Art.** The pearl moves from under the chin into the dragon's forehead, between the
  horns, set like a third eye.
  - Closed: two heavy brow scales close over it like an eyelid, with a dim line of light
    between them.
  - Open: the scales part and the pearl blazes.
  - Drawn into every turned head frame (P3.1), so it turns with the head.
  - Remove `zod-pearl-0/1` as separate sprites.
- [x] **Engine.**
  - The pearl's offset goes through `bs_zod_local`.
  - The head's two `BC_BLOCK` circles are reshaped so they do not cover the pearl. A shot
    aimed at the forehead must reach the pearl first: snout circle in front, jaw circle below,
    the pearl circle (radius 11) uncovered on top. Test that a shot from the left at pearl
    height hits the pearl, not the block circles.
  - The laser always reaches it, as now.
  - Contact circles are unchanged in size.
- [x] **What changes in play.** The pearl now faces the way the head faces: when it looks at
  you, you can hit it.
  - This is the point of the stalk, rear and lunge moves: it shows its forehead.
  - While it faces away, the pearl is out of your line (the head blocks it). The bot's
    shots-to-kill must stay within 10% of today's, or the window length is retuned.

**When: the pearl window**
- [x] **Before it opens (600 ms):** the brow scales twitch, light leaks between them, and a
  rising chime plays. The window itself does not change length.
- [x] **While it is open:** the pearl blazes, with a pink ring around the head that drains over
  2.5 s as a timer. The ring flashes for the last 500 ms, then the scales snap shut.
- [x] **Seen out of the corner of the eye:** while the pearl is open, the starlight rim along
  the whole body shifts from gold to pink.
- [ ] **On the boss bar:** a small pearl icon, lit while the window is open, with the same
  draining timer.

**Feedback on every surface**
- [x] **The engine reports stopped shots.** In `bs_circle_hit`, a `BC_BLOCK` hit (and a closed
  pearl) records x, y and the shot's angle in a small ring buffer of 4 in the scene. That is a
  new block, so update `scene-layout.mjs` and the scene golden in the same commit.
  - The renderer draws the gold glance spark.
  - The sound book plays the tink, at most every 120 ms.
- [x] **The closed pearl stops bullets** instead of letting them pass, so the player sees
  them stopped. The laser still reaches it.
- [x] **Key stars on creatures:** a four-pointed glint in the sign's colour, pulsing every
  800 ms, with three pips under it that crack one per hit.
- [x] **The body:** shots still pass through the coils (decided in P1). Say so in the field
  guide.

**Hit-circle overlay and audit**
- [ ] `?hitboxes=1` on `web/dev/boss-states.html` and `zodiarch-attacks.html` draws every
  circle by type:
  - pink: hurts it;
  - gold: stops shots;
  - cyan: a key star;
  - red outline: contact.
- [ ] Measure contact against the turned head frames the P0.2 way, and fix outliers.

### P3.4 Summoning: the dragon calls each creature down from the sky

Today the creature fades in at its spot while a few faint stars drift from the ring. Instead,
the summon becomes a visible act, from the dragon to the ring to the spot.

| Time (from the throw) | What happens |
| --- | --- |
| −300 to 0 ms: **call** | It **rears** (P3.1): the head rises toward the sign's place on the ring, the jaw opens and a call sounds (the rising chime per sign, already in the sound book). A thin beam of starlight runs from its eye to that ring sign. This happens while it moves, so it costs no fight time. |
| 0 to 250 ms: **wake** | The sign on the ring flares. Its constellation lines draw themselves star to star, and the sign's glyph lights over it. |
| 250 to 550 ms: **flight** | The whole constellation (stars and lines, as one shape) peels off the ring and flies on an arc to its spot. It grows from ring size to creature size on the way and leaves a short trail of sparks. A ring of the sign's colour marks the spot from the start, so the player sees where it will land. |
| 550 to 900 ms: **form** | The constellation lands where its stars match the creature's stars. The engraving lines trace themselves outward from the key star, stroke by stroke, then the star-fill washes in from the edges, the eyes light last, and it takes its first breath (its idle starts). |

- [x] **Engine.**
  - `ZOD_FORM_MS` goes from 700 to 900 ms. Forming is the creature's warning, and longer is
    clearer.
  - The throw spacing in phase 3 and the conjunction is checked against the 1.2 s rhythm.
  - Re-measure the bot: about +0.2 s per throw.
- [x] **Renderer** (`drawCreature`, forming branch).
  - The flight path and scale come from the existing star lists (ring star positions and the
    creature's star positions), so no new data is needed except the stroke order of the
    engraving.
  - The art tool exports each figure's outline as an ordered list of strokes, or the renderer
    reveals the strike frame with a growing mask around the key star; choose whichever reads
    better in the storyboard.
- [x] **Exit is the reverse.** The fill drains, the lines unravel back to a constellation, and
  it flies home to its gap in the ring. Chargers that leave the screen send their stars back
  from the edge, as now.
- [x] **The conjunction:** three summons at once, so three beams fan from its eye. That is the
  biggest moment of the fight, and it should look like it.

### P3.5 Coil-spit (replaces the fireball, `ZA_FIREBALL` becomes `ZA_COILSPIT`)

| Time | What happens |
| --- | --- |
| 0 to 800 ms: **coil** | It winds into a tight spiral on the spot: the head turns inside its own coils, about 1.5 turns of 45 px radius, the body wrapping around it. The coils tighten and it shakes, like a spring. |
| 300 to 1200 ms: **charge** | Fire glows inside the body. Light travels segment by segment up from the tail to the throat; the throat swells with light. Three aim lines from the jaw for the 900 ms warning, spread 0.3 rad apart, aimed at the pilot. |
| 1200 to 1700 ms: **spit** | The coil springs loose: the head snaps forward 20 px and **spits** a stream of fire along the three aims, 4 globs each in quick succession (90 ms apart). Each glob bursts into 3 embers when its life runs out. Globs can be shot (they pop), like today's fireballs. |
| 1700 to 2300 ms: **uncoil** | The body unwinds as it swims out of the spiral along its trail. Smoke puffs from the jaw. |

- [x] **Engine.**
  - Reuse `SF_FIREBALL` with less hp and a smaller burst: 12 globs and up to 36 embers is too
    many for the 48-shot cap, so cap the total at 30. That means 4 globs × 3 aims with 2 embers
    each, or fewer aims in phase 1.
  - The coil is a steering behaviour (P3.1: the turn rate is raised for it, and the turn
    radius stays at 40 px or more).
  - The spring-forward snap of 20 px is inside the warned hold area.
- [x] **Renderer.**
  - The light travelling up the body (a brightness pulse on the segment draw, keyed by the
    attack timer).
  - The swollen throat glow and smoke puffs.
  - A glob painter: a fire core with a flickering tail, replacing the fireball painter.
- [x] **Guide, sound and bot.**
  - The field guide entry is rewritten.
  - The sound book gets a coiling creak, a rising roar and a spit.
  - The bot's `speedOf` entry is updated, and the bot re-measured.

### P3.6 Bigger black hole

- [x] **The sizes.**

  | Part | Now | New |
  | --- | --- | --- |
  | Lethal core (`HK_POOL c`) | radius 10 | radius 18 |
  | Drawn disc | 10 px | 20 px |
  | Shot-swallowing circle | 16 | 28 |
  | Ring of streaks | 14 to 34 px | 24 to 60 px |
  | Pull | as now | as now |

- [x] **A lensing rim.** Stars behind it bend around it, drawn as a bright ring of arcs. A slow
  turning disc of accretion streaks, tilted (an ellipse), with a hot inner edge.
- [x] **Fairness.**
  - Its spot keeps the corridor at 42 or more with the bigger core. It is placed at least
    18 px further from the edges and from the pilot than today: x clamp 158 to 300, y 210 or
    60.
  - The warning swirl grows to match, so the warned area is the lethal area.
  - Test the corridor with a pull, the hole and a ranged sign out together.
- [x] **Summon.** It is flung from the forehead pearl, which glows violet as it throws.

### P3 storyboard (for approval before building)

Built 2026-11-18 as its own page, `web/dev/zodiarch-living.html` (open `localhost:<port>/zodiarch-living.html`;
linked from the sign storyboard), drawn with the real sprites. The head is turned in the browser
there; the game will use pre-turned frames. Nine tiles:
1. **Old against new movement**, 20 s: the loop next to the steered dragon stalking, surging,
   rearing, diving behind the ring, holding with the breathing wave, and recoiling from a hit.
2. **The summon:** call, wake, flight, form for one sign, then a three-sign conjunction.
3. **Coil-spit:** coil, light travelling up the body, spit, uncoil.
4. **The lunge**, single and double.
5. **The forehead pearl:** closed, tell, open with the draining ring and the pink body rim,
   closing, and the three looks (a bullet off the snout, into the open pearl, off the closed
   pearl, through the body; a key star losing its pips).
6. **The bigger black hole**, next to the old one for scale.

**Build order after approval:**
1. P3.1 movement, the base for everything else.
2. P3.3 forehead pearl and feedback.
3. P3.4 summoning.
4. P3.5 coil-spit.
5. P3.6 black hole.
6. P3.2 lunge.

Each step keeps `npm run check`, `tests/run_host.sh` and the OLED build green, and
re-measures the bot.

---

## P4. Upgrades for the other bosses (brainstorm, 2026-11-18)

**Status: decisions taken (P4.0); storyboards for all five bosses and the minis built 2026-11-19, awaiting approval. All five bosses (P4.1 to P4.5) and the five minis (P4.6) are built, awaiting playtest.** Pages: `sentinel-storyboard.html`, `ringwarden-storyboard.html`, `cinderforge-storyboard.html`, `bastion-storyboard.html`, `tidecaller-storyboard.html`, `minis-storyboard.html` (sources `web/dev/<boss>-storyboard.mjs` and `web/dev/p4-storyboard/`). Draft art: `python3 web/tools/make-p4-drafts.py` writes `assets/bosses/draft-p4-*`, which never ships. The Zodiarch got a living body, attacks you
can read from where they leave, and a weak point tied to what it is doing. The five region
bosses before it are still mostly turrets that slide between attacks (`native/boss/motion.h`)
and open on a timer. This section collects options for each; we pick a short list per boss,
storyboard it (as for P3), then build one boss at a time.

**What carries over from the Zodiarch (the toolkit)**
- **A body that moves with intent:** steering with a capped turn, a trail the body follows
  (`zodiarch/swim.h`), behaviours chosen from where the pilot is. Usable for tendrils, chains,
  hulls that bank, anything long.
- **Every attack leaves a visible point:** light gathers at the emitter while it is warned,
  a muzzle flash when it fires (`src/boss/zodiarch/fx.mjs`). Cheap to give every boss.
- **The weak point follows the attack:** vulnerability opens where and when the boss commits,
  not on a clock. It rewards watching instead of waiting.
- **Clear hit feedback:** gold spark when stopped (already on every boss), a distinct burst
  when it hurts, the outline lit while it can be hurt.
- **A storyboard page before building**, and the bot baseline as the length check.

**A verb per boss.** Each region boss should teach one thing, and its upgrade should deepen
that thing rather than add a second one:

| Boss | Region | Verb today | Bot time (I / II / III) | What feels thin |
| --- | --- | --- | --- | --- |
| Sentinel | frontier | timing: shoot between attacks | 28 / 46 / 48 s | a still eye; "hold fire" is passive |
| Ringwarden | violet | angles: blades block, the laser pierces | 29 / 33 / 34 s | shortest fight; the rings only spin; most hits taken (17 to 22) |
| Cinderforge | ember | territory: fire that stays | 36 / 44 / 43 s | eight attacks, little identity in the body; barely moves (6 px) |
| Bastion | ruins | targets: hardpoints first | 44 / 50 / 53 s | never hits the bot (0 hits); a wall of guns |
| Tidecaller | lunar | flow: streams and gaps | 43 / 48 / 51 s | the bell sits still while everything else swims |

### P4.0 Decisions (2026-11-18)
1. **Order:** the current boss order: Sentinel, Ringwarden, Cinderforge, Bastion, Tidecaller.
   One boss at a time: storyboard, approve, build, measure.
2. **Length:** a fight may get longer, by at most 10 s on the bot baseline per tier.
3. **Scope:** the **Cinderforge is redesigned completely** (body, art, attacks, weak point).
   The others keep their core idea; their art may be redrawn.
4. **Attacks:** a new attack replaces an old one rather than adding to the list, at least for
   the Cinderforge and the Ringwarden (the most attacks, and the most hits taken).
5. **Weak points:** the Sentinel's weakness stays its **eye while it is open**. The Bastion's
   weakness becomes its **engines on its flanks**, made obvious with exhaust trails.
6. **Dropped:** cooling lava into rock to stand on (it would not change how anyone plays).

### P4.1 Sentinel: the armoured eye (first boss: keep it simple)
Core kept: shoot the eye while it is open.
- [ ] **It watches you.** The pupil tracks the pilot; before an attack the eye narrows and
  the plates shiver. When the plates open, the eye widens and its rim lights: that is the
  window, unmistakably.
- [ ] **Plate throw (new attack):** two or four plates fly out as boomerangs and come back.
  While they are out, the eye is bare on that side: the attack itself is the window, so being
  brave pays.
- [ ] **Movement:** it slides on an unseen rail and turns toward you (an eyeball rolling in its
  socket) instead of drifting.
- [ ] **Phase 3:** it sheds its plates for good; the eye is always open but it attacks faster
  (warnings still at least 600 ms).
- [ ] **Art:** plates and eye redrawn so open and shut read at a glance.

**Built 2026-11-19** from the approved storyboard. In the game:
- **Art:** the shell, the eye in three moods (narrow, calm, wide), the brows and the spinning
  plate now ship in the frontier sheet (`sentinel_parts` in `tools/boss_sprites.py`); the old
  whole-body cells stay for the death sequence and the damage overlays.
- **Engine** (`native/boss/fights/sentinel.h`): a vertical rail (`BOSS_MOTION` left 0, 70 px
  up and down) with a roll from its speed; a tell in each attack's first 600 ms; light in the
  seams until the warning ends; the plate throw (`SA_THROW`, plates are `PK_PLATE` parts:
  two in phase 1, four from phase 2, 600 ms tell, 1.8 s loop; in flight they stop shots and
  hurt to touch); a third phase at 30% where the plates come off and the eye stays open, rest
  600 ms. The eye can be hurt while the plates are apart, while thrown plates are out, and
  always in phase 3.
- **Painter:** `src/boss/sentinel/painter.mjs`; the state sheet is `boss-states.html?kind=0`.
- **Bot:** 27 / 43 / 43 s (was 28 / 46 / 48), no hits.
- Not built: the Picket's tracking eye (P4.6).

**Storyboard built 2026-11-19** (`sentinel-storyboard.html`, seven tiles; draft shell, eye and
brows, the game's own plates). Found while building it:
- The plates must part about 36 px (not 20 as today) before the eye clearly shows; at 20 the
  open eye is mostly hidden, so the window does not read.
- The plate throw's two loops must stop at about x 170, or the plates pass through a pilot
  standing in the middle of the field.

### P4.2 Ringwarden: the crystal gyroscope
Core kept: blades block, break and regrow; the laser pierces.
- [ ] **Rings that tilt** in 3D (drawn as ellipses that squash and turn), so their gaps sweep
  across the core. An **eclipse**, both gaps lined up, is the big window.
- [ ] **Blades as prisms:** unbroken blades split the prism beam into extra beams. Breaking
  blades becomes a choice.
- [ ] **Halo lock** (replaces the pick-off): the outer ring expands to the edge of the field
  and closes back in with one gap you thread.
- [ ] **Movement:** a slow, wobbling precession; it leans into turns.
- [ ] **Fairness:** it hits the bot most (17 to 22 times); the halo lock must not raise that.

**Built 2026-11-19** from the approved storyboard. In the game:
- **Rings** (`native/boss/fights/ringwarden.h`): each ring tilts and turns on its own slow
  wobble and leans into the drift; blades are placed in 3D and those behind the core draw
  dimmer (part state 1). The gaps are built in (outer slots 0 to 2, inner 0 and 1; they never
  regrow). They turn opposite ways on a 14 s clock that slows as they meet on the pilot's
  side: the eclipse. The core flares whenever the lane from the left into it is clear
  (`aux` eclipse), which is the eclipse or blades broken on that side.
- **Decided while building:** hits do **not** count double in an eclipse (the gaps already
  open the core more than before; the fight stays within the +10 s rule).
- **Prism:** every whole blade the beam crosses splits off two shards (±0.5 rad), at most
  five blades per sweep (six at tier III). Shards, not beams: a split beam would need its own 900 ms warning.
- **Halo lock** (`RA_HALO`, replaced the pick-off): 900 ms warning with the gap marked at the
  edge, then the outer ring flies out to 3× (318 px) in 1 s, holds 0.5 s and closes in 1.8 s.
  Its light is an `HK_RING` whose radius and gap the fight drives; the gap is 80 px wide at
  every radius and drifts ±0.32 rad. The outer ring's own gap is held on it, and the outer
  blades do not touch while it is out (the light is the danger).
- **Painter:** `src/boss/ringwarden/painter.mjs`; state sheet `boss-states.html?kind=1`.
- **Bot:** 30 / 35 / 35 s (was 29 / 33 / 34), hits 15 / 24 / 25 (was 17 / 22 / 21). Tagging hits
  by cause: the halo lock adds none (the same counts with it swapped out); most come from the
  repel ring and the prism beam.

**Storyboard built 2026-11-19** (`ringwarden-storyboard.html`, five tiles, the game's own core and
blades). Proposals to approve with it:
- Each ring is built with a gap (outer: 3 of 16 slots empty, inner: 2 of 11); the eclipse is
  both gaps in front of the core. To decide: whether hits count double during an eclipse.
- The halo lock's gap is a fixed width (about 80 px), not a fixed angle, so it stays
  threadable at the edge of the field.

### P4.3 Cinderforge: redesigned from scratch around a heat cycle
The one boss that changes completely: new body, new art, new attack list, new weak point.
- [ ] **The heat cycle (its weakness).** Every attack makes it hotter, and the heat shows (a
  gauge in its body, a glow climbing from orange to white). At full heat it must **vent**:
  it splits open and its core is bare for a few seconds, then it cools and closes. Hit it
  hard while it vents.
- [ ] **Bellows:** it breathes in (draws heat, pulls embers back) and out (blasts); the breath
  shows which attack is next.
- [ ] **Attacks from parts you can see:** e.g. a hammer arm brings down the anvil strikes.
- [ ] **Fewer, clearer attacks:** today's eight become five or six, built for the new body.
  Fire that stays on the floor (pools, scorch) stays, as the region's verb.
- [ ] **A concept to choose before anything else** (storyboard): for example a walking
  smelter on heavy legs, a forge heart caged in chains, or a furnace golem with a bellows
  chest.

**Built 2026-11-19** from the approved storyboard (body A, the furnace golem). In the game:
- **Art:** the golem's parts (torso, doors, core at three heats, bellows at four fills, hammer
  and ladle arms pivoting at the shoulder) ship in the ember sheet (`golem_parts` in
  `tools/boss_sprites.py`), plus `golem-whole` for its damage overlays and rubble. The old
  sphere and panel cells are gone; the Cinderling keeps its own cells until P4.6.
- **Engine** (`native/boss/fights/cinderforge.h`): every attack lights a lamp 600 ms in; at
  five the next attack is the vent (`CA_VENT`): 1 s warning (steam, the heat ring with one
  60° gap marked), then the doors open and the core is bare for 3.4 s, then 0.4 s to close
  and the lamps go out. Shots glance off the shell otherwise; the laser reaches the core at
  half while shut. The pose (breath, hammer, ladle, the flame into the floor) follows each
  attack's clock, so the hammer comes down exactly as its column does.
- **Attacks (five):** bellows blast (`CA_EMBER`: 800 ms breath in with the cone marked, nine
  embers out), hammer (`CA_HAMMER`: two strikes, three from phase 2, 1 s apart, each leaving
  a scorch), ladle (`CA_LOB`: scoop, whip over the top, the blob away at 950 ms; two from
  phase 2), ladle barrage (`CA_BARRAGE`, phase 3: three at once), geysers (`CA_GEYSER`, from
  phase 2: its flame driven into the floor, then geysers running from the golem toward you).
  The jets and the nova are gone.
- **Balance, decided while building:** with the core open only while it vents, the old health
  took the bot over 150 s. Health is now 2 sub-hits per design hit (was 7) and the bare core
  takes double, so the bot needs two vents: 41 / 39 / 40 s (was 36 / 44 / 43), no hits taken
  (was 12 / 10 / 23). A person landing fewer shots per vent will need three or four.
- **Painter:** `src/boss/cinderforge/painter.mjs`; death rewritten (doors blow off, arms fall,
  the kiln splits); state sheet `boss-states.html?kind=2`.
- **Found while building:** the Home demo's pilot only loses lives at bosses, and with the
  golem no longer hitting it some runs lost none, so `tests/demo.test.mjs` now seeds the demo
  (`createDemo` takes an optional `random`).

**Storyboard built 2026-11-19** (`cinderforge-storyboard.html`, eight tiles, all draft art). It
shows three bodies to choose from (A furnace golem, recommended; B walking smelter; C forge heart
caged in chains), then the heat cycle and the attacks on A. Proposed list of five: bellows
blast (was the ember spray), hammer (the anvil strikes), ladle (the lob; three at once from
phase 3, the barrage), geysers, and the heat ring with a gap when it vents (was the nova). The
jets and the panel vents go. Five heat lamps; it vents at five, about 3 s bare.
**Body chosen 2026-11-19: A, the furnace golem.** B and C are dropped; the Cinderling becomes a
small golem.

### P4.4 Bastion: the battleship
Core kept: a warship whose guns you take apart. New weakness: its engines.
- [ ] **Engines on its flanks are the weak point:** big nozzles on each side, glowing, with
  exhaust trails that stream behind the ship. They burn brighter and the trails lengthen when
  it thrusts (a turn, a run), so that is when they are most exposed. The hardpoints stay as
  its guns: knocking one out silences that attack.
- [ ] **It sails:** it banks as it turns, shows its broadside before a broadside and its bow
  before a run. The silhouette tells you the attack.
- [ ] **Ramming run (new attack):** engines flare, it crosses the field, and its wake leaves a
  lane of debris. The engines are blazing the whole way.
- [ ] **New homing missiles** (they look like blobs today). The inspiration is the look of
  space-opera torpedoes, not any particular design: a slim body with small fins, a hot white
  core, a coloured exhaust flame, and a smoke trail that fades behind it as it turns. A flash
  and puff at the launch tube, a lock-on reticle that settles on the pilot before launch,
  and a short burst when one is shot down.
- [ ] **Damage you can see:** each lost hardpoint leaves a smoking hole; the ship lists and
  slows.
- [ ] **Pressure:** it never hits the bot today; the run and the missiles should change that.

**Built 2026-11-19** from the approved storyboard. In the game:
- **Decided while building:** the ramming run replaces the mines, and the bridge is no longer
  a weak point (the storyboard's proposals). The mine-bay hardpoint is now the aft battery:
  knocking it out silences the broadside.
- **Engines** (`native/boss/fights/bastion.h`, parts `PK_ENGINE` 3 and 4 at ship frame
  x +66, y ±98, turned with its bank): every hit there hurts the ship, double while thrust is
  0.8 or more (the run). The hull circles block shots. At half health it loses the engine that
  took more hits (it smokes, has no trail, can't be hit) and the guns come back.
- **Sailing:** it banks with its vertical speed, burns harder in turns, and lists 0.04 rad per
  lost gun or engine.
- **Ramming run** (`BA_RAM`, was `BA_MINES`): it rises to the lane on the pilot's half (y 70 or
  200, 140 px tall) with the lane marked edge to edge for 1.2 s, crosses the field in 1.4 s
  shedding drifting debris (pellets, 2.5 s), is out of the field for 1.2 s and glides back in
  from the right. Once it goes, the lane hazard runs only from its stern to its bow and is
  not drawn as a band (`RAM_LANE`): the ship is the danger.
- **Missiles:** a lock-on reticle closes on the pilot for 600 ms, the tube flashes and puffs
  at each launch, and every missile (the Gunnery's too) has the new look: slim body, fins,
  white nose, flame, a smoke trail, and a burst when it is gone (`src/boss/missile-fx.mjs`).
- **Painter:** `src/boss/bastion/painter.mjs` (exhaust trails left in space, smoke from lost
  guns and the lost engine); the death now blows the engines off; state sheet
  `boss-states.html?kind=3`.
- **Bot:** 46 / 58 / 59 s (was 44 / 50 / 53), no hits. The scripted pilot only looked 22 ticks
  ahead and sat in the run's lane (hundreds of hits); it now looks further ahead in a lane
  wider than 80 px, as it already did for sweeping wedges. The engines' hit circles are r 20
  (r 15 took the bot 98 s at tier II).
- **Not met:** "it never hits the bot; the run and the missiles should change that". The bot
  still takes no hits once it reads the lane in time. A known oddity: the outriggers reach
  ±98 px, past the run's ±70 px lane, so an engine can pass over a pilot just outside the
  lane without hurting.

**Storyboard built 2026-11-19** (`bastion-storyboard.html`, five tiles; the game's own hull and
guns, draft engines). Proposals to approve with it:
- The engines sit on outriggers above and below the hull near the stern (ship frame x +66,
  y ±98), so a pilot can reach them from the left; the old bridge core goes.
- The ramming run replaces the mines (it rises to a lane top or bottom first, so half the
  field stays clear).
- The exhaust trails stay in space where they left the nozzle, so turns bend them; the hull
  is so far right that a straight trail would be off screen.

### P4.5 Tidecaller: the jellyfish bell
Core kept: pop the bubble shield, then hit the bell; streams with gaps.
- [ ] **It swims in pulses:** the bell contracts, glides and relaxes; tendrils trail behind on
  the Zodiarch's trail code. The bell opens on each contraction.
- [ ] **Bubbles that drift** around it instead of sitting still; shots push them.
- [ ] **Bioluminescence:** a stream's start lights up along the bell before it fires.
- [ ] **Tides** (optional, decide at its storyboard): a water level that rises and falls
  across the field, slowing the ship under it.

**Built 2026-11-19** (with the minis, ahead of a playtest). In the game:
- **Decided while building:** the bare bell can be hit any time once the bubbles are gone,
  not only while it contracts; no tides (optional, and slowing the ship would touch the core
  ship code for every fight).
- **Swim** (`native/boss/fights/tidecaller.h`, `bs_tide_swim`): a 1.6 s pulse (contract 300 ms,
  glide 700 ms, relax 600 ms) from stop to stop round its rest point; it leans toward where it
  goes. The hit shapes follow the bell as before.
- **Bubbles** wander their own ways in front of the bell (x −130 to −10 from it); the first
  hit pushes one 36 px outward, away from the bell (it drifts back in), the second pops it.
  Changed after the first playtest found no damage could be done: they had wandered round
  the whole bell, so each was shootable only 35% of the time, and the push sent a hit bubble
  behind the bell. Now each is shootable about 75% of the time.
- **Bioluminescence:** for a stream's 600 ms warning, light runs along the bell from its crown
  to the stream's mouth (`aux` rim, rimTo).
- **Painter:** `src/boss/tidecaller/painter.mjs`, tendrils trailing on the bell's remembered
  path; state sheet `boss-states.html?kind=4`. Fixed on the way: the guide's Bell pulse sample
  time was after the attack ended, so its sheet tile was never reached.
- **Bot:** 40 / 47 / 46 s (was 43 / 48 / 51), hits 1 / 2 / 2.

**Storyboard built 2026-11-19** (`tidecaller-storyboard.html`, four tiles; the game's own bell,
cut above its fringe, with tendrils drawn so they can trail). To decide: whether the bare bell
can be hit only while it contracts, and whether to have the tides at all.

### P4.6 The five minis
Each mini borrows its boss's new motion or tell, with no new attacks: the Picket's eye
tracks you, the Cinderling vents with heat (after the new Cinderforge exists), the Gunnery
banks and shows engine trails, the Moonjelly pulses, the Shardling's blades tilt.

**Built 2026-11-19** (no new attacks):
- **Picket:** its eye (the Sentinel's eye cells at half size) rolls toward you inside the gate,
  narrows while it is about to fire and widens when the gate is open. Painter only.
- **Shardling:** its three blades orbit on a ring that tilts and wobbles (`bs_shard_blade`, so
  the blocking circles follow); blades behind it are dimmer.
- **Cinderling:** a half-size furnace golem (the Cinderforge's cells) that heats up through its
  lob and vents after it (doors open, steam, the core bare); its hit shapes fit the golem.
- **Gunnery:** banks with its climb and dive, an engine trail left in space. Painter only.
- **Moonjelly:** swims in pulses like the Tidecaller (squeeze and lean).
- **Painters:** `src/boss/minis/painter.mjs` (the Moonjelly in `tidecaller/painter.mjs`);
  state sheets `boss-states.html?kind=6` to `10`.
- **Bot:** Picket 18 / 24 / 24, Shardling 17 / 20 / 20, Cinderling 11 / 14 / 14, Gunnery
  19 / 23 / 23, Moonjelly 19 / 22 / 22 s; no hits.

**Storyboard built 2026-11-19** (`minis-storyboard.html`, five tiles). The Gunnery keeps its own
weak point: no flank engines on a ship that small.

## P2. Open boss polish

`web/assets/bosses/draft-*` stays git-ignored and unshipped: drafts are for approval first.

### P2.1 Ninefold: natural movement (walk, run, contort, split)

**Built 2026-11-19** from the approved storyboard. Everything below is in the game except:
- a decoy popping does not stream foxfire back to the real fox (storyboard only);
- its ears do not flick at shots, it does not lick its chops (a head shake stands in), and a
  lost tail makes it yelp and look round both ways rather than turn a full circle;
- the optional fox run.

Found while building:
- **Perches are x 300, 320, 340** (not 276 to 340 as the storyboard said): standing or
  galloping, its head reaches 84 px ahead of its centre, which must stay right of x 216. Most
  moves are therefore up or down: one row is a trot, two rows a gallop.
- **Art:** a body cell and nine tail cells per pose, so lost tails still disappear one by
  one; the seated tails sway through two extra tail sets. 694 fox cells make the rift sheet
  3,825 px tall and 635 KB (it was 215 KB). Damage overlays are gone for the fox: its tails
  are its health bar.
- **Code:** the engine is in `native/boss/fights/ninefold/` (data, footwork, attacks, the
  split, the fight), the painter in `src/boss/ninefold/painter.mjs`, and `poses.h` /
  `poses.mjs` are generated by `tools/fox_game.py` (run by `make-bosses.py rift`).
- **The illusion's middle place** moved from (404, 135) to (380, 135) so its tails stay on
  screen.
- **Bot:** 26 / 35 / 35 s (was 21 / 29 / 29), no hits. The footwork adds about 5 s.


Today it sits in one pose and the framework slides it (`BOSS_MOTION`, `{60, 50, 1.4}`), so it
glides.
- **Illusion:** it shrinks to 0.6× size in one tick and the decoys glide into place (a lerp of
  0.18 per tick toward `FOX_ILLUSION_AT`).
- **Blink:** a dissolve on the spot.
- **The rest:** the only motion of its own is the tail-sway wave.

It should move like a fox throughout: weight, gait, anticipation and follow-through. Like the
Zodiarch, the motion is driven by the engine (positions and states), and the renderer picks
frames and offsets from them.

**Movement**
- [ ] **Its own motion** (`own = true` in `BOSS_MOTION`, like the Zodiarch and Shardling).
  Between attacks it picks a **perch** from a 3×3 grid in the right of the field (x 276, 308,
  340; y 92, 140, 188; corrected at the storyboard), keeping the whole fox on screen and the
  body at x ≥ 216.
- [ ] **Choosing the perch.**
  - Never the same perch twice in a row.
  - Never one whose path passes within 50 px of a pilot.
  - Prefer one level with the nearest pilot in front.
- [ ] **How it gets there.**
  - **Walk** for moves under 90 px: a 4-beat trot at about 1.2 px/tick, head low and level.
  - **Run** (gallop) for longer moves, at about 3.2 px/tick.
  - Both ease in (a crouch, the weight shifting back) and out (a skid with its front paws
    braced and its tails swinging past and settling).
- [ ] **No moving during warnings.** Attacks start only once it has sat down; it never moves
  while an attack is warned. The rest times stay as today. Re-measure the difficulty table and
  the boss-bot time.
- [ ] **Contact and hit points.** Contact circles follow the pose. The run path is clear of
  pilots. Tails stay shootable while it moves (they are its health); the forehead mark only
  while it sits.

**Idle (sitting)**
- [ ] **It looks alive while it sits.**
  - Breathing, a blink, and ears that flick at the pilot's shots.
  - Its head tracks the pilot (3 frames: up, level, down).
  - Its weight shifts paw to paw every few seconds.
  - Tail sway as today.
  - Restless when a pilot is close: it lowers its head and its tails bristle.

**Contortions: every attack has a body**

| Attack | Anticipation | Action | Follow-through |
| --- | --- | --- | --- |
| **Comets** | the fan of tails draws back and up over its back, body arched like a drawn bow | the tails whip forward over its head one after another, each comet leaving the tip at the top of its whip | tails settle back into the fan, rippling |
| **Foxfire** | it ducks its head and scoops; foxfire gathers between its jaws | a head toss upward and forward that throws the flames | it licks its chops and shakes its head |
| **Blink** | it crouches and wiggles its rear, like a fox about to pounce | it **leaps** in a high arc and dissolves into stars at the top of the leap | it reforms in the air above the new perch, **lands** on its front paws first, and skids into a sit |
| **Tail lost** | none (it is a hit) | it yelps: head thrown back, body twisted toward the stump | it turns a full circle to look at its tails, then glares at the pilot (the forehead mark is open: the daze is the window) |
| **Seen through** (the illusion broken) | none | it shakes itself like a wet dog, from head to tail | it stands taller, ears up, and the mark opens |

**The split (illusion)**
- [ ] **Coil (600 ms):** it spins on the spot in a tight circle, tails wrapping round it into a
  cocoon of fur and stars that shrinks as it tightens. The 0.6× scale happens inside the
  cocoon, eased, not in one tick.
- [ ] **Unfold (400 ms):** the cocoon bursts and three foxes peel out of it in three directions,
  each a mirror copy with a shimmer down its edge.
- [ ] **Run to place:** each fox **runs** (the run cycle at 0.6×) to its place in the illusion
  triangle, by its own path, instead of gliding. They arrive out of step, so the real one
  cannot be told by its timing.
  - Only the real one's eyes are lit, as now.
  - While they run, the decoys' contact follows them, and their paths keep clear of pilots.
- [ ] **Decoy popped:** the decoy bursts into wisps of foxfire that stream back to the real
  fox, so the player sees who the real one is (and who is next).
- [ ] **Ends (timeout or both decoys popped):** the decoys run back into the real fox, which
  grows back to full size in a single shake.

**Animation art** (in `zodiac_art.py`, sheet `rift`)
- [ ] **Walk:** 4 frames.
- [ ] **Run:** 6 frames of a gallop facing left (gather, reach, stretch, land), body long and
  low, ears back, the nine tails streaming as one mass with a wave through it. Mirrored when
  it runs right; it turns back (2 frames) before it sits.
- [ ] **Up and down:** the run and walk drawn tilted about 25°, as separate frames rather than
  rotated in the browser, plus a **leap** pose for runs of more than 80 px vertically, used
  by the blink too.
- [ ] **Transitions:** sit to rise (2 frames), skid to sit (2 frames), crouch to pounce
  (2 frames), landing (1 frame).
- [ ] **Contortions:** arched back with the tails drawn up (comets, 2 frames), head toss
  (foxfire, 2 frames), yelp twist (1 frame), wet-dog shake (3 frames), cocoon spin (4 frames,
  the tails wrapped).
- [ ] **Head tracking:** up, level and down while sitting.
- [ ] **Star paw prints:** each footfall leaves a small star that fades over 600 ms, so its
  route reads like a constellation being drawn. Cosmetic only.
- [ ] **Tail hit points per pose:** a table of the nine tail offsets for each pose (sit, walk,
  run, arch, leap, cocoon), mirrored when facing right. The engine and `NINEFOLD` share it, as
  the P1 geometry does, so the hit circles follow the drawn tails.

**Optional, only if the fight needs more variety after playtest:** **Fox run**. It dashes along
a warned lane (900 ms) across the right of the field and back to a perch, leaving star prints
that flare into short-lived comets aimed at the pilot.

**Checks**
- Body x ≥ 216 and on screen at every frame of every move.
- `min_corridor` ≥ 42.
- No lethal hazard without its warning.
- The boss-bot beats it within 150 s.
- The repel ring still fires for a pilot behind it.
- The illusion's real fox still cannot be told apart by timing.
- The state sheet (`boss-states.html?kind=11`) is regenerated with walk, run, leap, contortion
  and split strips.

**Storyboard for approval first: built 2026-11-18** at `ninefold-storyboard.html` (source
`web/dev/ninefold-storyboard.mjs` and `web/dev/ninefold-storyboard/`), ten tiles. Found while
building it:
- **The fox is now a posable skeleton** (`web/tools/fox_pose.py`; every pose is a few numbers
  in `web/tools/fox_poses.py`; `python3 web/tools/make-fox-draft.py` writes the draft sheet
  `assets/bosses/draft-p21-fox`, which never ships). The frames listed under "Animation art"
  come from the skeleton instead of being drawn one by one, and the tail hit points per pose
  can be read off the same skeleton. The draft art is rough: it shows the motion, and gets
  refined when it is built.
- **The perch grid was wrong.** With its tails the fox reaches about 135 px right of its
  centre and its head about 60 px left, so the centre must stay within x 276 to 340 (tails
  on screen, head right of x 216). The perches become x 276, 308, 340 and y 92, 140, 188.
  Most long moves are then vertical or diagonal, so the run's up and down frames matter.
  The illusion's middle spot (404, 135) also clips the tails at 0.6 size: move it to about
  (380, 135).

The storyboard was planned as drawn from the draft frames:
- sit and idle;
- walk;
- run in four directions;
- blink as a leap;
- each attack's contortion;
- the cocoon split and the three foxes running to place;
- a decoy popping;
- the wet-dog shake.

### P2.2 Zodiarch creatures: idle, tell and recoil motion

The hurt and break states are built (`src/boss/zodiac.mjs`). Still open: each creature's own
motion while it holds, tells and recoils, as drawn in the storyboard's "Creature states" row.
Do this after P3, since the creatures stand in front of the moving coils.

Every creature runs: **form** (stars stream from the ring, 700 ms) → **hold** (alive, idle)
→ **tell** (per attack) → **release** → **recoil** → back to hold or the next attack →
**exit**. Two states are new and come from the player: **hurt** (a shot hits the body, not
the key star: a 2 px flinch away from the hit, a white edge flash, stars spill from the hit
point; no damage) and **break** (the key star is shot: the figure cracks along its
constellation lines, the pieces drift apart and wink out, the stars fly back to the ring
dim; any warned attack is cancelled, a lane already live finishes). **Exit** is the
dissolve back to the ring, or off-screen for chargers (the stars stream back from the edge).

| Sign | Hold (idle) | Tell | Recoil | Hurt | Break |
| --- | --- | --- | --- | --- | --- |
| Aries | paws the ground (dust motes from the hooves), head dips | head lowers, horns glow | none (it is gone) | head jerks up | horns snap off first |
| Taurus | snorts (two puffs from the muzzle), tail flicks | Aldebaran kindles; for the stampede, scrapes a hoof | head tosses after the beam | stamps | the star knot (Pleiades) scatters as seven sparks |
| Gemini | the twins sway out of step, hands near | hands rise, light in the palms | arms kick back | the hit twin staggers, the other looks | both break together, the cord of light between them snaps |
| Cancer | claws open and close, legs shuffle sideways | claws rear up | claws snap shut on return | claws pull in to guard | the shell splits down the middle |
| Leo | mane ripples, tail sways | mane flares (roar), crouch (pounce) | head tosses (suns) | a snarl: the jaw drops one frame | the mane bursts outward as rays |
| Virgo | wheat ear sways, robe stars drift | hand draws back | follow-through of the throw | turns her head away | the wheat ear falls separately, Spica last |
| Libra | pans bob against each other | the beam tips | pans swing back | the beam rocks | the chains snap, pans fall |
| Scorpius | tail sways, stinger twitches | tail cocks, venom at the tip | body lurches after the shot | the tail curls in | the tail segments come apart from the tip down |
| Sagittarius | horse body paces on the spot | bow drawn, arrowhead glows | bow arm rebounds | rears | the bow string snaps first |
| Capricornus | fish tail sweeps, slow rise and fall | dives | leaps up through the spray | ducks under the surface line | the fish tail and goat body part |
| Aquarius | water drips from the urn lip | the urn tips | urn rights itself | water spills | the urn shatters, its stream falls as harmless drops |
| Pisces | the fish nose about, the cord ripples | they part (pass 1), they turn and close (pass 2) | none | the hit fish darts aside | the cord snaps, each fish fades on its own |


- [ ] Art: `hold` needs two or three extra frames per sign (or a part-animated layer: tail,
  claws, urn, bow). Signs that change pose (tell, recoil) use the hold and strike frames with
  small offsets, as the storyboard does.
- [ ] Hold, tell and recoil motion per sign in the renderer, keyed by the attack timer.

### P2.3 Optional, not scheduled

- [ ] **Ascendant:** the sign of the real-world date is thrown first and a little stronger.
- [ ] **Boss backstop:** during fights the ship's right bound becomes the boss's front edge,
  drawn as a barrier. Build it only if playtesting still finds a safe spot behind a boss
  (movement and the repel ring close it in tests).

---

## S0. Boss close-out (remainder)

Goal: every boss is fun, fair and beatable by real people at the intended length. Everything
that could be done without people is done. Still to do:

- [ ] **Playtest sessions** (needs 2–4 people; follow `docs/PLAYTEST-PROTOCOL.md`; the fight
  log exports JSON). Targets:
  - Sentinel cleared first try by a new player with 3 lives.
  - The Zodiarch takes most players several attempts.
  - Fight lengths inside the COMBAT.md table, with people taking about 1.5× the bot.
- [ ] **Tune from the logs:** `BOSS_K`, rest lengths, window lengths, per-attack frequency,
  pickup drops at phases 2 and 3. Make one change per commit, with the evidence in the
  message.
- [ ] **Re-verify after tuning:** every boss is beatable without pickups or laser at 1×
  multiplier, and each has a faster mechanic route.
- [ ] **Stress run on a mid laptop and in Safari** (`npm run stress`). Budget: 60 fps, no
  frame over 25 ms. It has only been run on the developer's Mac so far. Record the result in
  `docs/ACCEPTANCE.md`.
- [ ] **Design questions:**
  - Event pull: keep or cut (decide after the playtest; calm forces already removes it).
  - Mini-boss on first runs: strictly on wave 3 (proposed), or an earlier one too?
  - Boss practice picker: bosses and mini-bosses together, tagged (proposed)?

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

**S2.2 Engine (`web/native/combat.h`, `coop.h`, `src/core/scoring.c`).** Keep ESP32 and host
builds compiling. Put the single-player combo rule in the platform-free C17 core
(`src/core/scoring.c`), not in `web/native/`, so the handheld gets it in S8 for free. Only
the co-op assist logic belongs in `web/native/coop.h`.
- [ ] Solo: add the capped-bonus award keyed to `max_multiplier`, not a literal 5.
- [ ] Co-op: per-rock assist record (player, tick of last hit); a split fragment starts a
  fresh record; expiry and the owner's death clear eligibility immediately; friendly-fire
  hits never qualify.
- [ ] Single award per rock, credited to the right player and counted once in the team
  total.
- [ ] Expose a `bonus` event to the scene (new field in `scene-layout.mjs`, written in
  `scene.h`, read by name; update the scene golden).

**S2.3 Presentation.**
- [ ] A short bonus cue near the destroyed rock that does not cover incoming rocks;
  distinct from the normal score pop; reduced-motion safe.
- [ ] Results and Records: show bonus points as a separate line; keep personal-best
  categories comparable (bonus points are part of score, so note the rule in Help).
- [ ] Help text for the rule.

**S2.4 Tests.**
- [ ] Cap boundary (reaching vs. holding), one / both players capped, window expiry,
  simultaneous hits, death mid-window, pause mid-window, exactly-once, friendly fire,
  split fragments. Host tests for the C module; `coop.test.mjs` for the integration.
- [ ] Record the stored-format impact (none expected) and run `npm run check`,
  `sh tests/run_host.sh`, and the ESP32 build.

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
and Online cannot drift apart; the game page can be served by that server (default) or
from a static host with a **server URL** setting (see S5.1).

---

## S3. Network foundation (prerequisite for LAN, hosted, versus)

The plan rests on one finding that decides the architecture.

> **Finding: the engine is not cross-browser deterministic.** `game.wasm` imports its math
> (`sinf`, `cosf` and friends) from the host (`env` imports in `wasm-host.mjs`), so each
> browser's own `Math.sin` feeds the simulation. V8 and JavaScriptCore can differ in the
> last bit, and boss shot angles use `sinf`/`cosf` constantly. Lockstep (every client
> re-simulating from shared inputs) would drift. The chosen design, a **single
> authoritative server whose snapshots clients only render**, avoids the problem. Clients
> must never advance the simulation themselves.

Good news for that design: the renderer, boss painters and boss sound observer already read
only the **scene** (`Float32Array`, 1408 floats at `scene-layout.mjs`). A client can be a
thin renderer fed scenes.

**S3.1 Spike: headless engine under Node.** Tools: Node, `wasm-host.mjs`.
- [ ] Run `WasmHost` in a Node process with no DOM (the tests already do this); loop it at
  exactly 20 ms ticks with a drift-corrected timer; confirm CPU cost per room per tick,
  so S5 can size hosting.
- [ ] Confirm which parts of the engine need the browser (audio, storage bridge, records)
  and give each a no-op or server-side implementation.

**S3.2 Scene completeness audit.**
- [ ] Verify the scene alone is enough to render everything and to drive every sound cue.
  List what is derived from local state today (hit blips, score pops, pickup sounds,
  boss cues) and move any missing facts into the scene or into an **event list** appended
  to each snapshot.
- [ ] Identify state not in the scene that a late joiner or reconnecting client would need
  (record tables, unlock state, run statistics).

**S3.3 Snapshot format.** Tools: Node, a small codec test.
- [ ] Measure the raw cost: 1408 floats × 4 bytes at 50 ticks/s is about 280 kB/s per
  client, too heavy for hosted play. Design a compact binary snapshot: quantised int16
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

**S3.5 Write `docs/NET-PROTOCOL.md`** (decisions N1–N10 and S1–S14 live in `docs/NETWORK-AND-SECURITY.md`; settle the open ones first). Message list with version byte, hello / join / ready
/ start / input / snapshot / event / pause / ping / leave / error, build hash for the
compatibility check, size limits, and the reconnect handshake. Review before building S4.

**S3 done when:** a headless server tick loop runs a full co-op fight from recorded inputs,
the codec round-trips, and the protocol document is agreed.

---

## S4. LAN multiplayer and diagnostics (task 8)

First network release: the existing two-player co-op rules on two machines, one hosting.

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
- [ ] Two machines over LAN, solo and co-op, with a gamepad on each.
- [ ] Inject latency (50, 100, 200 ms), jitter, 2–5% loss, duplicate and late inputs, and a
  reconnect; scores and attribution agree on both machines.
- [ ] Host departure and late join handled cleanly.
- [ ] Document results in `docs/ACCEPTANCE.md`; two tabs on one machine are not acceptance.

---

## S5. Hosted-server multiplayer (task 9)

Same rules and protocol as LAN, on the public internet with private rooms. The Online
option runs the same server as `npm run host`, packaged as a container.

**Where to host.** The game server is a long-running process holding rooms in memory and
ticking 50 times a second, so it needs a host that keeps a process and WebSocket
connections alive. Check current prices, regions and free-tier limits before choosing; they
change often.

| Service | Fit | Notes |
| --- | --- | --- |
| **Fly.io** (recommended first choice) | Very good | Runs a Dockerfile as a long-lived machine; WebSockets work; you pick regions near players, which matters for a real-time game; `fly.toml` config; easy to run one small machine |
| **Railway** | Good, simplest | Deploy from GitHub or a Dockerfile; WebSockets work; minimal config; fewer region controls; usage-based billing |
| **Render** | Good | Docker web service with WebSockets and automatic TLS; free instances sleep when idle, so use a paid always-on one for real rooms |
| **Hetzner / DigitalOcean / any VPS** | Best value, most work | One small VM, Docker, Caddy for automatic TLS; you maintain the OS; cheapest for a steady load |
| **Google Cloud Run / AWS ECS Fargate** | Possible | Containers with WebSockets, but scale-to-zero and request time limits fight in-memory rooms; set min instances 1 and max 1 |
| **Cloudflare Durable Objects** | Possible, different design | Each room is a durable object and fits rooms well, but it means rewriting the server for Workers and driving the WASM engine from alarms; consider only if you outgrow a single container |
| **Vercel / Netlify / Cloudflare Pages** | **Static pages only** | Vercel runs serverless functions that cannot hold a WebSocket server. They can host the built game page, with the game pointing at a server elsewhere |

Recommended path: develop with `cloudflared` or `ngrok` tunnelling to your laptop, then
deploy the container to **Fly.io or Railway**; fall back to a VPS if cost or control
matters. Rooms live in one process, so run **one instance per region** at first; a room code
should encode the region so a joiner reaches the right instance.

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
    `LOG_LEVEL`, `REGION`, and a build id exposed to the version handshake. Defaults make
    `docker run -p 4173:4173 asteroids` work for **LAN** too.
  - [ ] Same-origin by default: the server serves the built page and the `/ws` endpoint, so
    the client connects to `wss://<host>/ws` with no configuration. Add an optional
    **Server URL** field in Online settings for a static-hosted page (Vercel, Netlify or
    Cloudflare Pages) or a self-hosted server; check the CORS and origin rules.
  - [ ] Per-service config files kept in `deploy/`: `fly.toml`, `railway.json` (or its
    dashboard steps), `render.yaml`, and a `docker-compose.yml` with Caddy for a VPS.
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
  `docs/NETWORK-AND-SECURITY.md` §5 and §7: origin check, message validation and rate limits, room
  code entropy and join limits, per-IP and global caps, `ROOM_CREATE_KEY`, platform spend limit,
  security headers and CSP, log retention, dependency and container audit, no secrets in the image.
- [ ] **S5.7 Acceptance.** Two machines on different networks, TLS in place, high latency
  and loss, reconnect, several simultaneous rooms, server restart mid-run. Repeat once
  with the page on a static host pointing at the server, and once with the same image run
  locally for LAN.

---

## S6. Versus mode (task 10)

Reuse the local and network lobbies; do not build a second stack.

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
- [ ] **S6.5 Settings lock.** Options fixed once players ready; identical on both machines.
- [ ] **S6.6 Tests.** Ties, simultaneous kills, time expiry with projectiles in flight, late
  hits, disconnects, both local input combinations, and LAN. Sabotage: each effect applies
  only to the victim, never the collector; telegraph minimum holds; immunity and shield
  block; one active at a time; clears on death and pause; targeted rocks and summoned
  mini-bosses score as defined; simultaneous pickup of two sabotages; effects expire exactly
  once and the scene golden covers the new fields.

---

## S7. Run modifiers (task 11)

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

## S8. ESP32 handheld: barebones single-player release

The firmware (`src/`, `include/`, about 2,500 lines) is the original game: rocks, waves,
multishot and shield pickups, chain scoring, a persistent top-five table with initials, a
demo, buzzer sound, on a 128×64 monochrome OLED with a joystick and one fire button. It
has **no bosses, no aim, no laser and no hulls**. The web engine already compiles the
firmware's own `src/*.cpp` files (see `web/native/bridge.cpp`) and layers co-op, bosses and
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
- [ ] **In:** everything the firmware already does, the single-player combo rule from S2,
  region pacing as a simple wave counter shown on the HUD, one boss (see S8.3), the
  highscore table with initials, pause, demo.
- [ ] **Out:** co-op, versus, any network, hulls and unlocks, settings screens beyond a
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
- [ ] Move rules that both builds need out of `web/native/` and `src/*.cpp` into
  `src/core/` (the C17 scoring, difficulty and score-table modules already show the style):
  chain/combo rule from S2, any boss state machine from S8.3, wave and region pacing.
- [ ] Each new core module gets C-compatible headers, the existing `.clang-format`
  (`tools/format-core.sh`), and host tests in `tests/host/`. The web build must keep passing
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
- [ ] `sh tests/run_host.sh` (strict C17 + UBSan) and the PlatformIO build are green.
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

## Standing rules (every stage)

- [ ] Solo and practice keep working at every commit.
- [ ] Before merging: `cd web && npm run check`, `sh tests/run_host.sh` from the repo root,
  and a PlatformIO build whenever shared C/C++ changes (the web build compiles `src/*.cpp`
  directly, so a firmware edit can move web goldens and the reverse). A new scene field means the
  scene golden and layout test change in the same commit.
- [ ] Per-player shot ownership, 2× pending events, laser and shield state, CPS, accuracy,
  chains, results and profile records carry through every mode. Friendly hits never count
  as enemy accuracy or score.
- [ ] New modes appear in navigation only when they work. Reuse Home → Play, lobby, pause,
  results and Records instead of adding pages.
- [ ] Update COMBAT, README, SETUP and Help text with each release.
- [ ] Keep evidence types separate in `docs/ACCEPTANCE.md`: automated, rendered, physical
  input, two-machine. Anything not performed stays unchecked.

---

---

## Open decisions

| # | Question | Blocks | Proposed |
| --- | --- | --- | --- |
| 19 | ~~Engraving reveal for a summon~~ **Settled:** a circle growing from the key star | P3.4 | Done |
| 20 | ~~Should the lunge open the pearl~~ **Settled:** yes, for 900 ms, outside the normal rhythm | P3.2 | Done |
| 21 | ~~Summon length~~ **Settled:** 900 ms | P3.4 | Done |
| 1 | Ordinary assist split in co-op | S2 | The killer gets the award; the team bonus is the only assist payout |
| 2 | Allow `ws` as the one runtime dependency, and put the server in `web/server/` | S4 | Yes |
| 3 | Client-side prediction for the local ship | S4.6 | Decide after measuring LAN latency |
| 4 | Hosting provider and budget | S5 | Fly.io (or Railway), one small always-on instance per region; Vercel only for static pages |
| 4b | Serve the page from the game server, or from a static host too | S5.1 | From the server (same origin, simplest); a Server URL setting for the rest |
| 6 | Versus round length and rematch rules | S6 | 3 minutes, best of one |
| 7 | Modifier combinations | S7.5 | One at a time first |
| 8 | Rights to the supplied music tracks | S0 | Confirm or replace before any public release |
| 11 | Portable power and enclosure | S8.7 | Optional; do after the firmware is accepted |
| 12 | Sabotage: who scores targeted rocks and summoned mini-bosses | S6.3 | The first to kill a rock scores it; a mini-boss scores nothing |
| 13 | Sabotage in co-op or solo, or versus only | S6.3 | Versus only |
| 14 | Keep or cut "Reverse controls" | S6.3 | Cut from the default list; revisit with accessibility feedback |

---

## Tools needed

**Already installed and used:**

| Tool | Used for |
| --- | --- |
| Node 26 (`node --test`, built-in `WebSocket` client, `fetch`) | Tests, build, dev server, and the future game server |
| Homebrew `llvm` (`clang++`) + `lld` (`wasm-ld`) | Building `game.wasm` from `web/native/` |
| Xcode command-line tools | Host C17/C++ tests with UBSan (`tests/run_host.sh`) |
| PlatformIO | ESP32 compile check (`platformio.ini`) |
| Prettier, ESLint, `postcss` | Format, lint, CSS tooling (`npm run check`) |
| Python 3 venv + Pillow, NumPy, fontTools | Art and sprite generators in `web/tools/` |
| Built-in browser pane, Safari, Chrome | Visual and flow checks, smoke walk |
| `web/tests/boss-bot.mjs` | Scripted pilot for fight length and fairness |

**To acquire:**

| Tool | Needed by | Notes |
| --- | --- | --- |
| Two physical gamepads, ideally one identical pair plus a different brand | S4, S6 | Same model twice is an explicit acceptance case |
| A second computer on the same network (and a phone hotspot for a different network) | S4, S5 | Two browser tabs are not acceptance |
| 2–4 playtesters, a screen recorder (QuickTime), a notes sheet | S0 | Real-player tuning |
| `ws` npm package (server dependency; the game page stays dependency-free) | S4 | The one new runtime dependency; confirm OK |
| Playwright (dev dependency, optional) | S4.8 | Two-context lobby tests; skip if hand-driven checks suffice |
| A lossy/latency TCP proxy script (`web/dev/net-conditioner.mjs`, written in Node) | S4.9 | Avoids needing macOS Network Link Conditioner; either works |
| `cloudflared` or `ngrok` | S5 test only | Quick wss tunnel before real hosting |
| Docker (Desktop or Colima) and a container registry (GitHub Container Registry) | S5 | Build and test the image locally first |
| A hosting account: Fly.io (`flyctl`) or Railway (CLI) first choice; Render or a VPS with Caddy as alternatives | S5 | TLS comes from the platform or Caddy; a domain is optional |
| GitHub Actions | S5.1 | Build, test and push the image on a tag |
| A static host (Vercel, Netlify or Cloudflare Pages), optional | S5.1 | Only if the page is hosted apart from the server |
| Chrome DevTools Performance panel, Safari Web Inspector timelines | S0, S4.6 | Frame pacing, CPU, memory |
| ESP32 DevKit, SSD1306 OLED, joystick, button, passive buzzer, USB cable (the existing handheld) | S8 | Wiring is in `docs/SETUP.md` |
| PlatformIO CLI and `pio device monitor` (115200 baud) | S8 | Build, flash, serial logging; `pio run -t size` for flash/RAM |
| Multimeter or logic analyser (optional) | S8 | Only if I²C refresh time or buzzer timing needs measuring |
| Battery and charger board (e.g. LiPo + TP4056) and an enclosure (3D print or box) | S8.7 | Only if the handheld becomes truly portable |
| A text editor for the music score (`tools/soundtracks/tracks.mjs`) and `ffmpeg` if new tracks are imported | S0 | Only if tracks change |
