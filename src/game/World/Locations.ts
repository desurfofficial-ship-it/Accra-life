/**
 * Accra Life — Locations
 *
 * Subdivides the existing 3D neighborhood into named Accra places so that
 * multiplayer presence becomes spatially meaningful. Each location is a
 * rectangle in world (X, Z) coordinates; the player's current location is
 * derived from their live Three.js position via `getLocationAt(x, z)`.
 *
 * Mapping rationale (preserves the game's existing flavor):
 * - The kiosk is already signed "ADABRAKA PROVISIONS" → `adabraka_provisions`.
 * - The trotro interactable already says "Osu–Circle station" → `circle_trotro_stop`.
 * - The road + sidewalks are the main drag → `osu_oxford_street`.
 * - The food stall is on the north side near the Osu vibe → `osu_waakye_joint`.
 * - The player's compound is their home → `home_compound`.
 * - Anywhere not covered (rare sidewalk edges, world borders) → `adabraka_neighborhood`.
 *
 * Bounds are derived from the actual collider rectangles in
 * `src/game/World/PlayerCompound.ts`, `NeighborhoodProvision.ts`,
 * `NeighborhoodFood.ts`, `NeighborhoodTrotro.ts`, and `NeighborhoodGutters.ts`.
 * They are intentionally a bit larger than the colliders so the player's
 * "presence" updates BEFORE they bump into the building, not after.
 *
 * Order of checks matters: most specific first, fallback last.
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
    icon: '🏠'
  },
  {
    id: 'adabraka_provisions',
    displayName: 'Adabraka Provisions',
    flavor: 'Milo, Peak milk, MoMo, cold drinks.',
    bounds: { minX: -13.0, maxX: -5.5, minZ: -13.0, maxZ: -7.7 },
    icon: '🏪'
  },
  {
    id: 'osu_waakye_joint',
    displayName: 'Osu Waakye Joint',
    flavor: 'Sister Akosua’s waakye — rice, beans, shito, egg.',
    bounds: { minX: 5.5, maxX: 12.0, minZ: -13.0, maxZ: -7.7 },
    icon: '🍲'
  },
  {
    id: 'circle_trotro_stop',
    displayName: 'Circle Trotro Stop',
    flavor: 'Osu–Circle station — mate collecting.',
    bounds: { minX: 5.5, maxX: 12.0, minZ: 4.0, maxZ: 12.0 },
    icon: '🚐'
  },
  {
    // The main drag — road + immediate sidewalks. Spawn point (0, 5.8) lands here.
    id: 'osu_oxford_street',
    displayName: 'Osu Oxford Street',
    flavor: 'The main drag — traffic, hawkers, music.',
    bounds: { minX: -25.0, maxX: 25.0, minZ: -7.7, maxZ: 7.7 },
    icon: '🛣️'
  },
  {
    // Fallback for anything outside the named zones (rare edges of the world).
    id: 'adabraka_neighborhood',
    displayName: 'Adabraka',
    flavor: 'Walking through Adabraka.',
    bounds: { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity },
    icon: '🌆'
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
