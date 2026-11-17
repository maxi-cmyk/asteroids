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

**Contents:** Shipped · Tools · Roadmap at a glance · P0 Playtest fixes · P1 Boss redesigns · P2 Boss polish · S0 Boss close-out · S1 Hardware
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
| P0 | ~~Playtest fixes (2026-11-13): music start, hitboxes, boss movement, pickup feedback, aim indicator, co-op hull pick~~ **Done 2026-11-13** (optional boss backstop not built) | none (do first) | M |
| P1 | ~~Boss redesigns: star-fill art pipeline, Zodiarch dragon with zodiac creatures, nine-tailed fox, Bastion capital ship, Gunnery light cruiser~~ **Done** 2026-11-13 (ascendant flavour not built) | P0.3 | XL |
| P2 | Boss polish: Ninefold runs between perches with a real gait; Zodiarch's twelve creatures redrawn after the classical star-atlas figures (done); Zodiarch attacks fired from a body, full charges, several signs at once (done; creature idle motion open) | P1 | L |
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

## P0. Playtest fixes (2026-11-13)

Found in playtesting. Order: P0.1 → P0.2 → P0.3, then P0.4–P0.7 in any order (they are
independent and touch separate files). Engine changes still compile for the OLED target and
pass `tests/run_host.sh`.

### P0.1 Music does not start on load ("Music on", silence)

Reproduced: with Music saved as on, a reload shows **Music on**, but no `AudioContext` exists
and no track has been asked to play. The first click or key starts `home.mp3` at once.
Browsers block sound until a user gesture; `GameAudio.unlock()` only runs on `pointerdown`,
`keydown` and the Sound/Music buttons, so the label promises music that cannot play yet.
Gamepad-only players never unlock it. On Safari a refused `play()` is swallowed in
`music.mjs` (`.catch(() => {})`) and that voice is never retried.

- [x] While music is on but audio is not unlocked (`!audio.context` or `context.state !==
  'running'`): button reads **Music on · click to start**, and a small "Click or press any
  key for sound" hint shows on Home. Both clear on unlock.
- [x] Start the music inside the unlocking gesture: `unlock()` calls `#tickMusic()` straight
  away instead of waiting for the next frame.
- [x] `MusicPlayer`: a voice whose `play()` rejects is marked `blocked` and retried on the
  next gesture (expose `retryBlocked()`, called from `unlock()`).
- [x] A gamepad button press calls `unlockAudio()` (input-hub); if the browser still refuses,
  the hint stays up.
- [x] Tests (`audio.test.mjs`): rejected `play()` is retried; label states; unlock starts the
  menu request in the same call.

### P0.2 Hitboxes do not match the sprites at the edges

Measured from the atlases (silhouette radius by angle vs collision radius):

| Thing | Collision | Drawn |
| --- | --- | --- |
| Ship (`hull-dart`) | circle r 7 | nose/tail 11.5–12.5, flanks 6.0 |
| Large rock | r 16 | 13.2–15.7 |
| Medium rock | r 10 | 7.9–9.6 |
| Small rock | r 6 | 4.3–5.7 |

So a rock passing the flank kills about 3 px before it touches, and things clip through the
nose and tail without a hit.

- [x] Ship hurtbox: 2–3 circles along the aim axis (nose, core, tail) sized from the sprite,
  behind one helper (`ship_contact(x, y, r)`) used by every `SHIP_RADIUS` contact check:
  `src/asteroid.cpp:343`, `web/native/boss/shots.h:73`, `boss/lifecycle.h:99`,
  `boss/hazards.h:108,119`, `coop.h`. Pickups keep a forgiving circle. Check every hull's
  silhouette, not just the dart.
- [x] Rocks: ship contact uses about 0.85 × radius (mean silhouette); player shots keep the
  full radius, so the rule leans in the player's favour.
- [x] Laser at the edge: `combat_beam_hits` (`combat.h:176`) and `bs_beam_hits`
  (`boss/hits.h`) require the rock's **centre** on screen, so a rock half-entered from the
  right cannot be lasered. Change to "any part on screen" (`x + r >= 0 && x - r < SCREEN_W`).
- [x] Measure each boss's body contact circles against its art the same way; fix outliers.
- [x] Host tests: flank near-miss is not a hit; nose overlap is a hit; half-visible rock is
  lasered. Update the separation in `web/native/exports/test.h:177`.

### P0.3 Bosses must move (no hiding behind or beside them)

Bosses rest at x ≈ 324–380 on a 480 px field; the ship reaches x = 464. Sentinel,
Cinderforge, Bastion and Warden never move; Ringwarden only bobs, Tidecaller loops ±22 px.
Nothing reacts to a pilot behind or beside the body.

- [x] Motion profile per `BossOps` row (vertical/horizontal range, top speed, style: track,
  sweep, reposition). The framework (`boss/lifecycle.h`) steers the rest point toward the
  targeted pilot's lane within that range.
- [x] Move only between attacks (`boss.atk == 0`) so telegraphed lanes and beams stay where
  they were shown.
- [x] Audit the ~13 `home_x`/`home_y` uses in `boss/fights/*.h` so parts and attacks follow
  the current position.
- [x] Anti-camp: a pilot behind the body (`px > boss.x - margin`) or tucked above/below it for
  about 1.2 s triggers a short-telegraph repel (ring or knockback), then the boss turns to
  face them.
- [ ] Optional backstop: during fights the ship's right bound becomes the boss's front edge,
  drawn as a visible barrier. *Not built: movement plus the repel ring closes the exploit in
  tests; revisit only if playtesting still finds a safe spot.*
- [x] `boss.test.mjs` invariants (`min_corridor`, `spawn_in_body`, violations) stay green;
  new test: a pilot parked behind the boss is hit or pushed out within N s. Update the demo
  pilot (`src/demo/boss-pilot.mjs`), `guide.mjs` and `web/COMBAT.md`.

