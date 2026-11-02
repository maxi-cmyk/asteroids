import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRuntime } from '../src/runtime/runtime.mjs';
import { FightLog, FIGHT_LOG_KEY, FIGHT_LOG_LIMIT } from '../src/boss/fight-log.mjs';
import { defaults, sanitizeSettings } from '../src/state/settings.mjs';
import { BossBot } from './boss-bot.mjs';

const bytes = await readFile(new URL('../dist/test.wasm', import.meta.url));
const memory = () => {
    const data = new Map();
    return {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => data.set(k, v),
        removeItem: (k) => data.delete(k),
        data,
    };
};
async function newGame(storage, seed = 7) {
    let state = seed;
    return createRuntime(bytes, {
        storage,
        random: () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0),
    });
}
async function practice(kind, storage) {
    const game = await newGame(storage);
    game.start(true);
    game.api.web_boss_practice(kind, 0, 0);
    return game;
}
// Flies the bot until an attempt is logged (or the limit), observing each tick as the app does.
function fly(game, bot, limit = 150 * 50) {
    for (let i = 0; i < limit; i++) {
        bot.step();
        if (game.fightLog.enabled) game.fightLog.observe(game.scene());
        if (game.fightLog.count > 0) break;
    }
}

test('the fight log is off by default and in a fresh settings object', async () => {
    assert.equal(defaults().fightLog, false);
    assert.equal(sanitizeSettings({ fightLog: 'yes' }).fightLog, false);
    assert.equal(sanitizeSettings({ fightLog: true }).fightLog, true);
    const game = await practice(0, memory());
    assert.equal(game.fightLog.enabled, false);
    fly(game, new BossBot(game), 600);
    assert.equal(game.fightLog.count, 0, 'nothing is recorded unless it is switched on');
});

test('a cleared fight is logged with its time, phases and damage', async () => {
    const storage = memory(),
        game = await practice(0, storage);
    game.fightLog.enabled = true;
    fly(game, new BossBot(game));
    assert.equal(game.fightLog.count, 1);
    const [attempt] = game.fightLog.attempts;
    assert.equal(attempt.boss, 'sentinel');
    assert.equal(attempt.tier, 'I');
    assert.equal(attempt.practice, true);
    assert.equal(attempt.outcome, 'defeated');
    assert(attempt.seconds > 15 && attempt.seconds < 60, `seconds ${attempt.seconds}`);
    assert(attempt.damagePerPhase.length >= 2, 'the Sentinel has two phases');
    const dealt = attempt.damagePerPhase.reduce((a, b) => a + b, 0);
    assert(dealt >= attempt.maximumHealth * 0.99, `damage ${dealt} of ${attempt.maximumHealth}`);
    assert.equal(attempt.hits.length, attempt.hitsTaken);
    assert.equal(JSON.parse(storage.data.get(FIGHT_LOG_KEY)).attempts.length, 1, 'it is saved');
    assert.equal(JSON.parse(game.fightLog.json()).attempts[0].boss, 'sentinel');
});

test('a lost life names the attack that took it, and leaving ends the attempt', async () => {
    const game = await newGame(memory());
    game.start();
    game.api.web_scenario(0);
    game.api.web_test_boss(5, 1, 0);
    game.api.web_test_boss_set(5, 0); // vulnerable
    game.api.web_test_boss_set(3, 150);
    game.api.web_test_boss_set(4, 135);
    game.fightLog.enabled = true;
    for (let i = 0; i < 200; i++) {
        game.step();
        game.fightLog.observe(game.scene());
    }
    assert.equal(game.fightLog.count, 0, 'the fight is still open');
    game.fightLog.end(game.scene());
    const [attempt] = game.fightLog.attempts;
    assert.equal(attempt.outcome, 'run-ended');
    assert.equal(attempt.livesLost, 1);
    assert.equal(attempt.killer, 'lance', 'the Sentinel lance took the life');
    assert.equal(attempt.hits.at(-1).lifeLost, true);
});

test('the log keeps the latest attempts, reloads and clears', () => {
    const storage = memory();
    const log = new FightLog(storage, { now: () => '2026-11-02T00:00:00.000Z' });
    log.enabled = true;
    for (let i = 0; i < FIGHT_LOG_LIMIT + 5; i++) {
        log.attempts.push({ boss: 'sentinel', n: i });
    }
    log.attempts.splice(0, log.attempts.length - FIGHT_LOG_LIMIT);
    log.current = null;
    storage.setItem(FIGHT_LOG_KEY, JSON.stringify({ version: 1, attempts: log.attempts }));
    const reloaded = new FightLog(storage);
    assert.equal(reloaded.count, FIGHT_LOG_LIMIT);
    assert.equal(reloaded.attempts.at(-1).n, FIGHT_LOG_LIMIT + 4);
    reloaded.clear();
    assert.equal(reloaded.count, 0);
    assert.equal(storage.getItem(FIGHT_LOG_KEY), null);
    assert.equal(new FightLog({ getItem: () => '{broken' }).count, 0, 'a damaged log starts empty');
});
