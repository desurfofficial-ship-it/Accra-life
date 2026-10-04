import { EconomyManager } from './EconomyManager';
import { PersistedCrimeState } from './EconomyPersistence';
import { WorkStepDefinition } from './JobSystem';

export type PoliceStatus = 'NORMAL' | 'SUSPICIOUS' | 'WANTED' | 'ARRESTED';

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

export const ACCRA_ILLEGAL_HUSTLES: ReadonlyArray<IllegalHustleDefinition> = [
  {
    id: 'ILLEGAL_CONTRABAND_PARCEL',
    title: 'Unlicensed Contraband Parcel Drop',
    riskLabel: 'Medium-High Risk · +28 Heat/Step · Police Seizure & ₵18 Fine if Caught',
    baseArrestChance: 0.22,
    heatPerStep: 28,
    payoutGHS: 45.0,
    fineOnArrestGHS: 18.0,
    summary:
      'Move an unmanifested contraband electronics parcel across the street without alerting neighborhood police patrols.',
    steps: [
      {
        stepTitle: 'Pick Up Unmarked Contraband Package',
        instruction: 'Discreetly collect the unmarked parcel behind the Osu–Circle Trotro Station.',
        targetInteractableId: 'trotro_stop',
        targetLocationName: 'Osu–Circle Trotro Station',
        completionMessage: 'Stashed the unmarked parcel under your arm. Police heat increased!'
      },
      {
        stepTitle: 'Hand Off Contraband Package on North Street',
        instruction: 'Walk to the North walkway near Kojo’s corner to complete the drop for ₵45.00.',
        targetInteractableId: 'npc_male_001',
        targetLocationName: 'North Walkway Corner',
        completionMessage: 'Contraband drop completed! Received ₵45.00 illicit cash.'
      }
    ]
  },
  {
    id: 'ILLEGAL_BLACK_MARKET_DEAL',
    title: 'Roadside Black-Market Cash & Goods Run',
    riskLabel: 'High Risk · +36 Heat/Step · Police Seizure & ₵25 Fine if Caught',
    baseArrestChance: 0.34,
    heatPerStep: 36,
    payoutGHS: 68.0,
    fineOnArrestGHS: 25.0,
    summary:
      'Run a high-stakes unlicensed roadside deal between the North kiosk alley and the transit curb. High payout, high patrol scrutiny.',
    steps: [
      {
        stepTitle: 'Collect Unlicensed Goods Bundle',
        instruction: 'Head to the Adabraka Provision Store corner to pick up the sealed bundle.',
        targetInteractableId: 'provision_shop',
        targetLocationName: 'Adabraka Provision Store Corner',
        completionMessage: 'Picked up the high-risk bundle. Patrol scrutiny is rising fast!'
      },
      {
        stepTitle: 'Exchange Bundle at Trotro Curb',
        instruction: 'Cross the street to the Osu–Circle Trotro Station to collect ₵68.00.',
        targetInteractableId: 'trotro_stop',
        targetLocationName: 'Osu–Circle Trotro Station',
        completionMessage: 'High-risk deal closed! Collected ₵68.00 illicit cash.'
      }
    ]
  }
];

export class CrimeSystem {
  private readonly economy: EconomyManager;
  private heatLevel = 0;
  private policeStatus: PoliceStatus = 'NORMAL';
  private activeIllegalId: string | null = null;
  private activeIllegalStepIndex = 0;
  private arrestCount = 0;
  private arrestReleaseTimerSeconds = 0;

  constructor(economy: EconomyManager) {
    this.economy = economy;
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
  }

  public getHeatLevel(): number {
    return Math.round(this.heatLevel);
  }

  public getPoliceStatus(): PoliceStatus {
    return this.policeStatus;
  }

  public getArrestCount(): number {
    return this.arrestCount;
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

  public startIllegalHustle(
    hustleId: string,
    hasActiveLegalWork: boolean
  ): { success: boolean; message: string } {
    if (this.policeStatus === 'ARRESTED') {
      return {
        success: false,
        message: 'You are currently being processed by the police patrol. Wait to be released.'
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
    this.heatLevel = Math.min(100, this.heatLevel + 10);
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

  public tryAdvanceAtInteractable(interactableId: string): {
    handled: boolean;
    arrested: boolean;
    completed: boolean;
    message: string;
  } {
    const active = this.getActiveIllegalHustle();
    if (!active || active.currentStep.targetInteractableId !== interactableId) {
      return { handled: false, arrested: false, completed: false, message: '' };
    }

    // Increase police heat for performing an illicit step
    this.heatLevel = Math.min(100, this.heatLevel + active.hustle.heatPerStep);
    this.recomputePoliceStatus();

    // Calculate interception probability based on base risk + current police heat
    const effectiveArrestChance = Math.min(
      0.85,
      active.hustle.baseArrestChance + (this.heatLevel / 100) * 0.35
    );

    const roll = Math.random();
    if (this.heatLevel >= 100 || roll < effectiveArrestChance) {
      return this.triggerArrest(active.hustle);
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

    // Completed final step without getting intercepted
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

    // Heat cools down gradually while the player is not actively running an illegal hustle
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

  private triggerArrest(hustle: IllegalHustleDefinition): {
    handled: boolean;
    arrested: boolean;
    completed: boolean;
    message: string;
  } {
    this.arrestCount += 1;
    this.activeIllegalId = null;
    this.activeIllegalStepIndex = 0;
    this.policeStatus = 'ARRESTED';
    this.arrestReleaseTimerSeconds = 6.0;

    const penalty = this.economy.wallet.applyPoliceConfiscationAndFine(hustle.fineOnArrestGHS);
    this.economy.saveSnapshot();

    const lostTotal = penalty.confiscatedGHS + penalty.finePaidGHS;
    const detail =
      lostTotal > 0
        ? `Police confiscated ₵${penalty.confiscatedGHS.toFixed(2)} illicit cash and fined you ₵${penalty.finePaidGHS.toFixed(2)}.`
        : 'You had ₵0.00 on you — the patrol confiscated the contraband parcel and issued a stern warning.';

    return {
      handled: true,
      arrested: true,
      completed: false,
      message: `BUSTED BY ACCRA POLICE PATROL! Hustle failed. ${detail}`
    };
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
