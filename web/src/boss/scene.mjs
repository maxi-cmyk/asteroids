// Boss scene ABI. The engine (native/bridge.cpp) writes the legacy boss header at
// 512..524 and the detail block at BOSS_AT; everything the UI knows about a fight
// is decoded here so no other module carries magic offsets.
import { S, BOSS, BOSS_AT, SCENE_FLOATS } from '../runtime/scene-layout.mjs';
import { FOX_POSES, FOX_SMALL } from './ninefold/poses.mjs';
export { BOSS_AT, SCENE_FLOATS };
const PARTS_AT = BOSS_AT + BOSS.PARTS.at,
    PART_STRIDE = BOSS.PARTS.stride,
    PART_COUNT = BOSS.PARTS.count;
const SHOTS_AT = BOSS_AT + BOSS.SHOTS.at,
    SHOT_STRIDE = BOSS.SHOTS.stride,
    SHOT_COUNT = BOSS.SHOTS.count;
const HAZARDS_AT = BOSS_AT + BOSS.HAZARDS.at,
    HAZARD_STRIDE = BOSS.HAZARDS.stride,
    HAZARD_COUNT = BOSS.HAZARDS.count;

export const SHOT = Object.freeze({
    needle: 0,
    shard: 1,
    bolt: 2,
    sine: 3,
    pellet: 4,
    missile: 5,
    mine: 6,
    lob: 7,
    spore: 8,
    ember: 9,
    curve: 10,
    fast: 11,
    fireball: 12,
    nova: 13,
    sun: 14,
    meteor: 15,
});
export const HAZARD = Object.freeze({
    lane: 0,
    pool: 1,
    beam: 2,
    ring: 3,
    arm: 4,
    tell: 5,
    arc: 6,
    aim: 7,
    pull: 8,
    burn: 9,
});
export const PART = Object.freeze({
    blade: 0,
    panel: 1,
    hard: 2,
    bubble: 3,
    star: 4,
    sign: 6, // a zodiac creature the Zodiarch threw (slot = sign); r is how far it has formed
    tail: 7, // one of Ninefold's tails (slot = tail)
    decoy: 8, // one of Ninefold's illusions
    plate: 9, // one of the Sentinel's plates (slot = plate); state 1 warned, 2 thrown, 3 shed
    engine: 10, // one of the Bastion's engines (slot 0 top, 1 bottom); state 1 dead
});
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
// The Bastion's ramming run marks its lane with this `e` (native/boss/fights/bastion.h).
export const RAM_LANE = 20;
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
// Ninefold sitting, from its centre (every pose's points: src/boss/ninefold/poses.mjs).
export const NINEFOLD = Object.freeze({
    mark: FOX_POSES[0].mark,
    head: FOX_POSES[0].head,
    body: FOX_POSES[0].body,
    illusionScale: FOX_SMALL, // the three foxes of an illusion
});
export const ATTACK = Object.freeze({
    lance: 1,
    fan: 2,
    volley: 3,
    cross: 4,
    plateThrow: 5,
    burst: 10,
    prism: 11,
    halo: 12,
    collapse: 13,
    lob: 20,
    jets: 21,
    ember: 22,
    nova: 23,
    hammer: 24,
    barrage: 25,
    geyser: 26,
    vent: 27,
    cannon: 30,
    missile: 31,
    ram: 32, // the Bastion's ramming run (replaced the mines)
    broadside: 33,
    sine: 40,
    tendril: 41,
    spore: 42,
    pulse: 43,
    wall: 44,
    rain: 45,
    whirl: 46,
    spiral: 50,
    curve: 51,
    accrete: 52,
    pull: 53,
    ringBurst: 54,
    fanJets: 55,
    fireNova: 56,
    cloak: 57,
    bolts: 60,
    shards: 61,
    curve1: 62,
    blink: 63,
    sine6: 64,
    // The Zodiarch throws a sign: 70 Aries .. 81 Pisces.
    aries: 70,
    taurus: 71,
    gemini: 72,
    cancer: 73,
    leo: 74,
    virgo: 75,
    libra: 76,
    scorpio: 77,
    sagittarius: 78,
    capricorn: 79,
    aquarius: 80,
    pisces: 81,
    conjunction: 82,
    breath: 83,
    // The Zodiarch's own (P2.3, P3)
    eyes: 84,
    coilSpit: 85,
    novaStars: 86,
    blackHole: 87,
    meteors: 88,
    // Ninefold
    comets: 90,
    foxfire: 91,
    illusion: 92,
    foxBlink: 93,
    lunge: 94,
});

