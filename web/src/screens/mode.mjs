import { loadoutText } from '../ship/catalogue.mjs';
import { element, setAttr } from '../app/dom.mjs';
import { hullById, hullIcon } from '../state/hangar.mjs';
import { drawShowcase } from '../render/showcase.mjs';
import { LEVEL_COUNT } from '../state/campaign-data.mjs';

// The Play screen (nextSteps.md C1): Campaign, Endless (locked until Act 1 is done) and Practice,
// with one switch for one or two pilots. The cards preview the hulls you will actually fly: the
// active profile's hull alone, or both profiles side by side.
export function createModeScreen({ getArt, store, activeProfile, reduced, getCampaign, loadouts }) {
    const campaign = element('modeArtCampaign').getContext('2d'),
        endless = element('modeArtEndless').getContext('2d'),
        practice = element('modeArtPractice').getContext('2d');
    const chip = element('modeHull').getContext('2d');
    let pilots = 1;
    const ship = (slot, width, height, x, y) => ({
        hull: store.profiles[slot],
        x: Math.round(width * x),
        y: Math.round(height * y),
        scale: 2,
    });
    // One ship centred, or two staggered, for the cards that follow the pilot switch.
    const ships = (width, height) =>
        pilots === 2
            ? [ship(0, width, height, 0.36, 0.34), ship(1, width, height, 0.5, 0.68)]
            : [ship(activeProfile(), width, height, 0.42, 0.5)];
    return {
        get pilots() {
            return pilots;
        },
        setPilots(count) {
            pilots = count === 2 ? 2 : 1;
            this.render();
        },
        // Is Endless open for the active profile? (No campaign yet counts as locked.)
        endlessOpen() {
            return !!getCampaign()?.endlessOpen(activeProfile());
        },
        render() {
            setAttr(element('pilotsOne'), 'aria-pressed', String(pilots === 1));
            setAttr(element('pilotsTwo'), 'aria-pressed', String(pilots === 2));
            const progress = getCampaign(),
                profile = activeProfile();
            const open = this.endlessOpen();
            setAttr(element('endlessPlay'), 'aria-disabled', String(!open));
            element('endlessNote').textContent = open
                ? pilots === 2
                    ? 'Waves without end, together'
                    : 'Waves without end'
                : 'Finish Act 1 to unlock';
            const stars = progress?.totalStars(profile) ?? 0;
            element('campaignNote').textContent =
                stars || progress?.cleared(profile, 1)
                    ? `${stars} / ${LEVEL_COUNT * 3} stars`
                    : 'Fly the six regions';
            const hull = store.profiles[activeProfile()],
                art = getArt(),
                cell = art?.sprites[hullIcon(hull)];
            element('modeHullName').textContent = hullById(hull).name;
            const summary = document.getElementById('modeLoadout');
            if (summary && loadouts)
                summary.textContent =
                    pilots === 2
                        ? [0, 1]
                              .map((i) => `P${i + 1}: ${loadoutText(loadouts.get(i))}`)
                              .join(' | ')
                        : loadoutText(loadouts.get(activeProfile()));
            if (cell) {
                chip.imageSmoothingEnabled = false;
                chip.clearRect(0, 0, 24, 16);
                chip.drawImage(art.atlas, cell.x, cell.y, cell.w, cell.h, 0, 0, 24, 16);
            }
        },
        draw(time) {
            const art = getArt();
            if (!art) return;
            const { width, height } = campaign.canvas,
                still = reduced();
            drawShowcase(campaign, art, {
                ships: ships(width, height),
                time,
                reduced: still,
                seed: 3,
            });
            drawShowcase(endless, art, {
                ships: ships(width, height),
                time,
                reduced: still,
                seed: 4,
            });
            drawShowcase(practice, art, {
                ships: [ship(activeProfile(), width, height, 0.4, 0.55)],
                time,
                reduced: still,
                seed: 5,
            });
        },
    };
}
