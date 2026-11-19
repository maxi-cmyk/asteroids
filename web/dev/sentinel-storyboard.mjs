// Sentinel storyboard (nextSteps.md P4.1): the armoured eye watching you, its tell and window,
// the rail, the plate throw and phase 3. A mock-up for approval; the drawing lives in
// p4-storyboard/sentinel/.
import { addTile, start } from './p4-storyboard/page.mjs';
import { sky } from './p4-storyboard/kit.mjs';
import { watching, cycle, CYCLE_MS, rail } from './p4-storyboard/sentinel/watch.mjs';
import { attacks, ATTACKS_MS } from './p4-storyboard/sentinel/attacks.mjs';
import { throwTwo, throwFour, THROW_MS, shed, SHED_MS } from './p4-storyboard/sentinel/plates.mjs';

const bg = sky('frontier');
addTile(
    'It watches you',
    'The window',
    'Between attacks its plates stand apart, the eye is wide and its rim is lit: that is the window, and it reads at a glance. The pupil rolls in its socket after you. Shots into the eye burst; shots on the plates glance off gold.',
    watching,
    8000,
    bg,
);
addTile(
    'It watches you',
    'Tell, shut, open',
    'One attack from start to finish. The tell: the eye narrows to a slit, the brows drop and the plates shiver as they close. Shut, it warns the lance with light leaking through its seams. Then the plates part, the eye widens and the rim lights again.',
    cycle,
    CYCLE_MS,
    bg,
);
addTile(
    'It watches you',
    'On a rail',
    'Instead of drifting it slides on an unseen rail (dotted here), following your height at a capped speed so it lags behind you. It rolls with the slide like an eyeball turning in its socket, and keeps looking at you.',
    rail,
    6000,
    bg,
);
addTile(
    'Attacks',
    'Warned from the eye',
    'Its four attacks stay (lance, fan, volley, cross). Each is warned from the eye: light gathers behind the shut plates and leaks through the seams, then a flash at the muzzle when it fires.',
    attacks,
    ATTACKS_MS,
    bg,
);
addTile(
    'Plate throw (new)',
    'Two plates',
    'The new attack. The two plates facing you glow along their edges and their paths are drawn (600 ms), then they fly out as boomerangs, spinning, and come back. While they are out the eye is bare on that side: the attack itself is the window. Thrown plates hurt to touch and stop shots.',
    throwTwo,
    THROW_MS,
    bg,
);
addTile(
    'Plate throw (new)',
    'Four plates (phase 2)',
    'From phase 2 it throws all four. The right-hand pair loop up and down instead of out, so the middle stays clear, and the whole eye is bare until they come back.',
    throwFour,
    THROW_MS,
    bg,
);
addTile(
    'Phase 3',
    'It sheds its plates',
    'At phase 3 it shudders and the plates come off for good, tumbling away. From then on the eye is always open, but it attacks faster (the rest between attacks shortens; every warning stays at least 600 ms).',
    shed,
    SHED_MS,
    bg,
);
start();
