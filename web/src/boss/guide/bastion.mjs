// The field guide: Bastion (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, HAZARD, SHOT } from '../scene.mjs';

export default {
    kind: 3,
    death: 'Chain explosions walk from nose to stern, the guns fall away, its engines blow, and the hull breaks in two.',
    mechanic:
        'Its engines, on outriggers above and below the stern, are where it is hurt; the hull turns shots away, and hits count double while the engines blaze on a ramming run. Its three guns (nose cannon, missile pods, aft battery) take hits of their own, and knocking one out silences its attack. At half health it loses the engine that took more hits, and the guns come back.',
    attacks: [
        {
            id: ATTACK.cannon,
            name: 'Nose cannon',
            phase: 1,
            at: 450,
            tell: 'Red aim line, 500 ms',
            text: 'One turret (two in the second phase) fires a 3.0 bolt along its line.',
            counter: 'Step off the line when it appears. Silence it by knocking out the cannon.',
            release: ['shot', SHOT.bolt],
        },
        {
            id: ATTACK.missile,
            name: 'Missiles',
            phase: 1,
            at: 1700,
            tell: 'A lock-on reticle settles on you, 600 ms; the tubes flash',
            text: 'Two (then three) missiles, 1.4 px/tick, turning 0.04 rad/tick, 4 s fuse; their smoke shows how they turned.',
            counter:
                'Outrun them or shoot them: two hits each. Knock out the pods to silence them.',
            release: ['shot', SHOT.missile],
        },
        {
            id: ATTACK.ram,
            name: 'Ramming run',
            phase: 1,
            at: 1600,
            tell: 'It rises to a lane, bow on, engines flaring; the lane marked edge to edge, 1.2 s',
            text: 'It crosses the whole field along the lane on your half, its engines blazing, leaving a wake of debris that drifts for 2.5 s, then comes back in from the right.',
            counter:
                'Cross to the other half. Its engines are blazing all the way: hits on them count double.',
            release: ['live', HAZARD.lane],
        },
        {
            id: ATTACK.broadside,
            name: 'Broadside',
            phase: 2,
            at: 1700,
            tell: 'Dotted arc along the hull, 800 ms',
            text: 'Every small turret fires in sequence along the hull.',
            counter:
                'Hold the gap between neighbouring shots. Knock out the aft battery to silence it.',
            release: ['shot', SHOT.needle],
        },
    ],
};
