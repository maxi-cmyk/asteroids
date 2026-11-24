# Web architecture

The gameplay engine is the firmware's C++ compiled to WebAssembly; everything else is plain
ES modules, CSS and HTML with no runtime dependencies. This page is the map. For the rules of
play see [COMBAT.md](COMBAT.md) and, for engine internals, [combat/README.md](combat/README.md); for the contributor workflow see [README.md](README.md).

```
web/
  src/                 browser code (copied as-is to dist/src)
    main.mjs           boots the App
    version.mjs        this build's version and commit, read from <meta name="build">
    app/               composition root, game loop, input, menus, routing
    runtime/           the engine as the UI sees it: WASM host, runs, scene layout, seeded
                       randomness (rng.mjs), replays (replay.mjs) and the
                       compact replay file (replay-codec.mjs)
    render/            canvas rendering: renderer, layers, backgrounds, effects
    boss/              boss presentation: scene decoding, painters, death, sound, UI
    screens/           one module per screen (DOM rendering and wiring)
    state/             persisted state: settings, records, hangar, navigation, the practice
                       range's drills and config (practice.mjs), the campaign's levels, stars
                       and progress (campaign-data.mjs is pure data; campaign.mjs stores it),
                       and the one save that bundles them for export, import and merging
                       (save.mjs)
    ship/              immutable loadout catalogue and isolated practice preview
    input/             controllers, keyboard/pad bindings, co-op input, calibration
    audio/             sound effects and music
    demo/              the isolated Home demo run
  native/              C++ built into game.wasm (see "Engine" below)
  html/ index.html     page template and one partial per screen
  styles/ style.css    CSS (see "Styles" below); theme.css imports the theme files
  dev/                 preview pages and tools (not part of the game)
  tools/               asset generators (Python) and build helpers
  tests/               node --test suites (boss fights in tests/boss/), goldens and a
                       browser smoke walk
  assets/              art, fonts, sprite manifests
  build.mjs serve.mjs  build to dist/ (the deployable page in dist/site/), local dev server
```

## Dependency direction

`app → screens → state/input/runtime`, and `render` and `boss` only read the scene. Pure
logic (navigation, settings, records, scene decoding, run recording, initials entry) never
touches `document`. Controllers receive what they need from the `App` instance when they run.

## The scene ABI

The engine publishes each frame as one `Float32Array` (1408 floats). Every offset is named in
[src/runtime/scene-layout.mjs](src/runtime/scene-layout.mjs); `build.mjs` generates
`dist/gen/scene_layout.h` from it, and [native/scene.h](native/scene.h) writes the array with
those names. No other module may use a bare scene number (a test enforces this). Boss detail
lives in a block starting at `BOSS_AT`, decoded by [src/boss/scene.mjs](src/boss/scene.mjs).
Add a field in `scene-layout.mjs`, write it in `scene.h`, read it by name.
A scene is a point in ℝ¹⁴⁰⁸; snapshot deltas and drawing between two scenes are vector operations
(`combat-docs/12`).

## App (src/app)

| Module | Role |
| --- | --- |
| `app.mjs` | Builds services, screens and controllers; loads the engine; `App.session` picks solo or co-op rules |
| `bootstrap.mjs` | Storage-backed services (settings, hangar, unlocks, audio) |
| `game-loop.mjs` | One `requestAnimationFrame` loop, exact 20 ms ticks, suspend/resume |
| `input-hub.mjs` | Held keys and buttons, mouse aim, active controller, last device |
| `keyboard-router.mjs`, `key-rebinder.mjs` | Keys to a modal dialog, a menu (Settings has extras) or the flight; key re-binding |
| `menu-navigator.mjs`, `menu-focus.mjs` | Menu scope, arrow/d-pad focus movement, select-edit mode, controller menu buttons |
| `screen-router.mjs` | Reacts to navigation changes: views, titles, decision dialog, focus restore, URL hash |
| `sessions.mjs` | `SoloSession` / `CoopSession`: everything that differs between the two |
| `presenter.mjs` | Per-frame canvas and DOM updates |
| `launch-controller.mjs`, `home-backdrop.mjs`, `presentation-clock.mjs`, `layout.mjs` | Warp overlay, Home layer, menu animation clock, playfield fitting |
| `settings-controller.mjs`, `ui-actions.mjs`, `boss-unlock-toast.mjs` | Settings glue, plain button handlers, unlock toast |
| `menu-look.mjs` | The menus' backdrop (Classic or a region reached), applied as `--menu-backdrop` / `--menu-veil` and `body[data-look]` |

The Play screen (`mode.mjs`: Campaign, Endless, Practice and the one-or-two-pilots switch) and the
level select (`levels.mjs`) are screens of their own; a level's end is the results overlay in a
level layout (`results.mjs`), so it shares the results plumbing. `App.chooseLevel` / `runLevel`
start levels. The practice range's drill list and in-flight tools drawer are `src/screens/practice-range.mjs`;
while the drawer is open the game loop does not step and the menu keys drive the drawer.

