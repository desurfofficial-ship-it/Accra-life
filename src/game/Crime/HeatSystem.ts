import { EconomyManager } from '../Economy/EconomyManager';
import { PersistedCrimeState } from '../Economy/EconomyPersistence';
import { WorkStepDefinition } from '../Jobs/JobRegistry';

export type PoliceStatus = 'NORMAL' | 'CLEAN' | 'SUSPICIOUS' | 'WANTED' | 'ARRESTED';

export interface IllegalHustleDefinition {
  readonly id: string;
  readonly title: string;
  readonly riskLabel: string;
  readonly baseArrestChance: number;
  readonly heatPerStep: number;
  readonly payoutGHS: number;
  readonly fineOnArrestGHS: number;
  readonly summary: string;
  readonly steps: ReadonlyArray<WorkStepDefinition>;
}

export interface ArrestRecord {
  readonly timestamp: number;
  readonly interruptedHustleId: string | null;
  readonly interruptedHustleTitle: string | null;
  readonly locationInteractableId: string;
  readonly confiscatedGHS: number;
  readonly finePaidGHS: number;
  readonly message: string;
}

/**
 * Risky / Illegal activities anchored to the existing Adabraka neighborhood entities:
 * - `trotro_stop` (ACC_PROP_001 — Osu–Circle Trotro Station)
 * - `provision_shop` (ACC_SHOP_001 — Adabraka Provision Store & MoMo)
 * - `food_vendor` (ACC_RESTAURANT_001 — Sister Akosua’s Waakye & Jollof Joint)
 * - `npc_male_001` (NPC_MALE_001 — Kojo on the North walkway)
 * - `npc_older_001` (NPC_OLDER_001 — Uncle Mensah on the South walkway)
 */
export const ACCRA_ILLEGAL_HUSTLES: ReadonlyArray<IllegalHustleDefinition> = [
  {
    id: 'ILLEGAL_CONTRABAND_PARCEL',
    title: 'Unlicensed Contraband Parcel Drop',
    riskLabel: 'Medium-High Risk · +30 Heat/Step · Police Seizure & ₵18 Fine if Caught',
    baseArrestChance: 0.22,
    heatPerStep: 30,
    payoutGHS: 45.0,
    fineOnArrestGHS: 18.0,
    summary:
      'Move an unmanifested contraband electronics parcel from behind the Trotro Station to the North walkway corner without getting intercepted by police patrols.',
    steps: [
      {
        stepId: 'contraband_step_1_pickup',
        stepTitle: 'Pick Up Unmarked Contraband Package',
        instruction:
          'Discreetly collect the unmarked parcel behind the Osu–Circle Trotro Station shelter.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Osu–Circle Trotro Station',
        actionVerb: 'Collect Unmarked Parcel',
        completionMessage: 'Stashed the unmarked parcel under your arm. Police heat increased!'
      },
      {
        stepId: 'contraband_step_2_drop',
        stepTitle: 'Hand Off Contraband Package on North Street',
        instruction:
          'Walk across the road to the North walkway near Kojo’s corner to complete the drop for ₵45.00.',
        targetInteractableId: 'npc_male_001',
        requiredAssetId: 'NPC_MALE_001',
        targetLocationName: 'North Walkway Corner',
        actionVerb: 'Complete Contraband Drop',
        completionMessage: 'Contraband drop completed! Received ₵45.00 illicit cash.'
      }
    ]
  },
  {
    id: 'ILLEGAL_BLACK_MARKET_DEAL',
    title: 'Roadside Black-Market Cash & Goods Run',
    riskLabel: 'High Risk · +38 Heat/Step · Police Seizure & ₵25 Fine if Caught',
    baseArrestChance: 0.34,
    heatPerStep: 38,
    payoutGHS: 68.0,
    fineOnArrestGHS: 25.0,
    summary:
      'Run a high-stakes unlicensed roadside deal between the Adabraka Provision Store alley, the Chop Bar back corner, and the Trotro Station curb.',
    steps: [
      {
        stepId: 'blackmarket_step_1_bundle',
        stepTitle: 'Collect Unlicensed Goods Bundle',
        instruction:
          'Head to the Adabraka Provision Store corner to pick up the sealed contraband bundle.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Adabraka Provision Store Corner',
        actionVerb: 'Pick Up Sealed Bundle',
        completionMessage: 'Picked up the high-risk bundle. Patrol scrutiny is rising fast!'
      },
      {
        stepId: 'blackmarket_step_2_relay',
        stepTitle: 'Verify Code at Chop Bar Patio Corner',
        instruction:
          'Walk east along the North walkway past Sister Akosua’s Joint to confirm the buyer signal.',
        targetInteractableId: 'food_vendor',
        requiredAssetId: 'ACC_RESTAURANT_001',
        targetLocationName: 'Sister Akosua’s Joint Corner',
        actionVerb: 'Confirm Buyer Signal',
        completionMessage: 'Buyer signal confirmed across the street. Move quickly before patrol spots you!'
      },
      {
        stepId: 'blackmarket_step_3_exchange',
        stepTitle: 'Exchange Bundle at Trotro Curb',
        instruction:
          'Cross the street to the Osu–Circle Trotro Station to hand off the bundle and collect ₵68.00.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Osu–Circle Trotro Station',
        actionVerb: 'Complete Illicit Exchange',
        completionMessage: 'High-risk deal closed! Collected ₵68.00 illicit cash.'
      }
    ]
  }
];

