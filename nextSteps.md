# Next steps

Rewritten 2026-10-26. The browser game now has its full single-machine feature set: UI
overhaul, seven hulls, six region bosses and six mini-bosses with music, local two-player
co-op. What is left falls into three kinds of work:

1. **Close-out**: tune the bosses with real people and accept the build on real hardware.
2. **Scoring depth**: maximum-combo bonuses.
3. **Multiplayer and modes**: LAN, hosted, versus, run modifiers.
4. **Handheld release**: once the web game is complete, ship a barebones single-player
   version on the ESP32. The ESP32 is the original version of this project (the portable
   handheld, and the way to learn hardware and C++), so it is the final stage, not an
   afterthought.

The previous 1,217-line plan (boss designs, finished UI tasks 1–5, the old multiplayer
notes) is kept untouched in `docs/nextSteps-2026-10-26.archive.md`. Boss rules now live in
`web/COMBAT.md` (engine internals in `web/combat/`), art in `web/assets/ART.md`, code layout in
`web/ARCHITECTURE.md`, design reasons in `DESIGN-DECISIONS.md`, network and security decisions in
`docs/NETWORK-AND-SECURITY.md`.

**Decisions taken for this plan**

| Decision | Choice |
| --- | --- |
| Order | S0 close-out → S1 hardware acceptance → S2 combo → S3 net foundation → S4 LAN → S5 hosted → S6 versus → S7 modifiers → S8 ESP32 handheld |
| Transport | WebSocket, one **authoritative Node server** that runs the existing WASM engine headless; clients send inputs and render scenes |
| ESP32 firmware | The original handheld. Frozen while the web game is finished, then S8 ships a **barebones single-player** version. Until then, every shared C++ change must still compile for ESP32 and pass the host tests |
| Finished work | Summarised below, not re-specified |

**Contents:** Shipped · Tools · Roadmap at a glance · S0 Boss close-out · S1 Hardware
acceptance · S2 Combo bonuses · The three ways to play together · S3 Net foundation · S4 LAN · S5 Hosted · S6 Versus ·
S7 Modifiers · S8 ESP32 handheld · Standing rules · Open decisions

---

## Shipped (do not rebuild)

| Area | State | Where to read |
| --- | --- | --- |
| Screens | Home, mode select, Hangar, Settings, Records, Help, Pause, Results, practice; mouse, keyboard and controller navigation | `docs/UI-NAVIGATION.md` |
| Look | Violet theme, six region backdrops and transitions, tier 3+ quasi-star / pulsar / magnetar scenery, Jersey 10 + Pixelify Sans | `web/assets/ART.md` |
| Hulls | Seven; six unlock by defeating a mini-boss for the first time (`unlocks-v1` save) | `web/src/state/hangar.mjs`, `unlocks.mjs` |
| Bosses | Sentinel, Ringwarden, Cinderforge, Bastion, Tidecaller, Horizon Warden at waves 5–30, repeating as tiers; six mini-bosses at waves 3, 8, 13 … 28; boss practice; flawless bonus; assists (long warnings, calm forces). Latest commit hardened Cinderforge, Tidecaller and the Warden (scorched ground, cloak, mirror) | `web/COMBAT.md` |
| Audio | Synthesised boss sound books plus streamed music (`assets/soundtracks`, manifest-driven) and the launch sound | `web/assets/README.md` |
| Co-op | Two ships on one field, controller + keyboard or two controllers, friendly-fire toggle, latched roster | `docs/LOCAL-COOP-SCOPE.md` |
| Structure | Refactored into `src/` modules, per-boss native headers behind a `BossOps` table, one scene ABI table (`scene-layout.mjs` → generated `scene_layout.h`), goldens for scene, render and sound | `web/ARCHITECTURE.md`, `web/REFACTOR-PLAN.md` |
| Checks | `npm run check` (Prettier, ESLint, ~200 tests), `sh tests/run_host.sh` (strict C17 + UBSan), `dev/smoke.mjs` browser walk, PlatformIO ESP32 build | `web/README.md` |

