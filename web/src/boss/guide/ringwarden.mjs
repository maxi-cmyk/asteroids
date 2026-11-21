// The field guide: Ringwarden (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, HAZARD, SHOT } from '../scene.mjs';

export default {
    kind: 1,
    death: 'Blades shear away one by one, the core shakes, implodes to a point, and shatters into ice shards and rings.',
    mechanic:
        'Crystal blades absorb shots and break (and regrow). The two rings tilt and each has a gap; when both gaps turn in front of the core (an eclipse, the core flares) there is a clear lane straight in. The laser pierces both rings and hits the core.',
    attacks: [
        {
            id: ATTACK.burst,
            name: 'Shard burst',
            phase: 1,
            at: 1000,
            tell: 'Pulsing ring, 700 ms',
            text: 'Twelve blades tear loose and fly outward, then regrow in 3 s.',
            counter: 'Sit in the lane between two shards; the holes are the safe spots.',
            release: ['shot', SHOT.shard],
        },
        {
            id: ATTACK.prism,
            name: 'Prism beam',
            phase: 2,
            at: 1500,
            tell: 'Dotted wedge, 900 ms',
            text: 'A 10 px beam sweeps a 90° arc from the core at 0.9 rad/s. Every whole blade it crosses splits off two shards, 30° either side of it.',
            counter:
                'Break the blades on your side first and there is only the beam to dodge; leave the wedge, or run toward the core where the beam is slow.',
            release: ['live', HAZARD.beam],
        },
        {
            id: ATTACK.halo,
            name: 'Halo lock',
            phase: 2,
            at: 2400,
            tell: 'The outer ring hums and its gap is marked, 900 ms',
            text: 'The outer ring flies out to the edge of the field, linked by a ring of light, and closes back in. It has one gap, 80 px wide, which drifts as it goes.',
            counter:
                'Sit in the gap as the ring passes you on the way out, and again on the way back.',
            release: ['live', HAZARD.ring],
        },
        {
            id: ATTACK.collapse,
            name: 'Ring collapse',
            phase: 3,
            at: 2700,
            tell: 'Rings pull in, 1.2 s',
            text: 'Both rings fold into the core, then a ring wave leaves it with a 70° gap.',
            counter: 'Line up with the gap. The core is bare for 2.5 s afterward: shoot it.',
            release: ['live', HAZARD.ring],
        },
    ],
};
