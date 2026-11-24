import { element } from '../app/dom.mjs';
import { SLOTS } from '../ship/catalogue.mjs';

// Thumbnail rail owns presentation; the selection model remains the only equip path.
export class HangarCards {
    constructor(screen) {
        this.screen = screen;
        this.entries = [];
        this.key = '';
    }
    build() {
        const { selection } = this.screen;
        this.entries = SLOTS[selection.slot].map((item, index) => {
            const button = document.createElement('button'),
                canvas = document.createElement('canvas'),
                name = document.createElement('strong'),
                state = document.createElement('span');
            button.type = 'button';
            button.dataset.option = item.id;
            canvas.width = 192;
            canvas.height = 88;
            canvas.setAttribute('aria-hidden', 'true');
            name.textContent = item.name;
            state.className = 'hangar-card-state';
            button.append(state, canvas, name);
            button.addEventListener('click', () => {
                selection.select(selection.slot, index);
                this.screen.render();
            });
            return { item, button, canvas, state };
        });
        element('hangarOptions').replaceChildren(...this.entries.map(({ button }) => button));
        this.key = '';
        this.shown = null;
    }
    render(equipped) {
        const { selection, loadouts, pilot } = this.screen;
        for (const { item, button, state } of this.entries) {
            const locked = !loadouts.owns(pilot, selection.slot, item.id),
                active = selection.item.id === item.id,
                worn = equipped[selection.slot] === item.id;
            button.dataset.locked = String(locked);
            button.setAttribute('aria-pressed', String(active));
            button.setAttribute(
                'aria-label',
                `${item.name}${locked ? `, locked, clear Level ${SLOTS[selection.slot].indexOf(item) + 1}` : worn ? ', equipped' : ', preview'}`,
            );
            state.textContent = locked
                ? `Clear Level ${SLOTS[selection.slot].indexOf(item) + 1}`
                : worn
                  ? 'Equipped'
                  : active
                    ? 'Preview'
                    : '';
            state.dataset.equipped = String(worn);
            if (active && this.shown !== item.id)
                button.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        }
        this.shown = selection.item.id;
    }
    draw(paint) {
        const { stage, selection } = this.screen;
        const key = `${stage.version}:${selection.slot}:${paint}`;
        if (this.key === key) return;
        this.key = key;
        for (const { item, canvas } of this.entries)
            stage.paint(canvas, selection.slot, item.id, paint);
    }
}