## Runtime (src/runtime)

`createRuntime(bytes, options)` returns a `Runtime`: `WasmHost` instantiates the engine and
bridges leaderboard storage; `RunRecorder` turns the end of a run into a result and writes the
records; `CoopRun` and `InitialsEditor` hold the co-op end screens that live outside the
engine. `coop-scene.mjs` decodes a co-op player's scene.

## Rendering (src/render)

`PixelRenderer.render(scene, players)` draws the region backdrop (`backgrounds*`), then an
ordered stack of layers (`layers/`: boss, rocks, spawn warning, pickups, bullets, particles,
players, effects, boss finale, cues) or a full-canvas screen. `SceneObserver` compares
consecutive scenes to create explosions and the boss finale; `PixelCanvas` draws sprites,
bitmap text, boxes and rays.

The live loop calls `renderIfChanged`, not `render`: the engine ticks at 50 Hz, so on a faster
display most frames carry the same scene, and `FrameGate` skips them (it compares the scene,
and the settings that shape the picture, with the last one drawn); nothing is interpolated between
ticks, and the frames-per-tick pattern per refresh rate is tabulated in `combat-docs/01`. The
playfield (480 × 270) maps to the screen by a uniform scale, a 16:9 box with pixelated scaling, so
circles stay circles; screen shake is a translation (`combat-docs/12`). Anything new that changes the
picture without changing the scene must either go in `PixelRenderer#settingsKey` or call
`renderer.gate.invalidate()`. While no region transition is running, `Backgrounds` draws the sky
and star layers from one pre-composited canvas that is rebuilt only when a star layer moves a
whole pixel.

## Bosses (src/boss + native/boss)

