/**
 * CHALÉ LIFE — Player Housing Progression & Compound Home System
 *
 * Implements meaningful housing progression from a humble 14 m² (3.5m × 4m)
 * Accra Single Room up to a Self-Contained, 1-Bedroom Apartment, Premium Apartment,
 * and Luxury House. Upgrades expand the physical 3D room, unlock indoor kitchen/bath
 * facilities, increase comfort & storage capacity, improve sleep/cooking recovery,
 * reduce passive fatigue, and grant social/prestige bonuses.
 */

export type HousingTierId =
  | 'single_room'
  | 'chamber_kitchen_bath'
  | 'self_contained'
  | 'one_bed_apartment'
  | 'premium_apartment'
  | 'luxury_house';

export interface HousingTierDef {
  id: HousingTierId;
  level: number;
  icon: string;
  title: string;
  shortLabel: string;
  sizeSqm: number;
  dimensionsLabel: string;
  /** Physical 3D room width (X) and depth (Z) in meters */
  roomWidthM: number;
  roomDepthM: number;
  costGHS: number;
  comfortBase: number;
  comfortLabel: string;
  maxFurnitureSlots: number;
  sleepEnergyRestore: number;
  cookCostGHS: number;
  cookHungerRestore: number;
  cookEnergyBonus: number;
  cookLabel: string;
  socialActionLabel: string;
  socialEnergyBonus: number;
  socialCashBonusGHS: number;
  fatigueReductionPct: number;
  jobPayoutBonusPct: number;
  gameFeel: string;
  includedFeatures: string[];
}

