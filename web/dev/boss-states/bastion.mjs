// The Bastion's states (nextSteps.md P4.4) for boss-states.html?kind=3: the engines and their
// trails, banking, the ramming run, the missiles' lock-on and smoke, damage you can see (lost
// guns, a lost engine, the list) and the death. `h` holds the page's helpers.
import { ATTACK, KINDS, bossState } from '../../src/boss/scene.mjs';

const A = KINDS[3].aux;
export async function bastion(h) {
    const { fight, photo, add, attackTiles, death, healthAt, status } = h;
    // Trails and missile smoke are remembered frame to frame by the painters, so render the
    // frames leading up to a photo too.
    const film = async (game, frames, pin = true) => {
        for (let i = 0; i < frames; i++) {
            game.tick(1, pin);
            await photo(game);
        }
        return photo(game);
    };
    status.textContent = 'The battleship…';
    const sail = [];
    {
        const game = await fight(1, 11);
        game.tick(30);
        sail.push({ label: 'Cruising: engines low, short trails', canvas: await film(game, 30) });
        for (const [y, label] of [
            [40, 'Turning up: it banks, the engines flare, the trails bend'],
            [230, 'Turning down'],
        ]) {
            for (let i = 0; i < 3000; i++) {
                game.set(3, 110);
                game.set(4, y);
                game.tick(1, false);
                const b = bossState(game.scene());
                if (!b.attack && Math.abs(b.aux[A.roll]) > 0.06) break;
            }
            sail.push({ label, canvas: await film(game, 30, false) });
        }
    }
    add('It sails', sail);
    add('Firing', await attackTiles());
    const runs = [];
    status.textContent = 'The ramming run…';
    {
        const game = await fight(1, 12);
        game.until((b) => b.attack === ATTACK.ram && b.attackMs >= 700, 16000);
        runs.push({ label: 'Ram: rising to the lane, the lane marked', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 1400, 200);
        runs.push({
            label: 'Ram: across the field, engines blazing',
            canvas: await film(game, 15),
        });
        game.until((b) => b.attackMs >= 2300, 200);
        runs.push({ label: 'Ram: its wake of debris', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 4300, 200);
        runs.push({ label: 'Ram: back in from the right', canvas: await photo(game) });
    }
    {
        const game = await fight(1, 13);
        game.until((b) => b.attack === ATTACK.missile && b.attackMs >= 300, 16000);
        runs.push({ label: 'Missiles: the lock-on closing', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 640, 200);
        runs.push({ label: 'Missiles: the tube flashes', canvas: await photo(game) });
        game.until((b) => b.attackMs >= 1300, 200);
        runs.push({ label: 'Missiles: smoke where they turned', canvas: await film(game, 30) });
    }
    add('Ramming run and missiles', runs);
    const hurt = [];
    status.textContent = 'Damage…';
    hurt.push(await healthAt(0.75, 'Health 75%'));
    hurt.push(await healthAt(0.45, 'Health 45% (phase 2): an engine lost, smoking, listing', 2));
    add('Damage you can see', hurt);
    add('Death', await death());
}
