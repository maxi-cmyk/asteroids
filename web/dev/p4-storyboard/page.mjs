// The P4 storyboards' page (nextSteps.md P4): sections of looping tiles, one canvas each,
// drawn every frame, plus the hooks the sheet-saver uses (drawTileAt, tileCount).
import { W, H } from '../zodiarch-living/kit.mjs';

const tiles = [];
const root = document.getElementById('tiles');

// A tile: `draw(ctx, t)` paints one moment of a loop `loop` ms long over `backdrop(ctx)`.
export function addTile(group, title, text, draw, loop, backdrop) {
    let section = [...root.children].find((s) => s.dataset.group === group);
    if (!section) {
        section = document.createElement('section');
        section.dataset.group = group;
        section.innerHTML = `<h2></h2><div class="grid"></div>`;
        section.querySelector('h2').textContent = group;
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
    tiles.push({ ctx: canvas.getContext('2d'), draw, loop, backdrop, title });
}

function paint(tile, t) {
    tile.ctx.imageSmoothingEnabled = false;
    tile.backdrop(tile.ctx);
    tile.draw(tile.ctx, t);
    return tile.ctx.canvas;
}
export function start() {
    const frame = (now) => {
        for (const tile of tiles) paint(tile, now % tile.loop);
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    window.storyboardReady = true;
    window.drawTileAt = (index, t) => paint(tiles[index], t);
    window.tileCount = () => tiles.length;
}
