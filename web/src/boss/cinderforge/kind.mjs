// Cinderforge's entry in KINDS (src/boss/scene.mjs): its sheet, size, phases and named aux slots,
// which mirror its fight's AUX_* enum in native/boss/fights/ (nextSteps.md R7 M7).

export default {
    id: 'cinderforge',
    name: 'Cinderforge',
    region: 'ember',
    mini: false,
    size: [300, 300],
    phases: [0.66, 0.33],
    hull: null,
    aux: {
        heat: 0,
        open: 1,
        breath: 2,
        hammer: 3,
        ladle: 4,
        core: 5,
        steam: 6,
        lamps: 7,
        flame: 9,
    },
};
