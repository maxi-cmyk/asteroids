# Boss playtest protocol (S0.2)

One page for the person running the session. A session is one tester, about 30 minutes, one
laptop with a keyboard, mouse and (if they prefer) a controller. Run two to four testers.

## Before the session

1. `cd web && npm run build && npm start`, open the game, and play it in a normal window (not
   practice stuff you have already tuned for yourself).
2. Settings → **Playtest** → tick **Record a boss fight log**, then Apply. Settings → Playtest →
   **Clear fight log** so the file holds this tester only. Leave both assists **off**.
3. Start QuickTime screen recording (screen only, no audio unless the tester agrees).
4. Open the notes sheet below. Do not explain the game. The Help page is allowed, you are not.

## Script

| Step | What the tester does | You note |
| --- | --- | --- |
| 1 | Solo run to wave 5, no briefing, 3 lives | Attempts to first clear the **Sentinel**; the attack that took each life; whether they understood each warning before they were hit |
| 2 | Boss practice: one boss **of their choice** (Ringwarden to Tidecaller) | Which they chose and why; attempts; whether the fight felt too long |
| 3 | Boss practice: the **Zodiarch**, tier I, from phase 1 | Attempts; first time they noticed a creature's key star and the pearl window; the attack they name as the unfair one, if any |

After each fight ask three questions and write the answers word for word: *What killed you?
Was there anything you could not see coming? Was it too long?* Stop a step after 10 minutes.

## Notes sheet

| Tester | Step | Boss | Attempt | Died to (attack) | Understood warning? (y/n) | Too long? (y/n) | Quote |
| --- | --- | --- | --- | --- | --- | --- | --- |

## After the session

Export the log (Results screen → **Export fight log**, any run or practice result) and save it as
`playtests/<date>-<tester>.json`. Each attempt has the boss, tier, outcome, seconds, lives lost,
`damagePerPhase`, the `killer` attack and every hit with its time, phase and attack. It stays on the
device and is never uploaded.

## Targets (from `nextSteps.md` S0.2)

- Sentinel cleared first try by a new player with 3 lives.
- The Warden takes most players several attempts.
- Solo fight length sits inside the Difficulty table in `web/COMBAT.md`, with people taking about
  1.5× the bot (Sentinel 35 to 50 s, Warden 80 to 110 s).
- A warning understood by fewer than half of the testers is a telegraph bug, not a skill gap.

## Tuning from the logs

Tune only `BOSS_K`, rest lengths, window lengths, per-attack frequency and the phase 2 and 3 pickup
drops. One change per commit with the evidence (tester count, the attempts and the numbers) in the
message. Afterwards re-run `node tests/boss-baseline.mjs` and `npm test`, and check each boss is
still beatable without pickups or laser at 1× multiplier and has a faster mechanic route.
