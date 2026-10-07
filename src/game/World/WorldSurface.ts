/**
 * Independent world surface elevation module for ACCRA LIFE.
 * Kept strictly free of imports from PlayerController or NeighborhoodBlock to
 * maintain a clean one-way dependency graph (its only import is GridMap,
 * a pure-constants module whose Locations import is type-only):
 *   WorldSurface -> GridMap -> (type-only) Locations
 *
 * CUSTOM MAP ERA (phase-1-custom-map + venue-polish pass):
 * The live world is the 5x5 Accra grid (World/GridMap.ts), which plays
 * FLAT at y = 0 — the visible R3F canvas draws flat cell pads and the
 * visible avatar walks at y = 0. The pre-grid elevation tiers (old main
 * road, sidewalks, gutter crossovers, venue pads at pre-map coordinates)
 * were phantom geometry on today's map and are gone.
 *
 * The ONE raised walkable surface left is the player's home compound,
 * whose regions derive from GridMap.HOME_COMPOUND_ANCHOR — the same
 * anchor the systems-layer PlayerCompound (colliders, veranda step,
 * interior floor) and the visible R3F landmark (HomeCompound.tsx) use,
 * so walking the courtyard never sinks or floats:
 *   gate apron 0.10 -> veranda step 0.16 -> courtyard slab 0.10
 *   -> house interior floor 0.24 (matches ROOM_ORIGIN.y in main.ts).
 */

import { HOME_COMPOUND_ANCHOR } from './GridMap';

const CX = HOME_COMPOUND_ANCHOR.world[0];
const CZ = HOME_COMPOUND_ANCHOR.world[1];

/**
 * Returns the exact top surface elevation (Y in meters) at world (x, z)
 * so the player, NPCs, vehicles, and street props rest naturally on the
 * compound courtyard, veranda step, or interior room floor without
 * sinking or hovering — and walk flat everywhere else on the grid.
 */
export function getSurfaceHeightAt(x: number, z: number): number {
  const dx = x - CX;
  const dz = z - CZ;

  // 1. House interior floor (inside the room shell, north half of the
  //    compound; checked before the courtyard which contains it).
  //    Footprint matches PlayerCompound's room shell zone (local z
  //    -1.6..2.9, half-width 2.8) and R3F HomeCompound's plinth.
  if (Math.abs(dx) <= 2.8 && dz >= -1.6 && dz <= 2.9) {
    return 0.24;
  }

  // 2. Veranda entrance step — through the gate, in front of the door
  //    (PlayerCompound verandaStep: local z -3.58..-3.06, half-width 1.15).
  if (Math.abs(dx) <= 1.15 && dz >= -3.58 && dz <= -3.06) {
    return 0.16;
  }

  // 3. Compound courtyard slab 9.6 x 8.2 (PlayerCompound courtyard +
  //    R3F landmark; top face at 0.10).
  if (Math.abs(dx) <= 4.8 && dz >= -4.1 && dz <= 4.1) {
    return 0.10;
  }

  // 4. Gate apron slab just outside the front wall (R3F apron: local
  //    z -4.6..-4.05, half-width 1.7).
  if (Math.abs(dx) <= 1.7 && dz >= -4.6 && dz <= -4.05) {
    return 0.10;
  }

  // 5. Everywhere else on the custom 5x5 grid: flat ground.
  return 0.0;
}
