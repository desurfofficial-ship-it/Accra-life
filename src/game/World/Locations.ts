/**
 * Accra Life — Locations & Place-Tied Recovery Actions
 *
 * Subdivides the game world into named Accra places so that
 * multiplayer presence and place-tied recovery actions become spatially meaningful.
 * The player's current location is derived from their live position via
 * `getLocationAt(x, z)`.
 *
 * Resolution order (custom map integration, phase-1-custom-map):
 *   1. Custom 5x5 Accra grid map (World/GridMap.ts) — named districts
 *      (Makola, Circle station, Osu, Labadi, Adabraka) resolve FIRST so the
 *      location pill, chat rooms, presence and recovery actions follow the
 *      custom map's geography.
 *   2. Legacy world-space bounds below — still authoritative for
 *      fine-grained zones (home compound, provisions, waakye joint) and for
 *      roads / mixed-use grid cells where the grid has no named zone.
 */

import { resolveLocationIdOnGrid, HOME_COMPOUND_ANCHOR } from './GridMap';

/** Stable string id for a location. Rules validate this matches ^[a-z0-9_]+$. */
export type LocationId =
  | 'home_compound'
  | 'adabraka_provisions'
  | 'osu_waakye_joint'
  | 'circle_trotro_stop'
  | 'osu_oxford_street'
  | 'adabraka_neighborhood'
  // Travel destinations (set directly by the travel system, not via bounds)
  | 'makola_market'
  | 'labadi_beach';

export interface Bounds2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlaceRecoveryAction {
  id: string;
  icon: string;
  label: string;
  shortPillLabel: string;
  costGHS: number;
  energyRestore: number;
  hungerRestore: number;
  heatReduction: number;
  cooldownSeconds: number;
  feedbackText: string;
}

export interface LocationDef {
  id: LocationId;
  /** Display name shown in the HUD + chat sheet header. */
  displayName: string;
  /** Short flavor shown in the chat sheet subtitle. */
  flavor: string;
  /** World-space rectangle (X, Z) the player must be inside to be "at" this location. */
  bounds: Bounds2D;
  /** Optional emoji icon for HUD pills. */
  icon: string;
  /** Place-tied recovery action available while standing in this zone. */
  recoveryAction: PlaceRecoveryAction;
}

/**
 * Ordered list of locations. `getLocationAt` returns the FIRST match, so the
 * most specific zones must come before `adabraka_neighborhood` (the fallback).
 */
