# Browser combat controls

> This page is the player-facing rulebook. For how the engine implements each rule, function by
> function, see [combat/README.md](combat/README.md).

The browser's combat loop is implemented in `native/combat.h`. It reuses the
production ship, input, asteroid, bullet, scoring, and power-up modules.
The OLED game retains its original fixed-facing combat and automatic shield.

## Aiming and primary fire

- Left stick moves; right stick aims the ship and all weapons through 360°.
- Aim uses a configurable radial deadzone (25% by default) and keeps the last deliberate direction when
  the right stick returns to neutral. Movement never changes the aim.
- R2 / Cross requests one activation per fresh press. Each selected primary has its own
  interval (160–800 ms); presses during the interval are rejected rather than queued. No heat.
- Multishot adds two basic wing bolts at ±45° once per activation; it does not recursively
  multiply a Fan or Burst. The bounded pool drops shots that cannot be allocated.
- Bullet velocities, swept collisions, muzzle position, and left-edge cleanup
  follow the actual aim direction. Sixteen pixel orientations display the hull.
- Mouse movement or IJKL can aim; the right stick takes priority while deflected.
- Left click fires; hold right click to charge the selected secondary. Mouse buttons release
  safely outside the canvas, and the game canvas suppresses the context menu.

## Ship loadouts (2026-11-23)

The Hangar independently equips six movement types, six primaries and six secondaries: 216
combinations. Vanguard / Repeater / Beam is available immediately. Clearing Act 1 Levels 2–6
grants that level's ship, primary and secondary to each participating profile. First-clear
rewards appear on Results. Previous cosmetic appearances remain selectable without granting
new weapons. Stats reset keeps grants; the browser-record clear also keeps appearance/loadout
unlocks while clearing campaign records.

Ships share lives, collision shape, damage and shield rules; speed, acceleration and braking
differ. Repeater, Twin shot, Lance, Burst, Fan and Seeker use 160, 320, 520, 480, 800 and 200 ms
intervals. Damage and spread are listed in `src/ship/catalogue.mjs` and the individual native
classes. Lance penetrates up to three rocks but never passes through boss armor; Seeker turns
slowly toward eligible targets. Projectile hits count once toward accuracy.

Beam, Rocket salvo, Nova pulse, Mine rack, Drone and Arc volley have 1.5/0.4/0.6/0.2/0.4/0.5 s
charges and 5/7/9/6/10/6 s cooldowns. Non-Beam abilities allow primary fire while charging.
Nova clears ordinary bullets, not persistent hazards; mines last 5 s, the drone 4 s. Each pilot
has a separate 48-slot projectile/effect pool. The 2× pickup repeats an accepted primary
activation once after 80 ms; it never recurses. Death cancels owned effects and queued shots;
secondary cooldown is retained. Pause freezes the simulation.

A run captures its loadout at launch; Retry keeps that captured choice. Change loadouts for
a new run in the Hangar. The preview uses an isolated practice engine, can demonstrate locked
options and writes no records or grants. Replay metadata records loadout IDs and catalogue
version; the existing engine fingerprint rejects recordings from incompatible builds. Low-level
runtime clients that omit the loadout store retain legacy firing for compatibility; the browser
application always supplies it. The OLED build retains the original fixed-facing rules.

The Beam rules below apply when Beam is selected. Legacy 12-bullet implementation notes in
older dated documents describe the compatibility path, not the new loadout pool.

## L2 charge laser

Hold L2 (or F / right mouse button) continuously for exactly 1,500 ms of active gameplay. Releasing
early cancels the windup without starting the cooldown.
The right stick can continue aiming during the windup. Normal firing is
suppressed while charging; rejected primary presses do not queue.

At full charge, fire one piercing ray in the current aim direction. The ray
hits every intersected, visible original rock once, awards its normal score,
and uses normal drop rules. Targets of every size are destroyed outright,
without fragments, even when the rock pool is full. Beam damage is instantaneous;
the 400 ms pixel beam is its visual after-effect, fixed at the firing position
and direction. A two-pixel half-width defines the damaging beam.

A fired laser starts a 5,000 ms cooldown measured from discharge. It does not
allocate a projectile. Windup cannot start during the laser cooldown.
Rejected L2 presses do not queue. Holding L2 cannot repeat, even after cooldown: release and press
again for another charge.

Pause freezes charge, beam display, and cooldown. Releasing L2 while paused
cancels windup. Death cancels windup and beam display; cooldown freezes through
the death animation and persists through respawn. A new run resets it. Losing
focus or a controller pauses the game and clears browser input.

