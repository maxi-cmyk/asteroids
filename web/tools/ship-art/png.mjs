// Minimal deterministic RGBA PNG I/O for the existing pixel-art asset pipeline.
import { deflateSync, inflateSync } from 'node:zlib';
export function encodePng(width, height, pixels) {
    const crc = (bytes) => {
        let value = 0xffffffff;
        for (const byte of bytes) {
            value ^= byte;
            for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
        }
        return (value ^ 0xffffffff) >>> 0;
    };
    const chunk = (name, bytes) => {
        const payload = Buffer.concat([Buffer.from(name), bytes]);
        const size = Buffer.alloc(4),
            checksum = Buffer.alloc(4);
        size.writeUInt32BE(bytes.length);
        checksum.writeUInt32BE(crc(payload));
        return Buffer.concat([size, payload, checksum]);
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 6;
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++)
        Buffer.from(pixels.subarray(y * width * 4, (y + 1) * width * 4)).copy(
            raw,
            y * (width * 4 + 1) + 1,
        );
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}
export function decodePng(bytes) {
    const width = bytes.readUInt32BE(16),
        height = bytes.readUInt32BE(20),
        parts = [];
    if (bytes[24] !== 8 || bytes[25] !== 6 || bytes[28] !== 0)
        throw Error('Expected noninterlaced 8-bit RGBA PNG');
    for (let at = 8; at < bytes.length; ) {
        const size = bytes.readUInt32BE(at);
        if (bytes.toString('ascii', at + 4, at + 8) === 'IDAT')
            parts.push(bytes.subarray(at + 8, at + 8 + size));
        at += size + 12;
    }
    const raw = inflateSync(Buffer.concat(parts)),
        stride = width * 4,
        pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        const filter = raw[y * (stride + 1)];
        for (let x = 0; x < stride; x++) {
            const i = y * stride + x,
                a = x >= 4 ? pixels[i - 4] : 0,
                b = y ? pixels[i - stride] : 0,
                c = y && x >= 4 ? pixels[i - stride - 4] : 0;
            const p = a + b - c,
                d = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
            const predictor = [
                0,
                a,
                b,
                Math.floor((a + b) / 2),
                [a, b, c][d.indexOf(Math.min(...d))],
            ][filter];
            if (predictor === undefined) throw Error('Unknown PNG filter');
            pixels[i] = raw[y * (stride + 1) + x + 1] + predictor;
        }
    }
    return { width, height, pixels };
}
