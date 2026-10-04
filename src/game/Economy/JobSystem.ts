import { EconomyManager } from './EconomyManager';
import { PersistedJobState } from './EconomyPersistence';

export type JobLifecycleStatus = 'AVAILABLE' | 'ACCEPTED' | 'WORKING' | 'COMPLETED' | 'PAID';

export interface WorkStepDefinition {
  readonly stepTitle: string;
  readonly instruction: string;
  readonly targetInteractableId: string;
  readonly targetLocationName: string;
  readonly completionMessage: string;
}

export interface LegalJobDefinition {
  readonly id: string;
  readonly title: string;
  readonly employerName: string;
  readonly startInteractableId: string;
  readonly payGHS: number;
  readonly summary: string;
  readonly steps: ReadonlyArray<WorkStepDefinition>;
}

export interface SideHustleDefinition {
  readonly id: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly startInteractableId: string;
  readonly upfrontCapitalGHS: number;
  readonly grossPayoutGHS: number;
  readonly summary: string;
  readonly steps: ReadonlyArray<WorkStepDefinition>;
}

export const ACCRA_LEGAL_JOBS: ReadonlyArray<LegalJobDefinition> = [
  {
    id: 'JOB_PROVISION_DELIVERY',
    title: 'Provision Store Crate & Supply Delivery',
    employerName: 'Adabraka Provision Store',
    startInteractableId: 'provision_shop',
    payGHS: 18.0,
    summary:
      'Offload wholesale cartons of Milo, Peak Milk, and bottled water and deliver restock crates across the neighborhood.',
    steps: [
      {
        stepTitle: 'Collect Wholesale Supply Crate',
        instruction: 'Walk to Adabraka Provision Store and pick up the supply crate.',
        targetInteractableId: 'provision_shop',
        targetLocationName: 'Adabraka Provision Store',
        completionMessage: 'Loaded wholesale crate of Peak Milk, Milo tins, and Voltic water.'
      },
      {
        stepTitle: 'Deliver Kitchen Stock to Sister Akosua',
        instruction: 'Carry the provision crate east to Sister Akosua’s Waakye & Jollof Joint.',
        targetInteractableId: 'food_vendor',
        targetLocationName: 'Sister Akosua’s Waakye Joint',
        completionMessage: 'Delivered cooking provisions to Sister Akosua’s kitchen counter.'
      },
      {
        stepTitle: 'Deliver Bottled Water to Trotro Station',
        instruction: 'Cross the street to the Osu–Circle Trotro Station shelter.',
        targetInteractableId: 'trotro_stop',
        targetLocationName: 'Osu–Circle Trotro Station',
        completionMessage: 'Dropped off chilled water pack for the station drivers.'
      },
      {
        stepTitle: 'Collect Daily Wages at Provision Store',
        instruction: 'Return to Adabraka Provision Store to sign off and collect ₵18.00.',
        targetInteractableId: 'provision_shop',
        targetLocationName: 'Adabraka Provision Store',
        completionMessage: 'Shift completed! Shopkeeper paid you ₵18.00 cash.'
      }
    ]
  },
  {
    id: 'JOB_WAAKYE_DISPATCH',
    title: 'Sister Akosua’s Waakye & Jollof Dispatch',
    employerName: 'Sister Akosua’s Food Joint',
    startInteractableId: 'food_vendor',
    payGHS: 22.0,
    summary:
      'Assist Sister Akosua during the lunch rush by delivering hot katemfe-leaf Waakye and shito packs to neighbors.',
    steps: [
      {
        stepTitle: 'Pick Up Hot Waakye Lunch Orders',
        instruction: 'Report to Sister Akosua’s Waakye & Jollof Joint counter.',
        targetInteractableId: 'food_vendor',
        targetLocationName: 'Sister Akosua’s Waakye Joint',
        completionMessage: 'Picked up two steaming Waakye, plantain, and shito packs.'
      },
      {
        stepTitle: 'Deliver First Order to Kojo',
        instruction: 'Walk west along the North walkway and hand Kojo his lunch pack.',
        targetInteractableId: 'npc_male_001',
        targetLocationName: 'Kojo · Neighborhood Creative',
        completionMessage: 'Kojo: "Chale, bless you! Nothing beats hot Waakye at noon."'
      },
      {
        stepTitle: 'Deliver Second Order to Uncle Mensah',
        instruction: 'Cross to the South walkway and deliver Uncle Mensah’s meal.',
        targetInteractableId: 'npc_older_001',
        targetLocationName: 'Uncle Mensah · Community Elder',
        completionMessage: 'Uncle Mensah: "Medaase! Tell Sister Akosua the shito is top class."'
      },
      {
        stepTitle: 'Return to Sister Akosua for Pay',
        instruction: 'Head back to Sister Akosua’s counter to collect your ₵22.00 wages.',
        targetInteractableId: 'food_vendor',
        targetLocationName: 'Sister Akosua’s Waakye Joint',
        completionMessage: 'Lunch dispatch finished! Sister Akosua paid you ₵22.00 cash.'
      }
    ]
  },
  {
    id: 'JOB_TROTRO_MATE',
    title: 'Osu–Circle Trotro Mate & Loading Shift',
    employerName: 'Osu–Circle Trotro Union',
    startInteractableId: 'trotro_stop',
    payGHS: 15.0,
    summary:
      'Work as a trotro mate calling passengers for Osu and Circle, assisting commuters with parcels, and loading the roof rack.',
    steps: [
      {
        stepTitle: 'Call Passengers at Trotro Curb',
        instruction: 'Go to the Osu–Circle Trotro Station to start calling "Osu! Circle! 37!"',
        targetInteractableId: 'trotro_stop',
        targetLocationName: 'Osu–Circle Trotro Station',
        completionMessage: 'Called out the route and opened the minibus sliding door for boarding.'
      },
      {
        stepTitle: 'Assist Commuter Ama with Parcel',
        instruction: 'Walk over to Ama on the North-East walkway to collect her parcel.',
        targetInteractableId: 'npc_female_001',
        targetLocationName: 'Ama · Young Professional',
        completionMessage: 'Ama: "Thanks chale, please make sure this parcel reaches Osu safely."'
      },
      {
        stepTitle: 'Collect Waybill Package from Provision Store',
        instruction: 'Stop by Adabraka Provision Store to pick up the driver’s waybill box.',
        targetInteractableId: 'provision_shop',
        targetLocationName: 'Adabraka Provision Store',
        completionMessage: 'Collected sealed Circle waybill carton from the counter.'
      },
      {
        stepTitle: 'Secure Roof Rack & Collect Mate Pay',
        instruction: 'Return to the Osu–Circle Trotro Station to tie down the luggage and get paid ₵15.00.',
        targetInteractableId: 'trotro_stop',
        targetLocationName: 'Osu–Circle Trotro Station',
        completionMessage: 'Trotro loaded and ready! The driver paid your ₵15.00 mate commission.'
      }
    ]
  }
];

