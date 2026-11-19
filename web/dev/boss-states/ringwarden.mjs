// The Ringwarden's states (nextSteps.md P4.2) for boss-states.html?kind=1: the rings tilting
// and their gaps, the eclipse, the prism splitting on blades, the halo lock out and back,
// damage and the death. `h` holds the page's helpers.
import { ATTACK, KINDS, bossState } from '../../src/boss/scene.mjs';

const A = KINDS[1].aux;
export async function ringwarden(h) {
    const { fight, photo, add, attackTiles, death, healthAt, status } = h;
    const look = [];
    status.textContent = 'The rings…';
    {
        const game = await fight(1, 11);
        game.until((b) => !b.attack && b.aux[A.eclipse] < 0.5 && b.aux[A.outerTilt] > 0.75, 6000);
        look.push({ label: 'Tilted: the gaps apart, no lane in', canvas: await photo(game) });
        game.until((b) => !b.attack && b.aux[A.eclipse] < 0.5 && b.aux[A.outerTilt] < 0.45, 6000);
        look.push({ label: 'Tipped the other way', canvas: await photo(game) });
        game.until((b) => b.aux[A.eclipse] > 0.5 && !b.attack, 16000);
        game.tick(10, false);
        look.push({
            label: 'Eclipse: both gaps in front, the core flares',
            canvas: await photo(game),
        });
        for (let i = 0; i < 3000; i++) {
            game.tick(1, false);
            if (Math.abs(bossState(game.scene()).aux[A.outerAxis]) > 0.3) break;
        }
        look.push({ label: 'Leaning into its drift', canvas: await photo(game) });
    }
    add('Rings that tilt', look);
    {
        // A blade breaking: the painter sees it there one frame and gone the next, so photograph
        // the frame before the shard burst tears blades loose, then the shatter as it plays.
        const game = await fight(1, 15);
        const shots = [];
        game.until((b) => b.attack === ATTACK.burst && b.attackMs >= 680, 9000);
        await photo(game);
        for (const ms of [760, 860, 960]) {
            game.until((b) => b.attackMs >= ms, 100);
            shots.push({ label: `Blades breaking · ${ms - 700} ms`, canvas: await photo(game) });
        }
        add('Blades breaking', shots);
    }
    add('Firing', await attackTiles());
    const special = [];
    status.textContent = 'Prism and halo…';
    {
        const game = await fight(2, 13);
        game.until((b) => b.attack === ATTACK.prism && b.attackMs >= 500, 12000);
        special.push({ label: 'Prism: the sweep marked', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 1700, 400);
        special.push({ label: 'Prism: whole blades split off shards', canvas: await photo(game) });
    }
    {
        const game = await fight(2, 14);
        game.until((b) => b.attack === ATTACK.halo && b.attackMs >= 450, 16000);
        special.push({ label: 'Halo lock: the gap marked at the edge', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 1500, 400);
        special.push({ label: 'Halo lock: flying out', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 2600, 400);
        special.push({ label: 'Halo lock: at the edge of the field', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 3900, 400);
        special.push({ label: 'Halo lock: closing back in', canvas: await photo(game) });
    }
    add('Prism and halo', special);
    add('Taking damage', [
        await healthAt(0.75, 'Health 75%'),
        await healthAt(0.5, 'Health 50% (phase 2)', 2),
        await healthAt(0.25, 'Health 25% (phase 3)', 3),
    ]);
    add('Death', await death());
}
