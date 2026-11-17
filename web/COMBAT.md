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
- R2 / Cross fires once per fresh press, without heat or a primary cooldown.
- Aimed multishot rotates the complete spread. It retains atomic allocation
  and the single-shot fallback when fewer than three bullet slots are free.
- Bullet velocities, swept collisions, muzzle position, and left-edge cleanup
  follow the actual aim direction. Sixteen pixel orientations display the hull.
- Mouse movement or IJKL can aim; the right stick takes priority while deflected.
- Left click fires; hold right click to charge the laser. Mouse buttons release
  safely outside the canvas, and the game canvas suppresses the context menu.

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
but unshielded collisions never consume lives. Shields replenish when neither
stored nor armed. Stationary targets replenish 1.5 seconds after the last one is
destroyed; Reset targets is immediate. Try multishot grants the normal 6-second
effect. Five goals track movement, aiming, primary fire, laser discharge, and
shield arming. Practice has no leaderboard entry path and ends at the menu.

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

Each fight has a signature rule: Sentinel plates open only between attacks;
Ringwarden blades absorb shots and break (the laser pierces both rings);
Cinderforge's shell opens at vents or at panels broken with three hits; Bastion's
bridge takes half damage while a hardpoint lives; Tidecaller's bell is shielded
by bubbles (the laser pops all three); the Zodiarch's pearl opens for 2.5 s every 7 s, sooner
for every creature you break.

The Cinderforge's fire stays. A lob's lava pool (4 s) burns down into **scorched ground** for
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

**The Zodiarch** (the final boss, `native/boss/fights/warden.h`; internal id `warden`) is a star
dragon drawn in constellations (art: `tools/zodiac_art.py`, `tools/starfill.py`). It swims a
figure of eight across the right of the field and its 26 body segments trail the head's path,
so there is no safe spot behind it; its path for the next 0.6 s shows as faint dots. The body
hurts to touch but does not soak shots; the head does. The weak point is the **pearl** under
its chin: it opens for 2.5 s every 7 s (the dragon slows to half speed while it is open) and
the laser reaches it any time. A ring of the twelve zodiac signs turns behind it. It throws
signs: a sign's stars fly out and re-form into its creature over 700 ms (that is the warning)
in front of the coils (x 185 to 215), the creature attacks, then dissolves back into the ring.
Up to one sign is out in phase 1, two in phase 2, three in phase 3 and four in the frenzy,
thrown at least 1.2 s apart, and a compatibility rule keeps the caps: at most one sign that
walls lanes (Gemini, Cancer, Pisces), one charger (Aries, Taurus, Leo), one field effect
(Libra's pull, the black hole) and two ranged signs. Between throws the dragon attacks
itself, holding still while it does. **Every shot and wall leaves a visible point on a
body** (the emitters: `SIGN_EMIT` in `warden.h`, mirrored in `src/boss/scene.mjs`): light
gathers there while it is warned and flashes when it fires. Every creature shows a twinkling
**key star**; three hits (or the laser) break it early, which takes its walls, pull or cord
with it, costs the dragon 2 sub-hits and brings the next pearl window 2 s sooner. A hit that
does not break it makes it flinch; a break cracks it apart from the key star.

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
10 px lethal core), a **meteor fall** of five meteors from the tail fan down pre-drawn curves,
a **constellation net** (three ring stars joined by lines lethal for 1.5 s) and the **starfire
breath** (it stops, opens its jaw and breathes three fanned 230 px lanes, never into the
corners). Phase 1 throws spring and summer (Aries to Virgo), phase 2 autumn and winter (Libra
to Pisces), phase 3 the whole ring. From tier II the frenzy adds the **Great Conjunction**:
three creatures from three sides of the ring, 1.2 s apart.

**Ninefold** (the rift mini-boss, internal id `lensimp`) is a nine-tailed star fox. Its tails
are its health: a hit on any tail reaches the fox, and a tail falls with each ninth of its
health. Losing a tail, or popping both decoys of an illusion, opens the forehead mark for 2.5 s
(the laser reaches it any time). It flicks comets from its tails down aim lines (fewer tails,
fewer comets but faster), sends three homing foxfire wisps, splits into three foxes of which
only the real one has lit eyes (each decoy fires one aimed needle; two hits pop one), and
blinks to another height behind a 500 ms shimmer.

### Difficulty

Measured on 2026-11-13 with the scripted pilot (`node tests/boss-baseline.mjs`: perfect aim, 6 shots
a second, five seeds, boss practice), after bosses started moving (P0.3) and the rift fights were
replaced (P1); every row again on 2026-11-17 after the P2.3 Zodiarch attacks (several signs at
once, its own attacks) and after the pilot learned to keep out of a sweeping beam's whole wedge,
as a person reads it (that moved the Ringwarden, Cinderforge and Tidecaller hit counts a little;
no fairness faults). The pilot keeps out of the space level with or behind a boss, as a sensible player
would. Times are seconds from the start of the fight (the 1.4 s entrance included) to the defeat,
averaged over the seeds; **hits** is how often the pilot was touched (practice loses no lives).
People are expected to take about 1.5× the bot time; that figure is an estimate until the S0.2
playtest records real ones.

| Fight | Tier I | Tier II | Tier III | Hits (tier I / II / III) | Expected person, tier I |
| --- | --- | --- | --- | --- | --- |
| Sentinel | 28 | 46 | 48 | 0 / 0 / 0 | 42 s |
| Ringwarden | 29 | 33 | 34 | 17 / 22 / 21 | 44 s |
| Cinderforge | 36 | 44 | 43 | 12 / 10 / 23 | 54 s |
| Bastion | 44 | 50 | 53 | 0 / 0 / 0 | 66 s |
| Tidecaller | 43 | 48 | 51 | 4 / 4 / 3 | 65 s |
| Zodiarch | 47 | 54 | 54 | 1.4 / 2.4 / 2.4 | 70 s |
| Picket | 18 | 24 | 24 | 0 | 27 s |
| Shardling | 14 | 16 | 16 | 0 | 21 s |
| Cinderling | 10 | 23 | 23 | 0 | 15 s |
| Gunnery | 19 | 23 | 23 | 0 | 29 s |
| Moonjelly | 19 | 22 | 22 | 0 | 29 s |
| Ninefold | 21 | 29 | 29 | 0 | 32 s |

Fairness counters over the same 36 fights (tiers I to III): no lethal hazard without its warning,
no entrance hit, shots never above the cap of 48 (the Tidecaller reaches it), hazards never above
the cap of 6 (the Cinderforge reaches it), and the narrowest safe corridor was 230 px, far above
42. The Zodiarch's creatures and its own attacks stay inside those limits with up to three signs
out (at most four lethal hazards and 41 shots). The Ringwarden hurts the bot most (17 to 22 touches), so expect people
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
frozen copy of its last frame: the Sentinel's plates blast off, the Ringwarden shears and
implodes, the Cinderforge splits on a column of fire, the Bastion breaks in two along a
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
