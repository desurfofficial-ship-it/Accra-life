import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { HOUSING_TIERS, type HousingTierId } from '../Home/HomeSystem';
import { HOME_COMPOUND_ANCHOR } from './GridMap';

/**
 * Compound world anchor — adabraka grid cell [row 0, col 1] (world
 * [-16, -32], per GridMap.HOME_COMPOUND_ANCHOR). Every absolute position
 * in this module (group origin, wall colliders, doorway interactable,
 * cutaway zones) derives from these two numbers so the compound always
 * coincides with the visible custom map cell.
 */
const COMPOUND_X = HOME_COMPOUND_ANCHOR.world[0];
const COMPOUND_Z = HOME_COMPOUND_ANCHOR.world[1];

let compoundRootGroup: THREE.Group | null = null;
let dynamicHouseShellGroup: THREE.Group | null = null;
let compoundRoofCutawayGroup: THREE.Group | null = null;
let compoundFrontFullWallsGroup: THREE.Group | null = null;
let compoundFrontCutawayRimGroup: THREE.Group | null = null;
let worldCollidersRef: ColliderBox[] | null = null;
let currentBuiltTierId: HousingTierId = 'single_room';
let isCutawayActive = false;

const HOUSE_WALL_COLLIDER_IDS = new Set([
  'ACC_HOUSE_001_WALL_N',
  'ACC_HOUSE_001_WALL_W_IN',
  'ACC_HOUSE_001_WALL_E_IN',
  'ACC_HOUSE_001_WALL_S_L',
  'ACC_HOUSE_001_WALL_S_R'
]);

export function isPlayerInCompoundCutaway(): boolean {
  return isCutawayActive;
}

// Debounce: minimum ms between cutaway toggles. Prevents rapid flicker
// when the player stands at the boundary (e.g., in the doorway).
const CUTAWAY_TOGGLE_MIN_MS = 250;
let lastCutawayToggleMs = 0;

export function updatePlayerCompoundCutaway(playerPos: THREE.Vector3): boolean {
  // Wide hysteresis deadzone: prevents rapid flicker when moving near
  // doorway / veranda. Activation zone is generously INSIDE the room;
  // deactivation only triggers when clearly OUTSIDE the compound walls.
  let newState = isCutawayActive;
  if (isCutawayActive) {
    // Deactivate only when clearly outside the compound (wide margin,
    // relative to the compound anchor — same margins as the original
    // old-world placement: ±5.3 m on X, -4.4/+4.6 m on Z).
    if (
      playerPos.x < COMPOUND_X - 5.3 ||
      playerPos.x > COMPOUND_X + 5.3 ||
      playerPos.z < COMPOUND_Z - 4.4 ||
      playerPos.z > COMPOUND_Z + 4.6
    ) {
      newState = false;
    }
  } else {
    // Activate only when clearly inside the room (deep margin to avoid
    // doorway jitter — the doorway sits 1.6 m south of the anchor,
    // activation requires z > COMPOUND_Z - 2.7).
    if (
      playerPos.x >= COMPOUND_X - 4.3 &&
      playerPos.x <= COMPOUND_X + 4.3 &&
      playerPos.z >= COMPOUND_Z - 2.7 &&
      playerPos.z <= COMPOUND_Z + 3.3
    ) {
      newState = true;
    }
  }

  // Debounce: don't toggle more than once per 250ms. This eliminates
  // flicker when the player is standing right at the boundary and
  // collision resolution pushes them back and forth by a few cm.
  if (newState !== isCutawayActive) {
    const now = performance.now();
    if (now - lastCutawayToggleMs >= CUTAWAY_TOGGLE_MIN_MS) {
      isCutawayActive = newState;
      lastCutawayToggleMs = now;
    }
  }

  if (compoundRoofCutawayGroup) {
    compoundRoofCutawayGroup.visible = !isCutawayActive;
  }
  if (compoundFrontFullWallsGroup) {
    compoundFrontFullWallsGroup.visible = !isCutawayActive;
  }
  if (compoundFrontCutawayRimGroup) {
    compoundFrontCutawayRimGroup.visible = isCutawayActive;
  }
  return isCutawayActive;
}

