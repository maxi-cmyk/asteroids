import { ATTACK, HAZARD, SHOT } from '../../scene.mjs';
import { boom } from '../shapes.mjs';

// The rift's voice: cosmic drones, star chimes and bent pitches.
const own = {
    sting: (v) => {
        v.tone({ f: 40, to: 90, type: 'sine', dur: 1.8, vol: 0.24, env: 'swell' });
        for (const d of [-9, 0, 9])
            v.tone({
                f: 220,
                to: 110,
                type: 'sawtooth',
                dur: 1.8,
                vol: 0.06,
                detune: d * 8,
                env: 'swell',
            });
        v.tone({ f: 1320, type: 'sine', at: 1.6, dur: 1.2, vol: 0.07 });
    },
    charge: {
        // Each sign re-forming out of the ring: a rising chime, one pitch per sign.
        ...Object.fromEntries(
            Array.from({ length: 12 }, (_, sign) => [
                ATTACK.aries + sign,
                (v, d) => {
                    const f = 440 * 2 ** (sign / 12);
                    for (const [i, m] of [1, 1.5, 2].entries())
                        v.tone({ f: f * m, to: f * m * 1.06, type: 'sine', at: i * 0.06, dur: d, vol: 0.05, env: 'swell' });
                    v.noise({ dur: d, vol: 0.03, f: 7000, type: 'highpass', env: 'swell' });
                },
            ]),
        ),
        // The Great Conjunction: three chimes at once over a sub swell.
        [ATTACK.conjunction]: (v, d) => {
            v.tone({ f: 45, to: 90, type: 'sine', dur: d, vol: 0.25, env: 'swell' });
            for (const f of [523, 659, 784])
                v.tone({ f, to: f * 1.5, type: 'sine', dur: d, vol: 0.05, env: 'swell', vib: { rate: 6, depth: 8 } });
        },
        // The starfire breath drawing in.
        [ATTACK.breath]: (v, d) => {
            v.noise({ dur: d, vol: 0.12, f: 300, to: 5000, type: 'bandpass', env: 'swell' });
            v.tone({ f: 70, to: 220, type: 'sawtooth', dur: d, vol: 0.08, env: 'swell' });
        },
        // Ninefold: a flick for the comets, a soft wisp for foxfire, a shimmer for the
        // illusion and a scatter of ticks for the blink.
        [ATTACK.comets]: (v, d) => {
            v.tone({ f: 900, to: 1800, type: 'triangle', dur: Math.min(d, 0.4), vol: 0.07 });
        },
        [ATTACK.foxfire]: (v, d) => {
            v.tone({ f: 330, to: 660, type: 'sine', dur: d, vol: 0.07, env: 'swell', vib: { rate: 7, depth: 30 } });
        },
        [ATTACK.illusion]: (v, d) => {
            for (const det of [-20, 0, 20])
                v.tone({ f: 660, to: 990, type: 'sine', dur: d, vol: 0.04, detune: det, env: 'swell' });
        },
        [ATTACK.foxBlink]: (v, d) => {
            for (let i = 0; i < 7; i++)
                v.tone({ f: 900 + ((i * 331) % 1400), type: 'square', at: (i * d) / 7, dur: 0.05, vol: 0.04 });
        },
    },
    live: {
        // A creature's walls, charges and the breath.
        [HAZARD.lane]: (v) => {
            v.noise({ dur: 0.4, vol: 0.1, f: 1200, to: 300, type: 'bandpass' });
            v.tone({ f: 220, to: 110, type: 'sawtooth', dur: 0.35, vol: 0.06 });
        },
        [HAZARD.arm]: (v) => v.noise({ dur: 0.6, vol: 0.09, f: 2400, to: 600, type: 'bandpass' }),
        [HAZARD.ring]: (v) => {
            v.tone({ f: 600, to: 120, type: 'sine', dur: 0.8, vol: 0.1 });
            v.tone({ f: 70, to: 30, type: 'sine', dur: 0.8, vol: 0.2 });
        },
        [HAZARD.pull]: (v) => {
            v.tone({ f: 40, to: 28, type: 'sine', dur: 1.5, vol: 0.3, env: 'pulse' });
            v.noise({ dur: 1.5, vol: 0.12, f: 3000, to: 200, type: 'bandpass', env: 'pulse' });
        },
    },
    shot: {
        [SHOT.fast]: (v) => v.tone({ f: 2200, to: 900, type: 'triangle', dur: 0.08, vol: 0.05 }),
        [SHOT.sine]: (v) => v.tone({ f: 1100, to: 1300, type: 'sine', dur: 0.06, vol: 0.035 }),
        [SHOT.missile]: (v) => v.tone({ f: 260, to: 520, type: 'sine', dur: 0.3, vol: 0.06, vib: { rate: 8, depth: 20 } }),
        [SHOT.needle]: (v) => v.tone({ f: 1800, to: 700, type: 'sine', dur: 0.1, vol: 0.06 }),
        [SHOT.pellet]: (v) =>
            v.tone({
                f: 700 + Math.random() * 400,
                to: 500,
                type: 'sine',
                dur: 0.05,
                vol: 0.035,
            }),
        [SHOT.curve]: (v) => {
            v.tone({
                f: 500,
                to: 1200,
                type: 'sine',
                dur: 0.35,
                vol: 0.07,
                vib: { rate: 9, depth: 50 },
            });
        },
    },
    part: (v) => {
        v.tone({ f: 2200, to: 300, type: 'sine', dur: 0.4, vol: 0.1 });
        v.noise({ dur: 0.2, vol: 0.07, f: 6000, type: 'highpass' });
    },
    open: (v) => {
        for (const [i, f] of [1320, 1760, 2640].entries())
            v.tone({ f, type: 'sine', at: i * 0.07, dur: 1.4, vol: 0.08 });
    },
    phase: (v) => {
        v.tone({ f: 60, to: 30, type: 'sine', dur: 1.2, vol: 0.25 });
        v.tone({ f: 300, to: 1800, type: 'sine', dur: 0.8, vol: 0.08, env: 'swell' });
    },
    hit: (v) => v.tone({ f: 500, to: 300, type: 'sine', dur: 0.08, vol: 0.06 }),
    defeat: (v) => {
        // the lens collapses: a reversed swell, a silence, then the sub-bass
        v.tone({ f: 100, to: 1600, type: 'sawtooth', dur: 1.5, vol: 0.1, env: 'swell' });
        v.noise({ dur: 1.5, vol: 0.1, f: 200, to: 6000, type: 'bandpass', env: 'swell' });
        v.tone({ f: 55, to: 22, type: 'sine', at: 1.7, dur: 2.6, vol: 0.34 });
        boom(v, 2.6, 1.7);
        for (const [i, f] of [660, 880, 1320, 1760].entries())
            v.tone({ f, type: 'sine', at: 2.0 + i * 0.12, dur: 1.8, vol: 0.06 });
    },
};

// The Zodiarch and its herald Ninefold share this voice: chimes and cosmic drones.
export const warden = own;
