// Each Zodiarch creature's own life while it acts (nextSteps.md R2, the P2.2 table): its
// hold (idle), its tell before each attack and its recoil after, as small part-free motion of
// the one strike frame (a lean about its feet, a lift, a squash, a shuffle) plus touches drawn
// at its emitters: glows that kindle, dust, snorts, drips and spray. Keyed by the engine's act
// time (ms since it formed: |part.r| - 1 seconds, see signs.h) and windows taken from each
// sign's attack in native/boss/fights/zodiarch/signs-*.h. The hit circles do not move: the
// motion stays within a few pixels, and the key star is drawn where the engine has it.
import { SIGN_EMIT } from '../scene.mjs';

// Each sign's emitters in the engine's order (E_* in data.h).
const EMIT = SIGN_EMIT.map((points) => Object.values(points));

const clamp = (u) => Math.max(0, Math.min(1, u));
const ease = (u) => u * u * (3 - 2 * u);
// 0..1 rising from a to b (eased).
const rise = (t, a, b) => ease(clamp((t - a) / (b - a)));
// A bump: 0 -> 1 -> 0 between a and b.
const bump = (t, a, b) => (t < a || t > b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));
// Held from a (eased in over `ramp`) until b (eased out over `ramp`).
const hold = (t, a, b, ramp = 150) => rise(t, a, a + ramp) * (1 - rise(t, b - ramp, b));
// A short decaying wobble after `at`.
const ring = (t, at, ms = 500, hz = 10) =>
    t < at || t > at + ms
        ? 0
        : Math.sin(((t - at) / 1000) * hz * Math.PI * 2) * (1 - (t - at) / ms);

const FEET = [0, 34]; // the pivot for leans: roughly where a figure stands