## R1 + L1 precision movement

Hold both shoulders together for 50% movement speed, applied after diagonal
normalization. This is in addition to the retained 25% lower web movement
response. Keyboard equivalent: hold Shift.

The chord never activates or consumes a shield, in either press/release order.
L1 alone activates on release so a player can form the chord without wasting
a stored shield. Releasing the chord does not create a delayed shield action.

## L1 manual shield

Collecting a shield pickup stores one charge, rather than immediately arming
it. Tap and release L1 alone (or Q) to arm the stored charge. It stays armed
until one asteroid collision consumes it and grants the existing 800 ms of
blinking protection. The shield preserves the life and score chain.

There is at most one charge in total: either stored or armed. Duplicate
pickups do not stack. L1 cannot generate a shield when none has been collected.
Death and new runs clear both stored and armed shields. Shield arming remains
available during a laser windup and does not affect the laser cooldown.

## Verification

`npm test` includes exact timing boundaries, pause and held-trigger guards,
real aimed projectile positions/velocities, rotated multishot and leftward
cleanup, per-pulse scoring and destruction without fragments, precise diagonal movement,
rapid primary fire, stored/armed shields, and shoulder chords in both orders.
The release WASM excludes test scenario and overlap exports.

## Settings and practice

Settings pause play and persist locally. Keyboard actions and controller ability
buttons can be reassigned; occupied bindings swap. Volume, radial controller
deadzone, angular aim response, and screen shake are adjustable. Closing settings
leaves gameplay paused so the player can resume deliberately.

Practice keeps the full aiming, laser, shield, collision, and scoring paths,
but unshielded collisions never consume lives (each touch is counted as a hit taken).
Shields replenish when neither stored nor armed. Practice has no leaderboard entry path
and ends at the menu; it never unlocks hulls.

**The practice range** (`native/exports/practice.h`, `src/screens/practice-range.mjs`).
Play → Practice lists drills (Targets, Waves, Stream, Boss) with a starting wave; one press
starts one, and the last drill is kept per profile. *Targets* are three still targets that
come back 1.5 s after the last one dies; *Waves* are the real waves' rocks from the chosen wave, moving
on as they are cleared (no mini-bosses or bosses: those are the Boss drill, decided 2026-11-23); *Stream* is one wave's rocks without end. In flight, **T** (ignored if
T is bound to an action) or a controller's **View / Select** opens a small tools panel and the
run waits until it closes: **Start wave** (any wave, 1–30) or **Fight boss** (any boss or
mini-boss, tier and starting phase). Multishot and 2× fire stay as toggles on the bottom bar.
The engine also takes a rock speed, a refill switch, random drops and pickups on demand
(`web_practice_config`, `web_practice_spawn`…), clamped and recorded so practice runs replay
exactly; the page does not expose those.

## 2× fire pickup

The outlined `2X` pickup doubles primary shot events for six active seconds.
Each fresh mouse, keyboard, or controller press emits one event now and one
80 ms later. Holding never repeats. Collecting another refreshes the timer;
it never adds another multiplier. Each event uses the current muzzle/aim and
multishot effect, including the existing one-shot fallback with fewer than
three free slots. The HUD shows remaining active time; practice has a Try 2×
fire button. The normal drop chance is unchanged; successful drops now choose
uniformly among multishot, shield, and 2× fire.

There are eight pending slots (at most four are needed with one processed
press per 20 ms tick). A full bullet pool drops an event without retrying.
Laser windup/discharge suppresses primary events, including due echoes; shields
and laser timings remain unchanged. Echoes earned before expiry still finish.
Pause freezes effect time and pending deadlines. Death, menu exit, and a new
run clear both effect and pending events. These rules apply only to WEB_HD.

## Run statistics

CPS counts primary input edges in `(active time − 1000 ms, active time]`.
It includes presses blocked by laser/pool capacity but excludes automatic
echoes, held repeats, menu actions, and paused input. Queued input edges are
counted when processed by the simulation (one per tick).

Accuracy counts enemy-hit primary projectiles / actually spawned primary
projectiles, including each multishot and echo projectile. No shot means `—`.
Each consumed projectile can count once; laser rays allocate no primary
projectiles and have separate discharge/kill counters. Final death freezes
the summary: all existing projectiles are already in the denominator, and
unresolved in-flight shots add no hits. Pending unspawned echoes add nothing.
A chain counts consecutive scoring kills within the existing three-second
combo window, including laser kills, and grows beyond the multiplier cap.
Death or expiry ends the chain; the longest value survives to the summary.

