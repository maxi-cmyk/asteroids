// The field guide to every boss attack: what it looks like, what warns of it, how
// to beat it, and when the attack gallery should photograph it. One source for the
// gallery page and the checks that every engine attack is documented.
// Each boss has its own file in guide/ (nextSteps.md R7 M6); this list keeps the
// engine's kind order.

import sentinel from './guide/sentinel.mjs';
import ringwarden from './guide/ringwarden.mjs';
import cinderforge from './guide/cinderforge.mjs';
import bastion from './guide/bastion.mjs';
import tidecaller from './guide/tidecaller.mjs';
import zodiarch from './guide/zodiarch.mjs';
import picket from './guide/picket.mjs';
import shardling from './guide/shardling.mjs';
import cinderling from './guide/cinderling.mjs';
import gunnery from './guide/gunnery.mjs';
import moonjelly from './guide/moonjelly.mjs';
import ninefold from './guide/ninefold.mjs';

// `phase` is the first phase an attack appears in (the gallery starts there);
// `at` is the moment into the attack to capture, in ms; `release` is the sound
// played when it lands: ['live', hazard kind] or ['shot', shot family].
export const GUIDE = [
    sentinel,
    ringwarden,
    cinderforge,
    bastion,
    tidecaller,
    zodiarch,
    picket,
    shardling,
    cinderling,
    gunnery,
    moonjelly,
    ninefold,
];