Housekeeping noted while rewriting is fixed in S0.6 (the ignore rules for this file and the archive
are gone, so both show up as new files to commit).

---

## Tools needed

**Already installed and used:**

| Tool | Used for |
| --- | --- |
| Node 26 (`node --test`, built-in `WebSocket` client, `fetch`) | Tests, build, dev server, and the future game server |
| Homebrew `llvm` (`clang++`) + `lld` (`wasm-ld`) | Building `game.wasm` from `web/native/` |
| Xcode command-line tools | Host C17/C++ tests with UBSan (`tests/run_host.sh`) |
| PlatformIO | ESP32 compile check (`platformio.ini`) |
| Prettier, ESLint, `postcss` | Format, lint, CSS tooling (`npm run check`) |
| Python 3 venv + Pillow, NumPy, fontTools | Art and sprite generators in `web/tools/` |
| Built-in browser pane, Safari, Chrome | Visual and flow checks, smoke walk |
| `web/tests/boss-bot.mjs` | Scripted pilot for fight length and fairness |

**To acquire:**

| Tool | Needed by | Notes |
| --- | --- | --- |
| Two physical gamepads, ideally one identical pair plus a different brand | S1, S4, S6 | Same model twice is an explicit acceptance case |
| A second computer on the same network (and a phone hotspot for a different network) | S4, S5 | Two browser tabs are not acceptance |
| Headphones, speakers, and the ESP32 buzzer build | S1.4 | Listening check |
| 2–4 playtesters, a screen recorder (QuickTime), a notes sheet | S0.2 | Real-player tuning |
| `ws` npm package (server dependency; the game page stays dependency-free) | S4 | The one new runtime dependency; confirm OK |
| Playwright (dev dependency, optional) | S4.8 | Two-context lobby tests; skip if hand-driven checks suffice |
| A lossy/latency TCP proxy script (`web/dev/net-conditioner.mjs`, written in Node) | S4.9 | Avoids needing macOS Network Link Conditioner; either works |
| `cloudflared` or `ngrok` | S5 test only | Quick wss tunnel before real hosting |
| Docker (Desktop or Colima) and a container registry (GitHub Container Registry) | S5 | Build and test the image locally first |
| A hosting account: Fly.io (`flyctl`) or Railway (CLI) first choice; Render or a VPS with Caddy as alternatives | S5 | TLS comes from the platform or Caddy; a domain is optional |
| GitHub Actions | S5.1 | Build, test and push the image on a tag |
| A static host (Vercel, Netlify or Cloudflare Pages), optional | S5.1 | Only if the page is hosted apart from the server |
| Chrome DevTools Performance panel, Safari Web Inspector timelines | S1.3, S4.6 | Frame pacing, CPU, memory |
| ESP32 DevKit, SSD1306 OLED, joystick, button, passive buzzer, USB cable (the existing handheld) | S8 | Wiring is in `docs/SETUP.md` |
| PlatformIO CLI and `pio device monitor` (115200 baud) | S8 | Build, flash, serial logging; `pio run -t size` for flash/RAM |
| Multimeter or logic analyser (optional) | S8 | Only if I²C refresh time or buzzer timing needs measuring |
| Battery and charger board (e.g. LiPo + TP4056) and an enclosure (3D print or box) | S8.7 | Only if the handheld becomes truly portable |
| A text editor for the music score (`tools/soundtracks/tracks.mjs`) and `ffmpeg` if new tracks are imported | S0.4 | Only if tracks change |

---

## Roadmap at a glance

| Stage | Goal | Depends on | Size |
| --- | --- | --- | --- |
| S0 | Boss close-out: playtest tuning, performance, audio sign-off, housekeeping | none | M |
| S1 | Hardware acceptance of the existing build | none (parallel to S0) | M |
| S2 | Maximum-combo bonuses (task 7) | co-op, scoring | M |
| S3 | Network foundation: determinism findings, headless engine host, snapshot format, protocol | S2 recommended, not required | L |
| S4 | LAN co-op (task 8) | S3 | XL |
| S5 | Hosted rooms (task 9) | S4 | L |
| S6 | Versus (task 10) | S4 (S5 for online) | M |
| S7 | Run modifiers (task 11) | S2; S4/S5 for networked consistency | M |
| S8 | Barebones single-player ESP32 build | web game complete (S0–S2 at minimum; S7 optional) | L |

