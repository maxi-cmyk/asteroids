// Zodiarch "living dragon" storyboard (nextSteps.md P3): the steered, serpentine swim against
// today's loop, the summon, the coil-spit, the lunge, the forehead pearl with its window and
// the three hit looks, and the bigger black hole. A mock-up for approval, drawn with the real
// sprites; the head is turned in the browser here, where the game uses pre-turned frames. The
// page: its tiles and the frame loop; the drawing lives in zodiarch-living/.

import { W, H, backdrop } from './zodiarch-living/kit.mjs';
import { today, living } from './zodiarch-living/movement.mjs';
import { summon, conjunction } from './zodiarch-living/summon.mjs';
import { coilspit } from './zodiarch-living/coilspit.mjs';
import { lunge } from './zodiarch-living/lunge.mjs';
import { pearlWindow } from './zodiarch-living/pearl.mjs';
import { looks } from './zodiarch-living/looks.mjs';
import { hole } from './zodiarch-living/hole.mjs';

// ---------------------------------------------------------------- tiles
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
// ---------------------------------------------------------------- the page
const G = 'The living dragon (P3)';
addTile(
    G,
    'Today',
    'The head swims a fixed figure of eight and is always drawn facing left. Half the loop it swims right, so the neck folds back on itself: the red marker shows the angle.',
    today,
    16000,
);
addTile(
    G,
    'New movement',
    'The head steers itself with a capped turn rate and the body follows its trail, so the body can only curve. A sideways wave makes the serpent S. It chooses what to do from where you are: stalk, surge, rear, dive behind the ring, hold (still breathing), recoil from a hit.',
    living,
    24000,
);
addTile(
    G,
    'Summon',
    'It rears and calls: a beam of starlight from its eye to the sign. The sign flares, the whole constellation peels off and arcs over, growing, while a ring marks where it will land. The engraving uncovers itself from the key star. Leaving is the reverse.',
    summon,
    6000,
);
addTile(
    G,
    'Great Conjunction',
    'Three beams from its eye, three constellations in flight at once.',
    conjunction,
    6000,
);
addTile(
    G,
    'Coil-spit (replaces the fireballs)',
    'It winds into a spiral; fire climbs the body segment by segment to the throat while three aims are warned (900 ms); the coil springs and it spits three streams of fire globs, each bursting into embers; then it uncoils, smoke at the jaw.',
    coilspit,
    5600,
);
addTile(
    G,
    'Lunge, then a double lunge',
    'It faces you and draws its neck back into an S while a lane is warned (900 ms); it strikes down the lane (never past x 120) and bites; stretched out, its forehead pearl opens: the reward for dodging. Then a double lunge, the second lane warned during the first strike.',
    lunge,
    8600,
);
addTile(
    G,
    'Forehead pearl: the window',
    'The pearl sits between the horns under two brow scales. Tell: the scales twitch and light leaks out (600 ms). Open: the scales part, a ring drains over 2.5 s, the whole body rim turns pink, and the boss bar shows it too. Then they snap shut.',
    pearlWindow,
    6000,
);
addTile(
    G,
    'Three looks',
    'Pink burst: it hurts. Gold spark glancing off: stopped (head, closed pearl). Nothing: it passes through the body. A key star pulses with a four-pointed glint and shows three pips; each hit cracks one, the third breaks the creature.',
    looks,
    8600,
);
addTile(
    G,
    'Black hole: today and new',
    'Almost twice the size: a lethal core of 18 px (drawn 20), a tilted accretion disc to 60 px with a hot inner edge, and a lensing rim. The warning swirl grows to match.',
    hole,
    4000,
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
