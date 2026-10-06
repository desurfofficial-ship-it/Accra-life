import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';

let compoundRoofCutawayGroup: THREE.Group | null = null;
let compoundFrontFullWallsGroup: THREE.Group | null = null;
let compoundFrontCutawayRimGroup: THREE.Group | null = null;

export function updatePlayerCompoundCutaway(playerPos: THREE.Vector3): boolean {
  const isInsideOrVeranda =
    playerPos.x >= -14.5 &&
    playerPos.x <= -6.5 &&
    playerPos.z >= 9.0 &&
    playerPos.z <= 15.95;

  if (compoundRoofCutawayGroup) {
    compoundRoofCutawayGroup.visible = !isInsideOrVeranda;
  }
  if (compoundFrontFullWallsGroup) {
    compoundFrontFullWallsGroup.visible = !isInsideOrVeranda;
  }
  if (compoundFrontCutawayRimGroup) {
    compoundFrontCutawayRimGroup.visible = isInsideOrVeranda;
  }
  return isInsideOrVeranda;
}

export function buildPlayerCompoundHouse(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_HOUSE_001';
  group.position.set(-10.5, 0, 12.2);

  const matWallCream = sharedArtLibrary.getMaterial('house_wall_cream', {
    color: 0xfde68a,
    roughness: 0.72
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
  const matGlassWindow = sharedArtLibrary.getMaterial('house_window_glass', {
    color: 0x38bdf8,
    roughness: 0.22,
    metalness: 0.25
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

  // Walkable hollow main house interior — floor top strictly at Y = 0.24 (flush with veranda deck)
  const wallH = 3.35;
  const wallT = 0.34;
  const roomW = 7.4;
  const roomD = 5.2;
  const roomY = 0.24 + wallH / 2;
  const roomZ = 0.9;

  const interiorSubBase = new THREE.Mesh(
    new THREE.BoxGeometry(roomW, 0.21, roomD),
    matTerracottaPlinth
  );
  interiorSubBase.position.set(0, 0.105, roomZ);
  interiorSubBase.receiveShadow = true;
  group.add(interiorSubBase);

  const interiorFloorMat = sharedArtLibrary.getMaterial('house_interior_tile_floor', {
    map: sharedArtLibrary.getRoomTileFloorTexture(),
    roughness: 0.68
  });
  const interiorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(roomW - 0.12, 0.03, roomD - 0.12),
    interiorFloorMat
  );
  // Top surface is at 0.225 + 0.015 = 0.240 (exact match to WorldSurface getSurfaceHeightAt = 0.24)
  interiorFloor.position.set(0, 0.225, roomZ);
  interiorFloor.receiveShadow = true;
  group.add(interiorFloor);

  // Back & side house walls (always visible, forming the 3-wall isometric cutaway shell when inside)
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, wallT), matWallCream);
  wallN.position.set(0, roomY, roomZ + roomD / 2 - wallT / 2);
  wallN.castShadow = true;
  wallN.receiveShadow = true;

  const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), matWallCream);
  wallW.position.set(-roomW / 2 + wallT / 2, roomY, roomZ);
  wallW.castShadow = true;
  wallW.receiveShadow = true;

  const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), matWallCream);
  wallE.position.set(roomW / 2 - wallT / 2, roomY, roomZ);
  wallE.castShadow = true;
  wallE.receiveShadow = true;

  // Interior warm wall wainscoting/baseboards on back and side walls
  const baseboardN = new THREE.Mesh(
    new THREE.BoxGeometry(roomW - 0.68, 0.16, 0.05),
    matTerracottaPlinth
  );
  baseboardN.position.set(0, 0.32, roomZ + roomD / 2 - wallT - 0.02);
  group.add(wallN, wallW, wallE, baseboardN);

  const doorGap = 1.64;
  const southHalf = (roomW - doorGap) / 2;
  const southWallZ = roomZ - roomD / 2 + wallT / 2;

  // Full front facade group (visible from outside; cuts away when player steps inside)
  const frontFullGroup = new THREE.Group();
  frontFullGroup.name = 'ACC_HOUSE_001_FRONT_FULL';

  const wallSL = new THREE.Mesh(new THREE.BoxGeometry(southHalf, wallH, wallT), matWallCream);
  wallSL.position.set(-roomW / 2 + southHalf / 2, roomY, southWallZ);
  wallSL.castShadow = true;
  wallSL.receiveShadow = true;

  const wallSR = new THREE.Mesh(new THREE.BoxGeometry(southHalf, wallH, wallT), matWallCream);
  wallSR.position.set(roomW / 2 - southHalf / 2, roomY, southWallZ);
  wallSR.castShadow = true;
  wallSR.receiveShadow = true;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.24, 0.72, wallT), matWallCream);
  lintel.position.set(0, 0.24 + wallH - 0.36, southWallZ);
  frontFullGroup.add(wallSL, wallSR, lintel);

  // Open doorway jambs and inward-swung mahogany door leaf
  const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.38), matWhiteTrim);
  jambL.position.set(-doorGap / 2 + 0.04, 1.49, southWallZ);
  const jambR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.38), matWhiteTrim);
  jambR.position.set(doorGap / 2 - 0.04, 1.49, southWallZ);
  const jambTop = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.1, 0.12, 0.4), matWhiteTrim);
  jambTop.position.set(0, 2.72, southWallZ);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.08, 2.35, 0.07), matWoodDark);
  doorPanel.position.set(doorGap / 2 + 0.48, 1.43, southWallZ + 0.32);
  doorPanel.rotation.y = -0.32;
  frontFullGroup.add(jambL, jambR, jambTop, doorPanel);

  // Louvered front windows with white frames and security bars
  for (const wx of [-2.35, 2.35]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.32, 0.38), matWhiteTrim);
    winFrame.position.set(wx, 1.95, southWallZ);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.12, 0.4), matGlassWindow);
    winGlass.position.set(wx, 1.95, southWallZ);
    frontFullGroup.add(winFrame, winGlass);
    for (const barY of [1.65, 1.95, 2.25]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.03, 0.42), matIronWork);
      bar.position.set(wx, barY, southWallZ);
      frontFullGroup.add(bar);
    }
  }
  group.add(frontFullGroup);
  compoundFrontFullWallsGroup = frontFullGroup;

  // Low cutaway front rim group (shown when player is inside the room so the wall boundary is clear without hiding player's legs)
  const frontCutawayRim = new THREE.Group();
  frontCutawayRim.name = 'ACC_HOUSE_001_FRONT_CUTAWAY';
  frontCutawayRim.visible = false;
  const rimH = 0.32;
  const rimSL = new THREE.Mesh(new THREE.BoxGeometry(southHalf, rimH, wallT), matWallInterior);
  rimSL.position.set(-roomW / 2 + southHalf / 2, 0.24 + rimH / 2, southWallZ);
  const rimSLCap = new THREE.Mesh(new THREE.BoxGeometry(southHalf, 0.05, wallT + 0.04), matTerracottaPlinth);
  rimSLCap.position.set(-roomW / 2 + southHalf / 2, 0.24 + rimH + 0.025, southWallZ);
  const rimSR = new THREE.Mesh(new THREE.BoxGeometry(southHalf, rimH, wallT), matWallInterior);
  rimSR.position.set(roomW / 2 - southHalf / 2, 0.24 + rimH / 2, southWallZ);
  const rimSRCap = new THREE.Mesh(new THREE.BoxGeometry(southHalf, 0.05, wallT + 0.04), matTerracottaPlinth);
  rimSRCap.position.set(roomW / 2 - southHalf / 2, 0.24 + rimH + 0.025, southWallZ);
  frontCutawayRim.add(rimSL, rimSLCap, rimSR, rimSRCap);
  group.add(frontCutawayRim);
  compoundFrontCutawayRimGroup = frontCutawayRim;

  // Roof group (cuts away when player enters the room so the interior & player legs are 100% visible)
  const roofGroup = new THREE.Group();
  roofGroup.name = 'ACC_HOUSE_001_ROOF';

  const corniceBand = new THREE.Mesh(new THREE.BoxGeometry(7.64, 0.22, 5.44), matWhiteTrim);
  corniceBand.position.set(0, 3.58, 0.9);
  roofGroup.add(corniceBand);

  const eaveSoffit = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.14, 6.8), matWhiteTrim);
  eaveSoffit.position.set(0, 3.68, 0.35);
  eaveSoffit.castShadow = true;
  roofGroup.add(eaveSoffit);

  const frontRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 3.75), matRoofRust);
  frontRoofSlope.position.set(0, 4.18, -1.25);
  frontRoofSlope.rotation.x = 0.32;
  frontRoofSlope.castShadow = true;
  const rearRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 3.75), matRoofRust);
  rearRoofSlope.position.set(0, 4.18, 1.95);
  rearRoofSlope.rotation.x = -0.32;
  rearRoofSlope.castShadow = true;
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(8.28, 0.18, 0.36), matTerracottaPlinth);
  ridgeBeam.position.set(0, 4.74, 0.35);
  ridgeBeam.castShadow = true;
  roofGroup.add(frontRoofSlope, rearRoofSlope, ridgeBeam);
  group.add(roofGroup);
  compoundRoofCutawayGroup = roofGroup;

  // Veranda deck — top strictly at Y = 0.24 (flush with interior floor, no overlap)
  const verandaDeck = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.24, 1.38), matTerracottaPlinth);
  verandaDeck.position.set(0, 0.12, -2.39);
  verandaDeck.receiveShadow = true;
  group.add(verandaDeck);

  const verandaStep = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.52), matTerracottaPlinth);
  verandaStep.position.set(0, 0.08, -3.32);
  verandaStep.receiveShadow = true;
  group.add(verandaStep);

  for (const px of [-3.3, -1.32, 1.32, 3.3]) {
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.34), matTerracottaPlinth);
    colBase.position.set(px, 0.42, -2.92);
    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.98, 16), matWhiteTrim);
    colShaft.position.set(px, 2.04, -2.92);
    colShaft.castShadow = true;
    const colCap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.32), matWhiteTrim);
    colCap.position.set(px, 3.5, -2.92);
    frontFullGroup.add(colBase, colShaft, colCap);
  }

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
    leg.position.set(4.05 + lx, 1.6, 2.7 + lz);
    group.add(leg);
  }
  const tankPlatform = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 0.95), matIronWork);
  tankPlatform.position.set(4.05, 3.2, 2.7);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 1.15, 16), matPolyTank);
  tank.position.set(4.05, 3.82, 2.7);
  tank.castShadow = true;
  group.add(tankPlatform, tank);

  scene.add(group);

  // Thick, overlapping, watertight colliders for house walls and compound perimeter walls
  // Group world offset is (-10.5, 0, 12.2)
  // Doorway passage is at X in [-11.32, -9.68] (1.64m wide)
  // Compound front gate passage is at X in [-11.82, -9.18] (2.64m wide)
  colliders.push(
    // Main house back (North) wall — overlaps West and East walls completely
    { id: 'ACC_HOUSE_001_WALL_N', minX: -14.48, maxX: -6.52, minZ: 15.26, maxZ: 16.05, height: 3.6 },
    // Main house West wall — extends from front wall to back wall
    { id: 'ACC_HOUSE_001_WALL_W_IN', minX: -14.52, maxX: -13.78, minZ: 10.32, maxZ: 16.05, height: 3.6 },
    // Main house East wall — extends from front wall to back wall
    { id: 'ACC_HOUSE_001_WALL_E_IN', minX: -7.22, maxX: -6.48, minZ: 10.32, maxZ: 16.05, height: 3.6 },
    // Main house Front (South) Left wall (west of open doorway)
    { id: 'ACC_HOUSE_001_WALL_S_L', minX: -14.48, maxX: -11.32, minZ: 10.32, maxZ: 10.98, height: 3.6 },
    // Main house Front (South) Right wall (east of open doorway)
    { id: 'ACC_HOUSE_001_WALL_S_R', minX: -9.68, maxX: -6.52, minZ: 10.32, maxZ: 10.98, height: 3.6 },
    // Polytank tower in back-east corner
    { id: 'ACC_HOUSE_001_POLYTANK', minX: -6.95, maxX: -5.95, minZ: 14.35, maxZ: 15.45, height: 4.4 },
    // Compound front wall left of gate (overlaps outer West wall and left gate pillar)
    { id: 'ACC_HOUSE_001_WALL_L', minX: -15.55, maxX: -11.82, minZ: 7.92, maxZ: 8.58, height: 1.8 },
    // Compound front wall right of gate (overlaps right gate pillar and outer East wall)
    { id: 'ACC_HOUSE_001_WALL_R', minX: -9.18, maxX: -5.45, minZ: 7.92, maxZ: 8.58, height: 1.8 },
    // Compound outer West wall
    { id: 'ACC_HOUSE_001_WALL_W', minX: -15.58, maxX: -14.82, minZ: 7.92, maxZ: 16.55, height: 1.8 },
    // Compound outer East wall
    { id: 'ACC_HOUSE_001_WALL_E', minX: -6.18, maxX: -5.42, minZ: 7.92, maxZ: 16.55, height: 1.8 },
    // Compound outer Back wall
    { id: 'ACC_HOUSE_001_WALL_BACK', minX: -15.58, maxX: -5.42, minZ: 15.82, maxZ: 16.55, height: 1.8 }
  );

  interactables.push({
    id: 'home_door',
    assetId: 'ACC_HOUSE_001',
    title: 'Your Compound',
    promptLabel: 'Compound',
    interactionResponse: 'Your compound — walk inside, rest, decorate.',
    position: new THREE.Vector3(-10.5, 0.24, 10.6),
    lookAtPosition: new THREE.Vector3(-10.5, 0.24, 12.5),
    radius: 3.8
  });
}
