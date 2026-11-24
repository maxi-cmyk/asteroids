import { SLOTS, indexOf } from '../ship/catalogue.mjs';
// Browsing is separate from equipping. Each slot remembers its own preview.
export class HangarSelection {
    constructor(store, profile = 0) {
        this.store = store;
        this.open(profile);
    }
    open(profile) {
        this.profile = profile;
        this.slot = 'ship';
        this.kit = this.store.get(profile);
    }
    select(slot, index) {
        if (!SLOTS[slot]) return;
        this.slot = slot;
        const n = Math.max(0, Math.min(SLOTS[slot].length - 1, Math.round(Number(index) || 0)));
        this.kit = { ...this.kit, [slot]: SLOTS[slot][n].id };
    }
    get index() {
        return indexOf(this.slot, this.kit[this.slot]);
    }
    get item() {
        return SLOTS[this.slot][this.index];
    }
    get locked() {
        return !this.store.owns(this.profile, this.slot, this.item.id);
    }
    equip() {
        return this.store.equip(this.profile, this.slot, this.item.id);
    }
}
