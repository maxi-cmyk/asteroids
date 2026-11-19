// States for the Tidecaller (nextSteps.md P4.5, boss-states.html?kind=4) and the five minis
// (P4.6, kinds 6 to 10). Trails and tendrils are remembered frame to frame by the painters,
// so each photo renders the frames leading up to it. `h` holds the page's helpers.
import { ATTACK, KINDS, bossState } from '../../src/boss/scene.mjs';

const filmer = (photo) => async (game, frames) => {
    for (let i = 0; i < frames; i++) {
        game.tick(1);
        await photo(game);
    }
    return photo(game);
};

export async function tidecaller(h) {
    const { fight, photo, add, attackTiles, death, healthAt, status } = h;
    const film = filmer(photo),
        A = KINDS[4].aux;
    status.textContent = 'The bell…';
    const swim = [];
    {
        const game = await fight(1, 11);
        game.until((b) => b.aux[A.squeeze] > 0.95, 400);
        swim.push({
            label: 'Contract: the bell squeezes and thrusts',
            canvas: await film(game, 1),
        });
        game.until((b) => b.aux[A.squeeze] < 0.6, 400);
        swim.push({ label: 'Glide: the tendrils trail behind', canvas: await film(game, 20) });
        game.until((b) => b.aux[A.squeeze] < 0.1, 400);
        swim.push({ label: 'Relax: the bell opens out', canvas: await film(game, 10) });
        game.until((b) => b.attack === ATTACK.sine && b.attackMs >= 350, 9000);
        swim.push({ label: 'Light runs to the stream’s start', canvas: await film(game, 6) });
        game.until((b) => b.attackMs >= 1200, 200);
        swim.push({ label: 'And the stream pours out', canvas: await film(game, 6) });
    }
    add('It swims in pulses', swim);
    add('Firing', await attackTiles());
    add('Taking damage', [
        await healthAt(0.75, 'Health 75%'),
        await healthAt(0.5, 'Health 50% (phase 2)', 2),
        await healthAt(0.25, 'Health 25% (phase 3)', 3),
    ]);
    add('Death', await death());
}

// A mini: a few moments of its new motion, its attack, and its death.
export async function mini(h, kind) {
    const { fight, photo, add, attackTiles, death, status } = h;
    const film = filmer(photo);
    status.textContent = `${KINDS[kind].name}…`;
    const look = [];
    const game = await fight(1, 11);
    for (const [ticks, label] of [
        [10, 'Moving'],
        [25, 'A moment later'],
        [25, 'And later'],
    ]) {
        game.tick(ticks);
        look.push({ label, canvas: await film(game, 12) });
    }
    game.until((b) => b.attack && b.attackMs >= 200, 6000);
    look.push({ label: 'About to fire', canvas: await film(game, 4) });
    game.until((b) => !bossState(game.scene()).attack || b.attackMs >= 900, 200);
    look.push({ label: 'Firing', canvas: await film(game, 4) });
    add('Its new motion (P4.6)', look);
    add('Firing', await attackTiles());
    add('Death', await death());
}
