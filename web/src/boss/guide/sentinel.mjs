// The field guide: Sentinel (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, HAZARD, SHOT } from '../scene.mjs';

export default {
    kind: 0,
    death: 'Plates blast off in four directions, the bare eye overloads to white, then the spikes and shell go up.',
    mechanic:
        'An armoured eye on a rail: it slides after you and its pupil follows you. Between attacks its plates stand apart, the eye is wide and its rim is lit: that is the window. Each attack starts with a tell (the eye narrows, the brows drop, the plates shiver and close) and is warned from the eye, with light in the seams. Its plate throw leaves the eye bare while the plates are out; in phase 3 it sheds its plates and the eye stays open, but it attacks faster.',
    attacks: [
        {
            id: ATTACK.lance,
            name: 'Lance',
            phase: 1,
            at: 700,
            tell: 'Dashed amber lane, 900 ms',
            text: 'Locks your height, then fires a 320 ms beam along the lane.',
            counter: 'Leave the lane before the dashes flash white.',
            release: ['live', HAZARD.lane],
        },
        {
            id: ATTACK.fan,
            name: 'Fan',
            phase: 1,
            at: 650,
            tell: 'Dotted arc, 700 ms',
            text: 'Three needles spread ±0.28 rad toward where you stood.',
            counter: 'Step off the centre line; the gaps between needles are wide.',
            release: ['shot', SHOT.needle],
        },
        {
            id: ATTACK.volley,
            name: 'Needle volley',
            phase: 2,
            at: 1000,
            tell: 'Thin aim line, 600 ms',
            text: 'Five slow needles, each aimed where you are when it leaves.',
            counter: 'Strafe; standing still means every one connects.',
            release: ['shot', SHOT.needle],
        },
        {
            id: ATTACK.cross,
            name: 'Cross lance',
            phase: 2,
            at: 750,
            tell: 'Two dashed lanes, 900 ms',
            text: 'A horizontal and a vertical lane at once, crossing away from you.',
            counter: 'Take the quadrant you are in; do not run for the crossing.',
            release: ['live', HAZARD.lane],
        },
        {
            id: ATTACK.plateThrow,
            name: 'Plate throw',
            phase: 1,
            at: 1300,
            tell: 'The plates facing you glow and their loops are drawn, 600 ms',
            text: 'Two plates (four from phase 2) fly out as spinning boomerangs and come back. They hurt to touch and stop shots, but while they are out the eye is bare.',
            counter: 'Stay level with the eye, between the loops, and shoot it.',
        },
    ],
};
