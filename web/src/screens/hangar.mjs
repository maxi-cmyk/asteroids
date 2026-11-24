import { element } from '../app/dom.mjs';
import { saveHangar } from '../state/hangar.mjs';
import { HangarSelection } from '../state/hangar-selection.mjs';
import { LoadoutPreview } from '../ship/preview.mjs';
import { SLOTS, loadoutText } from '../ship/catalogue.mjs';
import { PAINTS, paintById } from '../ship/paint.mjs';
import { HangarStage } from './hangar-stage.mjs';
import { buildAppearances } from './hangar-appearances.mjs';
import { HangarCards } from './hangar-cards.mjs';
import { renderHangarStats } from './hangar-stats.mjs';

class HangarScreen {
    constructor(options) {
        Object.assign(this, options);
        this.pilot = 0;
        this.status = '';
        this.selection = new HangarSelection(this.loadouts);
        this.stage = new HangarStage(element('hangarStage'));
        this.cards = new HangarCards(this);
        this.tabs = [...document.querySelectorAll('[data-hangar-slot]')];
        this.pilotButtons = [...document.querySelectorAll('[data-pilot]')];
        for (const button of this.tabs)
            button.addEventListener('click', () => {
                this.selection.select(
                    button.dataset.hangarSlot,
                    this.indexFor(button.dataset.hangarSlot),
                );
                this.buildOptions();
                this.render();
            });
        for (const button of this.pilotButtons)
            button.addEventListener('click', () => this.open(Number(button.dataset.pilot)));
        element('hangarPrevious').addEventListener('click', () => this.browse(-1));
        element('hangarNext').addEventListener('click', () => this.browse(1));
        const stage = element('hangarCarousel');
        let down = null,
            wheel = 0;
        stage.addEventListener('pointerdown', (event) => {
            down = event.clientX;
        });
        stage.addEventListener('pointerup', (event) => {
            if (down !== null && Math.abs(event.clientX - down) > 45)
                this.browse(event.clientX < down ? 1 : -1);
            down = null;
        });
        stage.addEventListener('pointercancel', () => {
            down = null;
        });
        for (const surface of [stage, element('hangarOptions')])
            surface.addEventListener(
                'wheel',
                (event) => {
                    const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
                    if (!delta) return;
                    event.preventDefault();
                    wheel += delta;
                    if (Math.abs(wheel) > 45) {
                        this.browse(Math.sign(wheel));
                        wheel = 0;
                    }
                },
                { passive: false },
            );
        element('equipPreview').addEventListener('click', () => this.equip());
        element('testLoadout').addEventListener('click', () => {
            const test = element('hangarTest');
            test.hidden = !test.hidden;
            element('testLoadout').setAttribute('aria-expanded', String(!test.hidden));
            element('testLoadout').textContent = test.hidden ? 'Test loadout' : 'Close test';
            if (!test.hidden) test.scrollIntoView({ block: 'nearest' });
        });
        element('retryLoadout').addEventListener('click', () => {
            this.loadouts.save();
            this.render();
        });
        element('retryPaint').addEventListener('click', () => {
            this.appearanceSaved(saveHangar(this.storage, this.store));
            this.render();
        });
        element('hangarPaints').replaceChildren(
            ...PAINTS.map((paint) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.paint = paint.id;
                button.textContent = paint.name;
                button.title = paint.name;
                button.setAttribute('aria-label', paint.name);
                button.style.setProperty('--paint', paint.hex);
                button.addEventListener('click', () => {
                    this.store.paints[this.pilot] = paint.id;
                    this.appearanceSaved(saveHangar(this.storage, this.store));
                    this.render();
                });
                return button;
            }),
        );
    }
    indexFor(slot) {
        return SLOTS[slot].findIndex((item) => item.id === this.selection.kit[slot]);
    }
    browse(delta) {
        this.selection.select(this.selection.slot, this.selection.index + delta);
        this.render();
    }
    setPreview(runtime, renderer) {
        this.range = new LoadoutPreview(runtime, renderer);
    }
    appearanceSaved(saved) {
        this.paintUnsaved = !saved;
        this.status = saved
            ? ''
            : 'Appearance kept for this visit. Browser storage is unavailable; retry saving.';
    }
    buildOptions() {
        this.cards.build();
    }

    equip() {
        const { selection } = this;
        if (selection.equip() && selection.slot === 'ship') {
            this.store.profiles[this.pilot] = selection.item.id;
            this.appearanceSaved(saveHangar(this.storage, this.store));
        }
        this.render();
    }
    render() {
        const { selection } = this,
            { item, slot, index } = selection;
        const equipped = this.loadouts.get(this.pilot);
        const same = equipped[slot] === item.id;
        element('hangarName').textContent = item.name;
        element('hangarTag').textContent = selection.locked
            ? `LOCKED · Clear Act 1 Level ${index + 1}`
            : same
              ? 'EQUIPPED'
              : 'PREVIEW';
        element('hangarBlurb').textContent = item.detail;
        renderHangarStats(slot, item, equipped);
        element('hangarCount').textContent = `${String(index + 1).padStart(2, '0')} / 06`;
        element('hangarPrevious').disabled = index === 0;
        element('hangarNext').disabled = index === 5;
        element('equipPreview').textContent = selection.locked
            ? `Clear Level ${index + 1} to equip`
            : same
              ? `${item.name} equipped`
              : `Equip ${item.name}`;
        element('equipPreview').disabled = same || selection.locked;
        element('loadoutSummary').textContent = `Equipped · ${loadoutText(equipped)}`;
        element('loadoutStatus').textContent = this.loadouts.status;
        element('retryLoadout').hidden = !this.loadouts.status;
        element('hangarStatus').textContent = this.status;
        element('retryPaint').hidden = !this.paintUnsaved;
        for (const button of this.tabs)
            button.setAttribute('aria-pressed', String(button.dataset.hangarSlot === slot));
        for (const button of this.pilotButtons)
            button.setAttribute(
                'aria-pressed',
                String(Number(button.dataset.pilot) === this.pilot),
            );
        this.cards.render(equipped);
        const paint = paintById(this.store.paints[this.pilot]);
        element('paintLabel').textContent = `Accent colour · ${paint.name}`;
        for (const button of element('hangarPaints').children)
            button.setAttribute('aria-pressed', String(button.dataset.paint === paint.id));
        this.range?.select(selection.kit);
        if (this.range) this.range.renderer.paints = [paint.id];
        this.stage.draw(selection.kit, paint.id, slot);
        this.cards.draw(paint.id);
        buildAppearances(this, element('hangarBay'));
    }
    open(profile = this.activeProfile()) {
        this.pilot = profile;
        this.selection.open(profile);
        this.status = '';
        this.store.paints ||= ['cobalt', 'cobalt'];
        this.buildOptions();
        this.render();
    }
    draw(time) {
        if (!element('hangarTest').hidden) this.range?.draw(time, this.reduced());
        const paint = this.store.paints[this.pilot];
        this.stage.draw(this.selection.kit, paint, this.selection.slot);
        this.cards.draw(paint);
    }
}
export const createHangarScreen = (options) => new HangarScreen(options);
