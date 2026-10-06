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
  | 'rug'
  // ── Phase-1 housing-catalog expansion (placed-furniture engine) ──
  | 'bed_basic'        // single-bed frame
  | 'chair_plastic'    // monobloc plastic chair (Ghanaian staple)
  | 'chair_wooden'    // carved wooden chair
  | 'table_small'      // small wooden table
  | 'table_dining'     // dining table
  | 'sofa_basic'       // 2-seater basic sofa
  | 'tv_basic'         // flatscreen TV
  | 'fridge_basic'     // single-door fridge
  | 'cooker_gas'       // 2-burner gas cooker (Ghanaian-style)
  | 'toilet_basic'     // squat toilet
  | 'shower_basic'     // bucket shower
  | 'fan_standing'     // standing fan
  | 'wardrobe_basic';  // wooden wardrobe

/** Per-furniture gameplay effects. Multipliers are 1.0 = neutral. */
export interface FurnitureGameplayEffects {
  /** Bonus to energy restored when sleeping (e.g. 20 = +20 energy). */
  sleepEnergyBonus?: number;
  /** Bonus to bladder restored when using toilet (e.g. 80 = +80 bladder). */
  bladderRestoreBonus?: number;
  /** Bonus to hygiene restored when showering (e.g. 50 = +50 hygiene). */
  hygieneRestoreBonus?: number;
  /** Bonus to fun restored when interacting (e.g. 35 = +35 fun). */
  funRestoreBonus?: number;
  /** Passive fun-decay multiplier (1.0 = normal, 0.8 = slower decay = TV lifts mood). */
  funDecayMultiplier?: number;
  /** Comfort score contribution (used by getComfortScore()). */
  comfortBonus?: number;
  /** Passive energy-decay multiplier (1.0 = normal, 0.85 = 15% slower = fan cools). */
  energyDecayMultiplier?: number;
}

/** Grid footprint + physical dimensions in meters. */
export interface FurnitureDimensions {
  widthMeters: number;
  depthMeters: number;
  heightMeters: number;
  /** Grid cells occupied (1 = 1×1, 2 = 2×1, etc.). Most furniture is 1×1. */
  gridWidth: number;
  gridDepth: number;
}

export interface PlacementRules {
  requiresWallSnapping: boolean;
  allowedSurfaces: ('floor' | 'wall')[];
  stackable: boolean;
  blocksDoor: boolean;
}

export type FurnitureRarity = 'common' | 'uncommon' | 'rare' | 'premium' | 'luxury';
export type FurnitureCategory =
  | 'structural'
  | 'bedroom'
  | 'living'
  | 'kitchen'
  | 'bathroom'
  | 'electronics'
  | 'household'
  | 'decor';

