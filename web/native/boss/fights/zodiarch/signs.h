#pragma once
// The twelve signs: dispatch to each sign's attack, and the per-tick life of
// every thrown creature (forming out of the ring, acting, fading).
#include "signs-spring.h"
#include "signs-summer.h"
#include "signs-autumn.h"
#include "signs-winter.h"

// One creature's attack, `t` ms after it finished forming. Returns true when it
// is done.
static bool (*const SIGN_ACT[12])(BossPart&, unsigned long)
        = {bs_act_aries,
           bs_act_taurus,
           bs_act_gemini,
           bs_act_cancer,
           bs_act_leo,
           bs_act_virgo,
           bs_act_libra,
           bs_act_scorpio,
           bs_act_sagittarius,
           bs_act_capricorn,
           bs_act_aquarius,
           bs_act_pisces};
static bool bs_sign_act(BossPart& p, unsigned long t) {
    return p.slot < 12 ? SIGN_ACT[p.slot](p, t) : true;
}
static void bs_signs_tick() {
    for (unsigned i = 0; i < BOSS_PARTS; i++) {
        BossPart& p = boss.parts[i];
        if (!bs_sign_live(p)) {
            continue;
        }
        unsigned long t = game_ms - p.until;
        if (p.state == 2) {
            unsigned long gone = game_ms - p.fire_at,
                          fade = p.hp <= 0 ? ZOD_BREAK_FADE_MS : ZOD_FADE_MS;
            p.r = 1 - bs_min(1, gone / float(fade));
            if (gone >= fade) {
                p.exists = false;
                bool still = false;
                for (const BossPart& q : boss.parts) {
                    still |= bs_sign_live(q) && q.slot == p.slot;
                }
                if (!still) {
                    bs_out_bit(p.slot, false);
                }
            }
            continue;
        }
        if (t < ZOD_FORM_MS) { // re-forming out of the ring: the warning
            // The creature stands where it lands; the renderer draws its
            // constellation's flight from the ring by `r` (0..1 over the 900
            // ms; nextSteps.md P3.4).
            p.state = 0;
            p.r = t / float(ZOD_FORM_MS);
            p.x = p.u;
            p.y = p.v;
            continue;
        }
        if (p.state == 0) {
            p.state = 1;
            p.r = 1;
            p.x = p.u;
            p.y = p.v;
        }
        if (p.slot == SG_GEMINI || p.slot == SG_PISCES) {
            if (!p.lead) {
                continue; // the lead one runs the pair
            }
        }
        if (bs_sign_act(p, t - ZOD_FORM_MS)) {
            bs_drop_hazard(p.hz0);
            bs_drop_hazard(p.hz1);
            bs_sign_dissolve(p);
        }
    }
}
