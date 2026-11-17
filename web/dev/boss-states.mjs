// Boss state sheets: idle, every attack, taking damage, specials and the death, for one boss
// at a time, taken from the real engine (test.wasm, so the state hooks work) and drawn with
// the real renderer. Open boss-states.html?kind=5 (needs `npm run stress` to serve test.wasm).
// `window.exportSheet(url)` posts the composed PNG to `${url}/save?name=…`.
import { S } from '../src/runtime/scene-layout.mjs';
import { PixelRenderer, loadArt } from '../src/render/renderer.mjs';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { GUIDE } from '../src/boss/guide.mjs';
import { ATTACK, KINDS, PART, bossParts, bossState } from '../src/boss/scene.mjs';
import { deathMs } from '../src/boss/death.mjs';

const kind = Number(new URLSearchParams(location.search).get('kind') ?? 5);
const status = document.getElementById('status');
const root = document.getElementById('tiles');
const art = await loadArt();
const bytes = await (await fetch('./test.wasm')).arrayBuffer();
const W = 480,
    H = 270,
    ENTRANCE = 80;

async function fight(phase = 1, seed = 11, tier = 0) {
    let state = 9000 + kind * 31 + seed;
    const game = await createRuntime(bytes, {
        random: () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0),
    });
    game.start(true);
    game.bossPractice(kind, tier, phase);
    game.set = (field, value) => game.api.web_test_boss_set(field, value);
    game.tick = (n = 1, pin = true) => {
        for (let i = 0; i < n; i++) {
            if (pin) {
                game.set(3, 110);
                game.set(4, 150);
            }
            game.set(5, 1e9);
            game.step({ x: 2048, y: 2048, aimX: 1, aimY: 0 });
        }
    };
    game.until = (test, limit = 6000) => {
        for (let i = 0; i < limit; i++) {
            if (test(bossState(game.scene()), game.scene())) return true;
            game.tick();
        }
        return false;
    };
    game.tick(ENTRANCE);
    return game;
}
const parts = (game, k) => bossParts(game.scene()).filter((p) => p.kind === k);

async function photo(game, reduced = true) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const renderer = new PixelRenderer(canvas, art);
    renderer.reduced = reduced;
    await Promise.all([renderer.bossArt.load(KINDS[kind].region), renderer.bossArt.load('shots')]);
    renderer.render(game.scene());
    return canvas;
}

// ---- the states
const sections = [];
const add = (title, tiles) => sections.push({ title, tiles });

async function attackTiles() {
    const guide = GUIDE.find((b) => b.kind === kind);
    const out = [];
    for (const [i, entry] of guide.attacks.entries()) {
        status.textContent = `Firing · ${entry.name}…`;
        let got = null;
        for (let seed = 0; seed < 6 && !got; seed++) {
            const game = await fight(entry.phase, i * 7 + seed, entry.phase > 3 ? 2 : 0);
            if (game.until((b) => b.attack === entry.id && b.attackMs >= entry.at, 9000))
                got = await photo(game);
        }
        out.push({ label: entry.name, canvas: got });
    }
    return out;
}

