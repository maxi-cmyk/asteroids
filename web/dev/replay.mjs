// The replay page (nextSteps.md R3): checks that this browser replays the scripted fight to
// the same hashes as Node, and plays a saved replay with the real renderer.
import { PixelRenderer, loadArt } from '../src/render/renderer.mjs';
import { ReplayPlayer } from '../src/runtime/replay.mjs';
import { KINDS } from '../src/boss/scene.mjs';
import { replayCheck } from './replay-check.mjs';

const $ = (id) => document.getElementById(id);
const bytes = await (await fetch('./game.wasm')).arrayBuffer();

$('check').onclick = async () => {
    $('result').textContent = 'Running…';
    const result = await replayCheck(bytes);
    result.agrees = result.live === result.replay;
    result.browser = navigator.userAgent;
    $('result').textContent = JSON.stringify(result, null, 2);
    window.replayCheckResult = result;
};

const art = await loadArt();
const renderer = new PixelRenderer($('stage'), art);
await Promise.all(
    [...new Set(KINDS.map((k) => k.region)), 'shots'].map((r) => renderer.bossArt.load(r)),
);
let player = null,
    paused = false,
    previous = null,
    accumulator = 0;
$('pause').onclick = () => {
    paused = !paused;
    $('pause').textContent = paused ? 'Play' : 'Pause';
};
$('file').onchange = async () => {
    const file = $('file').files[0];
    if (!file) return;
    try {
        player = await ReplayPlayer.open(bytes, JSON.parse(await file.text()));
        previous = null;
        accumulator = 0;
    } catch (error) {
        player = null;
        $('status').textContent = error.message;
    }
};
const frame = (now) => {
    if (player) {
        if (previous !== null && !paused) accumulator += Math.min(100, now - previous);
        previous = now;
        while (accumulator >= 20 && player.step()) accumulator -= 20;
        renderer.render(player.scene());
        const s = (n) => (n / 50).toFixed(1);
        $('status').textContent = `${s(player.tick)} / ${s(player.length)} s`;
    }
    requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