// kind order matches BossKind in native/boss/core.h: six region bosses, then their six minis.
// `phases` are the health fractions at which a new phase begins (for bar notches).
// `aux` names the slots of boss.aux the engine fills for this kind (see AUX_* in
// native/boss/fights/*.h): the painters and sound cues read them by name.
export const KINDS = Object.freeze([
    {
        id: 'sentinel',
        name: 'Sentinel',
        region: 'frontier',
        mini: false,
        size: [220, 220],
        phases: [0.6, 0.3],
        hull: null,
        aux: {
            open: 0,
            busy: 1,
            tell: 2,
            seam: 3,
            roll: 4,
            gazeX: 5,
            gazeY: 6,
            shed: 7,
            bare: 8,
        },
    },
    {
        id: 'ringwarden',
        name: 'Ringwarden',
        region: 'violet',
        mini: false,
        size: [270, 270],
        phases: [0.66, 0.33],
        hull: null,
        aux: {
            scale: 0,
            outerSpin: 1,
            innerSpin: 2,
            charging: 3,
            outerTilt: 4,
            outerAxis: 5,
            innerTilt: 6,
            innerAxis: 7,
            eclipse: 8,
            halo: 9,
            haloGap: 14,
        },
    },
    {
        id: 'cinderforge',
        name: 'Cinderforge',
        region: 'ember',
        mini: false,
        size: [300, 300],
        phases: [0.66, 0.33],
        hull: null,
        aux: {
            heat: 0,
            open: 1,
            breath: 2,
            hammer: 3,
            ladle: 4,
            core: 5,
            steam: 6,
            lamps: 7,
            flame: 9,
        },
    },
    {
        id: 'bastion',
        name: 'Bastion',
        region: 'ruins',
        mini: false,
        size: [340, 196],
        phases: [0.5],
        hull: null,
        aux: { cannon: 0, pods: 1, armour: 2, roll: 3, thrust: 4, lock: 6, lane: 7 },
    },
    {
        id: 'tidecaller',
        name: 'Tidecaller',
        region: 'lunar',
        mini: false,
        size: [230, 290],
        phases: [0.7, 0.35],
        hull: null,
        aux: { clock: 0, exposed: 2, squeeze: 3, lean: 4, rim: 5, rimTo: 6 },
    },
    {
        id: 'warden', // internal id kept from the Horizon Warden, so saves carry over
        name: 'Zodiarch',
        region: 'rift',
        mini: false,
        size: [120, 84],
        phases: [0.7, 0.35],
        hull: null,
        aux: {
            clock: 0,
            coreOpen: 1,
            section: 2,
            out: 3,
            pearlX: 4,
            pearlY: 5,
            mouth: 6,
            breath: 7,
            hold: 8,
            heading: 12,
            speed: 13,
            pearl: 14,
            mode: 15,
        },
    },
    {
        id: 'picket',
        name: 'Picket',
        region: 'frontier',
        mini: true,
        size: [150, 150],
        phases: [],
        hull: 'dart',
        aux: { open: 0, busy: 1 },
    },
    {
        id: 'shardling',
        name: 'Shardling',
        region: 'violet',
        mini: true,
        size: [170, 170],
        phases: [],
        hull: 'lancer',
        aux: { spin: 2, tilt: 5, axis: 6 },
    },
    {
        id: 'cinderling',
        name: 'Cinderling',
        region: 'ember',
        mini: true,
        size: [150, 150],
        phases: [],
        hull: 'wasp',
        aux: { glow: 0, open: 1 },
    },
    {
        id: 'gunnery',
        name: 'Gunnery',
        region: 'ruins',
        mini: true,
        size: [200, 108],
        phases: [],
        hull: 'hammer',
        aux: { firing: 0 },
    },
    {
        id: 'moonjelly',
        name: 'Moonjelly',
        region: 'lunar',
        mini: true,
        size: [150, 190],
        phases: [],
        hull: 'moth',
        aux: { clock: 0, squeeze: 1, lean: 2 },
    },
    {
        id: 'lensimp', // internal id kept from the Lens Imp, so saves carry over
        name: 'Ninefold',
        region: 'rift',
        mini: true,
        size: [250, 196],
        phases: [],
        hull: 'comet',
        aux: {
            clock: 0,
            blink: 1,
            open: 2,
            tails: 3,
            illusion: 4,
            scale: 5,
            pose: 6,
            face: 7,
            alpha: 8,
            step: 9,
        },
    },
]);
export const REGION_SHEETS = Object.freeze([
    'frontier',
    'violet',
    'ember',
    'ruins',
    'lunar',
    'rift',
]);
export const TIER_NAMES = Object.freeze(['I', 'II', 'III', 'IV']);
// Kind indices by name, in BossKind order.
export const BOSS_KIND = Object.freeze(
    Object.fromEntries(KINDS.map((kind, index) => [kind.id, index])),
);
// Index of a kind's named aux slot within the boss block (for cue tables).
export const auxField = (kind, name) => BOSS.AUX + KINDS[kind].aux[name];
export const kindName = (kind) => KINDS[kind]?.name ?? 'Boss';
export const kindForWave = (wave) => {
    if (wave >= 5 && wave % 5 === 0) return (wave / 5 - 1) % 6;
    if (wave >= 3 && wave % 5 === 3) return 6 + (((wave - 3) / 5) % 6);
    return -1;
};
export const bossNames = (mask) => KINDS.filter((_, i) => mask & (1 << i)).map((kind) => kind.name);

