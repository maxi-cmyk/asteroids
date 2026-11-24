// Twelve weapon icons on a 24x24 grid, drawn in code so they stay editable and exact.
// Every icon fires to the right, like the ships, and uses the same flat palette.
export const SIZE = 24;
export const COLOURS = {
    outline: [0x12, 0x0e, 0x2d],
    steel: [0x90, 0x96, 0xae],
    steelDark: [0x4f, 0x54, 0x70],
    cream: [0xff, 0xf4, 0xcf],
    cyan: [0x72, 0xe1, 0xef],
    cyanDark: [0x34, 0x7f, 0x9d],
    orange: [0xff, 0xb3, 0x5a],
    orangeDark: [0xd9, 0x69, 0x2a],
};
class Canvas {
    constructor() {
        this.pixels = new Uint8Array(SIZE * SIZE * 4);
    }
    dot(x, y, colour) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
        this.pixels.set([...COLOURS[colour], 255], (y * SIZE + x) * 4);
    }
    rect(x, y, w, h, colour) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, colour);
    }
    // Pixels whose distance from (cx, cy) falls in [inner, outer].
    ring(cx, cy, inner, outer, colour) {
        for (let y = 0; y < SIZE; y++)
            for (let x = 0; x < SIZE; x++) {
                const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
                if (d >= inner && d <= outer) this.dot(x, y, colour);
            }
    }
    // A bolt: dim tail, bright body, cream head, `thick` pixels high, ending at x1.
    bolt(x0, x1, y, { thick = 2, head = 'cream', body = 'cyan', tail = 'cyanDark' } = {}) {
        const len = x1 - x0;
        for (let i = 0; i < len; i++) {
            const colour = i >= len - 3 ? head : i >= 3 ? body : tail;
            this.rect(x0 + i, y, 1, thick, colour);
        }
    }
    // The same bolt along a direction (degrees), from radius r0 to r1.
    ray(cx, cy, degrees, r0, r1) {
        const a = (degrees * Math.PI) / 180;
        for (let r = r0; r <= r1; r += 0.5) {
            const colour = r > r1 - 2.5 ? 'cream' : r > r0 + 2 ? 'cyan' : 'cyanDark';
            this.rect(cx + Math.cos(a) * r - 0.5, cy + Math.sin(a) * r - 0.5, r > r1 - 3 ? 2 : 1, r > r1 - 3 ? 2 : 1, colour);
        }
    }
    disc(cx, cy, radius, colour) {
        this.ring(cx, cy, 0, radius, colour);
    }
    outlined(cx, cy, radius, fill) {
        this.disc(cx, cy, radius + 1, 'outline');
        this.disc(cx, cy, radius, fill);
    }
}
const rock = (c, cx, cy) => {
    c.outlined(cx, cy, 2.6, 'steelDark');
    c.dot(cx - 1, cy - 1, 'steel');
};
const rocket = (c, x, y) => {
    c.rect(x, y, 8, 3, 'outline');
    c.rect(x + 1, y + 1, 6, 1, 'steel');
    c.dot(x + 7, y + 1, 'orange');
    c.rect(x + 2, y - 1, 2, 1, 'steelDark');
    c.rect(x + 2, y + 3, 2, 1, 'steelDark');
    c.rect(x - 4, y + 1, 4, 1, 'orange');
    c.dot(x - 5, y + 1, 'orangeDark');
    c.dot(x - 3, y, 'orangeDark');
    c.dot(x - 3, y + 2, 'orangeDark');
};
const mine = (c, cx, cy) => {
    const spikes = [
        [-4, 0],
        [4, 0],
        [0, -4],
        [0, 4],
        [-3, -3],
        [3, 3],
        [3, -3],
        [-3, 3],
    ];
    for (const [dx, dy] of spikes) c.dot(cx + dx, cy + dy, 'outline');
    c.outlined(cx, cy, 3, 'steel');
    c.disc(cx + 0.5, cy + 0.5, 2, 'steelDark');
    c.rect(cx - 1, cy - 1, 2, 2, 'orange');
};

export const ICONS = {
    repeater(c) {
        c.bolt(3, 21, 10, { thick: 3 });
    },
    'twin-shot'(c) {
        c.bolt(4, 20, 6, { thick: 3 });
        c.bolt(4, 20, 14, { thick: 3 });
    },
    lance(c) {
        rock(c, 8, 12);
        rock(c, 14, 12);
        rock(c, 19, 12);
        c.bolt(1, 23, 11);
    },
    burst(c) {
        c.bolt(1, 7, 10, { thick: 3, tail: 'cyan' });
        c.bolt(9, 15, 10, { thick: 3, tail: 'cyan' });
        c.bolt(17, 23, 10, { thick: 3, tail: 'cyan' });
    },
    fan(c) {
        for (const angle of [-28, -14, 0, 14, 28]) c.ray(0.5, 12, angle, 9, 23);
    },
    seeker(c) {
        // A homing bolt curving up into its target.
        const path = (t) => [2 + 15 * t, 20 - 12 * t - 6 * Math.sin(t * Math.PI) * (1 - t)];
        for (let t = 0; t <= 1; t += 0.03) {
            const [x, y] = path(t);
            c.rect(x - 0.5, y - 0.5, 1.5, 1.5, t > 0.9 ? 'cream' : t > 0.35 ? 'cyan' : 'cyanDark');
        }
        c.ring(19.5, 7.5, 2.6, 4.2, 'orange');
        c.dot(19, 7, 'orangeDark');
    },
    beam(c) {
        c.outlined(5, 12, 3.4, 'cyanDark');
        c.disc(5, 12, 2.2, 'cyan');
        c.disc(5, 12, 1, 'cream');
        c.rect(9, 9, 15, 6, 'cyanDark');
        c.rect(9, 10, 15, 4, 'cyan');
        c.rect(9, 11, 15, 2, 'cream');
    },
    'rocket-salvo'(c) {
        rocket(c, 13, 4);
        rocket(c, 15, 11);
        rocket(c, 13, 18);
    },
    'nova-pulse'(c) {
        c.ring(12, 12, 9.5, 11.5, 'cyanDark');
        c.ring(12, 12, 7, 9, 'cyan');
        c.ring(12, 12, 4, 5.8, 'cream');
        c.disc(12, 12, 2.2, 'orange');
    },
    'mine-rack'(c) {
        mine(c, 6, 6);
        mine(c, 16, 11);
        mine(c, 7, 18);
    },
    drone(c) {
        // Companion body with a wing pod, firing a short volley.
        c.rect(5, 6, 9, 12, 'outline');
        c.rect(6, 7, 7, 10, 'steelDark');
        c.rect(6, 7, 7, 4, 'steel');
        c.rect(14, 9, 3, 6, 'outline');
        c.rect(14, 10, 2, 4, 'steel');
        c.rect(9, 10, 3, 4, 'cyanDark');
        c.rect(10, 11, 2, 2, 'cyan');
        c.rect(2, 8, 3, 2, 'orange');
        c.rect(2, 14, 3, 2, 'orange');
        c.bolt(17, 23, 11, { tail: 'cyan' });
    },
    'arc-volley'(c) {
        // Five heavy bolts leaving side by side along a curve.
        const starts = [
            [9, 2],
            [5, 6],
            [3, 11],
            [5, 16],
            [9, 20],
        ];
        for (const [x, y] of starts)
            c.bolt(x, x + 12, y, { thick: 3, head: 'cream', body: 'orange', tail: 'orangeDark' });
    },
};
export function drawIcon(id) {
    const canvas = new Canvas();
    ICONS[id](canvas);
    return canvas.pixels;
}
