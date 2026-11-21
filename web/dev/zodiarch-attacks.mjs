// Every Zodiarch attack from the live engine (nextSteps.md P2.3): each one started on demand
// (web_test_boss_set 10) and photographed with the real renderer at five moments. Open
// zodiarch-attacks.html (needs `npm run stress` to serve test.wasm).
// `window.exportSheet(url)` posts the composed PNG to `${url}/save?name=…`.
import { PixelRenderer, loadArt } from '../src/render/renderer.mjs';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { GUIDE } from '../src/boss/guide.mjs';
import { ATTACK, KINDS } from '../src/boss/scene.mjs';
import { HITBOXES, drawHitboxes } from './hitboxes.mjs';

const status = document.getElementById('status');
const root = document.getElementById('tiles');
const art = await loadArt();
const bytes = await (await fetch('./test.wasm')).arrayBuffer();
const W = 480,
    H = 270,
    ENTRANCE = 80;
// Signs: wake, flight, formed, acting, later. Its own attacks first settle (up to 1.6 s).
const MOMENTS = { sign: [250, 650, 1300, 2300, 3700], own: [600, 1400, 2200, 2800, 3600] };

async function photo(game) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const renderer = new PixelRenderer(canvas, art);
    renderer.reduced = true;
    await Promise.all([renderer.bossArt.load(KINDS[5].region), renderer.bossArt.load('shots')]);
    renderer.render(game.scene());
    if (HITBOXES) drawHitboxes(canvas.getContext('2d'), game, 5);
    return canvas;
}
const rows = [];
for (const entry of GUIDE.find((b) => b.kind === 5).attacks) {
    status.textContent = `Firing · ${entry.name}…`;
    let state = 4242 + entry.id;
    const game = await createRuntime(bytes, {
        random: () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0),
    });
    game.start(true);
    game.bossPractice(5, entry.phase > 3 ? 2 : 0, Math.min(3, entry.phase));
    const set = (f, v) => game.api.web_test_boss_set(f, v);
    // Pin the pilot, keep it untouchable and hold the next attack off while we watch this one.
    const tick = (n) => {
        for (let i = 0; i < n; i++) {
            set(3, 90);
            set(4, 150);
            set(5, 1e9);
            set(11, 1e6);
            game.step({ x: 2048, y: 2048, aimX: 1, aimY: 0 });
        }
    };
    tick(ENTRANCE);
    set(8, 0);
    set(10, entry.id);
    const sign = entry.id >= ATTACK.aries && entry.id <= ATTACK.conjunction;
    const shots = [];
    let at = 0;
    for (const ms of MOMENTS[sign ? 'sign' : 'own']) {
        for (; at < ms; at += 20) tick(1);
        shots.push(await photo(game));
    }
    rows.push({ label: entry.name, shots });
}
const sheet = document.createElement('canvas');
sheet.width = W * 5;
sheet.height = (H + 22) * rows.length;
const ctx = sheet.getContext('2d');
ctx.fillStyle = '#080d1c';
ctx.fillRect(0, 0, sheet.width, sheet.height);
rows.forEach((row, r) => {
    ctx.fillStyle = '#ffe9c4';
    ctx.font = '18px monospace';
    ctx.fillText(row.label, 6, r * (H + 22) + 17);
    row.shots.forEach((c, k) => ctx.drawImage(c, k * W, r * (H + 22) + 22));
});
root.append(sheet);
sheet.style.width = '100%';
status.textContent = `${rows.length} attacks`;
window.sheetReady = true;
window.exportSheet = async (url, name = 'zodiarch-attacks') => {
    for (let i = 0; i < rows.length; i += 4) {
        const part = document.createElement('canvas');
        const n = Math.min(4, rows.length - i);
        part.width = W * 5;
        part.height = (H + 22) * n;
        part.getContext('2d').drawImage(
            sheet,
            0,
            i * (H + 22),
            part.width,
            part.height,
            0,
            0,
            part.width,
            part.height,
        );
        await fetch(`${url}/save?name=${name}-${i / 4}`, {
            method: 'POST',
            body: await new Promise((r) => part.toBlob(r)),
        });
    }
    return rows.length;
};