export const ACCRA_SIDE_HUSTLES: ReadonlyArray<SideHustleDefinition> = [
  {
    id: 'HUSTLE_NEIGHBORHOOD_ERRAND',
    title: 'ECG Prepaid & MoMo Errand Runner',
    categoryLabel: 'Informal Errand · ₵0 Capital Required',
    startInteractableId: 'npc_older_001',
    upfrontCapitalGHS: 0,
    grossPayoutGHS: 10.0,
    summary:
      'Run a quick prepaid electricity and Mobile Money errand for Uncle Mensah between the South walkway and the MoMo booth.',
    steps: [
      {
        stepTitle: 'Collect Meter Card from Uncle Mensah',
        instruction: 'Speak with Uncle Mensah on the South walkway to get his prepaid slip.',
        targetInteractableId: 'npc_older_001',
        targetLocationName: 'Uncle Mensah · Community Elder',
        completionMessage: 'Uncle Mensah handed you his prepaid meter card to top up at the MoMo booth.'
      },
      {
        stepTitle: 'Process Token at Adabraka MoMo Booth',
        instruction: 'Walk to Adabraka Provision Store & MoMo to process the prepaid token.',
        targetInteractableId: 'provision_shop',
        targetLocationName: 'Adabraka Provision Store & MoMo',
        completionMessage: 'MoMo agent printed the ECG prepaid token receipt.'
      },
      {
        stepTitle: 'Return Token Slip to Uncle Mensah',
        instruction: 'Bring the receipt back to Uncle Mensah to receive your ₵10.00 tip.',
        targetInteractableId: 'npc_older_001',
        targetLocationName: 'Uncle Mensah · Community Elder',
        completionMessage: 'Uncle Mensah: "God bless your hustle!" You earned +₵10.00 cash.'
      }
    ]
  },
  {
    id: 'HUSTLE_WATER_HAWKING',
    title: 'Roadside Cold Water & Drink Trading',
    categoryLabel: 'Small Trading · ₵5.00 Capital → ₵16.00 Return (+₵11.00 Profit)',
    startInteractableId: 'provision_shop',
    upfrontCapitalGHS: 5.0,
    grossPayoutGHS: 16.0,
    summary:
      'Invest ₵5.00 in a wholesale pack of iced bottled water at the provision store and retail it to commuters and neighbors for ₵16.00.',
    steps: [
      {
        stepTitle: 'Pick Up Wholesale Iced Water Pack',
        instruction: 'Collect your wholesale water bundle at Adabraka Provision Store.',
        targetInteractableId: 'provision_shop',
        targetLocationName: 'Adabraka Provision Store',
        completionMessage: 'Loaded ice-cold water bottles into a head-pan cooler.'
      },
      {
        stepTitle: 'Sell Cold Water to Trotro Commuters',
        instruction: 'Walk to the Osu–Circle Trotro Station and sell to waiting passengers.',
        targetInteractableId: 'trotro_stop',
        targetLocationName: 'Osu–Circle Trotro Station',
        completionMessage: 'Sold half the cooler to thirsty Osu–Circle passengers!'
      },
      {
        stepTitle: 'Sell Final Bottles to Kojo &Ama’s Corner',
        instruction: 'Walk to Kojo on the North walkway to sell the remaining bottles for ₵16.00.',
        targetInteractableId: 'npc_male_001',
        targetLocationName: 'Kojo · Neighborhood Creative',
        completionMessage: 'Sold out your entire stock! Collected ₵16.00 cash (+₵11.00 net profit).'
      }
    ]
  }
];