export const HOUSING_TIERS: readonly HousingTierDef[] = [
  {
    id: 'single_room',
    level: 1,
    icon: '🛏️',
    title: 'Single Room — Starter',
    shortLabel: '14 m² Single Room',
    sizeSqm: 14,
    dimensionsLabel: '4.0m × 3.5m (14 m²)',
    roomWidthM: 4.0,
    roomDepthM: 3.5,
    costGHS: 0,
    comfortBase: 28,
    comfortLabel: 'Low Comfort',
    maxFurnitureSlots: 4,
    sleepEnergyRestore: 55,
    cookCostGHS: 5,
    cookHungerRestore: 38,
    cookEnergyBonus: 4,
    cookLabel: 'Cook Basic Meal (₵5)',
    socialActionLabel: 'Tune Citi FM Radio (+8 Energy)',
    socialEnergyBonus: 8,
    socialCashBonusGHS: 0,
    fatigueReductionPct: 0,
    jobPayoutBonusPct: 0,
    gameFeel: 'Humble 3.5m × 4m Accra single room — enough space for your bed, small wardrobe, table, fan & camp stove.',
    includedFeatures: [
      'Bed',
      'Small wardrobe',
      'Fan',
      'Small table & radio',
      'Basic cooking setup',
      'Shared bathroom',
      'Low comfort'
    ]
  },
  {
    id: 'chamber_kitchen_bath',
    level: 2,
    icon: '🏠',
    title: 'Single Room + Kitchen/Bath',
    shortLabel: '25 m² Self-Contained Starter',
    sizeSqm: 25,
    dimensionsLabel: '5.2m × 4.8m (25 m²)',
    roomWidthM: 5.2,
    roomDepthM: 4.8,
    costGHS: 650,
    comfortBase: 48,
    comfortLabel: 'Better Comfort',
    maxFurnitureSlots: 6,
    sleepEnergyRestore: 72,
    cookCostGHS: 6,
    cookHungerRestore: 56,
    cookEnergyBonus: 10,
    cookLabel: 'Cook in Kitchenette (₵6)',
    socialActionLabel: 'Watch Black Stars on TV (+14 Energy)',
    socialEnergyBonus: 14,
    socialCashBonusGHS: 0,
    fatigueReductionPct: 12,
    jobPayoutBonusPct: 5,
    gameFeel: 'Comfortable starter upgrade with your own indoor bathroom and kitchenette.',
    includedFeatures: [
      'Better bed',
      'Private bathroom',
      'Kitchenette',
      'TV & stand',
      'Refrigerator nook',
      'Better comfort',
      'More storage (6 slots)'
    ]
  },
  {
    id: 'self_contained',
    level: 3,
    icon: '🏡',
    title: 'Self-Contained',
    shortLabel: '38 m² Self-Contained',
    sizeSqm: 38,
    dimensionsLabel: '6.2m × 5.0m (38 m²)',
    roomWidthM: 6.2,
    roomDepthM: 5.0,
    costGHS: 1600,
    comfortBase: 65,
    comfortLabel: 'Spacious Comfort',
    maxFurnitureSlots: 8,
    sleepEnergyRestore: 84,
    cookCostGHS: 6,
    cookHungerRestore: 68,
    cookEnergyBonus: 14,
    cookLabel: 'Cook Home Jollof (₵6)',
    socialActionLabel: 'Host Chale Linkup (+18 Energy, +₵15)',
    socialEnergyBonus: 18,
    socialCashBonusGHS: 15,
    fatigueReductionPct: 20,
    jobPayoutBonusPct: 10,
    gameFeel: 'Noticeably spacious self-contained unit with lounge area, fitted kitchen, and private bath.',
    includedFeatures: [
      'Queen bed & wardrobe',
      'Private tiled bathroom',
      'Fitted kitchen & fridge',
      'Lounge seating area',
      'Higher comfort',
      '8 storage slots'
    ]
  },
  {
    id: 'one_bed_apartment',
    level: 4,
    icon: '🏢',
    title: '1-Bedroom Apartment',
    shortLabel: '55 m² 1-Bed Apartment',
    sizeSqm: 55,
    dimensionsLabel: '7.2m × 5.2m (55 m²)',
    roomWidthM: 7.2,
    roomDepthM: 5.2,
    costGHS: 3600,
    comfortBase: 80,
    comfortLabel: 'High Comfort',
    maxFurnitureSlots: 10,
    sleepEnergyRestore: 94,
    cookCostGHS: 6,
    cookHungerRestore: 82,
    cookEnergyBonus: 20,
    cookLabel: 'Cook Full Feast (₵6)',
    socialActionLabel: 'Host Apartment Watch Party (+24 Energy, +₵30)',
    socialEnergyBonus: 24,
    socialCashBonusGHS: 30,
    fatigueReductionPct: 30,
    jobPayoutBonusPct: 18,
    gameFeel: 'Comfortable urban lifestyle with separate bedroom, living area, kitchen, and bathroom.',
    includedFeatures: [
      'Separate Bedroom',
      'Dedicated Living area',
      'Full Kitchen',
      'Private Bathroom',
      'Better furniture',
      'Higher comfort',
      'Social hosting unlocked'
    ]
  },
  {
    id: 'premium_apartment',
    level: 5,
    icon: '🏙️',
    title: 'Premium Apartment',
    shortLabel: '80 m² Premium Apartment',
    sizeSqm: 80,
    dimensionsLabel: '8.0m × 5.4m (80 m²)',
    roomWidthM: 8.0,
    roomDepthM: 5.4,
    costGHS: 7800,
    comfortBase: 92,
    comfortLabel: 'Premium Lifestyle',
    maxFurnitureSlots: 12,
    sleepEnergyRestore: 100,
    cookCostGHS: 5,
    cookHungerRestore: 95,
    cookEnergyBonus: 25,
    cookLabel: 'Chef Kitchen Meal (₵5)',
    socialActionLabel: 'Host Osu VIP Mixer (+30 Energy, +₵60)',
    socialEnergyBonus: 30,
    socialCashBonusGHS: 60,
    fatigueReductionPct: 40,
    jobPayoutBonusPct: 28,
    gameFeel: 'High-end Accra apartment with multiple rooms, modern appliances, entertainment & prestige.',
    includedFeatures: [
      'Multiple rooms',
      'Better appliances',
      'Entertainment suite',
      'Higher prestige (+28% pay)',
      'Hosting/social benefits',
      'Full 12 slots'
    ]
  },
  {
    id: 'luxury_house',
    level: 6,
    icon: '🌴',
    title: 'Luxury House',
    shortLabel: '140 m² Luxury House',
    sizeSqm: 140,
    dimensionsLabel: '8.8m × 5.6m (140 m² Villa)',
    roomWidthM: 8.8,
    roomDepthM: 5.6,
    costGHS: 16000,
    comfortBase: 100,
    comfortLabel: 'East Legon Status',
    maxFurnitureSlots: 12,
    sleepEnergyRestore: 100,
    cookCostGHS: 0,
    cookHungerRestore: 100,
    cookEnergyBonus: 35,
    cookLabel: 'Private Kitchen Feast (Free)',
    socialActionLabel: 'Host Big Man Compound Party (+40 Energy, +₵120)',
    socialEnergyBonus: 40,
    socialCashBonusGHS: 120,
    fatigueReductionPct: 50,
    jobPayoutBonusPct: 40,
    gameFeel: 'End-game East Legon status villa — marble floors, backup power, maximum comfort & prestige.',
    includedFeatures: [
      'Executive multi-room villa',
      'Marble floors & gold trim',
      'Full entertainment & bar',
      'Maximum prestige (+40% pay)',
      'Big Man hosting rewards'
    ]
  }
] as const;

