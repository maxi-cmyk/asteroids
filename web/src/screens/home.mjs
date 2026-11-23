import { element, setData, setHidden, setText } from '../app/dom.mjs';
import { furthestWave } from '../app/menu-look.mjs';

// A first run: neither profile has finished a real run yet (practice never counts).
export const isFirstRun = (records) =>
    furthestWave(records, 0) === 0 && furthestWave(records, 1) === 0;

let menu = null;

export function renderHomeScreen({
    demoEngine,
    navigation,
    controllerLabel,
    menuDevice,
    profileStore,
    helpNew = false,
}) {
    const watching = !!demoEngine?.active && navigation.screen === 'home';
    setHidden(element('homeDemo'), !watching);
    setHidden(element('demoControls'), !watching);
    setHidden(element('screenTitle'), watching);
    setHidden(element('homeHint'), watching);
    setHidden(element('demoHint'), !watching);
    setHidden(controllerLabel, watching);
    setData(document.body, 'demo', String(watching));
    menu ??= document.querySelector('.home-menu');
    setHidden(menu, watching);
    setText(
        element('homeHint'),
        watching
            ? 'Demo flight · any key or controller action returns Home'
            : menuDevice === 'controller'
              ? 'D-pad / left stick: navigate · Cross: select · Circle: back'
              : 'Arrow keys: navigate · Enter: select · Esc: back',
    );
    // How to play stands out once, on a first run, until the player has opened it.
    setData(element('homeHelp'), 'new', String(helpNew));
    if (watching) demoEngine.render();
    // The profile name only matters once someone switches to the second profile.
    setText(element('profileLabel'), `Player ${profileStore.activeProfile + 1}`);
    setHidden(element('profileLabel'), profileStore.activeProfile === 0);
}
