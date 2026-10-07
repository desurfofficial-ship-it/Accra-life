import {
  createInitialOwnershipFoundations,
  ECONOMIC_PROGRESSION_TIERS,
  EconomicProgressionInfo,
  EconomicProgressionLevel,
  PaymentChannel,
  PlayerOwnershipFoundations,
  TransactionCategory
} from './EconomicTypes';
import {
  EconomyPersistence,
  PersistedCrimeState,
  PersistedJobState,
  PersistedTrotroState
} from './EconomyPersistence';
import { TransactionRecord } from './Transaction';
import { Wallet } from './Wallet';

export interface EverydayExpenseOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly costGHS: number;
  readonly category: TransactionCategory;
  readonly locationAssetId: string;
  readonly interactableId: string;
  readonly grantOwnedItemId?: string;
}

export const ACCRA_EVERYDAY_EXPENSES: Record<string, EverydayExpenseOption> = {
  EXP_WAAKYE_MEAL: {
    id: 'EXP_WAAKYE_MEAL',
    title: 'Hot Waakye, Plantain & Shito Pack',
    description: 'Fresh roadside Waakye wrapped in katemfe leaves from Sister Akosua’s Joint.',
    costGHS: 12.0,
    category: 'FOOD',
    locationAssetId: 'ACC_RESTAURANT_001',
    interactableId: 'food_vendor'
  },
  EXP_TROTRO_FARE: {
    id: 'EXP_TROTRO_FARE',
    title: 'Osu – Circle Trotro Fare',
    description: 'Pay the trotro mate for a commercial minibus trip along the Osu–Circle route.',
    costGHS: 5.0,
    category: 'TRANSPORT',
    locationAssetId: 'ACC_PROP_001',
    interactableId: 'trotro_stop',
    grantOwnedItemId: 'trotro_ticket_osu_circle'
  },
  EXP_PROVISION_BUNDLE: {
    id: 'EXP_PROVISION_BUNDLE',
    title: 'Cold Voltic Water & Prepaid Airtime',
    description: 'Everyday neighborhood essentials from Adabraka Provision Store.',
    costGHS: 5.0,
    category: 'PURCHASE',
    locationAssetId: 'ACC_SHOP_001',
    interactableId: 'provision_shop',
    grantOwnedItemId: 'everyday_water_airtime_pack'
  }
};

export type EconomyUpdateListener = () => void;

export class EconomyManager {
  public readonly wallet: Wallet;
  private progressionLevel: EconomicProgressionLevel = 'LEVEL_1_SURVIVAL';
  private ownership: PlayerOwnershipFoundations = createInitialOwnershipFoundations();
  private listeners: Set<EconomyUpdateListener> = new Set();

  private externalJobStateGetter: (() => PersistedJobState) | null = null;
  private externalCrimeStateGetter: (() => PersistedCrimeState) | null = null;

  /** Optional trotro seat-state provider/hydrator (bound by the host). */
  private trotroStateGetter: (() => PersistedTrotroState) | null = null;
  private trotroHydrator: ((currentPassengers: number) => void) | null = null;

  constructor() {
    this.wallet = new Wallet();
    this.wallet.onBalanceChange(() => {
      this.recomputeProgressionTier();
      this.saveSnapshot();
      this.notifyListeners();
    });
  }

  public bindExternalStateProviders(
    getJobState: () => PersistedJobState,
    getCrimeState: () => PersistedCrimeState
  ): void {
    this.externalJobStateGetter = getJobState;
    this.externalCrimeStateGetter = getCrimeState;
  }

  /**
   * Persist ACC_TROTRO_001 seat counts inside the economy snapshot.
   * `get` samples the live TrotroService on every saveSnapshot; `apply`
   * restores the passenger count on loadFromPersistence.
   */
  public bindTrotroPassengerState(
    get: () => PersistedTrotroState,
    apply?: (currentPassengers: number) => void
  ): void {
    this.trotroStateGetter = get;
    this.trotroHydrator = apply ?? null;
  }

  public getProgressionInfo(): EconomicProgressionInfo {
    return ECONOMIC_PROGRESSION_TIERS[this.progressionLevel];
  }

  public getOwnershipFoundations(): Readonly<PlayerOwnershipFoundations> {
    return this.ownership;
  }

  public canAfford(amountGHS: number, channel: PaymentChannel = 'CASH'): boolean {
    return this.wallet.canAfford(amountGHS, channel);
  }

  public awardIncome(params: {
    amountGHS: number;
    category: TransactionCategory;
    description: string;
    channel?: PaymentChannel;
    isIllegalOrigin?: boolean;
  }): TransactionRecord | null {
    return this.wallet.receiveMoney({
      amount: params.amountGHS,
      category: params.category,
      description: params.description,
      channel: params.channel ?? 'CASH',
      isIllegalOrigin: params.isIllegalOrigin ?? false
    });
  }

