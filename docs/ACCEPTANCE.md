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
| Host boundary | `sh tests/run_host.sh` passed; shared production/ESP32 sources unchanged |
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
| Demo pilot (H4) | `tests/demo.test.mjs`, 2 minutes × 3 seeds headless: at a wall 0–1 % of ticks (was 78–82 %), 90–97 % of shots hit (was 64–74 %); the boss bot's steering is unchanged, so the boss baseline does not move. Rendered: the idle demo flew mid-field with the laser |
| Calmer Home (H1) | Rendered: four menu entries and a How to play link, icon buttons for sound, music and fullscreen (labels and `aria-pressed` kept), Practice as a third Play card; after 30 s without input the demo starts, and a key returns Home with focus on Play. Smoke walk (`dev/smoke.mjs`) passes through the new drill list |
| Menu look (H2) | `tests/audio.test.mjs`: regions open as reached, practice runs do not count, locked looks fall back to Classic, matched music follows the look. Rendered: Celestial frontier behind Settings and Ember orbit behind Home, live while choosing |
| Practice range (H3) | `tests/practice-range.test.mjs`: every rock mode, clamping, rock speed (×1.5 exactly on entry), refill off, Respawn, Next wave, pickups on demand, laser ready, nothing outside practice, and a practice run with tool changes replays tick for tick. Rendered: drill list, Waves from wave 6, T opens and closes the drawer, 3 puts down 2× fire, Escape closes the drawer. Scene golden: only the three new practice fields changed (checked by zeroing them against the old golden) |
| Colour-blind check (R6) | Machado 2009 protanopia, deuteranopia and tritanopia matrices over the dev boss sheets (`boss-states.html`): the Ringwarden's prism sweep, the Sentinel's plate-throw loops and the Bastion's ram lane all stay visible in every simulation, because the marks are light dots read by brightness and shape. The faintest is the Bastion's lane line under tritanopia over the red sky: legible, but the first to strengthen if a player reports it |
