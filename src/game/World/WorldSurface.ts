/**
 * Independent world surface elevation module for the CHALÉ LIFE neighborhood slice.
 * Kept strictly free of imports from PlayerController or NeighborhoodBlock to
 * maintain a clean one-way dependency graph:
 *   WorldSurface -> PlayerController / NeighborhoodBlock
 */

/**
 * Returns the exact top surface elevation (Y in meters) at world (x, z)
 * so the player, NPCs, vehicles, and street props rest naturally on top of
 * sidewalks, crossover slabs, compound courtyards, veranda steps, shop pads,
 * or the asphalt road without sinking or hovering.
 */
export function getSurfaceHeightAt(x: number, z: number): number {
  // 1. Player Compound House Courtyard & Entrance Gate Apron (X in [-15.3, -5.7], Z in [7.7, 16.3])
  if (x >= -15.3 && x <= -5.7 && z >= 7.7 && z <= 16.3) {
    // Raised Veranda Deck (X in [-14.2, -6.8], Z in [9.08, 10.72])
    if (x >= -14.2 && x <= -6.8 && z >= 9.08 && z <= 10.72) {
      return 0.24;
    }
    // Center Veranda Entrance Step (X in [-11.55, -9.45], Z in [8.70, 9.08])
    if (x >= -11.55 && x <= -9.45 && z >= 8.70 && z < 9.08) {
      return 0.16;
    }
    return 0.10;
  }

  // 2. Provision Store Concrete Pad (X in [-12.7, -6.3], Z in [-12.8, -7.6])
  if (x >= -12.7 && x <= -6.3 && z >= -12.8 && z <= -7.6) {
    return 0.10;
  }

  // 3. Waakye & Jollof Dining Patio Slab (X in [4.8, 12.2], Z in [-12.95, -7.05])
  if (x >= 4.8 && x <= 12.2 && z >= -12.95 && z <= -7.05) {
    return 0.10;
  }

  // 4. Trotro Stop Boarding Pad (X in [6.6, 11.4], Z in [5.15, 7.65])
  if (x >= 6.6 && x <= 11.4 && z >= 5.15 && z <= 7.65) {
    return 0.10;
  }

  // 5. North & South Pedestrian Sidewalks (Z in [-7.7, -4.4] or [4.4, 7.7])
  if ((z >= -7.7 && z <= -4.4) || (z >= 4.4 && z <= 7.7)) {
    return 0.08;
  }

  // 6. Concrete Entrance Crossover Bridges across the Storm Gutter (Z in [-4.48, -3.62] or [3.62, 4.48])
  if ((z >= -4.48 && z <= -3.62) || (z >= 3.62 && z <= 4.48)) {
    const onNorthCrossover =
      z < 0 &&
      ((x >= -11.3 && x <= -7.7) ||
        (x >= -1.5 && x <= 1.5) ||
        (x >= 6.5 && x <= 10.5));
    const onSouthCrossover =
      z > 0 &&
      ((x >= -12.3 && x <= -8.7) ||
        (x >= -1.5 && x <= 1.5) ||
        (x >= 6.8 && x <= 11.2));

    if (onNorthCrossover || onSouthCrossover) {
      return 0.085;
    }
    return 0.02;
  }

  // 7. Main Asphalt Road & Shoulders (Z in [-3.8, 3.8])
  if (z >= -3.8 && z <= 3.8) {
    return 0.02;
  }

  // 8. Surrounding Laterite Earth Ground
  return 0.0;
}
