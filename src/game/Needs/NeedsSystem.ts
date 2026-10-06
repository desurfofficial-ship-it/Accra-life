/**
 * CHALÉ LIFE — Daily needs (6 meters)
 *
 * The 6 needs from the product brief:
 *   1. Hunger   — eat waakye / jollof / banku to restore
 *   2. Energy   — sleep at the compound to restore
 *   3. Fun      — vibe to music, hang out at the beach, eat a good meal
 *   4. Social   — talk to NPCs, chat with other players, attend events
 *   5. Hygiene  — shower at the compound
 *   6. Bladder  — use the toilet at the compound
 *
 * Each need decays continuously per game-second at its own rate. The lowest
 * the meter, the more urgent the friction: at 0 hunger you can't work; at 0
 * bladder you can't work either (you have to pee first).
 *
 * Persistence is local-first (localStorage) with a v2 key (the schema is
 * not backward-compatible with the v1 2-need state — loading a stale v1
 * snapshot would silently drop the 4 new fields). Cloud sync to Firestore
 * happens via Wallet.saveToFirebase(needsState) which writes the 6 needs
 * fields to /players/{uid} alongside the wallet state.
 *
 * Schema match: firestore.rules /players hasOnly set includes
 * `hunger, energy, fun, social, hygiene, bladder` — the strict rules
 * validate 0-100 bounds on each.
 */

export type NeedId = 'hunger' | 'energy' | 'fun' | 'social' | 'hygiene' | 'bladder';

export interface NeedsState {
  hunger: number;   // 0-100 (100 = full)
  energy: number;   // 0-100 (100 = rested)
  fun: number;      // 0-100 (100 = joyful)
  social: number;   // 0-100 (100 = connected)
  hygiene: number;  // 0-100 (100 = clean)
  bladder: number;  // 0-100 (100 = empty bladder, comfortable)
}

export type NeedsListener = (state: NeedsState) => void;

const STORAGE_KEY = 'chale_life_needs_v2';

/** Per-second decay when idle. Tuned so hunger + bladder are urgent, hygiene is slow. */
const DECAY_PER_SECOND: NeedsState = {
  hunger: 0.35,   // ~5 min to empty if idle
  energy: 0.22,   // ~7.5 min to empty
  fun: 0.18,      // ~9 min to empty
  social: 0.25,   // ~6.5 min to empty
  hygiene: 0.12,  // ~14 min to empty
  bladder: 0.45   // ~3.7 min to empty (fastest — you pee often)
};

const WORK_ENERGY_COST = 18;
const WORK_HUNGER_COST = 8;
const WORK_FUN_COST = 5;       // work is boring
const WORK_BLADDER_COST = 6;   // holding it through a shift

const SLEEP_ENERGY_RESTORE = 55;
const SLEEP_FUN_RESTORE = 3;     // dreaming is mildly fun
const SLEEP_BLADDER_DRAIN = 12;   // you wake up needing to pee

const MEAL_HUNGER_RESTORE = 45;
const MEAL_FUN_RESTORE = 5;      // a good meal is enjoyable

const FUN_RESTORE = 35;
const SOCIAL_RESTORE = 25;
const HYGIENE_RESTORE = 50;
const HYGIENE_ENERGY_COST = 3;   // showering is a small effort
const BLADDER_RESTORE = 80;

const LOW_THRESHOLD = 25;
const CRITICAL_HUNGER = 10;
const CRITICAL_ENERGY = 12;
const CRITICAL_BLADDER = 15;     // can't work if bladder < this

const DEFAULT_STATE: NeedsState = {
  hunger: 72,
  energy: 80,
  fun: 65,
  social: 50,
  hygiene: 70,
  bladder: 60
};

export interface RecoveryResult {
  success: boolean;
  message: string;
}

export class NeedsSystem {
  private state: NeedsState = { ...DEFAULT_STATE };
  private readonly listeners = new Set<NeedsListener>();

