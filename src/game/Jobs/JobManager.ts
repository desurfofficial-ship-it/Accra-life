import { EconomyManager } from '../Economy/EconomyManager';
import { PersistedJobState } from '../Economy/EconomyPersistence';
import {
  ACCRA_LEGAL_JOBS,
  ACCRA_SIDE_HUSTLES,
  getLegalJobById,
  getSideHustleById,
  JobLifecycleStatus,
  LegalJobDefinition,
  SideHustleDefinition,
  WorkStepDefinition
} from './JobRegistry';

export class JobManager {
  private readonly economy: EconomyManager;
  private activeJobId: string | null = null;
  private status: JobLifecycleStatus = 'AVAILABLE';
  private currentStepIndex = 0;
  private completedJobCounts: Record<string, number> = {};

  private activeHustleId: string | null = null;
  private activeHustleStepIndex = 0;
  private completedStepIds: Set<string> = new Set();

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
    this.completedStepIds.clear();
    // Rebuild step progress so mid-shift refresh can still pay out
    if (this.activeJobId) {
      const job = getLegalJobById(this.activeJobId);
      if (job) {
        for (let i = 0; i < this.currentStepIndex && i < job.steps.length; i++) {
          this.completedStepIds.add(job.steps[i].stepId);
        }
      }
    }
    if (this.activeHustleId) {
      const hustle = getSideHustleById(this.activeHustleId);
      if (hustle) {
        for (let i = 0; i < this.activeHustleStepIndex && i < hustle.steps.length; i++) {
          this.completedStepIds.add(hustle.steps[i].stepId);
        }
      }
    }
  }

  public reset(): void {
    this.activeJobId = null;
    this.status = 'AVAILABLE';
    this.currentStepIndex = 0;
    this.completedJobCounts = {};
    this.activeHustleId = null;
    this.activeHustleStepIndex = 0;
    this.completedStepIds.clear();
  }

  public getActiveJob(): {
    job: LegalJobDefinition;
    status: JobLifecycleStatus;
    stepIndex: number;
    currentStep: WorkStepDefinition;
    totalSteps: number;
  } | null {
    if (!this.activeJobId) return null;
    const job = getLegalJobById(this.activeJobId);
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
    const hustle = getSideHustleById(this.activeHustleId);
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

  public getAvailableJobs(
    focusedInteractableId?: string | null
  ): ReadonlyArray<LegalJobDefinition> {
    if (!focusedInteractableId) {
      return ACCRA_LEGAL_JOBS;
    }
    return [...ACCRA_LEGAL_JOBS].sort((a, b) => {
      const aMatch = a.startInteractableId === focusedInteractableId ? 0 : 1;
      const bMatch = b.startInteractableId === focusedInteractableId ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  public getAvailableSideHustles(
    focusedInteractableId?: string | null
  ): ReadonlyArray<SideHustleDefinition> {
    if (!focusedInteractableId) {
      return ACCRA_SIDE_HUSTLES;
    }
    return [...ACCRA_SIDE_HUSTLES].sort((a, b) => {
      const aMatch = a.startInteractableId === focusedInteractableId ? 0 : 1;
      const bMatch = b.startInteractableId === focusedInteractableId ? 0 : 1;
      return aMatch - bMatch;
    });
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
    const job = getLegalJobById(jobId);
    if (!job) {
      return { success: false, message: 'Job not found in registry.' };
    }
    if (this.activeHustleId) {
      return {
        success: false,
        message: 'Finish or cancel your active side hustle before starting a job shift.'
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
    this.completedStepIds.clear();
    this.economy.saveSnapshot();

    return {
      success: true,
      message: `Job Accepted: ${job.title} (Pay: ₵${job.payGHS.toFixed(2)}). Step 1/${job.steps.length}: ${job.steps[0].instruction}`
    };
  }

  public startSideHustle(hustleId: string): { success: boolean; message: string } {
    const hustle = getSideHustleById(hustleId);
    if (!hustle) {
      return { success: false, message: 'Side hustle not found in registry.' };
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
      const debitTx = this.economy.spendForHustleCapital(
        hustle.upfrontCapitalGHS,
        `Wholesale stock for ${hustle.title}`
      );
      if (!debitTx) {
        return {
          success: false,
          message: 'Could not deduct starting capital from wallet.'
        };
      }
    }

    this.activeHustleId = hustle.id;
    this.activeHustleStepIndex = 0;
    this.completedStepIds.clear();
    this.economy.saveSnapshot();

    return {
      success: true,
      message: `Hustle Started: ${hustle.title}. Step 1/${hustle.steps.length}: ${hustle.steps[0].instruction}`
    };
  }

  public cancelActiveWork(): string {
    if (this.activeJobId) {
      const job = ACCRA_LEGAL_JOBS.find((j) => j.id === this.activeJobId);
      this.activeJobId = null;
      this.status = 'AVAILABLE';
      this.currentStepIndex = 0;
      this.completedStepIds.clear();
      this.economy.saveSnapshot();
      return `Cancelled job shift: ${job?.title ?? 'Job'}.`;
    }
    if (this.activeHustleId) {
      const hustle = ACCRA_SIDE_HUSTLES.find((h) => h.id === this.activeHustleId);
      this.activeHustleId = null;
      this.activeHustleStepIndex = 0;
      this.completedStepIds.clear();
      this.economy.saveSnapshot();
      return `Cancelled side hustle: ${hustle?.title ?? 'Hustle'}.`;
    }
    return 'No active job or hustle to cancel.';
  }

  public tryAdvanceAtInteractable(
    interactableId: string,
    assetId?: string
  ): {
    handled: boolean;
    completedWork: boolean;
    earnedGHS: number;
    message: string;
  } {
    const activeJob = this.getActiveJob();
    if (activeJob && activeJob.currentStep.targetInteractableId === interactableId) {
      if (assetId && activeJob.currentStep.requiredAssetId !== assetId) {
        return {
          handled: false,
          completedWork: false,
          earnedGHS: 0,
          message: ''
        };
      }

      this.completedStepIds.add(activeJob.currentStep.stepId);
      const stepMsg = activeJob.currentStep.completionMessage;
      const nextIndex = this.currentStepIndex + 1;

      if (nextIndex < activeJob.job.steps.length) {
        this.status = 'WORKING';
        this.currentStepIndex = nextIndex;
        this.economy.saveSnapshot();
        return {
          handled: true,
          completedWork: false,
          earnedGHS: 0,
          message: `Step ${nextIndex}/${activeJob.totalSteps}: ${stepMsg}`
        };
      }

      const allStepsVerified = activeJob.job.steps.every((s) =>
        this.completedStepIds.has(s.stepId)
      );
      if (!allStepsVerified && activeJob.job.steps.length > 1) {
        if (this.currentStepIndex !== activeJob.job.steps.length - 1) {
          return {
            handled: false,
            completedWork: false,
            earnedGHS: 0,
            message: ''
          };
        }
      }

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
      this.completedStepIds.clear();
      this.economy.saveSnapshot();

      return {
        handled: true,
        completedWork: true,
        earnedGHS: pay,
        message: `${stepMsg} (+₵${pay.toFixed(2)} Cash Paid!)`
      };
    }

    const activeHustle = this.getActiveHustle();
    if (activeHustle && activeHustle.currentStep.targetInteractableId === interactableId) {
      if (assetId && activeHustle.currentStep.requiredAssetId !== assetId) {
        return {
          handled: false,
          completedWork: false,
          earnedGHS: 0,
          message: ''
        };
      }

      this.completedStepIds.add(activeHustle.currentStep.stepId);
      const stepMsg = activeHustle.currentStep.completionMessage;
      const nextIndex = this.activeHustleStepIndex + 1;

      if (nextIndex < activeHustle.hustle.steps.length) {
        this.activeHustleStepIndex = nextIndex;
        this.economy.saveSnapshot();
        return {
          handled: true,
          completedWork: false,
          earnedGHS: 0,
          message: `Hustle Step ${nextIndex}/${activeHustle.totalSteps}: ${stepMsg}`
        };
      }

      const payout = activeHustle.hustle.grossPayoutGHS;
      this.economy.awardIncome({
        amountGHS: payout,
        category: activeHustle.hustle.upfrontCapitalGHS > 0 ? 'SALE' : 'SIDE_HUSTLE',
        description: activeHustle.hustle.title,
        channel: 'CASH'
      });
      this.completedJobCounts[activeHustle.hustle.id] =
        (this.completedJobCounts[activeHustle.hustle.id] ?? 0) + 1;

      this.activeHustleId = null;
      this.activeHustleStepIndex = 0;
      this.completedStepIds.clear();
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
