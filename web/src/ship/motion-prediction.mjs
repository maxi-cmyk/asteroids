import { SHIPS } from './catalogue.mjs';
import { S } from '../runtime/scene-layout.mjs';

// Bot steering estimate only. WASM remains the authority for actual movement.
export function predictMotion(scene, dx, dy, steps) {
    const tuning = SHIPS[scene[S.SHIP_TYPE]],
        length = Math.hypot(dx, dy) || 1;
    const tx = (dx / length) * tuning.speed,
        ty = (dy / length) * tuning.speed;
    const amount = (tuning.speed * 20) / (!dx && !dy ? tuning.braking : tuning.acceleration);
    let x = scene[S.SHIP_X],
        y = scene[S.SHIP_Y],
        vx = scene[S.LOADOUT_VX],
        vy = scene[S.LOADOUT_VY];
    const positions = [[x, y]];
    for (let t = 1; t <= steps; t++) {
        const ax = tx - vx,
            ay = ty - vy,
            distance = Math.hypot(ax, ay),
            scale = distance > amount ? amount / distance : 1;
        vx += ax * scale;
        vy += ay * scale;
        x = Math.max(16, Math.min(464, x + vx * 3.65625));
        y = Math.max(16, Math.min(248, y + vy * 3.65625));
        positions.push([x, y]);
    }
    return positions;
}