// The pose change for sign `sign` at act time `t` (ms), render `time` (ms) and whether it is
// the second of a pair. Returns { dx, dy, rot, sx, sy, pivot, glows: [[emit, 0..1]], fx: [] }.
export function creatureMotion(sign, t, time, second = false) {
    const m = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, pivot: FEET, glows: [], fx: [] };
    const beat = (ms, phase = 0) => Math.sin((time / ms) * Math.PI * 2 + phase + sign);
    switch (sign) {
        case 0: {
            // Aries: paws the ground, head dips; the tell lowers the head, horns glow.
            const tell = hold(t, 0, 900, 250);
            m.pivot = EMIT[0][1];
            m.rot = -0.03 * Math.max(0, beat(900)) * (1 - tell) - 0.12 * tell;
            m.glows.push([0, tell]);
            if (t < 900 && Math.floor(time / 380) % 2) m.fx.push(['dust', 1, time % 380]);
            break;
        }
        case 1: {
            // Taurus: snorts, tail flicks; Aldebaran kindles before the beam, the head tosses
            // after it, a hoof scrapes before the stampede.
            m.rot = 0.015 * beat(700) + 0.1 * bump(t, 1500, 1800);
            m.glows.push([0, hold(t, 0, 1500, 300)]);
            const snort = time % 1700;
            if (t < 1500 && snort < 500) m.fx.push(['puff', 1, snort]);
            if (t >= 1800 && t < 2400) {
                m.dx = 2 * Math.max(0, Math.sin((t - 1800) / 60));
                if (Math.floor(t / 120) % 2) m.fx.push(['dust', 1, t % 240]);
            }
            if (t >= 2400) m.rot -= 0.08;
            break;
        }
        case 2: {
            // Gemini: the twins sway out of step; hands rise with light in the palms, arms
            // kick back after each round.
            m.dx = 1.5 * beat(800, second ? Math.PI : 0);
            const tell = hold(t, 0, 900) + hold(t, 1700, 2600);
            m.dy = -2 * tell;
            m.dx += 3 * (bump(t, 900, 1150) + bump(t, 2600, 2850));
            m.glows.push([0, tell]);
            break;
        }
        case 3: {
            // Cancer: claws open and close, legs shuffle; claws rear up, then snap shut.
            const tell = hold(t, 0, 900, 200);
            m.dx = 1.5 * Math.round(beat(500)) * (1 - tell);
            m.pivot = [0, 20];
            m.sx = 1 + 0.03 * beat(450) * (1 - tell) - 0.05 * bump(t, 900, 1100);
            m.dy = -3 * tell;
            m.rot = -0.06 * tell;
            m.glows.push([0, tell], [1, tell]);
            break;
        }
        case 4: {
            // Leo: the mane ripples, the tail sways; it roars (mane flares), its head tosses
            // with each sun, then it crouches to pounce.
            const roar = hold(t, 0, 900, 200);
            m.pivot = [0, 0];
            m.sx = m.sy = 1 + 0.015 * beat(600) + 0.07 * roar;
            m.rot = 0.02 * beat(1100);
            for (let k = 0; k < 3; k++) m.rot += 0.1 * bump(t, 1900 + k * 180, 2050 + k * 180);
            const crouch = hold(t, 2400, 2750, 120);
            m.sy -= 0.07 * crouch;
            m.dy += 4 * crouch;
            m.glows.push([2, roar], [1, hold(t, 1300, 1900)]);
            break;
        }
        case 5: {
            // Virgo: the wheat ear sways, robe stars drift; her hand draws back, then follows
            // through each throw.
            const draw = hold(t, 0, 900) + hold(t, 900, 1800) * 0.6;
            m.rot = 0.025 * beat(1400);
            m.dx = 2 * Math.min(1, draw) - 3 * (bump(t, 900, 1150) + bump(t, 1800, 2050));
            m.glows.push([1, Math.min(1, draw)]);
            m.fx.push(['drift', 1, time]);
            break;
        }
        case 6: {
            // Libra: the pans bob; the beam tips, and swings back after each release.
            const tip = hold(t, 0, 900, 300);
            m.pivot = [0, -10];
            m.rot = 0.04 * beat(1200) * (1 - tip) + 0.12 * tip;
            for (let k = 0; k < 8; k++) m.rot += 0.05 * ring(t, 900 + k * 300, 300, 4);
            m.glows.push([0, tip], [1, tip]);
            break;
        }
        case 7: {
            // Scorpius: the tail sways, the stinger twitches; the tail cocks with venom at the
            // tip, and the body lurches after the shot.
            const cock = hold(t, 0, 900) + hold(t, 1700, 2400);
            m.rot = 0.025 * beat(900) - 0.08 * cock;
            m.dx = 4 * bump(t, 2400, 2700);
            m.glows.push([0, Math.max(cock, Math.floor(time / 300) % 4 === 0 ? 0.4 : 0)]);
            break;
        }
        case 8: {
            // Sagittarius: the horse body paces on the spot; the bow draws with the arrowhead
            // lit, and the bow arm rebounds with each arrow.
            const drawn = hold(t, 0, 900, 300);
            m.dy = Math.round(beat(350)) * (1 - drawn);
            m.dx = 2 * drawn;
            for (let v = 0; v < 4; v++) m.dx -= 2 * bump(t, 900 + v * 140, 1040 + v * 140);
            m.glows.push([0, drawn]);
            break;
        }
        case 9: {
            // Capricornus: the fish tail sweeps, a slow rise and fall; it dives nose first and
            // leaps up through the spray.
            m.rot = 0.04 * beat(1300) - 0.22 * hold(t, 0, 600, 200) + 0.2 * bump(t, 1000, 1500);
            m.dy = 2 * beat(1800);
            if (t >= 1000 && t < 1500) m.fx.push(['spray', 1, t - 1000]);
            break;
        }
        case 10: {
            // Aquarius: water drips from the urn's lip; the urn tips, then rights itself.
            const tip = hold(t, 0, 1400, 300);
            m.pivot = [0, 10];
            m.rot = -0.12 * tip + 0.04 * ring(t, 1400, 600, 3);
            if (tip < 0.5) m.fx.push(['drip', 0, time % 700]);
            break;
        }
        case 11: {
            // Pisces: the fish nose about; they part, then turn and close.
            m.rot = 0.05 * beat(700, second ? 2 : 0);
            m.dy = (second ? 3 : -3) * hold(t, 0, 900) - (second ? 2 : -2) * bump(t, 2300, 2700);
            break;
        }
    }
    return m;
}