export class JobSystem {
  private readonly economy: EconomyManager;
  private activeJobId: string | null = null;
  private status: JobLifecycleStatus = 'AVAILABLE';
  private currentStepIndex = 0;
  private completedJobCounts: Record<string, number> = {};

  private activeHustleId: string | null = null;
  private activeHustleStepIndex = 0;

  constructor(economy: EconomyManager) {
    this.economy = economy;
  }

  public getPersistedState(): PersistedJobState {
    return {
      activeJobId: this.activeJobId,
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      completedJobCounts: { ...this.completedJobCounts },
      activeHustleId: this.activeHustleId,
      activeHustleStepIndex: this.activeHustleStepIndex
    };
  }

  public hydrate(state: PersistedJobState | null | undefined): void {
    if (!state) return;
    this.activeJobId = state.activeJobId ?? null;
    this.status = state.status ?? 'AVAILABLE';
    this.currentStepIndex = Math.max(0, Number(state.currentStepIndex) || 0);
    this.completedJobCounts = state.completedJobCounts ? { ...state.completedJobCounts } : {};
    this.activeHustleId = state.activeHustleId ?? null;
    this.activeHustleStepIndex = Math.max(0, Number(state.activeHustleStepIndex) || 0);
  }

  public reset(): void {
    this.activeJobId = null;
    this.status = 'AVAILABLE';
    this.currentStepIndex = 0;
    this.completedJobCounts = {};
    this.activeHustleId = null;
    this.activeHustleStepIndex = 0;
  }

