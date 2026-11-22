import { element, setAttr, setHidden, setProp } from '../app/dom.mjs';
import { S } from '../runtime/scene-layout.mjs';
import { DRILLS, drillById, drillConfig, sanitizePractice } from '../state/practice.mjs';

// Gamepad View / Select (standard mapping) toggles the tools in flight.
const VIEW_BUTTON = 8;
export const TOOLS_KEY = 'KeyT';

// The practice range (nextSteps.md H3): the drill list on its own screen, and a small tools
// panel in flight with two jobs: start any wave, or fight any boss. The buffs stay on the HUD
// toggles. The panel freezes the run while open (the game loop does not step).
export class PracticeRange {
    constructor(app) {
        this.app = app;
        this.open = false;
        this.viewHeld = false;
    }
    get config() {
        return this.app.runtime?.practiceConfig ?? sanitizePractice(this.app.settings.practice);
    }
    // Is a practice (targets, waves or a boss) flying right now?
    #practising(scene = this.app.runtime?.scene()) {
        return (
            !!scene?.[S.PRACTICE] &&
            this.app.navigation?.screen === 'play' &&
            ['playing', 'paused'].includes(this.app.runtime.state)
        );
    }
    install() {
        const list = element('drillList');
        for (const drill of DRILLS) {
            const button = document.createElement('button');
            button.className = 'drill-card';
            button.dataset.drill = drill.id;
            button.setAttribute('role', 'listitem');
            const name = document.createElement('strong');
            name.textContent = drill.name;
            const note = document.createElement('span');
            note.textContent = drill.note;
            button.append(name, note);
            button.addEventListener('click', () => this.startDrill(drill.id));
            list.append(button);
        }
        for (const id of ['drillWave', 'practiceWave'])
            for (let wave = 1; wave <= 30; wave++) {
                const option = document.createElement('option');
                option.value = wave;
                option.textContent = `Wave ${wave}`;
                element(id).append(option);
            }
        element('drillWave').addEventListener('change', (event) =>
            this.#save({ wave: Number(event.target.value) }),
        );
        const on = (id, handler) => element(id).addEventListener('click', handler);
        on('practiceStartWave', () => this.startWave(Number(element('practiceWave').value)));
        on('closePracticeTools', () => this.close());
        on('openPracticeTools', () => {
            this.app.navigation.resume();
            this.show();
        });
    }
    #save(patch) {
        const { app } = this;
        app.runtime.setPractice(patch);
        app.settings.practice = { ...app.runtime.practiceConfig };
        app.settingsController.persist();
    }
    startDrill(id) {
        const { app } = this;
        if (app.consumeDemo()) return;
        this.#save(
            drillConfig(id, {
                ...this.config,
                wave: Number(element('drillWave').value) || this.config.wave,
            }),
        );
        app.coopInput.live = false;
        app.navigation.start(true);
        if (drillById(id).tools === 'boss') this.show('bossPick');
    }
    // Start wave: a fresh practice of real waves from that wave (from a boss fight too).
    startWave(wave) {
        const { app } = this;
        this.close();
        this.#save({ rocks: 'waves', wave, drill: 'waves' });
        app.controls.clear();
        app.navigation.start(true);
    }
    show(focusId = null) {
        const { app } = this;
        if (this.open || !this.#practising()) return;
        this.open = true;
        app.controls.clear();
        const scene = app.runtime.scene();
        setProp(element('practiceWave'), 'value', String(scene[S.WAVE] || this.config.wave));
        setHidden(element('practiceDrawer'), false);
        (focusId ? element(focusId) : element('practiceWave'))?.focus();
    }
    close() {
        const { app } = this;
        if (!this.open) return;
        this.open = false;
        setHidden(element('practiceDrawer'), true);
        // A key or button held to close the panel must not leak into the flight.
        app.controls.clear();
        app.input.gameplayReady = false;
        app.canvas.focus({ preventScroll: true });
    }
    toggle() {
        if (this.open) this.close();
        else this.show();
    }
    // Keyboard in flight: T opens the tools. Returns true if handled.
    key(event, bound) {
        if (event.repeat || event.code !== TOOLS_KEY || bound.includes(TOOLS_KEY)) return false;
        if (!this.#practising() || this.app.navigation.screen !== 'play') return false;
        this.toggle();
        return true;
    }
    // Controller View / Select toggles the tools (edge-triggered).
    pad(pad) {
        const held = !!pad?.buttons?.[VIEW_BUTTON]?.pressed;
        if (held && !this.viewHeld && this.#practising()) this.toggle();
        this.viewHeld = held;
    }
    // Leaving practice (or the play screen) closes the panel.
    render(scene) {
        if (this.open && !this.#practising(scene)) this.close();
    }
    // The drills screen shows the remembered drill and wave.
    renderDrills() {
        const c = this.config;
        setProp(element('drillWave'), 'value', String(c.wave));
        for (const card of document.querySelectorAll('.drill-card'))
            setAttr(card, 'aria-current', String(card.dataset.drill === c.drill));
    }
}
