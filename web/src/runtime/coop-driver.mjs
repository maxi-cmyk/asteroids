import { SCENE_FLOATS } from './scene-layout.mjs';
import { decodeCoopPlayer } from './coop-scene.mjs';

// Converts co-op inputs and engine scenes; CoopRun handles its end screens.
export class CoopDriver {
    constructor(runtime, finish) {
        this.runtime = runtime;
        this.finish = finish;
    }
    players() {
        return [0, 1].map((owner) =>
            decodeCoopPlayer(
                new Float32Array(
                    new Float32Array(
                        this.runtime.host.memory.buffer,
                        this.runtime.api.web_coop_player(owner),
                        SCENE_FLOATS,
                    ),
                ),
            ),
        );
    }
    releaseLasers(players) {
        if (!this.runtime.coop || this.runtime.api.web_state() !== 3) return;
        players.forEach((p, i) =>
            this.runtime.api.web_coop_input(i, 0, 0, 0, 0, 0, +!!p.laser, 0, 0),
        );
    }
    step(inputs) {
        const { api, coop } = this.runtime;
        if (coop.phase) {
            api.web_audio_step();
            coop.stepEnd(inputs.players?.[inputs.menuOwner ?? 0] ?? inputs, this.runtime.result);
            return;
        }
        const players = inputs.players || [{}, {}];
        players.forEach((p, i) =>
            api.web_coop_input(
                i,
                ((p.x ?? 2048) - 2048) / 2048,
                ((p.y ?? 2048) - 2048) / 2048,
                +!!p.firePressed,
                p.aimX || 0,
                p.aimY || 0,
                +!!p.laser,
                +!!p.precision,
                +!!p.shield,
            ),
        );
        if (inputs.pause || players.some((p) => p.pause))
            api.web_coop_pause(+(api.web_state() !== 3));
        else api.web_step(2048, 2048, 0, 0, 0);
        if (api.web_state() === 6 || api.web_state() === 8) this.finish();
    }
}
