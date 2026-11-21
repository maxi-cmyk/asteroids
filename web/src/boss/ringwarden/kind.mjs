// Ringwarden's entry in KINDS (src/boss/scene.mjs): its sheet, size, phases and named aux slots,
// which mirror its fight's AUX_* enum in native/boss/fights/ (nextSteps.md R7 M7).

export default {
    id: 'ringwarden',
    name: 'Ringwarden',
    region: 'violet',
    mini: false,
    size: [270, 270],
    phases: [0.66, 0.33],
    hull: null,
    aux: {
        scale: 0,
        outerSpin: 1,
        innerSpin: 2,
        charging: 3,
        outerTilt: 4,
        outerAxis: 5,
        innerTilt: 6,
        innerAxis: 7,
        eclipse: 8,
        halo: 9,
        haloGap: 14,
    },
};
