import { S } from '../runtime/scene-layout.mjs';
import { element, setAttr, setData } from '../app/dom.mjs';
export function renderPractice({ scene, navigation, runtime, update, practiceButton, fitCanvas }) {
    const practice = !!scene[S.PRACTICE];
    const level = scene[S.LEVEL_INDEX];
    const title =
        navigation.screen === 'pause'
            ? 'Paused'
            : runtime.state === 'results'
              ? 'Results'
              : runtime.state === 'initials'
                ? 'Save initials'
                : runtime.state === 'game-over'
                  ? 'Leaderboard'
                  : practice
                    ? 'Practice'
                    : level
                      ? `Level ${level}`
                      : runtime.coop
                        ? 'Local co-op'
                        : 'Solo flight';
    if (['play', 'pause'].includes(navigation.screen)) {
        update(element('screenTitle'), title);
        const heading = `${title} · Asteroids`;
        if (document.title !== heading) document.title = heading;
    }
    update(
        element('runLabel'),
        practice || (runtime.state === 'results' && runtime.result?.rules.practice)
            ? 'Practice flight'
            : level
              ? `Level ${level} · Act 1`
              : 'Solo flight',
    );
    // The tools live in the Pause menu; the HUD shows a quiet tag instead of score and lives.
    setData(
        document.body,
        'practice',
        String(practice || (runtime.state === 'results' && !!runtime.result?.rules.practice)),
    );
    const tools = element('practiceTools');
    if (tools.hidden === practice) {
        tools.hidden = !practice;
        fitCanvas();
    }
    for (const [id, kind] of [
        ['practiceMultishot', 'multishot'],
        ['practiceDoubleFire', 'doubleFire'],
    ])
        setAttr(element(id), 'aria-pressed', String(runtime.practiceHold[kind]));
    if (practiceButton.disabled) practiceButton.disabled = false;
}
