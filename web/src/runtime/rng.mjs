// The engine's randomness (nextSteps.md R3): a seeded generator instead of fresh
// crypto words per draw, so a run is its seed plus its inputs and can be replayed. The seed
// itself still comes from crypto.getRandomValues at the start of every run. sfc32: 128 bits
// of state, integer-only, so every JavaScript engine produces the same sequence.

// A seed is four 32-bit words written as 32 hex digits.
export function randomSeed() {
    const words = crypto.getRandomValues(new Uint32Array(4));
    return [...words].map((w) => w.toString(16).padStart(8, '0')).join('');
}

export function validSeed(seed) {
    return typeof seed === 'string' && /^[0-9a-f]{32}$/.test(seed);
}

export class SeededRandom {
    constructor(seed = randomSeed()) {
        this.reseed(seed);
    }
    reseed(seed) {
        if (!validSeed(seed)) throw new TypeError('A seed is 32 lowercase hex digits');
        this.seed = seed;
        this.s = [0, 1, 2, 3].map((i) => parseInt(seed.slice(i * 8, i * 8 + 8), 16) >>> 0);
        // sfc32 recommends discarding its first outputs so similar seeds diverge.
        for (let i = 0; i < 12; i++) this.next();
    }
    next() {
        let [a, b, c, d] = this.s;
        const t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        this.s = [a, b, c, d];
        return t >>> 0;
    }
}
