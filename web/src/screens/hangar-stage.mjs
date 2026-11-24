import { SHIPS, PRIMARIES, SECONDARIES } from '../ship/catalogue.mjs';
import { paintedCell } from '../render/ship-paint.mjs';

const ICON = { x: 516, y: 8, w: 24, h: 16 }; // each hull sheet keeps its side view here
const WEAPON = 24;
// assets/weapons/icons.png holds one 24x24 cell per weapon: primaries, then secondaries.
const WEAPON_ORDER = [...PRIMARIES, ...SECONDARIES].map((weapon) => weapon.id);

// The showroom draws the same pixel art the game flies: the hull's side view with its accent
// recoloured, and the weapon icons sheet. Everything is enlarged by whole pixels only.
export class HangarStage {
    constructor(canvas) {
        this.canvas = canvas;
        this.images = new Map();
        this.weapons = null;
        this.key = '';
        this.version = 0;
        const load = (src, done) => {
            const image = new Image();
            image.onload = () => {
                done(image);
                this.version++;
                this.key = '';
            };
            image.src = src;
        };
        for (const ship of SHIPS)
            load(`./assets/ships/${ship.id}/states.png`, (image) => {
                const side = document.createElement('canvas');
                side.width = ICON.w;
                side.height = ICON.h;
                side.getContext('2d').drawImage(
                    image,
                    ICON.x,
                    ICON.y,
                    ICON.w,
                    ICON.h,
                    0,
                    0,
                    ICON.w,
                    ICON.h,
                );
                this.images.set(ship.id, side);
            });
        load('./assets/weapons/icons.png', (image) => {
            this.weapons = image;
        });
    }
    // Largest whole-pixel scale at which a w x h sprite fits `fraction` of the canvas.
    fit(canvas, w, h, fraction, tall = 0.8) {
        return Math.max(
            1,
            Math.floor(Math.min((canvas.width * fraction) / w, (canvas.height * tall) / h)),
        );
    }
    ship(ctx, canvas, ship, paint, { fraction = 0.72, centre = 0.5 } = {}) {
        const image = this.images.get(ship);
        if (!image) return;
        const source =
            paint === 'cobalt'
                ? image
                : paintedCell(image, { x: 0, y: 0, w: image.width, h: image.height }, paint);
        const scale = this.fit(canvas, image.width, image.height, fraction);
        ctx.drawImage(
            source,
            Math.round(canvas.width * centre - (image.width * scale) / 2),
            Math.round((canvas.height - image.height * scale) / 2),
            image.width * scale,
            image.height * scale,
        );
    }
    weapon(ctx, canvas, id, { fraction = 0.4, centre = 0.5, tall = 0.8 } = {}) {
        const at = WEAPON_ORDER.indexOf(id);
        if (!this.weapons || at < 0) return;
        const scale = this.fit(canvas, WEAPON, WEAPON, fraction, tall);
        ctx.drawImage(
            this.weapons,
            at * WEAPON,
            0,
            WEAPON,
            WEAPON,
            Math.round(canvas.width * centre - (WEAPON * scale) / 2),
            Math.round((canvas.height - WEAPON * scale) / 2),
            WEAPON * scale,
            WEAPON * scale,
        );
    }
    // A ship card, or a weapon card, in the thumbnail rail.
    paint(canvas, slot, id, paint) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        if (slot === 'ship') this.ship(ctx, canvas, id, paint, { fraction: 0.7 });
        else this.weapon(ctx, canvas, id, { fraction: 0.5, tall: 0.92 });
    }
    // The large stage: the ship alone, or the ship beside the weapon being previewed.
    scene(kit, slot, paint) {
        const canvas = this.canvas,
            ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        if (slot === 'ship') this.ship(ctx, canvas, kit.ship, paint);
        else {
            this.ship(ctx, canvas, kit.ship, paint, { fraction: 0.4, centre: 0.3 });
            this.weapon(ctx, canvas, kit[slot], { fraction: 0.34, centre: 0.72 });
        }
    }
    draw(kit, paint, slot = 'ship') {
        const key = `${slot}:${kit.ship}:${kit[slot]}:${paint}:${this.version}`;
        if (key === this.key) return;
        this.key = key;
        this.scene(kit, slot, paint);
    }
}