Network stages S3–S6 never touch firmware, so S8 can start as soon as S2 is done if you want
the handheld sooner; it only needs the single-player rules to be final.

S7's engine work needs no network. If you want it earlier, S7.1–S7.4 can slot in after S2
and only S7.5 waits for S4.

---

## S0. Boss close-out (B8, remainder)

Goal: every boss is fun, fair and beatable by real people at the intended length, on a
laptop, with sound you have actually listened to.

**S0.1 Re-baseline the scripted pilot after "harder bosses".**
- [x] Re-run `boss-bot.mjs` over all twelve fights and record clear times and hits taken
  (`node tests/boss-baseline.mjs`, done 2026-11-02; tier I now 28 / 29 / 35 / 41 / 45 / 64 s).
  The old figures (28 / 29 / 37 / 41 / 44 / 55 s bosses; 15–23 s minis) predate the
  Cinderforge, Tidecaller and Warden changes.
- [x] Re-check the fairness automation at tiers I–III with the new attacks: warnings at
  or above minimum, projectile cap 48, hazard cap 6, 42 px safe corridor, entrance
  safety, body room. Pay attention to scorched ground (3 at once), tidal wall, whirlpools,
  Warden cloak and mirror, which are new lethal shapes.
- [x] Update the Difficulty table in `web/COMBAT.md` with the new numbers.
- [x] Add a test that the Warden's mirror cannot create unwarned lethal beams: at most one
  per 1.5 s, always with a 900 ms warning.

**S0.2 Playtest with real people.** Tools: 2–4 testers, recorder, notes sheet.
- [x] Write a one-page protocol (`docs/PLAYTEST-PROTOCOL.md`): each tester plays Sentinel first with no briefing, then
  one boss of their choice, then the Warden; 3 lives; note attempts to first clear,
  where they died (attack name), whether they understood each telegraph, whether the
  fight felt too long.
- [x] Add an optional **fight log** (local only, off by default): per attempt, boss,
  tier, time, lives lost, damage dealt per phase, killer attack. Export as JSON from the
  practice results screen. This replaces transcribing notes by hand.
- [ ] Run the sessions (needs people; follow `docs/PLAYTEST-PROTOCOL.md`). Targets: Sentinel cleared first try by a new player with 3 lives;
  Warden takes most players several attempts; solo fight length inside the COMBAT.md
  table (Sentinel 35–50 s … Warden 80–110 s) with people taking about 1.5× the bot.
- [ ] Tune from the logs (after the sessions): `BOSS_K`, rest lengths, window lengths, per-attack frequency,
  pickup drops at phase 2 and 3. One change per commit with the evidence in the message.
- [ ] Re-verify the acceptance list after tuning (the bot proves each boss beatable without pickups
  or laser today; repeat after any tuning): beatable without pickups or laser at
  1× multiplier, and each boss has a faster mechanic route.

**S0.3 Performance with the worst case.** Tools: Chrome/Safari profilers.
- [x] Add a stress fixture (`npm run stress`, `web/dev/stress.html`) that holds 48 projectiles and 6 hazards alive on the heaviest
  boss (Warden phase 3, Cinderforge Boil), then measure sustained frame time on a mid
  laptop, in HD and at fullscreen.
- [x] Record results in `docs/ACCEPTANCE.md`. Budget: 60 fps, no frame over 25 ms for a
  minute of play. Passed on the developer's Mac (165 fps, frame work about 0.6 ms); still to
  repeat on a mid laptop and in Safari, where it is most likely to miss.

**S0.4 Audio sign-off.** Tools: headphones, speakers.
- [ ] Listen through every boss (a person, not code): entrance sting, music track, tell tick, defeat sound.
  Check the music does not mask the tell tick, and the new streamed boss tracks loop
  without a click (the manifest records where each track audibly ends).
