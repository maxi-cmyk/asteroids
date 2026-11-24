import { HULLS, saveHangar } from '../state/hangar.mjs';
import { requirementText } from '../boss/unlocks.mjs';

export function buildAppearances(screen, bay) {
    bay.replaceChildren(
        ...HULLS.map((hull) => {
            const button = document.createElement('button');
            button.type = 'button';
            const open =
                !screen.unlocks ||
                screen.unlocks.isUnlocked(screen.pilot, hull.id) ||
                screen.loadouts.owns(screen.pilot, 'ship', hull.id);
            button.textContent = `${hull.name}${open ? '' : ' · locked'}`;
            button.setAttribute(
                'aria-pressed',
                String(screen.store.profiles[screen.pilot] === hull.id),
            );
            button.setAttribute('aria-disabled', String(!open));
            button.addEventListener('click', () => {
                if (!open) {
                    screen.status = requirementText(hull.id);
                    screen.render();
                    return;
                }
                screen.store.profiles[screen.pilot] = hull.id;
                screen.appearanceSaved(saveHangar(screen.storage, screen.store));
                screen.render();
            });
            return button;
        }),
    );
}
