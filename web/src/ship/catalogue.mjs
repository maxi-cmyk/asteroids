// Stable IDs are replay/save contracts. Keep array order aligned with the native registry.
export const LOADOUT_VERSION = 1;
export const SHIPS = Object.freeze(
    [
        {
            id: 'vanguard',
            name: 'Vanguard',
            speed: 1,
            acceleration: 140,
            braking: 100,
            detail: 'Balanced speed and handling.',
        },
        {
            id: 'dart',
            name: 'Dart',
            speed: 1.2,
            acceleration: 260,
            braking: 200,
            detail: 'Fast crossing; allow room to brake.',
        },
        {
            id: 'lancer',
            name: 'Lancer',
            speed: 1.12,
            acceleration: 200,
            braking: 160,
            detail: 'Quick straight runs; deliberate reversals.',
        },
        {
            id: 'wasp',
            name: 'Wasp',
            speed: 1.05,
            acceleration: 100,
            braking: 180,
            detail: 'Quick launch with momentum after release.',
        },
        {
            id: 'hammer',
            name: 'Hammer',
            speed: 0.85,
            acceleration: 60,
            braking: 20,
            detail: 'Precise corrections; lower maximum speed.',
        },
        {
            id: 'moth',
            name: 'Moth',
            speed: 0.95,
            acceleration: 180,
            braking: 40,
            detail: 'Clean stops with a gradual launch.',
        },
    ].map(Object.freeze),
);
export const PRIMARIES = Object.freeze(
    [
        {
            id: 'repeater',
            name: 'Repeater',
            interval: 160,
            speed: 18.75,
            damage: 1,
            detail: 'One accurate bolt. 1 damage.',
        },
        {
            id: 'twin-shot',
            name: 'Twin shot',
            interval: 320,
            speed: 18.75,
            damage: 1,
            detail: 'Two parallel bolts. 1 damage each.',
        },
        {
            id: 'lance',
            name: 'Lance',
            interval: 520,
            speed: 26,
            damage: 3,
            detail: 'Fast 3-damage shot; penetrates up to 3 rocks.',
        },
        {
            id: 'burst',
            name: 'Burst',
            interval: 480,
            speed: 18.75,
            damage: 1,
            detail: 'Three bolts, spaced 60 ms apart.',
        },
        {
            id: 'fan',
            name: 'Fan',
            interval: 800,
            speed: 18.75,
            damage: 1,
            detail: 'Five bolts across a 24° fan.',
        },
        {
            id: 'seeker',
            name: 'Seeker',
            interval: 200,
            speed: 12,
            damage: 1,
            detail: 'A slower bolt with gentle homing.',
        },
    ].map(Object.freeze),
);
export const SECONDARIES = Object.freeze(
    [
        {
            id: 'beam',
            name: 'Beam',
            windup: 1500,
            cooldown: 5000,
            detail: 'Charge an aimed beam. Primary pauses during charge.',
        },
        {
            id: 'rocket-salvo',
            name: 'Rocket salvo',
            windup: 400,
            cooldown: 7000,
            detail: 'Three guided rockets with small blasts.',
        },
        {
            id: 'nova-pulse',
            name: 'Nova pulse',
            windup: 600,
            cooldown: 9000,
            detail: 'Short-range ring damages targets and clears ordinary bullets.',
        },
        {
            id: 'mine-rack',
            name: 'Mine rack',
            windup: 200,
            cooldown: 6000,
            detail: 'Three proximity mines, lasting 5 seconds.',
        },
        {
            id: 'drone',
            name: 'Drone',
            windup: 400,
            cooldown: 10000,
            detail: 'A companion fires along your aim for 4 seconds.',
        },
        {
            id: 'arc-volley',
            name: 'Arc volley',
            windup: 500,
            cooldown: 6000,
            detail: 'Five strong bolts in a forward fan.',
        },
    ].map(Object.freeze),
);
export const SLOTS = Object.freeze({ ship: SHIPS, primary: PRIMARIES, secondary: SECONDARIES });
export const STARTER = Object.freeze({ ship: 'vanguard', primary: 'repeater', secondary: 'beam' });
export const kitForLevel = (level) =>
    Number.isInteger(level) && level >= 1 && level <= 6
        ? Object.fromEntries(
              Object.entries(SLOTS).map(([slot, list]) => [slot, list[level - 1].id]),
          )
        : null;
export const indexOf = (slot, id) => SLOTS[slot]?.findIndex((item) => item.id === id) ?? -1;
export const sanitizeLoadout = (raw) =>
    Object.fromEntries(
        Object.keys(SLOTS).map((slot) => [
            slot,
            indexOf(slot, raw?.[slot]) >= 0 ? raw[slot] : STARTER[slot],
        ]),
    );
export const loadoutText = (kit) =>
    Object.entries(SLOTS)
        .map(([slot, list]) => list.find((item) => item.id === kit?.[slot])?.name ?? list[0].name)
        .join(' · ');
