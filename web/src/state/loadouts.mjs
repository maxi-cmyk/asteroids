import { STARTER, SLOTS, kitForLevel, sanitizeLoadout, indexOf } from '../ship/catalogue.mjs';
import { CAMPAIGN_KEY, STAR_CLEAR } from './campaign-data.mjs';
import { HANGAR_KEY } from './hangar.mjs';
export const LOADOUT_KEY = 'asteroids.web.loadouts-v1';
const read = (storage, key) => {
    try {
        return JSON.parse(storage?.getItem(key) || 'null');
    } catch {
        return null;
    }
};
const fresh = () => ({ equipped: { ...STARTER }, grants: [1] });
export function sanitizeLoadoutProfile(raw) {
    const grants = [
        ...new Set([
            1,
            ...(Array.isArray(raw?.grants) ? raw.grants : []).filter(
                (n) => Number.isInteger(n) && n >= 1 && n <= 6,
            ),
        ]),
    ].sort((a, b) => a - b);
    const equipped = sanitizeLoadout(raw?.equipped);
    for (const slot of Object.keys(SLOTS))
        if (!grants.includes(indexOf(slot, equipped[slot]) + 1)) equipped[slot] = STARTER[slot];
    return { equipped, grants };
}
export function mergeLoadoutProfiles(a, b) {
    const left = sanitizeLoadoutProfile(a),
        right = sanitizeLoadoutProfile(b);
    return sanitizeLoadoutProfile({
        equipped: left.equipped,
        grants: [...left.grants, ...right.grants],
    });
}
export class Loadouts {
    constructor(storage) {
        this.storage = storage;
        this.status = '';
        this.profiles = [fresh(), fresh()];
        try {
            const raw = read(storage, LOADOUT_KEY);
            if (raw?.version === 1)
                this.profiles = [0, 1].map((i) => sanitizeLoadoutProfile(raw.profiles?.[i]));
            const campaign = read(storage, CAMPAIGN_KEY);
            const old = read(storage, HANGAR_KEY);
            this.profiles.forEach((profile, i) => {
                for (let n = 2; n <= 6; n++)
                    if (campaign?.profiles?.[i]?.levels?.[n]?.stars & STAR_CLEAR)
                        profile.grants.push(n);
                if (
                    !raw &&
                    indexOf('ship', old?.profiles?.[i]) >= 0 &&
                    profile.grants.includes(indexOf('ship', old.profiles[i]) + 1)
                )
                    profile.equipped.ship = old.profiles[i];
                this.profiles[i] = sanitizeLoadoutProfile(profile);
            });
        } catch {
            /* corrupt or unavailable storage falls back safely */
        }
    }
    owns(profile, slot, id) {
        return this.profiles[profile === 1 ? 1 : 0].grants.includes(indexOf(slot, id) + 1);
    }
    get(profile) {
        return { ...this.profiles[profile === 1 ? 1 : 0].equipped };
    }
    equip(profile, slot, id) {
        if (!Object.hasOwn(SLOTS, slot) || !this.owns(profile, slot, id)) return false;
        this.profiles[profile === 1 ? 1 : 0].equipped[slot] = id;
        this.save();
        return true;
    }
    grant(profile, level) {
        if (!kitForLevel(level)) return null;
        const state = this.profiles[profile === 1 ? 1 : 0];
        if (state.grants.includes(level)) return null;
        state.grants.push(level);
        state.grants.sort((a, b) => a - b);
        this.save();
        return kitForLevel(level);
    }
    save() {
        try {
            this.storage.setItem(
                LOADOUT_KEY,
                JSON.stringify({ version: 1, profiles: this.profiles }),
            );
            this.status = '';
            return true;
        } catch {
            this.status = 'Equipped for this visit. Browser storage is unavailable.';
            return false;
        }
    }
}
