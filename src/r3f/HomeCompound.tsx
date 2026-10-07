/**
 * HomeCompound.tsx — visible landmark for the player's home compound
 *
 * The REAL compound (walls, cutaway shell, tier rebuilds, placed
 * furniture) lives in the hidden systems layer (PlayerCompound.ts) which
 * stopped rendering when the custom map took over the visible canvas
 * (phase1.renderEnabled = false). This component draws a lightweight
 * look-alike ON the custom map at the exact same anchor so players can
 * FIND home: GridMap.HOME_COMPOUND_ANCHOR — mixed cell [row 2, col 0],
 * world [-32, 0] (relocated there in the venue-polish pass).
 *
 * Geometry mirrors the systems-layer compound's dimensions so the marker
 * reads truthfully:
 *   - courtyard slab 9.6 x 8.2 m (PlayerCompound courtyard BoxGeometry)
 *   - 1.8 m breeze-block perimeter walls with a 2.64 m front gate gap
 *   - gate apron slab at the south (-z) edge (faces the district road)
 *   - house shell + hipped roof on the north half
 *   - steel polytank tower hint in the back-east corner
 *
 * Visual only — no colliders/interactables here; the hidden systems layer
 * owns the real home_door interactable at the same anchor.
 */

import { HOME_COMPOUND_ANCHOR } from '../game/World/GridMap';

// Anchor-derived placement (single source of truth with the systems layer)
const CX = HOME_COMPOUND_ANCHOR.world[0];
const CZ = HOME_COMPOUND_ANCHOR.world[1];

// Palette — matches PlayerCompound materials
const WALL_COLOR = '#fde68a';   // cream breeze-block
const WALL_TRIM = '#f8fafc';    // white pillars/trim
const ROOF_COLOR = '#9a3412';   // rust corrugated
const SLAB_COLOR = '#e2e8f0';   // courtyard tile
const IRON_COLOR = '#1e293b';   // gates / tower steel
const TANK_COLOR = '#111827';   // polytank
const PLINTH_COLOR = '#b45309'; // terracotta plinth

const WALL_H = 1.8;
const WALL_T = 0.7;
const GATE_GAP = 2.64; // front gate opening (walls stop ±1.32 from center)

export function HomeCompound() {
  // The compound footprint (9.66 x 8.7 incl. walls) fits the 12 m cell
  // with ~1.1 m clearance on each side.

  const wallSegs: Array<{
    key: string;
    pos: [number, number, number];
    size: [number, number, number];
  }> = [
    // Front wall left of gate (south face, -z)
    { key: 'front-l', pos: [-(GATE_GAP / 2 + (9.66 - GATE_GAP) / 4), WALL_H / 2, -3.95], size: [(9.66 - GATE_GAP) / 2, WALL_H, WALL_T] },
    // Front wall right of gate
    { key: 'front-r', pos: [GATE_GAP / 2 + (9.66 - GATE_GAP) / 4, WALL_H / 2, -3.95], size: [(9.66 - GATE_GAP) / 2, WALL_H, WALL_T] },
    // Outer west wall
    { key: 'west', pos: [-4.48, WALL_H / 2, 0.1], size: [WALL_T, WALL_H, 8.7] },
    // Outer east wall
    { key: 'east', pos: [4.48, WALL_H / 2, 0.1], size: [WALL_T, WALL_H, 8.7] },
    // Outer back wall (north, +z)
    { key: 'back', pos: [0, WALL_H / 2, 4.15], size: [9.66, WALL_H, WALL_T] }
  ];

  return (
    <group position={[CX, 0, CZ]}>
      {/* Courtyard slab */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[9.6, 0.1, 8.2]} />
        <meshStandardMaterial color={SLAB_COLOR} roughness={0.74} />
      </mesh>
      {/* Gate apron (south, toward the road) */}
      <mesh position={[0, 0.05, -4.32]} receiveShadow>
        <boxGeometry args={[3.4, 0.1, 0.55]} />
        <meshStandardMaterial color={SLAB_COLOR} roughness={0.74} />
      </mesh>

      {/* Perimeter walls */}
      {wallSegs.map((w) => (
        <mesh key={w.key} position={w.pos} castShadow receiveShadow>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.78} />
        </mesh>
      ))}

      {/* Gate pillars + iron double gate (closed) */}
      {[-GATE_GAP / 2 - 0.1, GATE_GAP / 2 + 0.1].map((px, i) => (
        <mesh key={`pillar-${i}`} position={[px, 1.1, -3.95]} castShadow>
          <boxGeometry args={[0.34, 2.2, 0.34]} />
          <meshStandardMaterial color={WALL_TRIM} roughness={0.58} />
        </mesh>
      ))}
      <mesh position={[0, 1.0, -3.95]} castShadow>
        <boxGeometry args={[GATE_GAP, 2.0, 0.08]} />
        <meshStandardMaterial color={IRON_COLOR} roughness={0.42} metalness={0.55} />
      </mesh>

      {/* House shell (north half) — plinth + walls + hipped roof */}
      <mesh position={[0, 0.19, 0.9]} receiveShadow>
        <boxGeometry args={[5.6, 0.28, 4.0]} />
        <meshStandardMaterial color={PLINTH_COLOR} roughness={0.78} />
      </mesh>
      <mesh position={[0, 1.55, 0.9]} castShadow receiveShadow>
        <boxGeometry args={[5.2, 2.4, 3.6]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.68} />
      </mesh>
      {/* Hipped roof: 4-segment cone = pyramid */}
      <mesh position={[0, 3.6, 0.9]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.3, 1.5, 4]} />
        <meshStandardMaterial color={ROOF_COLOR} roughness={0.58} />
      </mesh>
      {/* Louver window hints (front face) */}
      {[-1.4, 1.4].map((wx, i) => (
        <mesh key={`win-${i}`} position={[wx, 1.9, -0.92]}>
          <boxGeometry args={[0.9, 0.7, 0.06]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.35} />
        </mesh>
      ))}

      {/* Polytank tower hint (back-east corner) */}
      {[
        [-0.28, -0.28],
        [0.28, -0.28],
        [-0.28, 0.28],
        [0.28, 0.28]
      ].map(([lx, lz], i) => (
        <mesh key={`leg-${i}`} position={[3.9 + lx, 1.6, 3.1 + lz]} castShadow>
          <boxGeometry args={[0.09, 3.2, 0.09]} />
          <meshStandardMaterial color={IRON_COLOR} roughness={0.42} metalness={0.55} />
        </mesh>
      ))}
      <mesh position={[3.9, 3.82, 3.1]} castShadow>
        <cylinderGeometry args={[0.46, 0.5, 1.15, 16]} />
        <meshStandardMaterial color={TANK_COLOR} roughness={0.34} />
      </mesh>
    </group>
  );
}
