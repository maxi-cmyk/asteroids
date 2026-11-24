#pragma once

static void bs_gunnery_update() {
    boss.y = boss.home_y + 20 * sinf(TWO_PI * bs_since(boss.born) / 6000.0f);
    for (unsigned k = 0; k < 2; k++) {
        float& fire = boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_FIRE_AT];
        if (fire > 0 && game_ms >= (unsigned long)fire) {
            bs_shot_at(SF_BOLT,
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_X],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_Y],
                       boss.aux[AUX_BOLTS + k * BOLT_STRIDE + BOLT_ANGLE],
                       3.0f);
            fire = 0;
        }
    }
    boss.aux[AUX_GUNNERY_FIRING] = boss.atk == MA_BOLTS ? 1.0f : 0.0f;
}
static int bs_gunnery_pick() {
    return bs_seq_pick(SEQ_GUNNERY, 1);
}
// The guns take hits of their own; the engines are where it is hurt; the hull
// turns shots away.
static void bs_bastion_circles() {
    for (unsigned i = 0; i < 5; i++) {
        const BossPart& p = boss.parts[i];
        if (p.exists && !(p.kind == PK_ENGINE && p.state)) {
            bs_circle(p.x, p.y, p.r, BC_PART, i, 3);
        }
    }
    float c = cosf(boss.aux[AUX_BASTION_ROLL]),
          s = sinf(boss.aux[AUX_BASTION_ROLL]);
    static const float hull[4][3]
            = {{-64, 0, 24}, {-24, 0, 40}, {26, 0, 60}, {86, 0, 70}};
    for (const auto& h : hull) {
        bs_circle(boss.x + h[0] * c, boss.y + h[0] * s, h[2], BC_BLOCK, 0, 1);
    }
}
static void bs_gunnery_circles() {
    bs_circle(boss.x + 68, boss.y, 15, BC_CORE, 0, 3);
}
static unsigned bs_bastion_body(float *out) {
    unsigned n = 0;
    float x = boss.x, y = boss.y;
    bs_guard_body(out, n, x - 64, y, 24);
    bs_guard_body(out, n, x - 24, y, 40);
    bs_guard_body(out, n, x + 26, y, 60);
    bs_guard_body(out, n, x + 86, y, 70);
    return n;
}
static unsigned bs_gunnery_body(float *out) {
    unsigned n = 0;
    float x = boss.x, y = boss.y;
    // Fitted to the light-cruiser hull (half-height ~14 at -70, ~24 at -30, ~37
    // at +20; the rear circle stays inside the hull between the two nacelles).
    bs_guard_body(out, n, x - 70, y, 12);
    bs_guard_body(out, n, x - 30, y, 24);
    bs_guard_body(out, n, x + 20, y, 36);
    bs_guard_body(out, n, x + 70, y, 36);
    return n;
}
// At half health it loses the engine that took more hits: it smokes, has no
// trail, and can no longer be hurt there. The guns come back too.
static void bs_bastion_phase(unsigned phase) {
    if (phase >= 2) {
        bs_bastion_revive(7);
        boss.stamp[STAMP_BASTION_GUNLESS_SINCE] = 0;
        BossPart& top = boss.parts[BASTION_ENGINE0];
        BossPart& bottom = boss.parts[BASTION_ENGINE0 + 1];
        BossPart& lost = top.hp >= bottom.hp ? top : bottom;
        if (!top.state && !bottom.state) {
            lost.state = 1;
            bs_particles(lost.x, lost.y);
            display_shake(2);
        }
    }
}
static void
bs_bastion_hit(BossPart& p, unsigned owner, unsigned damage, bool laser) {
    if (p.kind == PK_ENGINE) {
        // Its weak point: double while it thrusts hard.
        unsigned d = laser ? damage * bs_ops().k : damage;
        if (!laser && boss.aux[AUX_BASTION_THRUST] >= .8f) {
            d *= 2;
        }
        p.hp = p.hp < 120 ? p.hp + 1 : p.hp;
        bs_core_damage(owner, d, laser);
        return;
    }
    p.hp = damage >= (unsigned)p.hp ? 0 : p.hp - damage;
    if (p.hp <= 0) {
        p.exists = false;
        bs_particles(p.x, p.y);
        display_shake(1);
        sound_play(SFX_ASTEROID_SMALL);
    }
}