export function rebuildPlayerCompoundForTier(tierId: HousingTierId): void {
  currentBuiltTierId = tierId;
  if (!compoundRootGroup || !worldCollidersRef) return;

  if (dynamicHouseShellGroup) {
    compoundRootGroup.remove(dynamicHouseShellGroup);
    dynamicHouseShellGroup = null;
  }

  // Remove old dynamic house wall colliders while preserving compound perimeter colliders
  for (let i = worldCollidersRef.length - 1; i >= 0; i--) {
    if (HOUSE_WALL_COLLIDER_IDS.has(worldCollidersRef[i].id)) {
      worldCollidersRef.splice(i, 1);
    }
  }

  const built = createDynamicHouseShell(tierId, worldCollidersRef);
  dynamicHouseShellGroup = built.shellGroup;
  compoundRoofCutawayGroup = built.roofGroup;
  compoundFrontFullWallsGroup = built.frontFullGroup;
  compoundFrontCutawayRimGroup = built.frontCutawayGroup;
  compoundRootGroup.add(dynamicHouseShellGroup);
}

function createDynamicHouseShell(
  tierId: HousingTierId,
  colliders: ColliderBox[]
): {
  shellGroup: THREE.Group;
  roofGroup: THREE.Group;
  frontFullGroup: THREE.Group;
  frontCutawayGroup: THREE.Group;
} {
  const tier =
    HOUSING_TIERS.find((t) => t.id === tierId) ?? HOUSING_TIERS[0];

  const shellGroup = new THREE.Group();
  shellGroup.name = `ACC_HOUSE_SHELL_${tier.id}`;

  const wallColors: Record<HousingTierId, number> = {
    single_room: 0xfde68a,
    chamber_kitchen_bath: 0xfef08a,
    self_contained: 0xd9f99d,
    one_bed_apartment: 0xbae6fd,
    premium_apartment: 0xe2e8f0,
    luxury_house: 0xfef9c3
  };
  const matWallExterior = sharedArtLibrary.getMaterial(`house_wall_ext_${tier.id}`, {
    color: wallColors[tier.id],
    roughness: 0.68
  });
  const matWallInterior = sharedArtLibrary.getMaterial('house_wall_interior_warm', {
    color: 0xfef3c7,
    roughness: 0.76
  });
  const matTerracottaPlinth = sharedArtLibrary.getMaterial('house_plinth_terra', {
    color: 0xb45309,
    roughness: 0.78
  });
  const matRoofRust = sharedArtLibrary.getMaterial('house_roof_terra_corrugated', {
    map: sharedArtLibrary.getCorrugatedRoofTexture('#9a3412', '#7c2d12'),
    roughness: 0.58
  });
  const matWoodDark = sharedArtLibrary.getMaterial('house_wood_mahogany', {
    color: 0x78350f,
    roughness: 0.52
  });
  const matWoodWarm = sharedArtLibrary.getMaterial('house_wood_warm', {
    color: 0xb45309,
    roughness: 0.6
  });
  const matGlassWindow = sharedArtLibrary.getMaterial('house_window_glass', {
    color: 0x38bdf8,
    roughness: 0.22,
    metalness: 0.25
  });
  const matWhiteTrim = sharedArtLibrary.getMaterial('house_white_trim', {
    color: 0xf8fafc,
    roughness: 0.52
  });
  const matIronWork = sharedArtLibrary.getMaterial('house_ironwork', {
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.55
  });

  // Physical dimensions from HousingTierDef:
  // Starter Single Room = 4.0m × 3.5m (14 m²)
  // Upgrades expand up to 8.8m × 5.6m
  const wallH = 3.25;
  const wallT = 0.28;
  const roomW = tier.roomWidthM;
  const roomD = tier.roomDepthM;
  const roomY = 0.24 + wallH / 2;
  // Anchor front wall around local Z = -1.6 (world Z = 10.6) so doorway aligns with veranda
  const southWallZ = -1.6 + wallT / 2;
  const roomZ = -1.6 + roomD / 2;
  const northWallZ = -1.6 + roomD - wallT / 2;

  const interiorFloorMat = sharedArtLibrary.getMaterial('house_interior_tile_floor', {
    map: sharedArtLibrary.getRoomTileFloorTexture(),
    roughness: tier.level >= 4 ? 0.38 : 0.68,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const interiorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(roomW - 0.06, 0.04, roomD - 0.06),
    interiorFloorMat
  );
  // Top surface at 0.228 + 0.02 = 0.248 (sits cleanly above 0.240 terrace plinth to prevent depth fighting)
  interiorFloor.position.set(0, 0.228, roomZ);
  interiorFloor.receiveShadow = true;
  shellGroup.add(interiorFloor);

  // Back (North), West, and East walls (always visible in 3-wall cutaway view)
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, wallT), matWallExterior);
  wallN.position.set(0, roomY, northWallZ);
  wallN.castShadow = true;
  wallN.receiveShadow = true;

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), matWallExterior);
  wallW.position.set(-roomW / 2 + wallT / 2, roomY, roomZ);
  wallW.castShadow = true;
  wallW.receiveShadow = true;

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), matWallExterior);
  wallE.position.set(roomW / 2 - wallT / 2, roomY, roomZ);
  wallE.castShadow = true;
  wallE.receiveShadow = true;

  const baseboardN = new THREE.Mesh(
    new THREE.BoxGeometry(roomW - wallT * 2, 0.14, 0.04),
    matTerracottaPlinth
  );
  baseboardN.position.set(0, 0.31, northWallZ - wallT / 2 - 0.02);
  shellGroup.add(wallN, wallW, wallE, baseboardN);

  // Wall poster & barred window on back wall for authentic Accra room feel
  const poster = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.68, 0.03),
    matWhiteTrim
  );
  poster.position.set(-roomW * 0.22, 1.85, northWallZ - wallT / 2 - 0.02);
  const posterHeader = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.16, 0.04),
    sharedArtLibrary.getMaterial('poster_red', { color: 0xdc2626, roughness: 0.6 })
  );
  posterHeader.position.set(-roomW * 0.22, 2.08, northWallZ - wallT / 2 - 0.025);
  const backWinFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.95, 0.08),
    matWhiteTrim
  );
  backWinFrame.position.set(roomW * 0.18, 1.9, northWallZ - wallT / 2 - 0.02);
  const backWinGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 0.78, 0.02),
    matGlassWindow
  );
  backWinGlass.position.set(roomW * 0.18, 1.9, northWallZ - wallT / 2 - 0.02);
  shellGroup.add(poster, posterHeader, backWinFrame, backWinGlass);

  // NOTE: buildBuiltInTierInterior() is intentionally NOT called. Per the
  // housing spec (section 2): "The starter room must contain: ZERO beds,
  // ZERO chairs, ZERO tables, ZERO sofas, ZERO TV, ZERO refrigerator,
  // ZERO cooker, ZERO wardrobe, etc." The player buys + places their own
  // furniture via the Home Store + PlacementEngine. The structural shell
  // (walls, floor, door, windows, roof, poster, baseboard) is built above
  // in createDynamicHouseShell — only the furniture fixtures are skipped.

  // Doorway gap (1.42m on 14 m² starter room, 1.62m on larger tiers)
  const doorGap = tier.level === 1 ? 1.42 : 1.62;
  const southHalf = Math.max(0.6, (roomW - doorGap) / 2);

  // Full front facade group (visible from outside; cuts away when inside)
  const frontFullGroup = new THREE.Group();
  frontFullGroup.name = 'ACC_HOUSE_001_FRONT_FULL';
  frontFullGroup.visible = !isCutawayActive;

  const wallSL = new THREE.Mesh(new THREE.BoxGeometry(southHalf, wallH, wallT), matWallExterior);
  wallSL.position.set(-roomW / 2 + southHalf / 2, roomY, southWallZ);
  wallSL.castShadow = true;
  wallSL.receiveShadow = true;

  const wallSR = new THREE.Mesh(new THREE.BoxGeometry(southHalf, wallH, wallT), matWallExterior);
  wallSR.position.set(roomW / 2 - southHalf / 2, roomY, southWallZ);
  wallSR.castShadow = true;
  wallSR.receiveShadow = true;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.2, 0.68, wallT), matWallExterior);
  lintel.position.set(0, 0.24 + wallH - 0.34, southWallZ);
  frontFullGroup.add(wallSL, wallSR, lintel);

  // Door frame & open mahogany door
  const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.45, 0.32), matWhiteTrim);
  jambL.position.set(-doorGap / 2 + 0.04, 1.46, southWallZ);
  const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.45, 0.32), matWhiteTrim);
  jambR.position.set(doorGap / 2 - 0.04, 1.46, southWallZ);
  const jambTop = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.08, 0.1, 0.34), matWhiteTrim);
  jambTop.position.set(0, 2.68, southWallZ);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.3, 0.06), matWoodDark);
  doorPanel.position.set(doorGap / 2 + 0.38, 1.4, southWallZ + 0.26);
  doorPanel.rotation.y = -0.35;
  frontFullGroup.add(jambL, jambR, jambTop, doorPanel);

  // Front windows scaled to room width
  if (southHalf >= 1.15) {
    const winOffset = -roomW / 2 + southHalf / 2;
    for (const wx of [winOffset, -winOffset]) {
      const winW = Math.min(1.25, southHalf - 0.36);
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(winW, 1.15, wallT + 0.06), matWhiteTrim);
      winFrame.position.set(wx, 1.88, southWallZ);
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.16, 0.98, 0.04), matGlassWindow);
      winGlass.position.set(wx, 1.88, southWallZ);
      frontFullGroup.add(winFrame, winGlass);
      for (const barY of [1.62, 1.88, 2.14]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.12, 0.025, wallT + 0.08), matIronWork);
        bar.position.set(wx, barY, southWallZ);
        frontFullGroup.add(bar);
      }
    }
  }

  // Veranda pillars along front terrace
  const pillarPositions =
    roomW <= 4.4 ? [-1.85, 1.85] : [-roomW / 2 + 0.35, -1.25, 1.25, roomW / 2 - 0.35];
  for (const px of pillarPositions) {
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.3), matTerracottaPlinth);
    colBase.position.set(px, 0.41, -2.85);
    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.88, 14), matWhiteTrim);
    colShaft.position.set(px, 1.98, -2.85);
    colShaft.castShadow = true;
    frontFullGroup.add(colBase, colShaft);
  }
  shellGroup.add(frontFullGroup);

  // Low cutaway front rim group (visible when inside so player sees wall boundary & full legs)
  const frontCutawayGroup = new THREE.Group();
  frontCutawayGroup.name = 'ACC_HOUSE_001_FRONT_CUTAWAY';
  frontCutawayGroup.visible = isCutawayActive;
  const rimH = 0.28;
  const rimSL = new THREE.Mesh(new THREE.BoxGeometry(southHalf, rimH, wallT - 0.02), matWallInterior);
  rimSL.position.set(-roomW / 2 + southHalf / 2, 0.24 + rimH / 2, southWallZ);
  const rimSLCap = new THREE.Mesh(new THREE.BoxGeometry(southHalf, 0.04, wallT + 0.02), matWoodWarm);
  rimSLCap.position.set(-roomW / 2 + southHalf / 2, 0.24 + rimH + 0.02, southWallZ);
  const rimSR = new THREE.Mesh(new THREE.BoxGeometry(southHalf, rimH, wallT - 0.02), matWallInterior);
  rimSR.position.set(roomW / 2 - southHalf / 2, 0.24 + rimH / 2, southWallZ);
  const rimSRCap = new THREE.Mesh(new THREE.BoxGeometry(southHalf, 0.04, wallT + 0.02), matWoodWarm);
  rimSRCap.position.set(roomW / 2 - southHalf / 2, 0.24 + rimH + 0.02, southWallZ);
  frontCutawayGroup.add(rimSL, rimSLCap, rimSR, rimSRCap);
  shellGroup.add(frontCutawayGroup);

  // Roof group (cuts away when player steps onto veranda/room)
  const roofGroup = new THREE.Group();
  roofGroup.name = 'ACC_HOUSE_001_ROOF';
  roofGroup.visible = !isCutawayActive;
  const roofSpanW = Math.max(roomW + 0.8, 4.8);
  const roofSpanD = roomD + 1.5;
  const roofCenterZ = roomZ - 0.35;

  const eaveSoffit = new THREE.Mesh(new THREE.BoxGeometry(roofSpanW, 0.14, roofSpanD), matWhiteTrim);
  eaveSoffit.position.set(0, 3.55, roofCenterZ);
  eaveSoffit.castShadow = true;
  roofGroup.add(eaveSoffit);

  const slopeDepth = roofSpanD * 0.56;
  const frontRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(roofSpanW, 0.13, slopeDepth), matRoofRust);
  frontRoofSlope.position.set(0, 3.98, roofCenterZ - roofSpanD * 0.24);
  frontRoofSlope.rotation.x = 0.28;
  frontRoofSlope.castShadow = true;
  const rearRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(roofSpanW, 0.13, slopeDepth), matRoofRust);
  rearRoofSlope.position.set(0, 3.98, roofCenterZ + roofSpanD * 0.24);
  rearRoofSlope.rotation.x = -0.28;
  rearRoofSlope.castShadow = true;
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(roofSpanW + 0.08, 0.16, 0.32), matTerracottaPlinth);
  ridgeBeam.position.set(0, 4.42, roofCenterZ);
  roofGroup.add(frontRoofSlope, rearRoofSlope, ridgeBeam);
  shellGroup.add(roofGroup);

  // Dynamic World-Space Wall Colliders (group offset = compound anchor,
  // GridMap.HOME_COMPOUND_ANCHOR: adabraka cell [row 0, col 1])
  const gx = COMPOUND_X;
  const gz = COMPOUND_Z;
  const minX = gx - roomW / 2 - 0.08;
  const maxX = gx + roomW / 2 + 0.08;
  const minZ = gz - 1.6 - 0.06;
  const maxZ = gz - 1.6 + roomD + 0.08;
  const doorMinX = gx - doorGap / 2;
  const doorMaxX = gx + doorGap / 2;

  colliders.push(
    // North (back) wall of room
    {
      id: 'ACC_HOUSE_001_WALL_N',
      minX,
      maxX,
      minZ: maxZ - wallT - 0.14,
      maxZ: maxZ + 0.08,
      height: 3.5
    },
    // West wall of room
    {
      id: 'ACC_HOUSE_001_WALL_W_IN',
      minX: minX - 0.06,
      maxX: minX + wallT + 0.14,
      minZ,
      maxZ,
      height: 3.5
    },
    // East wall of room
    {
      id: 'ACC_HOUSE_001_WALL_E_IN',
      minX: maxX - wallT - 0.14,
      maxX: maxX + 0.06,
      minZ,
      maxZ,
      height: 3.5
    },
    // Front-Left (South-West) wall segment
    {
      id: 'ACC_HOUSE_001_WALL_S_L',
      minX,
      maxX: doorMinX,
      minZ: minZ - 0.05,
      maxZ: minZ + wallT + 0.14,
      height: 3.5
    },
    // Front-Right (South-East) wall segment
    {
      id: 'ACC_HOUSE_001_WALL_S_R',
      minX: doorMaxX,
      maxX,
      minZ: minZ - 0.05,
      maxZ: minZ + wallT + 0.14,
      height: 3.5
    }
  );

  return { shellGroup, roofGroup, frontFullGroup, frontCutawayGroup };
}

