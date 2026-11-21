// Rules every boss fight shares: waves and tiers, the entrance, damage and the laser, lives and payouts, pickups, practice, assists, fairness promises, shootable projectiles and movement.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    BossBot,
    ENTRANCE,
    HAZARD,
    HEALTH,
    K,
    KINDS,
    S,
    SHOT,
    bend,
    body,
    bossHazards,
    bossShots,
    bossState,
    defeat,
    newGame,
    practiceGame,
    set,
    shoot,
    stats,
    ticks,
    until,
    waveGame,
} from './harness.mjs';

test('every wave fight maps to its boss, its health and its tier', async () => {
    const base = (wave) => 18 + 6 * (Math.min(10, wave / 5) - 1);
    for (const [wave, kind] of [
        [5, 0],
        [10, 1],
        [15, 2],
        [20, 3],
        [25, 4],
        [30, 5],
        [35, 0],
        [60, 5],
        [65, 0],
    ]) {
        const tier = Math.floor((wave / 5 - 1) / 6);
        for (const players of [1, 2]) {
            const game = await waveGame(wave, players);
            const state = bossState(game.scene());
            assert.equal(state.kind, kind, `wave ${wave}`);
            assert.equal(state.tier, tier);
            assert.equal(state.mini, false);
            const designed = tier >= 1 ? Math.floor((base(wave) * 12) / 10) : base(wave);
            assert.equal(state.maximum, designed * K[kind] * players, `wave ${wave} x${players}`);
        }
    }
    for (const [wave, kind] of [
        [3, 6],
        [8, 7],
        [13, 8],
        [18, 9],
        [23, 10],
        [28, 11],
        [33, 6],
    ]) {
        const game = await waveGame(wave);
        const state = bossState(game.scene());
        assert.equal(state.kind, kind, `mini wave ${wave}`);
        assert.equal(state.mini, true);
        const region = kind - 6,
            tier = Math.floor((wave - 3) / 5 / 6),
            designed = (6 + 2 * region) * (tier >= 1 ? 12 / 10 : 1);
        assert.equal(state.maximum, Math.floor(designed) * K[kind]);
    }
});

test('the entrance is harmless for 1.4 s and then the body hurts', async () => {
    const game = await waveGame(5);
    set(game, 3, 330);
    set(game, 4, 135);
    set(game, 5, 0);
    ticks(game, 60);
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(stats(game).entranceHits, 0);
    assert(bossState(game.scene()).entrance < 1);
    // Shots pass through an unfinished entrance without scratching it.
    const hp = bossState(game.scene()).health;
    ticks(game, 5, { aimX: 1, firePressed: true });
    assert.equal(bossState(game.scene()).health, hp);
    ticks(game, 20);
    assert.equal(game.state, 'death');
});

test('the laser is one 8-point hit on an open boss and cannot repeat on a hold', async () => {
    const game = await waveGame(5);
    set(game, 3, 100);
    set(game, 4, 135);
    for (let i = 0; i < 76; i++) {
        const scene = game.scene(),
            dx = 366 - scene[S.SHIP_X],
            dy = 135 - scene[S.SHIP_Y],
            length = Math.hypot(dx, dy);
        game.step({ y: 0, laser: true, aimX: dx / length, aimY: dy / length });
    }
    assert.equal(game.state, 'playing');
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(bossState(game.scene()).health, 54 - 8 * K[0]);
    assert.equal(game.stats().laserShots, 1);
    ticks(game, 15, { laser: true, aimX: 1 });
    assert.equal(bossState(game.scene()).health, 54 - 8 * K[0]);
});

test('dying never resets the boss; threats are cleared and the ship returns protected', async () => {
    const game = await waveGame(5);
    ticks(game, ENTRANCE + 50);
    const hp = bossState(game.scene()).health,
        wave = bossState(game.scene()).wave;
    set(game, 1, hp - 5); // a wounded boss
    const wounded = bossState(game.scene()).health;
    set(game, 5, 0);
    game.api.web_test_overlap();
    ticks(game, 3);
    assert.equal(game.state, 'death');
    assert.equal(bossShots(game.scene()).length, 0);
    assert(bossHazards(game.scene()).every((h) => h.kind > HAZARD.arm));
    until(game, (_, scene) => scene[S.STATE] === 2 && scene[S.SHIP_ALIVE] === 1, 400);
    const back = bossState(game.scene());
    assert(back.active);
    assert.equal(back.health, wounded);
    assert.equal(back.wave, wave);
    assert(game.scene()[S.INVINCIBLE_MS] > 0, 'respawn protection');
});

