// Tile: Ninefold sitting between attacks (nextSteps.md P2.1, "Idle"): it breathes, blinks,
// follows the pilot with its head, shifts its weight, and bristles when the pilot comes close.
import { note, pilot } from '../zodiarch-living/kit.mjs';
import { fox } from './kit.mjs';

const AT = [340, 120];
export function idle(ctx, t) {
    // The pilot drifts up and down, then comes in close.
    const close = t > 5600 && t < 7400;
    const py = 135 + Math.sin(t / 900) * 85,
        px = close ? 230 : 90;
    let frame = py < 95 ? 'sit-up' : py > 175 ? 'sit-down' : 'sit',
        what = 'follows you with its head';
    if ((t > 1800 && t < 1920) || (t > 4300 && t < 4420)) {
        frame = 'sit-blink';
        what = 'blinks';
    } else if (t > 3000 && t < 3600) {
        frame = 'sit-shift';
        what = 'shifts its weight';
    } else if (close) {
        frame = 'sit-bristle';
        what = 'you are close: head low, tails bristling';
    }
    const breathe = Math.round(Math.sin(t / 520));
    fox(ctx, frame, AT[0], AT[1] + breathe);
    pilot(ctx, px, close ? 150 : py);
    note(ctx, what, 12, 258);
}
