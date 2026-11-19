// Cinderforge storyboard (nextSteps.md P4.3): three concepts to choose from, then the heat
// cycle and the attacks on the recommended one, the furnace golem. A mock-up for approval;
// the drawing lives in p4-storyboard/cinderforge/.
import { addTile, start } from './p4-storyboard/page.mjs';
import { sky } from './p4-storyboard/kit.mjs';
import {
    conceptGolem,
    conceptSmelter,
    conceptCaged,
    CONCEPT_MS,
    heatCycle,
    HEAT_MS,
} from './p4-storyboard/cinderforge/cycle.mjs';
import {
    blast,
    BLAST_MS,
    hammer,
    HAMMER_MS,
    ladle,
    LADLE_MS,
    geysers,
    GEYSER_MS,
} from './p4-storyboard/cinderforge/attacks.mjs';

const bg = sky('ember');
addTile(
    'Choose a body',
    'A: furnace golem (recommended)',
    'A kiln with a head and chimney that hovers on the flame of a bellows belly. A hammer arm faces you, a ladle arm hangs on the far side, heat lamps on its belt are the gauge, and its chest doors open on the core when it vents. Every attack below comes from a part you can see.',
    conceptGolem,
    CONCEPT_MS,
    bg,
);
addTile(
    'Choose a body',
    'B: walking smelter',
    'A crucible tank on two heavy piston legs, with a pouring spout in front. Its lid lifts to vent. It would stride and stamp, but legs do little in open space, and it has no arms to give each attack a source.',
    conceptSmelter,
    CONCEPT_MS,
    bg,
);
addTile(
    'Choose a body',
    'C: forge heart caged in chains',
    'A molten heart in a cage of iron bars, chained out of the field above and below. Its bars part to vent. It reads well and could swing on its chains, but the attacks would come from the heart alone.',
    conceptCaged,
    CONCEPT_MS,
    bg,
);
addTile(
    'The heat cycle (its weakness)',
    'Heat, vent, cool',
    'Every attack lights a lamp on its belt and it glows hotter, orange toward white. At five it must vent: its chest doors burst open, steam pours from its shoulders and chimney, and a ring of heat with one gap rolls out. Then the core is bare, white-hot and cooling, for about three seconds. Shots glance off the shell otherwise.',
    heatCycle,
    HEAT_MS,
    bg,
);
addTile(
    'Attacks (five, from parts you can see)',
    'Bellows blast',
    'Every attack starts with the bellows. For the blast it takes a long breath in: embers are drawn back into the furnace mouth and the cone it will fill is marked. Then it breathes out a cone of embers. (Replaces the ember spray.)',
    blast,
    BLAST_MS,
    bg,
);
addTile(
    'Attacks (five, from parts you can see)',
    'Hammer',
    'The anvil strikes, now from the hammer arm. The hammer goes up overhead and the column is marked (900 ms). When it comes down, a full-height column of fire falls on the mark and leaves a scorch. The second mark lands 70 to 110 px from the first.',
    hammer,
    HAMMER_MS,
    bg,
);
addTile(
    'Attacks (five, from parts you can see)',
    'Ladle',
    'The lob, now from the ladle arm. It scoops from the furnace, whips the ladle over the top and lobs molten metal onto a marked spot. The pool burns down into a scorch: fire that stays. From phase 3 it throws three at once (the barrage).',
    ladle,
    LADLE_MS,
    bg,
);
addTile(
    'Attacks (five, from parts you can see)',
    'Geysers',
    'It drives its flame down into the floor, and geysers burst up one after another along the floor toward you, each marked first and each leaving a scorch.',
    geysers,
    GEYSER_MS,
    bg,
);
start();
