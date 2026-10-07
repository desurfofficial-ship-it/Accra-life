/**
 * CHALÉ LIFE — Accra Live Events System
 *
 * Cycles through dynamic Accra neighborhood events (ECG Dumsor, Circle Trotro Rush Hour,
 * Sister Akosua's Fresh Waakye Batch, Adabraka Market Surge, Osu Highlife Night, and
 * Police Snap Checkpoint). Each event has real gameplay modifiers on job payouts,
 * side hustle profits, food/rest recovery, and location hotspots.
 */

import type { LocationId } from '../World/Locations';

export type LiveEventId =
  | 'trotro_rush_hour'
  | 'sister_akosua_waakye'
  | 'ecg_dumsor'
  | 'adabraka_market_surge'
  | 'osu_highlife_night'
  | 'police_checkpoint';

export interface LiveEventDef {
  id: LiveEventId;
  icon: string;
  title: string;
  shortBanner: string;
  hotspotLocationId: LocationId;
  hotspotName: string;
  durationSeconds: number;
  description: string;
  effectSummary: string;
  /** Multiplier on legal job payouts (1.0 = normal, 1.35 = +35%) */
  jobPayMultiplier: number;
  /** Multiplier on side hustle payouts */
  hustlePayMultiplier: number;
  /** Extra hunger restored when eating waakye or place meals */
  mealHungerBonus: number;
  /** Extra energy restored from meals or place recovery */
  recoveryEnergyBonus: number;
  /** Multiplier on passive energy drain (1.0 = normal, 0.25 = -75% drain) */
  fatigueDrainMultiplier: number;
  /** Multiplier on home social hosting rewards */
  socialBonusMultiplier: number;
  /** True if ECG power is out (mitigated by owning Backup Generator) */
  isDumsor: boolean;
}

export const ACCRA_LIVE_EVENTS: readonly LiveEventDef[] = [
  {
    id: 'trotro_rush_hour',
    icon: '🚐',
    title: 'Circle–Osu Trotro Rush Hour',
    shortBanner: 'Rush Hour · +35% Job Pay',
    hotspotLocationId: 'circle_trotro_stop',
    hotspotName: 'Circle Trotro Stop',
    durationSeconds: 120,
    description: 'Commuters are queueing from Osu to Circle! Trotro mates and errand runners are in high demand.',
    effectSummary: '+35% Legal Job Payouts · +10 Energy from Station Snacks',
    jobPayMultiplier: 1.35,
    hustlePayMultiplier: 1.1,
    mealHungerBonus: 0,
    recoveryEnergyBonus: 10,
    fatigueDrainMultiplier: 1.0,
    socialBonusMultiplier: 1.0,
    isDumsor: false
  },
  {
    id: 'sister_akosua_waakye',
    icon: '🍲',
    title: 'Fresh Hot Waakye Batch',
    shortBanner: 'Fresh Waakye · +25 Meal Hunger & +20% Pay',
    hotspotLocationId: 'osu_waakye_joint',
    hotspotName: 'Osu Waakye Joint',
    durationSeconds: 110,
    description: 'Sister Akosua just opened a steaming cauldron of waakye with shito, wele, and kelewele.',
    effectSummary: '+25 Hunger & +15 Energy from Meals · +20% Job & Hustle Pay',
    jobPayMultiplier: 1.2,
    hustlePayMultiplier: 1.2,
    mealHungerBonus: 25,
    recoveryEnergyBonus: 15,
    fatigueDrainMultiplier: 0.8,
    socialBonusMultiplier: 1.0,
    isDumsor: false
  },
  {
    id: 'adabraka_market_surge',
    icon: '📦',
    title: 'Adabraka Provision Restock Surge',
    shortBanner: 'Market Surge · +35% Side Hustle Pay',
    hotspotLocationId: 'adabraka_provisions',
    hotspotName: 'Adabraka Provisions',
    durationSeconds: 115,
    description: 'Wholesale delivery trucks have arrived in Adabraka. Traders and side hustlers are cashing out fast.',
    effectSummary: '+35% Side Hustle Payouts · +15% Legal Job Pay',
    jobPayMultiplier: 1.15,
    hustlePayMultiplier: 1.35,
    mealHungerBonus: 5,
    recoveryEnergyBonus: 8,
    fatigueDrainMultiplier: 0.85,
    socialBonusMultiplier: 1.0,
    isDumsor: false
  },
  {
    id: 'osu_highlife_night',
    icon: '🎶',
    title: 'Oxford Street Highlife Block Party',
    shortBanner: 'Highlife Vibe · 2× Social Rewards & Low Fatigue',
    hotspotLocationId: 'osu_oxford_street',
    hotspotName: 'Osu Oxford Street',
    durationSeconds: 120,
    description: 'Highlife & Afrobeats speakers are booming down Oxford Street. Good vibes keep everyone energized.',
    effectSummary: '2× Home Hosting Rewards · -65% Fatigue Drain · +15% Pay',
    jobPayMultiplier: 1.15,
    hustlePayMultiplier: 1.15,
    mealHungerBonus: 10,
    recoveryEnergyBonus: 15,
    fatigueDrainMultiplier: 0.35,
    socialBonusMultiplier: 2.0,
    isDumsor: false
  },
  {
    id: 'ecg_dumsor',
    icon: '⚡',
    title: 'ECG Dumsor Power Outage',
    shortBanner: 'Dumsor · Generator Owners Thrive (+25% Hustles)',
    hotspotLocationId: 'home_compound',
    hotspotName: 'Home Compound',
    durationSeconds: 95,
    description: 'Lights went out across the block! Having a Backup Generator at your compound keeps your comfort at 100%.',
    effectSummary: '+25% Side Hustle Pay · Home Sleep -15 Eng without Generator (+15 with Generator)',
    jobPayMultiplier: 1.1,
    hustlePayMultiplier: 1.25,
    mealHungerBonus: 0,
    recoveryEnergyBonus: 5,
    fatigueDrainMultiplier: 1.1,
    socialBonusMultiplier: 1.2,
    isDumsor: true
  },
  {
    id: 'police_checkpoint',
    icon: '🚨',
    title: 'Oxford Street Snap Checkpoint',
    shortBanner: 'Snap Check · +25% Clean Job Bonus',
    hotspotLocationId: 'osu_oxford_street',
    hotspotName: 'Osu Oxford Street',
    durationSeconds: 90,
    description: 'Patrol officers are inspecting commercial vehicles along the main drag. Clean legal work is rewarded!',
    effectSummary: '+25% Legal Job Payouts · Stay Clean for Bonus',
    jobPayMultiplier: 1.25,
    hustlePayMultiplier: 1.05,
    mealHungerBonus: 0,
    recoveryEnergyBonus: 5,
    fatigueDrainMultiplier: 0.9,
    socialBonusMultiplier: 1.0,
    isDumsor: false
  }
] as const;

