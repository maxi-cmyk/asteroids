import { element, setAttr, setHidden, setProp, setText } from '../app/dom.mjs';
import { S } from '../runtime/scene-layout.mjs';
import {
    DRILLS,
    PRACTICE_SPAWNS,
    PRACTICE_SPEEDS,
    drillById,
    drillConfig,
    sanitizePractice,
} from '../state/practice.mjs';

// Gamepad View / Select (standard mapping) toggles the tools in flight.
const VIEW_BUTTON = 8;
// Keyboard shortcuts while practising (only when not bound to a game action).
const SHORTCUTS = { KeyR: 'respawn', KeyN: 'next', Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 };
export const TOOLS_KEY = 'KeyT';

const formatTime = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// The practice range (nextSteps.md H3): the drill list on its own screen, and the tools
// drawer in flight. The drawer freezes the run while open (the game loop does not step).
export class PracticeRange {
    constructor(app) {
        this.app = app;
        this.open = false;
        this.statsFrom = 0; // game ms the readout counts from
        this.viewHeld = false;
    }
    get config() {
        return this.app.runtime?.practiceConfig ?? sanitizePractice(this.app.settings.practice);
    }
    // Is a practice (not boss practice alone) flying right now?
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
        for (const speed of PRACTICE_SPEEDS) {
            const option = document.createElement('option');
            option.value = speed;
            option.textContent = `${speed} %`;
            element('practiceSpeed').append(option);
        }
        for (const { kind, label } of PRACTICE_SPAWNS) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = `${label} (${kind + 1})`;
            button.addEventListener('click', () => this.spawn(kind));
            element('practiceSpawns').append(button);
        }
        element('drillWave').addEventListener('change', (event) =>
            this.change({ wave: Number(event.target.value) }),
        );
        for (const button of document.querySelectorAll('[data-rocks]'))
            button.addEventListener('click', () =>
                this.change({ rocks: button.dataset.rocks, drill: 'custom' }),
            );
        element('practiceWave').addEventListener('change', (event) =>
            this.change({ wave: Number(event.target.value), drill: 'custom' }),
        );
        element('practiceSpeed').addEventListener('change', (event) =>
            this.change({ speed: Number(event.target.value), drill: 'custom' }),
        );
        for (const [id, key] of [
            ['practiceRefill', 'refill'],
            ['practiceHoldWave', 'hold'],
            ['practiceDrops', 'drops'],
        ])
            element(id).addEventListener('change', (event) =>
                this.change({ [key]: event.target.checked, drill: 'custom' }),
            );
        const on = (id, handler) => element(id).addEventListener('click', handler);
        on('practiceRespawn', () => this.app.runtime.practiceRespawn());
        on('practiceClear', () => this.app.runtime.practiceClear());
        on('practiceNext', () => this.app.runtime.practiceNextWave());
        on('practiceResetStats', () => this.resetStats());
        on('holdMultishot', () => this.app.runtime.togglePractice('multishot'));
        on('holdDoubleFire', () => this.app.runtime.togglePractice('doubleFire'));
        on('closePracticeTools', () => this.close());
        on('openPracticeTools', () => {
            this.app.navigation.resume();
            this.show();
        });
    }
    // Saves a change for this profile and sends it to a running practice at once.
    change(patch) {
        const { app } = this;
        app.runtime.setPractice(patch);
        app.settings.practice = { ...app.runtime.practiceConfig };
        app.settingsController.persist();
        this.render(app.runtime.scene(), true);
    }
    startDrill(id) {
        const { app } = this;
        if (app.consumeDemo()) return;
        const config = drillConfig(id, {
            ...this.config,
            wave: Number(element('drillWave').value) || this.config.wave,
        });
        app.runtime.setPractice(config);
        app.settings.practice = { ...app.runtime.practiceConfig };
        app.settingsController.persist();
        app.coopInput.live = false;
        app.navigation.start(true);
        this.statsFrom = 0;
        const tools = drillById(id).tools;
        if (tools) this.show(tools === 'boss' ? 'bossPick' : null);
    }
    spawn(kind) {
        this.app.runtime.practiceSpawn(kind);
    }
    resetStats() {
        this.app.runtime.practiceResetStats();
        this.statsFrom = this.app.runtime.scene()[S.GAME_MS];
    }
    show(focusId = null) {
        const { app } = this;
        if (this.open || !this.#practising()) return;
        this.open = true;
        app.controls.clear();
        setHidden(element('practiceDrawer'), false);
        this.render(app.runtime.scene(), true);
        (focusId ? element(focusId) : element('practiceDrawer').querySelector('button'))?.focus();
    }
    close() {
        const { app } = this;
        if (!this.open) return;
        this.open = false;
        setHidden(element('practiceDrawer'), true);
        // A key or button held to close the drawer must not leak into the flight.
        app.controls.clear();
        app.input.gameplayReady = false;
        app.canvas.focus({ preventScroll: true });
    }
    toggle() {
        if (this.open) this.close();
        else this.show();
    }
    // Keyboard in flight: T opens the tools, R/N/1-4 act at once. Returns true if handled.
    key(event, bound) {
        if (event.repeat || !this.#practising() || this.app.navigation.screen !== 'play')
            return false;
        if (event.code === TOOLS_KEY && !bound.includes(TOOLS_KEY)) {
            this.toggle();
            return true;
        }
        if (this.open || bound.includes(event.code) || !(event.code in SHORTCUTS)) return false;
        const action = SHORTCUTS[event.code];
        if (action === 'respawn') this.app.runtime.practiceRespawn();
        else if (action === 'next') this.app.runtime.practiceNextWave();
        else this.spawn(action);
        return true;
    }
    // Controller View / Select toggles the tools (edge-triggered).
    pad(pad) {
        const held = !!pad?.buttons?.[VIEW_BUTTON]?.pressed;
        if (held && !this.viewHeld && this.#practising()) this.toggle();
        this.viewHeld = held;
    }
    // Leaving practice (or the play screen) closes the drawer.
    render(scene, force = false) {
        if (this.open && !this.#practising(scene)) this.close();
        if (!this.open && !force) return;
        const c = this.config;
        for (const button of document.querySelectorAll('[data-rocks]'))
            setAttr(button, 'aria-pressed', String(button.dataset.rocks === c.rocks));
        setProp(element('practiceWave'), 'value', String(scene[S.WAVE] || c.wave));
        setProp(element('practiceSpeed'), 'value', String(c.speed));
        setProp(element('practiceRefill'), 'checked', c.refill);
        setProp(element('practiceHoldWave'), 'checked', c.hold);
        setProp(element('practiceDrops'), 'checked', c.drops);
        const waves = c.rocks === 'waves' || c.rocks === 'stream';
        setProp(element('practiceWave'), 'disabled', !waves);
        setProp(element('practiceNext'), 'disabled', !waves);
        setProp(element('practiceHoldWave'), 'disabled', c.rocks !== 'waves');
        setProp(element('practiceRefill'), 'disabled', c.rocks !== 'targets');
        const hold = this.app.runtime.practiceHold;
        setAttr(element('holdMultishot'), 'aria-pressed', String(hold.multishot));
        setAttr(element('holdDoubleFire'), 'aria-pressed', String(hold.doubleFire));
        const stats = this.app.runtime.stats();
        const accuracy = stats.spawned
            ? `${Math.round((100 * stats.hits) / stats.spawned)} %`
            : '—';
        setText(
            element('practiceReadout'),
            `Time ${formatTime(scene[S.GAME_MS] - this.statsFrom)} · Hits taken ${scene[S.PRACTICE_HITS]} · Accuracy ${accuracy}`,
        );
    }
    // The drills screen shows the remembered drill and wave.
    renderDrills() {
        const c = this.config;
        setProp(element('drillWave'), 'value', String(c.wave));
        for (const card of document.querySelectorAll('.drill-card'))
            setAttr(card, 'aria-current', String(card.dataset.drill === c.drill));
    }
}
