# UI overhaul acceptance — 2026-10-24

Task 5's implementation is complete. The evidence below distinguishes builds,
simulated flows and browser rendering from physical-device acceptance.

| Check | Evidence / status |
| --- | --- |
| Browser + OLED/HD WASM regressions | 117 checks passed; navigation/history, drafts, pause snapshots, result-before-save ordering, retry/held-input guards, persistence/reset rollback, regions, boss/combat and isolated demo |
| Portable C boundary | Strict C17/pedantic/Werror + UBSan; independent scoring states, rollover, binary codec, stable ties, rejection without mutation and difficulty cap; linked with C++ gameplay harness, passed |
| Production | `npm --prefix web run build`, passed; served existing local preview with no-store headers |
| Firmware | PlatformIO ESP32 build passed; no upload or physical device claim |
| Sound regression | Real WASM game-over pattern finishes in 35 fixed ticks (700 ms including tick quantization); result, scene and simulation snapshot remain identical |
| Music | Original Home/flight two-voice chiptunes; independent opt-in preference; bounded scheduling and pause/hidden/off mute tests passed; warp cue ends on skip/cancel/blur |
| Browser rendering this pass | Safari: Home, Settings/Audio, utility reload, launch, play HUD, Practice, Pause, Help/Back, explicit quit, Practice Results/Home, Records with existing scores, increased zoom. Pause positioning correction rechecked visually |
| Earlier task 4 rendering | Home/launch, Display, fullscreen, zoom and busy synthetic transition/boss fixtures; this is prior evidence, not a new full visual sweep |
| Data compatibility | Same version-1 42-byte leaderboard; same settings key/payload version 2; missing music preference defaults off; reset/failure/migration tests passed |
| Design scanner | 27 findings remain, principally intentional pixel label sizes, tracking/leading and the deliberately dim utility backdrop; no claim of a clean lint audit |

## Remaining hands-on acceptance

- [ ] Physical keyboard/mouse and controller session: light trigger pulls,
      neutral drift, remaps, hold/release, reconnect while holding input,
      device disconnect, focus loss and recovery.
- [ ] Listen to sound/music balance on speakers/headphones and the ESP32 buzzer.
      Automated scheduling and duration checks do not prove listening quality.
- [ ] Full desktop/short-window/fullscreen matrix across all utility/run-end
      states, including storage failures and keyboard focus at high zoom.
- [ ] Sustained frame pacing on a representative laptop versus the original
      starfield; dense rocks, shields, laser and multishot/2x, all five transition
      peaks, missing/late assets, reduced motion and pause during a reveal.

## Refactor boundary

Portable scoring, difficulty and leaderboard state/codec now live in actual C
translation units, compiled as C17 for both host and WASM. Entity physics and
run orchestration still use the existing C++ implementation. This is the staged
extraction required by task 5, not a claim that all firmware is now C.

## Task 6 local co-op — 2026-10-25

Implementation is available in Play → Local Co-op. One shared 480×270 arena,
no split screen. Physical acceptance below remains open.

| Check | Evidence / status |
| --- | --- |
| OLED + HD WASM / browser logic regressions | 133 Node checks passed, including existing solo/practice/navigation/audio/records tests and 16 new co-op/input checks |
| Native co-op ownership and collision tests | Independent movement and fixed projectile pools, timers/echoes, swept friendly interception, protected/shielded hits, simultaneous single payout and pickup collection, local death/respawn, countdown pause and laser cancellation |
| Boss tests | Two-player health latch, alternating locked targets, one laser damage event, independent attribution and unchanged health after death |
| Stress fixture | 10,000 fixed 20 ms ticks (200 simulated seconds) with both players firing multishot/2× every tick; queues ≤4 pending echoes per player, ≤12 active primary projectiles each, hits never exceed spawned |
| Records | Isolated solo/co-op/FF contexts; two individual summaries; team score range, stable ties, save idempotency/failure/corruption, record reset and profile validation |
| Host boundary | `sh engine/tests/run_host.sh` passed; shared production/ESP32 sources unchanged |
| Release build | HD production WASM build passed; test fixture exports remain test-only. Production build removes the optional synthetic-controller HTML harness |
| Browser flow (Helium) | Real application loaded with explicitly synthetic controller fixture: Play/mode selection, device assignment, both ready states, launch/countdown, two-ship shared arena with separate external HUD strips, keyboard movement/fire/pause, controller loss → shared pause → explicit reclaim → deliberate Resume; synthetic P2 move/fire/pause and keyboard Enter Resume |
| Design scan | Scanner run: 28 findings (mostly inherited pixel-font/contrast/leading warnings). No clean accessibility audit claimed. Co-op layout adjusted after rendered review to keep HUD outside arena |