/**
 * Populates the built-in fixtures for the active Housing Tier so:
 * - Tier 1 (14 m² Single Room — 4.0m × 3.5m) has its humble, cozy starter setup:
 *   Bed, Small wardrobe, Standing fan, Small table + radio, Basic camp stove & Kufuor gallon,
 *   and an outdoor Shared Bathroom stall on the compound terrace.
 * - Tier 2+ (25 m² Self-Contained, 38 m², 55 m² Apartment, 80 m² Premium, 140 m² Luxury)
 *   visibly adds an indoor private bathroom partition (WC + washbasin), fitted kitchenette
 *   (counter, stove, sink, fridge), upgraded bed, and multi-room living divisions!
 */
function buildBuiltInTierInterior(
  shellGroup: THREE.Group,
  tierId: HousingTierId,
  roomW: number,
  roomD: number,
  southWallZ: number,
  northWallZ: number,
  wallT: number
): void {
  const floorY = 0.248;
  const innerWestX = -roomW / 2 + wallT + 0.06;
  const innerEastX = roomW / 2 - wallT - 0.06;
  const innerNorthZ = northWallZ - wallT / 2 - 0.06;
  const innerSouthZ = southWallZ + wallT / 2 + 0.06;

  const matWood = sharedArtLibrary.getMaterial('starter_wood', { color: 0x92400e, roughness: 0.65 });
  const matLightWood = sharedArtLibrary.getMaterial('starter_light_wood', { color: 0xd97706, roughness: 0.6 });
  const matSheet = sharedArtLibrary.getMaterial('starter_sheet', { color: 0xf8fafc, roughness: 0.55 });
  const matBlanket = sharedArtLibrary.getMaterial('starter_blanket', { color: 0xc2410c, roughness: 0.75 });
  const matMetal = sharedArtLibrary.getMaterial('starter_metal', { color: 0x475569, roughness: 0.4, metalness: 0.45 });
  const matGallonYellow = sharedArtLibrary.getMaterial('starter_kufuor_gallon', { color: 0xeab308, roughness: 0.45 });
  const matCoolerBlue = sharedArtLibrary.getMaterial('starter_cooler_blue', { color: 0x1d4ed8, roughness: 0.45 });
  const matCeramicWhite = sharedArtLibrary.getMaterial('starter_ceramic', { color: 0xffffff, roughness: 0.25 });
  const matPartition = sharedArtLibrary.getMaterial('starter_partition', { color: 0xfef3c7, roughness: 0.7 });

  // 1. BED (Starter Single Bed in 14 m², Queen/King Bed in 25 m²+)
  const isUpgradedBed = tierId !== 'single_room';
  const bedW = isUpgradedBed ? 1.25 : 0.92;
  const bedD = isUpgradedBed ? 1.65 : 1.48;
  const bedGroup = new THREE.Group();
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.22, bedD), matWood);
  bedFrame.position.y = 0.11;
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.06, 0.12, bedD - 0.06), matSheet);
  mattress.position.y = 0.26;
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.04, 0.13, bedD * 0.62), matBlanket);
  blanket.position.set(0, 0.265, bedD * 0.16);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(bedW * 0.55, 0.08, 0.26), matSheet);
  pillow.position.set(0, 0.34, -bedD * 0.32);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.52, 0.08), matWood);
  headboard.position.set(0, 0.32, -bedD / 2 + 0.04);
  bedGroup.add(bedFrame, mattress, blanket, pillow, headboard);
  bedGroup.position.set(innerWestX + bedW / 2 + 0.06, floorY, innerNorthZ - bedD / 2 - 0.06);
  shellGroup.add(bedGroup);

  // 2. SMALL WARDROBE (next to the bed along the back wall)
  const wardrobe = new THREE.Group();
  const wardBody = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.38, 0.42), matWood);
  wardBody.position.y = 0.69;
  const wardLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.26, 0.44), matMetal);
  wardLine.position.y = 0.69;
  wardrobe.add(wardBody, wardLine);
  wardrobe.position.set(innerWestX + bedW + 0.48, floorY, innerNorthZ - 0.24);
  shellGroup.add(wardrobe);

  // 3. SMALL TABLE & RADIO (back wall center)
  const radioTable = new THREE.Group();
  const rtTop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.48, 0.42), matLightWood);
  rtTop.position.y = 0.24;
  const radioBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.16), matMetal);
  radioBox.position.set(0, 0.57, 0);
  radioTable.add(rtTop, radioBox);
  radioTable.position.set(0.1, floorY, innerNorthZ - 0.24);
  shellGroup.add(radioTable);

  // 4. STANDING FAN (front-west corner inside room)
  const fan = new THREE.Group();
  const fanBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 12), matMetal);
  fanBase.position.y = 0.025;
  const fanPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.92, 8), matMetal);
  fanPole.position.y = 0.48;
  const fanCage = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14), matGlassWindowMaterial());
  fanCage.rotation.x = Math.PI / 2;
  fanCage.position.set(0, 0.95, 0.04);
  fan.add(fanBase, fanPole, fanCage);
  fan.position.set(innerWestX + 0.28, floorY, innerSouthZ + 0.32);
  shellGroup.add(fan);

  if (tierId === 'single_room') {
    // TIER 1 (14 m² Single Room):
    // Basic cooking setup inside (small stove table + pot + blue cooler + yellow Kufuor water gallon)
    const cookGroup = new THREE.Group();
    const stoveTable = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.46, 0.44), matLightWood);
    stoveTable.position.y = 0.23;
    const burner = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.26), matMetal);
    burner.position.set(0, 0.49, 0);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.14, 12), matMetal);
    pot.position.set(0, 0.58, 0);
    const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.36), matCoolerBlue);
    cooler.position.set(0, 0.17, 0.48);
    const gallon = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.22), matGallonYellow);
    gallon.position.set(0.1, 0.17, 0.9);
    cookGroup.add(stoveTable, burner, pot, cooler, gallon);
    cookGroup.position.set(innerEastX - 0.36, floorY, innerNorthZ - 0.55);
    shellGroup.add(cookGroup);

    // Outdoor Shared Compound Bathroom Stall on the east terrace (since 14 m² starter uses shared bath!)
    const sharedBath = new THREE.Group();
    const bathWalls = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.85, 1.35), matPartition);
    bathWalls.position.y = 0.925;
    const bathDoor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.65, 0.06), matWood);
    bathDoor.position.set(0, 0.825, -0.68);
    const outdoorGallon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.24), matGallonYellow);
    outdoorGallon.position.set(-0.85, 0.18, -0.35);
    sharedBath.add(bathWalls, bathDoor, outdoorGallon);
    sharedBath.position.set(3.4, floorY, 2.1);
    shellGroup.add(sharedBath);
  } else {
    // TIER 2+ (25 m² Self-Contained, 38 m², 55 m² Apartment, 80 m² Premium, 140 m² Luxury):
    // 1. Indoor Kitchenette along Back-East wall (Counter + Sink + 2-Burner Stove + Fridge)
    const kitchenGroup = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.68, 0.5), matLightWood);
    counter.position.y = 0.34;
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.05, 0.54), matCeramicWhite);
    counterTop.position.y = 0.7;
    const stove = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.36), matMetal);
    stove.position.set(-0.28, 0.74, 0);
    const sink = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.34), matMetal);
    sink.position.set(0.3, 0.73, 0);
    const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.32, 0.52), matCeramicWhite);
    fridge.position.set(0.95, 0.66, 0);
    kitchenGroup.add(counter, counterTop, stove, sink, fridge);
    kitchenGroup.position.set(innerEastX - 1.35, floorY, innerNorthZ - 0.32);
    shellGroup.add(kitchenGroup);

    // 2. Indoor Private Bathroom in South-East corner (Low cutaway partition walls + WC + Washbasin)
    const bathGroup = new THREE.Group();
    const partW = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 1.55), matPartition);
    partW.position.set(-0.78, 0.475, 0);
    const partN = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 0.12), matPartition);
    partN.position.set(0, 0.475, -0.78);
    const wcTank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.22), matCeramicWhite);
    wcTank.position.set(0.38, 0.45, 0.45);
    const wcBowl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.46), matCeramicWhite);
    wcBowl.position.set(0.38, 0.18, 0.25);
    const basin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.34), matCeramicWhite);
    basin.position.set(-0.32, 0.34, -0.45);
    bathGroup.add(partW, partN, wcTank, wcBowl, basin);
    bathGroup.position.set(innerEastX - 0.82, floorY, innerSouthZ + 0.82);
    shellGroup.add(bathGroup);

    // 3. Multi-room Living / Bedroom low cutaway divider for Tier 4+ (55 m² Apartment, 80 m², 140 m²)
    if (
      tierId === 'one_bed_apartment' ||
      tierId === 'premium_apartment' ||
      tierId === 'luxury_house'
    ) {
      const bedroomDivider = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.85, roomD * 0.55),
        matPartition
      );
      bedroomDivider.position.set(-roomW * 0.12, floorY + 0.425, innerNorthZ - roomD * 0.28);
      shellGroup.add(bedroomDivider);
    }
  }
}

