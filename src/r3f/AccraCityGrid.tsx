/**
 * AccraCityGrid.tsx — Custom modular 3D map for Accra Life
 *
 * 5x5 grid system where each cell is a city block. Roads are dark grey
 * planes forming a grid. Buildings are low-poly boxes with varied heights
 * and widths, color-coded by Accra district:
 *
 *   - Makola Market (cells [1,1] to [2,2]): vibrant reds + oranges,
 *     small stall-like boxes (market stalls)
 *   - Circle Tro-tro Station (cell [3,2]): large yellow structure
 *   - Osu (cells [3,3] to [4,4]): blue/teal buildings (nightlife)
 *   - Adabraka (cells [0,0] to [1,0]): warm cream/ochre (residential)
 *   - Labadi (cells [4,0] to [4,1]): green-tinted (beach area)
 *   - Other cells: generic grey/brown (mixed-use)
 *
 * Grid layout (row 0 = south, row 4 = north):
 *
 *   [0,4] [1,4] [2,4] [3,4] [4,4]    Labadi → ← Osu
 *   [0,3] [1,3] [2,3] [3,3] [4,3]
 *   [0,2] [1,2]★[2,2]★[3,2]◉[4,2]    ★ = Makola Market, ◉ = Circle Station
 *   [0,1] [1,1] [2,1] [3,1] [4,1]
 *   [0,0] [1,0] [2,0] [3,0] [4,0]    Adabraka (home)
 *
 * Each cell is CELL_SIZE meters (default 12m). Roads are ROAD_WIDTH
 * meters wide (default 4m) between cells. Total map size:
 *   5 * CELL_SIZE + 6 * ROAD_WIDTH = 5*12 + 6*4 = 84m
 *
 * Geometry + district logic live in src/game/World/GridMap.ts (canonical
 * module shared with the game systems — locations, chat, presence, travel);
 * this component renders the visuals from it.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  GRID_SIZE,
  CELL_SIZE,
  ROAD_WIDTH,
  TOTAL_SIZE,
  HALF,
  cellCenter,
  districtAt
} from '../game/World/GridMap';

// ── District definitions (visual palettes keyed by GridDistrictId) ──────────

interface District {
  name: string;
  // Building color palette (hex)
  colors: number[];
  // Height range [min, max] in meters
  heightRange: [number, number];
  // Whether to add market stalls (small boxes)
  hasStalls?: boolean;
  // Whether this cell has a landmark structure
  landmark?: 'circle_station' | 'market_entrance' | 'beach';
}

const DISTRICTS: Record<string, District> = {
  adabraka: {
    name: 'Adabraka',
    colors: [0xfde68a, 0xfbbf24, 0xf59e0b], // warm cream/ochre
    heightRange: [3, 6],
  },
  makola: {
    name: 'Makola Market',
    colors: [0xdc2626, 0xea580c, 0xf97316, 0xfacc15], // vibrant reds + oranges
    heightRange: [2, 5],
    hasStalls: true,
  },
  circle: {
    name: 'Circle',
    colors: [0xfacc15, 0xeab308], // yellow
    heightRange: [8, 12],
    landmark: 'circle_station',
  },
  osu: {
    name: 'Osu',
    colors: [0x0ea5e9, 0x38bdf8, 0x06b6d4], // blue/teal (nightlife)
    heightRange: [4, 8],
  },
  labadi: {
    name: 'Labadi',
    colors: [0x16a34a, 0x22c55e, 0x4ade80], // green (beach area)
    heightRange: [2, 4],
    landmark: 'beach',
  },
  mixed: {
    name: 'Mixed',
    colors: [0x64748b, 0x94a3b8, 0x475569], // grey/brown
    heightRange: [3, 7],
  },
};

/** Map each cell [row, col] to its district visuals (logic: GridMap.districtAt). */
function getDistrict(row: number, col: number): District {
  return DISTRICTS[districtAt(row, col)];
}

// ── Road component ───────────────────────────────────────────────────────────