Automated stress is simulation evidence, not a measured physical-controller or
sustained browser frame-rate result. The browser harness overrides Gamepad API
with clearly labeled synthetic pads and does not prove hardware connection.

- [ ] Two people with a physical keyboard/mouse + controller.
- [ ] Two people with two physical controllers, including identical models.
- [ ] Hardware drift/trigger/remapping/reconnect while controls remain held.
- [ ] Full 960×540 / 1440×900 / zoom/fullscreen matrix through Results, initials,
      save failure, utility visits and simultaneous deaths.
- [ ] Sustained frame pacing and CPU/memory measurements on a representative
      browser/laptop under dense combat, bosses, lasers and effects.

## Boss close-out (S0) — 2026-11-02

| Check | Evidence / status |
| --- | --- |
| Pilot re-baseline | `node web/tests/boss-baseline.mjs 5 0,1,2`: all 36 fights (12 fights × tiers I to III, five seeds) beaten, no unwarned lethal hazard, no entrance hit, shots ≤ 48, hazards ≤ 6, narrowest corridor 232 px. Numbers in `web/COMBAT.md` (Difficulty). Automated |
| Warden mirror | `boss.test.mjs`: through 12 laser discharges in two 90 s phase 3 fights, every returned beam is born with its full warning (900 ms, 1,170 ms with long warnings) and never more than one per discharge. Automated |
| Fight log | `fight-log.test.mjs`: off by default, records outcome, seconds, per-phase damage and the attack that took a life, persists, caps at 200, clears. Automated; browser: Settings toggle persists in the settings payload |
| Render stress (S0.3), rendered | `web/dev/stress.html` (`npm run stress`): 48 shots and 6 lethal hazards held on the real engine and renderer for 60 s. Built-in browser pane (Chromium 152) on the developer's Mac, 165 Hz display, **not** a mid laptop: Horizon Warden (since rebuilt as the Zodiarch; not re-measured) phase 3 at a 512×288 canvas, 165 fps, frame work mean 0.6 ms, p99 1.4 ms, max 13.4 ms, intervals over 25 ms: 0. Cinderforge phase 3 at 1385×779: 165 fps, work mean 0.6 ms, p99 1.5 ms, max 11.7 ms, intervals over 25 ms: 0. Both within the 60 fps and 25 ms budget |

