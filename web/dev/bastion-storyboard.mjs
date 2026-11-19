// Bastion storyboard (nextSteps.md P4.4): the engines as its weak point, sailing, the ramming
// run, the new missiles and damage you can see. A mock-up for approval; the drawing lives in
// p4-storyboard/bastion/.
import { addTile, start } from './p4-storyboard/page.mjs';
import { sky } from './p4-storyboard/kit.mjs';
import {
    engines,
    ENGINE_MS,
    sailing,
    SAIL_MS,
    ramming,
    RAM_MS,
    missiles,
    MISSILE_MS,
    damage,
    DAMAGE_MS,
} from './p4-storyboard/bastion/tiles.mjs';

const bg = sky('ruins');
addTile(
    'Its weak point: the engines',
    'Engines on its flanks',
    'An engine on each flank, its intake to the bow and its nozzle to the stern, with an exhaust trail streaming behind. Shots into an engine burst: that is where it is hurt. The hull and the guns turn shots away; the guns are still worth hitting, since knocking one out silences its attack.',
    engines,
    ENGINE_MS,
    bg,
);
addTile(
    'It sails',
    'Banking',
    'It banks into its turns. While it turns the engines flare and the trails stretch out and bend through the turn, so a turning ship is the most exposed. (The trails stay in space where the exhaust left them, which makes its route easy to read.)',
    sailing,
    SAIL_MS,
    bg,
);
addTile(
    'Ramming run (new)',
    'Across the field',
    'It rises to a lane, bow on, and the lane is marked edge to edge (1200 ms). Then it crosses the whole field with its engines blazing, leaving a wake of debris that drifts in the lane for a few seconds, and comes back in from the right. It replaces the mines; the other half of the field is always clear.',
    ramming,
    RAM_MS,
    bg,
);
addTile(
    'New missiles',
    'Lock-on, launch, smoke',
    'A reticle settles on you before launch. Each tube flashes with a puff of smoke. The missile has a slim body with fins, a white-hot nose, a coloured flame and a smoke trail that fades behind it, showing how it turned. Shot down, it bursts into hot fragments.',
    missiles,
    MISSILE_MS,
    bg,
);
addTile(
    'Damage you can see',
    'Holes, smoke, a list',
    'A lost gun leaves a smoking hole and the ship lists. A lost engine smokes and has no trail; the ship lists further and drifts more slowly.',
    damage,
    DAMAGE_MS,
    bg,
);
start();
