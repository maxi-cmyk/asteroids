# Next steps

Rewritten 2026-11-19 to hold only what is left to do. Everything finished (M1 and M4, P3,
P2.1, the whole of P4, with their build notes and deviations) is in
`docs/nextSteps-2026-11-19.archive.md`; older plans are in the other `docs/nextSteps-*.archive.md`
files. The rules as built live in `web/COMBAT.md`, art in `web/assets/ART.md`, code layout in
`web/ARCHITECTURE.md`, design reasons in `DESIGN-DECISIONS.md`, network and security in
`docs/NETWORK-AND-SECURITY.md`.

**Where things stand:** every boss and mini has had its upgrade (P3, P2.1, P4) and is waiting for
a playtest. That build is **v0.3**. Next comes the v0.3 release (playtest, tune and the
release checks in R1 to R8), then **v0.4 LAN** and **v0.5 web**.

**Contents:** Roadmap · v0.3 release (R1–R8) · S2 Combo bonuses · The three ways to play together ·
v0.4 LAN (S3, S4) · v0.5 Web (W1 static site, W2 online rooms, W3 accounts) · S6 Versus ·
S7 Modifiers · S8 ESP32 handheld · Standing rules · Open decisions · Tools

---

## Roadmap

| Version | Stage | Goal | Depends on | Size |
| --- | --- | --- | --- | --- |
| **v0.3** | R1 | Playtest the upgraded bosses and tune from the logs | people | M |
| v0.3 | R2 | Boss leftovers that playtesting asks for (P3, P2.1, P2.2 remainders) | R1 | S to L |
| v0.3 | R3 | **Deterministic engine**: own `sinf`/`cosf`, recorded seed, replays | none | M |
| v0.3 | R4 | One save format: versioned, exportable, mergeable | none | S |
| v0.3 | R5 | Version, build id and changelog | none | S |
| v0.3 | R6 | Release checks: music rights, shipped files, Safari and mid-laptop stress, accessibility | none | M |
| v0.3 | R7 | Modularise leftovers that the network code will touch (M2, M6, M7) | none | M |
| v0.3 | R8 | Tag `v0.3.0` | R1 to R7 | S |
| v0.3.x | S2 | Maximum-combo bonuses (in the engine before the protocol is frozen) | R3 recommended | M |
| **v0.4** | S3 | Network foundation: headless engine, snapshot codec, protocol | R3, R4 | L |
| v0.4 | S4 | LAN co-op on two machines | S3 | XL |
| **v0.5** | W1 | Public static site: solo and local co-op, no server | R6 | S |
| v0.5 | W2 | Online rooms (the LAN server in a container) | S4 | L |
| v0.5 | W3 | Accounts, cloud saves and verified leaderboards (optional, decide first) | W2, R3, R4 | L |
| later | S6 | Versus | S4 (W2 for online) | M |
| later | S7 | Run modifiers | S2 | M |
| later | S8 | Barebones single-player ESP32 build | S2 | L |

W1 can ship as soon as v0.3 is tagged: the game already runs entirely in the browser, so a
public page needs no server at all. S6 to S8 keep their order from the old plan; S8 never
touches the network code and can start any time after S2.

---

## v0.3 release: what to finish before scaling

The bosses are done but not yet proven on people, and a few things are much cheaper to do now
than after other machines, servers or accounts depend on them. **R3 and R4 are the two I would
not skip:** both change formats that the network and the cloud would otherwise freeze.

### R1. Playtest and tune (was S0)

- [ ] **Playtest sessions** (2–4 people; follow `docs/PLAYTEST-PROTOCOL.md`; the fight log
  exports JSON). Targets:
  - Sentinel cleared first try by a new player with 3 lives.
  - The Zodiarch takes most players several attempts.
  - Fight lengths inside the COMBAT.md table, with people taking about 1.5× the bot.