test('a flawless fight pays 50% more, losing a life pays the base', async () => {
    for (const flawless of [true, false]) {
        const game = await waveGame(5, 1, 1);
        ticks(game, ENTRANCE);
        set(game, 5, flawless ? 1e6 : 0);
        if (!flawless) {
            set(game, 5, 0);
            game.api.web_test_overlap();
            ticks(game, 3);
            until(game, (_, s) => s[0] === 2 && s[6] === 1, 400);
        }
        const before = game.scene()[S.SCORE];
        until(game, (state) => state.attack === 0 && state.gate > 0.9, 800);
        const s = bossState(game.scene());
        shoot(game, { x: s.x, y: s.y }, 3);
        ticks(game, 40);
        assert.equal(bossState(game.scene()).active, false);
        assert.equal(game.scene()[S.BOSS_KILLS], 1);
        assert.equal(game.scene()[S.SCORE] - before, flawless ? 2625 : 1750);
        assert.equal(game.scene()[S.RUN_DESTROYED], 0, 'boss kills never count as asteroids');
        assert.equal(game.scene()[S.WAVE], 5);
        ticks(game, 20);
        assert.equal(game.scene()[S.WAVE], 5);
        // The overlap rock the unflawless run spawned sits still forever, so only check clean runs.
        if (flawless) {
            ticks(game, 700);
            assert(game.scene()[S.WAVE] >= 6);
        }
    }
});

test('a mini-boss shares its wave with half the rocks and holds the wave open', async () => {
    const game = await waveGame(3);
    assert.equal(bossState(game.scene()).mini, true);
    ticks(game, 50 * 30); // rocks all gone, wave must wait
    assert.equal(game.scene()[S.WAVE], 3);
    assert(bossState(game.scene()).active);
    const hp = 1;
    set(game, 1, hp);
    until(game, (state) => state.attack === 0 && state.gate > 0.9, 800);
    const s = bossState(game.scene());
    shoot(game, { x: s.x, y: s.y }, 3);
    ticks(game, 10);
    assert.equal(bossState(game.scene()).active, false);
    ticks(game, 300);
    assert(game.scene()[S.WAVE] >= 4, 'the wave moves on once the mini is down');
    assert.equal(bossState(game.scene()).defeated & (1 << 6), 1 << 6);
});

test('every boss leaves exactly one health pickup, and flying through it restores a life', async () => {
    const game = await waveGame(5);
    const drop = defeat(game);
    assert.equal(drop?.kind, HEALTH);
    const lives = game.scene()[S.LIVES];
    set(game, 3, drop.x);
    set(game, 4, drop.y);
    ticks(game, 3);
    assert.equal(game.scene()[S.PICKUP_ACTIVE], 0);
    assert.equal(game.scene()[S.LIVES], lives + 1);
});

test('a mini-boss leaves a health pickup about half the time', async () => {
    let drops = 0;
    const runs = 24;
    for (let seed = 1; seed <= runs; seed++) {
        const game = await waveGame(3, 1, 0, seed);
        if (defeat(game)?.kind === HEALTH) drops++;
    }
    assert(drops > 3 && drops < runs - 3, `${drops} of ${runs} mini-bosses dropped health`);
});

test('boss practice drops no health', async () => {
    const game = await practiceGame(0);
    assert.equal(defeat(game), null);
});

test('practice and a fresh retry do not inherit a previous boss', async () => {
    const game = await waveGame(5);
    game.start(true);
    ticks(game, 100);
    assert.equal(game.scene()[S.BOSS_ACTIVE], 0);
    assert.equal(game.scene()[S.BOSS_KILLS], 0);
    game.start();
    ticks(game, 80);
    assert.equal(game.scene()[S.BOSS_ACTIVE], 0);
});

test('boss practice never costs a life and reports hits taken', async () => {
    const game = await practiceGame(2);
    ticks(game, ENTRANCE);
    set(game, 3, 300);
    set(game, 4, 135);
    set(game, 5, 0);
    ticks(game, 60);
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(game.state, 'playing');
    assert(stats(game).hitsTaken > 0);
    assert.equal(bossState(game.scene()).practice, true);
});

test('multishot plus 2x fire keeps per-projectile accounting while damaging the boss', async () => {
    const game = await waveGame(5);
    ticks(game, ENTRANCE);
    until(game, (state) => state.attack === 0 && state.gate > 0.9, 800);
    game.api.web_test_pickup(0);
    game.step();
    game.api.web_test_pickup(2);
    game.step();
    set(game, 3, 100);
    set(game, 4, 135);
    game.step({ firePressed: true, aimX: 1 });
    ticks(game, 5);
    ticks(game, 50, { y: 0 });
    assert.equal(game.stats().spawned, 6);
    assert(game.stats().hits >= 1);
    assert(game.stats().hits <= 6);
    assert(bossState(game.scene()).health < 54);
    assert.equal(game.scene()[S.BOSS_KILLS], 0);
});

