# Network design and security

How the game is played on more than one machine (LAN and online), where each part is hosted, and
how it is kept safe. Rewritten 2026-11-19 for the v0.4 (LAN) and v0.5 (web) plan in
`nextSteps.md`; the version before this was last reviewed 2026-10-27 and is in git history.
Companion to `DESIGN-DECISIONS.md` (cards 3 and 6). Status tags: **[decided]**, **[open]** (a
choice still to make), **[todo]** (a check to build or run). **Nothing here is built yet.**

## 1. The parts and where they run

```
                         ┌──────────── Vercel ─────────────┐
 browser ── https ──────►│ the game page (static dist/)    │   W1
   │                     │ /api functions (saves, boards,  │   W3, optional
   │                     │   replay check, room lookup)    │
   │                     └───────┬─────────────────┬───────┘
   │                             │                 │
   │                             ▼                 ▼
   │  wss://rooms.<domain>/ws   ┌────────────── Railway project ──────────────┐
   └───────────────────────────►│ room server (Node + game.wasm), 1 replica   │  W2
                                │ Redis: room directory, rate limits, tokens  │  W2
                                │ Postgres: players, saves, runs              │  W3
                                └─────────────────────────────────────────────┘

 LAN:  browser A ──┐
                   ├── http + ws ──► the same room server on the host's computer
       browser B ──┘                (npm run host; serves the page itself, no Redis)
```

| Part | What it does | Where it runs | Built in |
| --- | --- | --- | --- |
| **Page** | The whole single-player game, local co-op, the network client | Vercel (static files) for the public site; the room server for LAN | W1; S4 |
| **Room server** | Runs every networked game (the one authority), lobbies, room codes | The host's computer (LAN) or a Railway service (online): one program | S4; W2 |
| **Redis** | Room directory (code → server), rate-limit counters, reconnect tokens, short-lived leaderboard cache | Railway (same project, private network); none on LAN | W2 |
| **API** (optional) | Cloud saves, leaderboards, checking solo replays, room lookup | Vercel Functions, beside the page | W3 |
| **Database** (optional) | Players, saves, runs (anything that must survive) | Railway Postgres (same project) | W3 |
| **Sign-in** (optional) | Accounts, sessions | Clerk | W3 |

| | Local | LAN | Online |
| --- | --- | --- | --- |
| Who simulates | the browser | the room server | the room server |
| Transport | none | `ws://` (plain) | `wss://` (TLS) |
| Page served from | Vercel, or any static host | the host's room server (same origin) | Vercel |
| Trust boundary | none | players on the same network | the public internet |
| Who runs the server | n/a | one player's computer | your Railway account |

### Why the rooms are not on Vercel, and one room server holds a whole room [decided]

Vercel hosts the page well and can host the small API. Vercel Functions now accept WebSockets
(generally available since October 2026), but a function is the wrong shape for a game room:
- **No shared room.** Two players' sockets can land on different function instances, which
  share no memory. A room needs both players in one process.
- **No steady clock.** A room ticks 50 times a second whether or not anyone sends anything; a
  function runs when a message arrives, and a connection is held for at most about 30 minutes.
- **Cost model.** Vercel bills active CPU. A room's tick loop is CPU every 20 ms for the whole
  game, the most expensive pattern there.

So the room server is one long-lived Node process, the same program for LAN and online
(decision N4), on Railway. Vercel is the page and the API.

**Railway has no sticky sessions** (its docs: traffic goes to the nearest region and then to a
random replica). If the room service had two replicas, two players with the same room code
could be sent to different processes. So:
- **One replica per room service.** Never scale the room service by adding replicas.
- **To grow, add services, not replicas:** `rooms-1`, `rooms-2` (or one per region), each with its
  own public domain. When a room is created, its server writes `room:<code> → <its own URL>` to
  Redis; a joiner asks the API (or any room server) where the code lives and connects straight
  to that URL. With one service this is a single entry and costs nothing.

