// The field guide: Cinderforge (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, HAZARD, SHOT } from '../scene.mjs';

export default {
    kind: 2,
    death: 'Its doors blow off, its arms fall away, and the kiln splits down the middle on a column of fire, then embers rain.',
    mechanic:
        'A furnace golem. Shots glance off its shell; the laser reaches the core at half. Every attack lights a heat lamp on its belt, and at five it must vent: its chest doors burst open and the core is bare for about 3.5 s while it cools. Hit it hard then. Its fire stays: pools and geysers burn down into scorched ground.',
    attacks: [
        {
            id: ATTACK.lob,
            name: 'Ladle',
            phase: 1,
            at: 2200,
            tell: 'The ladle scoops and swings over; a ring on the floor, 1.2 s',
            text: 'A blob of molten metal lands on the ring (two from phase 2) and leaves a pool for 4 s, which burns down into scorched ground that burns whoever stands in it (a hit every 0.8 s) for another 6 s.',
            counter:
                'Move off the ring and stay off the scorch. Shooting the blob splits it into slow embers and cancels the pool.',
            release: ['live', HAZARD.pool],
        },
        {
            id: ATTACK.ember,
            name: 'Bellows blast',
            phase: 1,
            at: 900,
            tell: 'A long breath in, embers drawn into the furnace, the cone marked, 800 ms',
            text: 'Nine embers breathed out of the furnace mouth in a 40° cone at you.',
            counter: 'Leave the cone while it breathes in, or slip between the embers.',
            release: ['shot', SHOT.ember],
        },
        {
            id: ATTACK.hammer,
            name: 'Hammer',
            phase: 1,
            at: 1000,
            tell: 'The hammer goes up overhead; a full-height column marked, 900 ms',
            text: 'The hammer comes down and a column of fire falls on the mark: two strikes (three from phase 2), the first on your column, the next 70–110 px along. Each leaves a scorch on the floor.',
            counter: 'Step out of the column, then read where the next one is marked.',
            release: ['live', HAZARD.lane],
        },
        {
            id: ATTACK.geyser,
            name: 'Geysers',
            phase: 2,
            at: 1600,
            tell: 'It drives its flame into the floor; rings and rising lanes, 900 ms each',
            text: 'Four geysers burst up one after another along the floor from the golem toward you, each leaving a scorch at its base.',
            counter: 'Go over them or back past the first; keep clear of the glowing patches.',
            release: ['live', HAZARD.lane],
        },
        {
            id: ATTACK.barrage,
            name: 'Ladle barrage',
            phase: 3,
            at: 2200,
            tell: 'The ladle swings over; three rings on the floor, 1.2 s',
            text: 'Three blobs at once in a spread around you; each leaves a pool, then a scorch.',
            counter: 'Find the gap between the rings, or shoot a blob down to cancel its pool.',
            release: ['live', HAZARD.pool],
        },
        {
            id: ATTACK.vent,
            name: 'Vent',
            phase: 1,
            at: 1500,
            tell: 'Five lamps lit, white and blinking; steam, the core swelling, 1 s',
            text: 'Its doors burst open and a ring of heat with one 60° gap rolls out. Then the core is bare for about 3.5 s, white-hot and cooling, before the doors close and the lamps go out.',
            counter: 'Sit in the gap, then pour everything into the core.',
            release: ['live', HAZARD.ring],
        },
    ],
};