  public purchaseEverydayExpense(expenseId: string, options?: {
    /** v4.9: surge override — the RUSH_HOUR door price (base × 1.5).
     * Keeps the expense's category + ticket grant; only the debit moves. */
    amountGHS?: number;
  }): {
    success: boolean;
    message: string;
    transaction: TransactionRecord | null;
  } {
    const item = ACCRA_EVERYDAY_EXPENSES[expenseId];
    if (!item) {
      return { success: false, message: 'Unknown expense item.', transaction: null };
    }
    const amountDue = options?.amountGHS ?? item.costGHS;

    if (!this.wallet.canAfford(amountDue, 'CASH')) {
      return {
        success: false,
        message: `Not enough cash for ${item.title} (Requires ₵${amountDue.toFixed(2)}). Take a job or hustle first!`,
        transaction: null
      };
    }

    const tx = this.wallet.spendMoney({
      amount: amountDue,
      category: item.category,
      description: options?.amountGHS !== undefined && options.amountGHS !== item.costGHS
        ? `${item.title} (surged door fare)`
        : item.title,
      channel: 'CASH'
    });

    if (!tx) {
      return { success: false, message: 'Transaction could not be completed.', transaction: null };
    }

    if (item.grantOwnedItemId && !this.ownership.ownedItemIds.includes(item.grantOwnedItemId)) {
      this.ownership.ownedItemIds.push(item.grantOwnedItemId);
    }

    this.saveSnapshot();
    this.notifyListeners();

    return {
      success: true,
      message: `Purchased ${item.title} (−₵${item.costGHS.toFixed(2)}).`,
      transaction: tx
    };
  }

  public spendForHustleCapital(
    amountGHS: number,
    description: string
  ): TransactionRecord | null {
    return this.wallet.spendMoney({
      amount: amountGHS,
      category: 'PURCHASE',
      description,
      channel: 'CASH'
    });
  }

  public onUpdate(listener: EconomyUpdateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public saveSnapshot(): void {
    const base = EconomyPersistence.createDefaultSnapshot();
    const snapshot = {
      ...base,
      savedAt: Date.now(),
      wallet: this.wallet.serialize(),
      progressionLevel: this.progressionLevel,
      ownership: {
        clothingIds: [...this.ownership.clothingIds],
        phoneId: this.ownership.phoneId,
        ownedFurnitureIds: [...this.ownership.ownedFurnitureIds],
        ownedItemIds: [...this.ownership.ownedItemIds],
        vehicleIds: [...this.ownership.vehicleIds],
        propertyIds: [...this.ownership.propertyIds],
        businessIds: [...this.ownership.businessIds],
        farmIds: [...this.ownership.farmIds],
        investmentIds: [...this.ownership.investmentIds]
      },
      jobs: this.externalJobStateGetter ? this.externalJobStateGetter() : base.jobs,
      crime: this.externalCrimeStateGetter ? this.externalCrimeStateGetter() : base.crime,
      ...(this.trotroStateGetter ? { trotro: this.trotroStateGetter() } : {})
    };
    EconomyPersistence.saveLocal(snapshot);
  }

  public loadFromPersistence(): {
    jobs: PersistedJobState | null;
    crime: PersistedCrimeState | null;
  } {
    const saved = EconomyPersistence.loadLocal();
    if (!saved) {
      return { jobs: null, crime: null };
    }

    if (saved.ownership) {
      this.ownership = {
        ...createInitialOwnershipFoundations(),
        ...saved.ownership
      };
    }
    this.wallet.hydrate(saved.wallet);
    if (saved.trotro && this.trotroHydrator) {
      this.trotroHydrator(saved.trotro.currentPassengers);
    }
    this.recomputeProgressionTier();
    this.notifyListeners();

    return {
      jobs: saved.jobs ?? null,
      crime: saved.crime ?? null
    };
  }

  public resetAllProgressToZero(): void {
    EconomyPersistence.clearLocal();
    this.ownership = createInitialOwnershipFoundations();
    this.progressionLevel = 'LEVEL_1_SURVIVAL';
    this.wallet.resetToZero();
    this.saveSnapshot();
    this.notifyListeners();
  }

  private recomputeProgressionTier(): void {
    const earned = this.wallet.getLifetimeEarned();
    if (earned >= ECONOMIC_PROGRESSION_TIERS.LEVEL_5_WEALTH.minLifetimeEarnedGHS) {
      this.progressionLevel = 'LEVEL_5_WEALTH';
    } else if (earned >= ECONOMIC_PROGRESSION_TIERS.LEVEL_4_PROSPERITY.minLifetimeEarnedGHS) {
      this.progressionLevel = 'LEVEL_4_PROSPERITY';
    } else if (earned >= ECONOMIC_PROGRESSION_TIERS.LEVEL_3_IMPROVEMENT.minLifetimeEarnedGHS) {
      this.progressionLevel = 'LEVEL_3_IMPROVEMENT';
    } else if (earned >= ECONOMIC_PROGRESSION_TIERS.LEVEL_2_STABILITY.minLifetimeEarnedGHS) {
      this.progressionLevel = 'LEVEL_2_STABILITY';
    } else {
      this.progressionLevel = 'LEVEL_1_SURVIVAL';
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
