import { element } from '../app/dom.mjs';
import { readSave, parseSave, mergeSaves, writeSave, saveFileText } from '../state/save.mjs';
export function createRecordsActions({ getRuntime, profileStore, draw, storage }) {
    let resetRecordsArmed = false;
    function disarmRecordsReset() {
        resetRecordsArmed = false;
        element('resetRecords').textContent = 'Reset this profile’s personal bests';
        element('cancelResetRecords').hidden = true;
    }
    element('cancelResetRecords').addEventListener('click', disarmRecordsReset);
    for (const id of ['recordsProfile', 'recordsType', 'recordsMode'])
        element(id).addEventListener('change', () => {
            disarmRecordsReset();
            draw();
        });
    element('recordsProfile').value = profileStore.activeProfile;
    let resetProfile;
    element('resetRecords').addEventListener('click', () => {
        const current = Number(element('recordsProfile').value);
        if (!resetRecordsArmed || resetProfile !== current) {
            resetRecordsArmed = true;
            resetProfile = current;
            element('resetRecords').textContent = `Confirm reset for Player ${current + 1}`;
            element('cancelResetRecords').hidden = false;
            element('recordsStatus').textContent =
                'Clears all personal bests for this profile, including practice. Top-five scores are kept.';
            return;
        }
        getRuntime().records.reset(current);
        disarmRecordsReset();
        draw();
    });
    let browserResetArmed = false;
    function cancelBrowserReset() {
        browserResetArmed = false;
        element('clearBrowserRecords').textContent = 'Clear this browser’s records';
        element('cancelBrowserReset').hidden = true;
        element('browserResetStatus').textContent = '';
    }
    element('cancelBrowserReset').addEventListener('click', cancelBrowserReset);
    element('clearBrowserRecords').addEventListener('click', () => {
        const status = element('browserResetStatus');
        if (!browserResetArmed) {
            browserResetArmed = true;
            element('clearBrowserRecords').textContent = 'Confirm: clear all browser records';
            element('cancelBrowserReset').hidden = false;
            status.textContent =
                'Clears solo and co-op team leaderboards and all personal bests ' +
                'for both profiles, including practice. This cannot be undone.';
            return;
        }
        const cleared = getRuntime().clearRecords();
        cancelBrowserReset();
        disarmRecordsReset();
        status.textContent = cleared
            ? 'All game records cleared in this browser.'
            : getRuntime().scoreStatus;
        draw();
    });

    // One save for every part this browser keeps (nextSteps.md R4). Export downloads it;
    // import merges a file into this browser, keeping the best of both and this browser's
    // settings, then reloads so every screen reads the merged save.
    const saveStatus = element('saveStatus');
    element('exportSave').addEventListener('click', () => {
        const save = readSave(storage);
        const url = URL.createObjectURL(
            new Blob([saveFileText(save)], { type: 'application/json' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `asteroids-save-${save.savedAt.slice(0, 10)}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        saveStatus.textContent =
            'Save exported. Import it on another browser to carry progress over.';
    });
    let incoming = null;
    const cancelImport = () => {
        incoming = null;
        element('confirmImport').hidden = element('cancelImport').hidden = true;
        element('importSave').hidden = false;
        element('importSaveFile').value = '';
    };
    element('importSave').addEventListener('click', () => element('importSaveFile').click());
    element('cancelImport').addEventListener('click', () => {
        cancelImport();
        saveStatus.textContent = '';
    });
    element('importSaveFile').addEventListener('change', async () => {
        const file = element('importSaveFile').files[0];
        if (!file) return;
        try {
            incoming = parseSave(await file.text());
        } catch (error) {
            cancelImport();
            saveStatus.textContent = error.message;
            return;
        }
        const bests = incoming.records.reduce((n, p) => n + Object.keys(p).length, 0);
        const scores = incoming.scores.hd.length + incoming.coopScores.flat().length;
        const when = incoming.savedAt ? ` from ${incoming.savedAt.slice(0, 10)}` : '';
        saveStatus.textContent =
            `Save${when}: ${bests} personal bests and ${scores} top-five scores. ` +
            'Importing keeps the best of this browser and the file; nothing here is lost, ' +
            'and your settings and controls stay as they are.';
        element('importSave').hidden = true;
        element('confirmImport').hidden = element('cancelImport').hidden = false;
        element('confirmImport').focus();
    });
    element('confirmImport').addEventListener('click', () => {
        if (!incoming) return;
        const merged = mergeSaves(readSave(storage), incoming, { settingsFrom: 'a' });
        if (writeSave(storage, merged)) {
            saveStatus.textContent = 'Save imported. Reloading…';
            location.reload();
        } else {
            saveStatus.textContent =
                'Could not import: browser storage refused the save. Nothing was changed.';
        }
        cancelImport();
    });

    return {
        disarmRecordsReset,
        cancelBrowserReset,
        get armed() {
            return resetRecordsArmed;
        },
        get profile() {
            return resetProfile;
        },
    };
}
