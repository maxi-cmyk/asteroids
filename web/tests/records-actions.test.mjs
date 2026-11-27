import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecordsActions } from '../src/screens/records-actions.mjs';
const nodes = new Map();
globalThis.document = {
    getElementById(id) {
        if (!nodes.has(id))
            nodes.set(id, {
                value: '',
                hidden: false,
                textContent: '',
                listeners: {},
                addEventListener(type, callback) {
                    this.listeners[type] = callback;
                },
                focus() {},
                click() {
                    this.listeners.click?.();
                },
            });
        return nodes.get(id);
    },
};
const node = (id) => document.getElementById(id);
test('reset confirms its scope, cancels safely and follows the selected profile', () => {
    const calls = [];
    createRecordsActions({
        getRuntime: () => ({ resetPersonalBests: (p) => calls.push(p) }),
        profileStore: { activeProfile: 0 },
        draw() {},
        storage: null,
    });
    node('resetRecords').click();
    assert.deepEqual(calls, []);
    assert.match(node('recordsStatus').textContent, /Campaign best times and scores/);
    assert.match(
        node('recordsStatus').textContent,
        /Campaign stars, unlocked levels, ships and top-five scores are kept/,
    );
    node('cancelResetRecords').click();
    node('resetRecords').click();
    assert.deepEqual(calls, []);
    node('recordsProfile').value = '1';
    node('recordsProfile').listeners.change();
    node('resetRecords').click();
    assert.deepEqual(calls, []);
    assert.match(node('resetRecords').textContent, /Player 2/);
    node('resetRecords').click();
    assert.deepEqual(calls, [1]);
    assert.equal(node('cancelResetRecords').hidden, true);
});

// ---- import UI (audit A06/A07) ---------------------------------------------------------------
const { memoryStorage, readSave, saveFileText, writeSave } = await import('../src/state/save.mjs');
async function importing({ allowWrites, size }) {
    const base = memoryStorage();
    let writes = 0;
    const storage = {
        getItem: (k) => base.getItem(k),
        removeItem: (k) => {
            if (writes > allowWrites) throw new Error('denied');
            base.removeItem(k);
        },
        setItem: (k, v) => {
            if (++writes > allowWrites) throw new Error('quota');
            base.setItem(k, v);
        },
    };
    globalThis.location = { reload: () => (globalThis.reloaded = true) };
    globalThis.reloaded = false;
    createRecordsActions({
        getRuntime: () => ({}),
        profileStore: { activeProfile: 0 },
        draw() {},
        storage,
    });
    const text = saveFileText(readSave(memoryStorage()), 'test');
    let read = false;
    node('importSaveFile').files = [
        { size: size ?? text.length, text: async () => ((read = true), text) },
    ];
    await node('importSaveFile').listeners.change();
    return { storage, read: () => read };
}

test('a partly applied import says so instead of promising nothing changed', async () => {
    await importing({ allowWrites: 1 });
    node('confirmImport').click();
    const text = node('saveStatus').textContent;
    assert.doesNotMatch(text, /Nothing was changed/);
    assert.match(text, /partly|partially|may have changed/i);
    assert.equal(globalThis.reloaded, false);
});

test('a fully refused import may still say nothing was changed', async () => {
    await importing({ allowWrites: 0 });
    node('confirmImport').click();
    assert.match(node('saveStatus').textContent, /Nothing was changed/);
});

test('an oversized save file is refused before it is read', async () => {
    const { read } = await importing({ allowWrites: 99, size: 10 * 1024 * 1024 });
    assert.equal(read(), false);
    assert.match(node('saveStatus').textContent, /too large/);
});
