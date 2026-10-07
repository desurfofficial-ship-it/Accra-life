/**
 * Accra Life — GridMap: canonical custom 5x5 Accra city grid
 *
 * THE single source of truth for the custom map (phase-1-custom-map):
 *   - grid geometry (cell size, road width, world extents)
 *   - cell <-> world coordinate translation
 *   - district resolution (which Accra district owns a cell / world point)
 *   - zone -> LocationId mapping so every game system (location pill,
 *     chat rooms, presence, recovery actions) follows the custom map
 *   - tro-tro station cell + travel destination anchors
 *
 * Consumers:
 *   - src/r3f/AccraCityGrid.tsx renders the visuals FROM this module
 *   - src/game/World/Locations.ts resolves locations ON this grid first
 *   - src/r3f/TroTroBoarding.tsx teleports arrivals to district anchors
 *
 * Grid layout (row 0 = south, row 4 = north; x = column, z = row):
 *
 *   [0,4] [1,4] [2,4] [3,4] [4,4]    Labadi (west) | Osu (east)
 *   [0,3] [1,3] [2,3] [3,3] [4,3]
 *   [0,2] [1,2] [2,2] [3,2] [4,2]    Makola center | Circle station [3,2]
 *   [0,1] [1,1] [2,1] [3,1] [4,1]
 *   [0,0] [1,0] [2,0] [3,0] [4,0]    Adabraka (home, southwest)
 *
 * Each cell is CELL_SIZE meters; roads are ROAD_WIDTH meters between cells.
 * TOTAL_SIZE = 5 * 12 + 6 * 4 = 84 m. World origin (0,0) is the map center.
 */

import type { LocationId } from './Locations';

// ── Grid geometry ───────────────────────────────────────────────────────────

export const GRID_SIZE = 5;           // 5x5 city blocks
export const CELL_SIZE = 12;          // meters per city block
export const ROAD_WIDTH = 4;          // meters of road between cells
export const STEP = CELL_SIZE + ROAD_WIDTH;               // 16 m pitch
export const TOTAL_SIZE = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * ROAD_WIDTH; // 84 m
export const HALF = TOTAL_SIZE / 2;   // 42 m — world spans [-42, +42]

