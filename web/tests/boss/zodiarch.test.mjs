// The Zodiarch: swimming, signs, its own attacks, the pearl and the Ascendant (P1.2, P2.3, P3, R2).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ATTACK,
    BossBot,
    ENTRANCE,
    HAZARD,
    PART,
    SHOT,
    SIGN_EMIT,
    ZM,
    bend,
    body,
    bossBody,
    bossHazards,
    bossPart,
    bossParts,
    bossShots,
    bossState,
    newGame,
    phaseGame,
    practiceGame,
    set,
    shoot,
    signParts,
    stats,
    ticks,
    until,
    zodAttack,
} from './harness.mjs';

test('the Zodiarch swims: its 26 segments trail the head along its path, right of x=216', async () => {
    const game = await practiceGame(5);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    const first = bossBody(game.scene()).map((s) => [s.x, s.y]);
    assert.equal(first.length, 26);
    ticks(game, 100);
    const later = bossBody(game.scene());
    assert(Math.hypot(later[0].x - first[0][0], later[0].y - first[0][1]) > 20, 'the neck moved');
    for (const s of later) assert(s.x - s.r >= 215, `segment at x=${s.x}`);
    // Each segment sits about 13 px further back along the path than the one before.
    for (let i = 1; i < later.length; i++) {
        const gap = Math.hypot(later[i].x - later[i - 1].x, later[i].y - later[i - 1].y);
        assert(gap > 4 && gap <= 14, `gap ${gap.toFixed(1)} at ${i}`);
    }
});

test('a thrown sign forms out of the ring before anything of it is live, and breaking its key star hurts the dragon', async () => {
    const game = await practiceGame(5);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    until(game, () => signParts(game).length > 0, 400);
    const forming = signParts(game)[0];
    assert.equal(forming.state, 0, 'it starts by forming');
    assert(
        bossHazards(game.scene()).every((h) => h.kind > HAZARD.arm),
        'no lethal hazard while it forms',
    );
    until(game, () => signParts(game).some((p) => p.state === 1), 60);
    const live = signParts(game).find((p) => p.state === 1);
    const hp = bossState(game.scene()).health;
    for (let k = 0; k < live.hp; k++) set(game, 9, live.index); // three hits on its key star
    const after = bossPart(game.scene(), live.index);
    assert(!after.exists || after.state === 2, 'the creature breaks');
    assert(bossState(game.scene()).health < hp, 'and the dragon is hurt');
});

test('the Zodiarch: the pearl takes shots only while it is open', async () => {
    const game = await practiceGame(5);
    ticks(game, ENTRANCE);
    set(game, 5, 1e9);
    const pearl = () => {
        const a = bossState(game.scene()).aux;
        return { x: a[4], y: a[5] };
    };
    until(game, (state) => state.aux[1] < 0.5 && !signParts(game).length, 600);
    const hp = bossState(game.scene()).health;
    shoot(game, pearl(), 2, { from: 120 });
    assert.equal(bossState(game.scene()).health, hp, 'closed: nothing');
    until(game, (state) => state.aux[1] > 0.5, 700);
    let hit = false;
    for (let k = 0; k < 6 && !hit; k++) {
        shoot(game, pearl(), 1, { from: 90 });
        hit = bossState(game.scene()).health < hp;
    }
    assert(hit, 'open: the pearl takes damage');
});

test('every sign has its own attack, and the breath comes in phase 3', async () => {
    const seen = new Set();
    for (const phase of [1, 2, 3]) {
        const game = await phaseGame(5, phase, 40 + phase);
        for (let i = 0; i < 50 * 70 && seen.size < 13; i++) {
            game.step();
            const a = bossState(game.scene()).attack;
            if ((a >= ATTACK.aries && a <= ATTACK.pisces) || a === ATTACK.breath) seen.add(a);
        }
    }
    for (let sign = 0; sign < 12; sign++) assert(seen.has(ATTACK.aries + sign), `sign ${sign}`);
    assert(seen.has(ATTACK.breath), 'breath');
});

