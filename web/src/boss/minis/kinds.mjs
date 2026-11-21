// The mini-bosses' entries in KINDS (src/boss/scene.mjs): sheet, size and named aux slots,
// mirroring their fights' AUX_* enums (nextSteps.md R7 M7).

// Picket
export const picket = {
    id: 'picket',
    name: 'Picket',
    region: 'frontier',
    mini: true,
    size: [150, 150],
    phases: [],
    hull: 'dart',
    aux: { open: 0, busy: 1 },
};

// Shardling
export const shardling = {
    id: 'shardling',
    name: 'Shardling',
    region: 'violet',
    mini: true,
    size: [170, 170],
    phases: [],
    hull: 'lancer',
    aux: { spin: 2, tilt: 5, axis: 6 },
};

// Cinderling
export const cinderling = {
    id: 'cinderling',
    name: 'Cinderling',
    region: 'ember',
    mini: true,
    size: [150, 150],
    phases: [],
    hull: 'wasp',
    aux: { glow: 0, open: 1 },
};

// Gunnery
export const gunnery = {
    id: 'gunnery',
    name: 'Gunnery',
    region: 'ruins',
    mini: true,
    size: [200, 108],
    phases: [],
    hull: 'hammer',
    aux: { firing: 0 },
};

// Moonjelly
export const moonjelly = {
    id: 'moonjelly',
    name: 'Moonjelly',
    region: 'lunar',
    mini: true,
    size: [150, 190],
    phases: [],
    hull: 'moth',
    aux: { clock: 0, squeeze: 1, lean: 2 },
};