- [ ] Confirm you hold the rights to the supplied tracks (`insert-another-coin.m4a`,
  `gravity-well-escape.m4a` and any file added with `--import`); remove or replace any
  you cannot ship, and credit what stays.
- [x] Update the "Sound design" note: boss effects are synthesised, the music is
  files, so the old "no samples" claim is no longer true (`web/README.md`, Audio).

**S0.5 Resolve the open design questions.**
- [ ] Event pull: keep, or cut. Decide after S0.2 (calm forces already removes it).
- [ ] Mini-boss on first runs: stay strictly on wave 3 (proposed), or add an earlier one.
- [ ] Boss practice picker: bosses and mini-bosses together, tagged (proposed).

**S0.6 Housekeeping.**
- [x] Decide whether `docs/` and the planning notes should be tracked. `docs/` was already tracked;
  the ignore lines for `nextSteps*.md` and the archive are removed (decision 5: yes), so commit them.
- [x] Fix the root `.gitignore` `./assets` line: removed, it matched nothing (there is no root `assets/`;
  `web/assets` has its own `web/.gitignore`).
- [x] Refresh `docs/ARCHITECTURE.md` against `web/ARCHITECTURE.md` or delete the older one.

**S0 status (2026-11-02):** everything that can be done without people or hardware is done: bot
baseline, mirror test, fight log, protocol, stress fixture, sound note, housekeeping. Open, and
only you can do them: the playtest sessions and tuning, the listening pass and track rights,
the stress run on a mid laptop, and the three design questions in S0.5.

**S0 done when:** pilot and fairness tests green with the new numbers, playtest logs show
the targets met, performance and audio sign-offs recorded, open questions closed.

---

## S1. Hardware acceptance (open items from `docs/ACCEPTANCE.md`)

Nothing here needs new code unless a check fails. Keep evidence in `docs/ACCEPTANCE.md`
with date, device, browser and result; synthetic-controller runs do not count.

- [ ] **S1.1 Single player on real input.** Keyboard + mouse, then one gamepad: light
  trigger pulls, stick drift at neutral, remapping, hold and release across screens,
  unplug and replug while a button is held, focus loss and recovery.
- [ ] **S1.2 Local co-op on real input.** Two people: keyboard/mouse + controller, then
  two controllers including two of the same model. Check device assignment, one device
  never driving both ships, disconnect → pause → reassign → resume, simultaneous deaths,
  friendly fire on and off.
- [ ] **S1.3 Viewport and performance matrix.** 960×540, 1440×900, browser zoom 125–200%,
  fullscreen, short windows; through Results, initials, save failure and utility screens.
  Sustained frame pacing, CPU and memory under dense rocks, laser, multishot + 2× and
  a boss; in Safari and Chrome (Firefox optional).
- [ ] **S1.4 Listening.** Music and effect balance on speakers and headphones, plus the
  ESP32 buzzer build for the firmware's own sounds.
- [ ] **S1.5 Fix list.** Anything failing becomes a dated issue line here before it is
  fixed, with a test where one is possible.

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

**S2.2 Engine (`web/native/combat.h`, `coop.h`, `src/core/scoring.c`).** Keep ESP32 and host
builds compiling. Put the single-player combo rule in the platform-free C17 core
(`src/core/scoring.c`), not in `web/native/`, so the handheld gets it in S8 for free. Only
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
  `sh tests/run_host.sh`, and the ESP32 build.

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
and Online cannot drift apart; the game page can be served by that server (default) or
from a static host with a **server URL** setting (see S5.1).

---

## S3. Network foundation (prerequisite for LAN, hosted, versus)

The plan rests on one finding that decides the architecture.

> **Finding: the engine is not cross-browser deterministic.** `game.wasm` imports its math
> (`sinf`, `cosf` and friends) from the host (`env` imports in `wasm-host.mjs`), so each
> browser's own `Math.sin` feeds the simulation. V8 and JavaScriptCore can differ in the
> last bit, and boss shot angles use `sinf`/`cosf` constantly. Lockstep (every client
> re-simulating from shared inputs) would drift. The chosen design, a **single
> authoritative server whose snapshots clients only render**, avoids the problem. Clients
> must never advance the simulation themselves.

