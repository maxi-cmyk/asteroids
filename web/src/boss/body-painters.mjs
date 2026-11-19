import { warden } from './zodiarch/painter.mjs';
import { lensimp } from './ninefold/painter.mjs';
import { sentinel } from './sentinel/painter.mjs';
import { ringwarden } from './ringwarden/painter.mjs';
import { cinderforge } from './cinderforge/painter.mjs';
import { bastion } from './bastion/painter.mjs';
import { tidecaller, moonjelly } from './tidecaller/painter.mjs';
import { picket, shardling, cinderling, gunnery } from './minis/painter.mjs';

// One painter per boss kind (the index is the engine's BossKind). Each receives `b`:
//   ctx, art, scene, time     what to draw onto, from, and when
//   state, aux, parts         the decoded boss state, its 16 floats and its sub-targets
//   A                         this kind's named aux slots (KINDS[kind].aux)
//   x, y, alpha, flash        position, entrance fade and damage flash
//   frame(key, extra)         draws the body sprite `key` from the boss's own sheet
//   overlay(key)              draws the damage-state overlay for the current damage level

// Indexed by BossKind: six bosses, then their six minis.
export const BODY_PAINTERS = [
    sentinel,
    ringwarden,
    cinderforge,
    bastion,
    tidecaller,
    warden,
    picket,
    shardling,
    cinderling,
    gunnery,
    moonjelly,
    lensimp,
];