### P0.4 Aim indicator

The reticle (`src/render/layers/players.mjs:100`) sits 66 px out and is clamped to the screen,
so near an edge it slides off the dotted line and points somewhere else; the 1 px cross and
dots read as noise over busy backdrops.

- [x] Replace with a small chevron/arc just ahead of the nose (about 20–24 px out, never
  clamped), in the pilot's colour, brighter in precision mode. Keep the hull's own 16-way
  aim sprite as the main read.
- [x] Settings › Controls: "Aim indicator: chevron / off" (default chevron), saved per profile.

### P0.5 Pickup collect animations, one per kind

Today every collect draws the same growing cyan square (`world.mjs:79`,
`COLLECT_CUE_MS` 400 ms), and the scene does not say which kind was taken.

- [x] Engine: add `SCENE_COLLECT_KIND` (`native/scene.h`, `scene-layout.mjs`), set where
  `collection_cue_left` is set.
- [x] **Shield**: a curved, triangular shield front (like the shield silhouette) that
  radiates outward from the ship in 2–3 expanding echoes, fading; cyan.
- [x] **Health**: the heart shape radiating outward the same way, red, with a brief pulse on
  the lives counter.
- [x] **Multishot**: three amber rays fanning out along the spread angles from the nose.
- [x] **Double fire**: two parallel cyan streaks shooting forward with a quick double flash.
- [x] Each animation runs off the cue timer, respects reduced motion (static flash instead),
  and is added to the `dev/assets.html` gallery.

### P0.6 Double-fire icon

Double fire has no sprite: the pickup is drawn as a box with "2X" text (`world.mjs`,
`PICKUP_SPRITE[2] === null`).

- [x] Draw a `doublefire` sprite (12×12, same style as `multishot`/`shield`/`health`: two
  stacked forward bolts) into the sprites atlas; use it for the pickup, the HUD ability card
  and the Help page.

### P0.7 Co-op: hull selection after ready-up

After both pilots ready up the lobby goes straight to Launch; each pilot silently flies the
hull equipped on their chosen profile (`CoopSession.hulls()`), with no chance to pick.