  public getActiveJob(): {
    job: LegalJobDefinition;
    status: JobLifecycleStatus;
    stepIndex: number;
    currentStep: WorkStepDefinition;
    totalSteps: number;
  } | null {
    if (!this.activeJobId) return null;
    const job = ACCRA_LEGAL_JOBS.find((j) => j.id === this.activeJobId);
    if (!job) return null;
    const step = job.steps[Math.min(this.currentStepIndex, job.steps.length - 1)];
    return {
      job,
      status: this.status,
      stepIndex: this.currentStepIndex,
      currentStep: step,
      totalSteps: job.steps.length
    };
  }

  public getActiveHustle(): {
    hustle: SideHustleDefinition;
    stepIndex: number;
    currentStep: WorkStepDefinition;
    totalSteps: number;
  } | null {
    if (!this.activeHustleId) return null;
    const hustle = ACCRA_SIDE_HUSTLES.find((h) => h.id === this.activeHustleId);
    if (!hustle) return null;
    const step = hustle.steps[Math.min(this.activeHustleStepIndex, hustle.steps.length - 1)];
    return {
      hustle,
      stepIndex: this.activeHustleStepIndex,
      currentStep: step,
      totalSteps: hustle.steps.length
    };
  }

  public getCompletedCount(id: string): number {
    return this.completedJobCounts[id] ?? 0;
  }

  public getActiveTargetInteractableId(): string | null {
    const activeJob = this.getActiveJob();
    if (activeJob) {
      return activeJob.currentStep.targetInteractableId;
    }
    const activeHustle = this.getActiveHustle();
    if (activeHustle) {
      return activeHustle.currentStep.targetInteractableId;
    }
    return null;
  }

  public acceptJob(jobId: string): { success: boolean; message: string } {
    const job = ACCRA_LEGAL_JOBS.find((j) => j.id === jobId);
    if (!job) {
      return { success: false, message: 'Job not found.' };
    }
    if (this.activeHustleId) {
      return {
        success: false,
        message: 'Finish or cancel your active side hustle before starting a shift.'
      };
    }
    if (this.activeJobId && this.activeJobId !== jobId) {
      return {
        success: false,
        message: 'You already have an active job shift in progress.'
      };
    }

    this.activeJobId = job.id;
    this.status = 'ACCEPTED';
    this.currentStepIndex = 0;
    this.economy.saveSnapshot();

    return {
      success: true,
      message: `Job Accepted: ${job.title} (Pay: ₵${job.payGHS.toFixed(2)}). Next: ${job.steps[0].instruction}`
    };
  }

  public startSideHustle(hustleId: string): { success: boolean; message: string } {
    const hustle = ACCRA_SIDE_HUSTLES.find((h) => h.id === hustleId);
    if (!hustle) {
      return { success: false, message: 'Side hustle not found.' };
    }
    if (this.activeJobId) {
      return {
        success: false,
        message: 'Complete or cancel your active job shift first.'
      };
    }
    if (this.activeHustleId) {
      return {
        success: false,
        message: 'You already have an active side hustle in progress.'
      };
    }

    if (hustle.upfrontCapitalGHS > 0) {
      if (!this.economy.canAfford(hustle.upfrontCapitalGHS, 'CASH')) {
        return {
          success: false,
          message: `Requires ₵${hustle.upfrontCapitalGHS.toFixed(2)} starting capital! Earn cash from an entry-level job or zero-capital errand first.`
        };
      }
      this.economy.spendForHustleCapital(
        hustle.upfrontCapitalGHS,
        `Wholesale stock for ${hustle.title}`
      );
    }

    this.activeHustleId = hustle.id;
    this.activeHustleStepIndex = 0;
    this.economy.saveSnapshot();

    return {
      success: true,
      message: `Hustle Started: ${hustle.title}. Next: ${hustle.steps[0].instruction}`
    };
  }

