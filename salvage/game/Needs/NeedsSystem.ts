/**
 * CHALÉ LIFE — Daily needs (hunger + energy)
 * Keeps Accra feeling like a second life: eat, work, rest.
 */

export type NeedId = 'hunger' | 'energy';

export interface NeedsState {
  hunger: number; // 0–100 (100 = full)
  energy: number; // 0–100 (100 = rested)
}

export type NeedsListener = (state: NeedsState) => void;

const STORAGE_KEY = 'chale_life_needs_v1';

const DECAY_PER_SECOND = {
  hunger: 0.35, // ~5 min to empty if idle
  energy: 0.22
};

// Starter (Level 1 · Survival) decay profile — playability patch rule 4.
// A brand-new guest with ₵0 used to soft-lock: 0.35/s hunger meant the
// cheapest ₵8 food was out of reach before the first payout. Until the
// player reaches Level 2 the base drain is ~3/min hunger + ~2/min energy,
// giving roughly 20+ minutes of runway to walk, Act and earn.
const STARTER_DECAY_PER_SECOND = {
  hunger: 0.05,  // 3.0 per minute
  energy: 0.0333 // 2.0 per minute
};

// Free water at home (playability patch rule 4) — no cost, small restore,
// so an empty wallet always has a recovery option besides sleeping.
const WATER_ENERGY_RESTORE = 10;
const WATER_HUNGER_RESTORE = 6;

const WORK_ENERGY_COST = 18;
const SLEEP_ENERGY_RESTORE = 55;
const MEAL_HUNGER_RESTORE = 45;
const LOW_THRESHOLD = 25;

export class NeedsSystem {
  private hunger = 72;
  private energy = 80;
  private fatigueReductionPct = 0;
  /** Level-1 starter profile (slower passive drain) — see STARTER_DECAY. */
  private starterDecay = true;
  private listeners = new Set<NeedsListener>();

  constructor() {
    this.load();
  }

  public setFatigueReductionPct(pct: number): void {
    this.fatigueReductionPct = Math.max(0, Math.min(75, pct));
  }

  /**
   * Starter drain profile (playability patch rule 4): while the player is
   * below Economic Level 2, passive decay runs on STARTER_DECAY_PER_SECOND
   * (~3/min hunger, ~2/min energy) instead of the survival rates. Wired
   * from syncEconomyHUD off economyManager.getProgressionInfo().rankNumber.
   */
  public setStarterDecay(active: boolean): void {
    this.starterDecay = active;
  }

  public isStarterDecay(): boolean {
    return this.starterDecay;
  }

  public getState(): NeedsState {
    return { hunger: this.hunger, energy: this.energy };
  }

  public isHungry(): boolean {
    return this.hunger < LOW_THRESHOLD;
  }

  public isTired(): boolean {
    return this.energy < LOW_THRESHOLD;
  }

  public canWork(): { ok: boolean; reason?: string } {
    if (this.energy < 12) {
      return { ok: false, reason: 'Too tired. Sleep at the compound.' };
    }
    if (this.hunger < 10) {
      return { ok: false, reason: 'Too hungry. Eat first — try waakye or cook at home.' };
    }
    return { ok: true };
  }

  /**
   * Passive decay while living in Accra. Call once per frame.
   *
   * Optional `modifiers` parameter: named multipliers scale the
   * corresponding need's decay. The housing system uses this to apply
   * passive bonuses from placed furniture (fan reduces energy decay,
   * bed reduces energy decay, etc.). Default multiplier is 1.0 (normal).
   *
   * The fatigueReductionPct (housing-tier bonus) compounds multiplicatively
   * with the modifier: effectiveEnergyDecay = DECAY_PER_SECOND.energy ×
   * (1 - fatigueReductionPct/100) × (modifiers.energy ?? 1).
   */
  public tick(
    dtSeconds: number,
    modifiers?: { hunger?: number; energy?: number }
  ): void {
    if (dtSeconds <= 0 || dtSeconds > 2) return;
    const m = modifiers ?? {};
    const base = this.starterDecay ? STARTER_DECAY_PER_SECOND : DECAY_PER_SECOND;
    const energyFactor = (1 - this.fatigueReductionPct / 100) * (m.energy ?? 1);
    this.hunger = Math.max(0, this.hunger - base.hunger * dtSeconds * (m.hunger ?? 1));
    this.energy = Math.max(0, this.energy - base.energy * energyFactor * dtSeconds);
    this.notify();
  }