async function idle() {
    const game = await fight(1);
    game.until((b) => !b.attack, 600);
    return { label: 'Idle (phase 1)', canvas: await photo(game) };
}
async function healthAt(fraction, label, phase = 1) {
    const game = await fight(phase);
    game.until((b) => !b.attack, 600);
    const max = bossState(game.scene()).maximum;
    game.set(0, Math.max(1, Math.floor(max * fraction)));
    game.tick(8); // past the 80 ms hit flash, so the damage overlay shows
    return { label, canvas: await photo(game) };
}
async function repel(ticks, label) {
    const game = await fight(1);
    game.until((b) => !b.attack, 600);
    const b = bossState(game.scene());
    for (let i = 0; i < ticks; i++) {
        game.set(3, Math.min(470, b.x + 40));
        game.set(4, b.y + 60);
        game.tick(1, false);
    }
    return { label, canvas: await photo(game) };
}
const repels = async () => [
    await repel(85, 'Repel ring: warning (pilot camping behind)'),
    await repel(128, 'Repel ring: live, gap toward the open field'),
];
// Idle over one sway period: the same fight photographed a few times in a row.
async function idleStrip(count, gapTicks, label) {
    const game = await fight(1);
    game.until((b) => !b.attack, 600);
    const out = [];
    for (let k = 0; k < count; k++) {
        out.push({ label: `${label} · +${Math.round(k * gapTicks * 18)} ms`, canvas: await photo(game) });
        game.tick(gapTicks);
    }
    return out;
}
async function death() {
    const game = await fight(1);
    game.tick(300);
    const snapshot = new Float32Array(game.scene());
    const out = [];
    for (const fraction of [0.1, 0.3, 0.5, 0.7, 0.85, 1]) {
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const renderer = new PixelRenderer(canvas, art);
        await Promise.all([renderer.bossArt.load(KINDS[kind].region), renderer.bossArt.load('shots')]);
        const alive = new Float32Array(snapshot);
        alive[0] = 2;
        alive[37] = 0;
        alive[2] = 0;
        renderer.previous = alive;
        const dead = new Float32Array(snapshot),
            time = fraction * deathMs(kind);
        dead[0] = 2;
        dead[512] = 0;
        dead[37] = 1;
        dead[2] = 1;
        renderer.render(dead);
        dead[37] = time + 1;
        dead[2] = time + 1;
        renderer.render(dead);
        out.push({ label: `Death · ${Math.round(time)} ms`, canvas });
    }
    return out;
}

async function zodiarch() {
    add('Idle and firing (every sign, the breath and the conjunction)', [await idle(), ...(await attackTiles())]);
    const hurt = [];
    status.textContent = 'Taking damage…';
    {
        const game = await fight(1);
        game.until((b) => b.aux[1] > 0.5, 3000);
        game.tick(10);
        const hp = bossState(game.scene()).health;
        game.set(0, hp - 3);
        game.tick(1);
        hurt.push({ label: 'Pearl open, hit (flash)', canvas: await photo(game) });
    }
    {
        const game = await fight(1);
        game.until(() => parts(game, PART.sign).some((p) => p.state === 1), 3000);
        const live = parts(game, PART.sign).find((p) => p.state === 1);
        hurt.push({ label: 'Creature live: key star twinkling', canvas: await photo(game) });
        for (let k = 0; k < 3; k++) game.set(9, live.index);
        game.tick(4);
        hurt.push({ label: 'Key star shot: creature breaks, dragon hurt', canvas: await photo(game) });
    }
    hurt.push(await healthAt(0.62, 'Damaged · 62% (phase 2)', 2));
    hurt.push(await healthAt(0.3, 'Damaged · 30% (phase 3)', 3));
    hurt.push(await healthAt(0.08, 'Nearly dead · 8%', 3));
    add('Taking damage', hurt);
    const special = [];
    status.textContent = 'Specials…';
    {
        const game = await fight(1);
        game.until((b) => b.attack === ATTACK.aries && b.attackMs > 250 && b.attackMs < 500, 9000);
        special.push({ label: 'Sign forming out of the ring (warning)', canvas: await photo(game) });
    }
    {
        const game = await fight(1);
        game.until((b) => b.aux[1] > 0.5, 3000);
        game.tick(20);
        special.push({ label: 'Pearl window open (slows down)', canvas: await photo(game) });
    }
    special.push(...(await repels()));
    add('Special', special);
    add('Death', await death());
}

