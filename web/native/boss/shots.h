#pragma once
// Hostile shots: bursts, shootable shot endings and the per-tick update.

// ---------------------------------------------------------------- shots
static void bs_burst(float x, float y, int n, float speed, float offset = 0) {
    for (int i = 0; i < n; i++)
        bs_shot_at(SF_NEEDLE, x, y, offset + i * TWO_PI / n, speed);
}
// A fireball's life ends: five embers fan out along its heading.
static void bs_fireball_split(const BossShot& s) {
    float a = bs_atan2(s.dy, s.dx);
    for (int i = -2; i <= 2; i++) bs_shot_at(SF_EMBER, s.x, s.y, a + i * .45f, 1.3f);
}
// A nova star's life ends: `amp` sparks in a ring, leaving the one nearest `phase` out (a
// phase below -9 leaves none out); a small burst (six or fewer) dies within 700 ms.
static void bs_nova_burst(const BossShot& s) {
    unsigned n = unsigned(s.amp);
    if (!n) return;
    float step = TWO_PI / n, start = s.phase > -9 ? s.phase + step : bs_rand(0, step);
    for (unsigned k = 0; k < n; k++) {
        if (s.phase > -9 && k == n - 1) continue;   // the gap: the spark that would sit on `phase`
        bs_shot_at(SF_PELLET, s.x, s.y, start + k * step, s.turn, 0, n <= 6 ? 700 : 0);
    }
}
static void bs_ember_split(float x, float y) {
    for (int i = 0; i < 3; i++)
        bs_shot_at(SF_EMBER, x, y, BOSS_PI + (i - 1) * .55f, 1.0f);
}
// A shootable shot ends: missiles pop, mines and spores burst, a lob splits.
static void bs_shot_end(BossShot& s, bool by_player) {
    // Copy first: spawning children may reuse this very slot.
    const BossShot was = s;
    s.active = false;
    particles_spawn(was.x, was.y);
    if (was.family == SF_MINE) bs_burst(was.x, was.y, 8, 1.8f, .3f);
    else if (was.family == SF_SPORE) bs_burst(was.x, was.y, 4, 1.2f, bs_rand(0, 1.5f));
    else if (was.family == SF_LOB && by_player) {
        if (was.link >= 0) {
            // The pool never lands, but the ground it was aimed at is marked and smoulders.
            float px = boss.hz[was.link].x, py = boss.hz[was.link].y;
            boss.hz[was.link].active = false;
            bs_scorch(px, py, 13, 3000, 900);
        }
        bs_ember_split(was.x, was.y);
    }
}
static void bs_shots_update() {
    for (unsigned i = 0; i < BOSS_SHOTS; i++) {
        BossShot& s = boss.shots[i];
        if (!s.active) continue;
        unsigned long age = bs_since(s.born);
        if (s.family == SF_SINE) {
            s.bx += s.dx;
            s.by += s.dy;
            float len = bs_max(.01f, sqrtf(s.dx * s.dx + s.dy * s.dy));
            float wave = s.amp * sinf(TWO_PI * age / 700.0f + s.phase);
            s.x = s.bx - s.dy / len * wave;
            s.y = s.by + s.dx / len * wave;
        } else {
            if (s.family == SF_MISSILE) {
                float px, py;
                if (bs_nearest(s.x, s.y, px, py)) {
                    float want = bs_atan2(py - s.y, px - s.x);
                    float have = bs_atan2(s.dy, s.dx);
                    float diff = bs_clamp(bs_wrap(want - have), -s.turn, s.turn);
                    s.dx = cosf(have + diff) * 1.4f;
                    s.dy = sinf(have + diff) * 1.4f;
                }
            } else if (s.family == SF_NOVA) {
                // Flies to its spot and holds there (bx, by), easing in.
                s.dx = (s.bx - s.x) * .09f;
                s.dy = (s.by - s.y) * .09f;
            } else if ((s.family == SF_CURVE || s.family == SF_METEOR) && s.turn != 0) {
                float c = cosf(s.turn), n = sinf(s.turn);
                float nx = s.dx * c - s.dy * n, ny = s.dx * n + s.dy * c;
                s.dx = nx;
                s.dy = ny;
            }
            s.x += s.dx;
            s.y += s.dy;
        }
        if (s.life && age >= s.life) {
            if (s.family == SF_LOB) s.active = false;      // lands; the pool goes live
            else if (s.family == SF_NOVA || s.family == SF_FIREBALL) {
                const BossShot was = s;   // copy first: the burst may reuse this slot
                s.active = false;
                particles_spawn(was.x, was.y);
                if (was.family == SF_NOVA) bs_nova_burst(was);
                else bs_fireball_split(was);
            }
            else if (s.family == SF_MINE || s.family == SF_SPORE) bs_shot_end(s, false);
            else s.active = false;
            continue;
        }
        if (s.x < -14 || s.x > SCREEN_W + 14 || s.y < -14 || s.y > SCREEN_H + 14) {
            s.active = false;
            continue;
        }
        if (s.family == SF_LOB) continue; // airborne plasma is harmless
        for (unsigned p = 0; p < boss_hull_n; p++) {
            if (!bs_alive(p)) continue;
            if (ship_touches(*boss_hulls[p], s.x, s.y, bs_shot_radius(s.family))) {
                if (s.family == SF_SPORE || s.family == SF_MINE) bs_shot_end(s, false);
                else s.active = false;
                bs_hit_pilot(p);
                break;
            }
        }
    }
}
