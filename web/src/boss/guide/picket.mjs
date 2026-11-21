// The field guide: Picket (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, HAZARD } from '../scene.mjs';

export default {
    kind: 6,
    death: 'Splits top and bottom with a last flick of its lance.',
    mechanic: 'Shutters part only between attacks.',
    attacks: [
        {
            id: ATTACK.lance,
            name: 'Lance',
            phase: 1,
            at: 700,
            tell: 'Dashed amber lane, 900 ms',
            text: 'The Sentinel lance on its own.',
            counter: 'Leave the lane.',
            release: ['live', HAZARD.lane],
        },
    ],
};
