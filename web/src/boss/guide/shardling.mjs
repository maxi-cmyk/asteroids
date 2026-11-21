// The field guide: Shardling (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, SHOT } from '../scene.mjs';

export default {
    kind: 7,
    death: 'The three blades spin off in different directions while the core shrinks and pops.',
    mechanic:
        'Three orbiting blades shield the core from straight shots; it kites in between bursts.',
    attacks: [
        {
            id: ATTACK.shards,
            name: 'Three-shard burst',
            phase: 1,
            at: 750,
            tell: 'Red aim line, 500 ms',
            text: 'Three fast shards down the locked line while it kites close.',
            counter: 'Sidestep, then shoot while it retreats.',
            release: ['shot', SHOT.fast],
        },
    ],
};