// The touches at a creature's emitters, drawn over it in field coordinates.
export function drawMotionFx(ctx, glow, x, y, sign, m, rgb) {
    const emit = (k) => [x + m.dx + EMIT[sign][k][0], y + m.dy + EMIT[sign][k][1]];
    for (const [k, u] of m.glows)
        if (u > 0.02) {
            const [ex, ey] = emit(k);
            glow(ctx, ex, ey, 5 + 9 * u, rgb, 0.75 * u);
            ctx.fillStyle = '#ffffff';
            if (u > 0.5) ctx.fillRect(Math.round(ex), Math.round(ey), 1, 1);
        }
    for (const [kind, k, ms] of m.fx) {
        const [ex, ey] = emit(k);
        ctx.save();
        switch (kind) {
            case 'dust': // motes kicked up from the hooves
                for (let i = 0; i < 4; i++) {
                    const u = ms / 380;
                    ctx.globalAlpha = 1 - u;
                    ctx.fillStyle = '#c8b090';
                    ctx.fillRect(
                        Math.round(ex + (i - 1.5) * 4 * u + i),
                        Math.round(ey - 6 * u * (1 + (i % 2))),
                        1,
                        1,
                    );
                }
                break;
            case 'puff': // two puffs from the muzzle
                for (let i = 0; i < 2; i++) {
                    const u = clamp((ms - i * 180) / 320);
                    if (u <= 0 || u >= 1) continue;
                    ctx.globalAlpha = 0.6 * (1 - u);
                    ctx.fillStyle = '#e8e8ff';
                    const r = 1 + Math.round(3 * u);
                    ctx.fillRect(
                        Math.round(ex - 6 * u - r),
                        Math.round(ey + 2 * u - r / 2),
                        r * 2,
                        r,
                    );
                }
                break;
            case 'drift': // robe stars drifting down
                for (let i = 0; i < 5; i++) {
                    const u = ((ms / 2400 + i / 5) % 1) * 1;
                    ctx.globalAlpha = 0.7 * (1 - u);
                    ctx.fillStyle = i % 2 ? '#ffffff' : '#c8e0ff';
                    ctx.fillRect(
                        Math.round(x + m.dx - 12 + i * 6 + Math.sin(u * 6 + i) * 2),
                        Math.round(y + m.dy + 6 + u * 30),
                        1,
                        1,
                    );
                }
                break;
            case 'drip': // drops falling from the urn's lip
                {
                    const u = ms / 700;
                    ctx.globalAlpha = 1 - u * 0.6;
                    ctx.fillStyle = '#9ae8ff';
                    ctx.fillRect(Math.round(ex - 2), Math.round(ey + 4 + 40 * u * u), 1, 2);
                }
                break;
            case 'spray': // the spray it leaps up through
                for (let i = 0; i < 10; i++) {
                    const u = ms / 500,
                        a = -Math.PI / 2 + (i - 4.5) * 0.22;
                    ctx.globalAlpha = 1 - u;
                    ctx.fillStyle = i % 3 ? '#9ae8ff' : '#ffffff';
                    ctx.fillRect(
                        Math.round(x + Math.cos(a) * 26 * u),
                        Math.round(y + 30 + Math.sin(a) * 30 * u + 30 * u * u),
                        1,
                        1,
                    );
                }
                break;
        }
        ctx.restore();
    }
}