Good news for that design: the renderer, boss painters and boss sound observer already read
only the **scene** (`Float32Array`, 1408 floats at `scene-layout.mjs`). A client can be a
thin renderer fed scenes.

**S3.1 Spike: headless engine under Node.** Tools: Node, `wasm-host.mjs`.
- [ ] Run `WasmHost` in a Node process with no DOM (the tests already do this); loop it at
  exactly 20 ms ticks with a drift-corrected timer; confirm CPU cost per room per tick,
  so S5 can size hosting.
- [ ] Confirm which parts of the engine need the browser (audio, storage bridge, records)
  and give each a no-op or server-side implementation.

**S3.2 Scene completeness audit.**
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

**S3.5 Write `docs/NET-PROTOCOL.md`** (decisions N1–N10 and S1–S14 live in `docs/NETWORK-AND-SECURITY.md`; settle the open ones first). Message list with version byte, hello / join / ready
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

## S5. Hosted-server multiplayer (task 9)

Same rules and protocol as LAN, on the public internet with private rooms. The Online
option runs the same server as `npm run host`, packaged as a container.

**Where to host.** The game server is a long-running process holding rooms in memory and
ticking 50 times a second, so it needs a host that keeps a process and WebSocket
connections alive. Check current prices, regions and free-tier limits before choosing; they
change often.

| Service | Fit | Notes |
| --- | --- | --- |
| **Fly.io** (recommended first choice) | Very good | Runs a Dockerfile as a long-lived machine; WebSockets work; you pick regions near players, which matters for a real-time game; `fly.toml` config; easy to run one small machine |
| **Railway** | Good, simplest | Deploy from GitHub or a Dockerfile; WebSockets work; minimal config; fewer region controls; usage-based billing |
| **Render** | Good | Docker web service with WebSockets and automatic TLS; free instances sleep when idle, so use a paid always-on one for real rooms |
| **Hetzner / DigitalOcean / any VPS** | Best value, most work | One small VM, Docker, Caddy for automatic TLS; you maintain the OS; cheapest for a steady load |
| **Google Cloud Run / AWS ECS Fargate** | Possible | Containers with WebSockets, but scale-to-zero and request time limits fight in-memory rooms; set min instances 1 and max 1 |
| **Cloudflare Durable Objects** | Possible, different design | Each room is a durable object and fits rooms well, but it means rewriting the server for Workers and driving the WASM engine from alarms; consider only if you outgrow a single container |
| **Vercel / Netlify / Cloudflare Pages** | **Static pages only** | Vercel runs serverless functions that cannot hold a WebSocket server. They can host the built game page, with the game pointing at a server elsewhere |

Recommended path: develop with `cloudflared` or `ngrok` tunnelling to your laptop, then
deploy the container to **Fly.io or Railway**; fall back to a VPS if cost or control
matters. Rooms live in one process, so run **one instance per region** at first; a room code
should encode the region so a joiner reaches the right instance.

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
    `LOG_LEVEL`, `REGION`, and a build id exposed to the version handshake. Defaults make
    `docker run -p 4173:4173 asteroids` work for **LAN** too.
  - [ ] Same-origin by default: the server serves the built page and the `/ws` endpoint, so
    the client connects to `wss://<host>/ws` with no configuration. Add an optional
    **Server URL** field in Online settings for a static-hosted page (Vercel, Netlify or
    Cloudflare Pages) or a self-hosted server; check the CORS and origin rules.
  - [ ] Per-service config files kept in `deploy/`: `fly.toml`, `railway.json` (or its
    dashboard steps), `render.yaml`, and a `docker-compose.yml` with Caddy for a VPS.
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
  `docs/NETWORK-AND-SECURITY.md` §5 and §7: origin check, message validation and rate limits, room
  code entropy and join limits, per-IP and global caps, `ROOM_CREATE_KEY`, platform spend limit,
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