| Presentation | |
| --- | --- |
| `scene.mjs` | `KINDS` assembled from each boss's `<boss>/kind.mjs` (minis: `minis/kinds.mjs`; names, regions, sizes, phases, named `aux` slots), the Zodiarch's `zodiarch/geometry.mjs` re-exported, decoders |
| `render.mjs` + `body-painters.mjs`, `hazard-painters.mjs`, `shot-painters.mjs` | One painter per body, hazard kind and shot family |
| `death.mjs` + `death/` | Death sequences: shared effects in `fx.mjs`, scripts per region |
| `sound.mjs` + `sound/` | `Synth`, per-group sound books, window cues, `BossSound` observer |
| `ui.mjs`, `records.mjs`, `unlocks.mjs`, `guide.mjs`, `art.mjs` | Intro card and health bar (with the Zodiarch's pearl), defeat counts, hull unlocks, field guide (one file per boss in `guide/`, dev pages only), sprite sheets |

## Engine (native)

`bridge.cpp` includes the firmware sources (`../engine/src/*.cpp`) and the web layers into one
translation unit with no standard library. `exports/` holds the `web_*` functions grouped by
purpose (`game`, `practice`, `read`, `coop`, and `test` for the test build only).
`combat.h` and `coop.h` add the HD combat and two-player layers on top of the shared game.

Bosses: `boss/core.h` holds state and pools; `shots.h`, `hazards.h`, `hits.h`,
`scheduler.h`, `lifecycle.h` the framework. **The framework never switches on the boss kind.**
Each fight family (`boss/fights/*.h`: a boss and its mini) writes one `BossOps` row per kind
(home, health factor, phases, rests and hooks for begin, update, pick, run, circles, body,
phase, soak, hit); `boss/ops.h` collects them in `BossKind` order. Slots of `boss.aux` and
`boss.stamp` are named by `AUX_*` / `STAMP_*` enums at the top of each family file and by
`KINDS[kind].aux` in the UI.

Adding a boss: add its kind to `BossKind`, write its family header and `BossOps` row, add the
row to `BOSS_OPS`, add its entry to `KINDS`, its painter to `BODY_PAINTERS`, a sound group and a
death script, then its sprite sheet cells (`tools/`).

## Styles

`style.css` (shared primitives, screen controls) is the only sheet the dev pages load.
`index.html` additionally loads `styles/shell.css` (viewport geometry) and `theme.css`, which
imports `styles/theme/*.css` **in cascade order**: later files deliberately override earlier
ones, so keep the order. `node tools/prune-css.mjs` lists (and with `--write` removes)
declarations that a later same-selector rule always overrides.

## Verification

| Check | Command |
| --- | --- |
| All unit, golden and engine tests | `npm test` (from `web/`) |
| Format + lint + tests | `npm run check` |
| Firmware host tests | `sh engine/tests/run_host.sh` (repository root) |
| Engine scene unchanged | `tests/scene-golden.test.mjs` (`UPDATE_GOLDEN=1` rewrites `tests/golden/`) |
| Rendering unchanged | `tests/render-golden.test.mjs` (recording canvas, `tests/render-harness.mjs`) |
| Boss sound unchanged | `tests/sound-golden.test.mjs` |
| Browser flow | serve, open the app, then `JSON.stringify(await (await import('/dev/smoke.mjs')).runSmoke())` |
| CSS unchanged | `dev/style-signature.mjs`: `walk('desktop', 'record')` before, `walk('desktop', 'compare')` after |

Goldens are characterisation tests: after a deliberate gameplay or art change, regenerate
them and review the diff; after a refactor they must not move.


## Module boundaries (2026-11-23)

`runtime/runtime.mjs` is the public facade and common solo run lifecycle. The extracted classes
have one responsibility each:

| Module | Owns |
| --- | --- |
| `runtime/campaign-run.mjs` | Campaign starts, next-level lookup and per-profile result credit |
| `runtime/coop-driver.mjs` | Co-op input delivery, scene decoding and end detection |
| `runtime/practice-tools.mjs` | Practice configuration, held pickups and assist commands |
| `runtime/engine-reader.mjs` | Typed engine memory reads and the co-op results scene overlay |
| `runtime/record-actions.mjs` | Personal-best reset/retry and complete record clearing |

`CoopRun` still owns co-op results/initials flow; `RunRecorder` still creates run summaries.
Keep callers using the Runtime API; its practice configuration getter/setter remain compatible
with Settings. These controllers operate on the same live engine and stores, not copies.

`native/boss/core.h` assembles `core/types.h`, `state.h`, `math.h`, `pilots.h` and `pools.h`.
`native/boss/fights/bastion.h` assembles `bastion/setup.h`, `motion.h`, `attacks.h`, `targets.h`
and `ops.h`. The include order preserves the single translation unit's definition order;
these are internal unity-build fragments, not standalone public headers.

`tests/campaign.test.mjs` remains the campaign suite entry point; its cases are grouped in
`tests/campaign/{levels,progress,saves,replay-coop,reset}.mjs`, with one shared harness.
Generated Ninefold pose data remains generated; edit `tools/fox_game.py`/`fox_poses.py` rather
than hand-editing or splitting the output without updating its generator.

Ship gameplay follows the class layout in
[the ship customisation plan](../docs/SHIP-CUSTOMISATION-PLAN.md): one class per ship, primary
weapon and secondary weapon under `native/ship/<type>/`, registered independently for 216 loadouts.
`native/ship/engine/` isolates the remaining legacy-world adapter; individual gameplay classes
compile without the engine world. `src/state/loadouts.mjs` owns per-profile grants and equipped
slots; `src/state/hangar-selection.mjs` separates browsing from equipping. The Hangar screen
coordinates the showroom, `hangar-stage.mjs` draws the large ship preview,
`hangar-cards.mjs` owns the thumbnail rail, and `hangar-stats.mjs` presents stats and the
equipped dock. `src/ship/preview.mjs`
uses a separate practice instance with no storage writes or replay recording.

The remaining architecture changes are planned in
[MODULARISATION-PLAN.md](../docs/MODULARISATION-PLAN.md): narrow runtime ports, explicit native
world/player contexts and real C++ translation units before LAN.

## Source branches versus deployed files

Keep `web/tests/` and `web/tools/` on **both dev and main**. The main branch is reproducible
release source, not the static hosting directory. Main's GitHub workflow runs `npm run check`,
which runs the tests. `build.mjs` and `serve.mjs` import `tools/assemble-html.mjs` and
`tools/build-info.mjs`; other tools regenerate art/audio and support maintenance.

Deploy **only `web/dist/site/`**, the allowlisted output of `npm run build`. That output contains
the page, styles, browser modules, assets, production WASM and third-party licence notice.
It excludes tests, tools, developer pages, test WASM, objects and generated build headers.
Removing tests from main would break release verification; removing tools would break the build.
There is no need to delete either source directory to keep them off the public website.

Ship paint uses stable named IDs per profile in the existing Hangar store. Save import/merge
preserves them. `src/ship/paint.mjs` owns the palette and pure pixel mapping;
`src/render/ship-paint.mjs` caches recoloured cells. A paint is a trim colour, not a whole-ship
tint: hulls are steel and carry two stored shades of Cobalt (`accent`, `accentDark`), and paint swaps
exactly those two colours. The Hangar showroom draws the same hull sheets the game flies (the
24×16 side view in each `states.png`) and the weapon icons in `assets/weapons/icons.png`
(`node tools/make-weapon-icons.mjs`). Paint does not change simulation, records or replay rules.

Ship aiming art is authored independently under `assets/ships/<id>/`: `design.json` defines
pixel-grid layers, `states.png` holds 16 nearest-neighbour 32×32 orientations plus a 24×16
icon, and `states.json` describes the cells. `assets/ships/index.json` lists all seven
appearances, including legacy Comet. `render/art.mjs` assembles these into its runtime atlas;
Vanguard keeps the public stock sprite names but uses its own sheet. The shared `ships.png`
has been retired. `node tools/make-ships.mjs` drafts these assets without building gameplay;
`tools/ship-art/accents.mjs` says where each hull wears its trim.