test("Zodiarch: every sign's first shot or wall leaves from its emitter on the creature", async () => {
    const cases = [
        [0, 'lane', ['horns'], { y: 0 }],
        [1, 'beam', ['eye']],
        [2, 'lane', ['hand', 'bHand']],
        [3, 'lane', ['clawNear', 'clawFar']],
        [4, 'ring', ['mouth']],
        [5, 'nova', ['wheat']],
        [6, 'pellet', ['panNear', 'panFar']],
        [7, 'arm', ['sting']],
        [8, 'aim', ['arrow']],
        [10, 'nova', ['urn']],
    ];
    for (const [sign, what, emitters, override = {}] of cases) {
        const game = await zodAttack(ATTACK.aries + sign);
        const old = new Set();
        let found = null;
        for (let i = 0; i < 50 * 4 && !found; i++) {
            game.step();
            const creature = bossParts(game.scene()).filter(
                (p) => p.kind === PART.sign && p.slot === sign && p.state === 1,
            );
            const items =
                what in HAZARD
                    ? bossHazards(game.scene()).filter((h) => h.kind === HAZARD[what])
                    : bossShots(game.scene()).filter((s) => s.family === SHOT[what]);
            for (const it of items) {
                if (i === 0) old.add(it.index);
                else if (!old.has(it.index) && creature.length) found = { it, creature };
            }
        }
        assert(found, `${sign}: no ${what} appeared`);
        const { it, creature } = found;
        const near = creature.some((c) =>
            emitters.some((name) => {
                const [dx, dy] = SIGN_EMIT[sign][name];
                const ex = c.x + dx,
                    ey = c.y + ('y' in override ? override.y : dy);
                return Math.hypot(it.x - ex, it.y - ey) <= (what === 'nova' ? 12 : 8); // a nova has taken its first step
            }),
        );
        assert(
            near,
            `${sign}: ${what} at ${Math.round(it.x)},${Math.round(it.y)}, creature at ${Math.round(creature[0].x)},${Math.round(creature[0].y)}`,
        );
    }
});

test('Zodiarch: Aries, Taurus and Leo charge all the way off the screen', async () => {
    for (const sign of [0, 1, 4]) {
        const game = await zodAttack(ATTACK.aries + sign);
        let least = 999,
            lane = 0;
        for (let i = 0; i < 50 * 7; i++) {
            game.step();
            const c = bossParts(game.scene()).find((p) => p.kind === PART.sign && p.slot === sign);
            if (c && c.state === 1) least = Math.min(least, c.x);
            for (const h of bossHazards(game.scene()))
                if (h.kind === HAZARD.lane && h.c >= 12) lane = Math.max(lane, h.b);
        }
        assert(least < -40, `${sign}: stopped at x ${Math.round(least)}`);
        assert(lane > 150, `${sign}: lane only ${Math.round(lane)} px`);
    }
});

test('Zodiarch: one sign out in phase 1, never more than two after, inside the caps', async () => {
    for (const [phase, limit] of [
        [1, 1],
        [2, 2],
        [3, 2],
    ]) {
        const game = await phaseGame(5, phase, 60 + phase);
        let most = 0;
        for (let i = 0; i < 50 * 60; i++) {
            game.step();
            const leads = new Set(
                bossParts(game.scene())
                    .filter((p) => p.kind === PART.sign && p.state !== 2)
                    .map((p) => p.slot),
            );
            most = Math.max(most, leads.size);
        }
        const stats = new Float32Array(game.api.memory.buffer, game.api.web_test_boss_stats(), 16);
        assert(most <= limit, `phase ${phase}: ${most} signs out`);
        if (phase > 1) assert(most >= limit, `phase ${phase}: never more than ${most} out`);
        assert.equal(stats[0], 0, 'no warning shorter than the minimum');
        assert(stats[2] <= 6, `lethal hazards ${stats[2]}`);
        assert(stats[4] >= 42, `corridor ${stats[4]}`);
    }
});