  /** After finishing a job / hustle shift */
  public onWorkCompleted(): { energyAfter: number; message: string } {
    const before = this.energy;
    const costFactor = 1 - (this.fatigueReductionPct * 0.5) / 100;
    this.energy = Math.max(0, this.energy - Math.round(WORK_ENERGY_COST * costFactor));
    this.hunger = Math.max(0, this.hunger - 8);
    this.persist();
    this.notify();
    return {
      energyAfter: this.energy,
      message:
        this.energy < LOW_THRESHOLD
          ? 'Shift done. You’re drained — head home to rest.'
          : `Shift done. Energy ${Math.round(before)} → ${Math.round(this.energy)}.`
    };
  }

  /** Buy / eat waakye or similar */
  public eatMeal(label = 'Waakye', hungerRestore = MEAL_HUNGER_RESTORE, energyBonus = 6): { success: boolean; message: string } {
    if (this.hunger >= 96 && this.energy >= 96) {
      return { success: false, message: 'Already full and energized.' };
    }
    const before = this.hunger;
    this.hunger = Math.min(100, this.hunger + hungerRestore);
    this.energy = Math.min(100, this.energy + energyBonus);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${label} · Hunger ${Math.round(before)} → ${Math.round(this.hunger)}.`
    };
  }

  /**
   * Free water at the compound (playability patch rule 4) — always free,
   * small restore so a ₵0 player always has a recovery option. Refuses
   * only when already full.
   */
  public drinkWater(): { success: boolean; message: string } {
    if (this.hunger >= 96 && this.energy >= 96) {
      return { success: false, message: 'Already refreshed.' };
    }
    const eBefore = this.energy;
    const hBefore = this.hunger;
    this.energy = Math.min(100, this.energy + WATER_ENERGY_RESTORE);
    this.hunger = Math.min(100, this.hunger + WATER_HUNGER_RESTORE);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `Free water · Energy ${Math.round(eBefore)} → ${Math.round(this.energy)} · Hunger ${Math.round(hBefore)} → ${Math.round(this.hunger)}.`
    };
  }

  /** Boost energy via home relaxation / hosting social activity */
  public boostEnergy(amount: number, label: string): { success: boolean; message: string } {
    const before = this.energy;
    this.energy = Math.min(100, this.energy + Math.max(1, amount));
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${label} · Energy ${Math.round(before)} → ${Math.round(this.energy)}.`
    };
  }

  /** Sleep / rest at compound. Optional bonus (e.g. own a bed or upgraded housing tier). */
  public sleep(bonus = 0, baseRestore = SLEEP_ENERGY_RESTORE): { success: boolean; message: string } {
    if (this.energy >= 95) {
      return { success: false, message: 'Already rested.' };
    }
    const before = this.energy;
    const restore = baseRestore + Math.max(0, bonus);
    this.energy = Math.min(100, this.energy + restore);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `Rested at home · Energy ${Math.round(before)} → ${Math.round(this.energy)}.`
    };
  }

  /**
   * Light rest — a small energy bump from furniture interactions
   * (watching TV, relaxing on a sofa). Cheaper than sleep, capped at 95.
   * Returns the result with a message showing the energy delta.
   */
  public restLight(amount: number, label = 'Rest'): { success: boolean; message: string } {
    if (this.energy >= 95) {
      return { success: false, message: 'Already rested.' };
    }
    const before = this.energy;
    this.energy = Math.min(95, this.energy + Math.max(0, amount));
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${label} · Energy ${Math.round(before)} → ${Math.round(this.energy)}.`
    };
  }

  public onUpdate(listener: NeedsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    for (const l of this.listeners) l(state);
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ hunger: this.hunger, energy: this.energy })
      );
    } catch {
      /* ignore */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<NeedsState>;
      if (typeof data.hunger === 'number') this.hunger = Math.min(100, Math.max(0, data.hunger));
      if (typeof data.energy === 'number') this.energy = Math.min(100, Math.max(0, data.energy));
    } catch {
      /* ignore */
    }
  }

  public reset(): void {
    this.hunger = 72;
    this.energy = 80;
    this.persist();
    this.notify();
  }
}
