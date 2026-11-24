// 24×16 authored bodies, exact nearest-neighbour 32×32 aiming states.
// Steel hull plus two accent shades. The accent pair is the only part the Hangar recolours:
// it is stored in Cobalt (src/ship/paint.mjs) and swapped by exact match, never by guesswork.
export const PALETTE = {
    outline: '#120e2d',
    shadow: '#4f5470',
    hull: '#9096ae',
    light: '#cbd0e0',
    cream: '#fff4cf',
    glass: '#72e1ef',
    glassDark: '#347f9d',
    engine: '#3b3f5e',
    accent: '#3765e8',
    accentDark: '#2449ae',
};
const rgba = (hex) => [...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), 255];
export const blank = (w, h) => new Uint8Array(w * h * 4);
export function blit(target, width, source, sw, sh, x, y, scale = 1) {
    for (let sy = 0; sy < sh; sy++)
        for (let sx = 0; sx < sw; sx++)
            for (let dy = 0; dy < scale; dy++)
                for (let dx = 0; dx < scale; dx++)
                    target.set(
                        source.subarray((sy * sw + sx) * 4, (sy * sw + sx + 1) * 4),
                        ((y + sy * scale + dy) * width + x + sx * scale + dx) * 4,
                    );
}
function inside(x, y, polygon) {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [ax, ay] = polygon[i],
            [bx, by] = polygon[j];
        if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) hit = !hit;
    }
    return hit;
}
export function body(spec) {
    const pixels = blank(24, 16);
    for (const layer of spec.layers)
        for (let y = 0; y < 16; y++)
            for (let x = 0; x < 24; x++)
                if (
                    inside(x + 0.5, y + 0.5, spec.layers[0].points) &&
                    inside(x + 0.5, y + 0.5, layer.points)
                )
                    pixels.set(rgba(PALETTE[layer.colour]), (y * 24 + x) * 4);
    return pixels;
}
export function aiming(body, direction) {
    const cell = blank(32, 32),
        angle = (direction * Math.PI) / 8;
    for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
            const dx = x + 0.5 - 16,
                dy = y + 0.5 - 16;
            const sx = Math.floor(dx * Math.cos(angle) + dy * Math.sin(angle) + 12);
            const sy = Math.floor(-dx * Math.sin(angle) + dy * Math.cos(angle) + 8);
            if (sx >= 0 && sx < 24 && sy >= 0 && sy < 16)
                cell.set(
                    body.subarray((sy * 24 + sx) * 4, (sy * 24 + sx + 1) * 4),
                    (y * 32 + x) * 4,
                );
        }
    const out = cell.slice();
    for (let y = 1; y < 31; y++)
        for (let x = 1; x < 31; x++) {
            const at = (y * 32 + x) * 4;
            if (!cell[at + 3] && [at - 4, at + 4, at - 128, at + 128].some((n) => cell[n + 3]))
                out.set(rgba(PALETTE.outline), at);
        }
    return out;
}
