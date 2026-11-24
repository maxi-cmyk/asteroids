import { recolourPaint } from '../ship/paint.mjs';
const cache = new WeakMap();
// Cache only the small atlas cell, never a full atlas per aiming frame.
export function paintedCell(source, cell, paint) {
    let entries = cache.get(source);
    if (!entries) cache.set(source, (entries = new Map()));
    const key = `${cell.x},${cell.y},${cell.w},${cell.h}:${paint}`;
    if (entries.has(key)) return entries.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = cell.w;
    canvas.height = cell.h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
    const image = ctx.getImageData(0, 0, cell.w, cell.h);
    recolourPaint(image.data, paint);
    ctx.putImageData(image, 0, 0);
    entries.set(key, canvas);
    return canvas;
}
