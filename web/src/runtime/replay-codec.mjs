// The compact replay file (nextSteps.md R3): the same replay object as replay.mjs records,
// packed for keeping and uploading. Layout:
//   "ASTR", a format byte (1), the header as UTF-8 JSON (everything but the ticks) behind a
//   varint length, then the ticks: a varint group count, and per group a varint repeat count,
//   a varint call count and each call as a varint id, a varint argument count and the
//   arguments.
// Every argument is coded against the last value in the same slot (call id, argument index):
//   - an integer is a zigzag varint of its difference, shifted left one (low bit 0);
//   - anything else is a varint of its float32 bits XOR the slot's last float bits, shifted
//     left one with the low bit set (neighbouring floats share sign, exponent and top
//     mantissa bits, so the XOR is small).
// Stick input changes a little each tick, so most arguments take one byte. Files over
// MAX_REPLAY_BYTES are refused both ways.
const MAGIC = [0x41, 0x53, 0x54, 0x52]; // "ASTR"
const CODEC_FORMAT = 1;
export const MAX_REPLAY_BYTES = 4 * 1024 * 1024;

class Writer {
    constructor() {
        this.bytes = new Uint8Array(1024);
        this.at = 0;
    }
    #room(n) {
        if (this.at + n <= this.bytes.length) return;
        const next = new Uint8Array(Math.max(this.bytes.length * 2, this.at + n));
        next.set(this.bytes);
        this.bytes = next;
    }
    byte(b) {
        this.#room(1);
        this.bytes[this.at++] = b;
    }
    raw(list) {
        this.#room(list.length);
        this.bytes.set(list, this.at);
        this.at += list.length;
    }
    // Unsigned, up to 2^53.
    varint(n) {
        do {
            let b = n % 128;
            n = Math.floor(n / 128);
            if (n > 0) b |= 128;
            this.byte(b);
        } while (n > 0);
    }
    done() {
        return this.bytes.slice(0, this.at);
    }
}
class Reader {
    constructor(bytes) {
        this.bytes = bytes;
        this.at = 0;
    }
    byte() {
        if (this.at >= this.bytes.length) throw new Error('Replay file is cut short');
        return this.bytes[this.at++];
    }
    raw(n) {
        if (this.at + n > this.bytes.length) throw new Error('Replay file is cut short');
        const out = this.bytes.subarray(this.at, this.at + n);
        this.at += n;
        return out;
    }
    varint() {
        let n = 0,
            scale = 1;
        for (let i = 0; i < 8; i++) {
            const b = this.byte();
            n += (b & 127) * scale;
            if (!(b & 128)) return n;
            scale *= 128;
        }
        throw new Error('Replay file holds a bad number');
    }
}
const zig = (n) => (n >= 0 ? n * 2 : -n * 2 - 1);
const unzig = (n) => (n % 2 ? -(n + 1) / 2 : n / 2);
const MAX_INT = 2 ** 40; // integers beyond this are coded as floats

// Packs a replay object into bytes.
export function encodeReplay(replay) {
    const { ticks, ...header } = replay;
    const w = new Writer();
    w.raw(MAGIC);
    w.byte(CODEC_FORMAT);
    const text = new TextEncoder().encode(JSON.stringify(header));
    w.varint(text.length);
    w.raw(text);
    const last = new Map();
    const f32 = new Float32Array(1),
        bits = new Uint32Array(f32.buffer);
    w.varint(ticks.length);
    for (const [count, calls] of ticks) {
        w.varint(count);
        w.varint(calls.length);
        for (const [id, ...args] of calls) {
            w.varint(id);
            w.varint(args.length);
            args.forEach((v, i) => {
                const key = id * 64 + i,
                    prev = last.get(key) ?? 0;
                if (
                    Number.isInteger(v) &&
                    !Object.is(v, -0) && // -0 keeps its sign as a float (atan2 cares)
                    Math.abs(v) < MAX_INT &&
                    Math.abs(v - prev) < MAX_INT
                ) {
                    w.varint(zig(v - prev) * 2);
                    last.set(key, v);
                } else {
                    f32[0] = v;
                    const fkey = -1 - key;
                    w.varint(((bits[0] ^ (last.get(fkey) ?? 0)) >>> 0) * 2 + 1);
                    last.set(fkey, bits[0]);
                }
            });
        }
    }
    const bytes = w.done();
    if (bytes.length > MAX_REPLAY_BYTES) throw new Error('Replay is too large to keep');
    return bytes;
}

// Unpacks bytes made by encodeReplay. Throws on anything else; the player still checks the
// result (engine, seed, calls) before running it.
export function decodeReplay(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length > MAX_REPLAY_BYTES) throw new Error('Replay file is too large');
    const r = new Reader(bytes);
    if (MAGIC.some((b) => r.byte() !== b)) throw new Error('Not a replay file');
    if (r.byte() !== CODEC_FORMAT) throw new Error('Unknown replay file format');
    let header;
    try {
        header = JSON.parse(new TextDecoder().decode(r.raw(r.varint())));
    } catch {
        throw new Error('Replay file header is malformed');
    }
    if (!header || typeof header !== 'object' || Array.isArray(header))
        throw new Error('Replay file header is malformed');
    const last = new Map();
    const f32 = new Float32Array(1),
        bits = new Uint32Array(f32.buffer);
    const ticks = [];
    const groups = r.varint();
    for (let g = 0; g < groups; g++) {
        const count = r.varint(),
            n = r.varint(),
            calls = [];
        for (let c = 0; c < n; c++) {
            const id = r.varint(),
                argc = r.varint();
            if (argc > 63) throw new Error('Replay file holds a bad call');
            const call = [id];
            for (let i = 0; i < argc; i++) {
                const tag = r.varint(),
                    key = id * 64 + i;
                if (tag % 2) {
                    const x = (tag - 1) / 2,
                        fkey = -1 - key;
                    if (x >= 2 ** 32) throw new Error('Replay file holds a bad number');
                    bits[0] = (x ^ (last.get(fkey) ?? 0)) >>> 0;
                    last.set(fkey, bits[0]);
                    call.push(f32[0]);
                } else {
                    const v = (last.get(key) ?? 0) + unzig(tag / 2);
                    last.set(key, v);
                    call.push(v);
                }
            }
            calls.push(call);
        }
        ticks.push([count, calls]);
    }
    if (r.at !== bytes.length) throw new Error('Replay file has trailing bytes');
    return { ...header, ticks };
}
