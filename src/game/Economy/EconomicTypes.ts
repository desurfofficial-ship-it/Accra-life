export type CurrencyCode = 'GHS';

export type PaymentChannel = 'CASH' | 'MOMO_WALLET' | 'BANK';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type TransactionCategory =
  | 'WAGES'
  | 'JOB_PAYMENT'
  | 'SIDE_HUSTLE'
  | 'SALE'
  | 'REWARD'
  | 'RISKY_HUSTLE'
  | 'FOOD'
  | 'TRANSPORT'
  | 'PURCHASE'
  | 'FINE'
  | 'CONFISCATION';

export type EconomicProgressionLevel =
  | 'LEVEL_1_SURVIVAL'
  | 'LEVEL_2_STABILITY'
  | 'LEVEL_3_IMPROVEMENT'
  | 'LEVEL_4_PROSPERITY'
  | 'LEVEL_5_WEALTH';

export interface EconomicProgressionInfo {
  level: EconomicProgressionLevel;
  rankNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  minLifetimeEarnedGHS: number;
}

export const ECONOMIC_PROGRESSION_TIERS: Record<
  EconomicProgressionLevel,
  EconomicProgressionInfo
> = {
  LEVEL_1_SURVIVAL: {
    level: 'LEVEL_1_SURVIVAL',
    rankNumber: 1,
    title: 'Level 1 · Survival',
    description: 'Starting from ₵0 in Accra — finding your first daily work and hustles.',
    minLifetimeEarnedGHS: 0
  },
  LEVEL_2_STABILITY: {
    level: 'LEVEL_2_STABILITY',
    rankNumber: 2,
    title: 'Level 2 · Stability',
    description: 'Consistent neighborhood earnings and reliable daily cash flow.',
    minLifetimeEarnedGHS: 60
  },
  LEVEL_3_IMPROVEMENT: {
    level: 'LEVEL_3_IMPROVEMENT',
    rankNumber: 3,
    title: 'Level 3 · Improvement',
    description: 'Saving toward your first meaningful possessions and room upgrades.',
    minLifetimeEarnedGHS: 180
  },
  LEVEL_4_PROSPERITY: {
    level: 'LEVEL_4_PROSPERITY',
    rankNumber: 4,
    title: 'Level 4 · Prosperity',
    description: 'Higher-paying opportunities and small enterprise foundations.',
    minLifetimeEarnedGHS: 500
  },
  LEVEL_5_WEALTH: {
    level: 'LEVEL_5_WEALTH',
    rankNumber: 5,
    title: 'Level 5 · Wealth',
    description: 'Ready for property, vehicles, businesses, and investments across Ghana.',
    minLifetimeEarnedGHS: 1500
  }
};

/**
 * Conceptually separate asset ownership registries for Phase 4+ expansion.
 * Kept distinct from cash/wallet balance so assets are never reduced to wallet numbers.
 */
export interface PlayerOwnershipFoundations {
  clothingIds: string[];
  phoneId: string;
  ownedFurnitureIds: string[];
  ownedItemIds: string[];
  vehicleIds: string[];
  propertyIds: string[];
  businessIds: string[];
  farmIds: string[];
  investmentIds: string[];
}

export function createInitialOwnershipFoundations(): PlayerOwnershipFoundations {
  return {
    clothingIds: ['starter_accra_streetwear_01'],
    phoneId: 'basic_handset_01',
    ownedFurnitureIds: [],
    ownedItemIds: [],
    vehicleIds: [],
    propertyIds: [],
    businessIds: [],
    farmIds: [],
    investmentIds: []
  };
}

export function formatGHS(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}₵${Math.abs(safe).toFixed(2)}`;
}

export function formatSignedGHS(delta: number): string {
  const safe = Number.isFinite(delta) ? delta : 0;
  const prefix = safe >= 0 ? '+' : '−';
  return `${prefix}₵${Math.abs(safe).toFixed(2)}`;
}
