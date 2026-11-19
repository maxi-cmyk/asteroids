// Tidecaller storyboard (nextSteps.md P4.5): the bell swimming in pulses, drifting bubbles,
// bioluminescence before a stream, and the optional tides. A mock-up for approval; the
// drawing lives in p4-storyboard/tidecaller/.
import { addTile, start } from './p4-storyboard/page.mjs';
import { sky } from './p4-storyboard/kit.mjs';
import {
    pulses,
    SWIM_MS,
    bubbles,
    BUBBLE_MS,
    biolum,
    GLOW_MS,
    tides,
    TIDE_MS,
} from './p4-storyboard/tidecaller/tiles.mjs';

const bg = sky('lunar');
addTile(
    'It swims',
    'In pulses',
    'Instead of sitting still it swims like a jellyfish: the bell contracts and thrusts, glides, and relaxes, leaning toward where it goes. Its tendrils trail behind it along the path it took. The bell opens on each contraction (its core flares); to decide: whether the bare bell can only be hit then.',
    pulses,
    SWIM_MS,
    bg,
);
addTile(
    'Bubbles that drift',
    'Pushed, then popped',
    'The bubble shield stays, but the bubbles wander round the bell, each its own way, instead of riding a fixed orbit. A shot pushes a bubble away; the second pops it.',
    bubbles,
    BUBBLE_MS,
    bg,
);
addTile(
    'Bioluminescence',
    'A stream is lit before it starts',
    'Before a stream, light runs along the rim of the bell to the point it will pour from, so you can read where it comes from. Then the stream pours out from there.',
    biolum,
    GLOW_MS,
    bg,
);
addTile(
    'Tides (optional)',
    'A water level',
    'To decide here: a tide that rises and falls across the field. Under it the ship is slower, so a gap in a stream is harder to reach. It adds a second thing to watch; leave it out if the fight is busy enough.',
    tides,
    TIDE_MS,
    bg,
);
start();
