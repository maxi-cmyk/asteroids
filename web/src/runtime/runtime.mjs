import { indexOf, sanitizeLoadout, LOADOUT_VERSION } from '../ship/catalogue.mjs';
import { EngineReader } from './engine-reader.mjs';
import { CoopLeaderboard } from '../state/coop-records.mjs';
import { CoopDriver } from './coop-driver.mjs';
import { PersonalBests } from '../state/records.mjs';
import { CampaignProgress } from '../state/campaign.mjs';
import { CampaignRun } from './campaign-run.mjs';
import { BossRecords } from '../boss/records.mjs';
import { CoopRun } from './coop-run.mjs';
import { RunRecorder } from './run-recorder.mjs';
import { FightLog } from '../boss/fight-log.mjs';
import { WasmHost } from './wasm-host.mjs';
import { SeededRandom } from './rng.mjs';
import { ReplayRecorder, engineFingerprint } from './replay.mjs';

import { RuntimeRecords } from './record-actions.mjs';
import { PracticeTools } from './practice-tools.mjs';

export const STATES = [
    'menu',
    'countdown',
    'playing',
    'paused',
    'death',
    'initials',
    'game-over',
    'demo',
    'level-clear',
];
export const SCORE_KEY = 'asteroids.web.scores-v3';
// The engine as the UI sees it: one object that steps the game, exposes the scene and
// remembers how runs ended. Solo and co-op share it; a CoopRun exists only during co-op.
class Runtime {
    constructor(host, { storage, scoreKey, profile, rng, fingerprint, loadouts }) {
        this.host = host;
        this.loadouts = loadouts;
        this.runLoadouts = null;
        this.reader = new EngineReader(this);
        // Every state-changing engine call goes through the replay recorder (nextSteps.md R3).
        this.fingerprint = fingerprint;
        this.replays = new ReplayRecorder(host.api, { fingerprint, rng, storage, scoreKey });
        this.api = this.replays.api;
        this.practice = new PracticeTools(this.api);
        this.storage = storage;
        this.scoreKey = scoreKey;
        this.records = new PersonalBests(storage);
        this.bossRecords = new BossRecords(storage);
        this.campaign = new CampaignProgress(storage, this.records);
        this.recordActions = new RuntimeRecords(this);
        // The campaign level being flown (or just flown, until the player moves on): what
        // Retry, Next level and Restart need. null outside Act 1.
        this.level = null;
        this.campaignRun = new CampaignRun(this);
        this.recorder = new RunRecorder({
            records: this.records,
            bossRecords: this.bossRecords,
            profile,
        });
        this.fightLog = new FightLog(storage);
        this.profile = profile;
        this.coop = null; // CoopRun while a co-op run is current
        this.coopDriver = new CoopDriver(this, () => this.#finishCoop());
        // Solo end-of-run screen: visible, then ready for Continue once fire is released.
        this.resultsVisible = false;
        this.resultsReady = false;
        this.awaitResultsRelease = false;
    }
    get scoreStatus() {
        return this.coop ? this.coop.board.status : this.host.scoreStatus;
    }
    get result() {
        return this.recorder.result;
    }
    get runProfile() {
        return this.recorder.runProfile;
    }
    // The last finished run as a replay (null if none, or if a test supplied its randomness).
    get replay() {
        return this.replays.last;
    }
    get teamEntries() {
        return this.coop?.board.entries ?? [];
    }
    teamLeaderboard(friendlyFire) {
        return new CoopLeaderboard(this.storage, friendlyFire);
    }
    get state() {
        return this.coop?.phase || (this.resultsVisible ? 'results' : STATES[this.api.web_state()]);
    }
    get width() {
        return this.api.web_width();
    }
    get height() {
        return this.api.web_height();
    }
    // ---------------------------------------------------------------- co-op
    coopPlayers() {
        return this.coopDriver.players();
    }
    // `seed` fixes the run's randomness (tests and the replay check); normally it is fresh.
    startCoop({ profiles = [0, 1], friendlyFire = false, seed } = {}) {
        this.level = null;
        this.coop = new CoopRun({ profiles, friendlyFire, storage: this.storage });
        this.resultsVisible = false;
        this.recorder.beginCoop(friendlyFire);
        this.replays.begin({ mode: 'co-op', friendlyFire: !!friendlyFire }, seed);
        this.api.web_coop_start(+!!friendlyFire);
        this.equipRun(profiles);
    }
    startLevel(level, options = {}) {
        this.campaignRun.start(level, options);
        this.equipRun(this.level.profiles || [this.runProfile], options.loadoutSnapshot);
        this.#clearHold();
    }
    // Start the same level again (Retry, and Restart level in the pause menu).
    restartLevel() {
        if (!this.level) return;
        const { level, profiles, friendlyFire } = this.level;
        this.#endFight();
        this.recorder.discardRun();
        this.recorder.discardResult();
        this.startLevel(level, { profiles, friendlyFire, loadoutSnapshot: this.runLoadouts });
    }
    nextLevel() {
        return this.campaignRun.nextLevel();
    }
    releaseCoopLasers(players) {
        this.coopDriver.releaseLasers(players);
    }
    #finishCoop() {
        this.replays.finish();
        if (this.recorder.finishCoop(this.coop.profiles, this.coopPlayers())) {
            this.campaignRun.credit();
            this.coop.finish();
        }
    }
    // ---------------------------------------------------------------- run flow
    step(input = {}) {
        if (this.coop) {
            this.coopDriver.step(input);
            return;
        }
        const { api } = this;
        let {
            x = 2048,
            y = 2048,
            fire = false,
            firePressed = false,
            click = false,
            pause = false,
            aimX = 0,
            aimY = 0,
            laser = false,
            precision = false,
            shield = false,
        } = input;
        if (this.resultsVisible) {
            api.web_audio_step();
            // Consume the ending press/hold before accepting a separate Continue.
            if (!fire && !firePressed) this.resultsReady = true;
            else if (this.resultsReady) this.continueResults();
            return;
        }
        if (this.awaitResultsRelease) {
            if (fire || firePressed) {
                fire = false;
                firePressed = false;
            } else this.awaitResultsRelease = false;
        }
        const previous = this.state;
        api.web_fire_press(+firePressed);
        api.web_actions(aimX, aimY, +laser, +precision, +shield);
        api.web_step(x, y, +fire, +click, +pause);
        if (this.fightLog.enabled) this.fightLog.observe(this.scene());
        if (this.state === 'countdown' && previous !== 'countdown') this.#beginRun(false);
        if (
            this.recorder.run &&
            (this.state === 'initials' ||
                this.state === 'game-over' ||
                this.state === 'level-clear' ||
                (this.state === 'death' && this.snapshot()[3] === 0))
        )
            this.#finishRun();
        if (
            this.result &&
            ((previous === 'death' && ['initials', 'game-over'].includes(this.state)) ||
                this.state === 'level-clear')
        ) {
            this.resultsVisible = true;
            this.resultsReady = false;
        }
    }
    #beginRun(practice) {
        this.recorder.beginSolo(practice);
        this.resultsVisible = false;
        this.resultsReady = false;
        this.awaitResultsRelease = false;
    }
    #endFight() {
        if (this.fightLog.current) this.fightLog.end(this.scene());
    }
    #finishRun() {
        this.replays.finish();
        this.#endFight();
        this.recorder.finishSolo(this.stats(), this.scene());
        this.campaignRun.credit();
    }
    start(practice = false, { seed } = {}) {
        this.coop = null;
        this.level = null;
        this.replays.begin({ mode: 'solo', practice: !!practice }, seed);
        if (practice) this.practice.sendConfig();
        this.api.web_start(+practice);
        this.#clearHold();
        this.#beginRun(practice);
        this.equipRun([this.runProfile]);
    }
    // Low-level callers without a store retain legacy rules for existing replay/test clients.
    // The application supplies the profile store for every real run.
    equipRun(profiles, snapshot = null) {
        this.runLoadouts = this.loadouts
            ? profiles.map((profile, i) =>
                  sanitizeLoadout(snapshot?.[i] || this.loadouts.get(profile)),
              )
            : null;
        this.runLoadouts?.forEach((kit, owner) =>
            this.api.web_loadout(
                owner,
                indexOf('ship', kit.ship),
                indexOf('primary', kit.primary),
                indexOf('secondary', kit.secondary),
                LOADOUT_VERSION,
            ),
        );
        if (this.recorder.run) {
            this.recorder.run.loadouts = this.runLoadouts;
            if (this.runLoadouts) this.recorder.run.loadoutVersion = LOADOUT_VERSION;
        }
        if (this.runLoadouts)
            this.replays.describe({ loadouts: this.runLoadouts, loadoutVersion: LOADOUT_VERSION });
    }
    menu() {
        this.coop = null;
        this.level = null;
        const practiceEnded = !!this.recorder.run?.rules.practice;
        if (practiceEnded) this.#finishRun();
        else {
            this.#endFight();
            this.recorder.discardRun();
            this.replays.discard();
        }
        this.api.web_menu();
        this.#clearHold();
        this.resultsVisible = practiceEnded;
        this.resultsReady = false;
    }
    abandon() {
        this.coop = null;
        this.level = null;
        this.replays.discard();
        this.#endFight();
        this.recorder.discardRun();
        this.recorder.discardResult();
        this.resultsVisible = false;
        this.resultsReady = false;
        this.awaitResultsRelease = true;
        this.api.web_menu();
        this.#clearHold();
    }
    continueResults() {
        // A level's result has its own buttons (Next level, Retry, Level select).
        if (this.result?.levelRun) return;
        if (this.coop) {
            this.coop.advance(this.result.score);
            return;
        }
        if (!this.resultsVisible) return;
        this.resultsVisible = false;
        this.awaitResultsRelease = true;
    }
    pause() {
        if (this.coop && ['playing', 'countdown'].includes(this.state)) this.api.web_coop_pause(1);
        else if (this.state === 'playing') this.step({ pause: true });
    }
    resetPersonalBests(...args) {
        return this.recordActions.resetPersonalBests(...args);
    }
    savePersonalBests(...args) {
        return this.recordActions.savePersonalBests(...args);
    }
    clearRecords(...args) {
        return this.recordActions.clearRecords(...args);
    }

    // Practice keeps its own config/hold state; keep the public Runtime API stable.
    resetTargets() {
        return this.practice.resetTargets();
    }
    setPractice(...args) {
        return this.practice.setPractice(...args);
    }
    practiceSpawn(...args) {
        return this.practice.practiceSpawn(...args);
    }
    practiceClear(...args) {
        return this.practice.practiceClear(...args);
    }
    practiceRespawn(...args) {
        return this.practice.practiceRespawn(...args);
    }
    practiceNextWave(...args) {
        return this.practice.practiceNextWave(...args);
    }
    practiceResetStats(...args) {
        return this.practice.practiceResetStats(...args);
    }
    doubleFire(...args) {
        return this.practice.doubleFire(...args);
    }
    multishot(...args) {
        return this.practice.multishot(...args);
    }
    togglePractice(...args) {
        return this.practice.togglePractice(...args);
    }
    bossPractice(...args) {
        return this.practice.bossPractice(...args);
    }
    ascendant(...args) {
        return this.practice.ascendant(...args);
    }
    bossAssist(...args) {
        return this.practice.bossAssist(...args);
    }
    get practiceConfig() {
        return this.practice.practiceConfig;
    }
    set practiceConfig(config) {
        this.practice.practiceConfig = config;
    }
    get practiceHold() {
        return this.practice.practiceHold;
    }
    #clearHold() {
        this.practice.clearHold();
    }

    stats() {
        return this.reader.stats();
    }
    fireDiagnostics() {
        return this.reader.fireDiagnostics();
    }
    scene() {
        return this.reader.scene();
    }
    pixels() {
        return this.reader.pixels();
    }
    snapshot() {
        return this.reader.snapshot();
    }
}

export async function createRuntime(
    bytes,
    {
        storage,
        random,
        tone = () => {},
        scoreKey = SCORE_KEY,
        profile = () => 0,
        loadouts = null,
    } = {},
) {
    // Without injected randomness the engine draws from a seeded generator that every run
    // reseeds, so runs can be replayed.
    const rng = random ? null : new SeededRandom();
    const host = await WasmHost.load(bytes, {
        storage,
        random: random || (() => rng.next()),
        tone,
        scoreKey,
    });
    const fingerprint = engineFingerprint(bytes);
    const runtime = new Runtime(host, { storage, scoreKey, profile, rng, fingerprint, loadouts });
    host.api.web_init();
    return runtime;
}
