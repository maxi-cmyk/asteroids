import { S, BLOCKS, SCENE_FLOATS, recordAt } from './scene-layout.mjs';

const STAT_KEYS = [
    'cps',
    'peakCps',
    'spawned',
    'hits',
    'longestChain',
    'highestWave',
    'doubleFireMs',
    'laserShots',
    'laserKills',
    'presses',
    'pending',
];

// Read-only engine views and the co-op results overlay.
export class EngineReader {
    constructor(runtime) {
        this.runtime = runtime;
    }
    // ---------------------------------------------------------------- reading the engine
    stats() {
        if (this.runtime.coop) return this.runtime.coopPlayers()[0].stats;
        const values = new Float32Array(
            this.runtime.host.memory.buffer,
            this.runtime.api.web_stats(),
            16,
        );
        return Object.fromEntries(STAT_KEYS.map((key, i) => [key, values[i]]));
    }
    fireDiagnostics() {
        return [
            ...new Uint32Array(
                this.runtime.host.memory.buffer,
                this.runtime.api.web_fire_diagnostics(),
                4,
            ),
        ];
    }
    // The scene as a float view. In co-op it is player one's scene with the team's totals
    // and, on the end screens, the co-op results and initials entry written over it.
    scene() {
        if (!this.runtime.coop)
            return new Float32Array(
                this.runtime.host.memory.buffer,
                this.runtime.api.web_scene(),
                SCENE_FLOATS,
            );
        const scene = this.runtime.coopPlayers()[0].scene;
        scene[S.SCORE] = scene[S.COOP_TEAM_SCORE];
        scene[S.FINAL_SCORE] = scene[S.COOP_TEAM_SCORE];
        const { coop, result } = this.runtime;
        if (coop.phase) {
            scene[S.RUN_DESTROYED] = result.players.reduce((sum, p) => sum + p.destroyed, 0);
            scene[S.RUN_BEST_MULTIPLIER] = Math.max(...result.players.map((p) => p.bestMultiplier));
            scene[S.STATE] = coop.phase === 'initials' ? 5 : 6;
            scene[S.SELECTED_INITIAL] = coop.editor.slot;
            scene[S.SAVE_FAILED] = +coop.saveFailed;
            scene[S.SCORE_COUNT] = coop.board.entries.length;
            coop.editor.letters.forEach(
                (c, i) => (scene[BLOCKS.INITIALS.at + i] = c.charCodeAt(0)),
            );
            coop.board.entries.forEach((e, i) => {
                const at = recordAt(BLOCKS.HIGHSCORES, i);
                scene[at] = e.score;
                [...e.initials].forEach((c, j) => (scene[at + 1 + j] = c.charCodeAt(0)));
            });
        }
        return scene;
    }
    pixels() {
        return new Uint8Array(
            this.runtime.host.memory.buffer,
            this.runtime.api.web_pixels(),
            128 * 64,
        );
    }
    snapshot() {
        return [
            ...new Float32Array(
                this.runtime.host.memory.buffer,
                this.runtime.api.web_snapshot(),
                16,
            ),
        ];
    }
}