function Roads() {
  const roadMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }),
    []
  );

  return (
    <group>
      {/* Horizontal roads (6 strips across the grid) */}
      {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => {
        const z = -HALF + i * (CELL_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;
        return (
          <mesh key={`hroad-${i}`} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <boxGeometry args={[TOTAL_SIZE, 0.02, ROAD_WIDTH]} />
            <primitive object={roadMat} attach="material" />
          </mesh>
        );
      })}

      {/* Vertical roads (6 strips) */}
      {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => {
        const x = -HALF + i * (CELL_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;
        return (
          <mesh key={`vroad-${i}`} position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <boxGeometry args={[ROAD_WIDTH, 0.02, TOTAL_SIZE]} />
            <primitive object={roadMat} attach="material" />
          </mesh>
        );
      })}

      {/* Road markings — yellow dashes at intersections */}
      {Array.from({ length: GRID_SIZE + 1 }).map((_, i) =>
        Array.from({ length: GRID_SIZE + 1 }).map((_, j) => {
          const [x, z] = cellCenter(i - 0.5, j - 0.5);
          if (Number.isNaN(x)) return null;
          return (
            <mesh key={`mark-${i}-${j}`} position={[x, 0.02, z]}>
              <boxGeometry args={[0.3, 0.01, 0.3]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          );
        })
      )}
    </group>
  );
}

// ── Building component ───────────────────────────────────────────────────────

interface BuildingProps {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  color: number;
}