The firmware (`src/`, `include/`, about 2,500 lines) is the original game: rocks, waves,
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
- [ ] **In:** everything the firmware already does, the single-player combo rule from S2,
  region pacing as a simple wave counter shown on the HUD, one boss (see S8.3), the
  highscore table with initials, pause, demo.
- [ ] **Out:** co-op, versus, any network, hulls and unlocks, settings screens beyond a
  volume/mute toggle, music, tiers, modifiers (one-life could be a boot-time option later).
- [x] Scope confirmed: existing firmware game, combo rule, Sentinel-lite boss. Anything you want from the web game that is not here
  needs a one-line justification, since each feature costs flash, RAM and frame time.

**S8.1 Baseline and budget.** Tools: PlatformIO, serial monitor.
- [ ] Build the current firmware and record flash and RAM use (`pio run -t size`), frame
  time per loop, I²C refresh time, and worst-case entity counts. Add the numbers to
  `docs/SETUP.md` so every later change is compared against them.
- [ ] Set budgets: for example under 60% of flash, under 50% of free heap at the worst
  moment, 30 fps minimum with a full bullet pool and particles.

**S8.2 Pull shared logic into the platform-free core.** Tools: strict C17 flags, host tests.
- [ ] Move rules that both builds need out of `web/native/` and `src/*.cpp` into
  `src/core/` (the C17 scoring, difficulty and score-table modules already show the style):
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
- [ ] `sh tests/run_host.sh` (strict C17 + UBSan) and the PlatformIO build are green.
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

- [ ] Solo and practice keep working at every commit.
- [ ] Before merging: `cd web && npm run check`, `sh tests/run_host.sh` from the repo root,
  and a PlatformIO build whenever shared C/C++ changes (the web build compiles `src/*.cpp`
  directly, so a firmware edit can move web goldens and the reverse). A new scene field means the
  scene golden and layout test change in the same commit.
- [ ] Per-player shot ownership, 2× pending events, laser and shield state, CPS, accuracy,
  chains, results and profile records carry through every mode. Friendly hits never count
  as enemy accuracy or score.
- [ ] New modes appear in navigation only when they work. Reuse Home → Play, lobby, pause,
  results and Records instead of adding pages.
- [ ] Update COMBAT, README, SETUP and Help text with each release.
- [ ] Keep evidence types separate in `docs/ACCEPTANCE.md`: automated, rendered, physical
  input, two-machine. Anything not performed stays unchecked.

---

## Open decisions

| # | Question | Blocks | Proposed |
| --- | --- | --- | --- |
| 1 | Ordinary assist split in co-op | S2 | Killer gets the award; team bonus is the only assist payout |
| 2 | Allow `ws` as the one runtime dependency, and the server in `web/server/` | S4 | Yes |
| 3 | Client-side prediction for the local ship | S4.6 | Decide after measuring LAN latency |
| 4 | Hosting provider and budget | S5 | Fly.io (or Railway), one small always-on instance per region; Vercel only for static pages |
| 4b | Serve the page from the game server, or from a static host too | S5.1 | From the server (same origin, simplest); Server URL setting for the rest |
| 5 | ~~Track `docs/` and planning notes in git~~ **Done:** ignore lines removed; commit the two notes | S0.6 | Done |
| 6 | Versus round length and rematch rules | S6 | 3 minutes, best of one |
| 7 | Modifier combinations | S7.5 | One at a time first |
| 8 | Rights to the supplied music tracks | S0.4 | Confirm or replace before any public release |
| 9 | ~~Firmware scope~~ **Settled:** existing game + combo rule + one simplified boss; one-life stays a possible later boot option | S8 | Done |
| 10 | ~~Boss on the handheld~~ **Settled:** Sentinel-lite | S8.3 | Done |
| 11 | Portable power and enclosure | S8.7 | Optional; do after the firmware is accepted |
| 12 | Sabotage: who scores targeted rocks and summoned mini-bosses | S6.3 | First to kill scores a rock; mini-boss scores nothing |
| 13 | Sabotage in co-op or solo, or versus only | S6.3 | Versus only |
| 14 | Keep or cut "Reverse controls" | S6.3 | Cut from the default list; revisit with accessibility feedback |