test('Zodiarch: a black hole pulls gently, swallows shots and leaves no scorch', async () => {
    const game = await zodAttack(ATTACK.blackHole, 3);
    let hole = null;
    // It settles before it throws (up to 1.6 s), then the 900 ms warning.
    for (let i = 0; i < 150 && !hole; i++) {
        game.step();
        hole = bossHazards(game.scene()).find(
            (h) => h.kind === HAZARD.pull && h.e === 1 && h.warn === 0,
        );
    }
    assert(hole, 'it opens');
    assert(hole.b <= 0.4 * 3.65625, 'full thrust escapes');
    assert(Math.hypot(hole.x - 90, hole.y - 135) > 100, 'well away from the pilot');
    const core = bossHazards(game.scene()).find((h) => h.kind === HAZARD.pool && h.e === 1);
    assert(core && core.c >= 18, 'a large core (P3.6)');
    for (let i = 0; i < 50 * 4; i++) game.step();
    assert(!bossHazards(game.scene()).some((h) => h.kind === HAZARD.burn), 'no scorch left');
});

test('Zodiarch: the coil-spit winds, settles facing the pilot and spits globs that burst in two', async () => {
    const game = await zodAttack(ATTACK.coilSpit, 1);
    let embers = 0,
        globs = 0,
        modes = new Set();
    for (let i = 0; i < 50 * 4; i++) {
        game.step();
        const shots = bossShots(game.scene());
        globs = Math.max(globs, shots.filter((s) => s.family === SHOT.fireball).length);
        embers = Math.max(embers, shots.filter((s) => s.family === SHOT.ember).length);
        modes.add(bossState(game.scene()).aux[15]);
    }
    assert(modes.has(9), 'it coils (ZM_COIL)');
    assert.equal(globs, 9, 'three streams of three globs in phase 1');
    assert(embers >= 12 && embers <= 18, `${embers} embers`);
});

test('Zodiarch: its body only ever curves, and it does not swim the same loop', async () => {
    const game = await phaseGame(5, 2, 11);
    const bot = new BossBot(game);
    ticks(game, ENTRANCE);
    let worst = 0;
    const cells = new Set(),
        trail = [];
    for (let i = 0; i < 50 * 90; i++) {
        bot.step();
        const state = bossState(game.scene());
        if (!state.active) break;
        if (i % 5) continue;
        const segs = bossBody(game.scene());
        if (state.aux[15] !== ZM.lunge)
            for (let k = 1; k + 1 < segs.length; k++)
                worst = Math.max(worst, bend(segs[k - 1], segs[k], segs[k + 1]));
        cells.add(`${Math.floor((state.x - 300) / 20)},${Math.floor((state.y - 55) / 20)}`);
        trail.push([Math.round(state.x / 8), Math.round(state.y / 8)]);
    }
    // Neighbouring segments turn at most 40 degrees (a 26 px turn at low speed plus the wave);
    // the old figure of eight folded the neck by 110 to 180.
    assert(
        worst < (40 * Math.PI) / 180,
        `sharpest bend ${Math.round((worst * 180) / Math.PI)} degrees`,
    );
    assert(cells.size >= 25, `the head visited ${cells.size} cells of the swim box`);
    // No 16 s stretch repeats the one before it (the old figure of eight did, exactly).
    const period = (16 * 50) / 5;
    let same = 0;
    for (let i = period; i < trail.length; i++)
        same += trail[i][0] === trail[i - period][0] && trail[i][1] === trail[i - period][1];
    assert(same < 0.2 * (trail.length - period), `${same} repeats`);
});

