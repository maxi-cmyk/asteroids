# Design decisions

The "why" behind the project, in short cards. Tags: **[built]** = checked in code,
**[decided]** = agreed, not built yet. Reviewed 2026-10-27.

Deeper docs: network + security `docs/NETWORK-AND-SECURITY.md`; combat engine internals
`web/combat/README.md`; code map `web/ARCHITECTURE.md`; plan `nextSteps.md`.

## Words used here

| Word | Meaning |
| --- | --- |
| **Tick** | One 20 ms step of the game (50 per second) |
| **Engine** | The C++ game rules (`src/` plus `web/native/`) |
| **WASM** | The engine compiled to run inside a browser (`game.wasm`) |
| **Host** | Whatever runs the engine: the ESP32, a browser, or the Node server |
| **Scene** | One array of 1408 numbers the engine fills each tick; the UI only reads it |
| **Authoritative server** | The one machine whose simulation counts; others just display |

## The picture

```
 ESP32 firmware ──┐
                  ├── same game rules (engine/src/) ──► game.wasm ──► browser (reads the scene)
 engine/core (C17) ──┘                                     └──► Node server (online / LAN)
```

## 1. One game, several hosts [built]

- **Decision:** the shared game in `engine/src/*.cpp` (also built into the firmware) is the base game. `web/native/bridge.cpp` includes
  those files directly; web-only features (co-op, bosses, laser) sit beside them in `web/native/`.
- **Why:** one set of rules to test; the scene can read game state without extra getters.
- **Cost:** a firmware change can break the web goldens and the reverse, so always run
  `npm run check`, `sh engine/tests/run_host.sh` and a PlatformIO build after shared edits.
- **Rule:** rules both platforms need go in `engine/core/` (plain C17, no Arduino, no browser).

## 2. WebAssembly without Emscripten [built]

- **Decision:** `clang --target=wasm32 -nostdlib`, linked by `wasm-ld`. No libc, no glue code.
- **Why:** tiny module, nothing to learn but the imports, same style as the firmware.
- **Cost:** the module imports `sinf`, `cosf`, randomness, sound and storage from the host.
- **More:** `web/build.mjs`, `web/src/runtime/wasm-host.mjs`.

## 3. Fixed time, and what "same game" means [built]

- **Decision:** the engine only advances in exact 20 ms ticks fed by the host. Pause means "stop
  feeding ticks".
- **Meaning:** same ticks + same inputs + same random numbers + same `sin/cos` = same game.
- **Gap 1 (closed, see below):** `sin/cos` came from the browser, so two browsers could differ in the last bit.
- **Gap 2 (closed, see below):** randomness was unseeded unless the host injected a seed.
- **Consequence (before the fix):** two browsers could not be expected to simulate identically. This drove card 6.
- **Fixed 2026-11-19 (R3 in `nextSteps.md`):** the engine has its own `sinf`/`cosf`
  (`web/native/mathf.h`) and every run is seeded (`web/src/runtime/rng.mjs`), closing both gaps;
  a recorded run replays to the same scene in Node, Chrome and JavaScriptCore. The server still
  decides (card 6); determinism adds replays and desync checks.
- **How big is gap 1?** `sin/cos` feed the rotation matrices of curving shots (`v ← R(turn)·v`,
  `web/combat-docs/07`). A one-ulp difference in the angle grows only *linearly* in ticks (`n·δθ`,
  not exponentially, because a rotation has `|λ| = 1`), so a curving shot drifts by a tiny fraction
  of a pixel. The danger is not that growth but the thresholds: a hit test is a discontinuous
  comparison, so a tiny difference can flip a hit into a miss (our reasoning, not measured), which
  is why the server decides (card 6).

## 4. The scene (the engine-to-UI contract) [built]

- **Decision:** after each tick the engine writes everything visible into one flat array of
  1408 numbers. The UI (renderer, boss art, sound cues) reads only that array.
- **One source of truth:** `web/src/runtime/scene-layout.mjs` lists every position. The build
  generates a C++ header from it, so C++ and JS cannot disagree.
- **Safety:** compile-time size checks, a test that bans bare numeric offsets, and golden files.
- **To add a field:** add to the layout file, write it in `native/scene.h`, read it by name, review
  the golden diff. Never reuse or renumber a slot.
- **Payoff:** a network client only needs scenes to draw the game (card 6).
- **Shape:** a scene is a vector in ℝ¹⁴⁰⁸. A snapshot delta is a vector difference (mostly zeros,
  since most pool slots are inactive) and drawing between two snapshots is a convex blend
  `(1 − α)·a + α·b`. See `web/combat-docs/12` and `docs/NETWORK-AND-SECURITY.md` §2.

## 5. Browser code layout and co-op [built]

- **Dependency direction:** app → screens → state/input/runtime. Render and boss art only read
  the scene. Logic modules never touch the DOM.
- **One session interface:** `SoloSession`, `CoopSession`, later `NetSession`; screens never
  check the mode.
- **Co-op:** two ships on one shared field. The world steps once per tick; each player has their
  own lives, score, combo and pickups; the roster is fixed at start.

## 6. Networking [decided]

- **Decision:** one **authoritative Node server** runs the same `game.wasm` headless. Players send
  inputs; the server sends compact snapshots; clients draw them.
- **Why not "every browser simulates":** card 3, gap 1. **Why not peer-to-peer:** NAT, a hidden tab
  can throttle the host, the host can cheat.
- **Transport:** WebSocket (works everywhere). Revisit WebRTC only if measured loss demands it.
- **Three modes, one server:** Local (no server), LAN (`npm run host` on one PC), Online (the same
  server in a container on Railway, one replica per room service since Railway has no sticky
  sessions; Redis beside it keeps the room directory, rate limits and reconnect tokens, never the
  game). On LAN the server serves the page too (same origin) and needs no Redis; online the page
  and a small API are on Vercel and the rooms on their own subdomain.
- **Security stance:** accounts optional (guests play everything), inputs only, strict message
  limits, origin check, caps on rooms and connections; leaderboards take only runs a server
  played or re-ran (updated 2026-11-19).
- **More:** `docs/NETWORK-AND-SECURITY.md` (all decisions, open questions, threat model,
  checklist).

## 7. Testing [built]

| Layer | What it catches |
| --- | --- |
| `engine/tests/run_host.sh` (strict C17, UBSan) | logic bugs, undefined behaviour |
| `node --test` against the wasm | gameplay, co-op, boss rules |
| Goldens (scene, render, sound) | accidental changes to the contract or output |
| `boss-bot.mjs` | unbeatable or unfair boss fights |
| `dev/smoke.mjs` | broken navigation |

Update a golden only on purpose, and read the diff.

## 8. Handheld [decided]

- **Decision:** ship last, barebones, single player: existing game, combo rule, a Sentinel-lite boss.
- **No aiming:** the ship only moves in 2D and always shoots right, so the boss must be easy to
  line up, and warnings use blinking lines and buzzer tones.

## Principles

1. One rules engine; platforms are thin hosts.
2. The scene is the only thing the UI reads.
3. Put each thing in the one table that owns it.
4. The server decides; clients display.
5. Move code and change behaviour in separate commits.
6. Do not show a feature in menus until it works.