export type ArrestCallback = (record: ArrestRecord) => void;

/**
 * Tracks the player's wanted level (`NORMAL -> SUSPICIOUS -> WANTED -> ARRESTED`),
 * manages risky/illegal activities in the Adabraka neighborhood, and enforces
 * the Arrest state (interrupting active illegal activities, confiscating illicit proceeds,
 * and applying police fines).
 */
export class HeatSystem {
  private readonly economy: EconomyManager;
  private heatLevel = 0;
  private policeStatus: PoliceStatus = 'NORMAL';
  private activeIllegalId: string | null = null;
  private activeIllegalStepIndex = 0;
  private arrestCount = 0;
  private arrestReleaseTimerSeconds = 0;
  private lastArrestRecord: ArrestRecord | null = null;
  private arrestListeners: Set<ArrestCallback> = new Set();

  constructor(economy: EconomyManager) {
    this.economy = economy;
  }

  public onArrest(listener: ArrestCallback): () => void {
    this.arrestListeners.add(listener);
    return () => {
      this.arrestListeners.delete(listener);
    };
  }

  public getPersistedState(): PersistedCrimeState {
    return {
      heatLevel: Math.round(this.heatLevel),
      policeStatus: this.policeStatus,
      activeIllegalId: this.activeIllegalId,
      activeIllegalStepIndex: this.activeIllegalStepIndex,
      arrestCount: this.arrestCount
    };
  }

  public hydrate(state: PersistedCrimeState | null | undefined): void {
    if (!state) return;
    this.heatLevel = Math.max(0, Math.min(100, Number(state.heatLevel) || 0));
    this.policeStatus = state.policeStatus ?? 'NORMAL';
    this.activeIllegalId = state.activeIllegalId ?? null;
    this.activeIllegalStepIndex = Math.max(0, Number(state.activeIllegalStepIndex) || 0);
    this.arrestCount = Math.max(0, Number(state.arrestCount) || 0);
    if (this.policeStatus === 'ARRESTED') {
      this.arrestReleaseTimerSeconds = 4.0;
    } else {
      this.recomputePoliceStatus();
    }
  }

  public reset(): void {
    this.heatLevel = 0;
    this.policeStatus = 'NORMAL';
    this.activeIllegalId = null;
    this.activeIllegalStepIndex = 0;
    this.arrestCount = 0;
    this.arrestReleaseTimerSeconds = 0;
    this.lastArrestRecord = null;
  }

  public getHeatLevel(): number {
    return Math.round(this.heatLevel);
  }

  public getPoliceStatus(): PoliceStatus {
    return this.policeStatus;
  }

  public getWantedStars(): 0 | 1 | 2 | 3 {
    if (this.policeStatus === 'ARRESTED' || this.heatLevel >= 85) return 3;
    if (this.heatLevel >= 60) return 2;
    if (this.heatLevel >= 25) return 1;
    return 0;
  }

  public getArrestCount(): number {
    return this.arrestCount;
  }

  public getLastArrestRecord(): ArrestRecord | null {
    return this.lastArrestRecord;
  }

  public getActiveIllegalHustle(): {
    hustle: IllegalHustleDefinition;
    stepIndex: number;
    currentStep: WorkStepDefinition;
    totalSteps: number;
  } | null {
    if (!this.activeIllegalId) return null;
    const hustle = ACCRA_ILLEGAL_HUSTLES.find((h) => h.id === this.activeIllegalId);
    if (!hustle) return null;
    const step = hustle.steps[Math.min(this.activeIllegalStepIndex, hustle.steps.length - 1)];
    return {
      hustle,
      stepIndex: this.activeIllegalStepIndex,
      currentStep: step,
      totalSteps: hustle.steps.length
    };
  }

  public getActiveTargetInteractableId(): string | null {
    const active = this.getActiveIllegalHustle();
    return active ? active.currentStep.targetInteractableId : null;
  }

