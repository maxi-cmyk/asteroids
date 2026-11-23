import { element, setAttr, setData, setText } from '../app/dom.mjs';
import { Backgrounds, WIDTH, HEIGHT } from '../render/backgrounds.mjs';
import { KINDS, REGION_SHEETS } from '../boss/scene.mjs';
import {
    LEVELS,
    LEVEL_COUNT,
    STAR_BITS,
    STAR_NAMES,
    clock,
    starCount,
} from '../state/campaign-data.mjs';

const star = (on) => {
    const node = document.createElement('i');
    node.className = 'star';
    node.dataset.on = String(on);
    node.setAttribute('aria-hidden', 'true');
    return node;
};
export const starsLabel = (mask) => `${starCount(mask)} of 3 stars`;

// The level select (nextSteps.md C1): the six Act 1 levels as cards on a path. Each shows its
// region's sky, the silhouettes of its mini-boss and boss (in colour once beaten), the stars
// earned and the best time and score. A level opens when the one before it is cleared.
export function createLevelsScreen({ getArt, getBossArt, getRuntime, activeProfile, pick }) {
    let built = false,
        sky = null,
        skyDone = false;
    const cards = [];
    function build() {
        if (built) return;
        built = true;
        const list = element('levelList');
        for (const info of LEVELS) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'level-card';
            button.dataset.level = String(info.level);
            button.setAttribute('role', 'listitem');
            const art = document.createElement('canvas');
            art.className = 'level-sky';
            art.width = WIDTH;
            art.height = HEIGHT;
            art.setAttribute('aria-hidden', 'true');
            const tag = document.createElement('em');
            tag.textContent = `LEVEL ${info.level}`;
            const name = document.createElement('strong');
            name.textContent = info.region.name;
            const foes = document.createElement('span');
            foes.className = 'level-foes';
            const icons = [info.miniKind, info.bossKind].map((kind) => {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = kind >= 6 ? 48 : 64;
                canvas.dataset.kind = String(kind);
                canvas.setAttribute('aria-hidden', 'true');
                return canvas;
            });
            const names = document.createElement('b');
            names.textContent = `${info.mini} · ${info.boss}`;
            foes.append(...icons, names);
            const stars = document.createElement('span');
            stars.className = 'level-stars';
            stars.append(star(false), star(false), star(false));
            const best = document.createElement('span');
            best.className = 'level-best';
            button.append(art, tag, name, foes, stars, best);
            button.addEventListener('click', () => {
                if (button.getAttribute('aria-disabled') === 'true') {
                    setText(
                        element('levelsNote'),
                        `Clear level ${info.level - 1} to open level ${info.level}.`,
                    );
                    return;
                }
                pick(info.level);
            });
            list.append(button);
            cards.push({ info, button, art, icons, stars, best });
        }
        const bossArt = getBossArt();
        for (const sheet of REGION_SHEETS) bossArt?.load(sheet);
    }
    return {
        install: build,
        render() {
            build();
            const runtime = getRuntime(),
                profile = activeProfile();
            const progress = runtime?.campaign;
            const defeated = runtime?.bossRecords.profiles[profile] ?? {};
            for (const { info, button, icons, stars, best } of cards) {
                const open = progress?.isOpen(profile, info.level) ?? info.level === 1;
                const mask = progress?.stars(profile, info.level) ?? 0;
                const record = progress?.best(profile, info.level);
                setAttr(button, 'aria-disabled', String(!open));
                setData(button, 'state', !open ? 'locked' : mask ? 'cleared' : 'open');
                stars.querySelectorAll('.star').forEach((node, i) => {
                    const on = String(!!(mask & STAR_BITS[i]));
                    if (node.dataset.on !== on) node.dataset.on = on;
                });
                setAttr(stars, 'aria-label', starsLabel(mask));
                setText(
                    best,
                    !open
                        ? `Clear level ${info.level - 1} first`
                        : record
                          ? `Best ${clock(record.bestMs)} · ${record.bestScore.toLocaleString('en-US')}`
                          : 'Not cleared yet',
                );
                for (const canvas of icons) {
                    const kind = Number(canvas.dataset.kind);
                    setData(canvas, 'state', defeated[KINDS[kind].id] ? 'beaten' : 'unseen');
                }
                button.setAttribute(
                    'aria-label',
                    `Level ${info.level}, ${info.region.name}. ${info.mini} then ${info.boss}. ${open ? starsLabel(mask) : 'Locked'}.`,
                );
            }
            const total = progress?.totalStars(profile) ?? 0;
            setText(element('levelsStars'), `${total} / ${LEVEL_COUNT * 3}`);
            setText(
                element('levelsNote'),
                `${STAR_NAMES.join(' · ')}. Par times: ${LEVELS.map((l) => clock(l.parMs)).join(', ')}.`,
            );
        },
        // Paints the skies and boss icons once their art has loaded (a few frames after start).
        draw() {
            if (!built) return;
            const art = getArt();
            if (art?.worlds && !skyDone) {
                sky ??= new Backgrounds({ reduced: true });
                if (!sky.worlds) sky.setWorlds(art.worlds);
                for (const { info, art: canvas } of cards)
                    sky.paintRegion(canvas.getContext('2d'), info.level - 1, 0);
                skyDone = true;
            }
            const bossArt = getBossArt();
            for (const { icons } of cards)
                for (const canvas of icons)
                    if (
                        canvas.dataset.drawn !== 'yes' &&
                        bossArt?.icon(Number(canvas.dataset.kind), canvas)
                    )
                        canvas.dataset.drawn = 'yes';
        },
    };
}