  constructor() {
    this.load();
  }

  // ------------------------------------------------------------------ queries

  public getState(): NeedsState {
    return { ...this.state };
  }

  public isHungry(): boolean { return this.state.hunger < LOW_THRESHOLD; }
  public isTired(): boolean { return this.state.energy < LOW_THRESHOLD; }
  public isBored(): boolean { return this.state.fun < LOW_THRESHOLD; }
  public isLonely(): boolean { return this.state.social < LOW_THRESHOLD; }
  public isDirty(): boolean { return this.state.hygiene < LOW_THRESHOLD; }
  public needsToilet(): boolean { return this.state.bladder < LOW_THRESHOLD; }

  public canWork(): { ok: boolean; reason?: string } {
    if (this.state.energy < CRITICAL_ENERGY) {
      return { ok: false, reason: 'Too tired. Sleep at the compound.' };
    }
    if (this.state.hunger < CRITICAL_HUNGER) {
      return { ok: false, reason: 'Too hungry. Eat first — try waakye.' };
    }
    if (this.state.bladder < CRITICAL_BLADDER) {
      return { ok: false, reason: 'Bladder critical. Use the toilet at the compound.' };
    }
    return { ok: true };
  }

  // ------------------------------------------------------------------ tick

  /** Passive decay while living in Accra. Call once per frame. */
  public tick(dtSeconds: number): void {
    if (dtSeconds <= 0 || dtSeconds > 2) return;
    this.state.hunger = Math.max(0, this.state.hunger - DECAY_PER_SECOND.hunger * dtSeconds);
    this.state.energy = Math.max(0, this.state.energy - DECAY_PER_SECOND.energy * dtSeconds);
    this.state.fun = Math.max(0, this.state.fun - DECAY_PER_SECOND.fun * dtSeconds);
    this.state.social = Math.max(0, this.state.social - DECAY_PER_SECOND.social * dtSeconds);
    this.state.hygiene = Math.max(0, this.state.hygiene - DECAY_PER_SECOND.hygiene * dtSeconds);
    this.state.bladder = Math.max(0, this.state.bladder - DECAY_PER_SECOND.bladder * dtSeconds);
    this.notify();
  }

  // ------------------------------------------------------------------ work

  /** After finishing a job / hustle shift. */
  public onWorkCompleted(): RecoveryResult {
    const before = this.state.energy;
    this.state.energy = Math.max(0, this.state.energy - WORK_ENERGY_COST);
    this.state.hunger = Math.max(0, this.state.hunger - WORK_HUNGER_COST);
    this.state.fun = Math.max(0, this.state.fun - WORK_FUN_COST);
    this.state.bladder = Math.max(0, this.state.bladder - WORK_BLADDER_DRAIN);
    this.persist();
    this.notify();
    return {
      success: true,
      message:
        this.state.energy < LOW_THRESHOLD
          ? 'Shift done. You’re drained — head home to rest.'
          : `Shift done. Energy ${Math.round(before)} → ${Math.round(this.state.energy)}.`
    };
  }

  // ------------------------------------------------------------------ recovery

