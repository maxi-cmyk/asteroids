# Next steps archive — 2026-11-23

Archived when the active roadmap was reordered to finish gameplay before LAN and website work.
This is the complete pre-rewrite snapshot, including its pending work and historical assumptions;
its unchecked tasks are not claims of completion. The current priorities and remaining tasks live
in [nextSteps.md](../nextSteps.md). **R1 remains incomplete and is deferred until after features,
before LAN and public publishing.**

Completed work removed from the active checklist:

- Music rights and code licence checks, as marked complete in the previous plan.
- Menu contrast, first-visit Help highlighting, and the rocks-only Waves drill.
- The engine/firmware folder split, dev branch, branch/folder documentation, and CI workflow authoring.
  A verified GitHub CI run and branch protection remain pending.
- The recorded local web, engine-host and firmware checks. These are past evidence, not exemptions
  from checks on future changes. The old formatting blocker is resolved: the full web Prettier
  check passed again during this rewrite.
- Campaign Act 1: level starts and endings, stars, progress and saves, returning-player migration,
  mode and level selection, results, restart, Records, Help, co-op credit and automated tests.
- The Act 1 gate on Endless, which had also appeared as an unchecked duplicate under C2.
- Results redesign: large stars, Act/Level label, numeric time target, no player suffix or
  boss-sequence line, action hierarchy and reduced-motion handling.
- Revised second star: 3+ final lives per pilot; earned lives offset losses. Campaign bosses and
  minis drop no hearts. Production/test WASM builds and all 318 browser/engine tests passed.

Not completed: R1 human playtesting/tuning, real keyboard/controller and two-device campaign
acceptance, rendered verification of the latest results layout, mid-laptop stress, Firefox replay,
GitHub CI verification, release tagging, or the planned ship/weapon loadout system.

---

## Original roadmap snapshot

# Next steps

Rewritten 2026-11-22 to hold only what is left to do. The plan before this rewrite, with
everything built for v0.3 (R2 to R7 and their notes), is in `docs/nextSteps-2026-11-22.archive.md`;
older plans are in the other `docs/nextSteps-*.archive.md` files. The rules as built live in
`web/COMBAT.md`, art in `web/assets/ART.md`, code layout in `web/ARCHITECTURE.md`, design
reasons in `DESIGN-DECISIONS.md`, network and security in `docs/NETWORK-AND-SECURITY.md`,
evidence in `docs/ACCEPTANCE.md`, and what changed per version in `CHANGELOG.md`.

**Where things stand:** v0.3 (every boss upgraded, deterministic replays, one save format,
version and build id, release checks, a calmer Home, menu looks, the practice range and a
fixed demo pilot) is built and waiting on a second playtest, tuning and a
few checks only you can do. Then tag it, then **v0.4 Campaign** (Act 1 first, then Endless), **v0.5 LAN** and **v0.6 web**.

**Contents:** Roadmap · v0.3 release (R1, R6, polish leftovers, R8, later) · B1 Branches and folders · v0.4 Campaign (C1 Act 1,
C2 Endless, C3 Act 2, C4 Achievements) · S2 Combo bonuses · The three ways to play together ·
v0.5 LAN (S3, S4) · v0.6 Web (W1 static site, W2 online
rooms, W3 accounts) · S6 Versus · S7 Modifiers · S8 ESP32 handheld · Standing rules ·
Open decisions · Tools

---

## Roadmap

| Version | Stage | Goal | Depends on | Size |
| --- | --- | --- | --- | --- |
| **v0.3** | R1 | Second playtest, tune from the logs, answer the design questions | people | M |
| v0.3 | R6 | Release checks left: music rights, licence, mid-laptop stress, Firefox replay | you | S |
| v0.3 | B1 | Branches `main` (deployed) and `dev` (staging); shared code in `engine/`, ESP32 in `firmware/` | none | S |
| v0.3 | R8 | Tag `v0.3.0` | R1, R6, B1 | S |
| **v0.4** | C1 | **Campaign Act 1** (main focus): 6 levels, stars, level select | R8 | L |
| v0.4 | C2 | Endless with prestige and the new rock types; opens after Act 1 | C1 | L |
| v0.4 | C4 | Achievements, with a 0.5 s trophy toast and a Records tab | C1 | M |
| v0.4 | S2 | Maximum-combo bonuses (in the engine before the protocol is frozen) | none | M |
| **v0.5** | S3 | Network foundation: headless engine, snapshot codec, protocol | none | L |
| v0.5 | S4 | LAN co-op on two machines | S3 | XL |
| **v0.6** | W1 | Public site on Vercel: solo and local co-op, no server | R8 | S |
| v0.6 | W2 | Online rooms on Railway (the LAN server in a container, Redis beside it) | S4 | L |
| v0.6 | W3 | Accounts, cloud saves and verified leaderboards (optional, decide first) | W2 | L |
| later | C3 | Act 2: the new rock types and new bosses you design | C2 | XL |
| later | S6 | Versus | S4 (W2 for online) | M |
| later | S7 | Run modifiers | S2 | M |
| later | S8 | Barebones single-player ESP32 build | S2 | L |

