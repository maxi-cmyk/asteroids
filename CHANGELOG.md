# Changelog

Versions before v0.3 were never tagged. Their boundaries below come from the git history and
the plan archives in `docs/nextSteps-*.archive.md`. The web build shows its version and commit
in Settings → About (`web/package.json`, `web/tools/build-info.mjs`).

## v0.3: living bosses (unreleased)

The v0.3 release is waiting on a playtest and the release checks (`nextSteps.md` R1 to R8).

**Bosses**
- Every boss and mini-boss reworked to move and react like a living thing:
  - the Zodiarch is a star dragon that swims, rears, summons creatures and surfaces its pearl
    where each attack comes from;
  - Ninefold walks, runs, leaps and splits;
  - the Sentinel, Ringwarden, Cinderforge, Bastion and Tidecaller each have new motion,
    tells and deaths;
  - the minis were reworked too.
- Readability:
  - blocked-shot sparks on every boss;
  - the Tidecaller's bubble shield is drawn over the bell;
  - a boss-bar pearl for the Zodiarch's window;
  - each zodiac creature has its own idle, tell and recoil;
  - Ascendant: the sign of today's date is thrown first.
- Contact circles measured against the art.
- A hit-circle overlay on the dev sheets.

**Engine and data**
- Deterministic engine: own `sinf`/`cosf`, seeded runs and replays of every run, the same in
  Node, Chrome and JavaScriptCore.
- One save format: export, import and merge every record, unlock and setting in Records.

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
