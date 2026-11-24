# Module architecture review and next changes

Reviewed 2026-11-23 against the current code, including the ship customisation work.

## Assessment

There is no single industry-standard directory tree or maximum file length. The useful tests
are whether a module has one coherent responsibility, exposes an explicit interface, owns its
state, and can be tested or changed without depending on unrelated implementation details.
ES modules provide actual module scope and explicit imports; filenames alone do not do that.
See [MDN's module guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).

The current split is a good navigation improvement, with remaining architectural debt:

| Area | Current assessment | Desired boundary |
| --- | --- | --- |
| Browser ES modules | Conventional separation of app, runtime, screens, render and state | Keep feature logic independent from DOM and platform services |
| Runtime controllers | Responsibilities are separated, but each receives the entire mutable Runtime | Inject just the engine adapter, stores and lifecycle callbacks used by that controller |
| Legacy native boss/combat code | Shorter headers still share globals and depend on include order in one translation unit | Public declarations and explicit world/player contexts; private implementations compiled in `.cpp` files |
| New ship/weapon classes | One implementation per class; immutable registry, explicit input/state contexts | Keep these interfaces stable; do not introduce dependencies on the app or other weapon classes |
| Ship compatibility adapter | Isolated engine-facing headers still bridge the old globals | Replace the adapter with a proper engine service when the legacy world context is extracted |
| Campaign tests | A stable suite entry point imports cases grouped by responsibility | Keep the shared harness small; test public behaviour rather than module internals |
| Generated pose/tuning data | Long tables are generated artifacts, not handwritten business logic | Change the generator; preserve ID ordering and reproducible output |
| Source versus deployment | Main retains build tools and tests; deploy output is allowlisted | Keep this model; do not delete verification tooling from release source |

The C++ guidance is grounded in the [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines):
I.1 explicit interfaces, I.2 avoiding mutable globals, SF.2 separating declarations from definitions,
and SF.11 self-contained headers. Unity builds can be intentional in embedded software; the issue
here is hidden dependencies, not merely the fact that a unity build exists. Splitting code into
more headers does not by itself solve that issue.

## Preserve the ship layout

Use the requested `web/native/ship/<type>/ship.h`, `primary/<weapon>.h` and
`secondary/<ability>.h` layout. Registry categories remain independent: folder ownership denotes
the kit that introduced a weapon, not a limitation on equipping it. Do not duplicate a weapon
under every ship or use a deep inheritance hierarchy to assemble loadouts.

Gameplay classes take explicit `MotionContext` or `WeaponContext` inputs and contain no mutable
singleton timers. Movement, cooldown, pending shots and projectiles are owned per pilot. The
adapter under `ship/engine/` is the only ship layer that can see legacy world globals. Shared
algorithms are small helpers, not a new all-purpose manager.

## Remaining changes in priority order

- [ ] **M1 — narrow runtime dependencies.** Introduce an explicit engine port for commands and
  memory reads. Give CampaignRun the recorder/progress stores and start callbacks, CoopDriver
  its engine port and finish callback, and RuntimeRecords the record stores. Remove each whole
  Runtime back-reference as that controller is touched. Keep the Runtime facade's public API
  compatible during the migration; avoid a large rewrite while gameplay is being expanded.
- [ ] **M2 — native world and player contexts.** Make ownership explicit for clock, RNG, rocks,
  boss, players, scoring and effects. First extract projectile resolution and awards behind a
  `CombatWorld` interface; then replace the co-op load/save scratch-global mechanism. Preserve
  earliest-impact ordering, per-player state and exactly-once attribution. This is the largest
  risk and needs the existing replay/golden suite at every step.
- [ ] **M3 — real C++ compilation boundaries.** Once contexts are explicit, move non-inline
  implementation and mutable definitions into `.cpp` files; keep self-contained `.h` interfaces.
  Add those translation units to the WASM build and host harness. Compile each public header
  alone as a check. Keep the bridge as a compatibility/export layer, rather than including the
  game's implementation files from it. Do this before freezing the LAN protocol in S3.
- [ ] **M4 — split remaining mixed services when touched.** Combat/practice, co-op collision/
  lifecycle, Hangar presentation/loadout selection and save-format migration each have distinct
  owners. Move pure serializers and validators away from browser storage/DOM. Prefer feature
  folders with small public entry points when several files belong to one feature; keep shared
  infrastructure in runtime/input/render rather than copying it into features.
- [ ] **M5 — dependency checks and documentation.** Add import/include boundary checks after
  M1–M3 establish stable interfaces. Reject DOM imports from state/ship catalogue modules and
  legacy-world includes from individual ship/weapon classes. Document module ownership and
  generated-file sources. Avoid arbitrary line-count tests or empty wrappers created solely
  to make a file shorter.

## Verification and timing

Feature work continues first. Apply narrow dependency improvements when touching a module;
complete M1–M5 during the existing maintenance stage, before R1 and before LAN implementation.
LAN and website deployment remain last in the roadmap.

For each structural change: run `npm run check`, strict host checks and PlatformIO when shared
engine code changes. Existing legacy scene goldens must remain unchanged unless a rule changes.
The loadout matrix and full-scene replay checks cover the appended loadout ABI. Use focused
ownership/collision tests for death, pause, simultaneous hits and full pools. Treat browser,
physical-input and human balance acceptance as separate evidence, retained under R1.
