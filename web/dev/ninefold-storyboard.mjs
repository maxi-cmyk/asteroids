// Ninefold storyboard (nextSteps.md P2.1): the fox moving like a fox, drawn from the draft
// poses (tools/fox_poses.py, sheet assets/bosses/draft-p21-fox). A mock-up for approval: the
// page, its tiles and the frame loop; the drawing lives in ninefold-storyboard/.
import { W, H, backdrop } from './zodiarch-living/kit.mjs';
import { idle } from './ninefold-storyboard/idle.mjs';
import {
    walkTile,
    WALK_MS,
    runTile,
    RUN_MS,
    blinkTile,
    BLINK_MS,
} from './ninefold-storyboard/travel.mjs';
import { comets, foxfire, tailLost, shake } from './ninefold-storyboard/attacks.mjs';
import { split, decoyPop } from './ninefold-storyboard/split.mjs';

const tiles = [];
const root = document.getElementById('tiles');
function addTile(group, title, text, draw, loop) {
    let section = document.getElementById(group);
    if (!section) {
        section = document.createElement('section');
        section.id = group;
        section.innerHTML = `<h2>${group}</h2><div class="grid"></div>`;
        root.append(section);
    }
    const fig = document.createElement('figure'),
        canvas = document.createElement('canvas'),
        cap = document.createElement('figcaption');
    canvas.width = W;
    canvas.height = H;
    cap.innerHTML = `<b></b><p></p>`;
    cap.querySelector('b').textContent = title;
    cap.querySelector('p').textContent = text;
    fig.append(canvas, cap);
    section.querySelector('.grid').append(fig);
    tiles.push({ ctx: canvas.getContext('2d'), draw, loop, title });
}

addTile(
    'Sitting',
    'Idle',
    'Between attacks it sits and looks alive: it breathes, blinks, follows you with its head (up, level, down), shifts its weight, and when you come close it lowers its head and its tails bristle.',
    idle,
    8000,
);
addTile(
    'Getting about',
    'Walk',
    'Short moves (under 90 px) are a four-beat trot at about 1.2 px a tick, head low and level. It gets up first and sits again at the next perch; each footfall leaves a star that fades.',
    walkTile,
    WALK_MS,
);
addTile(
    'Getting about',
    'Run, four ways',
    'Long moves are a gallop at about 3.2 px a tick: a crouch first, the body long and low, ears back, tails streaming; the gallop turns up or down on a slope and is mirrored running right. It skids to a stop and turns back to face you before it sits.',
    runTile,
    RUN_MS,
);
addTile(
    'Getting about',
    'Blink as a leap',
    'The blink: it crouches and wiggles its rear, leaps, dissolves into stars at the top, reforms above the next perch and lands front paws first, then skids into a sit.',
    blinkTile,
    BLINK_MS,
);
addTile(
    'Contortions',
    'Comets',
    'Anticipation: the tails draw up over its back. Action: they whip forward one after another, a comet leaving each tip. Follow-through: they settle back into the fan.',
    comets,
    4200,
);
addTile(
    'Contortions',
    'Foxfire',
    'It ducks and scoops while foxfire gathers between its jaws, tosses its head to throw three flames up and out, then licks its chops and shakes its head.',
    foxfire,
    4200,
);
addTile(
    'Contortions',
    'Tail lost',
    'A tail is shot through: it yelps with its head thrown back, turns right round to look at its tails, then glares at you, dazed. The daze is the window: the forehead mark is open.',
    tailLost,
    5200,
);
addTile(
    'Contortions',
    'Seen through',
    'Both illusions popped: it shakes itself like a wet dog, head to tail, stands taller with its ears up, and the mark opens.',
    shake,
    4600,
);
addTile(
    'The split',
    'Cocoon and three foxes',
    'It spins on the spot and its tails wrap it into a cocoon that shrinks to 0.6 in size (eased, not in one tick). The cocoon bursts and three foxes run to their places by their own paths, arriving out of step, so timing never gives the real one away. Only the real one has lit eyes.',
    split,
    4200,
);
addTile(
    'The split',
    'A decoy pops, then it ends',
    'A popped decoy bursts into foxfire that streams back to the real fox, showing you which one it is. When the illusion ends, the other decoy runs back into the real fox, which grows back to full size in one shake.',
    decoyPop,
    6000,
);

function frame(now) {
    for (const tile of tiles) {
        const t = now % tile.loop;
        tile.ctx.imageSmoothingEnabled = false;
        backdrop(tile.ctx);
        tile.draw(tile.ctx, t);
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.storyboardReady = true;
window.drawTileAt = (index, t) => {
    const tile = tiles[index];
    backdrop(tile.ctx);
    tile.draw(tile.ctx, t);
    return tile.ctx.canvas;
};
window.tileCount = () => tiles.length;