export type FurnitureId =
  | 'plastic_chair'
  | 'wooden_stool'
  | 'plastic_table'
  | 'sofa'
  | 'tv'
  | 'fridge'
  | 'bed'
  | 'kente_cloth'
  | 'sound_box'
  | 'generator'
  | 'flower_pots'
  | 'rug';

export interface FurnitureItem {
  id: FurnitureId;
  title: string;
  costGHS: number;
  flexPoints: number;
  comfortBonus: number;
  /** Slot index within zone */
  slot: number;
  /** courtyard = outside; interior = inside the room */
  zone: 'courtyard' | 'interior';
  blurb: string;
}

export const FURNITURE_CATALOG: FurnitureItem[] = [
  {
    id: 'plastic_chair',
    title: 'Plastic Chair',
    costGHS: 25,
    flexPoints: 4,
    comfortBonus: 2,
    slot: 0,
    zone: 'courtyard',
    blurb: 'Extra veranda seating for guests.'
  },
  {
    id: 'wooden_stool',
    title: 'Carved Wooden Stool',
    costGHS: 40,
    flexPoints: 5,
    comfortBonus: 2,
    slot: 1,
    zone: 'courtyard',
    blurb: 'Traditional Ashanti-style courtyard stool.'
  },
  {
    id: 'plastic_table',
    title: 'Veranda Table',
    costGHS: 80,
    flexPoints: 8,
    comfortBonus: 3,
    slot: 2,
    zone: 'courtyard',
    blurb: 'Waakye and cold drinks on the porch.'
  },
  {
    id: 'flower_pots',
    title: 'Terracotta Planters',
    costGHS: 35,
    flexPoints: 6,
    comfortBonus: 3,
    slot: 3,
    zone: 'courtyard',
    blurb: 'Greenery that cools the veranda.'
  },
  {
    id: 'rug',
    title: 'Woven Floor Rug',
    costGHS: 120,
    flexPoints: 12,
    comfortBonus: 5,
    slot: 4,
    zone: 'interior',
    blurb: 'Warm woven rug underfoot inside.'
  },
  {
    id: 'kente_cloth',
    title: 'Kente Wall Tapestry',
    costGHS: 150,
    flexPoints: 18,
    comfortBonus: 6,
    slot: 5,
    zone: 'interior',
    blurb: 'Authentic gold-and-green weave on the wall.'
  },
  {
    id: 'sofa',
    title: '2-Seater Lounge Sofa',
    costGHS: 350,
    flexPoints: 28,
    comfortBonus: 10,
    slot: 0,
    zone: 'interior',
    blurb: 'Proper cushioned sofa (+10% Comfort).'
  },
  {
    id: 'bed',
    title: 'Orthopedic Queen Bed',
    costGHS: 400,
    flexPoints: 30,
    comfortBonus: 12,
    slot: 1,
    zone: 'interior',
    blurb: 'Upgraded deep-sleep mattress (+20 Sleep Energy).'
  },
  {
    id: 'tv',
    title: 'Flatscreen TV + Stand',
    costGHS: 500,
    flexPoints: 35,
    comfortBonus: 10,
    slot: 2,
    zone: 'interior',
    blurb: 'Match day & movie nights at home.'
  },
  {
    id: 'fridge',
    title: 'Double-Door Fridge',
    costGHS: 800,
    flexPoints: 42,
    comfortBonus: 12,
    slot: 3,
    zone: 'interior',
    blurb: 'Cold water, fresh stews & extra storage.'
  },
  {
    id: 'sound_box',
    title: 'Highlife Hi-Fi System',
    costGHS: 600,
    flexPoints: 38,
    comfortBonus: 9,
    slot: 4,
    zone: 'interior',
    blurb: 'Rich bass for hosting friends.'
  },
  {
    id: 'generator',
    title: 'Backup Generator',
    costGHS: 1200,
    flexPoints: 55,
    comfortBonus: 15,
    slot: 5,
    zone: 'courtyard',
    blurb: 'Zero Dumsor stress when ECG goes off.'
  }
];

