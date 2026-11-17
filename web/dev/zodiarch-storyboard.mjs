// Zodiarch attack storyboard (nextSteps.md P2.3): every sign's summon and attack, and the
// dragon's own new attacks, animated on a loop with the real sprites. A mock-up for approval,
// not the engine: timings follow the plan (forming 700 ms, warnings 900 ms or more) and every
// shot leaves from an emitter on the figure (assets/bosses/draft-p2-emitters.json).
import { BossArt } from '../src/boss/art.mjs';
import { pixelGlow as glow } from '../src/render/fx.mjs';
import { drawCreature, drawRing, ringPoint, segmentKey, SIGN_RIM } from '../src/boss/zodiac.mjs';
import { zodiarchPath, SIGN_KEY } from '../src/boss/scene.mjs';
import { TAU, dotted, dottedRing, band } from '../src/boss/draw-kit.mjs';

const W = 480,
    H = 270;
const art = new BossArt('./assets/bosses/');
await Promise.all([art.load('rift'), art.load('shots')]);
const EMIT = await (await fetch('./assets/bosses/draft-p2-emitters.json')).json();
const PILOT = { x: 90, y: 150 };
// The phase 3 composite draws the dragon once; its signs work out the dragon's points on a
// canvas nobody sees.
let dragonDraw = true;
const OFFSCREEN = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d');

// ---------------------------------------------------------------- helpers
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (u) => u * u * (3 - 2 * u);
const lerp = (a, b, u) => a + (b - a) * u;
const span = (t, a, b) => clamp01((t - a) / (b - a)); // 0..1 while t runs a..b
const rgb = (hex) => hex.match(/\w\w/g).map((h) => parseInt(h, 16)).join(',');
const emitAt = (sign, name, x, y) => {
    const [dx, dy] = EMIT[sign][name];
    return [x + dx, y + dy];
};

function backdrop(ctx, seed = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120a26');
    g.addColorStop(0.65, '#2a1036');
    g.addColorStop(1, '#3a1430');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    let s = seed * 9301;
    for (let i = 0; i < 70; i++) {
        s = (s * 9301 + 49297) % 233280;
        const x = (s / 233280) * W;
        s = (s * 9301 + 49297) % 233280;
        const y = (s / 233280) * H;
        ctx.fillStyle = i % 7 ? '#5a5a8a' : '#c8d2ff';
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
}
function pilot(ctx, t, at) {
    const y = (at ?? PILOT.y) + Math.sin(t / 500) * 3;
    ctx.fillStyle = '#9fe8ff';
    ctx.beginPath();
    ctx.moveTo(PILOT.x + 9, y);
    ctx.lineTo(PILOT.x - 6, y - 5);
    ctx.lineTo(PILOT.x - 3, y);
    ctx.lineTo(PILOT.x - 6, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb060';
    ctx.fillRect(PILOT.x - 9, y - 1, 3, 2);
}

// The dragon, swimming slowly; returns its head, eye, mouth, pearl, claws and tail points.
function dragon(ctx, clock, { mouth = false, eyeGlow = 0, pearlGlow = 0, out = 0, time = 0 } = {}) {
    drawRing(ctx, clock, out, time);
    const pts = [zodiarchPath(clock)];
    let c = clock;
    while (pts.length < 27) {
        c -= 0.004;
        const [px, py] = zodiarchPath(c);
        const [lx, ly] = pts[pts.length - 1];
        if (Math.hypot(px - lx, py - ly) >= 13) pts.push([px, py]);
    }
    const [x, y] = pts[0];
    const body = pts.slice(1).map(([sx, sy], i) => ({ x: sx, y: sy, r: 20 - (10 * i) / 25 }));
    const last = body[body.length - 1],
        prev = body[body.length - 2];
    art.drawRotated(ctx, 'rift', 'zod-tail', last.x, last.y, Math.atan2(last.y - prev.y, last.x - prev.x));
    for (let i = body.length - 1; i >= 0; i--) {
        const s = body[i];
        art.draw(ctx, 'rift', segmentKey(s.r, i), s.x, s.y, {});
        if (i === 4 || i === 15) art.draw(ctx, 'rift', 'zod-claw', s.x - 1, s.y + s.r * 0.55 + 14, {});
    }
    art.draw(ctx, 'rift', mouth ? 'zod-head-1' : 'zod-head-0', x - 24, y, {});
    const eye = [x - 38, y - 12],
        jaw = [x - 72, y + 3],
        pearl = [x - 56, y + 24];
    if (eyeGlow > 0) {
        glow(ctx, eye[0], eye[1], 10 + 14 * eyeGlow, '255,90,70', 0.5 * eyeGlow);
        ctx.fillStyle = '#ffd0c0';
        ctx.fillRect(eye[0] - 1, eye[1] - 1, 3, 3);
    }
    if (pearlGlow > 0) glow(ctx, pearl[0], pearl[1], 16 + 20 * pearlGlow, '200,120,255', 0.5 * pearlGlow);
    art.draw(ctx, 'rift', pearlGlow > 0.5 ? 'zod-pearl-1' : 'zod-pearl-0', pearl[0], pearl[1], {});
    const claws = [body[4], body[15]].map((s) => [s.x - 4, s.y + s.r * 0.55 + 20]);
    return { x, y, eye, jaw, pearl, claws, tail: [last.x, last.y], body };
}

// Light gathering at an emitter while an attack is warned: motes spiral in, the glow grows.
function charge(ctx, x, y, u, colour = '255,220,160') {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 6 + 18 * u, colour, 0.25 + 0.45 * u);
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + u * 5,
            r = 22 * (1 - ((u * 3 + k / 8) % 1));
        ctx.fillStyle = k % 2 ? '#ffffff' : `rgb(${colour})`;
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    }
}
function flash(ctx, x, y, u, colour = '255,240,220') {
    if (u <= 0 || u >= 1) return;
    glow(ctx, x, y, 10 + 16 * u, colour, 0.9 * (1 - u));
    ctx.globalAlpha = 1 - u;
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU,
            r = 3 + 10 * u;
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 1);
    }
    ctx.globalAlpha = 1;
}
function spark(ctx, x, y, colour = '#ffe6a0', size = 2) {
    ctx.fillStyle = '#2a0c24';
    ctx.fillRect(Math.round(x) - size, Math.round(y) - size, size * 2 + 1, size * 2 + 1);
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(x) - size + 1, Math.round(y) - size + 1, size * 2 - 1, size * 2 - 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}
function trail(ctx, x, y, a, len, colour) {
    for (let k = 1; k <= 5; k++) {
        ctx.globalAlpha = 0.5 - k * 0.08;
        ctx.fillStyle = colour;
        ctx.fillRect(Math.round(x - Math.cos(a) * len * k / 5), Math.round(y - Math.sin(a) * len * k / 5), 2, 2);
    }
    ctx.globalAlpha = 1;
}
function warnLane(ctx, x, y, a, len, u, colour = '#ff8a6a') {
    if (u <= 0 || u >= 1) return;
    dotted(ctx, x, y, a, len, Math.floor(u * 9) % 2 && u > 0.7 ? '#ffffff' : colour, 4, 1);
}
function liveLane(ctx, x, y, a, len, width, u, colour = '#ff9a7a') {
    if (u <= 0 || u >= 1) return;
    ctx.globalAlpha = 1 - u * 0.5;
    band(ctx, x, y, a, len, width, colour);
    band(ctx, x, y, a, len, Math.max(1, width - 4), '#fff0e0');
    ctx.globalAlpha = 1;
}
function fireball(ctx, x, y, r = 6) {
    glow(ctx, x, y, r * 3, '255,140,40', 0.55);
    ctx.fillStyle = '#ff6a20';
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd890';
    ctx.beginPath();
    ctx.arc(Math.round(x) - 1, Math.round(y) - 1, r * 0.55, 0, TAU);
    ctx.fill();
}

// A thrown sign: the shared timeline. `stage` is where it forms; `act(ctx, t, x, y, k)`
// draws its attack from 700 ms (live); returns the creature's position (it may move).
const FORM = 700;
// `motion` may return `flip` (the creature turns round) and `pilotY` lets the pilot dodge;
// `lingers` keeps drawing the attack after the creature has gone (shots still in flight).
function signTile(sign, { stage, act, dissolveAt, partner, pilotY, lingers }) {
    const tile = (ctx, t, clock) => {
        const forming = t < FORM,
            dissolving = t >= dissolveAt;
        const throwing = t < FORM;
        const d = dragon(dragonDraw ? ctx : OFFSCREEN, clock, { mouth: throwing, out: forming || !dissolving ? 1 << sign : 0, time: t });
        if (dragonDraw) pilot(ctx, t, pilotY?.(t - FORM));
        let pos = { x: stage[0], y: stage[1] };
        if (!forming && !dissolving) pos = act.motion?.(t - FORM, stage) ?? pos;
        if (dissolving) pos = act.motion?.(dissolveAt - FORM, stage) ?? pos;
        const state = forming ? 0 : dissolving ? 2 : 1;
        const r = forming ? ease(t / FORM) : dissolving ? 1 - span(t, dissolveAt, dissolveAt + 400) : 1;
        const creature = (x, y, isPartner) => {
            ctx.save();
            if (pos.flip) {
                ctx.translate(x * 2, 0);
                ctx.scale(-1, 1);
            }
            drawCreature(ctx, art, { slot: sign, x, y, state, r }, clock, t, 1, isPartner);
            ctx.restore();
        };
        if (!(dissolving && r <= 0)) {
            creature(pos.x, pos.y, false);
            if (partner) {
                const p2 = partner(t, pos);
                if (p2) creature(p2.x, p2.y, true);
            }
        }
        if (!forming && (!dissolving || lingers)) act.draw(ctx, t - FORM, pos.x, pos.y, d, dissolving);
        return d;
    };
    tile.loop = dissolveAt + 700;
    return tile;
}

