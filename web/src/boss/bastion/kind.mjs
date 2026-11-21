// Bastion's entry in KINDS (src/boss/scene.mjs): its sheet, size, phases and named aux slots,
// which mirror its fight's AUX_* enum in native/boss/fights/ (nextSteps.md R7 M7).

export default {
    id: 'bastion',
    name: 'Bastion',
    region: 'ruins',
    mini: false,
    size: [340, 196],
    phases: [0.5],
    hull: null,
    aux: { cannon: 0, pods: 1, armour: 2, roll: 3, thrust: 4, lock: 6, lane: 7 },
};

// The Bastion's ramming run marks its lane with this `e` (native/boss/fights/bastion.h).
export const RAM_LANE = 20;
