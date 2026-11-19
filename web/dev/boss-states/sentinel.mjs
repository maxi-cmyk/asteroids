// The Sentinel's states (nextSteps.md P4.1) for boss-states.html?kind=0: the window, the
// tell, shut with light in its seams, the rail, the plate throw (two plates, then four), the
// plates shed in phase 3, damage and the death. `h` holds the page's helpers.
import { ATTACK, bossState } from '../../src/boss/scene.mjs';

export async function sentinel(h) {
    const { fight, photo, add, attackTiles, death, healthAt, status } = h;
    const look = [];
    status.textContent = 'The eye…';
    {
        const game = await fight(1, 11);
        game.until((b) => !b.attack && b.aux[0] > 0.95, 3000);
        look.push({
            label: 'The window: plates apart, eye wide, rim lit',
            canvas: await photo(game),
        });
        game.until((b) => b.attack && b.attackMs >= 150, 3000);
        look.push({
            label: 'The tell: the eye narrows, the plates shiver and close',
            canvas: await photo(game),
        });
        game.until((b) => b.attackMs >= 650, 200);
        look.push({ label: 'Shut: light leaks through the seams', canvas: await photo(game) });
        game.until((b) => !b.attack && b.aux[0] > 0.3 && b.aux[0] < 0.8, 3000);
        look.push({ label: 'Opening: the eye calm, then wide', canvas: await photo(game) });
    }
    {
        // The rail: the pilot near the top, then the bottom; it slides and rolls after.
        const game = await fight(1, 12);
        for (const [y, label] of [
            [40, 'On its rail: sliding up after you, rolling'],
            [230, 'On its rail: sliding down'],
        ]) {
            for (let i = 0; i < 3000; i++) {
                game.set(3, 110);
                game.set(4, y);
                game.tick(1, false);
                const b = bossState(game.scene());
                if (Math.abs(b.aux[4]) > 0.04 && (y < 135 ? b.y < 100 : b.y > 170)) break;
            }
            look.push({ label, canvas: await photo(game) });
        }
    }
    add('It watches you', look);
    add('Firing', await attackTiles());
    const plates = [];
    status.textContent = 'The plate throw…';
    for (const [phase, n] of [
        [1, 'two'],
        [2, 'four'],
    ]) {
        const game = await fight(phase, 13);
        game.until((b) => b.attack === ATTACK.plateThrow && b.attackMs >= 400, 12000);
        plates.push({
            label: `Throw (${n} plates): the tell, loops drawn`,
            canvas: await photo(game),
        });
        game.until((b) => b.attackMs >= 1100, 200);
        plates.push({ label: `Throw (${n} plates): out, the eye bare`, canvas: await photo(game) });
    }
    {
        const game = await fight(3, 14);
        game.tick(20, true);
        plates.push({ label: 'Phase 3: the plates come off for good', canvas: await photo(game) });
        game.until((b) => b.attack === ATTACK.lance && b.attackMs >= 500, 6000);
        plates.push({ label: 'Phase 3: bare eye, still attacking', canvas: await photo(game) });
    }
    add('Plates', plates);
    add('Taking damage', [
        await healthAt(0.75, 'Health 75%'),
        await healthAt(0.45, 'Health 45% (phase 2)', 2),
        await healthAt(0.2, 'Health 20% (phase 3)', 3),
    ]);
    add('Death', await death());
}
