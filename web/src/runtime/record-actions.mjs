import { clearBrowserRecords } from '../state/records.mjs';
import { CoopLeaderboard } from '../state/coop-records.mjs';

// Persisted record operations shared by Records and runtime callers.
export class RuntimeRecords {
    constructor(runtime) {
        this.runtime = runtime;
    }
    resetPersonalBests(profile) {
        const recordsSaved = this.runtime.records.reset(profile);
        const campaignSaved = this.runtime.campaign.resetBests(profile);
        return this.#bestsSaveStatus(recordsSaved && campaignSaved);
    }
    savePersonalBests() {
        const recordsSaved = this.runtime.records.save();
        const campaignSaved = this.runtime.campaign.save();
        return this.#bestsSaveStatus(recordsSaved && campaignSaved);
    }
    #bestsSaveStatus(saved) {
        this.runtime.records.status = saved
            ? 'Personal bests saved in this browser. Campaign stars and unlocks are kept.'
            : 'Could not save all personal bests; changes last for this visit. Retry saving when browser storage is available.';
        return saved;
    }
    clearRecords() {
        const reset = clearBrowserRecords(this.runtime.storage, this.runtime.scoreKey);
        this.runtime.host.scoreStatus = reset.message;
        this.runtime.records.status = reset.message;
        if (reset.ok) {
            if (this.runtime.coop)
                this.runtime.coop.board = new CoopLeaderboard(
                    this.runtime.storage,
                    this.runtime.coop.friendlyFire,
                );
            this.runtime.records.profiles = [{}, {}];
            this.runtime.bossRecords.reset();
            this.runtime.campaign.reset();
            this.runtime.api.web_reload_scores();
        }
        return reset.ok;
    }
}
