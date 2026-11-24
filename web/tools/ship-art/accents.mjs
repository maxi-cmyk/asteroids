// Where each hull wears its accent colour: [x0, y0, x1, y1] pixel boxes on the 24x16 body,
// authored for the upper half and mirrored onto the lower half. `lit` is the accent itself,
// `dim` the darker edge under it. Everything else stays steel, so a paint colour is a trim.
const box = ([x0, y0, x1, y1]) => [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
];
const mirror = ([x0, y0, x1, y1]) => [x0, 16 - y1, x1, 16 - y0];
export const ACCENTS = {
    vanguard: { lit: [[7, 2, 11, 4]], dim: [[6, 4, 13, 5]] },
    dart: { lit: [[6, 1, 9, 4]], dim: [[6, 4, 12, 5]] },
    lancer: { lit: [[8, 4, 11, 5]], dim: [[7, 5, 12, 6]] },
    wasp: { lit: [[19, 0, 22, 2]], dim: [[18, 2, 21, 4]] },
    hammer: { lit: [[9, 1, 14, 3]], dim: [[8, 3, 15, 4]] },
    moth: { lit: [[3, 1, 9, 3]], dim: [[7, 3, 13, 4]] },
};
// Layers to append to a hull's design (accent first, then its darker edge).
export function accentLayers(id) {
    const spec = ACCENTS[id];
    if (!spec) return [];
    const both = (boxes) => boxes.flatMap((b) => [box(b), box(mirror(b))]);
    return [
        ...both(spec.lit).map((points) => ({ colour: 'accent', points })),
        ...both(spec.dim).map((points) => ({ colour: 'accentDark', points })),
    ];
}
