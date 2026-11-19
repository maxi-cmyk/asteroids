// The Cinderforge's states (nextSteps.md P4.3) for boss-states.html?kind=2: the golem at rest
// and hotter, each attack from the part it comes from, the vent (doors open, steam, the heat
// ring) and the cooling, damage and the death. `h` holds the page's helpers.
import { ATTACK, KINDS } from '../../src/boss/scene.mjs';

const A = KINDS[2].aux;
export async function cinderforge(h) {
    const { fight, photo, add, attackTiles, death, healthAt, status } = h;
    status.textContent = 'The golem…';
    const heat = [];
    {
        const game = await fight(1, 11);
        heat.push({ label: 'At rest: no lamps lit', canvas: await photo(game) });
        game.until((b) => !b.attack && b.aux[A.lamps] >= 3, 12000);
        heat.push({ label: 'Three lamps: hotter', canvas: await photo(game) });
        game.until((b) => b.aux[A.lamps] >= 5 && !b.attack, 12000);
        heat.push({ label: 'Five lamps: full, blinking', canvas: await photo(game) });
        game.until((b) => b.attack === ATTACK.vent && b.attackMs >= 500, 3000);
        heat.push({ label: 'Vent: steam, the heat ring warned', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 1500, 200);
        heat.push({ label: 'Vent: doors open, the core bare', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 3600, 200);
        heat.push({ label: 'Cooling: the core dims', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 4600, 200);
        heat.push({ label: 'Shut: the doors close, the lamps go out', canvas: await photo(game) });
    }
    add('The heat cycle', heat);
    add('Firing', await attackTiles());
    const parts = [];
    status.textContent = 'Attacks from its parts…';
    {
        const game = await fight(2, 13);
        game.until((b) => b.attack === ATTACK.ember && b.attackMs >= 500, 16000);
        parts.push({ label: 'Bellows: breathing in, the cone marked', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 960, 200);
        parts.push({ label: 'Bellows: the blast', canvas: await photo(game) });
    }
    {
        const game = await fight(2, 14);
        game.until((b) => b.attack === ATTACK.hammer && b.attackMs >= 700, 16000);
        parts.push({ label: 'Hammer: raised, the column marked', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 960, 200);
        parts.push({ label: 'Hammer: down, the column falls', canvas: await photo(game) });
    }
    {
        const game = await fight(2, 15);
        game.until((b) => b.attack === ATTACK.lob && b.attackMs >= 600, 16000);
        parts.push({ label: 'Ladle: scooping', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 900, 200);
        parts.push({ label: 'Ladle: whipped over the top', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 1400, 200);
        parts.push({ label: 'Ladle: the blob in the air', canvas: await photo(game) });
    }
    {
        const game = await fight(2, 16);
        game.until((b) => b.attack === ATTACK.geyser && b.attackMs >= 700, 16000);
        parts.push({
            label: 'Geysers: its flame driven into the floor',
            canvas: await photo(game),
        });
        game.until((b) => b.attackMs >= 1700, 200);
        parts.push({ label: 'Geysers: running toward you', canvas: await photo(game) });
    }
    add('Attacks from its parts', parts);
    add('Taking damage', [
        await healthAt(0.75, 'Health 75%'),
        await healthAt(0.5, 'Health 50% (phase 2)', 2),
        await healthAt(0.25, 'Health 25% (phase 3)', 3),
    ]);
    add('Death', await death());
}