W1 can ship as soon as v0.3 (or v0.4) is tagged: the game runs entirely in the browser, so a public page
needs no server. S8 never touches the network code and can start any time after S2.

---

## v0.3 release: what is left

### R1. Playtest and tune

- [ ] **Second playtest** (2–4 people; `docs/PLAYTEST-PROTOCOL.md`; the fight log exports
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
- [ ] **Design questions:**
  - Event pull: keep or cut (calm forces already removes it).
  - Mini-boss on first runs: strictly on wave 3 (proposed), or an earlier one too?
  - Boss practice picker: bosses and mini-bosses together, tagged (proposed)?
- [ ] **Only if the playtest asks for them:**
  - **The fox run** for Ninefold, if the fight needs more variety.
  - **A boss backstop barrier**, if someone finds a safe spot behind a boss.

### R6. Release checks left (before anything is public)

- [x] **Music rights** (open decision 8): confirm or replace every supplied track before W1.
- [x] **Licence** (open decision 27): choose one for the code (or "all rights reserved") before
  the repo or site is public; list third-party fonts and sounds with their licences.
- [ ] **Stress on a mid laptop:** so far only an M4 MacBook Pro.
  `stress.html?auto=1&boss=5&phase=2&seconds=60` reports to the dev server's output.
- [ ] **Firefox replay check:** open `replay.html?check=1` in Firefox once; it should give the
  same hash as Safari, Chromium and Node (`docs/ACCEPTANCE.md`).

### v0.3 polish leftovers (H1–H4 built 2026-11-22; plans in the archive)

- [x] **Menu look:** contrast measured on every region (2026-11-23): all pass AA, lowest 4.70:1
  on Home and 5.55:1 elsewhere; no veil changed (`docs/ACCEPTANCE.md`).
- [x] **Home:** How to play is highlighted on a first run until it is opened (per visit, nothing
  saved).
- [x] **Practice:** the Waves drill stays rocks only; bosses are in the Boss drill (decided
  2026-11-23; the drill card says so).

### R8. Tag v0.3.0

- [x] `npm run check` (293 tests), `sh engine/tests/run_host.sh` and `pio run` pass (2026-11-23);
  README, COMBAT, Help and `CHANGELOG.md` are up to date.
- [ ] **You:** the stress run. I could not get a valid one: the app throttles the built-in pane when
  the Claude window is not in view. Run `cd web && npm run stress`, open
  `stress.html?auto=1&boss=5&phase=2&seconds=60` with the window in front, and expect no frame
  over 25 ms after the first.
- [ ] **Before the tag:** R1 (playtest and tuning) and the R6 checks left (mid-laptop stress,
  Firefox replay); change the CHANGELOG heading from "(unreleased)" to the date and drop its
  "waiting on a playtest" line; commit on `dev`.
- [ ] **You:** release it: pull request `dev` → `main`, merge with a merge commit, `git tag v0.3.0`
  on `main`, push the tag.

### Later, not blocking

- [ ] **M5 art tools** and **M8 shared C++** (`engine/src/asteroid.cpp`, `engine/src/game.cpp`; carefully,
  the ESP32 shares them). The plan for both is in `docs/nextSteps-2026-11-19.archive.md`.

---

## B1. Branches and folders: main, dev, engine/, firmware/ (planned 2026-11-22)

**Goal:**
- **`main`:** what is deployed: the site on Vercel and, from v0.6, the room server on Railway.
  Nothing lands on it except a release from `dev` or a hotfix, and every merge is tagged.
- **`dev`:** the staging version, and where daily work goes. Its own Vercel staging URL, and later
  a Railway staging environment.
- **The ESP32 handheld** stays in the same branches, in its own `firmware/` folder.

Decided 2026-11-22: folders, not a `hardware` branch.
- **Little to move.** The web build compiles the firmware's game code (`web/native/bridge.cpp`
  includes `src/game.cpp`, `asteroid.cpp`, `ship.cpp` and the rest; `build.mjs` adds
  `src/display.cpp`, `src/sound.cpp`, `src/core/*.c` and `include/config.h`). That code is in
  `game.wasm`, so it is deployed anyway. Only `platformio.ini`, `src/main.cpp`,
  `src/rock_random.cpp` and the ESP32 docs are handheld-only.
- **No drift.** In one branch, CI builds both targets on every push, so a shared-code change
  that breaks either one fails at once.
- **Deploys go by path, not by branch.** Vercel builds and serves only `web/dist/site`.
  Railway restarts only when its watch paths change. Files in `firmware/` never reach players.