  public cancelActiveWork(): string {
    if (this.activeJobId) {
      const job = ACCRA_LEGAL_JOBS.find((j) => j.id === this.activeJobId);
      this.activeJobId = null;
      this.status = 'AVAILABLE';
      this.currentStepIndex = 0;
      this.economy.saveSnapshot();
      return `Cancelled shift: ${job?.title ?? 'Job'}.`;
    }
    if (this.activeHustleId) {
      const hustle = ACCRA_SIDE_HUSTLES.find((h) => h.id === this.activeHustleId);
      this.activeHustleId = null;
      this.activeHustleStepIndex = 0;
      this.economy.saveSnapshot();
      return `Cancelled side hustle: ${hustle?.title ?? 'Hustle'}.`;
    }
    return 'No active job or hustle to cancel.';
  }

  /**
   * Attempts to advance the active job or side hustle when the player interacts
   * with a world location or NPC matching the current step target.
   */
  public tryAdvanceAtInteractable(interactableId: string): {
    handled: boolean;
    completedWork: boolean;
    earnedGHS: number;
    message: string;
  } {
    const activeJob = this.getActiveJob();
    if (activeJob && activeJob.currentStep.targetInteractableId === interactableId) {
      const stepMsg = activeJob.currentStep.completionMessage;
      const nextIndex = this.currentStepIndex + 1;

      if (nextIndex < activeJob.job.steps.length) {
        this.status = 'WORKING';
        this.currentStepIndex = nextIndex;
        const nextStep = activeJob.job.steps[nextIndex];
        this.economy.saveSnapshot();
        return {
          handled: true,
          completedWork: false,
          earnedGHS: 0,
          message: `Step ${nextIndex}/${activeJob.totalSteps}: ${stepMsg} → Next: ${nextStep.instruction}`
        };
      }

      // Final step completed -> transition through COMPLETED -> PAID
      this.status = 'COMPLETED';
      const pay = activeJob.job.payGHS;
      this.economy.awardIncome({
        amountGHS: pay,
        category: 'JOB_PAYMENT',
        description: `${activeJob.job.title} (${activeJob.job.employerName})`,
        channel: 'CASH'
      });
      this.status = 'PAID';
      this.completedJobCounts[activeJob.job.id] =
        (this.completedJobCounts[activeJob.job.id] ?? 0) + 1;

      this.activeJobId = null;
      this.status = 'AVAILABLE';
      this.currentStepIndex = 0;
      this.economy.saveSnapshot();

      return {
        handled: true,
        completedWork: true,
        earnedGHS: pay,
        message: `${stepMsg} (+₵${pay.toFixed(2)} Cash Earned!)`
      };
    }

    const activeHustle = this.getActiveHustle();
    if (activeHustle && activeHustle.currentStep.targetInteractableId === interactableId) {
      const stepMsg = activeHustle.currentStep.completionMessage;
      const nextIndex = this.activeHustleStepIndex + 1;

      if (nextIndex < activeHustle.hustle.steps.length) {
        this.activeHustleStepIndex = nextIndex;
        const nextStep = activeHustle.hustle.steps[nextIndex];
        this.economy.saveSnapshot();
        return {
          handled: true,
          completedWork: false,
          earnedGHS: 0,
          message: `Hustle ${nextIndex}/${activeHustle.totalSteps}: ${stepMsg} → Next: ${nextStep.instruction}`
        };
      }

      const payout = activeHustle.hustle.grossPayoutGHS;
      this.economy.awardIncome({
        amountGHS: payout,
        category:
          activeHustle.hustle.upfrontCapitalGHS > 0 ? 'SALE' : 'SIDE_HUSTLE',
        description: activeHustle.hustle.title,
        channel: 'CASH'
      });
      this.completedJobCounts[activeHustle.hustle.id] =
        (this.completedJobCounts[activeHustle.hustle.id] ?? 0) + 1;

      this.activeHustleId = null;
      this.activeHustleStepIndex = 0;
      this.economy.saveSnapshot();

      return {
        handled: true,
        completedWork: true,
        earnedGHS: payout,
        message: `${stepMsg} (+₵${payout.toFixed(2)} Cash Received!)`
      };
    }

    return {
      handled: false,
      completedWork: false,
      earnedGHS: 0,
      message: ''
    };
  }
}
