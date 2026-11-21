import { element } from './dom.mjs';
import { encodeReplay } from '../runtime/replay-codec.mjs';

// The plain button handlers: each one is a single call into the app, with no state of its own.
export function installActions(app) {
    const on = (id, handler) => element(id).addEventListener('click', handler);
    const nav = () => app.navigation;

    // Home and mode select
    on('play', () => {
        if (!nav() || app.launch.active || app.consumeDemo()) return;
        nav().request('mode');
    });
    on('practice', () => {
        if (app.consumeDemo()) return;
        nav().start(true);
    });
    on('soloPlay', () => {
        app.coopInput.live = false;
        app.launch.begin(() => nav().start());
    });
    on('localPlay', () => {
        app.coopScreen.reset();
        nav().request('lobby');
    });
    on('watchDemo', () => {
        if (app.consumeDemo()) return;
        app.demo?.start();
        app.menu.reset();
        app.loop.resetTiming();
        app.draw();
        element('stopDemo').focus();
    });
    on('stopDemo', () => app.consumeDemo());
    on('helpPractice', () => nav().start(true));
    for (const button of document.querySelectorAll('[data-go]'))
        button.addEventListener('click', () => app.router.navigate(button.dataset.go, button));

    // Pause menu and its practice tools, which drop you straight back into the flight.
    on('resume', () => nav().resume());
    on('quitRun', () => nav().request('home'));
    on('gameHome', () => nav().request('home'));
    on('screenBack', () => nav().back());
    on('pause', () => {
        if (nav().screen === 'pause') nav().resume();
        else nav().pause();
        app.draw();
    });
    for (const [id, action] of [['resetTargets', () => app.runtime.resetTargets()]])
        on(id, () => {
            action();
            nav().resume();
        });
    // The HUD toggles keep the pause menu closed: switch a pickup on or off mid-flight.
    on('practiceMultishot', () => app.runtime.togglePractice('multishot'));
    on('practiceDoubleFire', () => app.runtime.togglePractice('doubleFire'));
    on('bossPracticeStart', () => {
        app.controls.clear();
        app.runtime.bossPractice(
            Number(element('bossPick').value),
            Number(element('bossTier').value),
            Number(element('bossPhase').value),
        );
        nav().resume();
    });
    on('endPractice', () => {
        app.controls.clear();
        app.input.pointerPosition = null;
        app.runtime.menu();
        nav().set('play');
        app.draw();
        app.layout.fit();
    });

    // Results and records
    on('continueResults', () => {
        app.coopInput.clear();
        app.runtime.continueResults();
        app.controls.clear();
        app.input.gameplayReady = false;
        app.menu.reset();
        app.input.pointerPosition = null;
        if (app.runtime.state === 'menu') nav().request('home');
        app.draw();
    });
    // The optional boss fight log (Settings → Playtest): saved as a JSON file, never uploaded.
    on('exportFightLog', () => {
        const url = URL.createObjectURL(
            new Blob([app.runtime.fightLog.json()], { type: 'application/json' }),
        );
        const link = Object.assign(document.createElement('a'), {
            href: url,
            download: `asteroids-fight-log-${new Date().toISOString().slice(0, 10)}.json`,
        });
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    // The finished run as a compact replay file (nextSteps.md R3): watch it on replay.html.
    on('saveReplay', () => {
        const replay = app.runtime.replay;
        if (!replay) return;
        const url = URL.createObjectURL(
            new Blob([encodeReplay(replay)], { type: 'application/octet-stream' }),
        );
        const link = Object.assign(document.createElement('a'), {
            href: url,
            download: `asteroids-replay-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.astr`,
        });
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    on('clearFightLog', () => app.runtime.fightLog.clear());
    on('retryRecords', () => {
        app.runtime.records.save();
        app.draw();
    });

    // The on-field Fire button doubles as Continue on end screens.
    on('fire', () => {
        const { runtime, controls } = app;
        if (app.session.fireClick()) return;
        if (runtime?.state === 'results') {
            runtime.continueResults();
            controls.discardFirePresses();
            app.draw();
            return;
        }
        controls.pulseUntil = performance.now() + 70;
        app.canvas.focus();
    });

    // Modal decision dialog
    for (const button of document.querySelectorAll('[data-decision]'))
        button.addEventListener('click', () => nav().resolve(button.dataset.decision));
    element('navigationDecision').addEventListener('cancel', (event) => {
        event.preventDefault();
        nav().resolve('stay');
    });

    on('fullscreen', async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await document.querySelector('.app-shell').requestFullscreen();
            element('fullscreen').focus();
            app.layout.fit();
        } catch {
            element('hint').textContent = 'Fullscreen unavailable in this browser';
            element('shellStatus').textContent = 'Fullscreen unavailable in this browser';
        }
    });

    window.addEventListener('gamepaddisconnected', (event) => app.session.padDisconnected(event));
}