export function bossState(scene) {
    const at = BOSS_AT;
    return {
        active: !!scene[S.BOSS_ACTIVE],
        x: scene[S.BOSS_X],
        y: scene[S.BOSS_Y],
        health: scene[S.BOSS_HEALTH],
        maximum: scene[S.BOSS_MAXIMUM],
        stage: scene[S.BOSS_STAGE],
        wave: scene[S.BOSS_WAVE],
        kills: scene[S.BOSS_KILLS],
        kind: scene[at + BOSS.KIND],
        mini: !!scene[at + BOSS.MINI],
        tier: scene[at + BOSS.TIER],
        damage: scene[at + BOSS.DAMAGE],
        flash: scene[at + BOSS.FLASH_MS],
        attack: scene[at + BOSS.ATTACK],
        attackMs: scene[at + BOSS.ATTACK_MS],
        gate: scene[at + BOSS.GATE],
        entrance: scene[at + BOSS.ENTRANCE],
        practice: !!scene[at + BOSS.PRACTICE],
        defeated: scene[at + BOSS.DEFEATED_MASK],
        hitsTaken: scene[at + BOSS.HITS_TAKEN],
        aux: scene.subarray(at + BOSS.AUX, at + BOSS.AUX + BOSS.AUX_COUNT),
    };
}
export function bossParts(scene) {
    const out = [];
    for (let i = 0; i < PART_COUNT; i++) {
        const at = PARTS_AT + i * PART_STRIDE;
        if (scene[at])
            out.push({
                index: i,
                kind: scene[at + 1],
                x: scene[at + 2],
                y: scene[at + 3],
                r: scene[at + 4],
                hp: scene[at + 5],
                state: scene[at + 6],
                slot: scene[at + 7],
            });
    }
    return out;
}
// Parts including broken ones (the forge's panels stay on the shell once blown out).
export function bossPart(scene, index) {
    const at = PARTS_AT + index * PART_STRIDE;
    return {
        index,
        exists: !!scene[at],
        kind: scene[at + 1],
        x: scene[at + 2],
        y: scene[at + 3],
        r: scene[at + 4],
        hp: scene[at + 5],
        state: scene[at + 6],
        slot: scene[at + 7],
    };
}
// Shots stopped by a hard surface in the last second: { x, y, angle, age } (P3.3).
export function bossBlocks(scene) {
    const at = BOSS_AT + BOSS.BLOCKS.at,
        out = [];
    for (let i = 0; i < BOSS.BLOCKS.count; i++) {
        const age = scene[at + i * 4 + 3];
        if (age >= 0)
            out.push({
                x: scene[at + i * 4],
                y: scene[at + i * 4 + 1],
                angle: scene[at + i * 4 + 2],
                age,
            });
    }
    return out;
}
// The Zodiarch's body segments (x, y, r), neck first; empty for every other boss.
export function bossBody(scene) {
    const at = BOSS_AT + BOSS.BODY.at,
        out = [];
    for (let i = 0; i < BOSS.BODY.count; i++) {
        const r = scene[at + i * 3 + 2];
        if (!r) break;
        out.push({ x: scene[at + i * 3], y: scene[at + i * 3 + 1], r });
    }
    return out;
}
export function bossShots(scene) {
    const out = [];
    for (let i = 0; i < SHOT_COUNT; i++) {
        const at = SHOTS_AT + i * SHOT_STRIDE;
        if (scene[at])
            out.push({
                index: i,
                family: scene[at + 1],
                x: scene[at + 2],
                y: scene[at + 3],
                angle: scene[at + 4],
                hp: scene[at + 5],
                age: scene[at + 6],
                aux: scene[at + 7],
            });
    }
    return out;
}
export function bossHazards(scene) {
    const out = [];
    for (let i = 0; i < HAZARD_COUNT; i++) {
        const at = HAZARDS_AT + i * HAZARD_STRIDE;
        if (scene[at])
            out.push({
                index: i,
                kind: scene[at + 1],
                x: scene[at + 2],
                y: scene[at + 3],
                a: scene[at + 4],
                b: scene[at + 5],
                c: scene[at + 6],
                d: scene[at + 7],
                e: scene[at + 8],
                warn: scene[at + 9],
                warnTotal: scene[at + 10],
                live: scene[at + 11],
            });
    }
    return out;
}
