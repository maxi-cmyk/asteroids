// Re-baseline the scripted pilot over every Act 1 level (nextSteps.md C1): the time it takes to
// clear each level, the lives it loses and the hits it takes, as a Markdown table for
// web/COMBAT.md. Par time for a level is the pilot's mean time x 1.5, rounded to five seconds.
//
//     cd web && node build.mjs --test && node tests/level-baseline.mjs [seeds] [levels]
//     node tests/level-baseline.mjs 5 1,2,3,4,5,6
//
// The pilot is the Home demo's (perfect aim, no mistakes it can see coming); people are expected
// to take 1.5 to 2.5 times as long. When it runs out of lives it is handed three more, like the
// demo, so every level is measured to the end; `lost` counts the lives it needed.
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { S } from '../src/runtime/scene-layout.mjs';
import { Pilot } from '../src/demo/pilot.mjs';
import { LEVELS } from '../src/state/campaign-data.mjs';

const LIMIT = 15 * 60 * 50; // fifteen minutes of ticks

// One level, one seed. Returns the facts the engine reports at the end.
export async function flyLevel(bytes, level, seed, { limit = LIMIT, players = 1 } = {}) {
    let state = seed;
    const game = await createRuntime(bytes, {
        random: () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0),
    });
    game.api.web_boss_assist(0, 0);
    game.startLevel(level);
    const pilot = new Pilot(game);
    let ticks = 0;
    for (; ticks < limit; ticks++) {
        const scene = game.scene();
        const name = game.state;
        if (name === 'level-clear' || name === 'results' || name === 'game-over') break;
        if (name === 'playing') {
            const i = pilot.decide(scene);
            game.api.web_fire_press(+!!i.firePressed);
            game.api.web_actions(i.aimX ?? 0, i.aimY ?? 0, +!!i.laser, 0, +!!i.shield);
            game.api.web_step(i.x ?? 2048, i.y ?? 2048, +!!i.fire, 0, 0);
        } else {
            if (name === 'death' && !scene[S.LIVES]) game.api.web_demo_lives(3);
            game.step();
        }
    }
    const scene = game.scene();
    return {
        game,
        ticks,
        cleared: scene[S.LEVEL_CLEARED] === 1,
        seconds: scene[S.LEVEL_TIME_MS] / 1000,
        lost: scene[S.LEVEL_LIVES_LOST],
        hits: scene[S.LEVEL_HITS_TAKEN],
        score: scene[S.SCORE],
        wave: scene[S.WAVE],
        players,
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
    const seeds = Number(process.argv[2] ?? 5);
    const levels = (process.argv[3] ?? '1,2,3,4,5,6').split(',').map(Number);
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log('| Level | Region | Cleared | Time min / mean / max | Lives lost | Hits | Par |');
    console.log('| --- | --- | --- | --- | --- | --- | --- |');
    for (const level of levels) {
        const runs = [];
        for (let i = 0; i < seeds; i++)
            runs.push(await flyLevel(bytes, level, 200 + level * 31 + i * 17));
        const times = runs.map((r) => r.seconds);
        const par = Math.round((mean(times) * 1.5) / 5) * 5;
        console.log(
            `| ${level} | ${LEVELS[level - 1].region.name} | ${runs.filter((r) => r.cleared).length}/${seeds} | ` +
                `${Math.min(...times).toFixed(0)} / ${mean(times).toFixed(0)} / ${Math.max(...times).toFixed(0)} s | ` +
                `${mean(runs.map((r) => r.lost)).toFixed(1)} | ${mean(runs.map((r) => r.hits)).toFixed(1)} | ${par} s |`,
        );
    }
}