### What Redis is for, and what it is not

Redis holds **small, short-lived, shared** facts that more than one process needs:
- **Room directory:** `room:<code>` → server URL and state (lobby, playing), with a TTL that the
  room server refreshes while the room lives. Lets the API answer "does this code exist, where"
  and lets several room services share one code space without collisions (`SET NX`).
- **Rate limits:** per-IP counters for joins, room creation and API calls, shared by every room
  server and every Vercel function (functions are stateless, so they cannot count on their own).
- **Reconnect tokens:** `token:<hash>` → room and slot, with the 10 s grace as its TTL, so a
  reconnect to the right server is checked in one place.
- **Leaderboard cache (W3):** a sorted set per board, rebuilt from Postgres; never the record.

Redis is **not** the room state (a room's 50 Hz simulation lives in its process's memory; Redis
round trips would be far too slow and lose N1's single referee) and **not** the place for saves
or runs (Postgres keeps those; Redis may lose recent writes on a restart).

## 2. Architecture decisions

| # | Decision | Status | Reason | Rejected alternative |
| --- | --- | --- | --- | --- |
| N1 | **Authoritative server** runs the simulation; clients send inputs, draw scenes | decided | One referee: nothing to sync, a modified client cannot change a result, a late joiner needs no catch-up | Lockstep (possible after R3, but every client must run every tick and trust the others); browser as host (throttled tabs, cheating, NAT) |
| N2 | **WebSocket** transport | decided | Works through every proxy and platform, no signalling server | WebRTC (NAT/TURN, more moving parts) |
| N3 | **Page and rooms on different origins online** (`<domain>` on Vercel, `rooms.<domain>` for rooms); **same origin on LAN** | decided 2026-11-19 | The public page is static on Vercel; on LAN the host serves both, which avoids mixed content and local-network prompts | Same origin online (the room server would serve the page too; possible, but Vercel is the chosen host) |
| N4 | One server program for LAN and online | decided | Cannot drift apart | Separate LAN build |
| N5 | **Rooms in the memory of one room server process**; one replica per room service, more services (not replicas) to grow, found through a Redis room directory | decided 2026-11-19 | Railway routes replicas at random (no sticky sessions); rooms are small | Room state in Redis (too slow for 50 Hz); sticky load balancing (not offered) |
| N6 | **Accounts optional**; guests play everything, rooms need no account | decided 2026-11-19 (was "no accounts") | Accounts add cloud saves and leaderboards; the game must not depend on them | Required login |
| N7 | **Input frames** up (`seq, tick, stick, aim, buttons`), **snapshots** down (25 Hz, quantised, delta), plus an **event list** | decided | Small; the client never sends state; events carry what painters and sound used to infer from frame-to-frame changes | Client-sent positions |
| N8 | Records stay on each client; with an account they sync through the API | decided 2026-11-19 | The room server stays stateless between runs | The room server storing records |
| N9 | Client prediction for the player's own ship | **open** | Only if LAN input lag measures over ~80 ms | Always predict |
| N10 | Fall back to WebRTC data channels | **open** | Only if measured packet loss makes TCP stalls visible | n/a |
| N11 | **Deterministic engine** (own `sinf`/`cosf`, seeded runs) | built 2026-11-19 (R3) | Replays, server-checked solo scores, desync checks between client and server | Trusting browser maths |
| N12 | **Leaderboards accept only runs a server saw or re-ran** | decided 2026-11-19 | A score sent by a page is worthless | Trusting client scores |

Reference numbers: tick 50 Hz, snapshot 25 Hz, target under 20 kB/s per client, reconnect
grace 10 s, interpolation delay about 2 snapshots. The raw scene was 1408 floats (5.6 kB) per
tick before P3 and P4; **re-measure before S3.3**, the bosses added aux slots and parts.

### The maths behind the numbers

- **Bandwidth.** A raw scene of `n` floats is `4n` bytes; at 1408 floats and 25 Hz that is about
  141 kB/s per client, so the 20 kB/s target needs roughly 7× from delta coding and quantisation.
  A delta `s_k − s_{k−1}` is mostly zeros (inactive pool slots), which is why delta coding suits
  this data. A low-rank (SVD/PCA) model of the scene stream is an experiment, not a plan: spawns
  and despawns are jumps a linear subspace models badly (`web/combat-docs/12`).
- **Quantisation error.** A uniform step `q` leaves at most `q/2` error per number. Choose `q` per
  field from what the renderer can show (one playfield pixel is the natural ceiling).
- **Interpolation (N7).** Snapshots arrive every second tick. Drawing at `render time − 2
  snapshots` (80 ms) always has two snapshots to blend: `(1 − α)·a + α·b`. Blend only slots
  active in both and moved less than a threshold; spawns, despawns and teleports (the Ninefold's
  blink, the Bastion re-entering from the right) must snap.
- **Prediction (N9).** The ship has no velocity state: the stick sets the velocity each tick
  (`web/combat-docs/02`). Predicting your own ship is replaying the unacknowledged inputs on the
  last acknowledged position, `p ← clamp(p + c·u)`. With N11 the server applies exactly the same
  maths, so the correction is exact when the inputs match.

### What determinism (N11) buys, and what it does not

- **Buys:** a run is its seed plus its inputs. The API can re-run a submitted solo replay
  headless and get the same score bit for bit, so solo scores can go on a leaderboard (N12). In
  network play client and server can compare a state hash each second and report a desync.
- **Does not change N1.** Rooms stay authoritative. Determinism is a check, not the transport.
- **Caveats:** every float that enters the engine must come from the engine (no `Math.*` imports);
  the build must be the same (the build id is part of a replay); NaN payloads are not
  deterministic in WebAssembly, so the engine must never depend on a NaN's bits.

## 3. Decisions still to make

| # | Question | Options | Recommended |
| --- | --- | --- | --- |
| S1 | Room code | 4 digits / 6 chars from a 32-letter alphabet (about 30 bits) / invite link | 6 chars **plus** per-IP attempt limits; codes expire when the room empties; an invite link carries the code |
| S2 | Who may create online rooms | anyone / signed-in only / server key | Anyone, with per-IP and global caps; signed-in only if abuse appears. (A key in the page is public, so a "create key" cannot protect a public site.) |
| S3 | LAN bind address | `0.0.0.0` / localhost only | `0.0.0.0` only for `npm run host`, with a printed warning; `npm start` stays localhost |
| S4 | LAN passcode | none / optional short code | 4-digit passcode shown in the host lobby; on by default |
| S5 | Who can kick or close a room | any / host only | The room's creator only |
| S6 | Display names | free text / initials only | Initials (three letters, already in the game): nothing to moderate, on boards too |
| S7 | Log retention | none / 7 days / 30 days | 7 days; IPs hashed; no message contents |
| S9 | Cost guard | spend cap / room caps | Both: usage limits on Railway and Vercel, `MAX_ROOMS`, `MAX_ROOMS_PER_IP` |
| S11 | Version compatibility | strict / minor tolerance | Strict equal build id; a mismatch says "refresh the page" |
| S13 | TLS | platform / Caddy | Platform-provided on Railway and Vercel |
| S14 | Voice or text chat | none / preset emotes | None |
| S15 | ~~Room server host~~ **Settled 2026-11-19:** Railway (with Redis and Postgres in the same project). Still measure tick cost in S3.1 to size the service and the room cap | — | Done |
| S16 | Vercel plan | Hobby / Pro | Hobby is free but for non-commercial use only; Pro ($20/month) if the game ever earns money |
| S17 | Auth (W3) | Clerk / Supabase Auth / self-hosted | Clerk; the database is Railway Postgres (decided with S15) |

## 4. Threat model

**Assets:** the integrity of runs and leaderboards, the host's machine and network (LAN), the
cloud bills and availability (online), players' privacy (IP addresses; with W3, their accounts
and saves).

