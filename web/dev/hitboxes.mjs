// The hit-circle overlay for the dev sheets (nextSteps.md R2): add `?hitboxes=1` to
// boss-states.html or zodiarch-attacks.html and every photo shows the boss's circles by
// type: pink hurts it, gold stops shots, cyan is a key star (a Zodiarch creature's), orange
// a shootable enemy shot; red outlines are contact (what hurts the pilot).
export const HITBOXES = new URLSearchParams(location.search).get('hitboxes') === '1';

const BC = { core: 0, block: 1, part: 2, shot: 3, deflect: 4 };
const ZODIARCH = 5;

function ring(ctx, x, y, r, colour, fill = false) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.max(1, r), 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = colour.replace(/[\d.]+\)$/, '0.18)');
        ctx.fill();
    }
    ctx.stroke();
}

// Draws the circles of `game` (a runtime on test.wasm) onto `ctx`, for boss `kind`.
export function drawHitboxes(ctx, game, kind) {
    const api = game.api,
        memory = api.memory.buffer;
    const circles = new Float32Array(memory, api.web_test_boss_circles(), 1 + 6 * 64);
    ctx.save();
    for (let i = 0; i < circles[0]; i++) {
        const [x, y, r, type] = circles.subarray(1 + i * 6, 5 + i * 6);
        const colour =
            type === BC.block || type === BC.deflect
                ? 'rgba(255,200,80,1)'
                : type === BC.part && kind === ZODIARCH
                  ? 'rgba(90,240,255,1)'
                  : type === BC.shot
                    ? 'rgba(255,150,60,1)'
                    : 'rgba(255,90,180,1)';
        ring(ctx, x, y, r, colour, true);
    }
    const body = new Float32Array(memory, api.web_boss_body(), 121);
    for (let i = 0; i < body[0]; i++)
        ring(ctx, body[1 + i * 3], body[2 + i * 3], body[3 + i * 3], 'rgba(255,40,40,1)');
    ctx.restore();
}
