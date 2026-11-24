import { SECONDARIES, loadoutText } from '../ship/catalogue.mjs';
import { S } from '../runtime/scene-layout.mjs';
import { element, setData, setHidden, setProp, setText } from '../app/dom.mjs';
import { accuracyText } from '../state/records.mjs';
import { supportedPad } from '../input/coop-input.mjs';
import { CoopMenu } from '../input/coop-menu.mjs';
import { HULLS, hullIcon, saveHangar } from '../state/hangar.mjs';

const PILOT_COLOURS = ['#70d9ed', '#efb963'];

// Local co-op: the lobby where two pilots pick an input and a profile and ready up, the
// in-flight team HUD, the reassignment panel after a lost controller, and the team results.
class CoopScreen {
    constructor({
        input,
        getPads,
        getRuntime,
        getNavigation,
        getLevel = () => 0,
        launch,
        profiles,
        hangar = null,
    }) {
        this.input = input;
        this.getLevel = getLevel; // the campaign level the lobby is starting, or 0 for Endless
        // { store, storage, unlocks, getArt }: the hull step after both pilots ready up.
        this.hangar = hangar;
        this.hullChoice = [null, null];
        this.hullSignature = ['', ''];
        this.getPads = getPads;
        this.getRuntime = getRuntime;
        this.getNavigation = getNavigation;
        this.launch = launch;
        this.profiles = profiles;
        this.deviceSignature = '';
        this.reassign = false; // the "reassign inputs" panel is open while paused
        this.menu = new CoopMenu(input, element, () => getNavigation().back());
        this.#wire();
    }
    #wire() {
        const { input } = this;
        element('coopReassign').addEventListener('click', () => {
            this.reassign = !this.reassign;
            this.render();
        });
        for (let slot = 0; slot < 2; slot++) {
            for (const prefix of ['coopDevice', 'reconnectDevice'])
                element(prefix + slot).addEventListener('change', (event) => {
                    input.assign(slot, event.target.value, this.getPads());
                    this.render();
                });
            element('coopProfile' + slot).value = slot;
            element('coopProfile' + slot).addEventListener('change', (event) => {
                input.setProfile(slot, Number(event.target.value));
                this.render();
            });
            element('coopReady' + slot).addEventListener('click', () => {
                input.join(slot, this.getPads());
                this.render();
            });
            element('coopHull' + slot)?.addEventListener('change', (event) => {
                this.hullChoice[slot] = event.target.value;
                this.render();
            });
            element('coopHullConfirm' + slot)?.addEventListener('click', () => {
                if (!input.confirmHull(slot)) return;
                if (input.hullDone[slot]) this.#equip(slot);
                this.render();
            });
        }
        // Friendly fire is locked once anyone is ready.
        let friendlyFire = element('coopFriendly').checked;
        element('coopFriendly').addEventListener('change', () => {
            if (input.ready.some(Boolean)) element('coopFriendly').checked = friendlyFire;
            else friendlyFire = element('coopFriendly').checked;
            this.render();
        });
        element('coopStart').addEventListener('click', () => {
            const pads = this.getPads();
            if (!input.canStart(pads)) return;
            input.profiles = this.profiles();
            input.begin(pads);
            const options = {
                profiles: [...input.profileIds],
                friendlyFire: element('coopFriendly').checked,
                level: this.getLevel(),
            };
            this.launch(() => this.getNavigation().startCoop(options));
        });
    }
    // The confirmed hull is equipped on that pilot's profile, as if chosen in the Hangar.
    #equip(slot) {
        const { hangar, input } = this;
        const choice = this.hullChoice[slot];
        if (!hangar || !choice) return;
        hangar.store.profiles[input.profileIds[slot]] = choice;
        saveHangar(hangar.storage, hangar.store);
    }
    #unlocked(profile, id) {
        return this.hangar?.unlocks
            ? this.hangar.unlocks.isUnlocked(profile, id) ||
                  this.getRuntime()?.loadouts?.owns(profile, 'ship', id)
            : true;
    }
    // One pilot's hull field: unlocked hulls for their profile, locked ones listed but disabled.
    #renderHull(slot, picking) {
        const { input, hangar } = this;
        setHidden(element('coopHullPick' + slot), !picking || !hangar);
        if (!picking || !hangar) {
            this.hullChoice[slot] = null;
            return;
        }
        const profile = input.profileIds[slot];
        const select = element('coopHull' + slot);
        const signature =
            profile + ':' + HULLS.map((h) => (this.#unlocked(profile, h.id) ? 1 : 0)).join('');
        if (signature !== this.hullSignature[slot]) {
            this.hullSignature[slot] = signature;
            select.replaceChildren(
                ...HULLS.map((hull) => {
                    const option = document.createElement('option');
                    const open = this.#unlocked(profile, hull.id);
                    option.value = hull.id;
                    option.disabled = !open;
                    option.textContent = open ? hull.name : `${hull.name} · locked`;
                    return option;
                }),
            );
            this.hullChoice[slot] = null;
        }
        if (!this.hullChoice[slot] || !this.#unlocked(profile, this.hullChoice[slot])) {
            const equipped = hangar.store.profiles[profile];
            this.hullChoice[slot] = this.#unlocked(profile, equipped) ? equipped : HULLS[0].id;
        }
        if (select.value !== this.hullChoice[slot]) select.value = this.hullChoice[slot];
        const done = input.hullDone[slot];
        setProp(select, 'disabled', done);
        const confirm = element('coopHullConfirm' + slot);
        confirm.setAttribute('aria-pressed', String(done));
        setText(confirm, done ? `Hull confirmed · Change` : 'Confirm hull');
        this.#drawHull(slot);
    }
    #drawHull(slot) {
        const art = this.hangar.getArt?.(),
            id = this.hullChoice[slot];
        const key = `${id}`;
        const canvas = element('coopHullIcon' + slot);
        if (!art || canvas.dataset.hull === key) return;
        const cell = art.sprites[hullIcon(id)];
        if (!cell) return;
        canvas.dataset.hull = key;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(art.atlas, cell.x, cell.y, cell.w, cell.h, 0, 0, 48, 32);
    }
    // Rebuilds the input choosers when controllers come or go.
    #syncDevices(pads) {
        const { input } = this;
        let signature = '';
        for (const p of pads) if (supportedPad(p)) signature += `${p.index}\u0000${p.id}\u0001`;
        if (signature === this.deviceSignature) return;
        this.deviceSignature = signature;
        for (const prefix of ['coopDevice', 'reconnectDevice'])
            for (let slot = 0; slot < 2; slot++) {
                const select = element(prefix + slot);
                select.replaceChildren();
                for (const [value, label] of [
                    ['', 'Choose input'],
                    ['keyboard', 'Keyboard + mouse'],
                    ...pads
                        .filter(supportedPad)
                        .map((p) => [String(p.index), `Controller ${p.index + 1} · ${p.id}`]),
                ]) {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    select.append(option);
                }
                select.value = input.devices[slot];
            }
    }
    render() {
        const pads = this.getPads(),
            runtime = this.getRuntime(),
            navigation = this.getNavigation();
        this.#syncDevices(pads);
        for (let slot = 0; slot < 2; slot++) {
            const node = document.getElementById(`coopLoadout${slot}`);
            if (node && runtime?.loadouts)
                node.textContent = loadoutText(
                    runtime.loadouts.get(this.input.profileIds?.[slot] ?? slot),
                );
        }
        if (navigation?.screen === 'lobby') this.#renderLobby(pads);
        const active = !!runtime?.coop;
        setData(document.body, 'coop', String(active));
        setHidden(element('coopHud'), !active);
        setHidden(element('coopResults'), !active || !runtime?.result?.players);
        this.chrome ??= {
            hud: document.querySelector('.hud'),
            combat: document.querySelector('.combat-hud'),
            stats: document.querySelector('.live-stats'),
        };
        setHidden(this.chrome.hud, active);
        for (const node of [this.chrome.combat, this.chrome.stats])
            if (node && node.classList.contains('coop-hidden') !== active)
                node.classList.toggle('coop-hidden', active);
        setHidden(element('coopReassign'), !active);
        if (navigation?.screen !== 'pause') this.reassign = false;
        if (active && !this.input.valid(pads)) this.reassign = true;
        setHidden(element('coopReconnect'), !active || !this.reassign);
        if (!active) {
            setProp(element('resume'), 'disabled', false);
            return;
        }
        this.#renderHud(runtime, navigation, pads);
        this.#renderResults(runtime.result);
    }
    #renderLobby(pads) {
        const { input, menu } = this;
        input.live = false;
        for (let i = 0; i < 2; i++)
            if (input.devices[i] !== 'keyboard' && !input.pad(i, pads)) input.resetSlot(i);
        for (let i = 0; i < 2; i++) {
            element('coopDevice' + i).value = input.devices[i];
            element('coopDevice' + i).disabled = input.ready[i];
            element('coopProfile' + i).value = input.profileIds[i];
            element('coopProfile' + i).disabled = input.ready[i];
            const button = element('coopReady' + i);
            button.disabled = !input.ready[i] && !input.valid(pads);
            button.setAttribute('aria-pressed', String(input.ready[i]));
            const progress = menu.readyProgress[i];
            setText(
                button,
                input.ready[i]
                    ? `P${i + 1} ready · Cancel`
                    : progress > 0
                      ? `Hold Circle / B · ${Math.floor(progress * 100)}%`
                      : input.devices[i] === 'keyboard'
                        ? `Ready P${i + 1}`
                        : `Ready P${i + 1} · Hold Circle / B for 1.5s`,
            );
        }
        element('coopFriendly').disabled = input.ready.some(Boolean);
        const picking = input.valid(pads) && input.picking();
        for (let i = 0; i < 2; i++) this.#renderHull(i, picking);
        const hullsDone = !this.hangar || input.hullDone.every(Boolean);
        setText(
            element('coopLobbyStatus'),
            !input.valid(pads)
                ? 'Choose two different inputs and two different profiles. At least one controller is required.'
                : picking && !hullsDone
                  ? 'Both pilots ready. Each pilot picks a hull and confirms it (Cross / A to edit, left/right to browse).'
                  : picking
                    ? 'Hulls confirmed. Release controls, then Launch together.'
                    : 'Hold Circle / B for 1.5s to ready your pilot. Up/down: navigate · Cross / A: select or edit · Tap Circle / B: finish editing or go back. Cancel Ready to change selections.',
        );
        input.canStart(pads); // Arm launch after a neutral frame; navigation stays focusable.
        element('coopStart').disabled =
            !input.valid(pads) || !input.ready.every(Boolean) || !hullsDone;
    }
    // The team HUD, and the pause menu's controller-lost notice.
    #renderHud(runtime, navigation, pads) {
        const { input } = this;
        setText(element('runLabel'), 'Local co-op');
        if (navigation.screen === 'pause') setText(element('screenTitle'), 'Paused');
        else if (navigation.screen === 'play') setText(element('screenTitle'), 'Local co-op');
        const players = runtime.coopPlayers();
        players.forEach((p, i) => {
            const status = p.alive
                ? ''
                : p.lives
                  ? ` · RESPAWN ${(p.respawnMs / 1000).toFixed(1)}s`
                  : ' · ELIMINATED';
            const text = `P${i + 1} · ${p.lives} LIVES${status}\n${p.score} · ×${p.multiplier}\n${SECONDARIES[p.scene[S.SECONDARY_TYPE] || 0].name.toUpperCase()} ${p.charging ? 'CHARGING' : p.laserMs ? `${(p.laserMs / 1000).toFixed(1)}s` : 'READY'} · SHIELD ${p.shield}\nMULTI ${(p.multishotMs / 1000).toFixed(1)}s · 2× ${(p.stats.doubleFireMs / 1000).toFixed(1)}s`;
            setText(element('coopHud' + i), text);
            setProp(element('reconnectDevice' + i), 'value', input.devices[i]);
        });
        setText(element('coopTeamScore'), `TEAM ${players[0].teamScore}`);
        setText(element('coopWave'), `WAVE ${players[0].scene[S.WAVE]}`);
        setText(element('coopRules'), `FRIENDLY FIRE ${runtime.coop.friendlyFire ? 'ON' : 'OFF'}`);
        if (navigation.screen === 'pause') {
            setProp(element('resume'), 'disabled', !input.valid(pads));
            setText(
                element('pauseSettingsHint'),
                !input.valid(pads)
                    ? 'Controller lost. Reassign the missing input above; release all controls before Resume.'
                    : 'Release controls before Resume · Cross / Enter: select · Circle / Esc: back',
            );
        }
    }
    // One card per pilot, rebuilt only when the result changes.
    #renderResults(result) {
        const resultBox = element('coopResults');
        resultBox.hidden = !result?.players;
        if (!result?.players) return;
        const signature = JSON.stringify(result);
        if (resultBox.dataset.signature === signature) return;
        resultBox.dataset.signature = signature;
        resultBox.replaceChildren();
        result.players.forEach((p, i) => {
            const section = document.createElement('section'),
                h = document.createElement('h3'),
                score = document.createElement('b'),
                body = document.createElement('p');
            h.textContent = `P${i + 1} · Profile ${p.profile + 1}`;
            score.textContent = String(p.score);
            section.style.setProperty('--pilot', PILOT_COLOURS[i]);
            body.textContent = `Accuracy ${accuracyText(p.hits, p.shots)} · Chain ${p.longestChain} · ${p.destroyed} rocks · Best ×${p.bestMultiplier} · Secondary ${p.laserKills} kills`;
            section.append(h, score, body);
            resultBox.append(section);
        });
    }
    resetMenu() {
        this.menu.reset();
    }
    handlePads(pads, now) {
        this.menu.sample(pads, now);
    }
    reset() {
        this.menu.reset();
        this.input.live = false;
        this.input.reset();
        this.render();
    }
}

export const createCoopScreen = (options) => new CoopScreen(options);