Today everything is on `main`, nothing is deployed, and nothing has been committed since `v0.3`,
so this costs nothing yet. Do it before R8, so `v0.3.0` is the first tag released from `dev` to
`main`.

**Layout after B1:**

| Folder | Holds | Built by |
| --- | --- | --- |
| `engine/src/`, `engine/include/`, `engine/core/` | The shared game: today's `src/*.cpp` (less the two below), `include/`, `src/core/` | the web build and PlatformIO |
| `engine/tests/` | Today's `tests/host/` and `run_host.sh`: the shared code tested on a PC | CI |
| `firmware/` | `main.cpp`, `rock_random.cpp`, and `HARDWARE.md` (wiring, parts, flashing: the ESP32 parts of SETUP and README) | PlatformIO |
| `platformio.ini` (repo root, where `pio` looks) | `[platformio] src_dir = firmware`; `build_flags = -I engine/include`; `build_src_filter = +<*> +<../engine/src/> +<../engine/core/>` | PlatformIO |
| `web/` | The site, and later `web/server/` (decision 2) | Vercel, Railway |

**Steps** (one sitting):
- [ ] **Baseline:** commit the work in progress (the v0.3 polish) on `main`. **You:** not committed
  yet, so commit the polish first and the move as a second commit (the renames are staged by
  `git mv`; `git reset` them first if you want the polish alone). Before the move, `sh tests/run_host.sh`
  and `pio run` passed; `npm run check` was not run before it (see the prettier note below).
- [x] **Move to the layout above** in one commit, with `git mv` so the history follows. Done
  2026-11-22, staged and not committed. `sh engine/tests/run_host.sh` passes, `pio run` builds with
  the same flash size (789,169 bytes) as before, and `npm test` passes (291 tests, goldens
  unchanged), `eslint` has 0 errors. `build_src_filter` reaches outside `src_dir`, so the
  library fallback below was not needed. `docs/SETUP.md` was split: the ESP32 wiring and flashing
  are in `firmware/HARDWARE.md`, and `docs/SETUP.md` now covers folders, commands and branches.
  - Update the paths in `web/build.mjs`, `web/native/bridge.cpp`, `web/native/config.h`,
    `run_host.sh`, `tools/format-core.sh` and `platformio.ini`, and in the docs: README, SETUP,
    `web/ARCHITECTURE.md`, `DESIGN-DECISIONS.md`, and the ACCEPTANCE commands.
  - It is a move, not a change: every check passes, `pio run` builds, and no golden file moves.
    If `build_src_filter` will not reach outside `src_dir`, fall back to `engine/` as a
    PlatformIO library (a `library.json` in `engine/`, plus `lib_extra_dirs`).
- [x] **Branch `dev`** from `main`, pushed (2026-11-23).
- [ ] **On GitHub:** **You** (needs your account).
  - **`main` stays the default branch** (decided 2026-11-23). Vercel's Production Branch is its own
    setting, so it does not depend on this; keeping `main` as the default just means the repo page
    and clones show what is released. The cost: a pull request opens against `main` unless you pick
    `dev` (`gh pr create --base dev`), so say "base `dev`" when asking Claude for one.
  - Protect `main`: changes only by pull request, checks must pass, no force-push, no
    deletion.
  - Protect `dev` from force-push and deletion only; you can still push to it directly.
- [x] **CI** (GitHub Actions, `.github/workflows/check.yml`), written 2026-11-22 and **not yet run
  on GitHub** (LLVM on Linux is `apt install clang lld`; confirm `wasm-ld` is found). On every push and
  pull request to `dev` and `main`, it runs:
  - `npm ci && npm run check` in `web/`, on Linux with LLVM installed (this also answers the W1
    build question);
  - `sh engine/tests/run_host.sh`;
  - `pio run` (cache `~/.platformio`). It runs only when `engine/`, `firmware/` or
    `platformio.ini` changed, but it is always required on `main`.
- [x] Note the branches and folders in README and `docs/SETUP.md`, and save the workflow below
  as a memory, so Claude sessions start from `dev`. Done.
- [ ] **Fix before CI can be green: `npm run check` fails at `prettier --check` on 12 files,
  already at the committed `v0.3`** (for example `styles/theme/base.css` wants a long
  `--font-body` value on one line; also `region-painters.mjs`, `tests/audio.test.mjs`, six more theme
  CSS files). Run `npx prettier --write "**/*.{mjs,css}"` in `web/` and commit it on its own,
  or CI will fail on its first run. Not done here because it rewrites files that hold your
  uncommitted work.

**Day-to-day workflow:**
- **Work:** on `dev`, either directly or on a short branch (`feat/act-1`, `feat/handheld`)
  merged back by pull request.