export const LOCATIONS: readonly LocationDef[] = [
  {
    id: 'home_compound',
    displayName: 'Home Compound',
    flavor: 'Your room — rest, store, breathe.',
    bounds: {
      minX: HOME_COMPOUND_ANCHOR.world[0] - 4.9,
      maxX: HOME_COMPOUND_ANCHOR.world[0] + 5.0,
      minZ: HOME_COMPOUND_ANCHOR.world[1] - 4.2,
      maxZ: HOME_COMPOUND_ANCHOR.world[1] + 4.2
    },
    icon: '🏠',
    recoveryAction: {
      id: 'rec_home_veranda_nap',
      icon: '🛏️',
      label: 'Veranda Breeze Nap (Free · +28 Eng)',
      shortPillLabel: '🛏️ Nap (+28 Eng)',
      costGHS: 0,
      energyRestore: 28,
      hungerRestore: 0,
      heatReduction: 10,
      cooldownSeconds: 20,
      feedbackText: 'Caught a cool breeze on your compound veranda.'
    }
  },
  {
    id: 'adabraka_provisions',
    displayName: 'Adabraka Provisions',
    flavor: 'Milo, Peak milk, MoMo, cold drinks.',
    bounds: { minX: -13.0, maxX: -5.5, minZ: -13.0, maxZ: -7.7 },
    icon: '🏪',
    recoveryAction: {
      id: 'rec_provisions_voltic_bofrot',
      icon: '🧊',
      label: 'Chilled Voltic & Bofrot (₵4 · +22 Hun, +16 Eng)',
      shortPillLabel: '🧊 Voltic & Bofrot · ₵4',
      costGHS: 4,
      energyRestore: 16,
      hungerRestore: 22,
      heatReduction: 0,
      cooldownSeconds: 15,
      feedbackText: 'Chilled Voltic water and hot bofrot from Auntie Muni’s kiosk.'
    }
  },
  {
    id: 'osu_waakye_joint',
    displayName: 'Osu Waakye Joint',
    flavor: 'Sister Akosua’s waakye — rice, beans, shito, egg.',
    bounds: { minX: 5.5, maxX: 12.0, minZ: -13.0, maxZ: -7.7 },
    icon: '🍲',
    recoveryAction: {
      id: 'rec_waakye_sobolo_special',
      icon: '🍲',
      label: 'Waakye Leaf Pack & Sobolo (₵10 · +52 Hun, +12 Eng)',
      shortPillLabel: '🍲 Waakye & Sobolo · ₵10',
      costGHS: 10,
      energyRestore: 12,
      hungerRestore: 52,
      heatReduction: 0,
      cooldownSeconds: 15,
      feedbackText: 'Sister Akosua’s hot waakye with shito & chilled hibiscus sobolo!'
    }
  },
  {
    id: 'circle_trotro_stop',
    displayName: 'Circle Trotro Stop',
    flavor: 'Osu–Circle station — mate collecting.',
    bounds: { minX: 5.5, maxX: 12.0, minZ: 4.0, maxZ: 12.0 },
    icon: '🚐',
    recoveryAction: {
      id: 'rec_trotro_fanice_chips',
      icon: '🥤',
      label: 'FanIce & Plantain Chips (₵5 · +18 Hun, +22 Eng)',
      shortPillLabel: '🥤 FanIce & Chips · ₵5',
      costGHS: 5,
      energyRestore: 22,
      hungerRestore: 18,
      heatReduction: 0,
      cooldownSeconds: 18,
      feedbackText: 'Cold FanIce sachet & crunchy ripe plantain chips at the station!'
    }
  },
  {
    // Makola Market — previously a type-only travel destination. The custom
    // grid map anchors it to the Makola 2x2 district (rows 1-2, cols 1-2),
    // so it now has a real LocationDef (bounds = district union rect).
    id: 'makola_market',
    displayName: 'Makola Market',
    flavor: 'Kelewele smoke, fabric stalls, trading chaos.',
    bounds: { minX: -22.0, maxX: 6.0, minZ: -22.0, maxZ: 6.0 },
    icon: '🧺',
    recoveryAction: {
      id: 'rec_makola_kelewele_stick',
      icon: '🍌',
      label: 'Kelewele & Pineapple Stick (₵8 · +30 Hun, +10 Eng)',
      shortPillLabel: '🍌 Kelewele Stick · ₵8',
      costGHS: 8,
      energyRestore: 10,
      hungerRestore: 30,
      heatReduction: 0,
      cooldownSeconds: 15,
      feedbackText: 'Hot spicy kelewele and a fresh pineapple stick from Makola!'
    }
  },
  {
    // Labadi Beach — previously a type-only travel destination. The custom
    // grid map anchors it to the Labadi district (row 4, cols 0-1).
    id: 'labadi_beach',
    displayName: 'Labadi Beach',
    flavor: 'Surf, reggae, grilled tilapia smoke.',
    bounds: { minX: -38.0, maxX: -10.0, minZ: 26.0, maxZ: 38.0 },
    icon: '🏖️',
    recoveryAction: {
      id: 'rec_labadi_sea_breeze',
      icon: '🌊',
      label: 'Sea Breeze & Fried Yam (₵8 · +25 Hun, +20 Eng)',
      shortPillLabel: '🌊 Beach Break · ₵8',
      costGHS: 8,
      energyRestore: 20,
      hungerRestore: 25,
      heatReduction: 12,
      cooldownSeconds: 20,
      feedbackText: 'Feet in the sand, fried yam in hand — Labadi delivered.'
    }
  },
  {
    // The main drag — road + immediate sidewalks. Spawn point (0, 5.8) lands here.
    id: 'osu_oxford_street',
    displayName: 'Osu Oxford Street',
    flavor: 'The main drag — traffic, hawkers, music.',
    bounds: { minX: -25.0, maxX: 25.0, minZ: -7.7, maxZ: 7.7 },
    icon: '🛣️',
    recoveryAction: {
      id: 'rec_oxford_fresh_coconut',
      icon: '🥥',
      label: 'Fresh Roadside Coconut (₵5 · +20 Hun, +20 Eng)',
      shortPillLabel: '🥥 Fresh Coconut · ₵5',
      costGHS: 5,
      energyRestore: 20,
      hungerRestore: 20,
      heatReduction: 0,
      cooldownSeconds: 18,
      feedbackText: 'Drank ice-cold coconut water and ate the soft jelly on Oxford Street!'
    }
  },
  {
    // Fallback for anything outside the named zones (rare edges of the world).
    id: 'adabraka_neighborhood',
    displayName: 'Adabraka',
    flavor: 'Walking through Adabraka.',
    bounds: { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity },
    icon: '🌆',
    recoveryAction: {
      id: 'rec_adabraka_shade_rest',
      icon: '🌳',
      label: 'Neem Tree Shade Breather (Free · +15 Eng, -8% Heat)',
      shortPillLabel: '🌳 Shade Rest (+15 Eng)',
      costGHS: 0,
      energyRestore: 15,
      hungerRestore: 0,
      heatReduction: 8,
      cooldownSeconds: 20,
      feedbackText: 'Rested in the Adabraka neem shade and cooled off.'
    }
  }
] as const;

const LOCATION_BY_ID: Record<LocationId, LocationDef> = Object.fromEntries(
  LOCATIONS.map((l) => [l.id, l])
) as Record<LocationId, LocationDef>;

/** Returns the location the player is currently "at" for the given world position. */
export function getLocationAt(x: number, z: number): LocationDef {
  // 1. Custom 5x5 grid map first — named districts are authoritative on the
  //    live custom map (Adabraka, Makola, Circle station, Osu, Labadi).
  const gridId = resolveLocationIdOnGrid(x, z);
  if (gridId) return LOCATION_BY_ID[gridId];
  // 2. Legacy bounds — fine-grained zones (home compound, provisions, waakye
  //    joint, Oxford street strip) + fallback for roads/mixed cells.
  for (const loc of LOCATIONS) {
    const b = loc.bounds;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return loc;
    }
  }
  // Should be unreachable because the fallback has +/-Infinity bounds.
  return LOCATION_BY_ID.adabraka_neighborhood;
}

/** Look up a LocationDef by id. Throws for unknown ids (defensive programming). */
export function getLocationDef(id: LocationId): LocationDef {
  const def = LOCATION_BY_ID[id];
  if (!def) throw new Error(`Unknown location id: ${id}`);
  return def;
}

/** All valid LocationId values — useful for whitelisting in UI/tests. */
export const ALL_LOCATION_IDS: readonly LocationId[] = LOCATIONS.map((l) => l.id);