Local co-op now attributes every projectile/laser and statistic to a player.
Friendly hits do not count as enemy accuracy or scoring progress. See the
local co-op rules below.


## Campaign levels (Act 1)

Source: `native/level.h`, `native/exports/game.h` (`web_start_level`), `src/state/campaign*.mjs`.

Act 1 is six levels, one per region. Level *n* is waves 5n-4 to 5n: rocks, rocks, the region's
mini-boss on wave 3, rocks, then its boss on wave 5. Nothing about those waves is special-cased: a
level meets the rocks, mini and boss that an Endless run meets at the same wave numbers, at boss tier I.

| Level | Region | Waves | Mini (wave 3) | Boss (wave 5) |
| --- | --- | --- | --- | --- |
| 1 | Celestial frontier | 1–5 | Picket | Sentinel |
| 2 | Violet orbit | 6–10 | Shardling | Ringwarden |
| 3 | Ember orbit | 11–15 | Cinderling | Cinderforge |
| 4 | Ruined moon | 16–20 | Gunnery | Bastion |
| 5 | Lunar passage | 21–25 | Moonjelly | Tidecaller |
| 6 | Outer rift | 26–30 | Ninefold | Zodiarch |

- **Start:** `web_start_level(level, players, friendly)` begins at the level's first wave with three
  lives, a ×1 multiplier, no pickups and the wave difficulty of those wave numbers. It is recorded in
  replays (`RECORDED_CALLS`, appended so earlier ids stay), so a level is one short replay. Every
  other start (`web_start`, `web_demo`, `web_menu`, `web_coop_start`) clears the level.
- **Clear:** the level ends when the wave-5 boss falls (not a mini, not practice). The boss's death
  plays for 3.2 s (`LEVEL_CLEAR_DELAY_MS`, the longest death is 3.0 s) with the rocks held back, so the
  wave counter never moves on; then the engine enters `STATE_LEVEL_CLEAR` (state 8, `level-clear`) and
  stops. The time is the game time at which the boss fell.
- **Fail:** losing the last life (every life in co-op) goes to the ordinary game over, skipping the
  initials entry: a level never touches the leaderboard. A failed level offers Retry and Level select;
  it never ends the act.
- **Counted:** *lives lost* by pilot, and *hits taken* (every hit that lands, including ones a shield
  absorbs). Scene fields `LEVEL_INDEX`, `LEVEL_ACT`, `LEVEL_FIRST_WAVE`, `LEVEL_LAST_WAVE`,
  `LEVEL_TIME_MS`, `LEVEL_LIVES_LOST`, `LEVEL_LIVES_LOST_2`, `LEVEL_HITS_TAKEN`, `LEVEL_CLEARED`
  (floats 525–533).
- **Records:** a level run writes no Endless personal best and no leaderboard entry. It does count
  boss defeats (and so earns hulls from mini-bosses); practice never does.

