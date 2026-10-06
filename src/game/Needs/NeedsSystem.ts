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

const WORK_ENERGY_COST = 18;
const SLEEP_ENERGY_RESTORE = 55;
const MEAL_HUNGER_RESTORE = 45;
const LOW_THRESHOLD = 25;

export class NeedsSystem {
  private hunger = 72;
  private energy = 80;
  private listeners = new Set<NeedsListener>();

  constructor() {
    this.load();
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
      return { ok: false, reason: 'Too hungry. Eat first — try waakye.' };
    }
    return { ok: true };
  }

  /** Passive decay while living in Accra */
  public tick(dtSeconds: number): void {
    if (dtSeconds <= 0 || dtSeconds > 2) return;
    this.hunger = Math.max(0, this.hunger - DECAY_PER_SECOND.hunger * dtSeconds);
    this.energy = Math.max(0, this.energy - DECAY_PER_SECOND.energy * dtSeconds);
    this.notify();
  }

  /** After finishing a job / hustle shift */
  public onWorkCompleted(): { energyAfter: number; message: string } {
    const before = this.energy;
    this.energy = Math.max(0, this.energy - WORK_ENERGY_COST);
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
  public eatMeal(label = 'Waakye'): { success: boolean; message: string } {
    if (this.hunger >= 95) {
      return { success: false, message: 'Already full.' };
    }
    const before = this.hunger;
    this.hunger = Math.min(100, this.hunger + MEAL_HUNGER_RESTORE);
    this.energy = Math.min(100, this.energy + 6);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${label} hit. Hunger ${Math.round(before)} → ${Math.round(this.hunger)}.`
    };
  }

  /** Sleep / rest at compound. Optional bonus (e.g. own a bed). */
  public sleep(bonus = 0): { success: boolean; message: string } {
    if (this.energy >= 95) {
      return { success: false, message: 'Already rested.' };
    }
    const before = this.energy;
    const restore = SLEEP_ENERGY_RESTORE + Math.max(0, bonus);
    this.energy = Math.min(100, this.energy + restore);
    this.persist();
    this.notify();
    return {
      success: true,
      message: bonus > 0
        ? `Slept on a real bed. Energy ${Math.round(before)} → ${Math.round(this.energy)}.`
        : `Rested. Energy ${Math.round(before)} → ${Math.round(this.energy)}.`
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
