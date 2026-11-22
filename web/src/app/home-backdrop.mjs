import { drawHome } from '../render/presentation.mjs';
import { element } from './dom.mjs';
import { reducedQuery } from './motion.mjs';

// After this long on Home with no input the demo plays by itself (any input returns Home).
export const IDLE_DEMO_MS = 30000;

// The animated layer over the Home backdrop, redrawn at 20 fps (or once when reduced).
export class HomeBackdrop {
    constructor(app) {
        this.app = app;
        this.ctx = element('homeFx').getContext('2d');
        this.lastFrame = -1;
    }
    invalidate() {
        this.lastFrame = -1;
    }
    frame() {
        const { app } = this;
        const now = performance.now();
        if (app.navigation?.screen !== 'home' || app.demo?.active || app.loop.suspended) {
            app.lastActivity = now; // the idle wait starts again on arriving Home
            return;
        }
        this.#idleDemo(now);
        const time = app.clock.time * app.settings.backgroundMotion;
        const frame = reducedQuery.matches ? -2 : Math.floor(time / 50);
        if (frame === this.lastFrame) return;
        drawHome(this.ctx, time, {
            reduced: reducedQuery.matches,
            art: app.gameArt,
            hull: app.hangarStore.profiles[app.profileStore.activeProfile],
            glare: (document.body.dataset.look ?? 'classic') === 'classic',
        });
        this.lastFrame = frame;
    }
    #idleDemo(now) {
        const { app } = this;
        app.lastActivity ??= now;
        if (now - app.lastActivity < IDLE_DEMO_MS) return;
        app.lastActivity = now;
        if (
            reducedQuery.matches ||
            app.navigation.pending ||
            document.querySelector('dialog[open]')
        )
            return;
        app.startDemo();
    }
}