- [ ] Stress fixture on a mid laptop and in Safari, at true fullscreen and 125 to 200% zoom (the
      fixture's *Fullscreen run* button), recorded here with the device.
- [ ] Playtest sessions per `docs/PLAYTEST-PROTOCOL.md` (2 to 4 testers) and tuning from the logs.
- [ ] Listening pass over every boss (entrance sting, track, tell tick, defeat sound; track loop
      clicks) and confirmation of the rights to the supplied tracks.

## v0.3 release checks (R3, R6) — 2026-11-20

Device: the developer's MacBook Pro (Apple M4, 16 GB), Safari 27.0.1 and the app's built-in
Chromium 156 pane. This is a fast laptop, **not** a mid one: a mid-laptop run is still open.
Both pages report to the dev server's output when opened with `?check=1` / `?auto=1`.

| Check | Evidence / status |
| --- | --- |
| Replays are the same on every runtime (R3) | `replay.html?check=1`, a 60 s Zodiarch fight replayed on a fresh engine: `1c1ff5e4` for engine `372ef46734400` in Node, Chromium 156 and Safari 27, live and replayed alike. Firefox is not installed on this Mac: **not checked** |
| Compact replay file (R3) | `tests/replay.test.mjs`: the `.astr` file round-trips exactly and replays to the live hash; 60 s of noisy scripted input is 77 kB (242 kB as JSON) |
| Render stress, Zodiarch phase 2 (R6) | `stress.html?auto=1&boss=5&phase=2&seconds=60`, 48 shots and 6 hazards. Chromium at 624×351: 120 fps, interval p99 9.3 ms, frame work p99 2.6 ms, **no frame over 25 ms after the first**. Safari at 1440×810: 165 fps, p99 7 ms, work p99 1 ms; clean until the tab was paused 40 s in, when another page was opened (that pause is the only "over" entry). Pass |
| First frame | The first boss frame takes 31 to 36 ms in both browsers (it builds the glow and outline caches). It happens once, during the boss's entrance, so the stress budget now counts from the second frame and reports the first apart (`firstFrame`) |
| Deploy contents (R6) | `node build.mjs` writes `dist/site/` with only the page, styles, `src/`, assets, `game.wasm` and the licence file; the build fails if a test engine, object file, generated header or dev page would land in it |

- [ ] Stress run on a mid laptop.
- [ ] Replay check in Firefox (`replay.html?check=1`).

## v0.3 polish (H1–H4, R6 colour check) — 2026-11-22

Device and browser as above (the built-in Chromium pane).

| Check | Evidence / status |
| --- | --- |
| Demo pilot (H4) | `tests/demo.test.mjs`, 2 minutes × 3 seeds headless: at a wall 0–1 % of ticks (was 78–82 %), 90–97 % of shots hit (was 64–74 %); the boss bot's steering is unchanged, so the boss baseline does not move. Rendered: the idle demo flew mid-field with the laser. **Bastion fix:** the demo died 15–19 times in 3 minutes to the ram lane (it parked just past the lane's marked end, which moves left with the charging ship) and then chased the last engine below the field; now the ram lane counts to the left edge and an off-field target is not chased: beaten in 28 s with no deaths on 5 seeds (`tests/demo.test.mjs`). Boss bot baseline re-run: unchanged |
| Calmer Home (H1) | Rendered: four menu entries and a How to play link, icon buttons for sound, music and fullscreen (labels and `aria-pressed` kept), Practice as a third Play card; after 30 s without input the demo starts, and a key returns Home with focus on Play. Smoke walk (`dev/smoke.mjs`) passes through the new drill list |
| Menu look (H2) | `tests/audio.test.mjs`: regions open as reached, practice runs do not count, locked looks fall back to Classic, matched music follows the look. Rendered: Celestial frontier behind Settings and Ember orbit behind Home, live while choosing |
| Practice range (H3) | `tests/practice-range.test.mjs`: every rock mode, clamping, rock speed (×1.5 exactly on entry), refill off, Respawn, Next wave, pickups on demand, laser ready, nothing outside practice, and a practice run with tool changes replays tick for tick. Rendered: drill list, Waves from wave 6, T opens and closes the tools panel, Escape closes it. The panel was later cut to Start wave and Fight boss only (2026-11-22), with the buffs left on the bottom bar. Scene golden: only the three new practice fields changed (checked by zeroing them against the old golden) |
| Colour-blind check (R6) | Machado 2009 protanopia, deuteranopia and tritanopia matrices over the dev boss sheets (`boss-states.html`): the Ringwarden's prism sweep, the Sentinel's plate-throw loops and the Bastion's ram lane all stay visible in every simulation, because the marks are light dots read by brightness and shape. The faintest is the Bastion's lane line under tritanopia over the red sky: legible, but the first to strengthen if a player reports it |

## v0.3 leftovers and release prep (R8) — 2026-11-23

Device and browser as above (the built-in Chromium pane, M4 MacBook Pro).