  /**
   * Adds heat directly and updates wanted status (`NORMAL -> SUSPICIOUS -> WANTED`).
   * If heat reaches 100, immediately triggers an arrest state.
   */
  public addHeat(amount: number, locationInteractableId = 'trotro_stop'): PoliceStatus {
    if (!Number.isFinite(amount) || amount <= 0) return this.policeStatus;
    this.heatLevel = Math.min(100, this.heatLevel + amount);
    this.recomputePoliceStatus();

    if (this.heatLevel >= 100 && this.policeStatus !== 'ARRESTED') {
      const active = this.getActiveIllegalHustle();
      this.executeArrestState({
        hustle: active?.hustle ?? null,
        locationInteractableId,
        fineGHS: active?.hustle.fineOnArrestGHS ?? 20.0
      });
    } else {
      this.economy.saveSnapshot();
    }

    return this.policeStatus;
  }

  /**
   * Immediately sheds heat (0–100 scale) — used by place-tied recovery
   * actions (veranda nap, neem shade rest). Recomputes wanted status so
   * cooling off below a threshold downgrades the police pill live.
   */
  public reduceHeatBy(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.heatLevel = Math.max(0, this.heatLevel - amount);
    this.recomputePoliceStatus();
  }

  public startIllegalHustle(
    hustleId: string,
    hasActiveLegalWork: boolean
  ): { success: boolean; message: string } {
    if (this.policeStatus === 'ARRESTED') {
      return {
        success: false,
        message: 'You are currently under arrest by the Accra police patrol. Wait for release.'
      };
    }
    if (hasActiveLegalWork) {
      return {
        success: false,
        message: 'Finish or cancel your active legal job/hustle first.'
      };
    }
    if (this.activeIllegalId) {
      return {
        success: false,
        message: 'You already have an active risky hustle in progress.'
      };
    }

    const hustle = ACCRA_ILLEGAL_HUSTLES.find((h) => h.id === hustleId);
    if (!hustle) {
      return { success: false, message: 'Risky hustle not found.' };
    }

    this.activeIllegalId = hustle.id;
    this.activeIllegalStepIndex = 0;
    this.heatLevel = Math.min(95, this.heatLevel + 12);
    this.recomputePoliceStatus();
    this.economy.saveSnapshot();

    return {
      success: true,
      message: `Risky Hustle Started: ${hustle.title}. Watch out for police patrols! Next: ${hustle.steps[0].instruction}`
    };
  }

  public cancelActiveIllegalHustle(): string {
    if (!this.activeIllegalId) return 'No risky hustle active.';
    const hustle = ACCRA_ILLEGAL_HUSTLES.find((h) => h.id === this.activeIllegalId);
    this.activeIllegalId = null;
    this.activeIllegalStepIndex = 0;
    this.economy.saveSnapshot();
    return `Abandoned risky hustle: ${hustle?.title ?? 'Deal'}.`;
  }

  /**
   * Advances the active illegal hustle when interacting with the target neighborhood entity.
   * Evaluates police patrol interception risk; if caught (or if heat >= 100), enters the
   * ARRESTED state, interrupts the illegal activity, confiscates illicit cash, and applies a fine.
   */
  public tryAdvanceAtInteractable(
    interactableId: string,
    assetId?: string,
    randomRollOverride?: number
  ): {
    handled: boolean;
    arrested: boolean;
    completed: boolean;
    message: string;
  } {
    const active = this.getActiveIllegalHustle();
    if (!active || active.currentStep.targetInteractableId !== interactableId) {
      return { handled: false, arrested: false, completed: false, message: '' };
    }

    if (assetId && active.currentStep.requiredAssetId !== assetId) {
      return { handled: false, arrested: false, completed: false, message: '' };
    }

    // Increase wanted heat for performing an illegal step in the neighborhood
    this.heatLevel = Math.min(100, this.heatLevel + active.hustle.heatPerStep);
    this.recomputePoliceStatus();

    const effectiveArrestChance = Math.min(
      0.85,
      active.hustle.baseArrestChance + (this.heatLevel / 100) * 0.35
    );

    const roll = randomRollOverride !== undefined ? randomRollOverride : Math.random();
    if (this.heatLevel >= 100 || roll < effectiveArrestChance) {
      return this.executeArrestState({
        hustle: active.hustle,
        locationInteractableId: interactableId,
        fineGHS: active.hustle.fineOnArrestGHS
      });
    }

    const stepMsg = active.currentStep.completionMessage;
    const nextIndex = this.activeIllegalStepIndex + 1;

    if (nextIndex < active.hustle.steps.length) {
      this.activeIllegalStepIndex = nextIndex;
      const nextStep = active.hustle.steps[nextIndex];
      this.economy.saveSnapshot();
      return {
        handled: true,
        arrested: false,
        completed: false,
        message: `${stepMsg} (Heat: ${this.getHeatLevel()}% · ${this.policeStatus}) → Next: ${nextStep.instruction}`
      };
    }

    // Final step completed without arrest -> pay illicit proceeds
    const payout = active.hustle.payoutGHS;
    this.economy.awardIncome({
      amountGHS: payout,
      category: 'RISKY_HUSTLE',
      description: `${active.hustle.title} (Illicit Proceeds)`,
      channel: 'CASH',
      isIllegalOrigin: true
    });

    this.activeIllegalId = null;
    this.activeIllegalStepIndex = 0;
    this.economy.saveSnapshot();

    return {
      handled: true,
      arrested: false,
      completed: true,
      message: `${stepMsg} (+₵${payout.toFixed(2)} Cash · Police Heat ${this.getHeatLevel()}%)`
    };
  }

