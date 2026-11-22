import { renderDiagnostics } from '../screens/diagnostics.mjs';
import { renderPractice } from '../screens/practice.mjs';
import { renderPlayChrome } from '../screens/play-chrome.mjs';
import { renderPlayHud } from '../screens/play.mjs';
import { renderResultsScreen } from '../screens/results.mjs';
import { renderRecordsScreen } from '../screens/records.mjs';
import { renderHomeScreen } from '../screens/home.mjs';
import { accuracyText } from '../state/records.mjs';
import { needsRelease } from '../state/navigation.mjs';
import { MusicDirector } from '../audio/soundtrack.mjs';
import { MATCH_LOOK } from '../audio/menu-themes.mjs';
import { furthestWave, lookRegion, lookTrack } from './menu-look.mjs';
import { S } from '../runtime/scene-layout.mjs';
import { element, setAttr, setText } from './dom.mjs';

const HUD_IDS = [
    'lives',
    'wave',
    'score',
    'multiplier',
    'chainFill',
    'laserStatus',
    'laserFill',
    'shieldStatus',
    'precisionStatus',
];

// Everything that turns the current scene and run state into pixels and DOM, once per frame.
export class Presenter {
    constructor(app) {
        this.app = app;
        this.hud = Object.fromEntries(HUD_IDS.map((id) => [id, element(id)]));
        this.lastState = '';
        this.music = new MusicDirector();
    }
    draw() {
        const { app } = this,
            { runtime, navigation, session } = app;
        const update = setText;
        const scene = runtime.scene();
        this.#look();
        app.practiceRange.render(scene);
        if (['play', 'pause'].includes(navigation.screen) && runtime.state !== 'results') {
            app.renderer.hulls = session.hulls();
            app.renderer.renderIfChanged(scene, session.players());
        } else app.renderer?.gate.invalidate();
        app.bossUnlocks.track(scene);
        app.bossUi.render(
            scene,
            navigation.screen === 'play' &&
                ['playing', 'countdown', 'death'].includes(runtime.state),
        );
        renderHomeScreen({
            demoEngine: app.demo,
            navigation,
            controllerLabel: element('controller'),
            menuDevice: app.input.device,
            profileStore: app.profileStore,
        });
        renderDiagnostics({
            inputDiagnostics: app.inputDiagnostics,
            diagnosticPad: app.diagnosticPad,
            runtime,
            controls: app.controls,
            update,
        });
        this.#audio(scene);
        // A health pickup's collect cue also pulses the lives counter.
        setAttr(
            this.hud.lives,
            'data-pulse',
            String(scene[S.COLLECT_CUE_MS] > 0 && scene[S.COLLECT_KIND] === 3),
        );
        renderPractice({
            scene,
            navigation,
            runtime,
            update,
            practiceButton: element('practice'),
            fitCanvas: app.layout.fit,
        });
        const result = runtime.result;
        const showResults = runtime.state === 'results';
        if (['play', 'pause'].includes(navigation.screen)) this.#liveStats(runtime, update);
        // Records reads storage and diffs a lot of DOM; nobody sees it off its own screen, and
        // entering the screen redraws once (screen-router calls draw()).
        if (navigation.screen === 'records')
            renderRecordsScreen({
                runtime,
                resetRecordsArmed: app.recordsActions.armed,
                resetProfile: app.recordsActions.profile,
                disarmRecordsReset: app.recordsActions.disarmRecordsReset,
                bossArt: app.renderer?.bossArt,
                update,
            });
        renderResultsScreen({
            results: element('runSummary'),
            showResults,
            canvas: app.canvas,
            lastState: this.lastState,
            result,
            scene,
            update,
            fightLogCount: runtime.fightLog.enabled ? runtime.fightLog.count : 0,
            // A finished run's replay (nextSteps.md R3); none while one is still recording.
            replay: !!runtime.replay && runtime.replays.fresh && !runtime.replays.recording,
        });
        renderPlayHud({ hud: this.hud, scene, update });
        const nextState = renderPlayChrome({
            runtime,
            navigation,
            showResults,
            canvas: app.canvas,
            fireButton: element('fire'),
            soundButton: element('sound'),
            pauseButton: element('pause'),
            hint: element('hint'),
            scene,
            controls: app.controls,
            menuInput: app.menu.input,
            stateLabel: element('state'),
            lastState: this.lastState,
            update,
            isSettingsOpen: () => app.isSettingsOpen(),
        });
        app.coopScreen.render();
        if (needsRelease(this.lastState, nextState)) {
            app.input.gameplayReady = false;
            if (runtime.coop && nextState === 'game-over') element('fire').focus();
        }
        this.lastState = nextState;
    }
    #audio(scene) {
        const { app } = this,
            { audio, navigation, runtime } = app;
        // A controller press may unlock audio where the browser counts it as a gesture.
        if (!audio.running && app.input.anyPadButton()) app.unlockAudio();
        app.settingsController.syncMusicLabel();
        audio.suspend(app.loop.suspended || navigation.screen !== 'play');
        audio.observe(scene);
        audio.setMusic(
            this.music.request({
                screen: navigation.screen,
                runtimeState: runtime.state,
                scene,
                demoScene: app.demo?.active ? app.demo.scene() : null,
                menuTheme: this.#menuTheme(),
                origin: navigation.origin,
            }),
        );
    }
    // The look's region (-1 Classic) for the active profile, from how far it has flown.
    #lookRegion() {
        const { app } = this;
        const wave = furthestWave(app.runtime?.records, app.profileStore.activeProfile);
        return lookRegion(app.settings.menuLook, wave);
    }
    #menuTheme() {
        const theme = this.app.settings.menuTheme;
        return theme === MATCH_LOOK ? lookTrack(this.#lookRegion()) : theme;
    }
    #look() {
        this.app.menuLook.sync(this.#lookRegion(), this.app.gameArt?.worlds);
    }
    #liveStats(runtime, update) {
        const stats = runtime.stats();
        update(
            element('doubleFireStatus'),
            runtime.practiceHold.doubleFire
                ? 'ON'
                : stats.doubleFireMs
                  ? `${(stats.doubleFireMs / 1000).toFixed(1)}s`
                  : 'INACTIVE',
        );
        this.doubleFireCard ??= element('doubleFireStatus').closest('.ability');
        if (this.doubleFireCard)
            setAttr(this.doubleFireCard, 'data-state', stats.doubleFireMs ? 'active' : 'empty');
        update(element('liveCps'), String(stats.cps));
        update(element('liveAccuracy'), accuracyText(stats.hits, stats.spawned));
        update(element('liveChain'), String(stats.longestChain));
    }
}