test('Zodiarch: it faces the pilot and settles before an attack from its head', async () => {
    const game = await zodAttack(ATTACK.eyes, 2);
    let beam = null;
    for (let i = 0; i < 50 * 3 && !beam; i++) {
        game.step();
        beam = bossHazards(game.scene()).find((h) => h.kind === HAZARD.beam);
    }
    assert(beam, 'the eye laser comes');
    const state = bossState(game.scene());
    assert(Math.cos(state.aux[12]) < 0, 'facing left, toward the pilot');
    assert(state.aux[13] < 0.12, 'stopped');
    const before = [state.x, state.y];
    ticks(game, 20);
    const after = bossState(game.scene());
    assert(
        Math.hypot(after.x - before[0], after.y - before[1]) < 0.5,
        'and holds still while it is warned',
    );
});

test('Zodiarch: the lunge strikes down a warned lane, then the pearl surfaces on its neck', async () => {
    const game = await zodAttack(ATTACK.lunge, 2);
    let lane = null,
        reach = 999,
        opened = false;
    for (let i = 0; i < 50 * 5; i++) {
        game.step();
        const state = bossState(game.scene());
        lane ??= bossHazards(game.scene()).find((h) => h.kind === HAZARD.lane && h.warn > 0);
        if (state.attack === ATTACK.lunge) reach = Math.min(reach, state.x);
        if (state.attack === ATTACK.lunge && state.aux[1] > 0.5 && state.aux[2] === 8)
            opened = true;
    }
    assert(lane, 'a lane is warned');
    assert(lane.warnTotal >= 900, 'for 900 ms');
    assert(reach < 216 + 72, `the head strikes out to x ${Math.round(reach)}`);
    assert(reach - 80 >= 119, 'never past x 120 at the snout');
    assert(opened, 'the pearl opens on the neck while it is stretched out');
});

test('Zodiarch: the pearl sits in its forehead; closed, its brow scales stop shots (with a spark)', async () => {
    const game = await phaseGame(5, 1, 3);
    ticks(game, ENTRANCE);
    set(game, 8, 0);
    set(game, 2, 0);
    set(game, 11, 1e9); // no attacks
    const state = bossState(game.scene());
    const h = state.aux[12],
        right = Math.cos(h) > 0,
        r = right ? h : h - Math.PI,
        lx = right ? 27 : -27;
    const bx = state.x + lx * Math.cos(r) + 17 * Math.sin(r),
        by = state.y + lx * Math.sin(r) - 17 * Math.cos(r);
    assert(Math.hypot(state.aux[4] - bx, state.aux[5] - by) < 1, 'the pearl is at the brow');
    // Wait for a closed moment, then shoot it.
    until(game, (s) => s.aux[1] < 0.5 && s.aux[14] === 0, 600);
    const hp = bossState(game.scene()).health;
    const s2 = bossState(game.scene());
    shoot(game, { x: s2.aux[4], y: s2.aux[5] }, 2);
    assert.equal(bossState(game.scene()).health, hp, 'a closed pearl is not hurt');
    const blocks = game.scene().subarray(600 + 948, 600 + 964);
    assert(
        [3, 7, 11, 15].some((i) => blocks[i] >= 0),
        'the stopped shot shows a spark',
    );
});

test('Zodiarch: its own attacks bring the pearl up where they come from, after a 600 ms tell', async () => {
    const where = [
        [ATTACK.eyes, -1],
        [ATTACK.coilSpit, 3],
        [ATTACK.lunge, 8],
        [ATTACK.novaStars, 15],
        [ATTACK.meteors, 23],
    ];
    for (const [id, section] of where) {
        const game = await zodAttack(id);
        let tell = 0,
            open = 0,
            at = null;
        for (let i = 0; i < 50 * 6; i++) {
            set(game, 11, 1e9); // nothing after this one
            game.step();
            const a = bossState(game.scene()).aux;
            if (a[14] < 0) tell++;
            if (a[14] > 0 && a[1] > 0.5) {
                open = Math.max(open, a[14]);
                at ??= { section: a[2], x: a[4], y: a[5] };
            }
        }
        assert(tell >= 25 && tell <= 32, `${id}: ${tell} ticks of tell`);
        assert(open > 0.95, `${id}: the time left starts full`);
        assert.equal(at.section, section, `${id}: surfaces at ${section}`);
        const shut = bossState(game.scene()).aux;
        assert(shut[1] < 0.5 && shut[2] === -1, `${id}: then sinks back to the forehead`);
    }
});