| Actor | Tries | Main defence |
| --- | --- | --- |
| Cheating player (modified client) | Fake scores, positions, fire rate, speed | Server authority: rooms accept only inputs, validated in range and rate; boards accept only server-run or re-run results (N12) |
| Forged replay | A replay of inputs no human played (a bot, a slowed-down run) | Cannot be fully stopped; cap replay length and size, show replays on the board so others can watch, and keep a "remove" tool |
| Malicious joiner | Join uninvited, kick players, crash the room | Room code + attempt limits; creator-only controls; strict message validation |
| Flooder / DoS | Connections or huge messages to exhaust CPU, memory or bandwidth | Connection, message-size and rate caps; room caps; platform limits |
| Code guesser | Enumerate room codes | Code entropy + per-IP limits + short code lifetime |
| Cross-site attacker | A page you visit opens a socket to your LAN server | `Origin` check on the WebSocket handshake; no cookies or ambient credentials on the room server |
| Network snooper | Read or alter traffic | `wss://` and `https://` online; LAN is plain, so the lobby says so |
| Bill-runner | Use the servers or functions as free compute | Room caps, per-IP limits, replay-check queue, spend limits |
| Account attacker (W3) | Take over an account, spam sign-ups | Clerk: email verification, bot protection, sessions; we store no passwords |
| Supply chain | A malicious dependency | Few dependencies (`ws` in the room server; Clerk's SDK, a Postgres client in the API), pinned lockfiles, audit in CI |

**Out of scope:** payment data (none), anti-bot input automation beyond the caps above.

## 5. Security checklist by layer

Each item is **[todo]** until built and tested (see §7).

### 5.1 Transport
- [ ] Online only over `wss://` and `https://`; the room server refuses plain `ws` in production
  unless a trusted proxy terminates TLS.
- [ ] HSTS on the page (Vercel) and the room server.
- [ ] LAN is plain `ws://` by design. The lobby says "local network only, not encrypted".

### 5.2 Rooms and identity
- [ ] Room code from a CSPRNG (`crypto.randomInt`), not `Math.random`.
- [ ] Per-player **session token** (128-bit random) issued at join, required to reconnect, bound
  to the slot; never reused; never in URLs or logs.
- [ ] A room accepts joins only in the lobby (unless the same token is reconnecting).
- [ ] Failed joins limited per IP (e.g. 10 per minute), then a temporary block.
- [ ] Creator-only actions (start, kick, close) check the token, not a client flag.
- [ ] With W3: a signed-in player sends their Clerk session token in the first message; the room
  server verifies it locally with Clerk's public key (no network call) and records the player id
  for the result. Rooms never require it.

### 5.3 Messages
Validate every frame before it touches the simulation. Starting limits:

| Limit | Value |
| --- | --- |
| Max message size | 256 bytes (inputs); 4 kB (the first message, which may carry a Clerk token) |
| Input rate | at most 1 frame per tick (50/s) per player; extras dropped |
| Control messages | 5 per second |
| Connection idle timeout | 30 s without a ping |
| Handshake timeout | 5 s |

- [ ] Reject: wrong version, unknown type, non-finite numbers, stick or aim outside the unit disc,
  bad `seq`. Check the **norm**, not each component (`(1, 1)` has norm √2); the engine already
  projects the stick, so this is defence in depth.
- [ ] Never allocate by a client-supplied length; fixed-size binary frames only.
- [ ] Per-player queue capped; late or duplicate frames discarded, never replayed.

### 5.4 Authority and fairness
- [ ] The simulation reads only inputs from the server's own receive buffer. No client position,
  score, health, time or random value is ever used.
- [ ] Each room's seed is generated server-side and sent to clients only after the run ends (for
  its replay).
