// Tidecaller's entry in KINDS (src/boss/scene.mjs): its sheet, size, phases and named aux slots,
// which mirror its fight's AUX_* enum in native/boss/fights/ (nextSteps.md R7 M7).

export default {
    id: 'tidecaller',
    name: 'Tidecaller',
    region: 'lunar',
    mini: false,
    size: [230, 290],
    phases: [0.7, 0.35],
    hull: null,
    aux: { clock: 0, exposed: 2, squeeze: 3, lean: 4, rim: 5, rimTo: 6 },
};
