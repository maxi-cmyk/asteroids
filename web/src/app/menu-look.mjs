import { REGIONS, regionIndexForWave } from '../render/regions.mjs';
import { Backgrounds, WIDTH, HEIGHT } from '../render/backgrounds.mjs';

// Menu look (nextSteps.md H2): the backdrop behind every menu screen. "classic" is the
// original scene; each region's look is a still of that region's sky and planet, offered once
// the player has flown there; "last" follows the furthest region reached.
export const DEFAULT_MENU_LOOK = 'classic';
export const MENU_LOOKS = Object.freeze([
    { id: 'classic', title: 'Classic' },
    { id: 'last', title: 'Furthest region reached' },
    ...REGIONS.map((region) => ({ id: region.id, title: region.name })),
]);
export const isMenuLook = (id) => MENU_LOOKS.some((look) => look.id === id);

// The highest wave a profile has reached in a real (not practice) run, from its personal bests.
export function furthestWave(records, profile) {
    let wave = 0;
    for (const [key, record] of Object.entries(records?.profiles?.[profile] ?? {})) {
        let practice = false;
        try {
            practice = JSON.parse(key)[3] === true;
        } catch {
            continue;
        }
        if (!practice) wave = Math.max(wave, record?.wave ?? 0);
    }
    return wave;
}
// Regions this profile may pick: the first is always open, the rest once reached.
export function regionsReached(wave) {
    return wave > 0 ? regionIndexForWave(wave) + 1 : 1;
}
// The region a look shows (an index into REGIONS), or -1 for Classic. A look for a region not
// yet reached falls back to Classic, as does anything unknown.
export function lookRegion(look, wave) {
    const open = regionsReached(wave);
    if (look === 'last') return wave > 0 ? open - 1 : -1;
    const index = REGIONS.findIndex((region) => region.id === look);
    return index >= 0 && index < open ? index : -1;
}
// The menu music that matches a look: Classic keeps the playlist, a region plays its theme.
export const lookTrack = (region) => (region < 0 ? 'cycle' : REGIONS[region].id);

// Applies a look to the page: a still of the region (built once per region) as
// --menu-backdrop, a veil of the region's colour as --menu-veil, and body[data-look].
export class MenuLook {
    constructor() {
        this.applied = null;
        this.stills = new Map();
        this.backgrounds = null;
    }
    #still(index, worlds) {
        if (this.stills.has(index)) return this.stills.get(index);
        if (!worlds) return null;
        this.backgrounds ??= new Backgrounds({ reduced: true });
        if (!this.backgrounds.worlds) this.backgrounds.setWorlds(worlds);
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        this.backgrounds.paintRegion(canvas.getContext('2d'), index, 0);
        const url = canvas.toDataURL('image/png');
        this.stills.set(index, url);
        return url;
    }
    // Cheap when nothing changed: called every frame.
    sync(region, worlds) {
        const key = `${region}:${!!worlds}`;
        if (key === this.applied) return;
        const root = document.documentElement.style;
        const url = region >= 0 ? this.#still(region, worlds) : null;
        if (region >= 0 && !url) return; // art not loaded yet; try again next frame
        this.applied = key;
        document.body.dataset.look = region >= 0 ? REGIONS[region].id : 'classic';
        if (region < 0) {
            root.removeProperty('--menu-backdrop');
            root.removeProperty('--menu-veil');
            return;
        }
        const veil = REGIONS[region].fallback;
        root.setProperty('--menu-backdrop', `url("${url}") center / cover`);
        root.setProperty('--menu-veil', `linear-gradient(${veil}d9, ${veil}f0)`);
    }
}