test('Zodiarch: with no attack of its own the pearl stays shut', async () => {
    const game = await phaseGame(5, 1, 3);
    ticks(game, ENTRANCE);
    set(game, 11, 1e9);
    for (let i = 0; i < 50 * 9; i++) {
        game.step();
        assert(bossState(game.scene()).aux[1] < 0.5);
    }
});

test('Zodiarch: a surfaced pearl is always on the screen', async () => {
    for (const id of [ATTACK.meteors, ATTACK.novaStars, ATTACK.coilSpit]) {
        const game = await zodAttack(id);
        for (let i = 0; i < 50 * 5; i++) {
            set(game, 11, 1e9);
            game.step();
            const a = bossState(game.scene()).aux;
            if (a[1] > 0.5)
                assert(
                    a[4] <= 466 && a[5] >= 14 && a[5] <= 256,
                    `${id}: pearl at ${a[4]}, ${a[5]}`,
                );
        }
    }
});

test('Zodiarch: the starfire breath only fires head on, straight out of its mouth at the pilot', async () => {
    let fired = 0;
    for (const [px, py] of [
        [90, 40],
        [90, 230],
        [200, 135],
    ]) {
        const game = await phaseGame(5, 3, 5);
        ticks(game, ENTRANCE);
        set(game, 8, 0);
        set(game, 2, 0);
        set(game, 3, px);
        set(game, 4, py);
        game.step();
        set(game, 10, ATTACK.breath);
        let lanes = [],
            heading = 0;
        for (let i = 0; i < 50 * 4 && !lanes.length; i++) {
            set(game, 3, px);
            set(game, 4, py);
            set(game, 11, 1e9);
            game.step();
            lanes = bossHazards(game.scene()).filter((h) => h.kind === HAZARD.lane);
            heading = bossState(game.scene()).aux[12];
        }
        if (!lanes.length) continue; // it could not come round: no breath at all
        fired++;
        const mid = lanes[1];
        const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
        const to = Math.atan2(py - mid.y, px - mid.x);
        assert(Math.abs(wrap(mid.a - heading)) < 0.01, 'down the line the head points');
        assert(Math.abs(wrap(mid.a - to)) < 0.35, `at the pilot (${px}, ${py})`);
    }
    assert.equal(fired, 3, 'it comes round to face the pilot each time');
});

test('Zodiarch: the Ascendant is thrown first and takes four hits; off unless the page sets it', async () => {
    const firstSign = async (ascendant) => {
        const game = await newGame(13);
        if (ascendant !== undefined) game.ascendant(ascendant);
        game.start(true);
        game.api.web_boss_practice(5, 0, 1);
        set(game, 5, 1e6);
        for (let i = 0; i < 50 * 30; i++) {
            game.step({ x: 600, y: 2048 });
            const sign = bossParts(game.scene()).find((p) => p.kind === PART.sign && p.state === 1);
            if (sign) return sign;
        }
        return null;
    };
    const plain = await firstSign();
    assert(plain, 'a sign is thrown');
    assert.equal(plain.hp, 3);
    const pick = (plain.slot + 5) % 12;
    const ascendant = await firstSign(pick);
    assert.equal(ascendant.slot, pick, 'the date sign comes first');
    assert.equal(ascendant.hp, 4, 'its key star takes one more hit');
    // While it acts, |r| - 1 is its act time in seconds (the renderer keys its motion to it).
    assert(Math.abs(ascendant.r) >= 1);
});