/** World-space rectangle for a grid cell (row = z index, col = x index). */
export interface CellRect {
  row: number;
  col: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// ── Districts ───────────────────────────────────────────────────────────────

/** District ids shared by the grid logic and the R3F visual palettes. */
export type GridDistrictId =
  | 'adabraka'   // warm cream/ochre residential (home)
  | 'makola'     // vibrant market reds + oranges
  | 'circle'     // yellow tro-tro station district
  | 'osu'        // blue/teal nightlife
  | 'labadi'     // green beach area
  | 'mixed';     // generic grey/brown

/**
 * District that owns a cell. Resolution ORDER matters and must stay in sync
 * with the map design: Adabraka corner wins first, then the Makola 2x2,
 * the Circle station cell, the Osu corner, the Labadi corner; rest mixed.
 */
export function districtAt(row: number, col: number): GridDistrictId {
  if (row <= 1 && col <= 1) return 'adabraka';
  if (row >= 1 && row <= 2 && col >= 1 && col <= 2) return 'makola';
  if (row === 3 && col === 2) return 'circle';
  if (row >= 3 && col >= 3) return 'osu';
  if (row >= 4 && col <= 1) return 'labadi';
  return 'mixed';
}

// ── Cell <-> world translation ──────────────────────────────────────────────

/** World-space center [x, z] of a grid cell [row, col]. */
export function cellCenter(row: number, col: number): [number, number] {
  const x = -HALF + ROAD_WIDTH + col * STEP + CELL_SIZE / 2;
  const z = -HALF + ROAD_WIDTH + row * STEP + CELL_SIZE / 2;
  return [x, z];
}

/** World-space rectangle covered by a cell (roads excluded). */
export function cellRect(row: number, col: number): CellRect {
  const minX = -HALF + ROAD_WIDTH + col * STEP;
  const minZ = -HALF + ROAD_WIDTH + row * STEP;
  return { row, col, minX, maxX: minX + CELL_SIZE, minZ, maxZ: minZ + CELL_SIZE };
}

export interface GridCell {
  row: number;
  col: number;
}

/**
 * Cell containing a world point, or null when the point lies on a road
 * strip or outside the grid. Roads are the ROAD_WIDTH gaps between cells.
 */
export function worldToCell(x: number, z: number): GridCell | null {
  const col = worldToIndex(x);
  const row = worldToIndex(z);
  if (col === null || row === null) return null;
  return { row, col };
}

function worldToIndex(v: number): number | null {
  const rel = v + HALF;               // 0..TOTAL_SIZE
  const idx = Math.floor((rel - ROAD_WIDTH) / STEP);
  if (idx < 0 || idx >= GRID_SIZE) return null;
  const local = rel - ROAD_WIDTH - idx * STEP;
  if (local < 0 || local >= CELL_SIZE) return null; // on a road strip
  return idx;
}

/** District owning a world point, or null on roads / outside the grid. */
export function districtForPosition(x: number, z: number): GridDistrictId | null {
  const cell = worldToCell(x, z);
  return cell ? districtAt(cell.row, cell.col) : null;
}

// ── Zone -> LocationId mapping ──────────────────────────────────────────────

/**
 * Zone vocabulary for the agent-facing grid contract (tro-tro-system.md
 * v2.1 GridLocation {x, z, zone}). Zone strings align with real LocationIds:
 * each zone maps onto exactly one LocationId used by HUD/chat/presence.
 */
export type GridZone = 'adabraka' | 'makola' | 'circle_station' | 'osu' | 'labadi';

export interface GridLocation {
  x: number; // grid column
  z: number; // grid row
  zone: GridZone;
}

const DISTRICT_TO_LOCATION: Record<Exclude<GridDistrictId, 'mixed'>, LocationId> = {
  adabraka: 'adabraka_neighborhood',
  makola: 'makola_market',
  circle: 'circle_trotro_stop',
  osu: 'osu_oxford_street',
  labadi: 'labadi_beach'
};

const ZONE_TO_DISTRICT: Record<GridZone, Exclude<GridDistrictId, 'mixed'>> = {
  adabraka: 'adabraka',
  makola: 'makola',
  circle_station: 'circle',
  osu: 'osu',
  labadi: 'labadi'
};

/** LocationId for a grid zone (total — every zone has a real LocationId). */
export function zoneToLocationId(zone: GridZone): LocationId {
  return DISTRICT_TO_LOCATION[ZONE_TO_DISTRICT[zone]];
}

/**
 * Resolve the game LocationId for a world point ON the custom grid map.
 * Returns null for roads and mixed-use cells so the caller can fall back
 * to the legacy location bounds (Locations.getLocationAt).
 */
export function resolveLocationIdOnGrid(x: number, z: number): LocationId | null {
  const district = districtForPosition(x, z);
  if (!district || district === 'mixed') return null;
  return DISTRICT_TO_LOCATION[district];
}

// ── Canonical cells ─────────────────────────────────────────────────────────

/** The Circle tro-tro station: cell column 2, row 3 (owner v2.1 vocabulary). */
export const TROTRO_STATION_GRID: GridLocation = { x: 2, z: 3, zone: 'circle_station' };
/** World-space [x, z] of the tro-tro station cell center. */
export const TROTRO_STATION_WORLD: [number, number] = cellCenter(
  TROTRO_STATION_GRID.z,
  TROTRO_STATION_GRID.x
); // [0, 16]

/** Tro-tro travel destinations — arrival anchor cell per destination. */
export interface TrotroDestination {
  id: 'circle' | 'makola' | 'osu' | 'labadi';
  name: string;
  row: number;
  col: number;
  /** LocationId the arrival cell resolves to (HUD pill follows). */
  locationId: LocationId;
}

// ── Venue anchors (custom map integration) ──────────────────────────────────

/**
 * World venues on the custom grid. The hidden systems layer (Phase1Scene
 * world builders) places each venue's group, collider and interactable AT
 * these anchors so interactable positions coincide with the visible R3F
 * map cells and resolve to the matching district LocationId.
 */
export interface VenueAnchor {
  grid: GridLocation;
  /** World-space [x, z] of the venue's group origin (cell center). */
  world: [number, number];
}

function makeVenueAnchor(grid: GridLocation): VenueAnchor {
  return { grid, world: cellCenter(grid.z, grid.x) };
}

/** Adabraka Provision Store & MoMo (ACC_SHOP_001 / provision_shop) — adabraka cell [row 0, col 1]. */
export const PROVISION_STORE_ANCHOR: VenueAnchor = makeVenueAnchor({
  x: 1,
  z: 0,
  zone: 'adabraka'
}); // world [-16, -32]

/** Sister Akosua's Waakye & Jollof Joint (ACC_RESTAURANT_001 / food_vendor) — makola cell [row 1, col 2]. */
export const FOOD_VENDOR_ANCHOR: VenueAnchor = makeVenueAnchor({
  x: 2,
  z: 1,
  zone: 'makola'
}); // world [0, -16]

/** Tro-tro travel destinations — arrival anchor cell per destination. */
export const TROTRO_DESTINATIONS: readonly TrotroDestination[] = [
  { id: 'circle', name: 'Circle', row: 3, col: 2, locationId: 'circle_trotro_stop' },
  { id: 'makola', name: 'Makola Market', row: 2, col: 2, locationId: 'makola_market' },
  { id: 'osu', name: 'Osu', row: 3, col: 3, locationId: 'osu_oxford_street' },
  { id: 'labadi', name: 'Labadi Beach', row: 4, col: 0, locationId: 'labadi_beach' }
];

/** World-space [x, z] arrival point for a destination id. */
export function destinationArrival(id: TrotroDestination['id']): [number, number] | null {
  const dest = TROTRO_DESTINATIONS.find((d) => d.id === id);
  return dest ? cellCenter(dest.row, dest.col) : null;
}