- **Release:**
  1. Open a pull request `dev` → `main`.
  2. CI passes; you check the staging URL.
  3. Merge with a merge commit, not a squash, so `dev` and `main` never drift apart.
  4. Tag the merge on `main` (`v0.4.0`) and add the `CHANGELOG.md` entry.
- **Hotfix:**
  1. Branch from `main` (`fix/…`) and open a pull request to `main`.
  2. Tag the patch release.
  3. Merge `main` back into `dev` straight away.
- **Handheld (S8):** an ordinary feature branch off `dev`. The firmware gets no deploy, so its
  "release" is a tag and a flashed board, noted in ACCEPTANCE.

**Deploys (wired up in W1 and W2, not now):**

| Branch | Vercel (the page) | Railway (rooms, from W2) |
| --- | --- | --- |
| `main` | Production branch, the public domain | `production` environment, its own Redis |
| `dev` | Preview with a fixed alias, e.g. `staging.<domain>`, behind deployment protection | `staging` environment, its own Redis |
| `feat/*`, `fix/*` | Preview URLs, protected (or turned off) | none |

- **Vercel:** builds only `web/` (W1), so a commit that only touches `firmware/` changes nothing
  served. Add an ignored-build step (`git diff --quiet HEAD^ HEAD -- web engine`) so such a
  commit does not even build.
- **Railway:** set each service's watch paths to `web/server/**`, `engine/**` and the
  `web/native` files the headless engine uses. A CSS-only or firmware-only release then does
  not restart rooms.
- **Data:** staging and production never share Redis or, with W3, Postgres.

**Done when:**
- `main` and `dev` exist, with `main` protected (and still the default);
- the `engine/` and `firmware/` layout builds on both targets, with no golden file moved;
- CI is green on both branches;
- `v0.3.0` went from `dev` to `main` by pull request and is tagged on `main`.

---

## v0.4 Campaign (planned 2026-11-22)

The game becomes a **campaign of levels** plus an **Endless** mode. **Act 1 is the main
focus**; Endless opens once Act 1 is finished; Act 2 comes after Endless, reusing its new rock
types, with new bosses you design then.

| Mode | What it is |
| --- | --- |
| **Act 1** | 6 levels, one per region, each the current 5-wave layout: rocks, rocks, mini-boss on wave 3, rocks, boss on wave 5 |
| **Endless** (C2) | today's run with prestige; opens after Act 1 |
| **Act 2** (C3) | 6 more levels, same layout, the new rock types, new bosses |

### C1. Act 1 (main focus)

**Status 2026-11-23: built on `dev`, uncommitted.** Open: play it by hand with a keyboard and a
controller and check par against real play times (R1); a co-op level on two real input devices
(`docs/ACCEPTANCE.md`). Small known gap: on Records → Campaign the "Reset this profile's personal
bests" button still resets only the Endless bests (Clear this browser's records does clear the campaign).

| Level | Region | Waves | Mini (wave 3) | Boss (wave 5) |
| --- | --- | --- | --- | --- |
| 1 | Celestial frontier | 1–5 | Picket | Sentinel |
| 2 | Violet orbit | 6–10 | Shardling | Ringwarden |
| 3 | Ember orbit | 11–15 | Cinderling | Cinderforge |
| 4 | Ruined moon | 16–20 | Gunnery | Bastion |
| 5 | Lunar passage | 21–25 | Moonjelly | Tidecaller |
| 6 | Outer rift | 26–30 | Ninefold | Zodiarch |

**Length:** a level should take a person about **3 minutes**. The demo pilot clears a region
in about 45–60 s, and people are expected to take 1.5–2.5× the bot, so today's waves are close.
Add the levels to the baseline tool (`tests/boss-baseline.mjs`) and check them in the R1
playtest; trim or pad waves only if a level runs far off 3 minutes.

**Engine** (most of it exists: boss practice already starts at any wave):
- [x] `web_start_level(act, level, players)`: start at the level's first wave in its region,
  3 lives, ×1 multiplier, the wave difficulty of those wave numbers, bosses at tier I.
  Recorded in replays (a level is one short replay, which W3 can re-run cheaply). **Done 2026-11-23:** `web_start_level(level, players, friendly)`; the `act` argument arrives with Act 2 (C3). Recorded in replays (`COMBAT.md`, Campaign levels).
- [x] The level ends when the wave-5 boss falls: a new `level-clear` state with time, score,
  lives lost and hits taken in the scene (named in `scene-layout.mjs`; golden updated).
  Losing the last life ends the level (retry), never the act. **Done:** state 8 `level-clear` after the boss's 3.2 s death; the `LEVEL_*` scene fields are in `scene-layout.mjs` and covered by new scene-golden scenarios (`levels`, `levelCoop`); older goldens did not move.
- [x] Practice and the demo stay as they are.

