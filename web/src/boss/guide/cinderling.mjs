// The field guide: Cinderling (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, HAZARD } from '../scene.mjs';

export default {
    kind: 8,
    death: 'Cracks open, vents fire all round, then it bursts into embers.',
    mechanic: 'Its core shows for 2 s after each lob.',
    attacks: [
        {
            id: ATTACK.lob,
            name: 'Flare lob',
            phase: 1,
            at: 900,
            tell: 'Pink ring on the floor, 1.2 s',
            text: 'One plasma lob and one pool at a time.',
            counter: 'Move off the ring, then hit the open core.',
            release: ['live', HAZARD.pool],
        },
    ],
};
