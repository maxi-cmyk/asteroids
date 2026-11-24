import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHangarScreen } from '../../src/screens/hangar.mjs';
import { Loadouts } from '../../src/state/loadouts.mjs';
import { loadHangar } from '../../src/state/hangar.mjs';
import { memoryStorage } from '../../src/state/save.mjs';

const node = () => ({
    children: [],
    dataset: {},
    attrs: {},
    events: {},
    style: { setProperty() {} },
    setAttribute(k, v) {
        this.attrs[k] = v;
    },
    addEventListener(k, fn) {
        this.events[k] = fn;
    },
    replaceChildren(...items) {
        this.children = items;
    },
    append(...items) {
        this.children.push(...items);
    },
    getContext() {
        return { clearRect() {}, fillRect() {}, drawImage() {} };
    },
});
const html = readFileSync(new URL('../../html/hangar.html', import.meta.url), 'utf8');
const nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map((m) => [m[1], node()]));
const tabs = ['ship', 'primary', 'secondary'].map((slot) =>
    Object.assign(node(), { dataset: { hangarSlot: slot } }),
);
const pilots = [0, 1].map((i) => Object.assign(node(), { dataset: { pilot: String(i) } }));
globalThis.document = {
    getElementById: (id) => nodes.get(id),
    createElement: node,
    querySelectorAll: (selector) => (selector === '[data-hangar-slot]' ? tabs : pilots),
};
globalThis.Image = class {};

test('Hangar screen separates browsing/equipping, switches slots and saves profile paint', () => {
    const storage = memoryStorage(),
        loadouts = new Loadouts(storage),
        store = loadHangar(storage);
    loadouts.grant(0, 2);
    const screen = createHangarScreen({ storage, loadouts, store, activeProfile: () => 0 });
    screen.open();
    nodes.get('hangarNext').events.click();
    assert.equal(nodes.get('hangarName').textContent, 'Dart');
    assert.equal(loadouts.get(0).ship, 'vanguard');
    nodes.get('equipPreview').events.click();
    assert.equal(loadouts.get(0).ship, 'dart');
    assert.equal(store.profiles[0], 'dart');
    tabs[1].events.click();
    assert.equal(nodes.get('hangarName').textContent, 'Repeater');
    for (let i = 0; i < 5; i++) nodes.get('hangarNext').events.click();
    assert.equal(nodes.get('equipPreview').disabled, true);
    assert.match(nodes.get('hangarTag').textContent, /Clear Act 1 Level 6/);
    nodes.get('hangarPaints').children[1].events.click();
    assert.equal(loadHangar(storage).paints[0], 'crimson');
    pilots[1].events.click();
    assert.equal(nodes.get('hangarName').textContent, 'Vanguard');
    assert.equal(nodes.get('paintLabel').textContent, 'Accent colour · Cobalt');
    assert.equal(loadouts.get(1).ship, 'vanguard');
    nodes.get('hangarOptions').events.wheel({ deltaX: 60, preventDefault() {} });
    assert.equal(nodes.get('hangarName').textContent, 'Dart');
    assert.equal(loadouts.get(1).ship, 'vanguard');
    assert.equal(nodes.get('equipPreview').disabled, true);
});