- [x] After both are ready, a split hull-pick step: each pilot browses unlocked hulls with
  their own device (preview reusing the Hangar's stage art), confirms, then Launch. Default
  focus is the profile's equipped hull, so two confirms keep the old behaviour.
- [x] Locked hulls show as locked (unlocks are per profile). Both pilots may fly the same
  hull; the accent colours already tell them apart.
- [x] Choice saves to that profile's hangar entry. Back/cancel returns to the ready state.
- [x] Update `docs/UI-NAVIGATION.md` and the co-op menu tests (`coop-menu.test.mjs`).

---

## P1. Boss redesigns (2026-11-13)

References live in `web/assets/inspo/` (see its README). Every redesign keeps the house 8-bit
style: same palette rules, pixel scale and outline treatment as the other region sheets,
drawn through `tools/make-bosses.py` / `tools/boss_art.py`. Do P0.3 (boss movement) first:
these designs assume moving bosses.

### P1.0 Housekeeping

- [x] `build.mjs` copies all of `assets/` into `dist/`; exclude `assets/inspo/` so reference
  images never ship (everything there except `zodiac-ring-layout-concept.png` is third-party
  or watermarked stock art).
- [x] Inspired by, not copied: the Bastion and Gunnery must read as our own ships (no
  twin-globe bridge, no film panel layouts). Same footing as open decision 8 (music rights).

### P1.1 Star-fill art pipeline (shared by P1.2 and P1.3)

*Draft for approval (2026-11-13):* `web/assets/bosses/draft-p1-starfill.png`, built by
`web/tools/make-p1-drafts.py` on the new `web/tools/starfill.py`. Not in game yet.

The Zodiarch, its twelve sign creatures and the fox all use one look: **a dark-blue
silhouette filled with scattered constellations**. Make it a tool step so every sprite comes
out consistent and new creatures are cheap.

- [x] `tools/boss_art.py`: input is a 1-bit silhouette mask (plus an optional detail layer
  for eyes, teeth, claws). Output: deep-navy fill with a soft dithered gradient (lighter
  toward the top edge), scattered 1 px stars, nearby stars joined into small constellations
  (1 px lines at low brightness), a 1 px rim in the creature's accent colour, and 2-3
  brighter "key stars" placed by hand (eyes, the weak point).
- [x] Seeded per sprite so the star pattern is stable between builds; a second frame
  re-rolls only twinkle brightness, so idle animation is a shimmer, not a reshuffle.
- [x] Palette: navy body `#0d1640`-ish to `#1c2c6e`, star white/pale gold, rims per creature.
  Check readability against all rift backdrops (`render/backgrounds/region-painters.mjs`).

### P1.2 Final boss: the Zodiarch, a celestial dragon

Problem: the Warden (`warden-0`, rift sheet) and the Cinderforge (`forge-0`) are both round,
spiky orbs with a glowing centre, so the last fight looks like a recolour of the third. The
first constellation-god sketch did not work either; keep only its **zodiac ring layout**
(`assets/inspo/zodiac-ring-layout-concept.png`).

**Name: Zodiarch** (decided). A long serpentine star dragon that swims through and around
a ring of the twelve zodiac signs. Inspiration: `zodiarch-dragon-serpent.png` (S-curve body,
claws), `zodiarch-dragon-head.png` (expressive head, horns, teeth), `zodiarch-dragon-winged.png`
(a pair of wing fins along the neck). The references are stock art with watermarks: mood
only, never traced.

Look
- [x] Head sprite (about 72×56) with horns, whiskers and a bright star eye; two frames
  (mouth closed, mouth open for throws and roars). Body is a chain of ~14 segment sprites
  (straight and bend), short claws on two of them, a tail tip with a star tuft. All
  star-filled (P1.1), rim in pale gold.
- [x] The core is a **pearl**: the old binary heart star, now a glowing orb the dragon holds
  under its chin. It dims when closed and blazes when the core window is open.
- [x] The zodiac ring orbits behind it. A sign taken from the ring leaves a dark gap until it
  returns.
- [x] Death: the body segments come apart one by one from the tail, each bursting into its
  stars; the pearl flares into a short supernova (replaces `src/boss/death/rift.mjs`).

Movement (builds on P0.3, and is the main answer to hiding)
- [x] The head follows a path and every segment follows the one before it (snake follow,
  sampled from a position history), so the body sweeps the field as it moves.
- [x] Between throws it coils to a new place: across the top, along the bottom, or round the
  back of the field, so there is no permanently safe spot behind it. Telegraph the head's
  next path with a faint dotted trail 600 ms ahead.
- [x] Body segments are contact hazards; only the pearl is the core (`BC_CORE`). Re-check
  `min_corridor` with the body coiled at its widest. *Changed in build:* the segments do **not**
  absorb shots (only head and snout block); a soaking body sat between pilot and pearl and the
  fight ran past 150 s.

Signs transform into creatures (all twelve)
- [x] When the dragon throws a sign, its constellation stars fly out and **re-form into that
  sign's creature** (about 700 ms, stars sliding from constellation points to points on the
  creature's outline, then the star-filled sprite fades in). The transformation is the
  attack's warning.
- [x] The creature carries out its attack, then dissolves back into its constellation and
  returns to the ring.
- [x] Each creature keeps one visible **alpha star** (Sagittarius' arrowhead, Scorpio's red
  sting, Leo's heart). Shooting it breaks the creature back into harmless stars early and
  shortens the wait for the next core window. The laser breaks any creature it crosses.
- [x] Creature sprites (about 48-64 px, idle + attack frame each), star-filled with a rim in
  the sign's colour, so the fight reads as one night sky. Character reference for pose and
  readability: `zodiac-sign-creature-sagittarius.png`.

| Sign | Creature | Attack |
| --- | --- | --- |
| Aries | Ram | Lines up on the pilot's row (lane warning), then charges across, horns first. |
| Taurus | Bull | Stampedes, then the star knot on its shoulder bursts into 7 scattering pellets. |
| Gemini | Twin figures | Two copies mirror each other above and below the pilot's row and close in. |
| Cancer | Crab | Scuttles sideways; its claws pinch the field from top and bottom, leaving a gap. |
| Leo | Lion | Roars an expanding ring (with a safe notch), then pounces. |
| Virgo | Maiden with a sheaf | Sows seeds that bloom into short-lived turrets, one aimed needle each. |
| Libra | Living scales | Tilts the field (gentle pull) toward the heavier pan; breaking a pan levels it. |
| Scorpio | Scorpion | Tail whips a curved lash; the red sting homes briefly. |
| Sagittarius | Centaur archer | Three aim lines, then an arrow volley along them. |
| Capricorn | Sea-goat | Dives off the bottom edge and rises from below in a wave of stars. |
| Aquarius | Water bearer | Pours a sine stream of star droplets across the field. |
| Pisces | Two fish on a cord | Both home slowly; the cord between them is lethal, so do not fly between. |

Fight structure
- [x] Phase 1: one season (3 signs), one creature at a time. Phase 2: two seasons, up to two
  creatures out. Phase 3: the whole ring, and the dragon breathes a short starfire cone
  between throws. Tier 2+ frenzy: **Great Conjunction**, three signs transform at once from
  three sides.
- [ ] Optional flavour: the sign of the real-world date is the **ascendant**, thrown first and
  a little stronger. *Not built* (optional; left for later).
- [x] From the current Warden: drop the gallery of earlier bosses' attacks (the signs replace
  it) and the mirror. The cloak moves to the fox (P1.3).
- [x] Engine (*built as boss parts* `PK_SIGN`/`PK_TAIL`/`PK_DECOY` with linked hazards, not
  shot-pool groups): a creature is a linked group in the existing shot pool (`link` on `BossShot`)
  plus `HK_*` hazards for lanes and cords. Stay inside the limits: 48 shots, 6 lethal hazards,
  `min_corridor` in `boss.test.mjs`. The snake body needs `BOSS_CIRCLES` headroom (112 today).
- [x] Rename: change the **display name only** to Zodiarch (`src/boss/scene.mjs:143`,
  `src/boss/sound.mjs:36`, `src/audio/menu-themes.mjs:30`, Help, COMBAT.md). Keep internal ids
  (`warden`, `boss_warden`, `BK_WARDEN`) so records, unlocks and saves need no migration.
- [x] Update the guide (`src/boss/guide.mjs`), the demo pilot, the sound book
  (`src/boss/sound/book/warden.mjs`: a rising chime per transformation, a distinct cue per
  creature) and the golden tests.

### P1.3 The nine-tailed fox

Reference: `assets/inspo/fox-nine-tailed.png` (stock art, mood only). Keep the silhouette
idea (sitting fox, nine tails fanned behind it, ears up), **recolour to dark blue and fill
it with scattered constellations** (P1.1), with a pale cyan rim and two star eyes.

Name: **Ninefold** (decided). Avoid names that collide with existing
franchises (for example "Star Fox", "Ninetales").

Placement (decided): the **final mini-boss**, replacing the Lens Imp in the rift region, the
Zodiarch's herald, so the whole rift region shares the star-fill look. It takes the Warden's
cloak and the Lens Imp's blink, which suit a trickster.

Fight sketch
- [x] **Nine tails as health.** Each tail is a part (like Ringwarden blades) that can be shot
  off; every lost tail fades to stars. The tails left are its phase meter and its arsenal.
- [x] **Tail comets:** tails flick forward and launch comets along aim lines; fewer tails,
  fewer comets but faster.
- [x] **Foxfire:** three slow homing wisps that orbit, then dart at the pilot one at a time.
- [x] **Illusion:** it splits into three foxes; only the real one has lit star eyes and a
  shadow. Hitting a fake pops it into stars.
- [x] **Cloak / blink** (moved from the Warden and Lens Imp): it vanishes into the starfield
  and reappears elsewhere, with a 500 ms shimmer warning.
- [x] Core: the forehead star mark (from the reference's forehead sigil), open after a tail
  is lost or after an illusion is solved.
- [x] Hull unlock: the Lens Imp's hull unlock moves to it.
- [x] Death: the tails come apart one by one, then the fox dissolves into its constellations.

### P1.4 Bastion: wedge capital ship

Reference: `assets/inspo/bastion-wedge-capital-ship.webp`. The Bastion is already a wedge,
but it reads as a blue cone with an eye.

- [x] Long dagger wedge pointing left at the pilot, grey hull with dark panel lines and a
  lit trench of window pixels along the edge; stepped ziggurat superstructure toward the
  stern; a tall command tower at the back (our own shape, not twin globes); engine glow at
  the rear.
- [x] Remove the eye. The weak point becomes the **reactor/bridge**, shown by the existing
  open/closed states.
- [x] Map the existing parts onto the ship: cannon = dorsal turret on the superstructure,
  missile pods = side batteries along the trench, mines = a ventral hangar bay that opens.
  Keep the part ids and hit circles; re-measure contact circles against the new art (P0.2).
- [x] Death (breaks in two along a chain of explosions) already fits; retime it to the new
  silhouette.
- [x] Sheet size stays within the current `bastion-hull` cell (340×196) unless the ruins
  sheet layout is changed too.

### P1.5 Gunnery: light cruiser

Reference: `assets/inspo/gunnery-light-cruiser.webp`. Today it is a small tube with an eye.

- [x] Slim wedge with a raised dorsal spine, boxy bridge block at the rear, two round engine
  nacelles out on the flanks, small side turrets that flash when they fire. Same grey family
  as the Bastion so they read as one fleet.
- [x] Remove the eye; the weak point is the bridge block or the nacelles.
- [x] Its hull unlock icon (the mini-boss unlock) updates to match. (The unlock shows the
  hull's own icon; the boss name in the unlock text comes from the display name.)

---

## P2. Boss polish: Ninefold runs, mythological zodiac (2026-11-16)

Playtest of the P1 bosses (state sheets from `web/dev/boss-states.html`): Ninefold has legs but
never uses them, and the twelve Zodiarch creatures look basic and cartoony next to the dragon.
Same rule as P1: **draft PNGs first** (in `web/assets/bosses/draft-*`, git-ignored and not
shipped) for approval, then build.

### P2.1 Ninefold runs (up, down, left, right)

Today it sits in one pose and the framework slides it (`BOSS_MOTION`, `{60, 50, 1.4}`), so it
glides. It should **run** between perches like a fox, and sit to cast.

**Movement**
- [ ] Its own motion (`own = true` in `BOSS_MOTION`, like the Zodiarch and Shardling). Between
  attacks it picks a **perch** from a 3×3 grid in the right of the field (x 270 / 345 / 420,
  y 92 / 140 / 188, all keeping the whole fox on screen and the body at x ≥ 216) and runs there.
  Runs go in any direction: left and right along a row, up and down a column, or diagonally.
- [ ] Never two runs to the same perch in a row; never a perch whose straight path passes within
  50 px of a pilot (no running through the player); prefer a perch level with the nearest pilot
  in front, so it still answers players who hide high or low (replaces P0.3's steering for it).
- [ ] Speed about 3.2 px/tick with ease in and out (a short crouch before, a skid after), so a
  run across the field takes about 0.6 s. Attacks only start once it has sat down; it never
  moves while an attack is warned (same rule as P0.3). Rest times stay as today, so the fight
  length should not change much: re-measure the difficulty table and boss-bot time.
- [ ] Running is not a free hit on the pilot: contact circles follow the running pose; the run
  path is chosen clear of pilots (above). Tails stay shootable while it runs (they are still
  its health), the forehead mark only while sitting.

**Animation (art in `zodiac_art.py`, sheet `rift`)**
- [ ] **Run cycle**, facing left: 6 frames of a gallop (gather, reach, stretch, land), body long
  and low, ears back, all nine tails streaming behind as one flowing mass with a wave through
  it. Facing right: the same frames mirrored when it runs away from the pilot; it turns back
  to face left (2-frame turn) before it sits.
- [ ] **Up and down**: the same cycle with the body tilted about 25° (separate frames drawn
  tilted, not rotated in the browser, to keep the pixels crisp); a short **leap** pose for runs
  of more than 80 px vertically.
- [ ] **Transitions**: sit → rise (2 frames), run, skid → sit (2 frames). The seated pose keeps
  the P1/P2 idle (breathing, eye blink, tail sway).
- [ ] **Star paw prints**: each footfall leaves a small star that fades over 600 ms, so its route
  reads like a constellation being drawn. Cosmetic only.
- [ ] Tail hit points per pose: a table of the nine tail offsets for the seated pose (today) and
  for the running pose, mirrored when facing right; the engine and `NINEFOLD` share it (as the
  P1 geometry does) so the hit circles follow the drawn tails.

**Attacks that use the legs**
- [ ] **Illusion**: the three foxes run to their places instead of gliding (each picks a perch
  of the illusion triangle); the swap to the small size happens in the shimmer, as now.
- [ ] **Blink** stays the star dissolve; it reforms on a perch.
- [ ] Optional new attack, **Fox run**: it dashes along a warned lane (900 ms, like every lane)
  across the right of the field and back to a perch, leaving a trail of star prints that flare
  into short-lived comets aimed at the pilot. Only if the fight needs more variety after
  playtest.

**Checks**: body x ≥ 216 and on screen at every frame of a run; `min_corridor` ≥ 42;
no lethal hazard without its warning; boss-bot beats it within 150 s; the repel ring still
fires for a pilot behind it; state sheet regenerated (`boss-states.html?kind=11`) with a run
strip (run left, right, up, down, leap, sit).

**Draft for approval first**: `draft-p2-ninefold-run.png` with the run cycle both ways, the
tilted up/down frames, the leap, the turn and the sit/rise transitions, plus an animated
preview strip.

### P2.2 Zodiarch: mythological zodiac creatures

The twelve creatures (P1.2) are small, round, simple shapes. Redraw them after the classical
figures of the constellations: the forms in Ptolemy's catalogue as engraved in the great star
atlases (Bayer's *Uranometria*, 1603; Hevelius's *Uranographia*, 1690; Flamsteed's *Atlas
Coelestis*, 1729; *Urania's Mirror*, 1824). All are public domain, so reference prints can go in
`web/assets/inspo/zodiac/` (with their sources in the README; build already excludes `inspo`).

**Look**
- [x] Real proportions and anatomy, not chibi: no round heads or big eyes. Each figure is drawn
  as the engraved atlases draw it: muscle, fleece, feathers and drapery as fine **engraving
  lines** in the creature's rim colour (the star-fill `detail` layer), over the navy star-fill.
- [x] Bigger: about 90-120 px across for the large figures (today 60-90), so the detail reads.
  Still within the shot and hazard limits, and still clear of `min_corridor`. *Built:* 72-168 px
  (Scorpius is the widest, for its claws). Contact stays the P1 12 px circle at the centre (8
  for a fish): a charging creature's lane is warned for that width, so the art may be bigger
  but the body never reaches past what was warned. Each live creature gets a 1 px edge and a
  soft glow in its sign colour so it reads against the navy dragon.
- [x] Two frames each: the **hold** pose (the atlas pose, while it forms) and the **strike**
  pose (when it attacks). Plus the existing bob while it is live.
- [x] The **key star** sits on that constellation's real named star, so the weak point is the
  star an astronomer would point to. The ring glyphs (`zodiac.mjs` GLYPHS/CHAINS) are redrawn
  to the true star patterns so a sign in the ring matches the creature it becomes. *The key
  stars are done; the ring glyphs are not redrawn yet (they are close to the real patterns
  already).* Gemini's key is on each twin's head (where the atlases put Castor and Pollux), not
  the star over his cap: a twin can spawn high, and a key 52 px up would leave the screen.

**The twelve** (myth, figure, key star; the attack stays as in P1.2 unless noted)

| Sign | Myth | Figure (after the atlases) | Key star |
| --- | --- | --- | --- |
| Aries | Chrysomallos, the golden-fleeced ram of Phrixus and Helle | Crouched ram, head turned back over its shoulder, heavy curled horns, fleece in gold curls; strike: rears and charges | Hamal (on the horn) |
| Taurus | Zeus as the white bull that carried off Europa | **Forepart only**, charging, head low and horns forward, the hindquarters dissolving into stars; Hyades as the face, Pleiades as a cluster on the shoulder | Aldebaran (the red eye) |
| Gemini | Castor and Pollux, the Dioscuri | Two youths side by side, an arm round each other; one holds a lyre, the other a club; strike: they step apart | Pollux (one head) |
| Cancer | Karkinos, the crab Hera sent against Heracles at the Hydra | Broad armoured crab (lobster-like in the Renaissance atlases), raised claws | Praesepe, the Beehive cluster on the shell |
| Leo | The Nemean lion, whose hide no weapon could pierce | Striding lion, full mane, tail with a tuft; strike: rears to pounce | Regulus (the heart) |
| Virgo | Astraea or Dike, maiden of justice who left the earth last | Winged maiden in long robes, an ear of wheat in her hand; strike: wings open | Spica (the ear of wheat) |
| Libra | The scales of Astraea; to the Greeks the scorpion's claws (Chelae) | The balance held in two great claws, so it is not a plain scales icon; strike: the beam tips | Zubenelgenubi (a pan) |
| Scorpius | The scorpion Gaia sent against Orion | Long segmented body, claws forward, tail arched high over the back | Antares (the red heart) |
| Sagittarius | The centaur archer (Crotus, or Chiron) | Keep the approved P1 centaur (rearing, cloak, overhead draw), redrawn in the engraved style | Alnasl (the arrowhead) |
| Capricornus | Pan, who took a fish's tail fleeing Typhon (or the goat Amalthea) | Sea-goat: goat foreparts with swept-back horns and a long curling fish tail with fins | Deneb Algedi (the tail) |
| Aquarius | Ganymede, cupbearer of the gods | A youth pouring a stream from an urn on his shoulder; the stream is part of the figure and becomes the attack | Sadalmelik (the shoulder) |
| Pisces | Aphrodite and Eros, turned into fish fleeing Typhon | Two fish, one swimming up and one along, tied by a long cord knotted at its middle | Alrescha (the knot) |

**Engine and tests**
- [x] Update `SIGN_KEY` (engine and `scene.mjs`) for the new key positions; the creature hit
  circles and the break test follow. Re-check `min_corridor` with the bigger figures.
- [x] Attacks unchanged except where the figure suggests it reads better: Gemini splits into
  its two youths, Aquarius's stream comes from the urn, Libra's claws close on the beam.
  *Built as art only:* Gemini and Pisces now draw one twin / one fish per creature (they
  already split in two); attack behaviour is unchanged.
- [x] Regenerate the rift sheet, the attack gallery (`boss-attacks.html`) and the state sheet.
  (Rift sheet and state sheet regenerated; the attack gallery reads the same sheet.)

**Draft approved 2026-11-16** (`draft-p2-zodiac-myth.png`, from `tools/make-p2-zodiac-draft.py`;
art in `tools/zodiac_myth.py`). It shows all twelve in both poses, each beside its current P1
creature. The public-domain atlas plates were not downloaded into `inspo/`.

### P2.3 Zodiarch attacks: fired from a body, full charges, several signs at once

**Built 2026-11-17** (sections 1 to 5; section 6 hurt and break, idle still open). Where the
build differs from the plan below:
- One eye beam, not two, and a 16° wedge (Taurus's too), not 25°: with the wider wedge a
  pilot pinned in a corner could not get out in time.
- No new hazard kinds: the black hole is an `HK_PULL` (0.8 px a tick, about a fifth of full
  thrust) plus a 10 px `HK_POOL` core, both styled `e = 1`; the net is three `HK_LANE`s
  styled `ZS_NET`. New shot families: `SF_FIREBALL`, `SF_NOVA` (also Aquarius's droplets),
  `SF_SUN` (Leo) and `SF_METEOR`. Hazard slots 10 to 16 (scene: 1560 floats).
- Breaking a creature costs the dragon 2 sub-hits, not 4: with several signs out the bot
  broke so many that the fight fell to 40 s.
- Stages are x 185 to 215 (the coils reach x 260 at the left of the swim).
- Hurt is a key-star hit that does not break the creature (creatures still have no body
  hit circle, so shots pass through them as before).
- The scripted pilot now keeps out of a sweeping beam's whole wedge and looks further ahead
  while one is warned (as a person would); that moved three other bosses' hit counts a
  little. Re-measured in `web/COMBAT.md`: 47 / 54 / 54 s, 1.4 / 2.4 / 2.4 bot hits.
- Live-engine frames of every attack: `web/dev/zodiarch-attacks.html`; test hooks 10 (start
  an attack) and 11 (hold the next one off).

Playtest (2026-11-17): shots and walls often appear out of nowhere instead of coming from the
dragon or the creature; a charging sign stops halfway; only one sign is ever out (three only
in the tier III frenzy). Today's sources, from `bs_sign_act` in `warden.h`:

| Sign | Today | Problem |
| --- | --- | --- |
| Aries | lane from the right edge, charges 480 px | lane starts at the screen edge, not the ram |
| Taurus | charges 180 px, then bursts | stops halfway |
| Gemini | four lanes from the right edge (x 476) | walls come from the edge, not the twins |
| Cancer | two columns from the top and bottom edges | nothing to do with the crab's claws |
| Leo | roar ring from the lion (good), pounce 320 px | the pounce stops mid-field |
| Virgo | four turrets appear at random spots | seeds come from nowhere |
| Libra | field pull, five weights from mid-body | weights not from the pans |
| Scorpius | lash arm and sting from its centre | not from the tail and stinger |
| Sagittarius | arrows from a fixed offset (x - 46) | close, but not the art's arrowhead |
| Capricornus | wave of stars from the bottom edge | not from the sea-goat |
| Aquarius | stream from a fixed offset | close, but not the urn's mouth |
| Pisces | lethal cord between the two fish | fine |

The dragon's only own attack is the starfire breath (phase 3).

**1. Every shot has a visible source.**
- [x] **Emitters from the art.** `zodiac_myth.py` exports, per sign and pose, the points things
  come out of (eyes, mouth, hands, claws, bow, urn, pans, stinger, tail splash), as offsets
  from the frame centre, like `SIGN_KEY`. The dragon gets the same: both eyes, mouth, the
  pearl and the two pairs of claws. The engine and renderer share the table (`SIGN_EMIT`,
  `ZOD_EMIT`).
- [x] **Charge, then release.** While an attack is warned, light gathers at its emitter
  (inflowing motes and a glow that brightens with the warning). On release there is a muzzle
  flash there and the shot leaves from that point with a short trail. Warning lines start at
  the emitter, not at the screen edge.
- [x] **Fix today's sources** (same attacks, honest origins): Gemini's walls become beams
  from each twin's outstretched hand; Cancer's columns become the crab's claws shooting out
  on tethers (pincer lanes) and snapping back; Virgo throws her seeds (each flies on a visible
  arc to its spot, then sprouts); Libra's weights drop from the pans; Scorpius's lash and
  sting both leave the **stinger tip** (not the tail root: storyboard review 2026-11-17);
  Capricornus's wave erupts from where it splashes down; Sagittarius and Aquarius use the
  art's arrowhead and urn mouth.
- [x] The source holds still while its attack is warned (the P0.3 rule: a warned lane stays
  where it was shown).
- [x] Creatures form **in front of** the dragon's coils (stages at about x 190-260 while the
  dragon swims the right side), not on top of them: navy on navy does not read even with the
  P2.2 edge glow (seen in the storyboard).

**2. Charges go all the way.**
- [x] Aries, Taurus and Leo's pounce run their warned lane to the far edge of the screen and
  out of it; the creature then dissolves off-screen and its stars stream back to the ring.
  The lane is drawn full length from the creature to the edge.
- [x] Taurus's star-knot burst happens as it passes the pilot's column (the knot flares
  300 ms before, the burst leaves from the bull), not at a halfway stop.
- [x] Breaking the key star mid-charge stops it where it is, as now.

**3. New attacks** (each with its emitter, warning and counter; all inside the caps: 48 shots,
6 lethal hazards, `min_corridor` 42, 900 ms minimum warning)

| Attack | Who | What | Warning | Answer |
| --- | --- | --- | --- | --- |
| **Eye lasers** | Zodiarch (both eyes); Taurus (Aldebaran); Leo | Two thin beams from the eyes that sweep a short arc (about 25°) toward the pilot | eyes glow, aim lines from each eye, 900 ms | stay outside the arc, or behind the sweep |
| **Fireballs** | Zodiarch (mouth); Leo (roar) | Three large slow fireballs that split into five embers after 1.2 s; shooting one pops it early, harmlessly | mouth glows, three short aim lines | dodge the slow balls, or shoot them before they split |
| **Nova stars** | Zodiarch (claws); Virgo (wheat ear) | Stars flung to marked spots, each with a shrinking countdown ring, that explode into a ring of eight sparks with one gap | landing ring at each spot, 1200 ms | stand off, or in the gap's line |
| **Black hole** | Zodiarch (pearl) | A singularity flung to a spot well away from the pilot: pulls the ship gently (never more than 40% of full thrust, so full thrust always escapes), swallows the pilot's shots that pass through it, small lethal core (10 px); 3 s | a swirl of inflowing stars where it will form, 900 ms | keep thrusting away; shoot around it |
| **Meteor fall** | Zodiarch (tail fan) | The tail flicks a fan of five meteors that fall in curved paths | tail glows, dotted arcs | read the arcs |
| **Constellation net** | Zodiarch (ring) | Three ring stars light up and join with lines that become lethal for 1.5 s (one triangle, always with room outside it) | the lines draw in dotted first, 900 ms | stay out of the lines |

- [x] New engine pieces: shot families `SF_FIREBALL` (splits), `SF_NOVA` (placed star with a
  timer); hazards `HK_SINGULARITY` (pull plus shot swallowing; at most one), `HK_NET`
  (segments between points). Reuse `HK_BEAM` for eye lasers and `HK_ARC` for meteors.
- [x] Art: an eye-glow frame for the dragon head, a fireball and its embers, a nova star with
  its countdown ring, a black hole (dark disc, star-streak accretion swirl), meteors.
- [x] Sound: a charge and a release cue for each (`sound/book/warden.mjs`).
- [x] Guide entries (`guide.mjs`) and the attack gallery for each new attack.
- [x] Assists: long warnings stretch every new warning; calm removes the black hole's pull
  (it still swallows shots).

**4. Several signs at once.**
- [x] The dragon no longer waits for every sign to dissolve: it throws the next one while
  earlier ones still act, up to **1 sign in phase 1, 2 in phase 2, 3 in phase 3** (4 in the
  tier III frenzy), at least 1.2 s apart, and keeps using its own attacks between throws.
- [x] A **compatibility table** decides which signs can share the field, so the caps and
  `min_corridor` hold: at most one sign that walls lanes (Gemini, Cancer, Pisces), at most one
  charger, at most one field effect (Libra's pull, the black hole). The dragon's own attacks
  pick from what fits beside the signs already out.
- [x] Phase 1 stays readable: one sign at a time plus fireballs. Phase 2 adds eye lasers and
  nova stars; phase 3 adds the black hole, meteor fall, net and the breath.
- [x] Re-measure the difficulty table and boss-bot time; the bot must still clear every tier
  within 150 s with no fairness faults. Add tests: emitters (each shot's first position is
  within 6 px of its emitter), full charges reach the screen edge, concurrent-sign caps.

**5. Sign reworks from the storyboard review (2026-11-17)** (all drawn in the storyboard)
- [x] **Scorpius**: one emitter, the stinger tip (`EMIT_POINTS` sting moved onto the tip
  pixel). Tell: the tail cocks back 4 px while venom gathers at the tip and a fan of dotted
  lanes shows the arc. Release: a venom beam (`HK_BEAM`, 7 px) whips the arc from the tip,
  venom drips off it, the body lurches 6 px after it. Then a second gather with a flickering
  aim line, and the sting itself flies from the tip and homes (gentle wobble, no hard turn).
- [x] **Capricornus**: the delay is cut. A hard 350 ms dive (it is part of the tell), then a
  big splash: white flash, a spray column, a crown of 30 droplets that fall back, three
  ripples along the bottom. The fan of 15 lanes it will fire down flickers for 650 ms (dive
  plus fan = 1000 ms, inside the 900 ms rule). Then **two waves** burst out over the whole
  upper half-plane, the second 280 ms later on the half-angles; each wave leaves the lane
  nearest the pilot empty (the second wave also its neighbour), so there is always a way
  out. The sea-goat leaps back up through its own spray. At most 28 shots; counts against
  the 48 cap (no other ranged sign beside it).
- [x] **Aquarius**: the stream is 12 **fusing droplets**. Each slows and hangs where it lands
  (spread 70-240 px from the urn); then fuses for 1.1 s: two motes spiral together, the core
  swells and burns blue, white, gold and flickers faster, under a warning ring that closes
  on it; then it bursts into six sparks (rotated per droplet). Engine: `SF_NOVA` with a small
  radius and six sparks, no gap needed (six is sparse); at most 12 droplets plus 72 sparks
  spread over 1.1 s, so the stream thins to 8 droplets if another ranged sign is out.
- [x] **Pisces**: two passes. First the fish part as wide as the field allows (y 40 and 230,
  just inside the edges) with the cord **slack and harmless** (dim, dashed): the gap between
  them is the way through, and they swim the length of the field. They turn round, close in
  (y 96 and 176) and the cord pulls taut and flashes for 900 ms, then **lights** (lethal):
  the gap is filled, the way round is outside the fish (0-78 and 194-270, both over
  `min_corridor`). The fish themselves are warned lanes on both passes.
- [x] **Leo**: no gathering light until it means to pounce. Roar: the mane flares (14 rays)
  and the head shudders while sound arcs leave the jaws and a dotted preview of the ring
  shows its notch; then the ring. Its shots are **suns shed from the mane** (new `mane`
  emitter): three bud out of the mane, hover spinning with short aim ticks, and are tossed
  off one at a time with a 4 px jerk of the head; each sun has turning rays and a flame tail
  (a sprite distinct from the dragon's splitting fireballs). Only then the pounce tell: it
  draws back 12 px and down 6 px (crouch), the eye glints with the charge glow, the lane is
  warned 900 ms, and it pounces all the way across.

**6. Creature states** (the same set for every sign, each with its own motion)

Every creature runs: **form** (stars stream from the ring, 700 ms) → **hold** (alive, idle)
→ **tell** (per attack) → **release** → **recoil** → back to hold or the next attack →
**exit**. Two states are new and come from the player: **hurt** (a shot hits the body, not
the key star: a 2 px flinch away from the hit, a white edge flash, stars spill from the hit
point; no damage) and **break** (the key star is shot: the figure cracks along its
constellation lines, the pieces drift apart and wink out, the stars fly back to the ring
dim; any warned attack is cancelled, a lane already live finishes). **Exit** is the
dissolve back to the ring, or off-screen for chargers (the stars stream back from the edge).

| Sign | Hold (idle) | Tell | Recoil | Hurt | Break |
| --- | --- | --- | --- | --- | --- |
| Aries | paws the ground (dust motes from the hooves), head dips | head lowers, horns glow | none (it is gone) | head jerks up | horns snap off first |
| Taurus | snorts (two puffs from the muzzle), tail flicks | Aldebaran kindles; for the stampede, scrapes a hoof | head tosses after the beam | stamps | the star knot (Pleiades) scatters as seven sparks |
| Gemini | the twins sway out of step, hands near | hands rise, light in the palms | arms kick back | the hit twin staggers, the other looks | both break together, the cord of light between them snaps |
| Cancer | claws open and close, legs shuffle sideways | claws rear up | claws snap shut on return | claws pull in to guard | the shell splits down the middle |
| Leo | mane ripples, tail sways | mane flares (roar), crouch (pounce) | head tosses (suns) | a snarl: the jaw drops one frame | the mane bursts outward as rays |
| Virgo | wheat ear sways, robe stars drift | hand draws back | follow-through of the throw | turns her head away | the wheat ear falls separately, Spica last |
| Libra | pans bob against each other | the beam tips | pans swing back | the beam rocks | the chains snap, pans fall |
| Scorpius | tail sways, stinger twitches | tail cocks, venom at the tip | body lurches after the shot | the tail curls in | the tail segments come apart from the tip down |
| Sagittarius | horse body paces on the spot | bow drawn, arrowhead glows | bow arm rebounds | rears | the bow string snaps first |
| Capricornus | fish tail sweeps, slow rise and fall | dives | leaps up through the spray | ducks under the surface line | the fish tail and goat body part |
| Aquarius | water drips from the urn lip | the urn tips | urn rights itself | water spills | the urn shatters, its stream falls as harmless drops |
| Pisces | the fish nose about, the cord ripples | they part (pass 1), they turn and close (pass 2) | none | the hit fish darts aside | the cord snaps, each fish fades on its own |

- [x] Hurt (flinch, white edge, spilled stars) and break (cracks from the key star, seven
  shards, stars home) in `src/boss/zodiac.mjs`; the engine keeps a broken creature's hp at 0
  and fades it over 900 ms.
- [ ] Art: `hold` needs two or three extra frames per sign (or a part-animated layer: tail,
  claws, urn, bow), `hurt` reuses the strike frame with an edge flash, `break` is drawn by
  the renderer from the constellation lines (no new frames). Signs that change pose (tell,
  recoil) use the hold and strike frames with small offsets, as the storyboard does.
- [ ] Hold, tell and recoil motion per sign in the renderer (keyed by the attack timer);
  the storyboard's states row shows them.
- [x] Storyboard: a "Creature states" row in `web/dev/zodiarch-storyboard.html`, one tile per
  sign: form, hold, a body hit (hurt) and a key-star hit (break), drawn from the strike
  frame with transforms, particles and clipped shards (2026-11-17).
- [x] Art fix found there (done in `BossArt.drawEdge`: the edge follows the closed shape): the starlight edge (`drawEdge`) traces the dithered star-fade on
  Taurus's half body as orange hatching (also in the game today); the edge silhouette should
  skip the fade dither (mask it in `make-bosses.py`, or a separate edge mask cell).

**Storyboard for approval first**: animated, at `web/dev/zodiarch-storyboard.html` (served by
`npm run stress`): every sign's summon and attack and the dragon's own attacks on a loop, drawn
with the real sprites and the P2.3 emitters (`tools/zodiac_myth.py` `EMIT_POINTS`), plus
phase 3 with three signs out at once. A mock-up, not the engine.

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
- [x] Listen through every boss (a person, not code): entrance sting, music track, tell tick, defeat sound.
  Check the music does not mask the tell tick, and the new streamed boss tracks loop
  without a click (the manifest records where each track audibly ends).
- [x] Confirm you hold the rights to the supplied tracks (`insert-another-coin.m4a`,
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

- [x] **S1.1 Single player on real input.** Keyboard + mouse, then one gamepad: light
  trigger pulls, stick drift at neutral, remapping, hold and release across screens,
  unplug and replug while a button is held, focus loss and recovery.
- [x] **S1.2 Local co-op on real input.** Two people: keyboard/mouse + controller, then
  two controllers including two of the same model. Check device assignment, one device
  never driving both ships, disconnect → pause → reassign → resume, simultaneous deaths,
  friendly fire on and off.
- [x] **S1.3 Viewport and performance matrix.** 960×540, 1440×900, browser zoom 125–200%,
  fullscreen, short windows; through Results, initials, save failure and utility screens.
  Sustained frame pacing, CPU and memory under dense rocks, laser, multishot + 2× and
  a boss; in Safari and Chrome (Firefox optional).
- [x] **S1.4 Listening.** Music and effect balance on speakers and headphones, plus the
  ESP32 buzzer build for the firmware's own sounds.
- [x] **S1.5 Fix list.** Anything failing becomes a dated issue line here before it is
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
| 15 | ~~Final boss name~~ **Settled:** Zodiarch, a celestial dragon | P1.2 | Done |
| 16 | What the Zodiarch keeps from the Warden (attack gallery, cloak, mirror) | P1.2 | Drop the gallery and the mirror; the cloak moves to the fox |
| 17 | ~~Fox boss name~~ **Settled:** Ninefold | P1.3 | Done |
| 18 | ~~Fox boss placement~~ **Settled:** the final (rift) mini-boss, replacing the Lens Imp | P1.3 | Done |
