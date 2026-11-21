// Sentinel's entry in KINDS (src/boss/scene.mjs): its sheet, size, phases and named aux slots,
// which mirror its fight's AUX_* enum in native/boss/fights/ (nextSteps.md R7 M7).

export default {
    id: 'sentinel',
    name: 'Sentinel',
    region: 'frontier',
    mini: false,
    size: [220, 220],
    phases: [0.6, 0.3],
    hull: null,
    aux: {
        open: 0,
        busy: 1,
        tell: 2,
        seam: 3,
        roll: 4,
        gazeX: 5,
        gazeY: 6,
        shed: 7,
        bare: 8,
    },
};
