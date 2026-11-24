import { BLOCKS } from '../../runtime/scene-layout.mjs';

// Every effect is reconstructed from the scene, including the isolated Hangar preview.
export class LoadoutShotsLayer {
    draw({ ctx, scene, players }) {
        for (const [owner, s] of (players ? players.map((p) => p.scene) : [scene]).entries()) {
            const { at, stride, count } = BLOCKS.LOADOUT_SHOTS;
            for (let i = 0; i < count; i++) {
                const n = at + i * stride;
                if (!s[n]) continue;
                const x = Math.round(s[n + 1]),
                    y = Math.round(s[n + 2]),
                    kind = s[n + 3],
                    secondary = s[n + 4];
                ctx.save();
                ctx.fillStyle = secondary ? '#ffd68c' : owner ? '#efb963' : '#70d9ed';
                ctx.strokeStyle = ctx.fillStyle;
                if (kind === 3) {
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = Math.max(0.2, 1 - s[n + 5] / s[n + 6]);
                    ctx.beginPath();
                    ctx.arc(x, y, (80 * s[n + 5]) / s[n + 6], 0, Math.PI * 2);
                    ctx.stroke();
                } else if (kind === 4) {
                    ctx.fillRect(x - 4, y - 4, 8, 8);
                    ctx.fillStyle = '#171028';
                    ctx.fillRect(x - 2, y - 2, 4, 4);
                    ctx.fillStyle = ctx.strokeStyle;
                    ctx.fillRect(x - 1, y - 1, 2, 2);
                } else if (kind === 5) {
                    ctx.fillRect(x - 5, y - 2, 10, 4);
                    ctx.fillRect(x - 2, y - 5, 4, 10);
                } else {
                    ctx.translate(x, y);
                    ctx.rotate(Math.atan2(s[n + 9], s[n + 8]));
                    ctx.fillRect(-2, -1, kind === 2 ? 8 : s[n + 7] >= 3 ? 10 : 5, 3);
                    if (kind === 2) {
                        ctx.fillStyle = '#ff8a4a';
                        ctx.fillRect(-5, 0, 3, 2);
                    }
                }
                ctx.restore();
            }
        }
    }
}