const STORAGE_KEY = 'chale_life_home_v2';
const LEGACY_STORAGE_KEY = 'chale_life_home_v1';
const MAX_FURN_FLEX = FURNITURE_CATALOG.reduce((s, f) => s + f.flexPoints, 0);

export interface HomeState {
  housingTier: HousingTierId;
  unlockedTiers: HousingTierId[];
  owned: FurnitureId[];
}

export type HomeListener = (state: HomeState) => void;

export class HomeSystem {
  private housingTier: HousingTierId = 'single_room';
  private unlockedTiers = new Set<HousingTierId>(['single_room']);
  private owned = new Set<FurnitureId>();
  private listeners = new Set<HomeListener>();
  private lastSocialAtMs = 0;

  constructor() {
    this.load();
  }

  public getHousingTier(): HousingTierDef {
    return (
      HOUSING_TIERS.find((t) => t.id === this.housingTier) ?? HOUSING_TIERS[0]
    );
  }

  public getHousingTierId(): HousingTierId {
    return this.housingTier;
  }

  public isTierUnlocked(id: HousingTierId): boolean {
    return this.unlockedTiers.has(id);
  }

  public getOwned(): FurnitureId[] {
    return [...this.owned];
  }

  public owns(id: FurnitureId): boolean {
    return this.owned.has(id);
  }

  public getUsedSlotsCount(): number {
    return this.owned.size;
  }

  public getMaxSlotsCount(): number {
    return this.getHousingTier().maxFurnitureSlots;
  }

  public getComfortScore(): number {
    const tier = this.getHousingTier();
    let bonus = 0;
    for (const id of this.owned) {
      const item = FURNITURE_CATALOG.find((f) => f.id === id);
      if (item) bonus += item.comfortBonus;
    }
    return Math.min(100, tier.comfortBase + Math.round(bonus * 0.6));
  }

  public getFlexScore(): number {
    const tier = this.getHousingTier();
    const tierFlex = (tier.level - 1) * 14;
    let furnPts = 0;
    for (const id of this.owned) {
      const item = FURNITURE_CATALOG.find((f) => f.id === id);
      if (item) furnPts += item.flexPoints;
    }
    const furnScaled = Math.round((furnPts / MAX_FURN_FLEX) * 45);
    return Math.min(100, tierFlex + furnScaled);
  }

  public getFlexLabel(): string {
    const tier = this.getHousingTier();
    return `${tier.shortLabel} · ${tier.comfortLabel}`;
  }

  public getFlexShareLine(displayName = 'Chale'): string {
    const tier = this.getHousingTier();
    return `${displayName}'s ${tier.shortLabel} (${tier.sizeSqm} m²) · Comfort ${this.getComfortScore()}% · Flex ${this.getFlexScore()} · #ChaleLife`;
  }