**Stars** (3 per level, 18 in Act 1):
- [x] Clear the level · finish with 3+ lives remaining (earned lives offset losses) · finish under the time target. Campaign bosses and mini-bosses drop no hearts. Par is set
  from the bot's level time × 1.5, rounded, and tuned after the playtest. **Done:** par is 75, 90, 115, 110, 95 and 115 s for levels 1–6 (`PAR_SECONDS`); tune after the playtest.

**Progress and saves:**
- [x] Level 1 is open; each clear opens the next; clearing level 6 finishes Act 1 and opens
  Endless.
- [x] Per profile and level: best stars, best time, best score. A new part of the R4 save;
  merging keeps the best of each. **Done:** `asteriods.web.campaign-v1`, in the save (export, import, merge).
- [x] **Returning players:** a save whose highest wave is already past a level's boss opens
  the levels up to there (no stars given); one that reached wave 30 also opens Endless.
- [x] Hull unlocks come from mini-boss defeats in levels and in Endless (never practice). **Done:** the existing unlock toast reads the scene's defeated mask in non-practice runs, so levels earn hulls with no new code. **To be replaced:** Ship customisations below moves unlocks to first level clears and adds independent primary and secondary weapon unlocks.

**Screens:**
- [x] **Play** (with H1): **Campaign**, **Endless** (locked until Act 1, with the reason), and
  **Practice**; one or two pilots chosen as today. **Done:** three cards plus a One pilot / Two pilots switch; Endless shows "Finish Act 1 to unlock" until it opens.
- [x] **Level select:** the six levels as cards on a path, each with its region's backdrop,
  mini and boss silhouettes, stars, best time and score; locked ones dimmed. Mouse, keyboard
  and controller. **Done:** six cards (region sky, mini and boss silhouettes that turn to colour once beaten, stars, best time and score, locked ones dimmed); mouse, keyboard and the d-pad use the same menu navigation as the other screens (a controller was not tried).
- [x] **Level clear:** stars earned one by one, time against par, score; **Next level**,
  **Retry**, **Level select**. A failed level offers **Retry** and **Level select**. **Done** as the results overlay in a level layout (stars light one by one, time against par, score, what it unlocked).