  /**
   * Explicitly triggers the Arrest State, interrupting any active illegal activity,
   * confiscating unsecured illegal proceeds, and applying a misdemeanor fine.
   */
  public executeArrestState(params?: {
    hustle?: IllegalHustleDefinition | null;
    locationInteractableId?: string;
    fineGHS?: number;
  }): {
    handled: boolean;
    arrested: boolean;
    completed: boolean;
    message: string;
    record: ArrestRecord;
  } {
    const active = this.getActiveIllegalHustle();
    const targetHustle = params?.hustle !== undefined ? params.hustle : active?.hustle ?? null;
    const fineGHS = params?.fineGHS ?? targetHustle?.fineOnArrestGHS ?? 20.0;
    const locationId =
      params?.locationInteractableId ??
      active?.currentStep.targetInteractableId ??
      'adabraka_street';

    // Interrupt active illegal activity immediately
    const interruptedId = this.activeIllegalId;
    const interruptedTitle = targetHustle?.title ?? null;
    this.activeIllegalId = null;
    this.activeIllegalStepIndex = 0;

    this.arrestCount += 1;
    this.policeStatus = 'ARRESTED';
    this.arrestReleaseTimerSeconds = 6.0;

    // Apply confiscation of unsecured illegal cash and fine via Wallet
    const penalty = this.economy.wallet.applyPoliceConfiscationAndFine(fineGHS);
    this.economy.saveSnapshot();

    const lostTotal = penalty.confiscatedGHS + penalty.finePaidGHS;
    const detail =
      lostTotal > 0
        ? `Police confiscated ₵${penalty.confiscatedGHS.toFixed(2)} illicit cash and fined you ₵${penalty.finePaidGHS.toFixed(2)}.`
        : 'You had ₵0.00 on you — the patrol seized the contraband and issued a misdemeanor citation.';

    const message = `BUSTED BY ACCRA POLICE PATROL! ${
      interruptedTitle ? `"${interruptedTitle}" was interrupted. ` : ''
    }${detail}`;

    const record: ArrestRecord = {
      timestamp: Date.now(),
      interruptedHustleId: interruptedId,
      interruptedHustleTitle: interruptedTitle,
      locationInteractableId: locationId,
      confiscatedGHS: penalty.confiscatedGHS,
      finePaidGHS: penalty.finePaidGHS,
      message
    };

    this.lastArrestRecord = record;
    for (const listener of this.arrestListeners) {
      listener(record);
    }

    return {
      handled: true,
      arrested: true,
      completed: false,
      message,
      record
    };
  }

  public tickHeatDecay(dt: number): void {
    this.update(dt);
  }

  public update(dt: number): void {
    if (this.policeStatus === 'ARRESTED') {
      this.arrestReleaseTimerSeconds -= dt;
      if (this.arrestReleaseTimerSeconds <= 0) {
        this.arrestReleaseTimerSeconds = 0;
        this.heatLevel = 12;
        this.recomputePoliceStatus();
        this.economy.saveSnapshot();
      }
      return;
    }

    if (!this.activeIllegalId && this.heatLevel > 0) {
      const prevBucket = Math.floor(this.heatLevel);
      const prevStatus = this.policeStatus;
      this.heatLevel = Math.max(0, this.heatLevel - dt * 1.6);
      this.recomputePoliceStatus();
      if (Math.floor(this.heatLevel) !== prevBucket || this.policeStatus !== prevStatus) {
        if (this.heatLevel === 0 || this.policeStatus !== prevStatus) {
          this.economy.saveSnapshot();
        }
      }
    }
  }

  private recomputePoliceStatus(): void {
    if (this.arrestReleaseTimerSeconds > 0) {
      this.policeStatus = 'ARRESTED';
      return;
    }
    if (this.heatLevel >= 60) {
      this.policeStatus = 'WANTED';
    } else if (this.heatLevel >= 25) {
      this.policeStatus = 'SUSPICIOUS';
    } else {
      this.policeStatus = 'NORMAL';
    }
  }
}