function matGlassWindowMaterial(): THREE.Material {
  return sharedArtLibrary.getMaterial('fan_cage_blue', {
    color: 0x38bdf8,
    roughness: 0.35
  });
}

export function buildPlayerCompoundHouse(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  worldCollidersRef = colliders;

  const group = new THREE.Group();
  group.name = 'ACC_HOUSE_001';
  group.position.set(COMPOUND_X, 0, COMPOUND_Z);
  compoundRootGroup = group;

  const matTerracottaPlinth = sharedArtLibrary.getMaterial('house_plinth_terra', {
    color: 0xb45309,
    roughness: 0.78
  });
  const matWhiteTrim = sharedArtLibrary.getMaterial('house_white_trim', {
    color: 0xf8fafc,
    roughness: 0.58
  });
  const matCompoundWall = sharedArtLibrary.getMaterial('house_compound_breezeblock', {
    map: sharedArtLibrary.getBreezeBlockWallTexture(),
    roughness: 0.78
  });
  const matIronWork = sharedArtLibrary.getMaterial('house_ironwork', {
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.55
  });
  const matPolyTank = sharedArtLibrary.getMaterial('house_polytank', {
    color: 0x111827,
    roughness: 0.34
  });

  const courtyardTileMat = sharedArtLibrary.getMaterial('house_courtyard_tile', {
    color: 0xe2e8f0,
    roughness: 0.74
  });
  const courtyard = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.1, 8.2), courtyardTileMat);
  courtyard.position.set(0, 0.05, 0);
  courtyard.receiveShadow = true;
  const gateApron = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.55), courtyardTileMat);
  gateApron.position.set(0, 0.05, -4.32);
  gateApron.receiveShadow = true;
  group.add(courtyard, gateApron);

  // Full compound house terrace plinth (top strictly at Y = 0.24 so all 6 housing tiers rest flush at Y = 0.24)
  const terracePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 0.24, 6.7),
    matTerracottaPlinth
  );
  terracePlinth.position.set(0, 0.12, 0.25);
  terracePlinth.receiveShadow = true;
  group.add(terracePlinth);

  const verandaStep = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.52), matTerracottaPlinth);
  verandaStep.position.set(0, 0.08, -3.32);
  verandaStep.receiveShadow = true;
  group.add(verandaStep);

  // Build initial dynamic house shell (defaults to 14 m² Single Room or synced tier)
  const built = createDynamicHouseShell(currentBuiltTierId, colliders);
  dynamicHouseShellGroup = built.shellGroup;
  compoundRoofCutawayGroup = built.roofGroup;
  compoundFrontFullWallsGroup = built.frontFullGroup;
  compoundFrontCutawayRimGroup = built.frontCutawayGroup;
  group.add(dynamicHouseShellGroup);

  // Compound perimeter walls & decorative iron gate pillars
  const leftFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.55, 0.36), matCompoundWall);
  leftFrontWall.position.set(-3.2, 0.78, -3.95);
  leftFrontWall.castShadow = true;
  const rightFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.55, 0.36), matCompoundWall);
  rightFrontWall.position.set(3.2, 0.78, -3.95);
  rightFrontWall.castShadow = true;

  for (const side of [-1, 1]) {
    const gx = side * 1.55;
    const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.82, 0.48), matTerracottaPlinth);
    gatePillar.position.set(gx, 0.91, -3.95);
    gatePillar.castShadow = true;
    const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.56), matWhiteTrim);
    pillarCap.position.set(gx, 1.86, -3.95);
    group.add(gatePillar, pillarCap);
  }

  const sideWallGeo = new THREE.BoxGeometry(0.36, 1.65, 8.28);
  const westWall = new THREE.Mesh(sideWallGeo, matCompoundWall);
  westWall.position.set(-4.66, 0.82, 0);
  westWall.castShadow = true;
  const eastWall = new THREE.Mesh(sideWallGeo, matCompoundWall);
  eastWall.position.set(4.66, 0.82, 0);
  eastWall.castShadow = true;
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.68, 1.65, 0.36), matCompoundWall);
  backWall.position.set(0, 0.82, 3.96);
  backWall.castShadow = true;
  group.add(leftFrontWall, rightFrontWall, westWall, eastWall, backWall);

  // Polytank water tower on steel truss stand
  const towerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), matIronWork);
  for (const [lx, lz] of [
    [-0.35, -0.35],
    [0.35, -0.35],
    [-0.35, 0.35],
    [0.35, 0.35]
  ] as [number, number][]) {
    const leg = towerLeg.clone();
    leg.position.set(4.15 + lx, 1.6, 3.1 + lz);
    group.add(leg);
  }
  const tankPlatform = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 0.95), matIronWork);
  tankPlatform.position.set(4.15, 3.2, 3.1);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 1.15, 16), matPolyTank);
  tank.position.set(4.15, 3.82, 3.1);
  tank.castShadow = true;
  group.add(tankPlatform, tank);

  scene.add(group);

  // Outer compound perimeter colliders (always active; all boxes derived
  // from the compound anchor — identical relative offsets as before)
  colliders.push(
    // Polytank tower in back-east corner
    { id: 'ACC_HOUSE_001_POLYTANK', minX: COMPOUND_X + 3.65, maxX: COMPOUND_X + 4.65, minZ: COMPOUND_Z + 2.55, maxZ: COMPOUND_Z + 3.65, height: 4.4 },
    // Compound front wall left of gate
    { id: 'ACC_HOUSE_001_WALL_L', minX: COMPOUND_X - 5.05, maxX: COMPOUND_X - 1.32, minZ: COMPOUND_Z - 4.28, maxZ: COMPOUND_Z - 3.62, height: 1.8 },
    // Compound front wall right of gate
    { id: 'ACC_HOUSE_001_WALL_R', minX: COMPOUND_X + 1.32, maxX: COMPOUND_X + 5.05, minZ: COMPOUND_Z - 4.28, maxZ: COMPOUND_Z - 3.62, height: 1.8 },
    // Compound outer West wall
    { id: 'ACC_HOUSE_001_WALL_W', minX: COMPOUND_X - 5.08, maxX: COMPOUND_X - 4.32, minZ: COMPOUND_Z - 4.28, maxZ: COMPOUND_Z + 4.35, height: 1.8 },
    // Compound outer East wall
    { id: 'ACC_HOUSE_001_WALL_E', minX: COMPOUND_X + 4.32, maxX: COMPOUND_X + 5.08, minZ: COMPOUND_Z - 4.28, maxZ: COMPOUND_Z + 4.35, height: 1.8 },
    // Compound outer Back wall
    { id: 'ACC_HOUSE_001_WALL_BACK', minX: COMPOUND_X - 5.08, maxX: COMPOUND_X + 5.08, minZ: COMPOUND_Z + 3.62, maxZ: COMPOUND_Z + 4.35, height: 1.8 }
  );

  interactables.push({
    id: 'home_door',
    assetId: 'ACC_HOUSE_001',
    title: 'Your Home',
    promptLabel: 'Home · Rest & Upgrade',
    interactionResponse: 'Your Accra home — rest, cook, host, or upgrade your room.',
    position: new THREE.Vector3(COMPOUND_X, 0.24, COMPOUND_Z - 1.6),
    lookAtPosition: new THREE.Vector3(COMPOUND_X, 0.24, COMPOUND_Z),
    radius: 3.8
  });
}
