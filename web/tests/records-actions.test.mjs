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
