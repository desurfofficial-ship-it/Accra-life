import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';

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
  const courtyard = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.10, 8.2), courtyardTileMat);
  courtyard.position.set(0, 0.05, 0);
  courtyard.receiveShadow = true;
  const gateApron = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.10, 0.55), courtyardTileMat);
  gateApron.position.set(0, 0.05, -4.32);
  gateApron.receiveShadow = true;
  group.add(courtyard, gateApron);

  // Hollow main house — walkable interior
  const wallH = 3.5;
  const wallT = 0.28;
  const roomW = 7.4;
  const roomD = 5.2;
  const roomY = 1.85;
  const roomZ = 0.9;

  const interiorFloor = new THREE.Mesh(
    new THREE.BoxGeometry(roomW - 0.2, 0.12, roomD - 0.2),
    sharedArtLibrary.getMaterial('house_interior_slab', { color: 0xd6c3a8, roughness: 0.85 })
  );
  interiorFloor.position.set(0, 0.12, roomZ);
  interiorFloor.receiveShadow = true;
  group.add(interiorFloor);

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(roomW, wallH, wallT), matWallCream);
  wallN.position.set(0, roomY, roomZ + roomD / 2 - wallT / 2);
  wallN.castShadow = true;
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), matWallCream);
  wallW.position.set(-roomW / 2 + wallT / 2, roomY, roomZ);
  wallW.castShadow = true;
  const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, roomD), matWallCream);
  wallE.position.set(roomW / 2 - wallT / 2, roomY, roomZ);
  wallE.castShadow = true;
  const doorGap = 1.45;
  const southHalf = (roomW - doorGap) / 2;
  const wallSL = new THREE.Mesh(new THREE.BoxGeometry(southHalf, wallH, wallT), matWallCream);
  wallSL.position.set(-roomW / 2 + southHalf / 2, roomY, roomZ - roomD / 2 + wallT / 2);
  wallSL.castShadow = true;
  const wallSR = new THREE.Mesh(new THREE.BoxGeometry(southHalf, wallH, wallT), matWallCream);
  wallSR.position.set(roomW / 2 - southHalf / 2, roomY, roomZ - roomD / 2 + wallT / 2);
  wallSR.castShadow = true;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorGap + 0.2, 0.35, wallT), matWallCream);
  lintel.position.set(0, roomY + wallH / 2 - 0.2, roomZ - roomD / 2 + wallT / 2);
  group.add(wallN, wallW, wallE, wallSL, wallSR, lintel);

  const corniceBand = new THREE.Mesh(new THREE.BoxGeometry(7.64, 0.22, 5.44), matWhiteTrim);
  corniceBand.position.set(0, 3.52, 0.9);
  group.add(corniceBand);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.48, 0.55, 5.28), matTerracottaPlinth);
  plinth.position.set(0, 0.35, 0.9);
  plinth.castShadow = true;
  group.add(plinth);

  const eaveSoffit = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.14, 6.8), matWhiteTrim);
  eaveSoffit.position.set(0, 3.62, 0.35);
  eaveSoffit.castShadow = true;
  group.add(eaveSoffit);

  const frontRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 3.75), matRoofRust);
  frontRoofSlope.position.set(0, 4.12, -1.25);
  frontRoofSlope.rotation.x = 0.32;
  frontRoofSlope.castShadow = true;
  const rearRoofSlope = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 3.75), matRoofRust);
  rearRoofSlope.position.set(0, 4.12, 1.95);
  rearRoofSlope.rotation.x = -0.32;
  rearRoofSlope.castShadow = true;
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(8.28, 0.18, 0.36), matTerracottaPlinth);
  ridgeBeam.position.set(0, 4.68, 0.35);
  ridgeBeam.castShadow = true;
  const gableLower = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.55, 3.8), matWallCream);
  gableLower.position.set(0, 3.88, 0.35);
  const gableUpper = new THREE.Mesh(new THREE.BoxGeometry(7.38, 0.48, 1.95), matWallCream);
  gableUpper.position.set(0, 4.32, 0.35);
  group.add(frontRoofSlope, rearRoofSlope, ridgeBeam, gableLower, gableUpper);

  const verandaDeck = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.24, 1.65), matTerracottaPlinth);
  verandaDeck.position.set(0, 0.12, -2.3);
  verandaDeck.receiveShadow = true;
  group.add(verandaDeck);
  const verandaStep = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 0.46), matTerracottaPlinth);
  verandaStep.position.set(0, 0.08, -3.22);
  verandaStep.receiveShadow = true;
  group.add(verandaStep);

  for (const px of [-3.3, -1.25, 1.25, 3.3]) {
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.36), matTerracottaPlinth);
    colBase.position.set(px, 0.42, -2.92);
    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.98, 16), matWhiteTrim);
    colShaft.position.set(px, 2.04, -2.92);
    colShaft.castShadow = true;
    const colCap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), matWhiteTrim);
    colCap.position.set(px, 3.5, -2.92);
    group.add(colBase, colShaft, colCap);
  }

  // Door kept as visual; collision opens through gap
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.44, 2.44, 0.16), matWhiteTrim);
  doorFrame.position.set(0, 1.4, -1.72);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.26, 0.08), matWoodDark);
  doorPanel.position.set(0.55, 1.36, -1.65);
  doorPanel.rotation.y = -0.85;
  group.add(doorFrame, doorPanel);

  for (const wx of [-2.25, 2.25]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.32, 0.16), matWhiteTrim);
    winFrame.position.set(wx, 1.95, -1.72);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.12, 0.17), matGlassWindow);
    winGlass.position.set(wx, 1.95, -1.73);
    group.add(winFrame, winGlass);
  }

  const leftFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.28), matCompoundWall);
  leftFrontWall.position.set(-3.2, 0.75, -3.95);
  const rightFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.28), matCompoundWall);
  rightFrontWall.position.set(3.2, 0.75, -3.95);
  for (const side of [-1, 1]) {
    const gx = side * 1.55;
    const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.78, 0.44), matTerracottaPlinth);
    gatePillar.position.set(gx, 0.89, -3.95);
    group.add(gatePillar);
  }
  const sideWallGeo = new THREE.BoxGeometry(0.28, 1.65, 8.2);
  const westWall = new THREE.Mesh(sideWallGeo, matCompoundWall);
  westWall.position.set(-4.66, 0.82, 0);
  const eastWall = new THREE.Mesh(sideWallGeo, matCompoundWall);
  eastWall.position.set(4.66, 0.82, 0);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.65, 0.28), matCompoundWall);
  backWall.position.set(0, 0.82, 3.96);
  group.add(leftFrontWall, rightFrontWall, westWall, eastWall, backWall);

  // Polytank tower (simplified)
  const towerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), matIronWork);
  for (const [lx, lz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]] as [number, number][]) {
    const leg = towerLeg.clone();
    leg.position.set(3.8 + lx, 1.6, 2.2 + lz);
    group.add(leg);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.1, 14), matPolyTank);
  tank.position.set(3.8, 3.6, 2.2);
  group.add(tank);

  scene.add(group);

  colliders.push(
    { id: 'ACC_HOUSE_001_WALL_N', minX: -14.2, maxX: -6.8, minZ: 15.55, maxZ: 15.95, height: 3.6 },
    { id: 'ACC_HOUSE_001_WALL_W_IN', minX: -14.3, maxX: -13.95, minZ: 10.7, maxZ: 15.9, height: 3.6 },
    { id: 'ACC_HOUSE_001_WALL_E_IN', minX: -7.05, maxX: -6.7, minZ: 10.7, maxZ: 15.9, height: 3.6 },
    { id: 'ACC_HOUSE_001_WALL_S_L', minX: -14.2, maxX: -11.25, minZ: 10.55, maxZ: 10.95, height: 3.6 },
    { id: 'ACC_HOUSE_001_WALL_S_R', minX: -9.75, maxX: -6.8, minZ: 10.55, maxZ: 10.95, height: 3.6 },
    { id: 'ACC_HOUSE_001_POLYTANK', minX: -7.1, maxX: -5.7, minZ: 14.0, maxZ: 15.5, height: 4.4 },
    { id: 'ACC_HOUSE_001_WALL_L', minX: -15.3, maxX: -11.9, minZ: 8.0, maxZ: 8.5, height: 1.8 },
    { id: 'ACC_HOUSE_001_WALL_R', minX: -9.1, maxX: -5.7, minZ: 8.0, maxZ: 8.5, height: 1.8 },
    { id: 'ACC_HOUSE_001_WALL_W', minX: -15.4, maxX: -14.9, minZ: 8.0, maxZ: 16.4, height: 1.7 },
    { id: 'ACC_HOUSE_001_WALL_E', minX: -6.1, maxX: -5.5, minZ: 8.0, maxZ: 16.4, height: 1.7 },
    { id: 'ACC_HOUSE_001_WALL_BACK', minX: -15.4, maxX: -5.5, minZ: 15.9, maxZ: 16.4, height: 1.7 }
  );

  interactables.push({
    id: 'home_door',
    assetId: 'ACC_HOUSE_001',
    title: 'Your Compound',
    promptLabel: 'Enter Compound',
    interactionResponse: 'Your compound — walk inside, rest, decorate.',
    position: new THREE.Vector3(-10.5, 0.14, 9.2),
    lookAtPosition: new THREE.Vector3(-10.5, 0.14, 10.6),
    radius: 3.1
  });
}
