// The field guide: Gunnery (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, SHOT } from '../scene.mjs';

export default {
    kind: 9,
    death: 'Bursts run along the hull, then it snaps in two.',
    mechanic: 'No shield; shoot the bridge eye.',
    attacks: [
        {
            id: ATTACK.bolts,
            name: 'Bolt pair',
            phase: 1,
            at: 450,
            tell: 'Two red aim lines, 500 ms',
            text: 'Both forward guns fire a 3.0 bolt along their lines.',
            counter: 'Step out of both lines.',
            release: ['shot', SHOT.bolt],
        },
        {
            id: ATTACK.missile,
            name: 'Homing missile',
            phase: 1,
            at: 1500,
            tell: 'Hatch opens',
            text: 'One homing missile after the bolts.',
            counter: 'Two shots pop it.',
            release: ['shot', SHOT.missile],
        },
    ],
};
