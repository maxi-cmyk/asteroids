// Stress fixture for the boss renderer (nextSteps S0.3). It holds 48 hostile shots and 6 lethal
// hazards alive on a boss in the real engine (test.wasm, `web_test_boss_stress`), draws with the
// real renderer at the page's size, and times frames. `window.stressResult` holds the numbers.
import { PixelRenderer, loadArt } from '../src/render/renderer.mjs';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { KINDS, bossShots, bossState } from '../src/boss/scene.mjs';

const TICK_MS = 20,
    BUDGET_MS = 25;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
for (const [i, kind] of KINDS.entries()) {
    if (kind.mini) continue;
    const option = new Option(
        `${kind.name}`,
        String(i),
        false,
        i === Number(params.get('boss') ?? 5),
    );
    $('boss').append(option);
}
if (params.has('phase')) $('phase').value = params.get('phase');
if (params.has('seconds')) $('seconds').value = params.get('seconds');

const art = await loadArt();
const bytes = await (await fetch('./test.wasm')).arrayBuffer();
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

async function run({ kind, phase, seconds }) {
    let seed = 99;
    const game = await createRuntime(bytes, {
        random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0),
    });
    game.start(true);
    game.bossPractice(kind, 0, phase);
    const canvas = $('stage');
    const renderer = new PixelRenderer(canvas, art);
    renderer.reduced = false;
    await Promise.all([renderer.bossArt.load(KINDS[kind].region), renderer.bossArt.load('shots')]);
    const api = game.api;
    api.web_test_boss_set(5, 1e9); // untouchable: the fixture measures drawing, not survival
    const intervals = [],
        work = [];
    let peakShots = 0,
        peakHazards = 0;
    let previous = null,
        accumulator = 0;
    const end = performance.now() + seconds * 1000;
    await new Promise((resolve) => {
        const frame = (now) => {
            const started = performance.now();
            if (previous !== null) {
                intervals.push(now - previous);
                accumulator += Math.min(100, now - previous);
            }
            previous = now;
            while (accumulator >= TICK_MS) {
                accumulator -= TICK_MS;
                api.web_test_boss_stress();
                game.step({ aimX: 1, aimY: 0 });
                const scene = game.scene();
                if (!bossState(scene).active) game.bossPractice(kind, 0, phase);
            }
            const scene = game.scene();
            peakShots = Math.max(peakShots, bossShots(scene).length);
            renderer.render(scene);
            work.push(performance.now() - started);
            $('status').textContent = `${Math.max(0, Math.round((end - now) / 1000))} s left`;
            if (now < end) requestAnimationFrame(frame);
            else resolve();
        };
        requestAnimationFrame(frame);
    });
    const stats = new Float32Array(api.memory.buffer, api.web_test_boss_stats(), 16);
    peakHazards = stats[2];
    const sortedInterval = [...intervals].sort((a, b) => a - b),
        sortedWork = [...work].sort((a, b) => a - b);
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const result = {
        boss: KINDS[kind].name,
        phase,
        seconds,
        frames: intervals.length,
        canvasCss: `${canvas.clientWidth}x${canvas.clientHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        peakShots,
        peakHazards,
        fps: Number((1000 / mean(intervals)).toFixed(1)),
        intervalMs: {
            mean: Number(mean(intervals).toFixed(2)),
            p95: Number(quantile(sortedInterval, 0.95).toFixed(2)),
            p99: Number(quantile(sortedInterval, 0.99).toFixed(2)),
            max: Number(sortedInterval.at(-1).toFixed(2)),
            over25: intervals.filter((ms) => ms > BUDGET_MS).length,
        },
        workMs: {
            mean: Number(mean(work).toFixed(2)),
            p95: Number(quantile(sortedWork, 0.95).toFixed(2)),
            p99: Number(quantile(sortedWork, 0.99).toFixed(2)),
            max: Number(sortedWork.at(-1).toFixed(2)),
        },
        userAgent: navigator.userAgent,
    };
    result.pass = result.fps >= 58 && result.intervalMs.over25 === 0;
    window.stressResult = result;
    $('report').textContent = JSON.stringify(result, null, 2);
    $('status').textContent = result.pass ? 'within budget' : 'over budget';
}

const settings = () => ({
    kind: Number($('boss').value),
    phase: Number($('phase').value),
    seconds: Number($('seconds').value),
});
$('start').addEventListener('click', () => run(settings()));
$('full').addEventListener('click', async () => {
    document.body.classList.add('full');
    await document.documentElement.requestFullscreen?.().catch(() => {});
    await run(settings());
    document.body.classList.remove('full');
    if (document.fullscreenElement) document.exitFullscreen();
});
if (params.has('auto')) run(settings());
