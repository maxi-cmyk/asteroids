import { createRuntime } from '../runtime/runtime.mjs';
import { SeededRandom } from '../runtime/rng.mjs';
import { indexOf, sanitizeLoadout, LOADOUT_VERSION } from './catalogue.mjs';

// An isolated practice engine: automatic demonstrations never write records or unlocks.
export class LoadoutPreview {
    constructor(runtime, renderer) {
        this.runtime = runtime;
        this.renderer = renderer;
        this.key = '';
        this.previous = 0;
        this.elapsed = 0;
        this.tick = 0;
    }
    select(kit) {
        const key = JSON.stringify(kit);
        if (key === this.key) return;
        this.key = key;
        this.kit = sanitizeLoadout(kit);
        this.tick = 0;
        this.runtime.start(true);
        this.runtime.api.web_loadout(
            0,
            indexOf('ship', kit.ship),
            indexOf('primary', kit.primary),
            indexOf('secondary', kit.secondary),
            LOADOUT_VERSION,
        );
        this.renderer.hulls = [kit.ship];
    }
    draw(time, reduced) {
        this.elapsed += Math.min(100, Math.max(0, time - this.previous));
        this.previous = time;
        if (!reduced)
            while (this.elapsed >= 20) {
                this.elapsed -= 20;
                this.tick++;
                this.runtime.step({
                    x: 2048,
                    y: 2048 + Math.round(Math.sin(this.tick / 50) * 1100),
                    aimX: 1,
                    aimY: 0,
                    firePressed: this.tick % 8 === 0,
                    laser: this.tick % 400 >= 180 && this.tick % 400 < 280,
                });
            }
        else this.elapsed = 0;
        this.renderer.renderIfChanged(this.runtime.scene());
    }
}

export async function createPreviewRuntime(bytes) {
    const rng = new SeededRandom('0123456789abcdef0123456789abcdef');
    return createRuntime(bytes, { random: () => rng.next() });
}