| Check | Evidence / status |
| --- | --- |
| Menu look contrast (R6 leftover) | Each region's still, with its veil composited at the lightest alpha any menu uses (`d9`), compared with the menu text colours on the **brightest pixel** of the still (the worst case for light text). Ink `#eef2ff` 9.98 to 12.19:1, muted `#aab6dc` 5.55 to 6.77:1 (Ember is lowest), accent `#6ef0ff` 8.28 to 10.11:1; AA needs 4.5:1. Home, whose veil is a left-to-right gradient, was measured on the live page under each menu entry and the How to play link: lowest 4.70:1 (Hangar on Ember), How to play 4.71 to 5.00:1. The title is large gradient text in the darkest part of the veil and was not computed. No look fails AA, so no veil was changed |
| First-run How to play (polish leftover) | `tests/home.test.mjs` (first run = no real run on either profile; practice never ends it). Rendered with an empty save: the link is amber (`#ffd68c`) with a pulsing underline; after opening How to play and returning Home it is the quiet colour again. The state is per visit, so a reload with still no records highlights it again; nothing new is saved. Reduced motion stops the pulse |
| Practice Waves drill (polish leftover) | Decision: rocks only. Bosses and mini-bosses stay in the Boss drill (kind, tier, phase), so a Waves run never mixes the two engine modes. The drill card now says so |
| Folders and builds (B1) | After the `engine/` and `firmware/` move: `npm run check` (293 tests, 0 lint errors, no golden changed), `sh engine/tests/run_host.sh`, `pio run` (flash 789,169 bytes, same as before the move) |
| Render stress, Zodiarch phase 2 | Not a valid pass this pass. The app throttles the built-in pane once the Claude window is not in view. One 60 s run was clean for 4,109 frames (frame interval p99 6.8 ms, frame work mean 0.9 ms, none over 25 ms) and then stalled for about 6 s in its last frames, so the tool marked it failed; two other runs were throttled from the start. The 2026-11-20 result above stands. Run `npm run stress` with the window in front |

- [ ] Stress run in a watched window, then on a mid laptop.
- [ ] Replay check in Firefox (`replay.html?check=1`).

## Campaign Act 1 (C1) — 2026-11-23

Device and browser as above (the built-in Chromium pane, M4 MacBook Pro). Nothing here was tried on a controller or on two real input devices.

| Check | Evidence / status |
| --- | --- |
| Levels, clear and fail | `tests/campaign.test.mjs`: the table (waves, regions, minis, bosses), each level's start (wave, lives, ×1, no pickups), every level cleared by the scripted pilot with the mini and boss both defeated and the wave counter held at the boss's wave, a failed level going to game over without the initials entry, and nothing written to the leaderboard or Endless bests |
| Stars, progress, save | The three star rules at the par boundary; level 1 open, each clear opening the next, level 6 opening Endless; a failed level changing nothing; best stars, lowest time, highest score; a storage failure keeping progress for the visit; the returning-player floor and Endless from wave 30 (practice ignored, kept after a records reset); clearing records clearing the campaign; save round trip, merge (twice is a no-op), parse of a save from before the campaign |
| Replays and co-op | A level replays tick for tick on a fresh engine; a co-op level credits both profiles with their own stars (player two lost every life and has no flawless star), writes no co-op board entry, and a lost co-op level reaches the level result, not the initials |
| Scene golden | New `levels` (each level from its first wave) and `levelCoop` scenarios; every older entry is unchanged |
| Screens, rendered | Play with the locked Endless card and the pilot switch; the level select with cleared, open and locked cards; the Records Campaign tab; Level 1 starting from the card with the warp, the HUD label "Level 1 · Act 1", and Restart level from Pause; the level result for a level 6 clear (three stars, "Act 1 complete · Endless unlocked", no Next level) and a failed level (Retry and Level select only); two pilots reaching the lobby and Back returning to the level select; Endless starting a normal solo run once Act 1 is finished. The results were produced by flying real levels in a second engine in the page and rendering them in the live overlay |
| Existing flows | `npm run check` (315 tests), `sh engine/tests/run_host.sh`, `pio run` (flash 789,181 bytes), the release build (`dist/site` has the new stylesheet, view and modules) |
| Found on the way | A pre-existing replay flake (the collect-cue position leaking between runs, about 1 in 80 of the replay test) was found and fixed in `engine/src/powerup.cpp` |

- [ ] Play Act 1 by hand with a keyboard and a controller; check par against real play times (R1).
- [ ] Two real input devices through a co-op level, including Retry and Next level.


## Ship customisations — automated evidence, 2026-11-23

- [x] Enumerated all 216 loadouts: valid launch, primary fire, secondary activation, bounded
  pools, finite extended scenes and exact replay through the full appended loadout scene.
- [x] The scripted pilot clears all six campaign levels with the starter kit and persists
  their kit grants; this is automated reachability evidence, not human balance acceptance.
- [x] Every primary family damages every boss family through its mechanic route; accuracy
  stays at or below actual projectile spawns.
- [x] Distinct weapon patterns and damage, charge/cooldown values, pause, death cancellation,
  queued-burst accounting, immutable active kits, Retry capture and independent co-op states.
