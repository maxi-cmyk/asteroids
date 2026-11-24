import { loadoutText } from '../ship/catalogue.mjs';
import { element, setData, setHidden } from '../app/dom.mjs';
import { accuracyText } from '../state/records.mjs';
import { regionForWave } from '../render/regions.mjs';
import { bossNames } from '../boss/scene.mjs';
import { LEVELS, STAR_BITS, clock, starCount } from '../state/campaign-data.mjs';

export function renderResultsScreen({
    results,
    showResults,
    canvas,
    lastState,
    result,
    scene,
    update,
    fightLogCount = 0,
}) {
    if (results.hidden === showResults) {
        results.hidden = !showResults;
        canvas.inert = showResults;
        canvas.setAttribute('aria-hidden', String(showResults));
        if (showResults) results.focus({ preventScroll: true });
        else if (lastState === 'results') canvas.focus({ preventScroll: true });
    }
    setData(document.body, 'results', String(showResults));
    if (showResults) {
        const coop = !!result.players,
            level = result.levelRun;
        setData(results, 'campaign', String(!!level));
        setHidden(results.querySelector('.result-hero'), !!level);
        setHidden(results.querySelector('dl'), coop || !!level);
        setHidden(element('resultLaser'), coop || !!level || !result.laserShots);
        const seconds = Math.floor(result.elapsedMs / 1000);
        const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        const defeated = bossNames(result.bossMask || 0);
        const bosses = element('resultBosses');
        const line = defeated.length
            ? `Defeated · ${defeated.join(', ')}${result.rules?.practice ? ` · hit ${result.bossHits || 0}×` : ''}`
            : '';
        update(bosses, line);
        setHidden(bosses, !line);
        setHidden(element('exportFightLog'), !fightLogCount);
        update(element('resultScore'), String(result.score));
        for (const id of ['levelNext', 'levelRetry', 'levelSelect', 'resultHangar'])
            setHidden(element(id), !level);
        setHidden(element('continueResults'), !!level);
        setHidden(element('levelResult'), !level);
        if (level) {
            renderLevelResult(result, update);
            return;
        }
        update(
            element('resultRegion'),
            `Wave ${result.wave} · ${regionForWave(result.wave).name}${coop ? ` · ${elapsed}` : ''}`,
        );
        if (coop) {
            update(element('continueResults'), 'Continue');
            update(element('personalBest'), 'Team complete');
            return;
        }
        update(element('continueResults'), result.rules.practice ? 'Return home' : 'Continue');
        update(
            element('personalBest'),
            `${result.rules.practice ? 'Practice complete' : 'Run complete'} · Player ${result.profile + 1}`,
        );
        update(element('resultCps'), String(result.peakCps));
        update(element('resultAccuracy'), accuracyText(result.hits, result.shots));
        update(element('resultChain'), String(result.longestChain));
        update(element('resultTime'), elapsed);
        update(element('resultKills'), String(result.destroyed));
        update(element('resultMultiplier'), `×${result.bestMultiplier}`);
        update(
            element('resultLaser'),
            `Secondary · ${result.laserShots} shot${result.laserShots === 1 ? '' : 's'} · ${result.laserKills} kill${result.laserKills === 1 ? '' : 's'}`,
        );
    }
}

// A level's end screen (nextSteps.md C1): the stars each pilot earned, the time against par and
// what the clear opened. Stars light one by one (the stagger is CSS, off with reduced motion).
let shownLevel = null;
function renderLevelResult(result, update) {
    const facts = result.levelRun;
    const coop = !!result.players;
    update(element('personalBest'), `Act 1 Level ${facts.level}`);
    update(element('levelOutcome'), facts.cleared ? 'LEVEL CLEARED!' : 'LEVEL FAILED');
    const remaining = facts.livesRemaining.reduce((total, lives) => total + lives, 0);
    update(element('levelTime'), `Time ${clock(facts.cleared ? facts.timeMs : result.elapsedMs)}`);
    update(element('levelDamage'), `Lives remaining ${remaining} · Hits taken ${facts.hitsTaken}`);
    const next = facts.cleared && facts.level < LEVELS.length;
    const complete = facts.cleared && !next;
    setHidden(element('levelNext'), !next);
    element('levelRetry').classList.toggle('primary', !facts.cleared);
    element('levelSelect').classList.toggle('primary', complete);
    const first = facts.pilots.some((p) => p.firstClear);
    const levelUnlock =
        !facts.cleared || !first
            ? ''
            : facts.act1Done
              ? 'Act 1 complete · Endless unlocked'
              : `Level ${facts.level + 1} unlocked`;
    const rewards = (facts.newKits || []).map((p) => `Unlocked: ${loadoutText(p.kit)}`);
    const unlock = [levelUnlock, ...rewards].filter(Boolean).join(' · ');
    update(element('levelUnlock'), unlock);
    setHidden(element('levelUnlock'), !unlock);
    // Rebuild the star rows only when a different result shows.
    const pilots = element('levelPilots');
    if (shownLevel === result) return;
    shownLevel = result;
    pilots.replaceChildren();
    facts.pilots.forEach((pilot, p) => {
        const row = document.createElement('div');
        row.className = 'level-pilot';
        const who = document.createElement('b');
        who.textContent = `Pilot ${p + 1}`;
        who.hidden = !coop;
        const chips = document.createElement('div');
        chips.className = 'star-chips';
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', `${starCount(pilot.stars)} of 3 stars`);
        STAR_BITS.forEach((bit, i) => {
            const chip = document.createElement('span');
            chip.className = 'star-chip';
            chip.dataset.on = String(!!(pilot.stars & bit));
            chip.dataset.new = String(!!(pilot.newStars & bit));
            chip.style.setProperty('--i', String(p * 3 + i));
            const star = document.createElement('i');
            star.className = 'star';
            star.dataset.on = chip.dataset.on;
            const label = document.createElement('span');
            label.textContent = ['Clear', '3+ lives left', `< ${clock(facts.parMs)}`][i];
            chip.setAttribute(
                'aria-label',
                `${label.textContent}: ${pilot.stars & bit ? 'earned' : 'not earned'}`,
            );
            star.setAttribute('aria-hidden', 'true');
            chip.append(star, label);
            chips.append(chip);
        });
        row.append(who, chips);
        pilots.append(row);
    });
}
