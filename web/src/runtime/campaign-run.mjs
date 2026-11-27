import { levelInfo } from '../state/campaign-data.mjs';
import { CoopRun } from './coop-run.mjs';

// Campaign starts and per-profile credit; Runtime owns the common run lifecycle.
export class CampaignRun {
    constructor(runtime) {
        this.runtime = runtime;
    }
    start(level, { profiles = null, friendlyFire = false, seed, profile } = {}) {
        if (!levelInfo(level)) throw new RangeError(`No level ${level}`);
        const coop = Array.isArray(profiles);
        this.runtime.level = {
            level,
            profiles: coop ? [...profiles] : null,
            friendlyFire: !!friendlyFire,
        };
        this.runtime.replays.begin(
            coop
                ? { mode: 'co-op', friendlyFire: !!friendlyFire, level }
                : { mode: 'solo', practice: false, level },
            seed,
        );
        if (coop) {
            this.runtime.coop = new CoopRun({
                profiles,
                friendlyFire,
                storage: this.runtime.storage,
            });
            this.runtime.resultsVisible = false;
            this.runtime.recorder.beginCoop(friendlyFire, level);
        } else {
            this.runtime.coop = null;
            this.runtime.recorder.beginSolo(false, level, profile);
            this.runtime.resultsVisible = false;
            this.runtime.resultsReady = false;
            this.runtime.awaitResultsRelease = false;
        }
        this.runtime.api.web_start_level(level, coop ? 2 : 1, +!!friendlyFire);
    }
    // When a level run ends: work out each pilot's stars, write them to the campaign progress
    // and keep what was earned on the result for the level screen.
    credit() {
        const result = this.runtime.result;
        const facts = result?.levelRun;
        if (!facts || result.credited) return;
        result.credited = true;
        const pilots = result.players
            ? result.players.map((p, i) => ({
                  profile: p.profile,
                  lost: facts.livesLost[i],
                  score: p.score,
              }))
            : [{ profile: result.profile, lost: facts.livesLost[0], score: result.score }];
        facts.pilots = pilots.map((pilot, i) => ({
            profile: pilot.profile,
            livesLost: pilot.lost,
            livesRemaining: facts.livesRemaining[i],
            score: pilot.score,
            ...this.runtime.campaign.record(pilot.profile, facts.level, {
                cleared: facts.cleared,
                timeMs: facts.timeMs,
                score: pilot.score,
                livesRemaining: facts.livesRemaining[i],
            }),
        }));
        if (facts.cleared && this.runtime.loadouts) {
            facts.newKits = facts.pilots
                .map((pilot) => ({
                    profile: pilot.profile,
                    kit: this.runtime.loadouts.grant(pilot.profile, facts.level),
                }))
                .filter((p) => p.kit);
        }
        facts.parMs = levelInfo(facts.level).parMs;
        facts.act1Done = facts.cleared && facts.level === 6;
    }
    nextLevel() {
        const current = this.runtime.level;
        return current && levelInfo(current.level + 1) ? current.level + 1 : null;
    }
}
