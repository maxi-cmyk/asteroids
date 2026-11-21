// The Ringwarden (P4.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    ENTRANCE,
    HAZARD,
    KINDS,
    PART,
    SHOT,
    bossHazards,
    bossPart,
    bossParts,
    bossShots,
    bossState,
    newGame,
    practiceGame,
    set,
    shieldDrops,
    shoot,
    ticks,
    until,
    waveGame,
} from './harness.mjs';

test('the Ringwarden: blades absorb shots and break, the core only takes what gets through', async () => {
    const game = await practiceGame(1);
    ticks(game, ENTRANCE);
    // The frontmost outer blade: nothing else stands between it and the pilot (the ring moves).
    const blade = bossParts(game.scene())
        .filter((p) => p.kind === PART.blade && p.slot < 16)
        .sort((a, b) => a.x - b.x)[0];
    const hp = bossState(game.scene()).health;
    shoot(game, blade, 1);
    assert.equal(bossPart(game.scene(), blade.index).exists, false);
    assert.equal(bossState(game.scene()).health, hp);
    ticks(game, 50 * 6.5);
    assert.equal(
        bossPart(game.scene(), blade.index).exists,
        true,
        'blades regrow after six seconds',
    );
});

test('the Ringwarden: each ring has a gap, and the gaps meet in an eclipse (P4.2)', async () => {
    const game = await practiceGame(1, 0, 11);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    const A = KINDS[1].aux;
    const slots = bossParts(game.scene())
        .filter((p) => p.kind === PART.blade)
        .map((p) => p.slot);
    for (const gap of [0, 1, 2, 16, 17]) assert(!slots.includes(gap), `slot ${gap} is a gap`);
    assert.equal(slots.length, 22);
    // Over one 14 s clock the lane into the core is clear some of the time, not most of it.
    let clear = 0;
    for (let i = 0; i < 14000 / 18; i++) {
        game.step({});
        clear += bossState(game.scene()).aux[A.eclipse];
    }
    const share = clear / (14000 / 18);
    assert(
        share > 0.05 && share < 0.6,
        `the lane is clear ${Math.round(share * 100)}% of the time`,
    );
    // In an eclipse a shot from outside both rings reaches the core.
    until(game, (state) => state.aux[A.eclipse] === 1 && state.attack === 0, 2000);
    const boss = bossState(game.scene());
    const hp = boss.health;
    shoot(game, { x: boss.x, y: boss.y }, 2, { from: 200 });
    assert(bossState(game.scene()).health < hp, 'a shot down the clear lane hurts');
});

test('the Ringwarden: whole blades split the prism beam into shards (P4.2)', async () => {
    const game = await newGame(11);
    game.start(true);
    game.api.web_boss_practice(1, 0, 2);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    until(game, (state) => state.attack === ATTACK.prism && state.attackMs > 40, 4000);
    const shards = () => bossShots(game.scene()).filter((s) => s.family === SHOT.shard).length;
    assert.equal(shards(), 0, 'no shards before the beam goes live');
    let most = 0;
    until(game, (state) => {
        most = Math.max(most, shards());
        return state.attack !== ATTACK.prism;
    });
    assert(most >= 4, `the beam split on blades (${most} shards)`);
});

test('the Ringwarden: the halo lock throws the outer ring to the edge and back, one 80 px gap (P4.2)', async () => {
    const game = await newGame(11);
    game.start(true);
    game.api.web_boss_practice(1, 0, 2);
    set(game, 5, 1e9);
    ticks(game, ENTRANCE);
    until(game, (state) => state.attack === ATTACK.halo && state.attackMs > 40, 6000);
    const ring = () => bossHazards(game.scene()).find((h) => h.kind === HAZARD.ring);
    assert(ring().warn > 0, 'it is warned first');
    until(game, (state) => state.attackMs > 900 + 1000 + 200);
    const out = ring(),
        boss = bossState(game.scene());
    assert(out.b > 300, `the ring reaches the edge (r ${Math.round(out.b)})`);
    assert(Math.abs(out.b * out.c - 40) < 1, 'the gap stays 80 px wide');
    const far = Math.max(
        ...bossParts(game.scene())
            .filter((p) => p.kind === PART.blade && p.slot < 16)
            .map((p) => Math.hypot(p.x - boss.x, p.y - boss.y)),
    );
    assert(far > 280, 'the outer blades ride out with it');
    until(game, (state) => state.attack !== ATTACK.halo, 400);
    ticks(game, 2);
    assert(!ring(), 'the ring is gone');
    const back = Math.max(
        ...bossParts(game.scene())
            .filter((p) => p.kind === PART.blade && p.slot < 16)
            .map((p) =>
                Math.hypot(p.x - bossState(game.scene()).x, p.y - bossState(game.scene()).y),
            ),
    );
    assert(back < 115, 'the outer ring is home again');
});

test('Ringwarden alone drops a shield every 7 seconds', async () => {
    const ringwarden = await waveGame(10);
    const drops = shieldDrops(ringwarden, 36);
    assert(drops.length >= 4, `drops: ${drops}`);
    drops.slice(1).forEach((t, i) => assert(Math.abs(t - drops[i] - 7) < 0.1, `gap ${drops}`));
    // The first fight of the run (Sentinel) and the later bosses keep their phase-based drops.
    for (const wave of [5, 15, 20]) {
        const other = await waveGame(wave);
        assert.equal(shieldDrops(other, 22).length, 0, `wave ${wave} drops nothing in phase 1`);
    }
});
