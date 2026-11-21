// Ninefold's entry in KINDS (src/boss/scene.mjs): its sheet, size, phases and named aux slots,
// which mirror its fight's AUX_* enum in native/boss/fights/ (nextSteps.md R7 M7).
import { FOX_POSES, FOX_SMALL } from './poses.mjs';

export default {
    id: 'lensimp', // internal id kept from the Lens Imp, so saves carry over
    name: 'Ninefold',
    region: 'rift',
    mini: true,
    size: [250, 196],
    phases: [],
    hull: 'comet',
    aux: {
        clock: 0,
        blink: 1,
        open: 2,
        tails: 3,
        illusion: 4,
        scale: 5,
        pose: 6,
        face: 7,
        alpha: 8,
        step: 9,
    },
};

// Ninefold sitting, from its centre (every pose's points: src/boss/ninefold/poses.mjs).
export const NINEFOLD = Object.freeze({
    mark: FOX_POSES[0].mark,
    head: FOX_POSES[0].head,
    body: FOX_POSES[0].body,
    illusionScale: FOX_SMALL, // the three foxes of an illusion
});