export interface FurnitureItem {
  id: FurnitureId;
  title: string;
  costGHS: number;
  flexPoints: number;
  comfortBonus: number;
  /** Slot index within zone (legacy fixed-slot system — kept for backward-compat with the existing home sheet UI). */
  slot: number;
  /** courtyard = outside; interior = inside the room (legacy). */
  zone: 'courtyard' | 'interior';
  blurb: string;
  // ── Phase-1 placement-engine fields (optional for legacy items) ──
  category?: FurnitureCategory;
  rarity?: FurnitureRarity;
  dimensions?: FurnitureDimensions;
  gameplayEffects?: FurnitureGameplayEffects;
  placementRules?: PlacementRules;
  /** Future GLB asset path — when CC0 assets are ingested via the asset pipeline. Procedural geometry is used until then. */
  assetPath?: string;
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
  },
  // ──────────────────────────────────────────────────────────────────────────
  // Phase-1 placement-engine items — these support grid-based placement +
  // per-item gameplay effects + dimensions for collision. They use the
  // same id/title/costGHS/flexPoints/comfortBonus fields as the legacy
  // items so the existing home sheet UI + getFlexScore/getComfortScore
  // continue to work. The new fields (dimensions, gameplayEffects,
  // placementRules, category, rarity) drive the placement engine.
  //
  // The starter room is empty by default (zero beds, zero chairs, etc.)
  // per the product spec. The player must buy + place these items.
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'bed_basic',
    title: 'Basic Bed Frame',
    costGHS: 250,
    flexPoints: 22,
    comfortBonus: 8,
    slot: 0,
    zone: 'interior',
    blurb: 'Simple wooden bed frame with thin foam mattress. Better than the floor.',
    category: 'bedroom',
    rarity: 'common',
    dimensions: { widthMeters: 1.0, depthMeters: 2.0, heightMeters: 0.5, gridWidth: 1, gridDepth: 2 },
    gameplayEffects: { sleepEnergyBonus: 20, comfortBonus: 8, energyDecayMultiplier: 0.95 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'chair_plastic',
    title: 'Plastic Monobloc Chair',
    costGHS: 20,
    flexPoints: 3,
    comfortBonus: 1,
    slot: 6,
    zone: 'interior',
    blurb: 'The Ghanaian staple — white plastic chair everywhere.',
    category: 'living',
    rarity: 'common',
    dimensions: { widthMeters: 0.5, depthMeters: 0.5, heightMeters: 0.85, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 1 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'chair_wooden',
    title: 'Carved Wooden Chair',
    costGHS: 60,
    flexPoints: 6,
    comfortBonus: 3,
    slot: 7,
    zone: 'interior',
    blurb: 'Hand-carved Ashanti-style wooden chair. Proper seat.',
    category: 'living',
    rarity: 'uncommon',
    dimensions: { widthMeters: 0.55, depthMeters: 0.55, heightMeters: 0.95, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 3 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'table_small',
    title: 'Small Wooden Table',
    costGHS: 90,
    flexPoints: 8,
    comfortBonus: 3,
    slot: 8,
    zone: 'interior',
    blurb: 'Compact table for meals, work, or studying.',
    category: 'living',
    rarity: 'common',
    dimensions: { widthMeters: 0.9, depthMeters: 0.6, heightMeters: 0.75, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 3 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'table_dining',
    title: 'Dining Table (4-seater)',
    costGHS: 280,
    flexPoints: 18,
    comfortBonus: 6,
    slot: 9,
    zone: 'interior',
    blurb: 'Proper dining table for hosting meals + social.',
    category: 'kitchen',
    rarity: 'uncommon',
    dimensions: { widthMeters: 1.2, depthMeters: 0.8, heightMeters: 0.78, gridWidth: 2, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 6, funRestoreBonus: 5 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'sofa_basic',
    title: 'Basic 2-Seater Sofa',
    costGHS: 320,
    flexPoints: 24,
    comfortBonus: 9,
    slot: 10,
    zone: 'interior',
    blurb: 'Cushioned 2-seater. Relax + watch TV.',
    category: 'living',
    rarity: 'uncommon',
    dimensions: { widthMeters: 1.6, depthMeters: 0.8, heightMeters: 0.85, gridWidth: 2, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 9, funRestoreBonus: 8, energyDecayMultiplier: 0.92 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'tv_basic',
    title: 'Flatscreen TV',
    costGHS: 480,
    flexPoints: 32,
    comfortBonus: 8,
    slot: 11,
    zone: 'interior',
    blurb: 'Match-day + movie nights. Lifts mood passively.',
    category: 'electronics',
    rarity: 'uncommon',
    dimensions: { widthMeters: 1.0, depthMeters: 0.15, heightMeters: 0.6, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 8, funDecayMultiplier: 0.85, funRestoreBonus: 15 },
    placementRules: { requiresWallSnapping: true, allowedSurfaces: ['wall', 'floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'fridge_basic',
    title: 'Single-Door Fridge',
    costGHS: 650,
    flexPoints: 38,
    comfortBonus: 10,
    slot: 12,
    zone: 'interior',
    blurb: 'Cold water, fresh stews. Reduces food spoilage.',
    category: 'kitchen',
    rarity: 'rare',
    dimensions: { widthMeters: 0.6, depthMeters: 0.6, heightMeters: 1.4, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 10 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'cooker_gas',
    title: '2-Burner Gas Cooker',
    costGHS: 180,
    flexPoints: 14,
    comfortBonus: 4,
    slot: 13,
    zone: 'interior',
    blurb: 'Gas cooker with cylinder — cook waakye, jollof, banku at home.',
    category: 'kitchen',
    rarity: 'common',
    dimensions: { widthMeters: 0.6, depthMeters: 0.5, heightMeters: 0.85, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 4 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'toilet_basic',
    title: 'Squat Toilet',
    costGHS: 120,
    flexPoints: 10,
    comfortBonus: 2,
    slot: 14,
    zone: 'interior',
    blurb: 'Basic squat toilet — better than the bush.',
    category: 'bathroom',
    rarity: 'common',
    dimensions: { widthMeters: 0.6, depthMeters: 0.8, heightMeters: 0.4, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { bladderRestoreBonus: 80, comfortBonus: 2 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'shower_basic',
    title: 'Bucket Shower',
    costGHS: 80,
    flexPoints: 8,
    comfortBonus: 2,
    slot: 15,
    zone: 'interior',
    blurb: 'Bucket + cup — the classic Ghanaian bathroom setup.',
    category: 'bathroom',
    rarity: 'common',
    dimensions: { widthMeters: 0.5, depthMeters: 0.5, heightMeters: 0.8, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { hygieneRestoreBonus: 50, comfortBonus: 2 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'fan_standing',
    title: 'Standing Fan',
    costGHS: 110,
    flexPoints: 9,
    comfortBonus: 3,
    slot: 16,
    zone: 'interior',
    blurb: 'Oscillating standing fan — cools the room passively.',
    category: 'household',
    rarity: 'common',
    dimensions: { widthMeters: 0.4, depthMeters: 0.4, heightMeters: 1.5, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 3, energyDecayMultiplier: 0.9 },
    placementRules: { requiresWallSnapping: false, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  },
  {
    id: 'wardrobe_basic',
    title: 'Wooden Wardrobe',
    costGHS: 220,
    flexPoints: 16,
    comfortBonus: 5,
    slot: 17,
    zone: 'interior',
    blurb: 'Tall wooden wardrobe for clothes + storage.',
    category: 'bedroom',
    rarity: 'uncommon',
    dimensions: { widthMeters: 1.0, depthMeters: 0.55, heightMeters: 1.8, gridWidth: 1, gridDepth: 1 },
    gameplayEffects: { comfortBonus: 5 },
    placementRules: { requiresWallSnapping: true, allowedSurfaces: ['floor'], stackable: false, blocksDoor: false }
  }
];

const STORAGE_KEY = 'chale_life_home_v3';  // bumped from v2 → v3 to add placed[]
const LEGACY_STORAGE_KEY = 'chale_life_home_v2';
const LEGACY_STORAGE_KEY_V1 = 'chale_life_home_v1';
const MAX_FURN_FLEX = FURNITURE_CATALOG.reduce((s, f) => s + f.flexPoints, 0);

/**
 * A placed furniture instance. Persisted across sessions so the room looks
 * exactly as the player left it after logout + login + page refresh.
 *
 * Coordinates are in room-local meters (origin = room's interior-floor
 * center, +X = east, +Y = up, +Z = south). Rotation is in radians (0 =
 * facing +Z/south, π/2 = facing +X/east).
 *
 * The Firestore /players/{uid} doc persists this as `placedFurniture: PlacedFurnitureInstance[]`
 * alongside the existing `state` + `phase3Economy` fields.
 */
export interface PlacedFurnitureInstance {
  /** Stable unique id within this player's home (uuid-style). */
  instanceId: string;
  /** Catalog item id (references FURNITURE_CATALOG). */
  catalogId: FurnitureId;
  /** Room-local X position (meters, center of footprint). */
  x: number;
  /** Room-local Z position (meters, center of footprint). */
  z: number;
  /** Rotation in radians (0 = facing +Z/south, π/2 = facing +X/east). */
  rotationY: number;
  /** 'placing' = ghost preview (not yet confirmed); 'placed' = locked in. */
  placementState: 'placing' | 'placed';
  /** Price paid at purchase time (for resale value calculation). */
  purchasePrice: number;
}

export interface HomeState {
  housingTier: HousingTierId;
  unlockedTiers: HousingTierId[];
  owned: FurnitureId[];
  /** Phase-1 placement engine: placed furniture instances with positions/rotations. */
  placed: PlacedFurnitureInstance[];
}

export type HomeListener = (state: HomeState) => void;

export class HomeSystem {
  private housingTier: HousingTierId = 'single_room';
  private unlockedTiers = new Set<HousingTierId>(['single_room']);
  private owned = new Set<FurnitureId>();
  private placed: PlacedFurnitureInstance[] = [];
  private listeners = new Set<HomeListener>();
  private lastSocialAtMs = 0;
  private instanceCounter = 0;

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

  // ── Phase-1 placement engine ──────────────────────────────────────────────

  /**
   * All placed furniture instances (placementState = 'placed').
   * Excludes 'placing' ghosts.
   */
  public getPlaced(): PlacedFurnitureInstance[] {
    return this.placed.filter((p) => p.placementState === 'placed');
  }

  /**
   * Place a furniture instance at the given room-local coordinates.
   * Caller is responsible for collision validation (the PlacementEngine
   * does that before calling this).
   */
  public placeItem(
    catalogId: FurnitureId,
    x: number,
    z: number,
    rotationY: number,
    purchasePrice: number
  ): PlacedFurnitureInstance {
    const instance: PlacedFurnitureInstance = {
      instanceId: `furn_${Date.now()}_${++this.instanceCounter}`,
      catalogId,
      x,
      z,
      rotationY,
      placementState: 'placed',
      purchasePrice
    };
    this.placed.push(instance);
    this.persist();
    this.notify();
    return instance;
  }

  /** Remove a placed furniture instance by instanceId. */
  public removePlaced(instanceId: string): boolean {
    const idx = this.placed.findIndex((p) => p.instanceId === instanceId);
    if (idx === -1) return false;
    this.placed.splice(idx, 1);
    this.persist();
    this.notify();
    return true;
  }

  /** Move + rotate an existing placed instance. */
  public movePlaced(
    instanceId: string,
    x: number,
    z: number,
    rotationY: number
  ): boolean {
    const inst = this.placed.find((p) => p.instanceId === instanceId);
    if (!inst) return false;
    inst.x = x;
    inst.z = z;
    inst.rotationY = rotationY;
    this.persist();
    this.notify();
    return true;
  }

  /**
   * Sell a placed furniture instance. Refunds 50% of the purchase price
   * (standard resale per the economic balance sheet). Removes the instance
   * from placed[]. Also removes the catalog item from owned[] (so the
   * player can re-buy if they want). Returns the refund amount on success.
   */
  public sellPlaced(
    instanceId: string,
    addFunds: (amount: number, description: string) => void
  ): { success: boolean; refundGHS: number; message: string } {
    const idx = this.placed.findIndex((p) => p.instanceId === instanceId);
    if (idx === -1) {
      return { success: false, refundGHS: 0, message: 'Instance not found.' };
    }
    const inst = this.placed[idx];
    const refund = Math.round(inst.purchasePrice * 0.5);
    // Remove from placed.
    this.placed.splice(idx, 1);
    // Also remove from owned (so the player can re-buy).
    this.owned.delete(inst.catalogId);
    // Refund 50% of purchase price.
    addFunds(refund, `Sold: ${inst.catalogId}`);
    this.persist();
    this.notify();
    return {
      success: true,
      refundGHS: refund,
      message: `Sold for ₵${refund} (50% of ₵${inst.purchasePrice}).`
    };
  }

  /**
   * Aggregate gameplay effects from all placed furniture.
   * Used by NeedsSystem to apply passive bonuses (energy regen, fun decay, etc.)
   * and by main.ts to apply active bonuses when the player sleeps/showers/etc.
   */
  public getAggregateGameplayEffects() {
    const agg = {
      sleepEnergyBonus: 0,
      bladderRestoreBonus: 0,
      hygieneRestoreBonus: 0,
      funRestoreBonus: 0,
      comfortBonus: 0,
      funDecayMultiplier: 1,
      energyDecayMultiplier: 1
    };
    for (const inst of this.getPlaced()) {
      const item = FURNITURE_CATALOG.find((f) => f.id === inst.catalogId);
      if (!item?.gameplayEffects) continue;
      const g = item.gameplayEffects;
      if (g.sleepEnergyBonus) agg.sleepEnergyBonus += g.sleepEnergyBonus;
      if (g.bladderRestoreBonus) agg.bladderRestoreBonus += g.bladderRestoreBonus;
      if (g.hygieneRestoreBonus) agg.hygieneRestoreBonus += g.hygieneRestoreBonus;
      if (g.funRestoreBonus) agg.funRestoreBonus += g.funRestoreBonus;
      if (g.comfortBonus) agg.comfortBonus += g.comfortBonus;
      // Multipliers compound multiplicatively (e.g. fan 0.9 × bed 0.95 = 0.855).
      if (g.funDecayMultiplier) agg.funDecayMultiplier *= g.funDecayMultiplier;
      if (g.energyDecayMultiplier) agg.energyDecayMultiplier *= g.energyDecayMultiplier;
    }
    return agg;
  }

  public getComfortScore(): number {
    const tier = this.getHousingTier();
    let bonus = 0;
    for (const id of this.owned) {
      const item = FURNITURE_CATALOG.find((f) => f.id === id);
      if (item) bonus += item.comfortBonus;
    }
    // Also count placed-furniture comfort bonus (so placement matters).
    const agg = this.getAggregateGameplayEffects();
    bonus += agg.comfortBonus;
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
  ): { success: boolean; message: string; purchasePrice: number } {
    const item = FURNITURE_CATALOG.find((f) => f.id === id);
    if (!item) return { success: false, message: 'Unknown item.', purchasePrice: 0 };
    if (this.owned.has(id)) return { success: false, message: 'Already own this.', purchasePrice: 0 };

    const maxSlots = this.getMaxSlotsCount();
    if (this.owned.size >= maxSlots) {
      return {
        success: false,
        message: `Room storage full (${this.owned.size}/${maxSlots} slots in ${this.getHousingTier().shortLabel}). Upgrade your room for more space!`,
        purchasePrice: 0
      };
    }

    if (!canAfford(item.costGHS)) {
      return { success: false, message: `Need ₵${item.costGHS}`, purchasePrice: 0 };
    }
    if (!spend(item.costGHS, item.title)) {
      return { success: false, message: 'Payment failed.', purchasePrice: 0 };
    }
    this.owned.add(id);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${item.title} added · Comfort ${this.getComfortScore()}%`,
      purchasePrice: item.costGHS
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
      owned: this.getOwned(),
      placed: this.getPlaced()
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
          owned: this.getOwned(),
          placed: this.placed
        })
      );
    } catch {
      /* ignore quota errors */
    }
  }

  private load(): void {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY_V1);
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
      if (Array.isArray(data.placed)) {
        // Validate each placed instance against the catalog (drop unknown ids).
        for (const inst of data.placed) {
          if (
            inst &&
            inst.instanceId &&
            inst.catalogId &&
            FURNITURE_CATALOG.some((f) => f.id === inst.catalogId) &&
            typeof inst.x === 'number' &&
            typeof inst.z === 'number' &&
            typeof inst.rotationY === 'number'
          ) {
            this.placed.push({
              instanceId: inst.instanceId,
              catalogId: inst.catalogId,
              x: inst.x,
              z: inst.z,
              rotationY: inst.rotationY,
              placementState: 'placed',
              purchasePrice: typeof inst.purchasePrice === 'number' ? inst.purchasePrice : 0
            });
          }
        }
      }
    } catch {
      /* ignore parse errors */
    }
  }
}