- [x] Starter defaults, first-clear grants to both profiles, locks, migration, save export/import/
  merge, refused writes and locked Hangar previews that grant/equip nothing.
- [x] Existing legacy scene goldens remain unchanged over their original ABI prefix; class
  headers for all 18 ships/weapons compile independently for WebAssembly.
- [ ] Browser visual inspection of the new Hangar. Browser connector was unavailable; native
  browser actions were blocked by desktop state changes. No screenshot verification claimed.
- [ ] Physical keyboard/controller session, two-device co-op and final human balance pass (R1).

The Hangar redesign is HG1 before S2. Implementation checks are separate from the deferred
human playtest; this evidence does not mark R1 complete.

Final implementation checks: `npm run check` passed all 334 tests (zero lint errors; six
existing unused-variable warnings), strict host checks passed, and all 18 class headers
compiled independently. The production package contains 261 files and no tests, tools, dev
pages, test engines or object files. `npm test` now rebuilds production WASM as well as both
test engines, preventing stale production binaries from invalidating replay checks. The
Impeccable detector reported only the existing pixel-theme heading gradient.

## HG1 carousel, ship drafts and paint — 2026-11-23

`npm run check`: 338 tests pass, zero lint errors (six existing warnings). New checks cover
preview versus equip, slot/profile isolation, locked options, bounded carousel selection,
paint migration, import/export/merge, storage refusal, preservation of glass/metal/fire/alpha,
six distinct RGBA PNG files and a screen-level control smoke test. PNG inspection confirms
real transparent pixels in all six 1536×1024 drafts. The production package contains all six
drafts and the slider/paint/equip controls. Impeccable reports no findings on the new surface.

Browser access host is unavailable. No rendered screenshot, touch session or physical
controller acceptance is claimed; those remain under HG1 before S2. Draft artwork approval
and matching gameplay aiming sprites are also pending.

## Per-ship state drafts — 2026-11-23

Ten focused Hangar/asset checks pass, plus targeted ESLint. Each of the six new state sheets
contains 16 distinct nonempty orientations, no partial alpha and at most eight flat colours.
Manifests retain right-facing index 0 and clockwise 22.5° steps; all sprite/icon cells fit.
Comet preserves its old sheet row exactly. The old shared `ships.png` is removed and loader
references use individual sheets. Visually inspected the combined review PNG. No gameplay
build, browser rendering or physical-input acceptance is claimed for these drafts.

## Restored local playtesting — 2026-11-23

Cleanup removed `web/dist/game.wasm`, causing the Home menu to show Reload. Rebuilt the
game, verified the local server downloads the WASM, and used Helium to reload the page,
choose Play → Campaign → Level 1, and observe PLAYING with three ships. All 339 automated
tests pass. The local server now rebuilds missing WASM before listening, so a fresh checkout
or generated-output cleanup does not require a separate manual build command. This launch
smoke test is not the deferred human balance/input or full Hangar acceptance pass.

## Desktop Home composition — 2026-11-23

Centered the title, subtitle, menu and How to play as one group. Tightened menu rows and
placed the selection chevron beside its label. Moved the flare and flyby to the right so
they do not cross menu text, and centered the dark veil for region menu looks. Removed the
duplicate menu sizing override from refinements.css. Visually inspected the desktop Home
in Helium. Mobile preview was explicitly excluded by the user. Home checks, formatting,
targeted lint and production packaging pass; gameplay rules are unchanged.

## Reference showroom Hangar — 2026-11-23

Replaced the centered composition with the supplied reference: one header, specification
sidebar, large single-ship preview, six thumbnail cards, slider and equipped three-slot
dock. Paint remains in the sidebar. Cleared canvas defaults and constrained preview geometry
to its own area so ship art cannot overlap the name/stats. Test loadout opens in that area.

Observed in Helium desktop: Dart preview and correct stats while the dock still shows
equipped Vanguard; locked Moth preview and disabled equip; Primary selection; test-range
overlay and a final clean showroom screenshot. No profile equipment was changed by these
checks. The screen test also covers horizontal-wheel browsing without equipping.
Mobile review was excluded as requested. Physical-controller acceptance and final balance
remain pending. Build, lint, layout detector and automated checks pass.