- [x] **Pause:** gains **Restart level**.
- [x] Records: a Campaign tab (per level bests and stars) beside the Endless tables (today's
  top-five tables become Endless's). **Done:** the Solo chip is now Endless.
- [x] Help: campaign, stars and Endless in a few sentences each.

**Co-op:** both modes for two players; a level cleared together counts for both profiles, each
with its own stars.

**Tests (done: `tests/campaign.test.mjs`, `tests/campaign-ui.test.mjs`, `tests/level-baseline.mjs`):** each level starts at the right wave, region, mini and boss; clear and fail
detection; each star rule; progress unlocking; the returning-player migration; save merge; a
level replay round-trips; co-op credit.

### C2. Endless mode with prestige (planned 2026-11-22, was H5)

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
| 1 | **Comet** | small, fast, straight; a glowing streak warns of its line 0.8 s ahead | step off the line; one hit |
| 2 | **Missile** | launched from the right edge, turns toward the ship at a limited rate, burns out after 4 s | outturn it or shoot it (one hit) |
| 3 | **Cluster rock** | a big rock that bursts into a ring of 6 fast shards when it breaks | break it far away, or dodge the ring |
| 4 | **Iron rock** | takes 3 hits (cracks show each one); the laser breaks it at once | focus fire or spend the laser |
| 5 | **Mine** | drifts slowly, pulses, then bursts into a short ring of shots unless shot first | shoot it early, or keep away from the ring |
| 6 | **Magnet rock** | pulls the ship gently toward it (none under calm forces) | fly against the pull; shoot it first |
| 7 | **Swarm** | 5–8 tiny drones flying in formation (line, V, wave) | sweep them; multishot shines |
| 8 | **Phase rock** | blinks between solid and ghost on a visible rhythm; only solid ones hurt or can be hit | time the shots |
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
- [ ] Play → Solo flight shows **Start at** only once a level is cleared: *Prestige 0* and
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
- [ ] Endless is locked on the Play screen until Act 1 is finished ("Finish Act 1 to unlock").
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

### C3. Act 2 (after Endless)

- [ ] 6 levels with the Act 1 layout (5 waves, mini on wave 3, boss on wave 5), in remixed
  versions of the six regions.
- [ ] **Rock types from Endless (C2.2):** one new type taught per level, in prestige order
  (comet, missile, cluster rock, iron rock, mine, magnet rock); swarms and phase rocks stay
  Endless-only until a later act. Each level opens with its six-word line (C2.4).
- [ ] **New bosses and minis** (6 and 6), designed by you once the rock types exist, through
  the usual storyboard → your approval → build steps. Not before.
- [ ] Endless adds the Act 2 bosses to its rotation once they exist.
- [ ] Stars, progress, saves and screens as in Act 1.

### Ship customisations (planned 2026-11-23)

Each of the six campaign levels unlocks one new ship, one primary fire option, and one
secondary fire option on its first clear. These are three independent loadout slots:
**6 ships × 6 primary weapons × 6 secondary weapons = 216 combinations** once all are unlocked.
The six-by-six-by-six pool is the complete customisation set; any starter loadout must use
options from that pool rather than adding a seventh option.

- [ ] Define six ships with distinct movement speeds and handling tradeoffs. Primary and
  secondary fire are selected independently, rather than fixed to a ship.
- [ ] Define six primary weapons with distinct projectile behaviour and six secondary
  weapons with distinct abilities; balance all 216 loadouts.
- [ ] Award each level's three unlocks per profile on first clear, and show them on Results.
  Replace the current mini-boss-based hull unlock rule with this level-clear progression.
- [ ] Add independent ship, primary fire and secondary fire selectors to the Hangar,
  with previews, stats, unlock requirements and a summary of the assembled loadout.
- [ ] Apply the assembled loadout in solo and independently per pilot in co-op; carry
  unlocks and selections through campaign, Endless, practice, saves and replays.
- [ ] Decide which options from the six-item pools are available before the first clear,
  and how existing hull unlocks migrate into the new progression.

### C4. Achievements (planned 2026-11-22, was H6) 

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
are proposals to tune after the R1 playtest; names are placeholders. Tiered ones (bronze,
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
  `sh engine/tests/run_host.sh`, and the ESP32 build.

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

## v0.5 LAN: vetting notes (2026-11-19)

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

## S3. Network foundation (prerequisite for LAN, hosted, versus)

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

**S3.5 Write `docs/NET-PROTOCOL.md`** (decisions N1–N12 and S1–S17 live in `docs/NETWORK-AND-SECURITY.md`; settle the open ones first). Message list with version byte, hello / join / ready
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

## v0.6 Web deployment (plan and vetting, 2026-11-19)

"Web deployment" is three separate things with very different costs. Ship them in this order;
each is useful on its own.

| Step | What players get | Needs a server | Needs accounts | Running cost (late 2026, check before buying) |
| --- | --- | --- | --- | --- |
| **W1 Static site** | solo, practice, local co-op in any browser, records on that browser | no | no | free on Vercel Hobby (non-commercial use only; Pro is $20 a month); a domain is about $10–15 a year |
| **W2 Online rooms** | co-op (later versus) with a friend anywhere, by room code | yes, always on | no | Railway Hobby: about $5 a month minimum, which counts toward usage (room service, Redis); more if rooms need more CPU |
| **W3 Accounts** | progress on every device, global leaderboards | yes (W2's server) | yes | auth and database free tiers cover a hobby game; $0 to start |

The game already runs entirely in the browser, so **W1 is a release, not a project**: build,
upload `dist/site/`, add headers. Accounts are the only step that changes the privacy and security
picture, so they come last and only if you want what they give.

### W1. Static site (solo and local co-op)

- [ ] **Host: Vercel** (chosen 2026-11-19). A `vercel.json` at the repo root with
  `buildCommand` (`cd web && npm ci && npm run build`), `outputDirectory` `web/dist/site`, and the
  headers below. Vercel's build machines run Linux, so `web/build.mjs` must find `clang` and
  `wasm-ld` there (it looks for Homebrew paths first): either install LLVM in the build
  command, or (simpler) build `dist/` in GitHub Actions and deploy it with the Vercel CLI
  (`vercel deploy --prebuilt`, from `dist/site/`). Check which works before W1.
- [ ] **Previews:** production deploys from `main` (every merge there is a tagged release);
  `dev` is staging on a fixed preview alias; feature-branch previews are protected or off; a
  `firmware/`-only commit skips the build (B1 has the table).
- [ ] **Plan:** Hobby is free but limited to non-commercial use; move to Pro if the game ever
  takes money (ads, donations with perks, sales).
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

### W3. Accounts, cloud saves and leaderboards (optional; decide before building)

**First decide what accounts are for.** The current design deliberately has none (decision N6
in `docs/NETWORK-AND-SECURITY.md`: nothing to leak or breach). Accounts are worth it for:
1. **Progress on every device** (cloud saves of the save file, `src/state/save.mjs`).
2. **Global leaderboards** that mean something.
3. **Friends and invites** instead of room codes (later).

Guests must keep the whole game: an account adds sync and leaderboards and is never required
to play. If none of the three matters yet, skip W3; W1 and W2 work without it.

**Choosing the parts.**

| Option | What it is | For | Against |
| --- | --- | --- | --- |
| **Clerk + Railway Postgres** (recommended) | Hosted sign-in (email codes, Google, Apple, passkeys) with ready UI; Postgres in the same Railway project as the rooms and Redis | Least auth code to write and secure; vanilla JS SDK, no framework needed; the servers verify Clerk's session token without a network call; the database sits on the room server's private network | One more vendor (Clerk); a Railway database is billed by use and never sleeps; Clerk's script loads from Clerk's domain (CSP must allow it, the page is no longer dependency-free); a production Clerk instance needs your own domain |
| **Supabase** | Auth and Postgres in one | One vendor, one dashboard; row-level security | Free projects pause after about a week without activity (a hobby game will be idle); the client library talks to the database from the browser, so every table needs correct row rules |
| **Self-hosted** (Better Auth or similar, plus SQLite or Postgres on the W2 machine) | Your own auth library in the game server | No vendors, no per-user pricing | You own password resets, email sending, account recovery and their security; the most work and the most risk |

Free-tier figures checked 2026-11-19 (third-party summaries; confirm on the vendors' own
pricing pages before signing up): Clerk free to about 50,000 monthly retained users; Railway
Hobby about $5 a month minimum, counted toward usage; Supabase free 500 MB, 50,000 monthly
users, pauses when idle.

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

## S5. Online rooms in detail (W2, task 9)

Same rules and protocol as LAN, on the public internet with private rooms. The Online
option runs the same server as `npm run host`, packaged as a container.

**Where to host.** The game server is a long-running process holding rooms in memory and
ticking 50 times a second, so it needs a host that keeps a process and WebSocket
connections alive. Check current prices, regions and free-tier limits before choosing; they
change often.

**Chosen: Railway** (2026-11-19), with Redis and Postgres in the same project and Vercel for the
page and API. Alternatives considered, kept for reference:

| Service | Fit | Notes |
| --- | --- | --- |
| **Railway** (chosen) | Good, simplest | Deploy from GitHub or a Dockerfile; WebSockets work; Redis and Postgres one click away on a private network; usage-based billing; **no sticky sessions**, so one replica per room service |
| **Fly.io** | Very good | Long-lived machines in a region you pick; no free tier; a fallback if Railway's regions are too far from players |
| **A VPS** (Hetzner, DigitalOcean) | Best value, most work | Flat price and dedicated cores; you maintain the OS; a fallback if rooms need a lot of CPU |
| **Vercel** (chosen for the page and the API) | **Not for rooms** | Its functions accept WebSockets now, but cannot hold a shared, ticking room (see W2) |

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

S8 work happens on a feature branch off `dev`; the handheld-only code is in `firmware/` (B1). The firmware (`src/`, `include/`, about 2,500 lines; `engine/` and `firmware/` after B1) is the original game: rocks, waves,
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
- [ ] Move rules that both builds need out of `web/native/` and `src/*.cpp` into
  `engine/core/` (the C17 scoring, difficulty and score-table modules already show the style):
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

## Standing rules (every stage)

- Solo and practice keep working at every commit.
- Branches (B1): work on `dev`; `main` only by a release pull request from `dev` or a hotfix;
  every merge to `main` is tagged.
- Before merging: `cd web && npm run check`, `sh engine/tests/run_host.sh` from the repo root,
  and a PlatformIO build (CI runs it, after B1) whenever shared C/C++ changes (the web build compiles `src/*.cpp`
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

Settled ones (22 determinism, 25 page host, 4 and 4b room host) are in the archive.

| # | Question | Blocks | Proposed |
| --- | --- | --- | --- |
| 8 | Rights to the supplied music tracks | R6, W1 | Confirm or replace before any public release |
| 27 | Code licence | R6 | Decide before anything is public |
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
| Vercel account (and the Vercel CLI if deploying a prebuilt `dist/site/` from CI) | W1 | Hobby is free for non-commercial use |
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
| ESP32 DevKit, SSD1306 OLED, joystick, button, passive buzzer; PlatformIO monitor | S8 | Wiring is in `docs/SETUP.md` |
| Battery, charger board and an enclosure | S8.7 | Optional |


---

## C1 Records follow-up completed — 2026-11-23

- The confirmed per-profile personal-best reset now resets Campaign best times and scores
  together with Endless personal bests, including practice.
- Earned stars, level/Endless access, hull entitlements, top-five scores and the other profile
  are preserved. Confirmation text states this scope. Cancel and profile changes disarm it.
- Resets persist; retry saves both best-record stores after a refused write. Existing save
  merge semantics still apply: importing an older save may restore better times/scores.
- Added tests for persistence, profile isolation, save export/import/merge, storage refusal
  and retry, confirmation and cancellation. All 321 tests pass; changed JavaScript passes
  ESLint and Prettier. Human/device/rendered acceptance remains in R1.
- Ship customisation starter decision: Level 1 kit available from the start; Levels 2–6 grant
  their matching kits. This supersedes the earlier six-first-clears wording for the starter kit.
  The detailed proposal is in `docs/SHIP-CUSTOMISATION-PLAN.md`.


## Module split completed — 2026-11-23

- Runtime's campaign, co-op engine adapter, practice tools, typed engine reads and record
  operations now have individual controller classes; the public Runtime API stays compatible.
- Boss core and Bastion/Gunnery source now use small responsibility-based include modules,
  preserving declaration order and gameplay. Existing scene/replay goldens remain unchanged.
- Campaign tests are grouped into levels, progress, saves, replay/co-op and reset modules;
  `campaign.test.mjs` stays the suite entry point.
- The ship customisation plan now specifies `ship/<type>/ship.h`, `primary/<weapon>.h` and
  `secondary/<ability>.h`: one C++ class per ship or weapon, independent registries, per-pilot state.
  This is the planned implementation structure; new ship and weapon gameplay is still pending.
- Checked main's source dependencies: tests are required by CI, and tools are required by
  build/server imports. Keep both on main; publish only `web/dist/site/`.
- Verification: `npm run check` passes all 322 tests, including existing goldens; strict engine
  host checks pass. A regression check covers Settings assigning practice config before launch.


## Ship customisations implemented — 2026-11-23

SC1–SC6 implementation is built: six ships, six primary and six secondary classes under
`web/native/ship/<type>/`, with independent registries and per-pilot state; 216 combinations;
Level 1 starter and first-clear kits for Levels 2–6; migration preserving appearances; safe
locked-item preview; Hangar selectors and summaries; Results rewards; capture/retry; saves,
replay metadata, HUD, input diagnostics and a configured starter demo.

Automated evidence includes all 216 exact replays, all primary/boss-family combinations,
patterns, cooldowns, death/queued-shot handling, independent co-op states, profile isolation,
save round-trip/merge/refusal and standalone compilation of all 18 class headers. The old
scene goldens remain unchanged. Final human tuning and physical/visual acceptance stay R1.

The active roadmap now starts with **HG1, a Hangar redesign before S2**, as requested. The
existing split is a readability improvement, with further dependency/context/translation-unit
work planned in `docs/MODULARISATION-PLAN.md`; that work remains pending, before LAN.

Final verification: all 334 tests pass under `npm run check`; strict host checks and all 18
standalone class-header builds pass. Production packaging contains 261 files with no test/dev/
build-tool artifacts. The test command rebuilds production WASM before production replay
suites, preventing stale artifacts. Browser visual acceptance and human R1 remain pending.

## HG1 carousel and ship-art drafts — 2026-11-23

Accepted the centered-carousel direction. Built the dedicated Hangar subpage, three slot
controls, six-stop slider, horizontal wheel and swipe browsing, explicit equip, persistent
equipped summary, isolated test range, locked previews and retained legacy appearances.
Six transparent 1536×1024 PNG drafts use cohesive cobalt/cream pixel art with distinct ship
silhouettes. Six profile paint choices persist through export/import/merge and recolour
showroom armour and gameplay sprites; co-op ownership markers retain their colours.
Visual/physical acceptance and approval for new gameplay sprites remain HG1, before S2.

### HG1 art correction

The first detailed showroom renders were rejected as too smooth for the 8-bit game. Replaced
all six draft PNGs using the original `ships.png`/`sprites.png` as references, with much coarser
blocks and simpler silhouettes. The showroom now samples at 48×32 and enlarges without
smoothing. Previous renders are archived outside the deploy assets. Art approval stays open.

### Approved ships and individual state drafts

The six coarse-pixel ship designs were approved. Authored per-ship 544×32 state strips
(16 clockwise aiming directions plus icon), metadata and editable pixel-grid sources under
`web/assets/ships/<id>/`. Preserved Comet's legacy pixels in its own file. Retired the shared
`ships.png` and `ships.json`, updated the loader, review page, generator and atlas grading.
The whole-set review is enlarged 4×. State-sheet review precedes the next gameplay build.
Ten focused asset/Hangar checks and targeted lint pass; no gameplay build was run.

### Redundant-file cleanup

Removed rejected renders/the unselected showroom concept, retired Python ship generators,
Python/Finder caches, clangd's index, machine-specific `compile_commands.json`, and stale
web/firmware build output (839 files, about 113 MiB). Consolidated final generation prompts
into one design document. Added ignore rules for generated caches/compilation data and an
exception so the active per-ship art sources are included in version control. Tests, tools,
dependencies and approved art remain. ESLint has no errors; 10 focused asset/Hangar checks
pass. No gameplay rebuild was performed while the state sheets await review.

### Showroom reference layout replaces centered carousel

Implemented the newly selected layout with left stats/paint, a large single preview, six
thumbnail cards, slider and the bottom three-slot dock. Separate Equip and Test actions,
locks, profile persistence and legacy appearances remain. Preview art is cropped to its
coarse opaque bounds and scaled with nearest-neighbour pixels. Practice occupies the
preview pane rather than extending the page. Desktop browser smoke checks cover preview
versus equip, locked choices, weapon slots and the test range.
