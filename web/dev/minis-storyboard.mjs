// The minis storyboard (nextSteps.md P4.6): each mini borrows its boss's new motion or tell,
// with no new attacks. A mock-up for approval; the drawing lives in p4-storyboard/minis.mjs.
import { addTile, start } from './p4-storyboard/page.mjs';
import { sky } from './p4-storyboard/kit.mjs';
import { picket, shardling, cinderling, gunnery, moonjelly } from './p4-storyboard/minis.mjs';

addTile(
    'Minis',
    'Picket',
    'Its eye follows you inside the gate, as the Sentinel’s does, and narrows before it fires.',
    picket,
    8000,
    sky('frontier'),
);
addTile(
    'Minis',
    'Shardling',
    'Its three blades orbit on a ring that tilts and wobbles, like the Ringwarden’s.',
    shardling,
    8000,
    sky('violet'),
);
addTile(
    'Minis',
    'Cinderling',
    'A small furnace golem that heats with each attack and vents, its core bare. It follows whichever Cinderforge body is chosen.',
    cinderling,
    6000,
    sky('ember'),
);
addTile(
    'Minis',
    'Gunnery',
    'It banks as it turns, with an engine trail behind it, like the Bastion. (Its weak point stays as it is: no flank engines on a ship this small.)',
    gunnery,
    9400,
    sky('ruins'),
);
addTile(
    'Minis',
    'Moonjelly',
    'It swims in pulses like the Tidecaller: contract, glide, relax.',
    moonjelly,
    6400,
    sky('lunar'),
);
start();