test('stored shield absorbs a boss lance and holds cannot cause repeated life loss', async () => {
    const game = await waveGame(5);
    set(game, 5, 0);
    game.api.web_test_pickup(1);
    game.step({ shield: true });
    set(game, 3, 150);
    set(game, 4, 135);
    ticks(game, 175);
    assert.equal(game.scene()[S.LIVES], 3);
    assert.equal(game.scene()[S.SHIELD], 0, 'the shield took the lance');
});

test('assists lengthen telegraphs by 30% and calm the lens bend', async () => {
    const lance = async (long) => {
        const game = await waveGame(5);
        game.api.web_boss_assist(long, 0);
        until(game, (state) => bossHazards(game.scene()).some((h) => h.kind === HAZARD.lane), 600);
        return bossHazards(game.scene()).find((h) => h.kind === HAZARD.lane).warnTotal;
    };
    assert.equal(await lance(0), 900);
    assert.equal(await lance(1), 1170);
});

test('boss pickups arrive once per phase boundary', async () => {
    const game = await waveGame(15); // Cinderforge: three phases (Ringwarden has timed shields)
    ticks(game, ENTRANCE);
    const max = bossState(game.scene()).maximum;
    set(game, 0, Math.ceil(max * 0.4)); // below 66%
    ticks(game, 2);
    assert.equal(game.scene()[S.PICKUP_ACTIVE], 1);
    assert.equal(game.scene()[S.PICKUP_KIND], 1);
    assert.equal(bossState(game.scene()).stage, 2);
});

test('every fight keeps its promises: warnings, caps, corridor, entrance, body room', async () => {
    for (const kind of KINDS.keys()) {
        for (const tier of [0, 1, 2]) {
            const game = await practiceGame(kind, tier, 100 + kind);
            const bot = new BossBot(game);
            let steps = 0,
                minLeft = 999,
                lungeLeft = 999;
            for (; steps < 150 * 50; steps++) {
                bot.step();
                const scene = game.scene();
                if (!scene[S.BOSS_ACTIVE] && steps > 100) break;
                // The Zodiarch's lunge (P3.2) is the one strike past x = 216, down a warned
                // lane that never reaches past x = 120 at the snout.
                const lunging = kind === 5 && bossState(scene).attack === ATTACK.lunge;
                // The Bastion's ramming run (P4.4) crosses the whole field, but only down the
                // lane it marked for 1.2 s first (the lane hazard keeps it honest).
                if (kind === 3 && bossState(scene).attack === ATTACK.ram) continue;
                if (scene[S.BOSS_STAGE] > 0 && (steps % 25 === 0 || lunging))
                    for (const [i, c] of body(game).entries()) {
                        // The Zodiarch's thrown creatures are projectiles, not its body (head,
                        // snout and 26 segments come first).
                        if (kind === 5 && i >= 28) continue;
                        // The Sentinel's thrown plates (P4.1) fly out as boomerangs: also
                        // projectiles, warned by their drawn loops (the shell comes first).
                        if (kind === 0 && i >= 1) continue;
                        if (lunging) lungeLeft = Math.min(lungeLeft, c.x - c.r);
                        else minLeft = Math.min(minLeft, c.x - c.r);
                    }
            }
            const s = stats(game),
                name = `${KINDS[kind].name} tier ${tier}`;
            assert.equal(s.violations, 0, `${name}: lethal hazard without its warning`);
            assert(s.maxShots <= 48, `${name}: ${s.maxShots} shots`);
            assert(s.maxHazards <= 6, `${name}: ${s.maxHazards} hazards`);
            assert.equal(s.entranceHits, 0, `${name}: entrance`);
            assert(s.corridor >= 42, `${name}: corridor ${s.corridor}`);
            assert(minLeft >= 216 - 1, `${name}: body reaches x=${minLeft}`);
            assert(lungeLeft >= 120 - 1, `${name}: lunge reaches x=${lungeLeft}`);
            assert.equal(bossState(game.scene()).active, false, `${name}: not beaten in 150 s`);
        }
    }
});

test('tiers shorten rests and tier II adds a frenzy phase', async () => {
    const game = await practiceGame(1, 2);
    ticks(game, ENTRANCE);
    const max = bossState(game.scene()).maximum;
    assert.equal(max, Math.floor((24 * 12) / 10) * K[1]);
    set(game, 0, Math.floor(max * 0.1));
    ticks(game, 2);
    assert.equal(bossState(game.scene()).stage, 4, 'a fourth phase at 15% health');
});

