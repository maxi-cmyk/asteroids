// Zodiarch attack storyboard (nextSteps.md P2.3): every sign's summon and attack, and the
// dragon's own new attacks, animated on a loop with the real sprites. A mock-up for approval,
// not the engine: timings follow the plan (forming 700 ms, warnings 900 ms or more) and every
// shot leaves from an emitter on the figure (assets/bosses/draft-p2-emitters.json). The page:
// its tiles and the frame loop; the drawing lives in zodiarch-storyboard/.

import { W, H, S, backdrop, view } from './zodiarch-storyboard/kit.mjs';
import './zodiarch-storyboard/signs-spring.mjs';
import './zodiarch-storyboard/signs-summer.mjs';
import './zodiarch-storyboard/signs-autumn.mjs';
import './zodiarch-storyboard/signs-winter.mjs';
import { D } from './zodiarch-storyboard/own.mjs';
import { ST } from './zodiarch-storyboard/states-data.mjs';
import { statesTile } from './zodiarch-storyboard/states-tile.mjs';
import { STATES } from './zodiarch-storyboard/states-break.mjs';

// ---------------------------------------------------------------- the page
const NAMES = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpius',
    'Sagittarius',
    'Capricornus',
    'Aquarius',
    'Pisces',
];
const WHAT = [
    'Summoned from the ring; light gathers on its horns, a lane from the ram to the edge, then it charges all the way across and off the screen.',
    'Aldebaran kindles and sweeps a red eye beam; then the bull stampedes the whole field, bursting its star knot as it passes you.',
    'The twins take the rows either side of you; light gathers in their hands and two beams cross from them; they step closer and fire again.',
    'Its claws shoot out on tethers down two warned lanes at your column, then snap back.',
    'Roar: the mane flares and the head shudders, then the ring (one notch). Three suns bud from the mane and are tossed off one by one. Only then the crouch, eye glint and warned lane, and the pounce all the way across.',
    'She throws four seeds from her hand; each sprouts and fires one needle; then Spica is flung as a nova star.',
    'The beam tips and the field tilts; weights drop from the pans.',
    'Everything leaves the sting at the tip: the tail cocks while venom gathers, a venom beam whips an arc, then the sting itself is fired and homes in.',
    'Three aim lines from the arrowhead, then two volleys down them.',
    'A short, hard dive; a big splash (flash, spray column, ripples) while the fan of lanes flickers; two waves of stars burst out in every direction, each with a gap; it leaps back up.',
    'The urn pours a wavering stream; each droplet hangs, fuses (motes spiral in, blue to white to gold under a closing ring) and bursts into six sparks.',
    'The fish part as wide as the field allows, the slack cord harmless: slip between them. They turn, close in, and the cord pulls taut and lights: the gap is filled, go round the outside.',
];
const DRAGON = [
    ['Eye lasers', D.eyes, 'Its eye kindles; aim lines; a beam sweeps a short arc toward you.'],
    [
        'Fireballs',
        D.fireballs,
        'The jaws glow; three slow fireballs, each splitting into five embers.',
    ],
    [
        'Nova stars',
        D.novas,
        'Its claws fling stars to marked spots; each counts down and bursts, one gap in its ring.',
    ],
    [
        'Black hole',
        D.blackhole,
        'The pearl flings a singularity well away from you: a gentle pull (full thrust escapes) that swallows your shots.',
    ],
    [
        'Meteor fall',
        D.meteors,
        'The tail fan flares and flicks five meteors down curved, pre-drawn paths.',
    ],
    [
        'Constellation net',
        D.net,
        'Three ring stars kindle and join; the lines turn lethal for 1.5 s, always with room outside.',
    ],
    [
        'Starfire breath',
        D.breath,
        'Three lanes from the jaws (as now), with the charge glow at the mouth.',
    ],
    [
        'Phase 3: three signs at once',
        D.phase3,
        'A charger, a ranged sign and a field sign, thrown 1.2 s apart, while the dragon keeps up its fireballs.',
    ],
];
const LOOP = 4600;
const tiles = [];
const root = document.getElementById('tiles');
function addTile(group, title, text, draw, loop = LOOP) {
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
NAMES.forEach((name, k) =>
    addTile('The twelve signs', `${name}`, WHAT[k], S[k], Math.max(LOOP, S[k].loop)),
);
NAMES.forEach((name, k) =>
    addTile('Creature states', `${name}`, STATES[k], statesTile(k), ST.loop),
);
for (const [name, draw, text] of DRAGON)
    addTile(
        'The Zodiarch itself',
        name,
        text,
        draw,
        name.startsWith('Phase') ? 7200 : name === 'Black hole' ? 5600 : LOOP,
    );
function frame(now) {
    for (const tile of tiles) {
        const t = now % tile.loop,
            clock = 4 + Math.sin(now / 9000) * 0.25;
        tile.ctx.imageSmoothingEnabled = false;
        backdrop(tile.ctx);
        view.dragon = true;
        tile.draw(tile.ctx, t, clock);
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.storyboardReady = true;
// Exposed for frame export: draw a tile at a given time onto a canvas.
window.drawTileAt = (index, t) => {
    const tile = tiles[index];
    backdrop(tile.ctx);
    tile.draw(tile.ctx, t, 4);
    return tile.ctx.canvas;
};
window.tileCount = () => tiles.length;