- [ ] **Questions to answer in play** (all came up while building P3 and P4):
  - **Tidecaller:** is it clear that the bubbles must go first? If not, show a visible shield
    over the bell while any bubble remains. Should the bell take damage only while it
    contracts (built: any time)?
  - **Bastion:** it still never hits the bot. Does the ramming run feel threatening to a
    person? Its outriggers (±98 px) reach past the lane (±70 px) without hurting: widen the
    lane or let the engines hurt.
  - **Cinderforge:** do people land enough shots in a vent (the bot needs two vents; people
    are expected to need three or four)?
  - **Ringwarden:** most bot hits come from the repel ring and the prism beam. Are they
    readable?
  - **Zodiarch:** does its 338 px body curling into a loose ring after some attacks read as
    natural?
  - **Ninefold:** does it still need the optional fox run for variety?
- [ ] **Tune from the logs:** `BOSS_K`, rest lengths, window lengths, per-attack frequency,
  pickup drops at phases 2 and 3. One change per commit, with the evidence in the message.
- [ ] **Re-verify after tuning:** every boss is beatable without pickups or laser at 1×
  multiplier, and each has a faster mechanic route.
- [ ] **Design questions:**
  - Event pull: keep or cut (decide after the playtest; calm forces already removes it).
  - Mini-boss on first runs: strictly on wave 3 (proposed), or an earlier one too?
  - Boss practice picker: bosses and mini-bosses together, tagged (proposed)?

### R2. Boss leftovers (build only what the playtest asks for)

- [ ] **Zodiarch (P3):** boss-bar pearl icon (lit while the pearl is open, with a timer);
  whiskers; path dots (needs a cheap look-ahead from the steering); `?hitboxes=1` on the state
  and attack sheets; contact measured against the turned head frames.
- [ ] **Ninefold (P2.1):** a popped decoy streams foxfire back to the real fox; ears flick at
  shots; it licks its chops; a lost tail makes it turn a full circle; the optional fox run.
- [ ] **Zodiarch creatures (P2.2):** each sign's own hold, tell and recoil motion (the table
  is in the archive, "P2.2"). Needs two or three hold frames per sign or a part-animated layer.
