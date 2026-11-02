// Optional playtest log: one entry per boss attempt (a boss going from active to defeated, or to
// the end of the run). It reads only the scene, stays on this device, and is off unless the
// player turns it on in Settings. Export it as JSON from the Results screen.
import { S } from '../runtime/scene-layout.mjs';
import { ATTACK, KINDS, TIER_NAMES, bossState } from './scene.mjs';

export const FIGHT_LOG_KEY = 'asteroids.web.fight-log-v1';
export const FIGHT_LOG_LIMIT = 200;

const ATTACK_NAMES = new Map(Object.entries(ATTACK).map(([name, id]) => [id, name]));
const attackName = (id) => ATTACK_NAMES.get(id) ?? (id ? `attack-${id}` : 'rest');

export class FightLog {
    constructor(storage, { now = () => new Date().toISOString() } = {}) {
        this.storage = storage;
        this.now = now;
        this.enabled = false;
        this.attempts = [];
        this.current = null;
        try {
            const data = JSON.parse(storage?.getItem(FIGHT_LOG_KEY) || 'null');
            if (data?.version === 1 && Array.isArray(data.attempts))
                this.attempts = data.attempts.slice(-FIGHT_LOG_LIMIT);
        } catch {
            /* start empty */
        }
    }
    get count() {
        return this.attempts.length;
    }
    // Called after every simulated tick while a solo run or practice is live.
    observe(scene) {
        if (!this.enabled) return;
        const boss = bossState(scene),
            ms = scene[S.GAME_MS];
        let run = this.current;
        if (run && (!boss.active || boss.kind !== run.kindIndex)) {
            this.#finish(scene, boss.active ? 'abandoned' : 'defeated');
            run = null;
        }
        if (!boss.active) return;
        if (!run) run = this.#begin(scene, boss, ms);
        if (run.fightMs === null && boss.entrance >= 1) run.fightMs = ms;
        const stage = Math.max(0, boss.stage);
        run.damage[stage] = run.damage[stage] || 0;
        if (boss.health < run.health) run.damage[stage] += run.health - boss.health;
        run.health = boss.health;
        run.maximum = boss.maximum;
        const lives = scene[S.LIVES];
        const lifeLost = lives < run.lives;
        if (boss.hitsTaken > run.hitsTaken || lifeLost) {
            run.hits.push({
                ms: Math.round(ms - (run.fightMs ?? run.startMs)),
                stage,
                attack: attackName(boss.attack),
                lifeLost,
            });
            if (lifeLost) run.killer = attackName(boss.attack);
        }
        run.lives = lives;
        run.hitsTaken = boss.hitsTaken;
        run.endMs = ms;
        run.stage = stage;
    }
    // The run ended (game over, quit or practice left) with a fight still open.
    end(scene) {
        if (this.current) this.#finish(scene, 'run-ended');
    }
    #begin(scene, boss, ms) {
        this.current = {
            kindIndex: boss.kind,
            id: KINDS[boss.kind]?.id ?? `kind-${boss.kind}`,
            tier: boss.tier,
            wave: boss.wave,
            practice: boss.practice,
            startMs: ms,
            fightMs: null,
            endMs: ms,
            health: boss.health,
            maximum: boss.maximum,
            damage: [],
            hits: [],
            hitsTaken: boss.hitsTaken,
            lives: scene[S.LIVES],
            livesStart: scene[S.LIVES],
            kills: boss.kills,
            killer: null,
            stage: Math.max(0, boss.stage),
        };
        return this.current;
    }
    #finish(scene, outcome) {
        const run = this.current;
        this.current = null;
        if (!run) return;
        const won = outcome === 'defeated' && scene[S.BOSS_KILLS] > run.kills;
        const from = run.fightMs ?? run.startMs;
        // The killing blow ends the fight in the same tick, so its damage arrives with the defeat.
        if (won) run.damage[run.stage] = (run.damage[run.stage] || 0) + run.health;
        this.attempts.push({
            at: this.now(),
            boss: run.id,
            tier: TIER_NAMES[Math.min(3, run.tier)] ?? String(run.tier),
            wave: run.wave,
            practice: run.practice,
            outcome: won ? 'defeated' : outcome === 'defeated' ? 'ended' : outcome,
            seconds: Math.round(((run.endMs - from) / 1000) * 10) / 10,
            livesLost: Math.max(0, run.livesStart - Math.min(run.livesStart, run.lives)),
            hitsTaken: run.hits.length,
            phaseReached: run.stage,
            damagePerPhase: run.damage.map((value) => value || 0),
            maximumHealth: run.maximum,
            killer: run.killer,
            hits: run.hits,
        });
        if (this.attempts.length > FIGHT_LOG_LIMIT)
            this.attempts.splice(0, this.attempts.length - FIGHT_LOG_LIMIT);
        this.#save();
    }
    #save() {
        try {
            this.storage?.setItem(
                FIGHT_LOG_KEY,
                JSON.stringify({ version: 1, attempts: this.attempts }),
            );
        } catch {
            /* kept for this visit */
        }
    }
    clear() {
        this.attempts = [];
        this.current = null;
        try {
            this.storage?.removeItem(FIGHT_LOG_KEY);
        } catch {
            /* nothing stored */
        }
    }
    json() {
        return JSON.stringify(
            { version: 1, exported: this.now(), attempts: this.attempts },
            null,
            2,
        );
    }
}
