// Paint changes presentation only. Stable IDs keep saves bounded and portable.
export const PAINTS = Object.freeze([
    { id: 'cobalt', name: 'Cobalt', hex: '#3765e8' },
    { id: 'crimson', name: 'Crimson', hex: '#e65069' },
    { id: 'amber', name: 'Amber', hex: '#efb963' },
    { id: 'jade', name: 'Jade', hex: '#54c995' },
    { id: 'violet', name: 'Violet', hex: '#ae83ef' },
    { id: 'ice', name: 'Ice', hex: '#9fe7f5' },
]);
export const paintById = (id) => PAINTS.find((paint) => paint.id === id) || PAINTS[0];
export const sanitizePaints = (values) => [0, 1].map((i) => paintById(values?.[i]).id);

// Ships are steel with a trim in two stored shades of Cobalt (tools/ship-art/raster.mjs). Paint
// swaps exactly those two colours and nothing else, so armour, glass and fire never change.
export const ACCENT_LIT = Object.freeze([0x37, 0x65, 0xe8]);
export const ACCENT_DIM = Object.freeze([0x24, 0x49, 0xae]);
const DIM_SHADE = 0.72;
export function recolourPaint(data, id) {
    if (id === 'cobalt') return data;
    const hex = paintById(id).hex;
    const target = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    const same = (i, rgb) => data[i] === rgb[0] && data[i + 1] === rgb[1] && data[i + 2] === rgb[2];
    for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;
        const shade = same(i, ACCENT_LIT) ? 1 : same(i, ACCENT_DIM) ? DIM_SHADE : 0;
        if (shade) for (let c = 0; c < 3; c++) data[i + c] = Math.round(target[c] * shade);
    }
    return data;
}