export interface ActiveLiveEventState {
  event: LiveEventDef;
  remainingSeconds: number;
  startedAtMs: number;
  expiresAtMs: number;
}

export type LiveEventListener = (state: ActiveLiveEventState) => void;

export class LiveEventsSystem {
  private currentIndex = 0;
  private startedAtMs = Date.now();
  private expiresAtMs = Date.now() + ACCRA_LIVE_EVENTS[0].durationSeconds * 1000;
  private listeners = new Set<LiveEventListener>();
  /**
   * Optional skip-predicate (wired from main.ts composition root): when it
   * returns true for a candidate event, the cycler skips it. Used so the
   * 'trotro_rush_hour' job-pay pill never displays alongside the world-level
   * RUSH_HOUR (EventService — trotro fare surge + top EventBanner): two
   * same-named banners at once read as a duplicate to the player.
   */
  private blockPredicate: ((ev: LiveEventDef) => boolean) | null = null;

  constructor() {
    this.startEventByIndex(0);
  }

  /**
   * Set/clear the skip-predicate (composition-root wiring — keeps this class
   * decoupled from EventService). Passing null restores unfiltered cycling.
   */
  public setBlockPredicate(p: ((ev: LiveEventDef) => boolean) | null): void {
    this.blockPredicate = p;
  }

  /**
   * Next index after `from`, skipping blocked events. Full-cycle safe —
   * if every event is blocked the original successor is returned.
   */
  private pickNextIndex(from: number): number {
    const len = ACCRA_LIVE_EVENTS.length;
    let idx = (from + 1) % len;
    for (let i = 0; i < len && this.blockPredicate; i++) {
      if (!this.blockPredicate(ACCRA_LIVE_EVENTS[idx])) return idx;
      idx = (idx + 1) % len;
    }
    return idx;
  }

  public getActiveEvent(): ActiveLiveEventState {
    const ev = ACCRA_LIVE_EVENTS[this.currentIndex] ?? ACCRA_LIVE_EVENTS[0];
    const remainingSeconds = Math.max(
      0,
      Math.ceil((this.expiresAtMs - Date.now()) / 1000)
    );
    return {
      event: ev,
      remainingSeconds,
      startedAtMs: this.startedAtMs,
      expiresAtMs: this.expiresAtMs
    };
  }

  public tick(): ActiveLiveEventState {
    if (Date.now() >= this.expiresAtMs) {
      this.startEventByIndex(this.pickNextIndex(this.currentIndex));
    }
    const state = this.getActiveEvent();
    this.notify(state);
    return state;
  }

  public triggerNextEvent(): ActiveLiveEventState {
    this.startEventByIndex(this.pickNextIndex(this.currentIndex));
    const state = this.getActiveEvent();
    this.notify(state);
    return state;
  }

  public triggerSpecificEvent(id: LiveEventId): ActiveLiveEventState {
    const idx = ACCRA_LIVE_EVENTS.findIndex((e) => e.id === id);
    if (idx >= 0) {
      this.startEventByIndex(idx);
    }
    const state = this.getActiveEvent();
    this.notify(state);
    return state;
  }

  public onUpdate(listener: LiveEventListener): () => void {
    this.listeners.add(listener);
    listener(this.getActiveEvent());
    return () => this.listeners.delete(listener);
  }

  private startEventByIndex(index: number): void {
    this.currentIndex = index % ACCRA_LIVE_EVENTS.length;
    const ev = ACCRA_LIVE_EVENTS[this.currentIndex];
    this.startedAtMs = Date.now();
    this.expiresAtMs = this.startedAtMs + ev.durationSeconds * 1000;
  }

  private notify(state: ActiveLiveEventState): void {
    for (const l of this.listeners) {
      l(state);
    }
  }
}
