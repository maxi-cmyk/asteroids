// The campaign's screens and routes (nextSteps.md C1): the page has every control the app wires
// up, navigation reaches the level select and the co-op lobby and starts levels, and the stars
// and unlocks the screens show come from the progress store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assembleHtml } from '../tools/assemble-html.mjs';
import { Navigation } from '../src/state/navigation.mjs';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { S } from '../src/runtime/scene-layout.mjs';

const html = assembleHtml();
const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
async function setup() {
    let seed = 4242;
    const runtime = await createRuntime(bytes, {
        random: () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0),
    });
    return { runtime, nav: new Navigation({ runtime }) };
}
const has = (id) => html.includes(`id="${id}"`);

test('the page has the Play screen, the level select and the level result controls', () => {
    for (const id of [
        'campaignPlay',
        'endlessPlay',
        'practice',
        'pilotsOne',
        'pilotsTwo',
        'levelList',
        'levelsStars',
        'levelNext',
        'levelRetry',
        'levelSelect',
        'levelResult',
        'levelTime',
        'levelPilots',
        'levelUnlock',
        'restartLevel',
        'recordsCampaign',
        'campaignRows',
    ])
        assert.ok(has(id), `${id} is in the page`);
    assert.ok(html.includes('data-view="levels"'));
    // Endless is a card, locked until Act 1 is done; the old solo and co-op cards are gone.
    assert.match(html, /id="endlessPlay"[^>]*aria-disabled="true"/);
    assert.ok(!has('soloPlay') && !has('localPlay'));
    // The level result's buttons start hidden, and Continue is the only one outside a level.
    for (const id of ['levelNext', 'levelRetry', 'levelSelect'])
        assert.match(html, new RegExp(`id="${id}"[^>]*hidden`));
    assert.match(html, /id="restartLevel"[^>]*hidden/);
    // Records has a Campaign tab beside the Endless tables.
    assert.match(html, /data-value="campaign">Campaign</);
    assert.match(html, /data-value="solo">Endless</);
});

test('Help explains the campaign, the stars and Endless', () => {
    const help = html.slice(html.indexOf('data-view="help"'), html.indexOf('id="helpPaused"'));
    for (const word of ['Campaign', 'Stars', 'Endless', 'time target', 'extra lives offset losses'])
        assert.ok(help.includes(word), `Help mentions ${word}`);
});

test('the level select is a screen: Back goes to Play, and the lobby goes back where it came from', async () => {
    const { nav } = await setup();
    nav.request('levels');
    assert.equal(nav.screen, 'levels');
    nav.back();
    assert.equal(nav.screen, 'mode');
    // Two pilots on a level: the lobby comes from the level select, and Back returns there.
    nav.request('levels');
    nav.lobbyFrom = 'levels';
    nav.request('lobby');
    nav.back();
    assert.equal(nav.screen, 'levels');
    // From Play (Endless) it returns to Play.
    nav.lobbyFrom = 'mode';
    nav.request('lobby');
    nav.back();
    assert.equal(nav.screen, 'mode');
    assert.equal(nav.shouldStep, false, 'menus never step the engine');
});

test('starting a level goes to the play screen with that level, solo or co-op', async () => {
    const { runtime, nav } = await setup();
    nav.request('levels');
    nav.startLevel(4);
    assert.equal(nav.screen, 'play');
    assert.equal(runtime.scene()[S.LEVEL_INDEX], 4);
    assert.equal(runtime.scene()[S.WAVE], 16);
    assert.equal(runtime.coop, null);
    // The lobby's start carries the level: it becomes a co-op level, not an Endless co-op run.
    nav.startCoop({ profiles: [0, 1], friendlyFire: true, level: 2 });
    assert.equal(nav.screen, 'play');
    assert.ok(runtime.coop);
    assert.deepEqual(runtime.level, { level: 2, profiles: [0, 1], friendlyFire: true });
    assert.equal(runtime.scene()[S.LEVEL_INDEX], 2);
    // Level 0 (the lobby's "no level") is an ordinary Endless co-op run.
    nav.startCoop({ profiles: [0, 1], friendlyFire: false, level: 0 });
    assert.equal(runtime.level, null);
    assert.equal(runtime.scene()[S.LEVEL_INDEX], 0);
    // Leaving to Home ends the level for good.
    nav.startLevel(1);
    nav.request('home');
    nav.resolve('quit');
    assert.equal(nav.screen, 'home');
    assert.equal(runtime.level, null);
    assert.equal(runtime.scene()[S.LEVEL_INDEX], 0);
});

test('Next level only follows a level that has one, and Retry restarts the same level', async () => {
    const { runtime, nav } = await setup();
    nav.startLevel(5);
    assert.equal(runtime.nextLevel(), 6);
    nav.startLevel(6);
    assert.equal(runtime.nextLevel(), null);
    runtime.restartLevel();
    assert.equal(runtime.level.level, 6);
    assert.equal(runtime.scene()[S.WAVE], 26);
    runtime.menu();
    assert.equal(runtime.nextLevel(), null);
});