async function ninefold() {
    add('Idle motion (breathing, tail sway, eye blink)', await idleStrip(4, 33, 'Idle'));
    add('Firing', await attackTiles());
    const hurt = [];
    status.textContent = 'Taking damage…';
    {
        const game = await fight(1);
        game.until((b) => !b.attack, 600);
        const tail = parts(game, PART.tail)[0];
        game.set(9, tail.index);
        game.tick(1);
        hurt.push({ label: 'Tail hit (flash)', canvas: await photo(game) });
    }
    hurt.push(await healthAt(6.5 / 9, 'Tail lost: 7 tails, forehead mark open'));
    hurt.push(await healthAt(4.5 / 9, '5 tails'));
    hurt.push(await healthAt(2.5 / 9, '3 tails'));
    hurt.push(await healthAt(0.5 / 9, 'Last tail'));
    add('Taking damage (nine tails are its health)', hurt);
    const special = [];
    status.textContent = 'Specials…';
    {
        const game = await fight(1);
        game.until((b) => b.attack === ATTACK.illusion && b.attackMs >= 1300, 9000);
        special.push({ label: 'Illusion: two decoys (real fox has lit eyes)', canvas: await photo(game) });
        for (const d of parts(game, PART.decoy)) for (let k = 0; k < 3; k++) game.set(9, d.index);
        game.tick(3);
        special.push({ label: 'Both decoys popped: forehead opens', canvas: await photo(game) });
    }
    {
        const game = await fight(1);
        game.until((b) => b.attack === ATTACK.foxBlink && b.attackMs >= 250, 9000);
        special.push({ label: 'Blink: dissolving into stars', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 750, 200);
        special.push({ label: 'Blink: gathering at its new place', canvas: await photo(game) });
    }
    special.push(...(await repels()));
    add('Special', special);
    add('Death', await death());
}

if (kind === 5) await zodiarch();
else if (kind === 11) await ninefold();

for (const s of sections) {
    const h = document.createElement('h2');
    h.textContent = s.title;
    root.append(h);
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const t of s.tiles) {
        const f = document.createElement('figure');
        const c = document.createElement('figcaption');
        c.textContent = t.label + (t.canvas ? '' : ' (not reached)');
        if (t.canvas) f.append(t.canvas);
        f.append(c);
        grid.append(f);
    }
    root.append(grid);
}
status.textContent = `${KINDS[kind].name}: ${sections.reduce((n, s) => n + s.tiles.length, 0)} states.`;
window.statesDone = true;

window.exportSheet = async (url) => {
    await document.fonts.load('26px "Jersey 10"');
    const COLS = 4,
        GAP = 12,
        CAP = 30,
        HEAD = 46;
    let height = 64;
    for (const s of sections) height += HEAD + Math.ceil(s.tiles.length / COLS) * (H + CAP + GAP);
    const out = document.createElement('canvas');
    out.width = COLS * (W + GAP) + GAP;
    out.height = height;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#0a0518';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = '#ffc88a';
    ctx.font = '44px "Jersey 10"';
    ctx.fillText(`${KINDS[kind].name.toUpperCase()} · STATES`, GAP, 46);
    let y = 64;
    for (const s of sections) {
        ctx.fillStyle = '#33447f';
        ctx.fillRect(GAP, y, out.width - GAP * 2, 2);
        ctx.fillStyle = '#ffe9c4';
        ctx.font = '30px "Jersey 10"';
        ctx.fillText(s.title.toUpperCase(), GAP, y + 34);
        y += HEAD;
        s.tiles.forEach((t, i) => {
            const x = GAP + (i % COLS) * (W + GAP),
                top = y + Math.floor(i / COLS) * (H + CAP + GAP);
            if (t.canvas) ctx.drawImage(t.canvas, x, top);
            ctx.fillStyle = '#0f1830';
            ctx.fillRect(x, top + H, W, CAP);
            ctx.fillStyle = t.canvas ? '#eef2ff' : '#ff9a7a';
            ctx.font = '22px "Jersey 10"';
            ctx.fillText((t.label + (t.canvas ? '' : ' (not reached)')).toUpperCase(), x + 8, top + H + 22);
        });
        y += Math.ceil(s.tiles.length / COLS) * (H + CAP + GAP);
    }
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    const name = KINDS[kind].name.toLowerCase();
    return (await fetch(`${url}/save?name=${name}`, { method: 'POST', body: blob })).status;
};
