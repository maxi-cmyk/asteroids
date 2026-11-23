import test from 'node:test';
import assert from 'node:assert/strict';
import { isFirstRun } from '../src/screens/home.mjs';
import { assembleHtml } from '../tools/assemble-html.mjs';

const key = (practice) => JSON.stringify(['solo', false, [], practice]);

test('a first run has no real run on either profile; practice never ends it', () => {
    assert.equal(isFirstRun(undefined), true);
    assert.equal(isFirstRun({ profiles: [{}, {}] }), true);
    assert.equal(isFirstRun({ profiles: [{ [key(true)]: { wave: 9 } }, {}] }), true);
    assert.equal(isFirstRun({ profiles: [{ [key(false)]: { wave: 1 } }, {}] }), false);
    assert.equal(isFirstRun({ profiles: [{}, { [key(false)]: { wave: 3 } }] }), false);
});

test('the Home page has the How to play link the highlight is written to', () => {
    assert.match(assembleHtml(), /id="homeHelp"/);
});