**Stars** (three per level, 18 in Act 1): clear the level; finish with at least the 3 starting lives remaining
(extra lives offset losses, per pilot in co-op); finish strictly under the time target.
Campaign bosses and mini-bosses do not drop hearts. Par is the scripted pilot's mean time × 1.5, rounded to five seconds
(`PAR_SECONDS` in `campaign-data.mjs`); people are expected to take 1.5–2.5× the pilot. In co-op the
level counts for both profiles, each with its own stars (the no-life-lost star is per pilot; the time
is the team's).

**Progress** (`asteriods.web.campaign-v1`, part of the save): per profile and level, the stars, the best
time and the best score; merging unites stars and keeps the lowest time and highest score. Level 1 is
open, each clear opens the next, and clearing level 6 opens Endless. A save with no campaign part
opens levels by its highest real-run wave (a wave past a level's boss opens the next level; wave 30
also opens Endless) and gives no stars; what that opens is kept.

**Baseline** (`node tests/level-baseline.mjs 5`, the Home demo's pilot, five seeds; 2026-11-23):

| Level | Region | Cleared | Time min / mean / max | Lives lost | Hits | Par |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Celestial frontier | 5/5 | 46 / 51 / 56 s | 0.0 | 0.0 | 75 s |
| 2 | Violet orbit | 5/5 | 56 / 59 / 61 s | 1.0 | 1.6 | 90 s |
| 3 | Ember orbit | 5/5 | 74 / 77 / 82 s | 0.2 | 0.6 | 115 s |
| 4 | Ruined moon | 5/5 | 68 / 72 / 78 s | 0.0 | 0.0 | 110 s |
| 5 | Lunar passage | 5/5 | 51 / 64 / 71 s | 0.0 | 0.2 | 95 s |
| 6 | Outer rift | 5/5 | 73 / 76 / 82 s | 0.2 | 0.4 | 115 s |

At 1.5–2.5× the pilot, a level takes people about 1½ to 3 minutes: close to the 3-minute target, so
no wave was trimmed or padded. Re-check in the R1 playtest and tune par from the logs.

## Bosses and mini-bosses (browser solo and co-op)

Design: `nextSteps.md` Part A. Engine: `native/boss/` (shared framework) and
`native/boss/fights/` (one header per boss family, a `BossOps` row per kind). Waves 5, 10, 15, 20, 25 and 30 close
their region with a boss (Sentinel, Ringwarden, Cinderforge, Bastion,
Tidecaller, Zodiarch); the cycle then repeats as tiers (wave 35 is the
Sentinel again, tier II). Waves 3, 8, 13, 18, 23 and 28 carry a mini-boss
(Picket, Shardling, Cinderling, Gunnery, Moonjelly, Ninefold) that shares the
wave with half the usual rocks and keeps the wave open until it is down.

Rules every fight obeys, measured by the test build (`web_test_boss_stats`):

- the 1.4 s entrance is harmless and cannot be shot;
- a lethal hazard never goes live without its warning (900 ms for lanes, beams,
  tendrils and pools; 700 ms for ring waves); telegraphs show a dashed amber line
  (lane or beam), a pulsing pink ring (landing area), a dotted arc (spread) or a
  thin red line (aimed shot);
- at most 48 hostile shots and 6 lethal hazards live at once, and a safe channel
  42 px wide always exists;
- the body stays in the right 55% of the field and touching it counts as a hit;
- dying never resets a boss: its attacks are cleared and you return protected;
- boss practice (Pause, practice only) loses no lives and reports hits taken;
- no boss is a turret: between attacks its rest point follows your row and sweeps left
  and back, within a range per boss (`native/boss/motion.h`). It never moves while an
  attack runs, so a warned lane or beam stays where it was shown;
- hiding level with or behind the body for 1.2 s sets off a **repel**: a ring that
  expands from the boss with its one gap facing the open field (the usual 900 ms ring
  warning, at most one every 3 s). The way out is forward.

Contact shapes follow the art: the ship is three circles along its aim (tail, core, nose,
measured from the hull sprites), rocks hurt within 85% of their radius (their lumpy outline
sits inside it) while your shots use the full radius, and the laser hits anything with any
part on screen, including a rock still entering from the right edge.

Health is stated in design hits, `(18 + 6 * (min(10, wave / 5) - 1)) * players`
(minis `6 + 2 * region`), times 1.2 from tier II. The engine splits each design
hit into 3 to 8 sub-hits per fight (`BOSS_K`) so open windows, not raw fire rate,
set the fight length. A primary shot is one sub-hit and counts once toward
primary accuracy; the laser stays worth eight design hits and pierces. Shields,
multishot and 2× fire use the ordinary paths.

Each fight has a signature rule: the Sentinel's eye can be hurt while its plates stand open
between attacks, while its thrown plates are out, and always once it sheds them in phase 3;
Ringwarden blades absorb shots and break (the laser pierces both rings), and each of its
two tilting rings has a gap: when both gaps turn in front of the core there is a clear lane in;
the Cinderforge (a furnace golem) lights a heat lamp with each attack and at five it vents:
its doors open and the core is bare for about 3.5 s, taking double, while shots glance off
its shell otherwise (the laser reaches the core at half); the Bastion is hurt only at its
two engines (double during its ramming run) while its hull turns shots away, and knocking out a
gun silences that gun's attack. Its ramming run marks a lane edge to edge near your row (not a
fixed top or bottom lane), sometimes sloping so it dives or climbs across, pulling back to the
right as it turns so its nose never sweeps your row on the way; the hull never crosses a lane
that is still only marked (the rise lasts as long as the warning, longer with the longer-warnings
assist). From phase 2 it may turn off the field and make a second pass along another lane, marked
while it is out of sight. It banks nose-up as it climbs and nose-down as it dives, and lists a
little toward the side whose engine it lost; Tidecaller's bell is shielded
by bubbles (the laser pops all three); the Zodiarch's pearl surfaces, for about 3 s, on the
part of its body each of its attacks comes from.

The Cinderforge's fire stays. A ladle blob's lava pool (4 s) burns down into **scorched ground** for
another 6 s (`HK_BURN`, `bs_scorch` in `native/boss/hazards.h`): standing in it burns you, the
first time 500 ms after stepping in and then every 800 ms. Shooting a lob down still cancels the
pool, but marks the ground (900 ms, shown as a dotted ring) and leaves a small patch that burns
for 3 s. At most three scorches burn at once; a new one replaces the one nearest to going out, so
they never crowd out the warnings. Dying clears them like every other threat. It also fights
with geysers (lanes jetting up from random floor spots, each leaving a scorch at its base),
anvil strikes (three full-height columns in a row), vent bursts (embers from blown-out hatches)
and a magma barrage (three lobs at once), with 25% shorter rests.

The last two bosses are built to be the hardest. The Tidecaller fires faster (shorter
rests, 13 to 16 bulbs a stream) and less predictably: each sine stream leaves from a random
height with a random aim error, and every bulb gets its own speed, wave size and gap. It
adds three attacks: a *tidal wall* (pellets across the field with one marked gap), *spore
rain* (spores fall from random columns) and *whirlpools* (two closing rings that open
anywhere but on the pilot).

**The Zodiarch** (the final boss, `native/boss/fights/warden.h` and `fights/zodiarch/`;
internal id `warden`) is a star dragon drawn in constellations (art: `tools/zodiac_art.py`,
`tools/starfill.py`). **It steers itself** (nextSteps.md P3.1, `zodiarch/swim.h`): the head
turns toward a goal at a capped rate (no tighter than 48 px at speed, 26 px when slow, 22 px in
an emergency turn at the edge of its swim box, x 305 to 445), a sideways wave gives the serpent
S, and its 26 body segments are laid along the trail the head leaves, so the body only ever
curves. Between attacks it picks a move from where the pilot is, never the same twice running:
stalk the pilot's row, surge across, glide, dive and rise behind the ring, or cruise; it rears
as it calls a sign down. The head
is drawn turned to its heading (pre-turned frames, mirrored past 90 degrees), and its eye, jaw
and pearl turn with it. The body hurts to touch but does not soak shots; the head does, and a
stopped shot shows a gold spark (every boss: the scene's `BLOCKS` events). The weak point is
its **pearl**. It rests shut in the forehead, under two brow scales that stop bullets. With
each attack it surfaces on the part of the body that attack comes from (`ZOD_WEAK` in
`zodiarch/data.h`): the forehead for the eye laser and black hole, the throat (segments 2 to 3)
for the breath and coil-spit, the stretched neck (8) for the lunge, the hind claw (15) for the
nova stars, the tail fan (23) for the meteors and the chest (5) as it
rears to summon. The scales there twitch for 600 ms, then part for 2.2 to 3 s (a ring counts
the time down, the whole body's rim turns pink and the dragon slows to 0.6×); then it sinks back
to the forehead. The laser reaches it any time.
A ring of the twelve zodiac signs turns behind it. It **summons** signs: a beam from its eye
wakes the sign on the ring, the constellation arcs over to where the creature will stand (a
ring marks the spot) and the engraving uncovers itself from the key star, 900 ms in all (that
is the warning); the creature attacks, then goes back the same way. Up to one sign is out in
phase 1 and two after that (the frenzy too), thrown at least 1.2 s apart,
and a compatibility rule keeps the caps: at most one sign that walls lanes (Gemini, Cancer,
Pisces), one charger (Aries, Taurus, Leo), one field effect (Libra's pull, the black hole) and
two ranged signs. Between throws the dragon attacks itself; first it turns to face the pilot
(for attacks from its head) and settles, so every emitter stays put while it is warned.
**Every shot and wall leaves a visible point on a body** (the emitters: `SIGN_EMIT` in
`zodiarch/data.h`, mirrored in `src/boss/scene.mjs`): light gathers there while it is warned and
flashes when it fires. Every creature shows a pulsing **key star** with three pips; three hits
(or the laser) break it early, which takes its walls, pull or cord with it, costs the dragon 3
sub-hits. A hit that does not break it makes it
flinch; a break cracks it apart from the key star.

Its own attacks: the **coil-spit** (phase 1 on; it winds into a spiral, turns to the pilot, fire
climbs its body under three 900 ms aim lines, then it spits three streams of three or four fire
globs that can be shot down and burst into two embers each), the **eye laser**, **nova stars**
and the **lunge** (phase 2 on: it draws its neck back into an S while a 40 px wide lane from its
jaw is warned for 900 ms, strikes down it, never past x 120 at the snout, then stays stretched
out with its pearl on the neck; twice from phase 3), and from phase 3 the **black hole** (a
core of 18 px in a 60 px accretion disc, swallowing shots in 28 px), the **meteor fall** and
the **starfire breath**.

| Sign | Creature | Attack (from) |
| --- | --- | --- |
| Aries | ram | a lane from its horns to the edge, then it charges the whole field and off it |
| Taurus | bull | a red beam sweeps a 16° wedge from its eye (Aldebaran), then it stampedes off the field, its star knot bursting into seven as it passes you |
| Gemini | twins | a beam from each twin's hand, above and below your row, then two nearer |
| Cancer | crab | its claws shoot out on tethers up and down past you and snap back |
| Leo | lion | a roar ring with one notch from its jaws, three suns shed from its mane, then a crouch and a pounce all the way across |
| Virgo | maiden | four seeds thrown from her hand become turrets (an aimed needle each), then Spica from her wheat ear as a nova star |
| Libra | scales | a gentle pull toward the top or bottom (not under calm forces), and five weights from the pans |
| Scorpio | scorpion | from the stinger tip: a venom lash sweeping an arc, then the homing sting (two shots pop it) |
| Sagittarius | centaur archer | three aim lines from the arrowhead, then two arrow volleys down them |
| Capricorn | sea-goat | a hard dive, a splash, then two waves of stars over the whole upper half-plane, each with a gap toward you |
| Aquarius | water bearer | twelve droplets (eight beside another ranged sign) that hang, fuse and burst into six short-lived sparks |
| Pisces | two fish | the fish part wide with the cord slack (fly between), turn, close in and the cord lights (go round) |

Its own attacks: **fireballs** from the jaws (from phase 1; three slow balls that split into five
embers after 1.2 s, or pop harmlessly when shot), an **eye laser** sweeping a 16° wedge and
**nova stars** flung from its claws to either side of you (from phase 2; eight sparks with the
gap facing you), and from phase 3 a **black hole** flung from the pearl well away from you
(3 s; it pulls at 0.8 px a tick, under a quarter of full thrust, swallows your shots and has a
10 px lethal core), a **meteor fall** of five meteors from the tail fan down pre-drawn curves, and
the **starfire breath**, always head on: it turns to face the pilot (within 0.3 rad, never
stopping early at an edge), stops, opens its jaw and breathes three fanned 230 px lanes straight
out of its mouth, the middle one down the line the head points; if it could not come round it
does not breathe. (The constellation net was removed on 2026-11-18.) Phase 1 throws spring and summer (Aries to Virgo), phase 2 autumn and winter (Libra
to Pisces), phase 3 the whole ring. From tier II the frenzy adds the **Great Conjunction**:
two creatures from two sides of the ring, 1.2 s apart.

**Ninefold** (the rift mini-boss, internal id `lensimp`) is a nine-tailed star fox. Its tails
are its health: a hit on any tail reaches the fox, and a tail falls with each ninth of its
health. Losing a tail, or popping both decoys of an illusion, opens the forehead mark for 2.5 s
(the laser reaches it any time). It flicks comets from its tails down aim lines (fewer tails,
fewer comets but faster), sends three homing foxfire wisps, splits into three foxes of which
only the real one has lit eyes (each decoy fires one aimed needle; two hits pop one), and
blinks to another perch.

**It moves like a fox** (nextSteps.md P2.1, `native/boss/fights/ninefold/`). It sits on one of
nine perches (x 300, 320, 340; y 92, 140, 188: standing, its head reaches 84 px ahead of its
centre, so x 300 keeps it right of 216, and sitting at 340 its tails stay on screen). After
each attack it moves to another perch, preferring the nearest pilot's row: a trot at 1.2 px a
tick for moves under 90 px (it rises first and stands at the end), otherwise a gallop at
3.2 px a tick (a 300 ms crouch, then a 400 ms skid), and it turns back to face left before it
sits. It attacks only once it has sat down, so it never moves while an attack is warned. Every
attack has a body: the comets whip from tails arched over its back (700 ms) down 500 ms aim
lines; the foxfire is scooped into its jaws (700 ms) and tossed; the blink is a crouch (the
500 ms warning), a leap that dissolves into stars at the top (it cannot be hit or touched for
300 ms), and a landing on another perch; the illusion is a cocoon of tails that shrinks to
0.6× (600 ms), then three foxes run to their places (330, 54), (380, 135) and (330, 216) at
their own pace, so the real one cannot be told by its timing. At the end the decoys run back
into it, it runs to the nearest perch and grows back in one shake. Seated it breathes, blinks,
follows the pilot with its head, shifts its weight and bristles when a pilot comes within
150 px; a lost tail makes it yelp and look round. Its art is a posable skeleton
(`tools/fox_pose.py`, poses in `tools/fox_poses.py`): `tools/fox_game.py` draws every pose's
body and nine tails, full size and at 0.6, and writes the pose table the engine and the
renderer share (each tail's hit point, the mark, the jaw, head and body), so the hit circles
follow the drawn tails in every pose.

### Difficulty

Measured on 2026-11-13 with the scripted pilot (`node tests/boss-baseline.mjs`: perfect aim, 6 shots
a second, five seeds, boss practice), after bosses started moving (P0.3) and the rift fights were
replaced (P1); every row again on 2026-11-17 after the P2.3 Zodiarch attacks (several signs at
once, its own attacks) and after the pilot learned to keep out of a sweeping beam's whole wedge,
as a person reads it (that moved the Ringwarden, Cinderforge and Tidecaller hit counts a little;
no fairness faults); the Zodiarch row again on 2026-11-18 after P3 (steered swim, forehead pearl,
coil-spit, lunge) and again after the pearl moved to the attacking body part and the signs out
were capped at two (its health is 2 sub-hits per design hit, a break costs it 3). Ninefold again on 2026-11-19 after P2.1 (it moves between perches and sits before each attack, about 5 s longer). The Sentinel on 2026-11-19 after P4.1 (the plate throw and a third phase with its eye always open: 1 to 5 s shorter). The Ringwarden on 2026-11-19 after P4.2 (tilting rings with gaps, prism splits, the halo lock: 1 to 2 s longer; most of its hits are the repel ring and the beam, not the halo lock). The Cinderforge on 2026-11-19 after P4.3 (redesigned as a furnace golem: it can only be hurt while it vents, so tier I is 5 s longer and tiers II and III 3 to 5 s shorter; its health is now 2 sub-hits per design hit, and the bare core takes double). The Bastion on 2026-11-19 after P4.4 (engines as its weak point, the ramming run instead of the mines: 2 to 8 s longer; the scripted pilot now looks further ahead in a lane wider than it can cross in 22 ticks, as it already did for sweeping wedges). The Tidecaller and the minis on 2026-11-19 after P4.5 and P4.6 (the bell swims in pulses with drifting bubbles; the Shardling's tilting ring and the Cinderling's golem shape changed their times by up to 9 s). Every fight again on 2026-11-20 after R2: unchanged except the Zodiarch, whose head contact now follows its turned head frames (the pilot, which steers around contact, is touched less: 0.2 to 0.4 times), and Ninefold, 1 to 2 s quicker. Every fight again on 2026-11-22: the Bastion's ramming run was reworked (lanes near your row, some sloping, a second pass from phase 2; it banks both ways) and the pilot no longer drifts into a wall and stays there (the fix the Home demo got), so times and hits moved across the table; most minis are a few seconds slower and the Bastion about 15 s quicker. Hits count every tick of contact in practice, so they are noisy. The pilot keeps out of the space level with or behind a boss, as a sensible player
would. Times are seconds from the start of the fight (the 1.4 s entrance included) to the defeat,
averaged over the seeds; **hits** is how often the pilot was touched (practice loses no lives).
People are expected to take about 1.5× the bot time; that figure is an estimate until the S0.2
playtest records real ones.

| Fight | Tier I | Tier II | Tier III | Hits (tier I / II / III) | Expected person, tier I |
| --- | --- | --- | --- | --- | --- |
| Sentinel | 25 | 37 | 36 | 0 / 0 / 0 | 38 s |
| Ringwarden | 29 | 34 | 34 | 15.2 / 30.4 / 30.4 | 44 s |
| Cinderforge | 41 | 39 | 40 | 0 / 0 / 0 | 62 s |
| Bastion | 35 | 42 | 43 | 0 / 0.8 / 0.8 | 52 s |
| Tidecaller | 37 | 42 | 42 | 1 / 1.4 / 0.2 | 56 s |
| Zodiarch | 40 | 54 | 53 | 2.2 / 6.2 / 6.2 | 60 s |
| Picket | 16 | 21 | 21 | 0 | 24 s |
| Shardling | 20 | 21 | 21 | 0 | 30 s |
| Cinderling | 18 | 27 | 27 | 0 | 27 s |
| Gunnery | 23 | 27 | 27 | 0 | 34 s |
| Moonjelly | 19 | 22 | 22 | 0 | 28 s |
| Ninefold | 21 | 27 | 27 | 0 | 32 s |

Fairness counters over the same 36 fights (tiers I to III): no lethal hazard without its warning,
no entrance hit, shots never above the cap of 48 (the Tidecaller reaches it), hazards never above
the cap of 6 (the Cinderforge reaches it), and the narrowest safe corridor was 230 px, far above
42. The Zodiarch's creatures and its own attacks stay inside those limits with up to two signs
out (at most four lethal hazards and 41 shots). The Ringwarden hurts the bot most (15 to 25 touches), so expect people
to find it the busiest of the first three.

Playtest log: Settings → Display → Playtest records one entry per boss attempt (boss, tier, outcome,
seconds, lives lost, damage per phase, the attack that took each life), kept on the device and
off by default. Results → Export fight log saves it as JSON (`src/boss/fight-log.mjs`; protocol in
`docs/PLAYTEST-PROTOCOL.md`). Solo and practice only.

Defeat awards `1500 + 250 * min(10, wave / 5)` (minis `400 + 100 * region`) as one
scoring event through the multiplier, +50% when no life was lost during the
fight. Boss kills are separate from asteroid kills and appear in Results and
Records by name. Defeating a mini-boss in a real run for the first time unlocks
its Hangar hull (`src/boss/unlocks.mjs`); practice never unlocks. Co-op awards the killing
pilot, counts participation for every pilot who touched the boss, scales health by
two, and alternates its aim between the nearer and the farther pilot.

Every boss and mini-boss has its own defeat sequence (`src/boss/death.mjs`), played from a
frozen copy of its last frame: the Sentinel's bare eye overloads, the Ringwarden shears and
implodes, the Cinderforge's doors blow off and its arms fall away as it splits on a column of fire, the Bastion's engines blow off and it breaks in two along a
chain of explosions, the Tidecaller dissolves into bubbles, the Zodiarch comes apart segment
by segment from the tail before its pearl goes nova, and Ninefold sheds its tails one by one. Each has a matching defeat sound. Replay them on `/boss-attacks.html`.

Tier 3+ fights (wave 93 and later, or tier IV in boss practice) play in front of a
quasi-star, pulsar or magnetar; it is scenery only and never hurts the player.

Sound: each boss has its own timbre, a charge-up for every attack, a release sound
at the lethal moment and a distinct defeat sound (`src/boss/sound.mjs`). The
attack gallery (`boss-attacks.html`, linked from Pixel assets) lists every attack
with its warning and answer and plays its sounds.

Assists (Settings → Display): longer warnings add 30% to every telegraph; calm
forces remove Libra's pull (and the Tidecaller's).

## Local co-op

Play → Local Co-op opens device/profile assignment and ready checks. Use one
keyboard/mouse plus a standard-mapped controller, or two standard controllers.
Each player chooses a different local profile. Both ships share the fixed arena
and have independent three-life, weapon, pickup, combo and score state. Ships
pass through each other. P1 uses cyan/diamond cues, P2 amber/square cues.

Friendly fire is off by default and locks at launch. Enabled bullets hit the
first intersected enemy or teammate; protected teammates still intercept shots.
Lasers pierce and damage each intersected target once per discharge. Self-hits
are excluded. Friendly damage can consume shields/lives and reset the victim's
combo, but earns no points or enemy-hit accuracy.

A death clears only that pilot's bullets/echoes/effects and chain. Existing
spawned shots stay in the accuracy denominator. The shared world keeps moving;
a pilot with lives respawns after 500 active ms with two seconds of protection.
Eliminated players spectate. There are no revives; the run ends when both have
zero lives, and results are frozen/saved once.

Exact simultaneous impacts use rotating player priority, then entity identity.
New split fragments enter collision eligibility next tick. If splitting has no
capacity, the rock intercepts the bullet without damage/points/accuracy credit.
A shared pickup moves once and goes to the nearest overlapping living ship,
with rotating priority for ties. Ordinary kills credit their destroying player;
assist point splits and maximum-combo bonuses remain task 7 work.

Either player pauses everyone. Assigned-controller loss pauses and requires
explicit reassignment and a fresh Resume action; an unrelated controller loss
does not pause. Never auto-swap or auto-resume. Settings select the matching
profile for controls/calibration. Results show both players and team score;
team initials/records are separate from solo and from the other FF setting.