  /** Buy / eat waakye or similar. Restores hunger + small fun. */
  public eatMeal(label = 'Waakye'): RecoveryResult {
    if (this.state.hunger >= 95) {
      return { success: false, message: 'Already full.' };
    }
    const before = this.state.hunger;
    this.state.hunger = Math.min(100, this.state.hunger + MEAL_HUNGER_RESTORE);
    this.state.energy = Math.min(100, this.state.energy + 6);
    this.state.fun = Math.min(100, this.state.fun + MEAL_FUN_RESTORE);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${label} hit. Hunger ${Math.round(before)} → ${Math.round(this.state.hunger)}.`
    };
  }

  /** Sleep / rest at compound. Optional bed bonus. Drains bladder (you wake up needing to pee). */
  public sleep(bonus = 0): RecoveryResult {
    if (this.state.energy >= 95) {
      return { success: false, message: 'Already rested.' };
    }
    const before = this.state.energy;
    const restore = SLEEP_ENERGY_RESTORE + Math.max(0, bonus);
    this.state.energy = Math.min(100, this.state.energy + restore);
    this.state.fun = Math.min(100, this.state.fun + SLEEP_FUN_RESTORE);
    this.state.bladder = Math.max(0, this.state.bladder - SLEEP_BLADDER_DRAIN);
    this.persist();
    this.notify();
    return {
      success: true,
      message: bonus > 0
        ? `Slept on a real bed. Energy ${Math.round(before)} → ${Math.round(this.state.energy)}.`
        : `Rested. Energy ${Math.round(before)} → ${Math.round(this.state.energy)}.`
    };
  }

  /** Listen to music / vibe / hang out. Restores fun. */
  public haveFun(amount = FUN_RESTORE, label = 'Vibing'): RecoveryResult {
    if (this.state.fun >= 95) {
      return { success: false, message: 'Already buzzing.' };
    }
    const before = this.state.fun;
    this.state.fun = Math.min(100, this.state.fun + Math.max(0, amount));
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${label}. Fun ${Math.round(before)} → ${Math.round(this.state.fun)}.`
    };
  }

  /** Talk to someone. Restores social. */
  public socialize(amount = SOCIAL_RESTORE, label = 'Talked'): RecoveryResult {
    if (this.state.social >= 95) {
      return { success: false, message: 'Already social-full.' };
    }
    const before = this.state.social;
    this.state.social = Math.min(100, this.state.social + Math.max(0, amount));
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${label}. Social ${Math.round(before)} → ${Math.round(this.state.social)}.`
    };
  }

  /** Shower at the compound. Restores hygiene, costs a tiny bit of energy. */
  public shower(): RecoveryResult {
    if (this.state.hygiene >= 95) {
      return { success: false, message: 'Already clean.' };
    }
    const before = this.state.hygiene;
    this.state.hygiene = Math.min(100, this.state.hygiene + HYGIENE_RESTORE);
    this.state.energy = Math.max(0, this.state.energy - HYGIENE_ENERGY_COST);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `Showered. Hygiene ${Math.round(before)} → ${Math.round(this.state.hygiene)}.`
    };
  }

  /** Use the toilet at the compound. Restores bladder by a large amount. */
  public useToilet(): RecoveryResult {
    if (this.state.bladder >= 95) {
      return { success: false, message: 'Don’t need to.' };
    }
    const before = this.state.bladder;
    this.state.bladder = Math.min(100, this.state.bladder + BLADDER_RESTORE);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `Relieved. Bladder ${Math.round(before)} → ${Math.round(this.state.bladder)}.`
    };
  }

  // ------------------------------------------------------------------ listeners

  public onUpdate(listener: NeedsListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  // ------------------------------------------------------------------ internals

  private notify(): void {
    const snap = this.getState();
    for (const l of this.listeners) l(snap);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore quota errors */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<NeedsState>;
      // Coerce each field defensively — old v1 snapshots (with only hunger + energy)
      // will fall through and keep the defaults for the 4 new fields.
      if (typeof data.hunger === 'number') this.state.hunger = clamp100(data.hunger);
      if (typeof data.energy === 'number') this.state.energy = clamp100(data.energy);
      if (typeof data.fun === 'number') this.state.fun = clamp100(data.fun);
      if (typeof data.social === 'number') this.state.social = clamp100(data.social);
      if (typeof data.hygiene === 'number') this.state.hygiene = clamp100(data.hygiene);
      if (typeof data.bladder === 'number') this.state.bladder = clamp100(data.bladder);
    } catch {
      /* ignore parse errors */
    }
  }

  public reset(): void {
    this.state = { ...DEFAULT_STATE };
    this.persist();
    this.notify();
  }
}

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, v));
}