- [ ] **Optional, unscheduled (P2.3):** Ascendant (the sign of today's date is thrown first);
  a boss backstop barrier, only if playtesting still finds a safe spot behind a boss.

### R3. Deterministic engine (new; recommended before any network code)

**Why now.** The engine takes `sinf` and `cosf` from the browser
(`web/src/runtime/wasm-host.mjs`: `sinf: Math.sin, cosf: Math.cos`), and V8 and
JavaScriptCore can disagree in the last bit. That one import is the only reason two machines
fed the same inputs can drift apart. Everything else is already deterministic: WebAssembly
float arithmetic is exact IEEE, `sqrtf` is a WASM instruction, and randomness already comes
through one import (`browser_random`) that can be seeded.

Fixing it costs one small C file. It does not change the plan for the network (the server
stays the one authority, decision N1), but it gives:
- **Replays:** a run is its seed plus its input frames, a few kB.
- **Leaderboards you can trust** (W3): the server re-simulates a submitted solo replay
  instead of believing a score.
- **Desync checks in S4:** client and server can compare a hash of the state each second.
- **Better tests:** a recorded fight replays to the same score on Node, Chrome and Safari.

- [ ] `web/native/mathf.h`: `sinf`/`cosf` (range reduction plus a minimax polynomial;
  within about 2e-7 of `Math.sin` is plenty, exact last-bit
  agreement with any browser is not the goal), replacing the import.
  Check every other `env` import for floats coming in from JavaScript.
- [ ] Goldens and bot numbers will move slightly: one commit, goldens updated, bot times
  re-measured.
- [ ] Seed the run: `browser_random` draws from a seeded generator (one 64-bit seed per run,
  from `crypto.getRandomValues` as now), and the seed goes into the run record.
- [ ] Input recording: the session records `{tick, stick, aim, buttons}` per tick
  (run-length coded); a replay feeds them back. A dev page plays a replay.
- [ ] Test: a recorded boss fight replays to the identical final scene hash in Node and in the
  browser pane (Chrome) and Safari.
- [ ] The ESP32 build keeps its own `sinf` (shared `src/*.cpp` must still compile there).

### R4. One save format

Today the game keeps ten separate `localStorage` keys (`asteroids.web.scores-v3`,
`personal-bests-v1`, `boss-defeats-v1`, `unlocks-v1`, `hangar-v1`, `settings-v1`, two co-op
score tables, the HD table and the fight log). Cloud saves (W3) and a "move to another
computer" button both need them as one thing.
- [ ] A `save` module that reads and writes all of them as one versioned object
  (`{format: 1, profiles, records, bossDefeats, unlocks, hangar, settings}`), keeping the
  existing keys underneath so nothing is lost.
- [ ] **Merge rule** (needed for the cloud): records and unlocks only ever grow, so merging
  two saves is the larger of each best and the union of unlocks; settings take the newer
  copy. Write it as a pure function with tests, since W3 reuses it on the server.
- [ ] Settings → Data: **Export save** (a `.json` download) and **Import save** (validated,
  merged, never a silent overwrite). The fight log stays separate (it is a dev tool).

### R5. Version and build id

- [ ] `package.json` version `0.3.0`; the build writes the version and the short git hash into
  the page; shown in Settings → About and on the Records export.
- [ ] `CHANGELOG.md` with v0.1 to v0.3 summarised from the git history and the archives.
- [ ] The same build id becomes the network handshake's compatibility check (S3.5, S11).

### R6. Release checks (needed before anything is public)

- [ ] **Music rights** (open decision 8): confirm or replace every supplied track before W1.
- [ ] **What ships:** `dist/` contains no `assets/inspo/`, no `assets/bosses/draft-*`, no dev
  pages and no test builds. Add a build check that fails if any of them appear.
- [ ] **Stress run on a mid laptop and in Safari** (`npm run stress`). Budget: 60 fps, no
  frame over 25 ms. Record the result in `docs/ACCEPTANCE.md`.
- [ ] **Accessibility pass:** reduced motion, colour-blind readability of every boss warning
  (warnings must not rely on colour alone), keyboard and controller reach every screen.
- [ ] **First-run experience:** someone new reaches a game in two clicks, and Help explains
  the boss rules (weak points, warnings) in a sentence each.
- [ ] **Licence:** choose one for the code (or "all rights reserved") before the repo or site
  is public; list third-party fonts and sounds with their licences.

### R7. Modularise what the network code will touch

From M (archive): only the splits that S3 and W3 will edit, so the network diffs stay
readable. The rules for splitting are unchanged (no behaviour change in a split commit).
- [ ] **M2 Boss tests** (`web/tests/boss.test.mjs`, now 1625 lines) into `tests/boss/`.
- [ ] **M6 Guide data** (`guide.mjs`, 670 lines) into per-boss data files.
- [ ] **M7 Scene mirror** (`scene.mjs`, 568 lines): per-boss constants beside each boss. S3
  builds its snapshot codec on this file.
- [ ] Later, not blocking: M5 art tools, M8 shared C++ (`src/asteroid.cpp`, `src/game.cpp`;
  carefully, the ESP32 shares them).

### R8. Tag v0.3.0

- [ ] `npm run check`, `sh tests/run_host.sh`, the PlatformIO build, the stress run; update
  README, COMBAT and Help; tag `v0.3.0`.

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

## v0.4 LAN: vetting notes (2026-11-19)

The S3 and S4 plan below was reviewed against the code as it is now. It holds; these are the
changes and the risks found.

- **Authority stays on the server.** With R3 the engine becomes deterministic, which would make
  lockstep possible, but an authoritative server is still the better fit: a late joiner or a
  reconnect needs no catch-up simulation, and a modified client cannot change a result. R3
  is used for desync checks and tests, not to replace the server.
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

## v0.5 Web deployment (plan and vetting, 2026-11-19)

"Web deployment" is three separate things with very different costs. Ship them in this order;
each is useful on its own.

| Step | What players get | Needs a server | Needs accounts | Running cost (late 2026, check before buying) |
| --- | --- | --- | --- | --- |
| **W1 Static site** | solo, practice, local co-op in any browser, records on that browser | no | no | free (Cloudflare Pages, Netlify or GitHub Pages); a domain is about $10–15 a year |
| **W2 Online rooms** | co-op (later versus) with a friend anywhere, by room code | yes, always on | no | about $2–6 a month for one small Fly.io machine, or a $4–6 VPS |
| **W3 Accounts** | progress on every device, global leaderboards | yes (W2's server) | yes | auth and database free tiers cover a hobby game; $0 to start |

The game already runs entirely in the browser, so **W1 is a release, not a project**: build,
upload `dist/`, add headers. Accounts are the only step that changes the privacy and security
picture, so they come last and only if you want what they give.

### W1. Static site (solo and local co-op)

- [ ] **Host:** Cloudflare Pages (recommended: free, global CDN, custom domain, headers file),
  Netlify or GitHub Pages. Deploy `dist/` from CI on a tag.
- [ ] **Headers:** `Content-Type: application/wasm` for `.wasm`; a strict
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

The S5 plan below stands. Vetting notes:
- **Fly.io has no free tier any more** (a short trial only). The cheapest always-on
  shared-cpu machine is about $2 a month, but shared CPUs get a guaranteed 6.25% of a core
  with bursts. A 50 Hz tick loop is steady load, so measure the per-room tick cost in S3.1
  first: if a room needs more than a few percent of a core, use a performance CPU or a VPS
  (Hetzner, DigitalOcean) with dedicated cores, where the price is flat.
- **Where the page comes from.** With W1 live, the page is on the static host and the game
  server lives at its own address (`wss://play.<domain>/ws`). That is the "Server URL" case in
  S5.1, so it becomes the default rather than the option: the server's `ALLOWED_ORIGINS` holds
  the site's origin, and the page's CSP `connect-src` allows the server.
- **Room codes, no accounts** (S1, S2): W2 works without W3. A `ROOM_CREATE_KEY` is not usable
  on a public site (anyone can read it from the page); use per-IP limits and `MAX_ROOMS`, or
  require a signed-in account to *create* rooms once W3 exists.

### W3. Accounts, cloud saves and leaderboards (optional; decide before building)

**First decide what accounts are for.** The current design deliberately has none (decision N6
in `docs/NETWORK-AND-SECURITY.md`: nothing to leak or breach). Accounts are worth it for:
1. **Progress on every device** (cloud saves of the R4 save).
2. **Global leaderboards** that mean something.
3. **Friends and invites** instead of room codes (later).

Guests must keep the whole game: an account adds sync and leaderboards and is never required
to play. If none of the three matters yet, skip W3; W1 and W2 work without it.

**Choosing the parts.**

| Option | What it is | For | Against |
| --- | --- | --- | --- |
| **Clerk + Postgres (Neon)** (recommended) | Hosted sign-in (email codes, Google, Apple, passkeys) with ready UI; a serverless Postgres database the game server talks to | Least auth code to write and secure; vanilla JS SDK, no framework needed; the server verifies Clerk's session token without a network call; Neon's free plan is enough for saves and boards and wakes on demand | Two vendors; Clerk's script loads from Clerk's domain (CSP must allow it, the page is no longer dependency-free); a production Clerk instance needs your own domain |
| **Supabase** | Auth and Postgres in one | One vendor, one dashboard; row-level security | Free projects pause after about a week without activity (a hobby game will be idle); the client library talks to the database from the browser, so every table needs correct row rules |
| **Self-hosted** (Better Auth or similar, plus SQLite or Postgres on the W2 machine) | Your own auth library in the game server | No vendors, no per-user pricing | You own password resets, email sending, account recovery and their security; the most work and the most risk |

Free-tier figures checked 2026-11-19 (third-party summaries; confirm on the vendors' own
pricing pages before signing up): Clerk free to about 50,000 monthly retained users; Neon free
plan 1 GB per project with compute that scales to zero; Supabase free 500 MB, 50,000 monthly
users, pauses when idle.

**Design (with Clerk + Neon):**
- [ ] **Only the game server touches the database.** The browser signs in with Clerk and sends
  its session token to the W2 server (on the WebSocket handshake and to a small `/api`); the
  server verifies it and reads or writes Postgres. No database keys in the page.
- [ ] **Tables:** `players` (Clerk user id, initials, created), `saves` (player, R4 save JSON,
  format version, updated), `runs` (player, mode, rules key, score, seed, replay blob,
  verified, created), leaderboard views over `runs`. No email or name stored by the game:
  Clerk holds them.
- [ ] **Cloud save sync:** on sign-in, merge the local save and the cloud save with the R4 merge
  rule (bests take the larger, unlocks the union, settings the newer) and write the result to
  both. Never overwrite either side blindly.
- [ ] **Leaderboards only from runs the server saw or re-ran.** A score typed into the page
  is worthless, so a board entry must be either an online run (W2, the server simulated it) or
  a solo run whose replay the server re-simulates (R3) to the same score. Replays are capped
  in size and length, and re-simulation runs in a queue so it cannot starve live rooms.
  Separate boards per rules key (mode, friendly fire, modifiers), as records are today.
- [ ] **Names on public boards:** keep the three-letter initials (no free text, nothing to
  moderate; decision S6). If free names are ever wanted, they need a filter and a report
  button.
- [ ] **Account deletion:** a button in Settings, plus Clerk's user-deleted webhook removing the
  player's rows. Export of their data (the R4 save plus their runs) on request.
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
- [ ] Database backups (Neon's free plan keeps a short restore window; export weekly to
  storage you own once there are real players).
- [ ] Rate limits on `/api` and on replay submission; replay size and length caps.

---

## S5. Online rooms in detail (W2, task 9)

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
| 22 | Make the engine deterministic (own `sinf`/`cosf`, seeded runs, replays) | R3, W3 leaderboards | Yes, in v0.3 |
| 23 | Do we want accounts at all, and for what (cloud saves, global boards, friends)? | W3 | Optional accounts, guests keep the full game; build after W2 |
| 24 | Auth and database provider | W3 | Clerk + Neon Postgres, only the game server touches the database |
| 25 | Static host for the page | W1 | Cloudflare Pages, game server on its own subdomain |
| 26 | A domain name | W1 (and Clerk production) | Buy one before W1 |
| 27 | Code licence | R6 | Decide before anything is public |
| 8 | Rights to the supplied music tracks | R6, W1 | Confirm or replace before any public release |
| 1 | Ordinary assist split in co-op | S2 | The killer gets the award; the team bonus is the only assist payout |
| 2 | Allow `ws` as the one runtime dependency, and put the server in `web/server/` | S4 | Yes |
| 3 | Client-side prediction for the local ship | S4.6 | Decide after measuring LAN latency |
| 4 | Hosting provider and budget for rooms | W2 | Fly.io after measuring tick cost; a VPS if shared CPU is not enough |
| 4b | Serve the page from the game server, or from a static host | W2 | Static host (W1) with the server on its own origin; the server can still serve it for LAN |
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
built-in browser pane, Safari, Chrome, and `web/tests/boss-bot.mjs`.

**To acquire (ask before installing any package):**

| Tool | Needed by | Notes |
| --- | --- | --- |
| 2–4 playtesters, a screen recorder, a notes sheet | R1 | Real-player tuning |
| A mid-range laptop, Safari | R6 | Stress budget |
| A domain name | W1, W3 | Clerk production needs one |
| Cloudflare (Pages) account | W1 | Free; deploy `dist/` from CI |
| Two physical gamepads, ideally an identical pair plus a different brand | S4, S6 | Same model twice is an acceptance case |
| A second computer on the same network, and a phone hotspot for a different network | S4, W2 | Two browser tabs are not acceptance |
| `ws` npm package | S4 | The one new runtime dependency |
| Playwright (dev dependency, optional) | S4.8 | Two-context lobby tests |
| A lossy/latency proxy script (`web/dev/net-conditioner.mjs`) | S4.9 | Written in Node |
| `cloudflared` or `ngrok` | W2 testing | A quick `wss` tunnel before real hosting |
| Docker (Desktop or Colima), GitHub Container Registry, GitHub Actions | W2 | Build and test the image locally first |
| Fly.io (`flyctl`) or a VPS with Caddy | W2 | Set a spend limit before the first deploy |
| Clerk account, Neon account, `@clerk/backend` and a Postgres client (`pg`) on the server | W3 | Only if W3 goes ahead |
| ESP32 DevKit, SSD1306 OLED, joystick, button, passive buzzer; PlatformIO monitor | S8 | Wiring is in `docs/SETUP.md` |
| Battery, charger board and an enclosure | S8.7 | Optional |
