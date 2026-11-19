// Ringwarden storyboard (nextSteps.md P4.2): tilting rings, the eclipse, prism blades and the
// halo lock. A mock-up for approval; the drawing lives in p4-storyboard/ringwarden/.
import { addTile, start } from './p4-storyboard/page.mjs';
import { sky } from './p4-storyboard/kit.mjs';
import {
    precession,
    DRIFT_MS,
    eclipse,
    ECLIPSE_MS,
    prismWhole,
    prismBroken,
    PRISM_MS,
    halo,
    HALO_MS,
} from './p4-storyboard/ringwarden/tiles.mjs';

const bg = sky('violet');
addTile(
    'Rings that tilt',
    'Precession',
    'The two rings tilt in 3D, drawn as ellipses that squash and turn, and wobble slowly like a gyroscope; it leans into its drift. Blades behind the core are dimmer. Each ring now has a gap of a few empty slots, and as the rings tilt and spin the gaps sweep across the core. The white line marks a clear shot.',
    precession,
    DRIFT_MS,
    bg,
);
addTile(
    'Rings that tilt',
    'The eclipse',
    'The outer gap turns one way and the inner gap the other. When both line up in front of the core there is a clear lane straight in: the core flares white and every shot lands. That is the big window (to decide: whether hits count double while it lasts).',
    eclipse,
    ECLIPSE_MS,
    bg,
);
addTile(
    'Prism blades',
    'Whole blades split the beam',
    'The prism beam keeps its warning (the start line and the sweep marked for 900 ms). Now every whole blade it crosses splits off two more beams, so a full ring fills the field with light.',
    prismWhole,
    PRISM_MS,
    bg,
);
addTile(
    'Prism blades',
    'Broken blades do not',
    'The same sweep after you have broken the blades on your side: one clean beam to dodge. Breaking blades becomes a choice (they still regrow).',
    prismBroken,
    PRISM_MS,
    bg,
);
addTile(
    'Halo lock (replaces the pick-off)',
    'Thread the gap',
    'The outer ring flies out to the edge of the field, its blades linked by a band of light, then closes back in. It has one gap, marked before it moves, which drifts as it goes: you thread it on the way out and again on the way back.',
    halo,
    HALO_MS,
    bg,
);
start();