// ---------------------------------------------------------------- the twelve
const S = {};
S[0] = signTile(0, {
    // Aries: lines up on the pilot's row, paws, charges the whole field and off the edge.
    stage: [230, PILOT.y],
    dissolveAt: FORM + 1900,
    act: {
        motion: (t, [sx, sy]) => ({ x: t < 1000 ? sx + Math.sin(t / 40) * (t > 600 ? 2 : 0) : sx - (t - 1000) * 0.62, y: sy }),
        draw(ctx, t, x, y) {
            const [hx, hy] = emitAt(0, 'horns', x, y);
            warnLane(ctx, hx, hy, Math.PI, hx + 20, span(t, 0, 1000));
            charge(ctx, hx, hy, span(t, 0, 1000), '255,200,110');
            if (t >= 1000) {
                ctx.globalAlpha = 0.35;
                dotted(ctx, x + 40, y, 0, 480 - x, '#ffc070', 3);
                ctx.globalAlpha = 1;
                for (let k = 0; k < 8; k++) {
                    const fx = x + 30 + k * 16;
                    if (fx < 480) {
                        ctx.globalAlpha = 1 - k / 8;
                        spark(ctx, fx, y + 34 + ((k * 5) % 7), '#ffc070', 1);
                        ctx.globalAlpha = 1;
                    }
                }
            }
        },
    },
});
S[1] = signTile(1, {
    // Taurus: Aldebaran flares and sweeps a red eye beam, then the bull stampedes the whole
    // field; as it passes the pilot's column its star knot bursts.
    stage: [230, 110],
    dissolveAt: FORM + 2700,
    act: {
        motion: (t, [sx, sy]) => ({ x: t < 1700 ? sx : sx - (t - 1700) * 0.6, y: sy }),
        draw(ctx, t, x, y) {
            const [ex, ey] = emitAt(1, 'eye', x, y);
            charge(ctx, ex, ey, span(t, 0, 900), '255,90,70');
            const a0 = Math.atan2(PILOT.y - 30 - ey, PILOT.x - ex),
                sweep = a0 + 0.35 * span(t, 900, 1500);
            if (t < 900) dotted(ctx, ex, ey, a0, 420, '#ff6a5a', 5);
            if (t >= 900 && t < 1500) {
                band(ctx, ex, ey, sweep, 520, 5, '#ff5a4a');
                band(ctx, ex, ey, sweep, 520, 2, '#ffe0d0');
                flash(ctx, ex, ey, span(t, 900, 1100), '255,120,100');
            }
            if (t >= 1300 && t < 1700) warnLane(ctx, x - 50, y + 10, Math.PI, x, span(t, 1300, 1700));
            if (t >= 1700) {
                const passAt = 1700 + (x + 0 - PILOT.x) / 0.6;
                const burst = span(t, 1700 + (230 - PILOT.x - 40) / 0.6, 1700 + (230 - PILOT.x - 40) / 0.6 + 900);
                if (burst > 0) {
                    const bx = PILOT.x + 40;
                    for (let k = 0; k < 7; k++) {
                        const a = (k / 7) * TAU;
                        spark(ctx, bx + Math.cos(a) * burst * 90, y + Math.sin(a) * burst * 90, '#ffbe6e');
                    }
                } else if (passAt) glow(ctx, x - 10, y - 10, 14, '255,190,110', 0.6);
            }
        },
    },
});
S[2] = signTile(2, {
    // Gemini: the twins take the rows either side of the pilot; light gathers in their hands
    // and two beams cross the field from them; they step closer and fire again.
    stage: [190, PILOT.y - 62],
    dissolveAt: FORM + 3000,
    partner: (t, pos) => ({ x: pos.x + 30, y: PILOT.y + 62 - (t > FORM + 1500 ? 24 : 0) }),
    act: {
        motion: (t, [sx, sy]) => ({ x: sx, y: sy + (t > 1500 ? 24 : 0) }),
        draw(ctx, t, x, y) {
            const pairs = [emitAt(2, 'hand', x, y), emitAt(2, 'b_hand', x + 30, PILOT.y + 62 - (t > 1500 ? 24 : 0))];
            for (const round of [0, 1500]) {
                const u = span(t, round, round + 900);
                for (const [hx, hy] of pairs) {
                    charge(ctx, hx, hy, u, '140,220,255');
                    warnLane(ctx, hx, hy, Math.PI, hx, u, '#8cdcff');
                    liveLane(ctx, hx, hy, Math.PI, hx, 8, span(t, round + 900, round + 1300), '#8cdcff');
                    flash(ctx, hx, hy, span(t, round + 900, round + 1100), '160,230,255');
                }
            }
        },
    },
});
S[3] = signTile(3, {
    // Cancer: its claws shoot out on tethers down two lanes at the pilot's column and snap back.
    stage: [210, 120],
    dissolveAt: FORM + 2300,
    act: {
        draw(ctx, t, x, y) {
            for (const [k, name] of ['claw_near', 'claw_far'].entries()) {
                const [cx, cy] = emitAt(3, name, x, y);
                const tx = PILOT.x + 40 + k * 70,
                    ty = k ? 260 : 10;
                const a = Math.atan2(ty - cy, tx - cx),
                    len = Math.hypot(tx - cx, ty - cy);
                const u = span(t, k * 200, k * 200 + 900);
                charge(ctx, cx, cy, u, '180,232,210');
                warnLane(ctx, cx, cy, a, len, u, '#b4e6d2');
                const out = span(t, k * 200 + 900, k * 200 + 1200),
                    back = span(t, k * 200 + 1400, k * 200 + 1800);
                const reach = len * ease(out) * (1 - ease(back));
                if (reach > 1) {
                    ctx.strokeStyle = '#b4e6d2';
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    const px = cx + Math.cos(a) * reach,
                        py = cy + Math.sin(a) * reach;
                    glow(ctx, px, py, 12, '180,232,210', 0.5);
                    spark(ctx, px, py, '#dffff0', 3);
                }
            }
        },
    },
});
S[4] = signTile(4, {
    // Leo: no charge glow until it means to pounce. The roar: the mane flares and the head
    // shudders, then the ring (one notch). Its shots are suns shed from the mane: three bud,
    // hover spinning with short aim ticks, and are tossed off one by one with a jerk of the
    // head. Only then the crouch: it draws back and down, the eye glints, the lane is warned,
    // and it pounces all the way across.
    stage: [235, 125],
    dissolveAt: FORM + 4100,
    act: {
        motion: (t, [sx, sy]) => {
            if (t < 900) return { x: sx + (Math.floor(t / 45) % 2 ? 1 : -1) * span(t, 200, 900), y: sy };
            if (t < 2400) {
                let toss = 0;
                for (let k = 0; k < 3; k++) toss += Math.max(0, 1 - Math.abs(t - (1900 + k * 180)) / 70) * 4;
                return { x: sx - toss, y: sy };
            }
            const crouch = ease(span(t, 2400, 2800));
            const cx = sx + 12 * crouch,
                cy = sy + 6 * crouch;
            if (t < 3300) return { x: cx, y: cy };
            const a = Math.atan2(PILOT.y - cy, PILOT.x - cx),
                u = (t - 3300) * 0.8;
            return { x: cx + Math.cos(a) * u, y: cy + Math.sin(a) * u };
        },
        draw(ctx, t, x, y) {
            const [mx, my] = emitAt(4, 'mouth', x, y);
            const [nx, ny] = emitAt(4, 'mane', x, y);
            // The roar's tell: the mane flares, sound arcs leave the jaws (no gathering light).
            const tell = span(t, 0, 900);
            if (tell > 0 && tell < 1) {
                for (let k = 0; k < 14; k++) {
                    const a = (k / 14) * TAU + Math.sin(t / 60 + k) * 0.08,
                        r0 = 16,
                        r1 = r0 + 4 + 10 * tell * (k % 2 ? 0.6 : 1);
                    ctx.globalAlpha = 0.5 + 0.4 * tell;
                    band(ctx, nx + Math.cos(a) * r0, ny + Math.sin(a) * r0, a, r1 - r0, 1, k % 3 ? '#ffd25a' : '#fff0b0');
                }
                ctx.globalAlpha = 1;
                for (let k = 0; k < 3; k++) {
                    const r = 6 + ((tell * 3 + k / 3) % 1) * 26;
                    ctx.globalAlpha = 1 - r / 32;
                    ctx.strokeStyle = '#ffd25a';
                    ctx.beginPath();
                    ctx.arc(mx, my, r, Math.PI - 0.6, Math.PI + 0.6);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
                ctx.globalAlpha = 0.5;
                dottedRing(ctx, mx, my, 40, '#ffd25a', 56, 0, { a: Math.PI + 0.3, half: 0.32 });
                ctx.globalAlpha = 1;
            }
            const ring = span(t, 900, 1900);
            if (ring > 0 && ring < 1) {
                const r = 20 + ring * 260;
                ctx.globalAlpha = 1 - ring * 0.6;
                dottedRing(ctx, mx, my, r, '#ffd25a', Math.round(r * 1.4), 0, { a: Math.PI + 0.3, half: 0.32 });
                ctx.globalAlpha = 1;
            }
            // Suns shed from the mane.
            for (let k = 0; k < 3; k++) {
                const a0 = -2.5 + k * 0.7;
                const bud = span(t, 1200 + k * 120, 1600 + k * 120),
                    launch = 1900 + k * 180;
                if (bud <= 0) continue;
                const hx = nx + Math.cos(a0) * (14 + 14 * ease(bud)),
                    hy = ny + Math.sin(a0) * (14 + 14 * ease(bud));
                const aim = Math.atan2(PILOT.y - hy, PILOT.x - hx) + (k - 1) * 0.22;
                let px = hx,
                    py = hy;
                if (t >= launch) {
                    const d = (t - launch) * 0.32;
                    if (d > 420) continue;
                    px = hx + Math.cos(aim) * d;
                    py = hy + Math.sin(aim) * d;
                    for (let f = 1; f <= 6; f++) {
                        ctx.globalAlpha = 0.6 - f * 0.09;
                        ctx.fillStyle = f < 3 ? '#ffd25a' : '#ff7a30';
                        const wob = Math.sin(t / 40 + f) * f * 0.5;
                        ctx.fillRect(Math.round(px - Math.cos(aim) * f * 3 - Math.sin(aim) * wob) - 1, Math.round(py - Math.sin(aim) * f * 3 + Math.cos(aim) * wob) - 1, 3, 3);
                    }
                    ctx.globalAlpha = 1;
                    if (t - launch < 150) flash(ctx, hx, hy, (t - launch) / 150, '255,220,120');
                } else {
                    ctx.globalAlpha = 0.6 * bud;
                    dotted(ctx, hx, hy, aim, 26, '#ffd25a', 4);
                    ctx.globalAlpha = 1;
                }
                sun(ctx, px, py, t / 90 + k, bud);
            }
            // Only now the charge: the crouch, the eye glints, the lane is warned.
            if (t >= 2400 && t < 3300) {
                const [ex, ey] = emitAt(4, 'eye', x, y);
                charge(ctx, ex, ey, span(t, 2400, 3300), '255,210,90');
                const a = Math.atan2(PILOT.y - y, PILOT.x - x);
                warnLane(ctx, x - 40, y, a, 520, span(t, 2400, 3300), '#ffd25a');
                ctx.globalAlpha = 0.5;
                for (let k = 0; k < 4; k++) spark(ctx, x + 30 + k * 6, y + 40 + ((k * 3) % 4), '#ffc070', 1);
                ctx.globalAlpha = 1;
            }
            if (t >= 3300) {
                const a = Math.atan2(PILOT.y - y, PILOT.x - x);
                for (let k = 1; k <= 6; k++) {
                    ctx.globalAlpha = 0.5 - k * 0.07;
                    band(ctx, x - Math.cos(a) * k * 14, y - Math.sin(a) * k * 14 + 20, a, 12, 2, '#ffd25a');
                }
                ctx.globalAlpha = 1;
            }
        },
    },
});
// A small sun: a hot core and four turning rays.
function sun(ctx, x, y, spin, grow = 1) {
    const r = 1 + 2 * grow;
    glow(ctx, x, y, 8 + 6 * grow, '255,190,80', 0.6);
    for (let k = 0; k < 4; k++) {
        const a = spin + (k * Math.PI) / 2;
        band(ctx, x, y, a, r + 4, 1, '#ffb040');
    }
    ctx.fillStyle = '#ff9a30';
    ctx.fillRect(Math.round(x) - r, Math.round(y) - r, r * 2 + 1, r * 2 + 1);
    ctx.fillStyle = '#fff6c0';
    ctx.fillRect(Math.round(x) - r + 1, Math.round(y) - r + 1, Math.max(1, r * 2 - 1), Math.max(1, r * 2 - 1));
}
S[5] = signTile(5, {
    // Virgo: throws four seeds from her hand on arcs; each sprouts and fires one needle; then
    // Spica on her wheat ear is flung as a nova star.
    stage: [230, 110],
    dissolveAt: FORM + 3600,
    act: {
        draw(ctx, t, x, y) {
            const [hx, hy] = emitAt(5, 'hand', x, y);
            const spots = [[220, 60], [250, 200], [300, 120], [190, 150]];
            spots.forEach(([sx, sy], k) => {
                const fly = span(t, k * 250, k * 250 + 500);
                if (fly > 0 && fly < 1) {
                    const px = lerp(hx, sx, fly),
                        py = lerp(hy, sy, fly) - Math.sin(fly * Math.PI) * 40;
                    spark(ctx, px, py, '#c8f08c', 1);
                    if (fly < 0.2) flash(ctx, hx, hy, fly * 5, '200,240,140');
                }
                if (fly >= 1) {
                    const grow = span(t, k * 250 + 500, k * 250 + 800);
                    ctx.fillStyle = '#c8f08c';
                    ctx.fillRect(sx - 1, sy - Math.round(6 * grow), 2, Math.round(6 * grow) + 1);
                    const a = Math.atan2(PILOT.y - sy, PILOT.x - sx);
                    const aim = span(t, k * 250 + 800, k * 250 + 1300);
                    if (aim > 0 && aim < 1) dotted(ctx, sx, sy - 6, a, 200, '#ff8a6a', 5);
                    const shot = span(t, k * 250 + 1300, k * 250 + 1900);
                    if (shot > 0 && shot < 1) {
                        const nx = sx + Math.cos(a) * shot * 200,
                            ny = sy - 6 + Math.sin(a) * shot * 200;
                        trail(ctx, nx, ny, a, 10, '#c8f08c');
                        spark(ctx, nx, ny, '#efffd0', 1);
                    }
                }
            });
            novaStar(ctx, t - 1800, emitAt(5, 'wheat', x, y), [200, 230], '#c8f08c');
        },
    },
});
// A nova star flung from `from` to `to`: flies 500 ms, counts down 1200 ms, bursts.
function novaStar(ctx, t, [fx, fy], [tx, ty], colour = '#ffe6a0', gapAngle = 0.4) {
    if (t < 0) return;
    if (t < 500) {
        const u = t / 500;
        flash(ctx, fx, fy, u * 2, '255,240,200');
        spark(ctx, lerp(fx, tx, u), lerp(fy, ty, u) - Math.sin(u * Math.PI) * 50, colour, 2);
        return;
    }
    if (t < 1700) {
        const u = (t - 500) / 1200;
        const pulse = Math.floor(t / (u > 0.7 ? 60 : 140)) % 2;
        glow(ctx, tx, ty, 14, '255,230,160', 0.4 + 0.3 * pulse);
        spark(ctx, tx, ty, pulse ? '#ffffff' : colour, 3);
        dottedRing(ctx, tx, ty, 34 * (1 - u) + 6, pulse ? '#ffffff' : '#ff8a6a', 24, t / 300);
        return;
    }
    const u = clamp01((t - 1700) / 900);
    if (u >= 1) return;
    glow(ctx, tx, ty, 30 * (1 - u) + 6, '255,240,200', 0.8 * (1 - u));
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + gapAngle;
        if (k === 0) continue; // the gap
        spark(ctx, tx + Math.cos(a) * u * 110, ty + Math.sin(a) * u * 110, colour, 2);
    }
}
S[6] = signTile(6, {
    // Libra: the beam tips; the field tilts toward the heavier pan; weights drop from the pans.
    stage: [220, 110],
    dissolveAt: FORM + 3000,
    act: {
        draw(ctx, t, x, y) {
            const u = span(t, 0, 900);
            ctx.globalAlpha = 0.35 + 0.3 * u;
            ctx.fillStyle = '#e6e6ff';
            for (let k = 0; k < 14; k++) {
                const ax = 30 + ((k * 67) % 420),
                    ay = 30 + ((k * 41 + t / 8) % 230);
                ctx.fillRect(Math.round(ax), Math.round(ay), 1, 4);
                ctx.fillRect(Math.round(ax) - 1, Math.round(ay) + 3, 3, 1);
            }
            ctx.globalAlpha = 1;
            for (const [k, name] of ['pan_near', 'pan_far'].entries()) {
                const [px, py] = emitAt(6, name, x, y);
                charge(ctx, px, py, span(t, 0, 900), '230,230,255');
                for (let w = 0; w < 3; w++) {
                    const s = span(t, 900 + w * 300 + k * 150, 2400 + w * 300 + k * 150);
                    if (s > 0 && s < 1) {
                        const wx = px - s * 90,
                            wy = py + s * s * 200;
                        trail(ctx, wx, wy, Math.atan2(s * 2, -0.5), 10, '#e6e6ff');
                        spark(ctx, wx, wy, '#e6e6ff', 2);
                    }
                }
            }
        },
    },
});
S[7] = signTile(7, {
    // Scorpius: everything leaves the sting at the tip of the tail. The tail cocks back while
    // venom gathers at the tip; a venom beam whips an arc from the tip; it gathers again and
    // the sting itself is fired from the tip and homes in, the body lurching after it.
    stage: [220, 150],
    dissolveAt: FORM + 3200,
    act: {
        motion: (t, [sx, sy]) => {
            const cock = ease(span(t, 0, 900)) * (1 - ease(span(t, 900, 1100))) + ease(span(t, 1700, 2300)) * (1 - ease(span(t, 2300, 2400)));
            const lurch = Math.max(0, 1 - Math.abs(t - 1000) / 250) + Math.max(0, 1 - Math.abs(t - 2400) / 250);
            return { x: sx + 4 * cock - 6 * lurch, y: sy };
        },
        draw(ctx, t, x, y) {
            const [sx, sy] = emitAt(7, 'sting', x, y);
            const a0 = Math.PI + 0.55,
                a1 = Math.PI - 0.45;
            const u = span(t, 0, 900);
            charge(ctx, sx, sy, u, '255,96,90');
            if (u > 0 && u < 1) {
                dotted(ctx, sx, sy, a0, 230, '#ff7a6a', 6);
                dotted(ctx, sx, sy, a1, 230, '#ff7a6a', 6);
                ctx.globalAlpha = 0.35;
                for (let k = 1; k < 6; k++) dotted(ctx, sx, sy, lerp(a0, a1, k / 6), 230, '#ff7a6a', 12);
                ctx.globalAlpha = 1;
            }
            const sweep = span(t, 900, 1700);
            if (sweep > 0 && sweep < 1) {
                const a = lerp(a0, a1, ease(sweep));
                band(ctx, sx, sy, a, 230, 7, '#ff5a5a');
                band(ctx, sx, sy, a, 230, 3, '#ffe0d8');
                glow(ctx, sx, sy, 14, '255,110,100', 0.7);
                // Venom drips off the arc it has swept.
                for (let k = 0; k < 6; k++) {
                    const f = ((sweep * 3 + k / 6) % 1) * ease(sweep);
                    const da = lerp(a0, a, f),
                        dd = 60 + k * 26;
                    ctx.globalAlpha = 0.6;
                    spark(ctx, sx + Math.cos(da) * dd, sy + Math.sin(da) * dd + f * 8, '#ff8a7a', 1);
                }
                ctx.globalAlpha = 1;
            }
            charge(ctx, sx, sy, span(t, 1700, 2400), '255,120,110');
            if (t >= 1700 && t < 2400) {
                ctx.globalAlpha = 0.6;
                dotted(ctx, sx, sy, Math.atan2(PILOT.y - sy, PILOT.x - sx), 150, Math.floor(t / 90) % 2 ? '#ffffff' : '#ff7a6a', 5);
                ctx.globalAlpha = 1;
            }
            const fly = span(t, 2400, 3200);
            if (fly > 0 && fly < 1) {
                const mx = lerp(sx, PILOT.x + 20, fly) + 0,
                    my = lerp(sy, PILOT.y, fly) + Math.sin(fly * 9) * 10 * (1 - fly);
                const ang = Math.atan2(PILOT.y - sy, PILOT.x - sx);
                trail(ctx, mx, my, ang, 18, '#ff7a6a');
                glow(ctx, mx, my, 10, '255,90,90', 0.6);
                ctx.fillStyle = '#ff5a5a';
                ctx.beginPath();
                ctx.moveTo(mx + Math.cos(ang) * 6, my + Math.sin(ang) * 6);
                ctx.lineTo(mx + Math.cos(ang + 2.5) * 4, my + Math.sin(ang + 2.5) * 4);
                ctx.lineTo(mx + Math.cos(ang - 2.5) * 4, my + Math.sin(ang - 2.5) * 4);
                ctx.fill();
                if (fly < 0.2) flash(ctx, sx, sy, fly * 5, '255,140,120');
            }
        },
    },
});
S[8] = signTile(8, {
    // Sagittarius: three aim lines from the arrowhead, then two volleys down them.
    stage: [230, 110],
    dissolveAt: FORM + 1900,
    act: {
        draw(ctx, t, x, y) {
            const [ax, ay] = emitAt(8, 'arrow', x, y);
            const a0 = Math.atan2(PILOT.y - ay, PILOT.x - ax);
            const u = span(t, 0, 900);
            charge(ctx, ax, ay, u, '255,170,210');
            if (u < 1) for (let k = -1; k <= 1; k++) dotted(ctx, ax, ay, a0 + k * 0.18, 420, '#ffaad2', 5);
            for (const v of [0, 160]) {
                const f = span(t, 900 + v, 1700 + v);
                if (f > 0 && f < 1) {
                    if (f < 0.2) flash(ctx, ax, ay, f * 5, '255,190,220');
                    for (let k = -1; k <= 1; k++) {
                        const a = a0 + k * 0.18;
                        const px = ax + Math.cos(a) * f * 420,
                            py = ay + Math.sin(a) * f * 420;
                        ctx.fillStyle = '#ffe0ef';
                        band(ctx, px, py, a + Math.PI, 10, 1, '#ffe0ef');
                        spark(ctx, px, py, '#ffaad2', 1);
                    }
                }
            }
        },
    },
});
S[9] = signTile(9, {
    // Capricornus: a short, hard dive; the splash is the event: a white flash, a crown and
    // column of spray, ripples running out along the bottom while the fan of lanes it will
    // fire down flickers; then two waves of stars burst up and out in every direction from
    // the splash (each with a gap), and the sea-goat leaps back up through its own spray.
    stage: [210, 140],
    dissolveAt: FORM + 2400,
    lingers: true,
    act: {
        motion: (t, [sx, sy]) => {
            if (t < 350) {
                const u = t / 350;
                return { x: sx - 10 * u, y: sy + u * u * 190 };
            }
            if (t < 1000) return { x: sx - 10, y: sy + 190 };
            return { x: sx - 10, y: sy + 190 - (1 - (1 - span(t, 1000, 1500)) ** 3) * 190 };
        },
        draw(ctx, t, x, y, d, gone) {
            const SX = 200,
                SY = 266;
            const since = t - 330;
            if (since > 0 && since < 1600) {
                // The flash and the column.
                const f = clamp01(since / 500);
                glow(ctx, SX, SY, 30 + 50 * f, '200,230,255', 0.9 * (1 - f));
                if (since < 700) {
                    const h = 120 * Math.sin(Math.min(1, since / 700) * Math.PI);
                    ctx.globalAlpha = 0.55 * (1 - since / 700);
                    ctx.fillStyle = '#cfe6ff';
                    ctx.fillRect(SX - 8, SY - h, 16, h);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(SX - 3, SY - h, 6, h);
                    ctx.globalAlpha = 1;
                }
                // The crown and the spray: droplets thrown up that fall back.
                for (let k = 0; k < 30; k++) {
                    const a = -Math.PI / 2 + ((k / 29) - 0.5) * 2.4,
                        v = 0.22 + ((k * 37) % 11) / 30;
                    const px = SX + Math.cos(a) * v * since,
                        py = SY + Math.sin(a) * v * since + 0.00045 * since * since;
                    if (py > SY + 4) continue;
                    ctx.globalAlpha = 1 - since / 1600;
                    ctx.fillStyle = k % 3 ? '#a0c8ff' : '#ffffff';
                    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
                }
                ctx.globalAlpha = 1;
                // Ripples along the bottom.
                for (let k = 0; k < 3; k++) {
                    const r = clamp01((since - k * 150) / 900);
                    if (r <= 0 || r >= 1) continue;
                    ctx.globalAlpha = 1 - r;
                    ctx.strokeStyle = '#a0c8ff';
                    ctx.beginPath();
                    ctx.ellipse(SX, SY, 12 + r * 170, 3 + r * 14, 0, Math.PI, TAU);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
            // The fan it will fire down: 15 lanes over the upper half-plane, one gap.
            const N = 15,
                lanes = (off) => [...Array(N).keys()].map((k) => Math.PI + 0.12 + ((Math.PI - 0.24) * (k + off)) / (N - 1));
            const pilotA = Math.atan2(PILOT.y - SY, PILOT.x - SX);
            const gapOf = (as) => as.reduce((b, a, k) => (Math.abs(a - pilotA) < Math.abs(as[b] - pilotA) ? k : b), 0);
            const warn = span(t, 380, 1000);
            if (warn > 0 && warn < 1) {
                const as = lanes(0),
                    gap = gapOf(as);
                as.forEach((a, k) => {
                    if (k === gap) return;
                    ctx.globalAlpha = 0.35 + 0.4 * warn;
                    dotted(ctx, SX, SY, a, 40 + 120 * warn, Math.floor(t / 80) % 2 && warn > 0.6 ? '#ffffff' : '#a0c8ff', 5);
                });
                ctx.globalAlpha = 1;
            }
            for (const [w, start, off] of [[0, 1000, 0], [1, 1280, 0.5]]) {
                const f = t - start;
                if (f < 0 || f > 1500) continue;
                if (f < 160) flash(ctx, SX, SY - 4, f / 160, '220,240,255');
                const as = lanes(off),
                    gap = gapOf(as);
                as.forEach((a, k) => {
                    if (k === gap || (w && k === Math.min(N - 1, gap + 1))) return;
                    const dist = f * (w ? 0.24 : 0.32);
                    const px = SX + Math.cos(a) * dist,
                        py = SY + Math.sin(a) * dist;
                    trail(ctx, px, py, a, 12, '#a0c8ff');
                    spark(ctx, px, py, w ? '#cfe6ff' : '#a0c8ff', 2);
                });
            }
            void x, y, d, gone;
        },
    },
});
S[10] = signTile(10, {
    // Aquarius: the urn tips and pours a wavering stream; each star droplet slows and hangs in
    // the air, then fuses: its two motes spiral together, it swells and burns from blue to
    // white to gold under a closing warning ring, and bursts into six sparks.
    stage: [235, 140],
    dissolveAt: FORM + 2300,
    lingers: true,
    act: {
        draw(ctx, t, x, y, d, gone) {
            const [ux, uy] = gone ? [230, 98] : emitAt(10, 'urn', x, y);
            const a = Math.atan2(PILOT.y - uy, PILOT.x - ux);
            const u = span(t, 0, 600);
            if (!gone) charge(ctx, ux, uy, u, '110,200,255');
            if (u > 0 && u < 1) dotted(ctx, ux, uy, a, 260, '#6ec8ff', 5);
            if (t > 600 && t < 1800 && !gone) glow(ctx, ux, uy, 14, '110,200,255', 0.6);
            const lerpC = (c0, c1, f) => c0.map((v, i) => Math.round(v + (c1[i] - v) * f)).join(',');
            for (let k = 0; k < 12; k++) {
                const born = 600 + k * 95,
                    f = t - born;
                if (f < 0) continue;
                const reach = 70 + ((k * 53) % 5) * 34 + (k % 2) * 12;
                const fly = clamp01(f / 650),
                    dist = reach * (1 - (1 - fly) ** 2);
                const wave = Math.sin(dist / 18 + k) * 12 * (0.4 + fly);
                const px = ux + Math.cos(a) * dist - Math.sin(a) * wave,
                    py = uy + Math.sin(a) * dist + Math.cos(a) * wave + (fly < 1 ? 0 : Math.sin(t / 300 + k) * 1.5);
                const fuse = clamp01((f - 650) / 1100);
                const pop = f - 1750;
                if (pop >= 0) {
                    const e = clamp01(pop / 500);
                    if (e >= 1) continue;
                    glow(ctx, px, py, 8 + 20 * (1 - e), '255,220,140', 0.8 * (1 - e));
                    for (let s = 0; s < 6; s++) {
                        const sa = (s / 6) * TAU + k;
                        spark(ctx, px + Math.cos(sa) * e * 60, py + Math.sin(sa) * e * 60, '#ffe6a0', 1);
                    }
                    continue;
                }
                if (fly < 1) {
                    trail(ctx, px, py, a, 10, '#6ec8ff');
                    spark(ctx, px, py, '#bfe8ff', 2);
                    continue;
                }
                // Fusion.
                const col = fuse < 0.5 ? lerpC([110, 200, 255], [255, 255, 255], fuse * 2) : lerpC([255, 255, 255], [255, 200, 90], fuse * 2 - 1);
                const flick = Math.floor(t / (fuse > 0.7 ? 45 : 110)) % 2;
                glow(ctx, px, py, 6 + 10 * fuse, col, 0.35 + 0.35 * fuse + 0.15 * flick);
                const orb = 6 * (1 - fuse) + 0.5,
                    spin = t / (120 - 80 * fuse) + k;
                ctx.fillStyle = `rgb(${col})`;
                for (const side of [0, Math.PI]) ctx.fillRect(Math.round(px + Math.cos(spin + side) * orb) - 1, Math.round(py + Math.sin(spin + side) * orb) - 1, 2, 2);
                const r = Math.round(1 + 2 * fuse);
                ctx.fillStyle = flick ? '#ffffff' : `rgb(${col})`;
                ctx.fillRect(Math.round(px) - r + 1, Math.round(py) - r + 1, r * 2 - 1, r * 2 - 1);
                ctx.globalAlpha = 0.6;
                dottedRing(ctx, px, py, 16 * (1 - fuse) + 5, fuse > 0.7 && flick ? '#ffffff' : '#ffb070', 12, t / 400);
                ctx.globalAlpha = 1;
            }
        },
    },
});
// Pisces: the fish part as wide as the field allows (just inside the top and bottom), the
// cord between them slack and harmless: the gap is the way through. They swim the length
// of the field, turn, close in, and on the way back the cord pulls taut and lights: the gap
// is filled, and the way round is outside the fish.
const PISCES = {
    y: (u) => {
        const part = ease(span(u, 0, 900)),
            close = ease(span(u, 2300, 2900));
        return [lerp(lerp(110, 40, part), 96, close), lerp(lerp(190, 230, part), 176, close)];
    },
    x: (u) => (u < 2300 ? lerp(250, 30, ease(span(u, 900, 2300))) : lerp(30, 360, ease(span(u, 2700, 4300)))),
};
S[11] = signTile(11, {
    stage: [250, 110],
    dissolveAt: FORM + 4300,
    pilotY: (u) => lerp(PILOT.y, 232, ease(span(u, 2300, 3000))),
    partner: (t) => {
        const u = Math.max(0, t - FORM);
        return { x: PISCES.x(u) + 6, y: PISCES.y(u)[1] };
    },
    act: {
        motion: (u) => ({ x: PISCES.x(u), y: PISCES.y(u)[0], flip: u < 2300 }), // the art faces right
        draw(ctx, u, x) {
            const [ya, yb] = PISCES.y(u),
                xb = x + 6;
            const back = u >= 2300 ? -1 : 1; // which way is behind them
            const ta = [x + back * 26, ya],
                tb = [xb + back * 26, yb];
            const taut = span(u, 2400, 3300),
                live = u >= 3300;
            const sag = back * lerp(46, 6, taut);
            ctx.lineWidth = live ? 3 : 1;
            ctx.setLineDash(live ? [] : [3, 3]);
            ctx.globalAlpha = live ? 1 : 0.45 + 0.4 * taut;
            ctx.strokeStyle = live ? '#aaa0ff' : taut > 0 && Math.floor(u / 90) % 2 ? '#ffffff' : '#8a80d0';
            ctx.beginPath();
            ctx.moveTo(...ta);
            ctx.quadraticCurveTo((ta[0] + tb[0]) / 2 + sag, (ya + yb) / 2, ...tb);
            ctx.stroke();
            if (live) {
                ctx.strokeStyle = '#f0ecff';
                ctx.lineWidth = 1;
                ctx.stroke();
                glow(ctx, (ta[0] + tb[0]) / 2, (ya + yb) / 2, 22, '170,160,255', 0.45);
            }
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
            ctx.globalAlpha = 1;
            // Warned lanes for the fish themselves, ahead of them.
            if (u < 900 || (u >= 2300 && u < 3000)) {
                const dir = u < 900 ? Math.PI : 0;
                for (const [fx, fy] of [[x, ya], [xb, yb]]) warnLane(ctx, fx - back * 30, fy, dir, 300, u < 900 ? span(u, 0, 900) : span(u, 2300, 3000), '#aaa0ff');
            }
            // Bubbles off the tails while they swim.
            for (const [fx, fy] of [ta, tb])
                for (let k = 0; k < 3; k++) {
                    const b = ((u / 400 + k / 3) % 1);
                    ctx.globalAlpha = 0.6 * (1 - b);
                    ctx.fillStyle = '#c8c0ff';
                    ctx.fillRect(Math.round(fx + back * b * 14), Math.round(fy - b * 6 + k), 1, 1);
                }
            ctx.globalAlpha = 1;
        },
    },
});
// ---------------------------------------------------------------- the dragon's own
const D = {};
D.eyes = (ctx, t, clock) => {
    // Eye lasers: the eye kindles, an aim line, then a beam sweeps a short arc toward the pilot.
    const u = span(t, 300, 1200);
    const d = dragon(ctx, clock, { eyeGlow: u, time: t });
    pilot(ctx, t);
    const [ex, ey] = d.eye;
    charge(ctx, ex, ey, u, '255,90,70');
    const a0 = Math.atan2(PILOT.y - 50 - ey, PILOT.x - ex);
    if (u > 0 && u < 1) {
        dotted(ctx, ex, ey, a0, 480, '#ff6a5a', 5);
        dotted(ctx, ex, ey, a0 + 0.45, 480, '#ff6a5a', 9);
    }
    const s = span(t, 1200, 2200);
    if (s > 0 && s < 1) {
        const a = a0 + 0.45 * ease(s);
        for (const off of [0, 0.03]) {
            band(ctx, ex, ey, a + off, 520, 5, '#ff4a3a');
            band(ctx, ex, ey, a + off, 520, 2, '#ffe0d0');
        }
        flash(ctx, ex, ey, span(t, 1200, 1400), '255,120,100');
    }
};
D.fireballs = (ctx, t, clock) => {
    // Fireballs: the jaws glow; three slow fireballs; each splits into five embers.
    const d = dragon(ctx, clock, { mouth: t > 300 && t < 1600, time: t });
    pilot(ctx, t);
    const [mx, my] = d.jaw;
    const u = span(t, 300, 1200);
    charge(ctx, mx, my, u, '255,140,40');
    if (u > 0 && u < 1) for (let k = -1; k <= 1; k++) dotted(ctx, mx, my, Math.PI + k * 0.3, 90, '#ffa050', 5);
    for (let k = -1; k <= 1; k++) {
        const a = Math.PI + k * 0.3,
            f = span(t, 1200 + (k + 1) * 150, 2400 + (k + 1) * 150);
        if (f > 0 && f < 1) {
            fireball(ctx, mx + Math.cos(a) * f * 160, my + Math.sin(a) * f * 160, 7 - f * 2);
            if (f < 0.15) flash(ctx, mx, my, f * 7, '255,170,80');
        }
        const e = span(t, 2400 + (k + 1) * 150, 3300 + (k + 1) * 150);
        if (e > 0 && e < 1) {
            const cx = mx + Math.cos(a) * 160,
                cy = my + Math.sin(a) * 160;
            for (let j = 0; j < 5; j++) {
                const b = a + (j - 2) * 0.45;
                spark(ctx, cx + Math.cos(b) * e * 120, cy + Math.sin(b) * e * 120, '#ff9a40', 1);
            }
        }
    }
};
D.novas = (ctx, t, clock) => {
    // Nova stars: both claws fling stars to marked spots; they count down and burst.
    const d = dragon(ctx, clock, { time: t });
    pilot(ctx, t);
    const spots = [[180, 70], [230, 210], [140, 150]];
    spots.forEach((spot, k) => {
        const claw = d.claws[k % 2];
        charge(ctx, claw[0], claw[1], span(t, k * 300, k * 300 + 500), '255,230,160');
        novaStar(ctx, t - 500 - k * 300, claw, spot, '#ffe6a0', k * 0.7);
    });
};
D.blackhole = (ctx, t, clock) => {
    // Black hole: the pearl darkens and flings a singularity well away from the pilot; it
    // pulls (never more than 40% of full thrust) and swallows shots that pass into it.
    const d = dragon(ctx, clock, { pearlGlow: span(t, 0, 600) * (t < 900 ? 1 : 0), time: t });
    const [px, py] = d.pearl;
    const spot = [200, 90];
    const fly = span(t, 900, 1400);
    if (fly > 0 && fly < 1) {
        const x = lerp(px, spot[0], fly),
            y = lerp(py, spot[1], fly) - Math.sin(fly * Math.PI) * 30;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, TAU);
        ctx.fill();
        glow(ctx, x, y, 10, '170,110,255', 0.6);
    }
    const warn = span(t, 1400, 2300);
    if (warn > 0 && warn < 1) {
        for (let k = 0; k < 16; k++) {
            const a = (k / 16) * TAU + t / 300,
                r = 50 * (1 - ((warn * 2 + k / 16) % 1));
            ctx.fillStyle = k % 2 ? '#c8a0ff' : '#ffffff';
            ctx.fillRect(Math.round(spot[0] + Math.cos(a) * r), Math.round(spot[1] + Math.sin(a) * r), 1, 1);
        }
        dottedRing(ctx, spot[0], spot[1], 12, '#ff8a6a', 16, t / 200);
    }
    const live = span(t, 2300, 5300);
    if (live > 0 && live < 1) {
        const r = 10 + 4 * Math.sin(t / 120);
        glow(ctx, spot[0], spot[1], 46, '120,60,220', 0.45);
        for (let k = 0; k < 22; k++) {
            const a = (k / 22) * TAU + t / 260 + (k % 3),
                rr = r + 6 + ((k * 7) % 22);
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = ['#c8a0ff', '#ffffff', '#ffaad2'][k % 3];
            ctx.fillRect(Math.round(spot[0] + Math.cos(a) * rr * 1.4), Math.round(spot[1] + Math.sin(a) * rr * 0.6), 2, 1);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(spot[0], spot[1], r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffd0ff';
        ctx.beginPath();
        ctx.arc(spot[0], spot[1], r + 1, 0, TAU);
        ctx.stroke();
        // the pilot's shots bend into it and vanish
        for (let k = 0; k < 3; k++) {
            const f = ((t / 600 + k / 3) % 1);
            const sx = lerp(PILOT.x + 12, spot[0], f),
                sy = lerp(PILOT.y - 4, spot[1], f * f);
            ctx.fillStyle = '#9fe8ff';
            ctx.fillRect(Math.round(sx), Math.round(sy), 4, 1);
        }
        // the pull, drawn as streaks toward it
        ctx.globalAlpha = 0.5;
        for (let k = 0; k < 6; k++) dotted(ctx, PILOT.x + 30, PILOT.y + (k - 3) * 6, Math.atan2(spot[1] - PILOT.y, spot[0] - PILOT.x - 30), 20 + ((t / 30 + k * 7) % 20), '#c8a0ff', 4);
        ctx.globalAlpha = 1;
    }
    pilot(ctx, t);
};
D.meteors = (ctx, t, clock) => {
    // Meteor fall: the tail fan flares and flicks five meteors down curved paths.
    const d = dragon(ctx, clock, { time: t });
    pilot(ctx, t);
    const [tx, ty] = d.tail;
    const u = span(t, 300, 1200);
    charge(ctx, tx, ty, u, '255,214,120');
    const paths = [0, 1, 2, 3, 4].map((k) => ({ vx: -1.2 - k * 0.35, vy: -2.4 + k * 0.3 }));
    if (u > 0 && u < 1)
        for (const p of paths) {
            for (let s = 0; s < 40; s += 3) {
                const x = tx + p.vx * s * 6,
                    y = ty + p.vy * s * 6 + 0.03 * (s * 6) ** 2;
                ctx.fillStyle = '#ffd890';
                if (x > 0 && y < 270) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
            }
        }
    const f = (t - 1200) / 16;
    if (f > 0 && f < 160)
        for (const p of paths) {
            const s = f / 6;
            const x = tx + p.vx * f,
                y = ty + p.vy * f + 0.03 * f ** 2;
            if (x < -10 || y > 280) continue;
            const a = Math.atan2(p.vy + 0.06 * f, p.vx);
            trail(ctx, x, y, a, 22, '#ffb060');
            glow(ctx, x, y, 10, '255,170,80', 0.5);
            spark(ctx, x, y, '#fff0c0', 2);
            void s;
        }
};
D.net = (ctx, t, clock) => {
    // Constellation net: three ring stars kindle; dotted lines join them; the lines turn
    // lethal for 1.5 s. There is always room outside the triangle.
    const d = dragon(ctx, clock, { time: t });
    pilot(ctx, t);
    void d;
    const signs = [9, 11, 1];
    const pts = signs.map((s) => ringPoint(s, clock));
    const u = span(t, 300, 1200);
    pts.forEach(([x, y], k) => {
        glow(ctx, x, y, 8 + 14 * u, rgb(SIGN_RIM[signs[k]]), 0.3 + 0.5 * u);
        spark(ctx, x, y, '#ffffff', 2);
    });
    for (let k = 0; k < 3; k++) {
        const [x0, y0] = pts[k],
            [x1, y1] = pts[(k + 1) % 3];
        const a = Math.atan2(y1 - y0, x1 - x0),
            len = Math.hypot(x1 - x0, y1 - y0);
        if (u > 0 && u < 1) dotted(ctx, x0, y0, a, len * u, Math.floor(t / 90) % 2 && u > 0.7 ? '#ffffff' : '#ff8a6a', 4);
        const live = span(t, 1200, 2700);
        if (live > 0 && live < 1) {
            band(ctx, x0, y0, a, len, 4, '#aaa0ff');
            band(ctx, x0, y0, a, len, 1, '#ffffff');
        }
    }
};
D.breath = (ctx, t, clock) => {
    // Starfire breath (exists): three lanes from the jaws.
    const d = dragon(ctx, clock, { mouth: t > 300, time: t });
    pilot(ctx, t);
    const [mx, my] = d.jaw;
    const u = span(t, 300, 1200);
    charge(ctx, mx, my, u, '255,210,140');
    for (const k of [-1, 0, 1]) {
        const a = Math.PI + k * 0.26 + Math.atan2(PILOT.y - my, -(mx - PILOT.x)) * 0.0;
        if (u > 0 && u < 1) dotted(ctx, mx, my, a, 230, '#ffb080', 5);
        const live = span(t, 1200, 2400);
        if (live > 0 && live < 1) {
            band(ctx, mx, my, a, 230, 10, '#ff7a40');
            band(ctx, mx, my, a, 230, 4, '#ffe6c0');
        }
    }
};
D.phase3 = (ctx, t, clock) => {
    // Phase 3: three signs out at once (a charger, a ranged sign, a field sign), thrown 1.2 s
    // apart, while the dragon keeps up its own fireballs.
    D.fireballs(ctx, t % 3600, clock);
    // Each on its own spot: Sagittarius high, Scorpius low, Aquarius in the middle.
    const tiles = [
        [8, t, -10, -60],
        [7, t - 1200, -40, 75],
        [10, t - 2400, 30, 0],
    ];
    for (const [sign, tt, dx, dy] of tiles)
        if (tt >= 0) {
            ctx.save();
            ctx.translate(dx, dy);
            SIGN_ONLY[sign](ctx, tt % 4200, clock);
            ctx.restore();
        }
};
// The sign tiles, drawn without the dragon again (for the phase 3 composite).
const SIGN_ONLY = {};
for (const k of [7, 8, 10]) {
    SIGN_ONLY[k] = (ctx, t, clock) => {
        const save = dragonDraw;
        dragonDraw = false;
        S[k](ctx, t, clock);
        dragonDraw = save;
    };
}

// ---------------------------------------------------------------- creature states
// nextSteps.md P2.3 section 6: every sign's hold (idle), hurt (a body hit: flinch, white
// flash, spilled stars, no damage) and break (the key star shot: cracks run out from it, the
// figure comes apart, its stars fly back to the ring, dim). Exit is the dissolve in the
// attack tiles. Timeline: form 0-700, hold, a body hit at 2450, hold, the key star hit at
// 3850, break, stars home by 5300.
const ST = { hurtAt: 2450, breakAt: 3850, loop: 5800 };
const STAGE = [[230, 140], [230, 130], [205, 100], [215, 130], [235, 125], [230, 130], [220, 125], [225, 140], [230, 125], [215, 130], [235, 140], [235, 105]];
const PARTNER_AT = { 2: [30, 66], 11: [8, 62] };
// Where a body hit lands (away from the key star) and which part leaves first on a break.
const HURT_AT = [[10, 14], [10, -10], [-12, -40], [-30, -10], [20, 10], [-30, 10], [0, -30], [40, 0], [20, 10], [-30, 0], [-10, 20], [-6, 62]];
const BREAK_FIRST = { 0: ['horns'], 1: ['eye'], 4: ['mane'], 5: ['wheat'], 6: ['pan_near', 'pan_far'], 7: ['sting'], 8: ['arrow'], 10: ['urn'] };
const SPLIT = { 3: 'vertical', 9: 'vertical' }; // break into two halves, not shards

function seeded(n) {
    let s = n * 7919 + 13;
    return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

// Idle: small transforms of the strike frame plus a few particles; returns the transform.
function idle(ctx, sign, t, x, y, draw) {
    const s = Math.sin,
        o = { dx: 0, dy: 0, rot: 0, sx: 1, pdx: 0, pdy: 0, prot: 0 };
    switch (sign) {
        case 0: // Aries: paws, head dips
            o.rot = 0.03 * Math.max(0, s(t / 260));
            if (draw && Math.floor(t / 520) % 2) {
                const [hx, hy] = emitAt(0, 'hooves', x, y);
                for (let k = 0; k < 3; k++) {
                    const u = ((t / 520) % 1);
                    ctx.globalAlpha = 0.5 * (1 - u);
                    ctx.fillStyle = '#c8b090';
                    ctx.fillRect(Math.round(hx + k * 4 - 4 + u * (k - 1) * 6), Math.round(hy - u * 6), 1, 1);
                }
                ctx.globalAlpha = 1;
            }
            break;
        case 1: // Taurus: snorts, head tosses a little
            o.rot = 0.015 * s(t / 400);
            if (draw) {
                const [mx, my] = emitAt(1, 'muzzle', x, y);
                const u = (t % 1100) / 500;
                if (u < 1)
                    for (const side of [-1, 1]) {
                        ctx.globalAlpha = 0.5 * (1 - u);
                        ctx.fillStyle = '#e0d8ff';
                        ctx.fillRect(Math.round(mx - u * 10), Math.round(my + side * (2 + u * 5)), 2, 1);
                    }
                ctx.globalAlpha = 1;
            }
            break;
        case 2: // Gemini: the twins sway out of step
            o.dx = 2 * s(t / 380);
            o.pdx = 2 * s(t / 380 + 2);
            o.rot = 0.02 * s(t / 380);
            o.prot = 0.02 * s(t / 380 + 2);
            break;
        case 3: // Cancer: shuffles sideways, claws open and close
            o.dx = 3 * s(t / 300);
            o.sx = 1 + 0.03 * s(t / 140);
            break;
        case 4: // Leo: mane ripples, a slow breath
            o.dy = 1.5 * s(t / 450);
            if (draw) {
                const [nx, ny] = emitAt(4, 'mane', x, y + o.dy);
                for (let k = 0; k < 10; k++) {
                    const a = (k / 10) * TAU,
                        l = 3 + 2 * s(t / 120 + k * 1.3);
                    ctx.globalAlpha = 0.35;
                    band(ctx, nx + Math.cos(a) * 17, ny + Math.sin(a) * 17, a, l, 1, '#ffd25a');
                }
                ctx.globalAlpha = 1;
            }
            break;
        case 5: // Virgo: wheat sways, robe stars drift up
            o.rot = 0.015 * s(t / 520);
            if (draw) {
                for (let k = 0; k < 5; k++) {
                    const u = ((t / 1400 + k / 5) % 1);
                    ctx.globalAlpha = 0.6 * Math.sin(u * Math.PI);
                    ctx.fillStyle = '#e0ffc0';
                    ctx.fillRect(Math.round(x - 14 + k * 7), Math.round(y + 30 - u * 40), 1, 1);
                }
                const [wx, wy] = emitAt(5, 'wheat', x, y);
                if (Math.floor(t / 200) % 5 === 0) glow(ctx, wx, wy, 8, '200,240,140', 0.6);
                ctx.globalAlpha = 1;
            }
            break;
        case 6: // Libra: the pans bob against each other
            o.rot = 0.05 * s(t / 500);
            break;
        case 7: // Scorpius: the tail sways, the stinger twitches
            o.rot = 0.012 * s(t / 600);
            if (draw && Math.floor(t / 150) % 7 === 0) {
                const [sx, sy] = emitAt(7, 'sting', x, y);
                glow(ctx, sx, sy, 8, '255,96,90', 0.7);
            }
            break;
        case 8: // Sagittarius: paces on the spot
            o.dx = 2 * Math.round(s(t / 220));
            o.dy = -Math.abs(s(t / 220)) * 2;
            break;
        case 9: // Capricornus: slow rise and fall, the fish tail sweeps
            o.dy = 4 * s(t / 600);
            o.rot = 0.02 * s(t / 300);
            break;
        case 10: // Aquarius: water drips from the urn lip
            if (draw) {
                const [ux, uy] = emitAt(10, 'urn', x, y);
                for (let k = 0; k < 3; k++) {
                    const u = ((t / 700 + k / 3) % 1);
                    ctx.globalAlpha = 1 - u;
                    ctx.fillStyle = '#6ec8ff';
                    ctx.fillRect(Math.round(ux - 6), Math.round(uy + 2 + u * u * 70), 1, 2);
                }
                ctx.globalAlpha = 1;
            }
            break;
        case 11: // Pisces: the fish nose about
            o.dx = 3 * s(t / 340);
            o.dy = 2 * s(t / 260);
            o.pdx = 3 * s(t / 340 + 1.5);
            o.pdy = 2 * s(t / 260 + 2);
            break;
    }
    return o;
}

// The strike frame, transformed, with its glow and edge; `clip` limits it to a polygon.
function figure(ctx, sign, x, y, { partner = false, rot = 0, sx = 1, alpha = 1, flash = 0, edge = SIGN_RIM[sign], clip } = {}) {
    const key = `sign-${sign}${partner ? 'b' : ''}-1`;
    ctx.save();
    if (clip) {
        ctx.beginPath();
        clip.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.clip();
    }
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sx, 1);
    ctx.translate(-x, -y);
    if (!clip) glow(ctx, x, y, 46, rgb(SIGN_RIM[sign].slice(1)), 0.22 * alpha);
    art.drawEdge(ctx, 'rift', key, x, y, edge, 0.75 * alpha);
    art.draw(ctx, 'rift', key, x, y, { alpha, flash });
    ctx.restore();
}
function keyStar(ctx, sign, x, y, t) {
    const [kx, ky] = SIGN_KEY[sign];
    const on = Math.floor(t / 160) % 3 !== 0;
    ctx.fillStyle = on ? '#ffffff' : SIGN_RIM[sign];
    ctx.fillRect(Math.round(x + kx) - 2, Math.round(y + ky), 5, 1);
    ctx.fillRect(Math.round(x + kx), Math.round(y + ky) - 2, 1, 5);
}
function playerShot(ctx, t, at, [tx, ty]) {
    const u = (t - (at - 250)) / 250;
    if (u < 0 || u >= 1) return;
    const px = lerp(PILOT.x + 10, tx, u),
        py = lerp(PILOT.y, ty, u);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(Math.round(px) - 3, Math.round(py), 5, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(px) + 1, Math.round(py), 2, 1);
}

// Hurt: the flinch away from the hit, plus each sign's own reaction (0..1, eased out).
function hurtPose(sign, h) {
    const e = Math.sin(Math.min(1, h) * Math.PI) * (1 - h * 0.3);
    const o = { dx: 2 * e, dy: 0, rot: 0, sx: 1, pdx: 0, pdy: 0, prot: 0 };
    switch (sign) {
        case 0: o.rot = 0.07 * e; break; // head jerks up
        case 1: o.dy = -3 * Math.sin(h * Math.PI * 3) * (1 - h); break; // stamps
        case 2: o.dx = 4 * e; o.rot = 0.06 * e; o.pdx = -1.5 * e; break; // the hit twin staggers
        case 3: o.sx = 1 - 0.07 * e; break; // claws pull in to guard
        case 4: o.rot = 0.05 * e; break; // snarl
        case 5: o.rot = -0.05 * e; break; // turns away
        case 6: o.rot = 0.1 * Math.sin(h * 14) * (1 - h); break; // the beam rocks
        case 7: o.rot = -0.04 * e; o.sx = 1 - 0.04 * e; break; // tail curls in
        case 8: o.rot = 0.12 * e; o.dy = -3 * e; break; // rears
        case 9: o.dy = 7 * e; break; // ducks
        case 10: o.rot = 0.05 * e; break; // water spills (drawn below)
        case 11: o.dx = 0; o.pdx = 2 * e; o.pdy = 12 * e; break; // the hit fish (the lower) darts aside
    }
    return o;
}

function statesTile(sign) {
    const [x0, y0] = STAGE[sign],
        pAt = PARTNER_AT[sign];
    const draw = (ctx, t, clock) => {
        const d = dragon(ctx, clock, { mouth: t < FORM, out: t < ST.breakAt + 250 ? 1 << sign : 0, time: t });
        pilot(ctx, t);
        if (t < FORM) {
            drawCreature(ctx, art, { slot: sign, x: x0, y: y0, state: 0, r: ease(t / FORM) }, clock, t);
            if (pAt) drawCreature(ctx, art, { slot: sign, x: x0 + pAt[0], y: y0 + pAt[1], state: 0, r: ease(t / FORM) }, clock, t, 1, true);
            return d;
        }
        const hurt = clamp01((t - ST.hurtAt) / 550);
        const hurting = t >= ST.hurtAt && hurt < 1;
        const o = idle(ctx, sign, t, x0, y0, false);
        if (hurting) {
            const h = hurtPose(sign, hurt);
            for (const k of Object.keys(h)) o[k] += k === 'sx' ? h[k] - 1 : h[k];
        }
        const x = x0 + o.dx,
            y = y0 + o.dy;
        const [hx, hy] = HURT_AT[sign];
        playerShot(ctx, t, ST.hurtAt, [x0 + hx, y0 + hy]);
        const [kx, ky] = SIGN_KEY[sign];
        playerShot(ctx, t, ST.breakAt, [x0 + kx, y0 + ky]);
        if (t < ST.breakAt) {
            // Pisces: the cord between the fish ripples.
            if (sign === 11) {
                ctx.strokeStyle = '#8a80d0';
                ctx.globalAlpha = 0.6;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(x + 26, y);
                ctx.quadraticCurveTo(x + 50 + 8 * Math.sin(t / 200), y + 30, x0 + pAt[0] + o.pdx + 26, y0 + pAt[1] + o.pdy);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            }
            // Gemini: a thread of light between the twins' hands.
            if (sign === 2) {
                const [ax, ay] = emitAt(2, 'hand', x, y),
                    [bx, by] = emitAt(2, 'b_hand', x0 + pAt[0] + o.pdx, y0 + pAt[1]);
                ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t / 150);
                ctx.strokeStyle = '#8cdcff';
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            const fl = hurting ? 0.45 * Math.max(0, 1 - hurt * 4) : 0;
            const edge = hurting && hurt < 0.45 && Math.floor(hurt * 12) % 2 === 0 ? '#ffffff' : SIGN_RIM[sign];
            const hitPartner = sign === 11; // the lower fish takes the hit in Pisces
            figure(ctx, sign, x, y, { rot: o.rot, sx: o.sx, flash: hitPartner ? 0 : fl, edge: hitPartner ? SIGN_RIM[sign] : edge });
            if (pAt) figure(ctx, sign, x0 + pAt[0] + o.pdx, y0 + pAt[1] + o.pdy, { partner: true, rot: o.prot, flash: hitPartner ? fl : 0, edge: hitPartner ? edge : SIGN_RIM[sign] });
            idle(ctx, sign, t, x0, y0, true);
            keyStar(ctx, sign, x, y, t);
            if (t >= ST.hurtAt) {
                // Stars spill from the hit point and fall away.
                const u = clamp01((t - ST.hurtAt) / 900),
                    r = seeded(sign);
                if (u < 1)
                    for (let k = 0; k < 9; k++) {
                        const a = Math.PI + (r() - 0.5) * 2.2,
                            v = 18 + r() * 26;
                        ctx.globalAlpha = 1 - u;
                        ctx.fillStyle = k % 3 ? SIGN_RIM[sign] : '#ffffff';
                        ctx.fillRect(Math.round(x0 + hx + Math.cos(a) * v * u), Math.round(y0 + hy + Math.sin(a) * v * u + 20 * u * u), 1, 1);
                    }
                if (u < 0.25) flash(ctx, x0 + hx, y0 + hy, u * 4, '255,255,255');
                // Aquarius spills water from the urn when hit.
                if (sign === 10 && u < 1) {
                    const [ux, uy] = emitAt(10, 'urn', x, y);
                    for (let k = 0; k < 6; k++) {
                        ctx.globalAlpha = 1 - u;
                        ctx.fillStyle = '#6ec8ff';
                        ctx.fillRect(Math.round(ux - 8 - k * 2), Math.round(uy + u * 60 + k * 5), 1, 2);
                    }
                }
                ctx.globalAlpha = 1;
            }
            return d;
        }
        breakFigure(ctx, sign, t - ST.breakAt, x0, y0, pAt, clock);
        return d;
    };
    return draw;
}

// Break: the key star flares, cracks run out from it along the figure for 250 ms, then the
// figure comes apart (shards, or two halves for the crab and the sea-goat); a sign's first
// part (horns, sting, bow...) leaves 250 ms ahead of the rest. Its stars stream back to the
// ring, dim.
function breakFigure(ctx, sign, b, x, y, pAt, clock) {
    const [kx, ky] = SIGN_KEY[sign];
    const K = [x + kx, y + ky],
        R = 220;
    const r = seeded(sign + 40);
    let pieces;
    if (SPLIT[sign])
        pieces = [
            { poly: [[x - R, y - R], [x + 2, y - R], [x - 2, y + R], [x - R, y + R]], dir: Math.PI, first: false },
            { poly: [[x + 2, y - R], [x + R, y - R], [x + R, y + R], [x - 2, y + R]], dir: 0, first: false },
        ];
    else {
        const N = 7,
            off = r() * TAU,
            cuts = [...Array(N).keys()].map((k) => off + (k / N) * TAU + (r() - 0.5) * 0.4);
        const firstPts = (BREAK_FIRST[sign] ?? []).map((n) => emitAt(sign, n, x, y));
        pieces = cuts.map((a, k) => {
            const a2 = cuts[(k + 1) % N] + (k === N - 1 ? TAU : 0),
                mid = (a + a2) / 2;
            const poly = [K, ...[a, mid, a2].map((q) => [K[0] + Math.cos(q) * R, K[1] + Math.sin(q) * R])];
            const first = firstPts.some(([px, py]) => {
                let q = Math.atan2(py - K[1], px - K[0]);
                while (q < a) q += TAU;
                return q <= a2;
            });
            return { poly, dir: mid, first };
        });
    }
    const crack = clamp01(b / 250);
    // The pieces.
    pieces.forEach((p, i) => {
        const start = p.first ? 250 : 500;
        const u = clamp01((b - start) / 1100);
        if (u >= 1) return;
        const gravity = sign === 6 && p.first ? 60 : 18;
        const dx = Math.cos(p.dir) * ease(u) * (p.first ? 46 : 26),
            dy = Math.sin(p.dir) * ease(u) * (p.first ? 46 : 26) + gravity * u * u;
        const spin = (i % 2 ? 1 : -1) * 0.35 * u;
        ctx.save();
        ctx.translate(dx, dy);
        const cx = K[0] + Math.cos(p.dir) * 30,
            cy = K[1] + Math.sin(p.dir) * 30;
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.translate(-cx, -cy);
        const wink = u > 0.6 && Math.floor(b / 70) % 2 ? 0.4 : 1;
        figure(ctx, sign, x, y, { clip: p.poly, alpha: (1 - u) * wink, flash: b < 200 ? 0.45 * (1 - b / 200) : 0 });
        if (pAt) figure(ctx, sign, x + pAt[0], y + pAt[1], { partner: true, clip: p.poly, alpha: (1 - u) * wink });
        ctx.restore();
    });
    // The cracks and the flare.
    if (crack < 1 || b < 400) {
        glow(ctx, K[0], K[1], 12 + 30 * crack, '255,255,255', 0.8 * (1 - clamp01((b - 250) / 300)));
        ctx.globalAlpha = 1 - clamp01((b - 250) / 200);
        ctx.fillStyle = '#ffffff';
        for (const p of pieces) {
            const [ex, ey] = p.poly[1];
            const n = Math.round(80 * crack);
            for (let s = 0; s < n; s += 1) {
                const f = s / 220;
                ctx.fillRect(Math.round(lerp(K[0], ex, f) + Math.sin(s * 0.7) * 1.2), Math.round(lerp(K[1], ey, f)), 1, 1);
            }
        }
        ctx.globalAlpha = 1;
    }
    // Sign extras.
    const e = clamp01((b - 250) / 900);
    if (sign === 1 && e > 0 && e < 1)
        for (let k = 0; k < 7; k++) {
            const a = (k / 7) * TAU,
                [ex, ey] = emitAt(1, 'eye', x, y);
            spark(ctx, ex + Math.cos(a) * e * 50, ey + Math.sin(a) * e * 50, '#ffbe6e', 1);
        }
    if (sign === 4 && e > 0 && e < 1) {
        const [nx, ny] = emitAt(4, 'mane', x, y);
        ctx.globalAlpha = 1 - e;
        for (let k = 0; k < 14; k++) band(ctx, nx + Math.cos((k / 14) * TAU) * (16 + e * 40), ny + Math.sin((k / 14) * TAU) * (16 + e * 40), (k / 14) * TAU, 6, 1, '#ffd25a');
        ctx.globalAlpha = 1;
    }
    if (sign === 10 && e > 0 && e < 1) {
        const [ux, uy] = emitAt(10, 'urn', x, y);
        for (let k = 0; k < 10; k++) {
            ctx.globalAlpha = 0.7 * (1 - e);
            ctx.fillStyle = '#6ec8ff';
            ctx.fillRect(Math.round(ux - 14 + k * 3), Math.round(uy + e * e * 120 + (k % 3) * 6), 1, 2);
        }
        ctx.globalAlpha = 1;
    }
    if ((sign === 2 || sign === 11) && b < 500) {
        // The thread (Gemini) or the cord (Pisces) snaps: two ends whip apart.
        const A = sign === 2 ? emitAt(2, 'hand', x, y) : [x + 26, y],
            B = sign === 2 ? emitAt(2, 'b_hand', x + pAt[0], y + pAt[1]) : [x + pAt[0] + 26, y + pAt[1]];
        const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2],
            u = b / 500;
        ctx.globalAlpha = 1 - u;
        ctx.strokeStyle = sign === 2 ? '#8cdcff' : '#aaa0ff';
        ctx.beginPath();
        ctx.moveTo(...A);
        ctx.quadraticCurveTo(M[0] + 20 * u, M[1] - 10 * u, lerp(M[0], A[0], u), lerp(M[1], A[1], u) - 6);
        ctx.moveTo(...B);
        ctx.quadraticCurveTo(M[0] + 20 * u, M[1] + 10 * u, lerp(M[0], B[0], u), lerp(M[1], B[1], u) + 6);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    // The stars go home, dim.
    const home = clamp01((b - 550) / 900);
    if (home > 0 && home < 1) {
        const [rx, ry] = ringPoint(sign, clock);
        for (let k = 0; k < 14; k++) {
            const sx = x + (r() - 0.5) * 100,
                sy = y + (r() - 0.5) * 70;
            const u = ease(clamp01(home * 1.3 - k / 40));
            ctx.globalAlpha = 0.55 * (1 - u * 0.5);
            ctx.fillStyle = SIGN_RIM[sign];
            ctx.fillRect(Math.round(lerp(sx, rx, u)), Math.round(lerp(sy, ry, u) - Math.sin(u * Math.PI) * 20), 1, 1);
        }
        ctx.globalAlpha = 1;
    }
}
const STATES = [
    'Hold: paws the ground (dust from the hooves), head dips. Hurt: head jerks up. Break: the horns snap off first.',
    'Hold: snorts from the muzzle. Hurt: stamps. Break: the star knot scatters as seven sparks.',
    'Hold: the twins sway out of step, a thread of light between their hands. Hurt: the hit twin staggers. Break: both shatter, the thread snaps.',
    'Hold: shuffles sideways, claws working. Hurt: claws pull in to guard. Break: the shell splits down the middle.',
    'Hold: mane ripples, slow breath. Hurt: a snarl. Break: the mane bursts outward as rays.',
    'Hold: wheat sways, robe stars drift up. Hurt: turns away. Break: the wheat ear falls first.',
    'Hold: the pans bob. Hurt: the beam rocks. Break: the pans drop away first.',
    'Hold: the tail sways, the sting twitches. Hurt: the tail curls in. Break: the tail comes apart from the tip.',
    'Hold: paces on the spot. Hurt: rears. Break: the bow goes first.',
    'Hold: slow rise and fall, the tail sweeps. Hurt: ducks. Break: goat and fish tail part.',
    'Hold: water drips from the urn. Hurt: water spills. Break: the urn shatters, its water falls harmlessly.',
    'Hold: the fish nose about, the cord ripples. Hurt: the hit fish darts aside. Break: the cord snaps, the fish fall apart.',
];

// ---------------------------------------------------------------- the page
const NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpius', 'Sagittarius', 'Capricornus', 'Aquarius', 'Pisces'];
const WHAT = [
    'Summoned from the ring; light gathers on its horns, a lane from the ram to the edge, then it charges all the way across and off the screen.',
    'Aldebaran kindles and sweeps a red eye beam; then the bull stampedes the whole field, bursting its star knot as it passes you.',
    'The twins take the rows either side of you; light gathers in their hands and two beams cross from them; they step closer and fire again.',
    'Its claws shoot out on tethers down two warned lanes at your column, then snap back.',
    'Roar: the mane flares and the head shudders, then the ring (one notch). Three suns bud from the mane and are tossed off one by one. Only then the crouch, eye glint and warned lane, and the pounce all the way across.',
    'She throws four seeds from her hand; each sprouts and fires one needle; then Spica is flung as a nova star.',
    'The beam tips and the field tilts; weights drop from the pans.',
    'Everything leaves the sting at the tip: the tail cocks while venom gathers, a venom beam whips an arc, then the sting itself is fired and homes in.',
    'Three aim lines from the arrowhead, then two volleys down them.',
    'A short, hard dive; a big splash (flash, spray column, ripples) while the fan of lanes flickers; two waves of stars burst out in every direction, each with a gap; it leaps back up.',
    'The urn pours a wavering stream; each droplet hangs, fuses (motes spiral in, blue to white to gold under a closing ring) and bursts into six sparks.',
    'The fish part as wide as the field allows, the slack cord harmless: slip between them. They turn, close in, and the cord pulls taut and lights: the gap is filled, go round the outside.',
];
const DRAGON = [
    ['Eye lasers', D.eyes, 'Its eye kindles; aim lines; a beam sweeps a short arc toward you.'],
    ['Fireballs', D.fireballs, 'The jaws glow; three slow fireballs, each splitting into five embers.'],
    ['Nova stars', D.novas, 'Its claws fling stars to marked spots; each counts down and bursts, one gap in its ring.'],
    ['Black hole', D.blackhole, 'The pearl flings a singularity well away from you: a gentle pull (full thrust escapes) that swallows your shots.'],
    ['Meteor fall', D.meteors, 'The tail fan flares and flicks five meteors down curved, pre-drawn paths.'],
    ['Constellation net', D.net, 'Three ring stars kindle and join; the lines turn lethal for 1.5 s, always with room outside.'],
    ['Starfire breath', D.breath, 'Three lanes from the jaws (as now), with the charge glow at the mouth.'],
    ['Phase 3: three signs at once', D.phase3, 'A charger, a ranged sign and a field sign, thrown 1.2 s apart, while the dragon keeps up its fireballs.'],
];
const LOOP = 4600;
const tiles = [];
const root = document.getElementById('tiles');
function addTile(group, title, text, draw, loop = LOOP) {
    let section = document.getElementById(group);
    if (!section) {
        section = document.createElement('section');
        section.id = group;
        section.innerHTML = `<h2>${group}</h2><div class="grid"></div>`;
        root.append(section);
    }
    const fig = document.createElement('figure'),
        canvas = document.createElement('canvas'),
        cap = document.createElement('figcaption');
    canvas.width = W;
    canvas.height = H;
    cap.innerHTML = `<b></b><p></p>`;
    cap.querySelector('b').textContent = title;
    cap.querySelector('p').textContent = text;
    fig.append(canvas, cap);
    section.querySelector('.grid').append(fig);
    tiles.push({ ctx: canvas.getContext('2d'), draw, loop, title });
}
NAMES.forEach((name, k) => addTile('The twelve signs', `${name}`, WHAT[k], S[k], Math.max(LOOP, S[k].loop)));
NAMES.forEach((name, k) => addTile('Creature states', `${name}`, STATES[k], statesTile(k), ST.loop));
for (const [name, draw, text] of DRAGON) addTile('The Zodiarch itself', name, text, draw, name.startsWith('Phase') ? 7200 : name === 'Black hole' ? 5600 : LOOP);

function frame(now) {
    for (const tile of tiles) {
        const t = now % tile.loop,
            clock = 4 + Math.sin(now / 9000) * 0.25;
        tile.ctx.imageSmoothingEnabled = false;
        backdrop(tile.ctx);
        dragonDraw = true;
        tile.draw(tile.ctx, t, clock);
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.storyboardReady = true;
// Exposed for frame export: draw a tile at a given time onto a canvas.
window.drawTileAt = (index, t) => {
    const tile = tiles[index];
    backdrop(tile.ctx);
    tile.draw(tile.ctx, t, 4);
    return tile.ctx.canvas;
};
window.tileCount = () => tiles.length;
