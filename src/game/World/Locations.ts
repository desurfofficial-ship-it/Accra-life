/**
 * Accra Life — Locations & Place-Tied Recovery Actions
 *
 * Subdivides the existing 3D neighborhood into named Accra places so that
 * multiplayer presence and place-tied recovery actions become spatially meaningful.
 * Each location is a rectangle in world (X, Z) coordinates; the player's current
 * location is derived from their live Three.js position via `getLocationAt(x, z)`.
 */

/** Stable string id for a location. Rules validate this matches ^[a-z0-9_]+$. */
export type LocationId =
  | 'home_compound'
  | 'adabraka_provisions'
  | 'osu_waakye_joint'
  | 'circle_trotro_stop'
  | 'osu_oxford_street'
  | 'adabraka_neighborhood';

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
    bounds: { minX: -15.4, maxX: -5.5, minZ: 8.0, maxZ: 16.4 },
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