- [ ] The clock is the server's tick counter; client timestamps only feed ping statistics.
- [ ] A finished run's result comes from the server, is delivered once, and carries the build id.
- [ ] With W3, the room server writes the result to the database itself (its own database role,
  allowed only to insert runs), so no client ever submits an online score.

### 5.5 Resource limits
- [ ] `MAX_ROOMS`, `MAX_ROOMS_PER_IP`, `MAX_CONNECTIONS`, `MAX_CONNECTIONS_PER_IP`.
- [ ] Tick watchdog: if a room's tick takes over 15 ms repeatedly, log and shed (end the room,
  refuse new ones); one room never slows the others.
- [ ] Empty rooms closed after 60 s; abandoned lobbies after 10 minutes.
- [ ] Backpressure: if a client's socket buffer grows, drop snapshots, never queue without bound.

### 5.6 The page and the API (Vercel)
- [ ] `vercel.json` headers: `Content-Security-Policy` with `default-src 'self'`,
  `connect-src 'self' wss://rooms.<domain>` (plus Clerk's domain with W3), `frame-ancestors
  'none'`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`;
  `application/wasm` for `.wasm`.
- [ ] Hashed asset names with long cache lifetimes; `index.html` not cached, so a deploy never
  pairs an old `game.wasm` with a new page.
- [ ] The release build never contains test WASM, dev pages, `assets/inspo/` or
  `assets/bosses/draft-*` (a build check fails if it does).
- [ ] The room server's `ALLOWED_ORIGINS` holds exactly the site's origins (production and the
  preview domain if previews should reach rooms); everything else is refused at the handshake.
- [ ] Vercel preview deployments are public by default: either protect them (Vercel deployment
  protection) or keep them away from production keys.
- [ ] **API (W3):** every function verifies the Clerk session; rate limits per player and per
  IP; request size caps; the database URL and Clerk secret only in Vercel environment
  variables, never in the page.

### 5.7 Privacy
- [ ] Without an account nothing about a player is stored by us. Initials are three letters
  chosen on the client.
- [ ] IP addresses are used for rate limits and shown to nobody. Logs keep a salted hash for 7
  days.
- [ ] LAN guests see only the host's address (they typed it).
- [ ] With W3: email and sign-in details live at Clerk, not in our database; our tables hold a
  Clerk user id, initials, the save and runs. Account deletion removes them (Clerk's
  user-deleted webhook).
- [ ] A privacy page (what is stored, where, for how long, which vendors: Vercel, Railway,
  Clerk) and terms, before W3 opens. Accounts 13 and older; guest play for everyone.

### 5.8 Deployment
- [ ] Room server container runs as non-root, read-only filesystem where possible, a health
  endpoint that says only "ok".
- [ ] No secrets in the image or repo; Railway variables and Vercel environment variables only.
- [ ] `.dockerignore` excludes notes, tests, `.git`, `docs`, `assets/inspo`.
- [ ] `npm audit` and lockfile review in CI; monthly dependency update.
- [ ] Usage limits set on Railway and Vercel before the first public deploy; alert on restarts.
- [ ] Redis and Postgres reachable only on Railway's private network from the room server; the
  Vercel API reaches them over their public proxy with TLS and a password (or through a small
  internal API on the room service), never from the page.
- [ ] Redis has a password, no `FLUSHALL`/`CONFIG` for the app user, and an eviction policy that
  never evicts keys without a TTL.
- [ ] Graceful shutdown on SIGTERM: tell clients, finish or abandon rooms cleanly.

## 6. LAN-specific traps

1. **Binding.** The server must listen on all interfaces for a second computer to reach it, which
   exposes it to everyone on that network. Mitigations: S3 and S4, the Origin check, rate limits.
2. **Mixed content.** An `https://` page (the Vercel site) cannot open `ws://` to a LAN address.
   LAN play must load the page over `http://` from the host itself, so the lobby gives the guest
   an `http://<ip>:<port>` link (and a QR code), never a button on the public site.
3. **Local-network permission.** Chrome now asks before a public site talks to a private address.
   Same-origin LAN avoids it; re-test on current Chrome, Safari and Firefox.
4. **Gamepads over plain http.** Some browsers expose the Gamepad API only in a secure context
   (HTTPS or `localhost`). A guest on `http://192.168.x.x` may see no controller. Test first in
   S4. Fallbacks: the host serves HTTPS with a self-signed certificate (a one-time warning), or
   the guest plays on the keyboard.
5. **Firewall.** macOS and Windows ask to allow incoming connections the first time; the setup
   guide says so.
6. **AP isolation.** Some Wi-Fi blocks device-to-device traffic; the lobby detects "guest cannot
   reach host" and says so.
7. **Plain text.** Anyone on the network can read or alter LAN traffic. Acceptable for this game;
   the lobby says so.
8. **Changing IP.** DHCP can change the host's address; the lobby shows the current one each time.

## 7. What the client must get from the server (scene audit, S3.2)

Snapshots skip frames and can arrive late, so anything a painter or the sound observer works out
by comparing one frame with the last must arrive as an **event** instead. Known cases (P3 and P4):

| Today inferred from frame changes | Becomes |
| --- | --- |
| Ringwarden blade shattered (a blade that existed last frame is gone) | `blade_broken {slot}` |
| Missile shot down or expired (missile burst) | `missile_gone {slot, shot}` |
| Blocked-shot gold sparks | `shot_blocked {x, y}` |
| Exhaust and missile trails, Tidecaller tendrils (frame history) | stay painter-side, but interpolated positions only and reset on a snap |
| Boss sound cues (attack starts, phase changes) | check each against `src/boss/sound/observer.mjs` |
| Hit blips, score pops, pickup sounds | events |

## 8. Security tests to build

| Test | Proves |
| --- | --- |
| Fuzz the frame decoder (random, truncated, oversized, NaN) | No crash, no state change |
| Flood: 1000 messages/s from one socket | Rate limit drops or closes it; other rooms unaffected |
| Handshake from `http://evil.test` | Refused |
| 1000 wrong room codes from one IP | Blocked after the limit |
| Reconnect with a wrong token | Refused; the slot is not taken over |
| Version mismatch | Clear error, no room created |
| Creator-only action by a guest | Refused |
| Two room services creating the same code at once | Exactly one wins (`SET NX`); the other draws a new code |
| Room server restarts | Its Redis entries expire; joiners get "room not found", not a dead socket |
| Redis down | Rooms already running keep playing; new rooms and joins fail with a readable error |
| Load test with bot clients (reuse the boss bot) | Tick time stays under budget at the room cap |
| Slow client (stalled reads) | Server memory stays bounded |
| Replay check (W3): a valid replay, a tampered score, an over-long replay | Accepted, rejected, rejected |
| API without a session, with another player's id | Refused |
| Page headers on the Vercel deploy | CSP, HSTS, nosniff present; no test WASM or drafts served |
| `npm audit`, container scan (e.g. Trivy) | No known high issues |
| Manual: LAN from a second machine with the firewall on | Works only after allowing; reports AP isolation |

## 9. If something goes wrong

- **One room:** creator "close room" or an admin signal; clients get "room closed" and return to
  the lobby.
- **The room server:** SIGTERM does a graceful shutdown; a restart is safe because rooms hold no
  saved state.
- **Abuse from one IP:** add it to a block-list variable and redeploy.
- **A leaked secret** (Clerk key, database URL): rotate it in Vercel or Railway and redeploy.
- **A bad page deploy:** roll back to the previous deployment in Vercel (instant).
- **Unexpected bill:** lower `MAX_ROOMS`, stop the room service, check both usage limits.
- **A bad leaderboard entry:** remove the run; if it came from a replay, keep the replay for review.
- Keep a short runbook (W2) with these steps and each platform's commands.
