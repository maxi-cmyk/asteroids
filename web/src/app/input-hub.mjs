import { WIDTH, HEIGHT } from '../render/constants.mjs';
import { S } from '../runtime/scene-layout.mjs';

// Raw input state shared by the game loop and the menus: held keys and buttons, the mouse
// aim point, which controller is active and which device the player touched last.
export class InputHub {
    constructor(app) {
        this.app = app;
        this.physicalKeys = new Set();
        this.pointerButtons = new Set();
        this.pointerPosition = null;
        this.activePadIndex = null;
        this.device = 'keyboard'; // 'keyboard' | 'mouse' | 'controller'
        this.gameplayReady = false; // controls were released since the last interruption
        this.lastKeyAt = 0; // performance.now() of the last keydown (auto-repeat included)
    }
    anyPadButton() {
        return this.connectedPads().some((pad) =>
            (pad?.buttons || []).some((button) => button?.pressed),
        );
    }
    connectedPads() {
        try {
            return Array.from(navigator.getGamepads?.() || []);
        } catch {
            return [];
        }
    }
    findController() {
        return this.app.session.findPad();
    }
    // Anything pressed on any device (the player must let go before gameplay resumes).
    held(pad) {
        // A key whose release was swallowed (a native dropdown takes the keyup of the Enter
        // that picks an option) would hold gameplay off for good. A key really held down
        // keeps auto-repeating, so one with no keydown for 800 ms is let go; if it is still
        // down, its next repeat puts it back.
        if (this.physicalKeys.size && performance.now() - this.lastKeyAt > 800)
            this.physicalKeys.clear();
        return (
            this.physicalKeys.size ||
            this.pointerButtons.size ||
            (pad?.buttons || []).some((b) => b?.pressed || b?.value > 0.2) ||
            (pad?.axes || []).some((v) => Math.abs(v) > 0.55)
        );
    }
    // Drops everything held, e.g. when the window loses focus.
    release() {
        this.physicalKeys.clear();
        this.pointerButtons.clear();
        this.pointerPosition = null;
    }
    // Points the ship's aim at the mouse, in playfield coordinates.
    applyMouseAim() {
        if (!this.pointerPosition) return;
        const { app } = this;
        const rect = app.canvas.getBoundingClientRect(),
            scene = app.session.aimScene();
        app.session
            .keyboardControls()
            ?.aimAt(
                ((this.pointerPosition[0] - rect.left) * WIDTH) / rect.width - scene[S.SHIP_X],
                ((this.pointerPosition[1] - rect.top) * HEIGHT) / rect.height - scene[S.SHIP_Y],
            );
    }
    install() {
        const { app } = this,
            { canvas } = app;
        const controls = () => app.session.keyboardControls();
        canvas.addEventListener('pointermove', (event) => {
            if (app.navigation.screen === 'play' && event.pointerType === 'mouse') {
                this.pointerPosition = [event.clientX, event.clientY];
                controls()?.activateMouseAim();
            }
        });
        canvas.addEventListener('pointerdown', (event) => {
            if (
                app.navigation.screen !== 'play' ||
                event.pointerType !== 'mouse' ||
                ![0, 2].includes(event.button)
            )
                return;
            event.preventDefault();
            canvas.focus();
            controls()?.activateMouseAim();
            this.pointerPosition = [event.clientX, event.clientY];
            controls()?.pointerDown(event.button, performance.now());
            canvas.setPointerCapture(event.pointerId);
        });
        window.addEventListener('pointerup', (event) => controls()?.pointerUp(event.button));
        canvas.addEventListener('pointercancel', () => {
            app.controls.clear();
            this.pointerPosition = null;
        });
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        window.addEventListener('pointerdown', (event) => {
            this.device = 'mouse';
            this.pointerButtons.add(event.button);
        });
        window.addEventListener('pointerup', (event) => this.pointerButtons.delete(event.button));
        // A native dropdown's popup eats the pointerup that closes it, which would leave a
        // mouse button "held" and gameplay waiting for its release. Any pointer event with no
        // buttons down puts that right, and so does choosing from (or leaving) a dropdown.
        window.addEventListener('pointermove', (event) => {
            if (event.buttons === 0) this.pointerButtons.clear();
        });
        const resync = (event) => {
            if (event.target instanceof HTMLSelectElement) {
                this.pointerButtons.clear();
                this.physicalKeys.clear();
            }
        };
        document.addEventListener('change', resync, true);
        document.addEventListener('focusout', resync, true);
        window.addEventListener('pointerdown', () => app.unlockAudio());
        // Any key counts too, in the menus as well as in flight.
        window.addEventListener('keydown', () => app.unlockAudio(), { capture: true });
        // Preserve brief controller releases between the fixed simulation ticks.
        // No gameplay or DOM work occurs in this input-only polling callback.
        setInterval(() => {
            const { runtime, navigation } = app;
            if (
                !runtime ||
                app.loop.suspended ||
                navigation.screen !== 'play' ||
                runtime.state === 'results' ||
                !this.gameplayReady
            )
                return;
            const pads = this.connectedPads();
            const pad =
                pads.find((p) => p?.index === this.activePadIndex && p.connected) ||
                pads.find((p) => p?.connected && p.mapping === 'standard');
            app.session.observe(pad);
        }, 4);
    }
}
