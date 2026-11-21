// The field guide: Moonjelly (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, SHOT } from '../scene.mjs';

export default {
    kind: 10,
    death: 'Dissolves in a stream of bubbles.',
    mechanic: 'Drifts in a slow figure of eight; the bell is always open.',
    attacks: [
        {
            id: ATTACK.sine6,
            name: 'Six-bulb stream',
            phase: 1,
            at: 1100,
            tell: 'Narrow dotted wedge, 600 ms',
            text: 'A six-bulb sine stream.',
            counter: 'Stay in the trough.',
            release: ['shot', SHOT.sine],
        },
    ],
};
