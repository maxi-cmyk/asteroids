# Changelog

Versions before v0.3 were never tagged. Their boundaries below come from the git history and
the plan archives in `docs/nextSteps-*.archive.md`. The web build shows its version and commit
in Settings → About (`web/package.json`, `web/tools/build-info.mjs`).

## v0.4: the campaign (unreleased)

Built so far: **C1, Act 1** (`nextSteps.md`). Endless with prestige, achievements and Act 2 follow.

**Campaign Act 1**
- Six levels, one for each region. Each is five waves (rocks, rocks, the mini-boss on wave 3,
  rocks, the region's boss on wave 5), three lives, and ends when the boss falls.
- Three stars a level: clear it, clear it without losing a life, clear it under par time.
  Best stars, time and score are kept per profile and shown on the level select and on
  Records → Campaign. A level opens when the one before it is cleared; clearing level 6 opens
  Endless. A save from before the campaign opens the levels its earlier runs reached.
- Play is now Campaign, Endless (locked until Act 1 is finished) and Practice, with a switch
  for one or two pilots. Local co-op plays the campaign too: the level counts for both
  profiles, each with their own stars.
- The level select, the level result (stars, time against par, what it unlocked; Next level,
  Retry, Level select) and Restart level in the pause menu.
- A level run never touches the Endless leaderboard or personal bests; it does count boss
  defeats, so mini-bosses earn hulls in levels too.
- Help covers the campaign, the stars and Endless. `tests/level-baseline.mjs` flies every level
  with the scripted pilot (par is its time × 1.5).

**Fixed**
- A pickup collected in one run left its collect-cue position in the next run's scene, so a
  replay on a fresh engine could differ from the live run (about 1 run in 80 in the replay test).

**Engine**
- A new `level-clear` state and nine `LEVEL_*` scene fields; `web_start_level`. The handheld
  firmware is unaffected (one inert enum value).

## v0.3: living bosses (unreleased)

The v0.3 release is waiting on a playtest and the release checks (`nextSteps.md` R1 to R8).

**Bosses**
- Every boss and mini-boss reworked to move and react like a living thing:
  - the Zodiarch is a star dragon that swims, rears, summons creatures and surfaces its pearl
    where each attack comes from;
  - Ninefold walks, runs, leaps and splits;
  - the Sentinel, Ringwarden, Cinderforge, Bastion and Tidecaller each have new motion,
    tells and deaths; the Bastion's ramming run varies (lanes near you, sloping lanes, a
    second pass) and it banks both ways;
  - the minis were reworked too.
- Readability:
  - blocked-shot sparks on every boss;
  - the Tidecaller's bubble shield is drawn over the bell;
  - a boss-bar pearl for the Zodiarch's window;
  - each zodiac creature has its own idle, tell and recoil;
  - Ascendant: the sign of today's date is thrown first.
- Contact circles measured against the art.
- A hit-circle overlay on the dev sheets.

**Menus and practice**
- A calmer Home: Play, Hangar, Records and Settings, a How to play link, and icon buttons for
  sound, music and fullscreen. Practice is a card on the Play screen, and the demo plays by
  itself after 30 s on Home (or from Help).
- Menu look: the menus can show the sky of any region you have reached, and the menu music
  can follow it.
- The practice range: drills (targets, real waves from any wave, an endless stream, any
  boss), and a small tools panel in flight (T or View / Select) to start any wave or fight any
  boss. Practice runs replay exactly.
- The Home demo pilot no longer hugs the walls, wastes shots or dies to the Bastion's ramming run.

**Engine and data**
- Deterministic engine: own `sinf`/`cosf`, seeded runs and replays of every run, the same in
  Node, Chrome and JavaScriptCore.
- One save format: export, import and merge every record, unlock and setting in Records.

**Polish**
- On a first run (no finished run on either profile) How to play is highlighted on Home until
  you open it.
- The Waves practice drill says it is rocks only; bosses are in the Boss drill.
- Menu looks measured against WCAG AA text contrast on every region; none needed a change.

**Repository**
- The shared game moved to `engine/` and the ESP32 code to `firmware/`; `main` is deployed and
  `dev` is staging, with CI on both (`docs/SETUP.md`). No gameplay change: the goldens did not
  move and the handheld build is the same size.

**Release hygiene**
- Developer tools exist only on the local dev server.
- The release build refuses to ship dev pages, drafts or test engines, and writes a clean
  `dist/site/` to deploy.
- Version and build id in the page, Settings → About and save files.

## v0.2: the web version (2026-10-19 to 2026-11-02)

- The game in the browser: the C++ engine compiled to WebAssembly with an HD renderer, menus,
  keyboard, mouse and controller input, and the Home demo.
- Bosses and mini-boss fights in every region, with tiers, practice and a field guide.
- Local co-op for two players.
- Hangar and unlockable hulls, records and per-profile settings.
- Regions with their own backgrounds, soundtracks and menu themes.
- The 2026-10-26 refactor:
  - the scene ABI as one layout table;
  - the app, runtime, renderer, boss engine and CSS split into modules;
  - scene, render and sound golden tests.

## v0.1: the handheld game (2026-10-13 to 2026-10-18)

- Asteroids on the ESP32 with an OLED display and a motion-controlled ship.
- 2D movement, a score multiplier and rising difficulty.
- A top-five highscore table with initials.