test('shootable projectiles: missiles take two shots, lobs split into embers and cancel their pool', async () => {
    const gunnery = await practiceGame(9);
    until(
        gunnery,
        () => bossShots(gunnery.scene()).some((s) => s.family === SHOT.missile),
        900,
        () => ({ x: 2048, y: 2048 }),
    );
    const missile = bossShots(gunnery.scene()).find((s) => s.family === SHOT.missile);
    shoot(gunnery, missile, 1, { from: 30 });
    assert.equal(
        bossShots(gunnery.scene()).some((s) => s.family === SHOT.missile && s.hp === 1),
        true,
        'two hit points',
    );
    shoot(
        gunnery,
        bossShots(gunnery.scene()).find((s) => s.family === SHOT.missile),
        1,
        { from: 30 },
    );
    assert.equal(
        bossShots(gunnery.scene()).some((s) => s.family === SHOT.missile),
        false,
    );
    const ling = await practiceGame(8);
    until(
        ling,
        () => bossShots(ling.scene()).some((s) => s.family === SHOT.lob),
        900,
        () => ({ x: 2048, y: 2048 }),
    );
    assert.equal(
        bossHazards(ling.scene()).filter((h) => h.kind === HAZARD.pool).length,
        1,
        'the landing marker is up',
    );
    const lob = bossShots(ling.scene()).find((s) => s.family === SHOT.lob);
    shoot(ling, lob, 1, { from: 30 });
    assert.equal(
        bossShots(ling.scene()).filter((s) => s.family === SHOT.ember).length >= 3,
        true,
        'three slow embers',
    );
    assert.equal(
        bossHazards(ling.scene()).filter((h) => h.kind === HAZARD.pool).length,
        0,
        'the pool is cancelled',
    );
});

test('boss practice can start in a later phase, frenzy included', async () => {
    const game = await newGame();
    game.start(true);
    game.api.web_boss_practice(1, 0, 3);
    ticks(game, ENTRANCE);
    assert.equal(bossState(game.scene()).stage, 3);
    const max = bossState(game.scene()).maximum;
    assert(bossState(game.scene()).health <= Math.floor(max * 0.33) + 1);
    const frenzy = await newGame();
    frenzy.start(true);
    frenzy.api.web_boss_practice(2, 2, 4);
    ticks(frenzy, ENTRANCE);
    assert.equal(bossState(frenzy.scene()).stage, 4);
});

test('every boss moves: its rest point follows the pilot between attacks', async () => {
    for (const kind of KINDS.keys()) {
        if (kind === 7) continue; // the Shardling already kites on its own
        const game = await practiceGame(kind, 0, 300 + kind);
        ticks(game, ENTRANCE);
        set(game, 5, 1e9); // untouchable: this test is about the boss, not the pilot
        let low = 999,
            high = -999,
            left = 999,
            right = -999;
        for (let i = 0; i < 50 * 20; i++) {
            // The pilot weaves between the top and bottom of the field, in front of the boss.
            set(game, 3, 60);
            set(game, 4, i % 500 < 250 ? 50 : 220);
            game.step();
            const s = game.scene();
            if (!s[S.BOSS_ACTIVE]) break;
            low = Math.min(low, s[S.BOSS_Y]);
            high = Math.max(high, s[S.BOSS_Y]);
            left = Math.min(left, s[S.BOSS_X]);
            right = Math.max(right, s[S.BOSS_X]);
        }
        const name = KINDS[kind].name;
        assert(high - low >= 30, `${name}: moved only ${high - low} px vertically`);
        // The Sentinel slides on a vertical rail (P4.1).
        if (kind !== 0)
            assert(right - left >= 5, `${name}: moved only ${right - left} px sideways`);
    }
});

test('parking behind or beside a boss sets off a warned repel ring', async () => {
    for (const kind of KINDS.keys()) {
        const game = await practiceGame(kind, 0, 400 + kind);
        ticks(game, ENTRANCE);
        set(game, 5, 0); // vulnerable
        let hit = false;
        // Some bodies (the Ringwarden's blades) touch a parked pilot first; keep parking until
        // the repel has gone out too.
        for (let i = 0; i < 50 * 6 && !(hit && stats(game).repels >= 1); i++) {
            const s = game.scene();
            set(game, 3, Math.min(460, s[S.BOSS_X] + 70));
            set(game, 4, s[S.BOSS_Y] + (kind % 2 ? 60 : -60));
            game.step();
            hit = stats(game).hitsTaken > 0;
        }
        const s = stats(game),
            name = KINDS[kind].name;
        assert(s.repels >= 1, `${name}: no repel`);
        assert(hit, `${name}: a pilot parked behind it was never touched`);
        assert.equal(s.violations, 0, `${name}: the repel went live without its warning`);
    }
});
