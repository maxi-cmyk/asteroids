// The Zodiarch's constants the renderer shares with the engine (nextSteps.md R7 M7): the signs,
// each creature's key star, emitters and charge colour, hazard styles, the ring and the head's
// points. Re-exported by src/boss/scene.mjs.

// The zodiac, in ring order (the Zodiarch's sign index = slot of a sign part).
export const SIGNS = Object.freeze([
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
]);
// Each creature's key star (its weak point), from its centre; mirrors SIGN_KEY in warden.h.
export const SIGN_KEY = Object.freeze([
    [-34, -7],
    [-38, 5],
    [1, -33],
    [4, 17],
    [-20, -6],
    [-48, -42],
    [-45, 17],
    [-2, 14],
    [-54, -26],
    [55, 4],
    [17, -21],
    [10, 2],
]);
// Where each creature's attacks come out, from its centre in the strike frame (mirrors
// SIGN_EMIT in warden.h; from tools/zodiac_myth.py EMIT_POINTS).
export const SIGN_EMIT = Object.freeze([
    { horns: [-48, 4], hooves: [-34, 38] },
    { eye: [-38, 5], muzzle: [-52, 14] },
    { hand: [-18, -58], bHand: [-28, -24] },
    { clawNear: [-50, -26], clawFar: [32, -34] },
    { mouth: [-58, -15], eye: [-48, -23], mane: [-32, -20] },
    { wheat: [-48, -42], hand: [-42, -28] },
    { panNear: [-45, 14], panFar: [45, -8] },
    { sting: [16, -25], tail: [62, 10] },
    { arrow: [-54, -26] },
    { mouth: [-52, 2], tail: [54, 4] },
    { urn: [-5, -42] },
    { mouth: [26, -2] }, // the fish art faces right
]);
// The colour each sign's charge and muzzle flash burn with (r,g,b).
export const SIGN_CHARGE = Object.freeze([
    '255,200,110',
    '255,90,70',
    '140,220,255',
    '180,232,210',
    '255,210,90',
    '200,240,140',
    '230,230,255',
    '255,96,90',
    '255,170,210',
    '160,200,255',
    '110,200,255',
    '170,160,255',
]);
// Hazard styles the Zodiarch writes into `e` (mirrors ZS_* in warden.h).
export const ZOD_STYLE = Object.freeze({
    plain: 0,
    tether: 2,
    cord: 3,
    seed: 5,
    swirl: 8,
    splash: 9,
    fish: 11,
});
// The Zodiarch's ring (centre and radii) and, for the storyboards' before-and-after, the old
// figure-of-eight swim it had before it steered itself (nextSteps.md P3.1).
export const ZODIARCH = Object.freeze({
    cx: 372,
    cy: 135,
    ax: 92,
    ay: 80,
    period: 16,
    rx: 118,
    ry: 100,
});
export const zodiarchPath = (clock) => {
    const w = (2 * Math.PI) / ZODIARCH.period;
    return [
        ZODIARCH.cx + ZODIARCH.ax * Math.sin(w * clock),
        ZODIARCH.cy + ZODIARCH.ay * Math.sin(2 * w * clock),
    ];
};
// Points on the Zodiarch's head in its left-facing frame, from its point on the trail (mirrors
// ZOD_EYE / ZOD_JAW / ZOD_BROW in zodiarch/data.h); the frame turns with `aux.heading`.
export const ZOD_HEAD = Object.freeze({ eye: [-38, -12], jaw: [-72, 3], brow: [-27, -17] });
export function zodLocal(x, y, heading, [dx, dy]) {
    const right = Math.cos(heading) > 0,
        r = right ? heading : heading - Math.PI,
        lx = right ? -dx : dx;
    return [x + lx * Math.cos(r) - dy * Math.sin(r), y + lx * Math.sin(r) + dy * Math.cos(r)];
}
