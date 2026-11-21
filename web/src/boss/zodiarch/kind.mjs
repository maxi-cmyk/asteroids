// Zodiarch's entry in KINDS (src/boss/scene.mjs): its sheet, size, phases and named aux slots,
// which mirror its fight's AUX_* enum in native/boss/fights/ (nextSteps.md R7 M7).

export default {
    id: 'warden', // internal id kept from the Horizon Warden, so saves carry over
    name: 'Zodiarch',
    region: 'rift',
    mini: false,
    size: [120, 84],
    phases: [0.7, 0.35],
    hull: null,
    aux: {
        clock: 0,
        coreOpen: 1,
        section: 2,
        out: 3,
        pearlX: 4,
        pearlY: 5,
        mouth: 6,
        breath: 7,
        hold: 8,
        pathX: 9,
        pathY: 10,
        pathHeading: 11,
        heading: 12,
        speed: 13,
        pearl: 14,
        mode: 15,
    },
};
