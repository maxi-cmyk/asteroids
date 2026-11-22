// The practice range's settings and drills (nextSteps.md H3). Pure data and validation: the
// runtime sends a config to the engine, settings keep the last one per profile.
export const PRACTICE_ROCKS = Object.freeze(['targets', 'waves', 'stream', 'none']);
export const PRACTICE_SPEEDS = Object.freeze([50, 75, 100, 125, 150]);
export const PRACTICE_DEFAULTS = Object.freeze({
    drill: 'targets',
    rocks: 'targets',
    wave: 1,
    speed: 100,
    refill: true,
    drops: true,
    hold: false,
});
// Pickups the drawer and the number keys can put down: engine kinds 0 to 3.
export const PRACTICE_SPAWNS = Object.freeze([
    { kind: 0, label: 'Multishot' },
    { kind: 1, label: 'Shield' },
    { kind: 2, label: '2× fire' },
    { kind: 3, label: 'Laser ready' },
]);

// One press starts a drill: it sets the rocks and pickups it needs and keeps the rest (the
// wave and speed you chose last). "custom" changes nothing, so it is whatever you set last.
export const DRILLS = Object.freeze([
    {
        id: 'targets',
        name: 'Targets',
        note: 'Three still targets that come back. Aim and laser warm-up.',
        config: { rocks: 'targets', refill: true, drops: false },
    },
    {
        id: 'waves',
        name: 'Waves',
        note: 'Real waves from the wave you pick, moving on as you clear them.',
        config: { rocks: 'waves', hold: false, drops: true },
    },
    {
        id: 'stream',
        name: 'Stream',
        note: 'An endless field at one wave’s density. Survival and dodging.',
        config: { rocks: 'stream', drops: true },
    },
    {
        id: 'pickups',
        name: 'Pickup lab',
        note: 'Targets plus every pickup on demand (keys 1–4 or the tools).',
        config: { rocks: 'targets', refill: true, drops: true },
        tools: true,
    },
    {
        id: 'boss',
        name: 'Boss',
        note: 'Pick any boss or mini-boss, its tier and phase.',
        config: { rocks: 'none' },
        tools: 'boss',
    },
    {
        id: 'custom',
        name: 'Custom',
        note: 'Exactly what you set in the tools last time.',
        config: {},
    },
]);
export const drillById = (id) => DRILLS.find((drill) => drill.id === id) ?? DRILLS[0];

export function sanitizePractice(raw) {
    const c = raw && typeof raw === 'object' ? raw : {};
    const wave = Math.round(Number(c.wave));
    return {
        drill: DRILLS.some((d) => d.id === c.drill) ? c.drill : PRACTICE_DEFAULTS.drill,
        rocks: PRACTICE_ROCKS.includes(c.rocks) ? c.rocks : PRACTICE_DEFAULTS.rocks,
        wave: Number.isFinite(wave) ? Math.max(1, Math.min(30, wave)) : 1,
        speed: PRACTICE_SPEEDS.includes(c.speed) ? c.speed : 100,
        refill: typeof c.refill === 'boolean' ? c.refill : true,
        drops: typeof c.drops === 'boolean' ? c.drops : true,
        hold: c.hold === true,
    };
}
// The config a drill starts with, on top of what was set last.
export const drillConfig = (id, last) =>
    sanitizePractice({ ...last, ...drillById(id).config, drill: drillById(id).id });
