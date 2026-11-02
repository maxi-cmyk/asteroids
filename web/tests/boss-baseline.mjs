// Re-baseline the scripted pilot over every boss and mini-boss: clear time, hits taken and the
// fairness counters, as a Markdown table for web/COMBAT.md.
//
//     cd web && npm run build && node tests/boss-baseline.mjs [seeds] [tiers]
//     node tests/boss-baseline.mjs 5 0,1,2
//
// Times are the bot's (perfect aim, 6 shots/s); people take about 1.5x as long.
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { S } from '../src/runtime/scene-layout.mjs';
import { KINDS, bossState } from '../src/boss/scene.mjs';
import { BossBot } from './boss-bot.mjs';

const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
const seeds = Number(process.argv[2] ?? 5);
const tiers = (process.argv[3] ?? '0,1,2').split(',').map(Number);
const LIMIT = 150 * 50;

async function fight(kind, tier, seed) {
    let state = seed;
    const game = await createRuntime(bytes, {
        random: () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0),
    });
    game.start(true);
    game.api.web_boss_practice(kind, tier, 0);
    const bot = new BossBot(game);
    let steps = 0;
    for (; steps < LIMIT; steps++) {
        bot.step();
        if (!game.scene()[S.BOSS_ACTIVE] && steps > 100) break;
    }
    const v = new Float32Array(game.api.memory.buffer, game.api.web_test_boss_stats(), 16);
    return {
        seconds: steps / 50,
        beaten: !bossState(game.scene()).active,
        hits: v[5],
        violations: v[0],
        shots: v[1],
        hazards: v[2],
        corridor: v[4],
        entrance: v[3],
    };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const rows = [];
for (const [kind, info] of KINDS.entries()) {
    for (const tier of tiers) {
        const runs = [];
        for (let i = 0; i < seeds; i++) runs.push(await fight(kind, tier, 100 + kind + i * 17));
        rows.push({
            name: info.name,
            tier,
            min: Math.min(...runs.map((r) => r.seconds)),
            avg: mean(runs.map((r) => r.seconds)),
            max: Math.max(...runs.map((r) => r.seconds)),
            hits: mean(runs.map((r) => r.hits)),
            shots: Math.max(...runs.map((r) => r.shots)),
            hazards: Math.max(...runs.map((r) => r.hazards)),
            corridor: Math.min(...runs.map((r) => r.corridor)),
            bad: runs.reduce((n, r) => n + r.violations + r.entrance + (r.beaten ? 0 : 1), 0),
        });
    }
}
console.log(
    `| Fight | Tier | Bot clear s (min / avg / max) | Hits taken | Max shots | Max hazards | Min corridor px | Faults |`,
);
console.log(`| --- | --- | --- | --- | --- | --- | --- | --- |`);
for (const r of rows)
    console.log(
        `| ${r.name} | ${'I II III IV'.split(' ')[r.tier]} | ${r.min.toFixed(0)} / ${r.avg.toFixed(0)} / ${r.max.toFixed(0)} | ${r.hits.toFixed(1)} | ${r.shots} | ${r.hazards} | ${r.corridor.toFixed(0)} | ${r.bad} |`,
    );