function Building({ position, width, depth, height, color }: BuildingProps) {
  return (
    <mesh position={[position[0], height / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

// ─<arg_value> Cell component — buildings + landmarks per district ───────────────────────

interface CellProps {
  row: number;
  col: number;
}

/**
 * Cells reserved for mounted venue models — the generic district building
 * boxes are SKIPPED on these cells (ground pad stays) so they never
 * intersect the real landmarks:
 *   - '2,0': player home compound (HomeCompound.tsx / PlayerCompound.ts)
 *   - '3,1': residential showroom (ResidentialShowroom.tsx, scene.gltf)
 */
const RESERVED_CELLS = new Set(['2,0', '3,1']);

function Cell({ row, col }: CellProps) {
  const [cx, cz] = cellCenter(row, col);
  const district = getDistrict(row, col);
  const reserved = RESERVED_CELLS.has(`${row},${col}`);

  // Deterministic pseudo-random for building placement
  // (uses row/col as seed — same buildings every render)
  const seed = (row * 7 + col * 13) % 17;
  const rand = (n: number) => {
    const v = Math.sin(seed * 100 + n * 17) * 10000;
    return v - Math.floor(v);
  };

  // Number of buildings in this cell (1-4, scaled by district)
  const buildingCount = district.hasStalls ? 6 : 1 + Math.floor(rand(1) * 3);

  // Generate building positions + dimensions (deterministic)
  const buildings = useMemo(() => {
    const items: BuildingProps[] = [];
    for (let i = 0; i < buildingCount; i++) {
      const r = rand(i + 2);
      const r2 = rand(i + 5);
      const r3 = rand(i + 8);
      const color = district.colors[Math.floor(r * district.colors.length)];
      const [minH, maxH] = district.heightRange;
      const height = minH + r2 * (maxH - minH);

      // Building footprint — varies by district
      let bw: number, bd: number;
      if (district.hasStalls) {
        // Market stalls: small boxes (1-2m)
        bw = 1 + r3 * 1.5;
        bd = 1 + r * 1.5;
      } else if (district.landmark === 'circle_station') {
        // Circle station: one large yellow structure
        bw = CELL_SIZE * 0.6;
        bd = CELL_SIZE * 0.6;
      } else {
        // Normal buildings: 3-6m wide
        bw = 3 + r2 * 3;
        bd = 3 + r * 3;
      }

      // Position within the cell (avoid edges)
      const offsetX = (r - 0.5) * (CELL_SIZE - bw - 2);
      const offsetZ = (r2 - 0.5) * (CELL_SIZE - bd - 2);

      items.push({
        position: [cx + offsetX, 0, cz + offsetZ],
        width: bw,
        depth: bd,
        height,
        color,
      });
    }
    return items;
  }, [cx, cz, district, buildingCount]);

  return (
    <group>
      {/* Cell ground/foundation pad */}
      <mesh position={[cx, 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[CELL_SIZE - 0.5, 0.01, CELL_SIZE - 0.5]} />
        <meshStandardMaterial
          color={district.landmark === 'beach' ? 0xf4e4c1 : 0x475569}
          roughness={0.8}
        />
      </mesh>

      {/* Buildings (skipped on reserved venue cells) */}
      {!reserved && buildings.map((b, i) => (
        <Building key={`b-${row}-${col}-${i}`} {...b} />
      ))}

      {/* District landmarks */}
      {district.landmark === 'circle_station' && (
        <group position={[cx, 0, cz]}>
          {/* Large yellow tro-tro station canopy */}
          <mesh position={[0, 8, 0]} castShadow>
            <cylinderGeometry args={[5, 5, 0.3, 12]} />
            <meshStandardMaterial color="#facc15" roughness={0.4} emissive="#facc15" emissiveIntensity={0.1} />
          </mesh>
          {/* Support pillars (4) */}
          {[[-4, -4], [4, -4], [-4, 4], [4, 4]].map(([px, pz], i) => (
            <mesh key={`pillar-${i}`} position={[px, 4, pz]} castShadow>
              <cylinderGeometry args={[0.15, 0.15, 8, 8]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.4} />
            </mesh>
          ))}
          {/* Tro-tro van (yellow box) */}
          <mesh position={[0, 1.5, -2]} castShadow>
            <boxGeometry args={[2.5, 2.5, 5]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.5} />
          </mesh>
        </group>
      )}

      {district.landmark === 'beach' && (
        <group position={[cx, 0, cz]}>
          {/* Sand mound */}
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[CELL_SIZE / 2 - 1, 16]} />
            <meshStandardMaterial color="#f4e4c1" roughness={0.95} />
          </mesh>
          {/* Palm tree (trunk + fronds) */}
          <mesh position={[2, 1.5, 1]} castShadow>
            <cylinderGeometry args={[0.12, 0.15, 3, 8]} />
            <meshStandardMaterial color="#6b4423" roughness={0.8} />
          </mesh>
          <mesh position={[2, 3.2, 1]}>
            <sphereGeometry args={[0.6, 8, 6]} />
            <meshStandardMaterial color="#16a34a" roughness={0.85} />
          </mesh>
        </group>
      )}

      {/* Market entrance arch for Makola */}
      {district.hasStalls && row === 1 && col === 1 && (
        <mesh position={[cx, 3, cz - CELL_SIZE / 2 + 0.5]} castShadow>
          <boxGeometry args={[CELL_SIZE - 2, 0.4, 0.3]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
      )}
    </group>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AccraCityGrid() {
  return (
    <group>
      {/* Ground plane (laterite earth) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[TOTAL_SIZE + 4, 0.02, TOTAL_SIZE + 4]} />
        <meshStandardMaterial color="#a6754b" roughness={0.94} />
      </mesh>

      {/* Roads (grid) */}
      <Roads />

      {/* City blocks (5x5 grid) */}
      {Array.from({ length: GRID_SIZE }).map((_, row) =>
        Array.from({ length: GRID_SIZE }).map((_, col) => (
          <Cell key={`cell-${row}-${col}`} row={row} col={col} />
        ))
      )}

      {/* District label markers (small colored poles at district centers) */}
      {[
        { pos: cellCenter(0, 0), color: 0xfde68a, label: 'Adabraka' },
        { pos: cellCenter(1, 1), color: 0xdc2626, label: 'Makola' },
        { pos: cellCenter(3, 2), color: 0xfacc15, label: 'Circle' },
        { pos: cellCenter(3, 3), color: 0x0ea5e9, label: 'Osu' },
        { pos: cellCenter(4, 0), color: 0x16a34a, label: 'Labadi' },
      ].map((m, i) => (
        <mesh key={`pole-${i}`} position={[m.pos[0], 0.5, m.pos[1]]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 1, 6]} />
          <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// ── Export constants for external use (player movement bounds, etc.) ────────

export { TOTAL_SIZE, HALF, CELL_SIZE, ROAD_WIDTH, cellCenter, districtAt };