  public getSocialCooldownSeconds(): number {
    const elapsed = (Date.now() - this.lastSocialAtMs) / 1000;
    return Math.max(0, Math.ceil(25 - elapsed));
  }

  public markSocialUsed(): void {
    this.lastSocialAtMs = Date.now();
  }

  public upgradeHousing(
    targetTierId: HousingTierId,
    canAfford: (cost: number) => boolean,
    spend: (cost: number, title: string) => boolean
  ): { success: boolean; message: string; tier: HousingTierDef } {
    const target = HOUSING_TIERS.find((t) => t.id === targetTierId);
    if (!target) {
      return {
        success: false,
        message: 'Unknown housing tier.',
        tier: this.getHousingTier()
      };
    }

    if (this.unlockedTiers.has(targetTierId)) {
      this.housingTier = targetTierId;
      this.persist();
      this.notify();
      return {
        success: true,
        message: `Switched to ${target.icon} ${target.shortLabel} (${target.sizeSqm} m²)`,
        tier: target
      };
    }

    if (!canAfford(target.costGHS)) {
      return {
        success: false,
        message: `Need ₵${target.costGHS.toLocaleString()} to upgrade to ${target.shortLabel}.`,
        tier: this.getHousingTier()
      };
    }

    if (!spend(target.costGHS, `Housing Upgrade: ${target.shortLabel}`)) {
      return {
        success: false,
        message: 'Payment could not be completed.',
        tier: this.getHousingTier()
      };
    }

    this.unlockedTiers.add(targetTierId);
    this.housingTier = targetTierId;
    this.persist();
    this.notify();
    return {
      success: true,
      message: `Upgraded to ${target.icon} ${target.title} (${target.sizeSqm} m²)!`,
      tier: target
    };
  }

  public buy(
    id: FurnitureId,
    canAfford: (cost: number) => boolean,
    spend: (cost: number, title: string) => boolean
  ): { success: boolean; message: string } {
    const item = FURNITURE_CATALOG.find((f) => f.id === id);
    if (!item) return { success: false, message: 'Unknown item.' };
    if (this.owned.has(id)) return { success: false, message: 'Already own this.' };

    const maxSlots = this.getMaxSlotsCount();
    if (this.owned.size >= maxSlots) {
      return {
        success: false,
        message: `Room storage full (${this.owned.size}/${maxSlots} slots in ${this.getHousingTier().shortLabel}). Upgrade your room for more space!`
      };
    }

    if (!canAfford(item.costGHS)) {
      return { success: false, message: `Need ₵${item.costGHS}` };
    }
    if (!spend(item.costGHS, item.title)) {
      return { success: false, message: 'Payment failed.' };
    }
    this.owned.add(id);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${item.title} added · Comfort ${this.getComfortScore()}%`
    };
  }

  public onUpdate(listener: HomeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state: HomeState = {
      housingTier: this.housingTier,
      unlockedTiers: [...this.unlockedTiers],
      owned: this.getOwned()
    };
    for (const l of this.listeners) l(state);
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          housingTier: this.housingTier,
          unlockedTiers: [...this.unlockedTiers],
          owned: this.getOwned()
        })
      );
    } catch {
      /* ignore */
    }
  }

  private load(): void {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<HomeState>;
      if (
        data.housingTier &&
        HOUSING_TIERS.some((t) => t.id === data.housingTier)
      ) {
        this.housingTier = data.housingTier;
        this.unlockedTiers.add(data.housingTier);
      }
      if (Array.isArray(data.unlockedTiers)) {
        for (const tid of data.unlockedTiers) {
          if (HOUSING_TIERS.some((t) => t.id === tid)) {
            this.unlockedTiers.add(tid);
          }
        }
      }
      if (Array.isArray(data.owned)) {
        for (const id of data.owned) {
          if (FURNITURE_CATALOG.some((f) => f.id === id)) this.owned.add(id);
        }
      }
    } catch {
      /* ignore */
    }
  }
}
