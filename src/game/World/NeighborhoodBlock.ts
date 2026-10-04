import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { PHASE2_ASSET_REGISTRY, sharedArtLibrary } from '../Art/AssetRegistry';
import { buildStylizedGhanaianCharacter, CharacterRig } from '../Art/CharacterBuilder';

export { PHASE2_ASSET_REGISTRY };

export interface BuiltNeighborhoodBlock {
  colliders: ColliderBox[];
  interactables: InteractableTarget[];
  npcRigs: CharacterRig[];
}

/**
 * Returns the exact top surface elevation (Y in meters) at world (x, z)
 * so the player, NPCs, and vehicles rest cleanly on top of sidewalks,
 * compound courtyards, shop pads, crossover bridges, or asphalt road.
 */
export function getSurfaceHeightAt(x: number, z: number): number {
  // 1. Player Compound House Courtyard (X in [-15.3, -5.7], Z in [8.1, 16.3])
  if (x >= -15.3 && x <= -5.7 && z >= 8.1 && z <= 16.3) {
    // Veranda deck inside compound (X in [-14.2, -6.8], Z in [9.1, 10.6])
    if (x >= -14.2 && x <= -6.8 && z >= 9.1 && z <= 10.6) {
      return 0.18;
    }
    return 0.10;
  }

  // 2. Provision Store Concrete Pad (X in [-12.7, -6.3], Z in [-12.8, -7.6])
  if (x >= -12.7 && x <= -6.3 && z >= -12.8 && z <= -7.6) {
    return 0.10;
  }

  // 3. Waakye & Jollof Dining Patio Slab (X in [4.8, 12.2], Z in [-12.9, -7.1])
  if (x >= 4.8 && x <= 12.2 && z >= -12.9 && z <= -7.1) {
    return 0.10;
  }

  // 4. Trotro Stop Boarding Pad (X in [6.6, 11.4], Z in [5.1, 7.6])
  if (x >= 6.6 && x <= 11.4 && z >= 5.1 && z <= 7.6) {
    return 0.10;
  }

  // 5. North & South Pedestrian Sidewalks (Z in [-7.7, -4.4] or [4.4, 7.7])
  if ((z >= -7.7 && z <= -4.4) || (z >= 4.4 && z <= 7.7)) {
    return 0.08;
  }

  // 6. Concrete Entrance Crossover Bridges across the Storm Gutter (Z in [-4.45, -3.65] or [3.65, 4.45])
  if ((z >= -4.45 && z <= -3.65) || (z >= 3.65 && z <= 4.45)) {
    const onCrossover =
      (x >= -12.3 && x <= -8.7) ||
      (x >= -11.3 && x <= -7.7) ||
      (x >= -1.6 && x <= 1.6) ||
      (x >= 6.5 && x <= 11.2);
    if (onCrossover) {
      return 0.08;
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

export function buildFirstNeighborhoodBlock(scene: THREE.Scene): BuiltNeighborhoodBlock {
  const colliders: ColliderBox[] = [];
  const interactables: InteractableTarget[] = [];
  const npcRigs: CharacterRig[] = [];

  // Shared environment materials
  const matLateriteEarth = sharedArtLibrary.getMaterial('env_laterite', {
    color: 0xd8b48e,
    roughness: 0.92
  });
  const matAsphalt = sharedArtLibrary.getMaterial('env_asphalt', {
    color: 0x2e3846,
    roughness: 0.86
  });
  const matAsphaltShoulder = sharedArtLibrary.getMaterial('env_shoulder', {
    color: 0x475569,
    roughness: 0.88
  });
  const matRoadLine = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const matRoadEdgeLine = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const matSidewalk = sharedArtLibrary.getMaterial('env_sidewalk_paved', {
    map: sharedArtLibrary.getSidewalkPaverTexture(),
    roughness: 0.80
  });
  const matConcreteDark = sharedArtLibrary.getMaterial('env_concrete_dark', {
    color: 0x64748b,
    roughness: 0.88
  });
  const matGutterChannel = sharedArtLibrary.getMaterial('env_gutter_floor', {
    color: 0x1e293b,
    roughness: 0.95
  });

  // 1. Base Ground Plane (Warm Accra Laterite Earth at Y = 0.0)
  const groundGeo = new THREE.PlaneGeometry(88, 88);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, matLateriteEarth);
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Main Neighborhood Asphalt Road (East-West along Z = 0, top surface at Y = 0.02)
  const roadShoulder = new THREE.Mesh(new THREE.BoxGeometry(68, 0.02, 7.6), matAsphaltShoulder);
  roadShoulder.position.set(0, 0.008, 0);
  roadShoulder.receiveShadow = true;
  scene.add(roadShoulder);

  const road = new THREE.Mesh(new THREE.BoxGeometry(68, 0.02, 7.0), matAsphalt);
  road.position.set(0, 0.01, 0);
  road.receiveShadow = true;
  scene.add(road);

  // Road Center Dashed Markings & Edge Lines
  const dashGeo = new THREE.BoxGeometry(2.4, 0.01, 0.16);
  for (let x = -28; x <= 28; x += 5.4) {
    const dash = new THREE.Mesh(dashGeo, matRoadLine);
    dash.position.set(x, 0.021, 0);
    scene.add(dash);
  }
  for (const edgeZ of [-3.35, 3.35]) {
    const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(68, 0.01, 0.10), matRoadEdgeLine);
    edgeLine.position.set(0, 0.021, edgeZ);
    scene.add(edgeLine);
  }

  // 3. ENV_DRAIN_001 (ACC_PROP_003) — Open Concrete Storm Gutters & Entrance Crossover Slabs
  buildRoadsideGuttersAndWalkways(scene, matSidewalk, matConcreteDark, matGutterChannel);

  // 4. ACC_HOUSE_001 — Contemporary Accra Gated Compound House (South-West Plot)
  buildPlayerCompoundHouse(scene, colliders, interactables);

  // 5. ACC_SHOP_001 — Ghanaian Blue Provision Store & MoMo Kiosk (North-West Plot)
  buildProvisionStore(scene, colliders, interactables);

  // 6. ACC_RESTAURANT_001 — Roadside Waakye & Jollof Food Joint (North-East Plot)
  buildFoodVendorJoint(scene, colliders, interactables);

  // 7. ACC_PROP_001 & ACC_TROTRO_001 — Trotro Stop Shelter & Parked Accra Trotro Minibus (South-East)
  buildTrotroStopAndVehicle(scene, colliders, interactables);

  // 8. ENV_POLE_001 (ACC_PROP_002) — Concrete Utility & Streetlight Poles + Overhead Wires
  const northPoles: Array<[number, number, number]> = [
    [-16, -4.8, 1],
    [-2, -4.8, 1],
    [15, -4.8, 1]
  ];
  const southPoles: Array<[number, number, number]> = [
    [-15, 4.8, -1],
    [2, 4.8, -1],
    [16, 4.8, -1]
  ];
  for (const [px, pz, dir] of [...northPoles, ...southPoles]) {
    buildUtilityPole(scene, colliders, px, pz, dir);
  }
  buildOverheadUtilityCables(scene, northPoles);
  buildOverheadUtilityCables(scene, southPoles);

  // 9. ENV_TREE_001 — Stylized Accra Neem & Mango Street Trees
  const treeCoords: Array<[number, number, number]> = [
    [-19.5, -7.2, 1.05],
    [-1.8, -7.5, 0.95],
    [17.5, -7.2, 1.1],
    [-19.5, 7.4, 1.0],
    [0.5, 8.0, 0.92],
    [17.8, 7.4, 1.06]
  ];
  for (const [tx, tz, scale] of treeCoords) {
    buildStylizedShadeTree(scene, colliders, tx, tz, scale);
  }

  // 10. Phase 2 NPC Visual Archetype Test Set (NPC_MALE_001, NPC_FEMALE_001, NPC_OLDER_001)
  spawnPhase2TestNPCs(scene, colliders, interactables, npcRigs);

  // 11. Street-End Boundary Bollards (marks the East/West ends of the block)
  const bollardMat = sharedArtLibrary.getMaterial('env_bollard', {
    color: 0xf59e0b,
    roughness: 0.55
  });
  const bollardCapMat = sharedArtLibrary.getMaterial('env_bollard_cap', {
    color: 0x1e293b,
    roughness: 0.6
  });
  for (const bx of [-25.6, 25.6]) {
    for (const bz of [-5.8, -2.2, 0, 2.2, 5.8]) {
      const baseY = getSurfaceHeightAt(bx, bz);
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.82, 14), bollardMat);
      bollard.position.set(bx, baseY + 0.41, bz);
      bollard.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.14, 14), bollardCapMat);
      cap.position.set(bx, baseY + 0.78, bz);
      scene.add(bollard, cap);
    }
  }

  return { colliders, interactables, npcRigs };
}

// ============================================================================
// ENV_DRAIN_001 (ACC_PROP_003) — Open Storm Gutters & Entrance Bridges
// ============================================================================
function buildRoadsideGuttersAndWalkways(
  scene: THREE.Scene,
  matSidewalk: THREE.Material,
  matConcreteDark: THREE.Material,
  matGutterChannel: THREE.Material
): void {
  const gutterGroup = new THREE.Group();
  gutterGroup.name = 'ENV_DRAIN_001';

  // North & South Pedestrian Walkways with top surface at Y = 0.08
  const northWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 3.3), matSidewalk);
  northWalk.position.set(0, 0.04, -6.05);
  northWalk.receiveShadow = true;

  const southWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 3.3), matSidewalk);
  southWalk.position.set(0, 0.04, 6.05);
  southWalk.receiveShadow = true;
  gutterGroup.add(northWalk, southWalk);

  // Open storm drain channels between road edge (Z = ±3.7) and sidewalk (Z = ±4.4)
  for (const sign of [-1, 1]) {
    const channelFloor = new THREE.Mesh(new THREE.BoxGeometry(68, 0.02, 0.68), matGutterChannel);
    channelFloor.position.set(0, 0.005, sign * 4.05);

    const innerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.09, 0.12), matConcreteDark);
    innerWall.position.set(0, 0.045, sign * 3.74);

    const outerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.09, 0.12), matConcreteDark);
    outerWall.position.set(0, 0.045, sign * 4.36);

    gutterGroup.add(channelFloor, innerWall, outerWall);
  }

  // Concrete crossover slabs bridging the gutter at each building entrance & crossing (top at Y = 0.085)
  const crossoverPositions: Array<[number, number, number]> = [
    [-10.5, 4.05, 3.6], // Player Home entrance bridge
    [-9.5, -4.05, 3.6], // Provision Store entrance bridge
    [8.5, -4.05, 4.0],  // Food Joint entrance bridge
    [9.0, 4.05, 4.4],   // Trotro Stop boarding bridge
    [0, -4.05, 3.0],    // Central pedestrian crossing North
    [0, 4.05, 3.0]      // Central pedestrian crossing South
  ];

  for (const [cx, cz, width] of crossoverPositions) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.085, 0.86), matSidewalk);
    slab.position.set(cx, 0.0425, cz);
    slab.receiveShadow = true;
    gutterGroup.add(slab);
  }

  scene.add(gutterGroup);
}

// ============================================================================
// 1. ACC_HOUSE_001 — Contemporary Accra Gated Compound House
// ============================================================================
function buildPlayerCompoundHouse(
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

  // Tiled Courtyard Paving inside Compound (top surface at Y = 0.10)
  const courtyard = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.10, 8.2),
    sharedArtLibrary.getMaterial('house_courtyard_tile', { color: 0xe2e8f0, roughness: 0.74 })
  );
  courtyard.position.set(0, 0.05, 0);
  courtyard.receiveShadow = true;
  group.add(courtyard);

  // Main House Body + Roof Fascia Cornice
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.5, 5.2), matWallCream);
  mainBody.position.set(0, 1.85, 0.9);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  const corniceBand = new THREE.Mesh(new THREE.BoxGeometry(7.64, 0.22, 5.44), matWhiteTrim);
  corniceBand.position.set(0, 3.52, 0.9);
  group.add(corniceBand);

  // Lower Terracotta Anti-Splash Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.48, 0.55, 5.28), matTerracottaPlinth);
  plinth.position.set(0, 0.35, 0.9);
  plinth.castShadow = true;
  group.add(plinth);

  // Architectural Pitched Gable/Hipped Corrugated Roof with Overhanging Eaves & Horizontal Ridge Cap
  const eaveSoffit = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.14, 6.8), matWhiteTrim);
  eaveSoffit.position.set(0, 3.62, 0.35);
  eaveSoffit.castShadow = true;
  group.add(eaveSoffit);

  // Front and rear pitched roof slopes + gable pediments + terracotta ridge beam
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

  // Gable end masonry infill triangles (approximated by stepped gable courses)
  const gableLower = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.55, 3.8), matWallCream);
  gableLower.position.set(0, 3.88, 0.35);
  const gableUpper = new THREE.Mesh(new THREE.BoxGeometry(7.38, 0.48, 1.95), matWallCream);
  gableUpper.position.set(0, 4.32, 0.35);

  group.add(frontRoofSlope, rearRoofSlope, ridgeBeam, gableLower, gableUpper);

  // Front Shaded Veranda Deck (top surface at Y = 0.24), Entrance Steps, Columns & Balustrade
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
    colCap.position.set(px, 3.50, -2.92);
    group.add(colBase, colShaft, colCap);
  }

  // Veranda Balustrade Railings on Left & Right Sides (leaving center steps open)
  for (const sideX of [-2.28, 2.28]) {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.12), matWhiteTrim);
    topRail.position.set(sideX, 0.88, -2.92);
    group.add(topRail);
    for (let b = -0.72; b <= 0.72; b += 0.36) {
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.58, 10), matWhiteTrim);
      baluster.position.set(sideX + b, 0.56, -2.92);
      group.add(baluster);
    }
  }

  // Panelled Mahogany Front Entrance Door + Recessed Mouldings + Brass Handle
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.44, 2.44, 0.16), matWhiteTrim);
  doorFrame.position.set(0, 1.40, -1.72);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.20, 2.26, 0.18), matWoodDark);
  doorPanel.position.set(0, 1.36, -1.73);
  const doorHandle = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 12, 12),
    sharedArtLibrary.getMaterial('gold_accessory', { color: 0xfacc15, roughness: 0.28, metalness: 0.82 })
  );
  doorHandle.position.set(0.42, 1.24, -1.84);
  group.add(doorFrame, doorPanel, doorHandle);

  // Louvered Windows with White Hood Moldings, Sills & Burglar-Proof Security Bars
  for (const wx of [-2.25, 2.25]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.32, 0.16), matWhiteTrim);
    winFrame.position.set(wx, 1.95, -1.72);
    const winHood = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.12, 0.30), matWhiteTrim);
    winHood.position.set(wx, 2.64, -1.78);
    const winSill = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.08, 0.24), matWhiteTrim);
    winSill.position.set(wx, 1.26, -1.76);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.12, 0.17), matGlassWindow);
    winGlass.position.set(wx, 1.95, -1.73);
    group.add(winFrame, winHood, winSill, winGlass);

    for (let ly = -0.36; ly <= 0.36; ly += 0.18) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.024, 0.20), matIronWork);
      bar.position.set(wx, 1.95 + ly, -1.74);
      group.add(bar);
    }
  }

  // Perimeter Compound Walls with Terracotta Coping & Entrance Gate Pillars
  const leftFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.28), matCompoundWall);
  leftFrontWall.position.set(-3.2, 0.75, -3.95);
  leftFrontWall.castShadow = true;

  const rightFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.28), matCompoundWall);
  rightFrontWall.position.set(3.2, 0.75, -3.95);
  rightFrontWall.castShadow = true;

  // Gate Pillars + Open Ornamental Wrought-Iron Double Gates
  const globeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  for (const side of [-1, 1]) {
    const gx = side * 1.55;
    const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.78, 0.44), matTerracottaPlinth);
    gatePillar.position.set(gx, 0.89, -3.95);
    gatePillar.castShadow = true;
    const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.52), matWhiteTrim);
    pillarCap.position.set(gx, 1.82, -3.95);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), globeMat);
    lantern.position.set(gx, 1.98, -3.95);
    group.add(gatePillar, pillarCap, lantern);

    // Wrought-iron gate leaf swung open along the front wall so walkway stays wide open
    const gateLeaf = new THREE.Group();
    gateLeaf.position.set(side * 1.65, 0.82, -3.72);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.05), matIronWork);
    topBar.position.y = 0.58;
    const botBar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.05), matIronWork);
    botBar.position.y = -0.52;
    gateLeaf.add(topBar, botBar);
    for (let bx = -0.50; bx <= 0.50; bx += 0.20) {
      const picket = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.18, 8), matIronWork);
      picket.position.x = bx;
      gateLeaf.add(picket);
    }
    gateLeaf.position.x = side * 2.25;
    group.add(gateLeaf);
  }

  const sideWallGeo = new THREE.BoxGeometry(0.28, 1.65, 8.2);
  const westWall = new THREE.Mesh(sideWallGeo, matCompoundWall);
  westWall.position.set(-4.66, 0.82, 0);
  westWall.castShadow = true;

  const eastWall = new THREE.Mesh(sideWallGeo, matCompoundWall);
  eastWall.position.set(4.66, 0.82, 0);
  eastWall.castShadow = true;

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.65, 0.28), matCompoundWall);
  backWall.position.set(0, 0.82, 3.96);
  backWall.castShadow = true;

  group.add(leftFrontWall, rightFrontWall, westWall, eastWall, backWall);

  // Iconic Overhead Black Polytank Water Storage Tower on Open 4-Legged Steel Truss Frame
  const towerGroup = new THREE.Group();
  towerGroup.position.set(4.05, 0.10, 2.55);

  for (const lx of [-0.55, 0.55]) {
    for (const lz of [-0.55, 0.55]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.75, 10), matIronWork);
      leg.position.set(lx, 1.375, lz);
      leg.castShadow = true;
      towerGroup.add(leg);
    }
  }
  for (const braceY of [0.95, 1.85, 2.72]) {
    const railF = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.05, 0.05), matIronWork);
    railF.position.set(0, braceY, -0.55);
    const railB = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.05, 0.05), matIronWork);
    railB.position.set(0, braceY, 0.55);
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.18), matIronWork);
    railL.position.set(-0.55, braceY, 0);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.18), matIronWork);
    railR.position.set(0.55, braceY, 0);
    towerGroup.add(railF, railB, railL, railR);
  }

  const tankPlatform = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.10, 1.42), matIronWork);
  tankPlatform.position.set(0, 2.78, 0);
  towerGroup.add(tankPlatform);

  const polyTank = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 1.46, 22), matPolyTank);
  polyTank.position.set(0, 3.55, 0);
  polyTank.castShadow = true;
  towerGroup.add(polyTank);

  // Moulded horizontal reinforcement ribs on the Polytank
  for (const ry of [3.15, 3.55, 3.95]) {
    const tankRib = new THREE.Mesh(new THREE.TorusGeometry(0.665, 0.022, 8, 24), matPolyTank);
    tankRib.rotation.x = Math.PI / 2;
    tankRib.position.set(0, ry, 0);
    towerGroup.add(tankRib);
  }

  const tankLid = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.18, 16), matPolyTank);
  tankLid.position.set(0, 4.35, 0);
  towerGroup.add(tankLid);

  group.add(towerGroup);
  scene.add(group);

  colliders.push(
    { id: 'ACC_HOUSE_001_MAIN', minX: -14.3, maxX: -6.7, minZ: 10.2, maxZ: 16.0, height: 4.5 },
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
    title: 'Player Compound House (ACC_HOUSE_001)',
    promptLabel: 'Enter Home Veranda',
    interactionResponse: 'ACC_HOUSE_001: Contemporary Accra Compound House — Verified.',
    position: new THREE.Vector3(-10.5, 0.14, 9.2),
    lookAtPosition: new THREE.Vector3(-10.5, 0.14, 10.6),
    radius: 3.1
  });
}

// ============================================================================
// 2. ACC_SHOP_001 — Ghanaian Blue Provision Store & MoMo Kiosk
// ============================================================================
function buildProvisionStore(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_SHOP_001';
  group.position.set(-9.5, 0, -10.4);

  const matKioskBlue = sharedArtLibrary.getMaterial('shop_kiosk_blue', {
    color: 0x0284c7,
    roughness: 0.58
  });
  const matKioskLightBlue = sharedArtLibrary.getMaterial('shop_kiosk_lightblue', {
    color: 0x38bdf8,
    roughness: 0.62
  });
  const matSignYellow = sharedArtLibrary.getMaterial('shop_sign_yellow', {
    color: 0xfacc15,
    roughness: 0.46
  });
  const matRoofGalv = sharedArtLibrary.getMaterial('shop_roof_corrugated_galv', {
    map: sharedArtLibrary.getCorrugatedRoofTexture('#94a3b8', '#64748b'),
    roughness: 0.45,
    metalness: 0.35
  });
  const matCounterWood = sharedArtLibrary.getMaterial('shop_counter_wood', {
    color: 0x92400e,
    roughness: 0.68
  });
  const matIronBar = sharedArtLibrary.getMaterial('house_ironwork', {
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.5
  });

  // Concrete Plinth Pad (top surface at Y = 0.10)
  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.10, 5.2),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  basePad.position.set(0, 0.05, 0.2);
  basePad.receiveShadow = true;
  group.add(basePad);

  // Main Kiosk Structure with Vertical Ribbed Container/Siding Trim
  const kioskBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.0, 4.2), matKioskBlue);
  kioskBody.position.set(0, 1.6, 0);
  kioskBody.castShadow = true;
  kioskBody.receiveShadow = true;
  group.add(kioskBody);

  for (let rx = -2.6; rx <= 2.6; rx += 0.65) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.95, 4.26), matKioskLightBlue);
    rib.position.set(rx, 1.6, 0);
    group.add(rib);
  }

  // Upper Yellow Signboard Fascia + Crisp Hand-Painted Signboard Texture
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.68, 4.4), matSignYellow);
  fascia.position.set(0, 3.28, 0);
  fascia.castShadow = true;
  group.add(fascia);

  const signTex = sharedArtLibrary.getSignboardTexture(
    'shop_001',
    '#facc15',
    '#0284c7',
    'ADABRAKA PROVISIONS',
    'MOMO · AIRTIME · COLD DRINKS'
  );
  const frontSignPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 0.58),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  frontSignPanel.position.set(0, 3.28, 2.22);
  group.add(frontSignPanel);

  // Sloped Corrugated Roof Overhang + Exposed Timber Rafter Tails
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 5.5), matRoofGalv);
  roof.position.set(0, 3.70, 0.38);
  roof.rotation.x = 0.07;
  roof.castShadow = true;
  group.add(roof);

  for (let rx = -2.8; rx <= 2.8; rx += 0.93) {
    const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 5.4), matCounterWood);
    rafter.position.set(rx, 3.60, 0.38);
    rafter.rotation.x = 0.07;
    group.add(rafter);
  }

  // Open Service Window Recess + Hinged Wooden Shutters + Interior Display Shelves
  const hatchRecess = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 1.4, 0.22),
    sharedArtLibrary.getMaterial('shop_interior_dark', { color: 0x0f172a, roughness: 0.9 })
  );
  hatchRecess.position.set(-0.35, 1.85, 2.04);
  group.add(hatchRecess);

  // Hinged wooden window shutters swung open on left & right of service hatch
  for (const side of [-1, 1]) {
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.38, 0.06), matKioskLightBlue);
    shutter.position.set(-0.35 + side * 1.92, 1.85, 2.15);
    shutter.rotation.y = -side * 0.25;
    group.add(shutter);
  }

  // Interior shelves with provision cartons & tins inside the recess
  for (const sy of [1.58, 1.98]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.05, 0.28), matCounterWood);
    shelf.position.set(-0.35, sy, 2.10);
    group.add(shelf);
  }

  // Security mesh bars across the upper service window
  for (let bx = -1.75; bx <= 1.05; bx += 0.40) {
    const vBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.36, 8), matIronBar);
    vBar.position.set(bx, 1.85, 2.16);
    group.add(vBar);
  }

  const counterLedge = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.05, 0.78), matKioskLightBlue);
  counterLedge.position.set(-0.35, 0.58, 2.32);
  counterLedge.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.10, 0.92), matCounterWood);
  counterTop.position.set(-0.35, 1.14, 2.36);
  group.add(counterLedge, counterTop);

  // Stocked Provision Tins & Cartons (Milo green, Peak red/white, Nido yellow, Voltic blue)
  const itemColors = [0x15803d, 0xdc2626, 0xf59e0b, 0x2563eb, 0x16a34a];
  for (let i = 0; i < 5; i++) {
    const tin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.30, 14),
      sharedArtLibrary.getMaterial(`tin_${itemColors[i]}`, { color: itemColors[i], roughness: 0.42 })
    );
    tin.position.set(-1.55 + i * 0.58, 1.34, 2.34);
    tin.castShadow = true;
    group.add(tin);

    const shelfBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.28, 0.18),
      sharedArtLibrary.getMaterial(`tin_${itemColors[(i + 2) % 5]}`, {
        color: itemColors[(i + 2) % 5],
        roughness: 0.5
      })
    );
    shelfBox.position.set(-1.55 + i * 0.58, 1.75, 2.12);
    group.add(shelfBox);
  }

  // Dedicated Yellow Mobile Money (MoMo) Agent Booth Table & Umbrella on Right Side
  const momoTable = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.88, 0.75), matSignYellow);
  momoTable.position.set(2.25, 0.50, 2.25);
  momoTable.castShadow = true;
  group.add(momoTable);

  const momoSignTex = sharedArtLibrary.getSignboardTexture(
    'momo_agent',
    '#facc15',
    '#0f172a',
    'MOMO AGENT',
    'CASH IN · CASH OUT'
  );
  const momoFrontSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.42),
    new THREE.MeshBasicMaterial({ map: momoSignTex })
  );
  momoFrontSign.position.set(2.25, 0.54, 2.64);
  group.add(momoFrontSign);

  const umbrellaPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 2.45, 10),
    matRoofGalv
  );
  umbrellaPole.position.set(2.25, 1.32, 2.25);
  const umbrellaCanopy = new THREE.Mesh(
    new THREE.ConeGeometry(1.25, 0.48, 16),
    matSignYellow
  );
  umbrellaCanopy.position.set(2.25, 2.52, 2.25);
  umbrellaCanopy.castShadow = true;
  group.add(umbrellaPole, umbrellaCanopy);

  scene.add(group);

  colliders.push({
    id: 'ACC_SHOP_001',
    minX: -12.4,
    maxX: -6.6,
    minZ: -12.6,
    maxZ: -7.6,
    height: 3.8
  });

  interactables.push({
    id: 'provision_shop',
    assetId: 'ACC_SHOP_001',
    title: 'Adabraka Provision Store (ACC_SHOP_001)',
    promptLabel: 'Inspect Provision Counter',
    interactionResponse: 'ACC_SHOP_001: Adabraka Provision Store & MoMo Kiosk — Verified.',
    position: new THREE.Vector3(-9.5, 0.14, -6.7),
    lookAtPosition: new THREE.Vector3(-9.5, 0.14, -8.2),
    radius: 3.1
  });
}

// ============================================================================
// 3. ACC_RESTAURANT_001 — Roadside Waakye & Jollof Food Vendor Joint
// ============================================================================
function buildFoodVendorJoint(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_RESTAURANT_001';
  group.position.set(8.5, 0, -10.4);

  const matWarmWall = sharedArtLibrary.getMaterial('food_wall_ochre', {
    color: 0xfed7aa,
    roughness: 0.74
  });
  const matSpiceTrim = sharedArtLibrary.getMaterial('food_trim_spice', {
    color: 0xea580c,
    roughness: 0.60
  });
  const matCanopyRed = sharedArtLibrary.getMaterial('food_canopy_corrugated_red', {
    map: sharedArtLibrary.getCorrugatedRoofTexture('#dc2626', '#991b1b'),
    roughness: 0.54
  });
  const matWood = sharedArtLibrary.getMaterial('food_wood_counter', {
    color: 0x7c2d12,
    roughness: 0.66
  });
  const matAluminumPot = sharedArtLibrary.getMaterial('food_aluminum_pot', {
    color: 0xdbeafe,
    roughness: 0.26,
    metalness: 0.74
  });
  const matCoalPot = sharedArtLibrary.getMaterial('food_coalpot_iron', {
    color: 0x1e293b,
    roughness: 0.78,
    metalness: 0.35
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.45,
    roughness: 0.15
  });

  // Concrete Dining Patio Slab (top surface at Y = 0.10)
  const patioSlab = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.10, 5.9),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  patioSlab.position.set(0, 0.05, 0.4);
  patioSlab.receiveShadow = true;
  group.add(patioSlab);

  // Rear Kitchen Structure + Hand-Painted Chop Bar Signboard
  const kitchenBlock = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.1, 3.4), matWarmWall);
  kitchenBlock.position.set(0, 1.60, -0.7);
  kitchenBlock.castShadow = true;
  kitchenBlock.receiveShadow = true;
  group.add(kitchenBlock);

  // Kitchen serving pass-through window & counter shelf
  const kitchenOpening = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 1.25, 0.16),
    sharedArtLibrary.getMaterial('shop_interior_dark', { color: 0x1c1917, roughness: 0.9 })
  );
  kitchenOpening.position.set(-0.6, 1.85, 0.96);
  group.add(kitchenOpening);

  const headerBand = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.64, 3.6), matSpiceTrim);
  headerBand.position.set(0, 3.28, -0.7);
  headerBand.castShadow = true;
  group.add(headerBand);

  const foodSignTex = sharedArtLibrary.getSignboardTexture(
    'restaurant_001',
    '#7c2d12',
    '#facc15',
    'SISTER AKOSUA JOINT',
    'SPECIAL WAAKYE · JOLLOF · SHITO',
    '#fef3c7'
  );
  const foodSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 0.56),
    new THREE.MeshBasicMaterial({ map: foodSignTex })
  );
  foodSignMesh.position.set(0, 3.28, 1.12);
  group.add(foodSignMesh);

  // Front Shade Canopy Extending Over Serving Counter + Warm Valance Trim
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.16, 3.3), matCanopyRed);
  canopy.position.set(0, 2.86, 1.85);
  canopy.rotation.x = 0.12;
  canopy.castShadow = true;
  group.add(canopy);

  const valance = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.18, 0.08), matSpiceTrim);
  valance.position.set(0, 2.62, 3.46);
  group.add(valance);

  // Support Poles for Front Canopy
  const poleMat = sharedArtLibrary.getMaterial('env_steel_dark', { color: 0x334155, roughness: 0.6 });
  for (const px of [-3.1, 3.1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.75, 12), poleMat);
    pole.position.set(px, 1.4, 3.1);
    pole.castShadow = true;
    group.add(pole);
  }

  // Wooden Serving Counter + Framed Ghanaian Glass "Sieve/Showcase" Food Box
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 0.95), matWood);
  counter.position.set(-0.8, 0.56, 1.95);
  counter.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.96, 0.08, 1.06), matSpiceTrim);
  counterTop.position.set(-0.8, 1.08, 1.95);
  group.add(counter, counterTop);

  // Framed wooden sieve showcase box
  const glassCase = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.72, 0.76), matGlass);
  glassCase.position.set(-1.55, 1.48, 1.95);
  const sieveTopFrame = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.07, 0.82), matWood);
  sieveTopFrame.position.set(-1.55, 1.85, 1.95);
  const sieveBotFrame = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.07, 0.82), matWood);
  sieveBotFrame.position.set(-1.55, 1.14, 1.95);
  group.add(glassCase, sieveTopFrame, sieveBotFrame);

  for (const cx of [-2.36, -0.74]) {
    for (const cz of [1.58, 2.32]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), matWood);
      post.position.set(cx, 1.48, cz);
      group.add(post);
    }
  }

  // Warm trays inside the glass showcase (Waakye on banana leaves, Jollof, and Shito bowl)
  const waakyeTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.14, 0.55),
    sharedArtLibrary.getMaterial('food_waakye', { color: 0x7f1d1d, roughness: 0.8 })
  );
  waakyeTray.position.set(-1.92, 1.22, 1.95);
  const jollofTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.14, 0.55),
    sharedArtLibrary.getMaterial('food_jollof', { color: 0xea580c, roughness: 0.75 })
  );
  jollofTray.position.set(-1.18, 1.22, 1.95);
  group.add(waakyeTray, jollofTray);

  // Traditional Big Hammered Aluminum Waakye & Jollof Cauldrons on Black Iron Coal-Pot Hearths
  for (const potX of [-0.15, 0.62]) {
    const coalPotBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.16, 14),
      matCoalPot
    );
    coalPotBase.position.set(potX, 1.18, 1.95);

    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.44, 18), matAluminumPot);
    pot.position.set(potX, 1.44, 1.95);
    pot.castShadow = true;

    const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.022, 8, 20), matAluminumPot);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.set(potX, 1.65, 1.95);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 18), matAluminumPot);
    lid.position.set(potX, 1.68, 1.95);
    const lidHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), matCoalPot);
    lidHandle.position.set(potX, 1.72, 1.95);

    group.add(coalPotBase, pot, potRim, lid, lidHandle);
  }

  // Sculpted 4-Legged Outdoor Patio Dining Table + 2 Plastic Stools + Condiment Caddy
  const tableMat = sharedArtLibrary.getMaterial('food_plastic_blue', {
    color: 0x2563eb,
    roughness: 0.42
  });
  const stoolMat = sharedArtLibrary.getMaterial('food_stool_red', {
    color: 0xdc2626,
    roughness: 0.45
  });

  const tableGroup = new THREE.Group();
  tableGroup.position.set(2.1, 0.10, 2.1);

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 1.12), tableMat);
  tableTop.position.set(0, 0.74, 0);
  tableTop.castShadow = true;
  tableGroup.add(tableTop);

  for (const lx of [-0.48, 0.48]) {
    for (const lz of [-0.48, 0.48]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.030, 0.74, 10), tableMat);
      leg.position.set(lx, 0.37, lz);
      leg.castShadow = true;
      tableGroup.add(leg);
    }
  }

  // Condiment basket & shito jar on the dining table
  const condimentTray = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.08, 12), stoolMat);
  condimentTray.position.set(0, 0.81, 0);
  tableGroup.add(condimentTray);

  // Two sculpted plastic patio stools beside the dining table
  for (const sx of [-0.82, 0.82]) {
    const stoolSeat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.38), stoolMat);
    stoolSeat.position.set(sx, 0.46, 0);
    stoolSeat.castShadow = true;
    tableGroup.add(stoolSeat);
    for (const slx of [-0.14, 0.14]) {
      for (const slz of [-0.14, 0.14]) {
        const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.46, 8), stoolMat);
        sLeg.position.set(sx + slx, 0.23, slz);
        tableGroup.add(sLeg);
      }
    }
  }

  group.add(tableGroup);
  scene.add(group);

  colliders.push(
    {
      id: 'ACC_RESTAURANT_001_KITCHEN',
      minX: 5.2,
      maxX: 11.8,
      minZ: -12.8,
      maxZ: -9.2,
      height: 3.5
    },
    {
      id: 'ACC_RESTAURANT_001_COUNTER',
      minX: 5.7,
      maxX: 9.7,
      minZ: -9.2,
      maxZ: -7.85,
      height: 1.8
    },
    {
      id: 'ACC_RESTAURANT_001_TABLE',
      minX: 9.6,
      maxX: 11.6,
      minZ: -8.9,
      maxZ: -7.7,
      height: 1.0
    },
    {
      id: 'ACC_RESTAURANT_001_POLE_L',
      minX: 5.25,
      maxX: 5.55,
      minZ: -7.45,
      maxZ: -7.15,
      height: 2.8
    },
    {
      id: 'ACC_RESTAURANT_001_POLE_R',
      minX: 11.45,
      maxX: 11.75,
      minZ: -7.45,
      maxZ: -7.15,
      height: 2.8
    }
  );

  interactables.push({
    id: 'food_vendor',
    assetId: 'ACC_RESTAURANT_001',
    title: 'Sister Akosua Waakye & Jollof (ACC_RESTAURANT_001)',
    promptLabel: 'Inspect Food Showcase',
    interactionResponse: 'ACC_RESTAURANT_001: Roadside Waakye & Jollof Showcase — Verified.',
    position: new THREE.Vector3(7.9, 0.14, -6.7),
    lookAtPosition: new THREE.Vector3(7.9, 0.14, -8.5),
    radius: 3.1
  });
}

// ============================================================================
// 4. ACC_PROP_001 & ACC_TROTRO_001 — Trotro Stop Shelter & Parked Trotro Van
// ============================================================================
function buildTrotroStopAndVehicle(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_PROP_001';
  group.position.set(9.0, 0, 6.2);

  const matShelterGreen = sharedArtLibrary.getMaterial('trotro_shelter_green', {
    color: 0x059669,
    roughness: 0.50
  });
  const matGoldSign = sharedArtLibrary.getMaterial('trotro_sign_gold', {
    color: 0xf59e0b,
    roughness: 0.45
  });
  const matSteel = sharedArtLibrary.getMaterial('env_steel_dark', {
    color: 0x334155,
    roughness: 0.62
  });
  const matBenchWood = sharedArtLibrary.getMaterial('trotro_bench_wood', {
    color: 0x92400e,
    roughness: 0.68
  });

  // Raised Curb Boarding Pad (top surface at Y = 0.10)
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 0.10, 2.5),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  pad.position.set(0, 0.05, 0.2);
  pad.receiveShadow = true;
  group.add(pad);

  // Sloped Corrugated Canopy Roof & Route Fascia
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.16, 2.3), matShelterGreen);
  roof.position.set(0, 2.66, 0.2);
  roof.rotation.x = -0.06;
  roof.castShadow = true;
  group.add(roof);

  const shelterRouteTex = sharedArtLibrary.getSignboardTexture(
    'trotro_shelter_route',
    '#064e3b',
    '#facc15',
    'OSU · CIRCLE · LAPAZ',
    'TROTRO TRANSIT STATION',
    '#fef08a'
  );
  const shelterFasciaSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 0.44),
    new THREE.MeshBasicMaterial({ map: shelterRouteTex })
  );
  shelterFasciaSign.position.set(0, 2.42, -0.62);
  shelterFasciaSign.rotation.y = Math.PI;
  group.add(shelterFasciaSign);

  // Back Windscreen Panel
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.45, 0.10), matShelterGreen);
  backPanel.position.set(0, 1.55, 1.1);
  backPanel.castShadow = true;
  group.add(backPanel);

  // Support Posts
  for (const px of [-1.9, 1.9]) {
    for (const pz of [-0.6, 1.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.6, 12), matSteel);
      post.position.set(px, 1.35, pz);
      post.castShadow = true;
      group.add(post);
    }
  }

  // Passenger Waiting Bench with Backrest Slats
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.10, 0.58), matBenchWood);
  benchSeat.position.set(0, 0.54, 0.68);
  benchSeat.castShadow = true;
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.34, 0.08), matBenchWood);
  benchBack.position.set(0, 0.84, 0.94);
  const benchLegL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.50), matSteel);
  benchLegL.position.set(-1.2, 0.28, 0.68);
  const benchLegR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.50), matSteel);
  benchLegR.position.set(1.2, 0.28, 0.68);
  group.add(benchSeat, benchBack, benchLegL, benchLegR);

  // Roadside Trotro Stop Signpost ("TROTRO STOP · OSU / CIRCLE")
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.7, 12), matSteel);
  signPole.position.set(-2.55, 1.35, -0.85);
  signPole.castShadow = true;

  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.58, 0.08), matGoldSign);
  signPlate.position.set(-2.55, 2.45, -0.85);
  signPlate.castShadow = true;

  const stopSignTex = sharedArtLibrary.getSignboardTexture(
    'trotro_pole_sign',
    '#facc15',
    '#0f172a',
    'TROTRO STOP',
    'OSU · CIRCLE · 37'
  );
  const stopSignFaceF = new THREE.Mesh(
    new THREE.PlaneGeometry(0.90, 0.52),
    new THREE.MeshBasicMaterial({ map: stopSignTex })
  );
  stopSignFaceF.position.set(-2.55, 2.45, -0.805);
  const stopSignFaceB = new THREE.Mesh(
    new THREE.PlaneGeometry(0.90, 0.52),
    new THREE.MeshBasicMaterial({ map: stopSignTex })
  );
  stopSignFaceB.position.set(-2.55, 2.45, -0.895);
  stopSignFaceB.rotation.y = Math.PI;

  group.add(signPole, signPlate, stopSignFaceF, stopSignFaceB);
  scene.add(group);

  // ACC_TROTRO_001 — Iconic Stationary Accra Trotro Minibus parked on the asphalt road layby (Y = 0.02)
  const trotroVan = buildAccraTrotroMinibus();
  trotroVan.position.set(14.6, getSurfaceHeightAt(14.6, 2.25), 2.25);
  scene.add(trotroVan);

  colliders.push(
    {
      id: 'ACC_PROP_001_SHELTER',
      minX: 6.9,
      maxX: 11.1,
      minZ: 5.5,
      maxZ: 7.5,
      height: 2.7
    },
    {
      id: 'ACC_PROP_001_SIGNPOST',
      minX: 6.25,
      maxX: 6.65,
      minZ: 5.15,
      maxZ: 5.55,
      height: 2.7
    },
    {
      id: 'ACC_TROTRO_001',
      minX: 12.2,
      maxX: 17.0,
      minZ: 1.25,
      maxZ: 3.25,
      height: 2.3
    }
  );

  interactables.push({
    id: 'trotro_stop',
    assetId: 'ACC_PROP_001',
    title: 'Neighborhood Trotro Stop (ACC_PROP_001)',
    promptLabel: 'Inspect Trotro Stop & Van',
    interactionResponse: 'ACC_PROP_001 / ACC_TROTRO_001: Osu-Circle Trotro Stop — Verified.',
    position: new THREE.Vector3(9.0, 0.14, 4.7),
    lookAtPosition: new THREE.Vector3(9.0, 0.14, 6.2),
    radius: 3.1
  });
}

function buildAccraTrotroMinibus(): THREE.Group {
  const van = new THREE.Group();
  van.name = 'ACC_TROTRO_001';

  const matWhite = sharedArtLibrary.getMaterial('trotro_white', {
    color: 0xf8fafc,
    roughness: 0.38
  });
  const matCobalt = sharedArtLibrary.getMaterial('trotro_cobalt', {
    color: 0x0284c7,
    roughness: 0.45
  });
  const matStripeRed = sharedArtLibrary.getMaterial('trotro_stripe_red', {
    color: 0xdc2626,
    roughness: 0.48
  });
  const matWindow = sharedArtLibrary.getMaterial('trotro_window', {
    color: 0x1e293b,
    roughness: 0.18,
    metalness: 0.38
  });
  const matTire = sharedArtLibrary.getMaterial('trotro_tire', {
    color: 0x18181b,
    roughness: 0.85
  });
  const matRim = sharedArtLibrary.getMaterial('trotro_rim', {
    color: 0xe2e8f0,
    roughness: 0.32,
    metalness: 0.65
  });
  const matSteel = sharedArtLibrary.getMaterial('env_steel_dark', {
    color: 0x334155,
    roughness: 0.6
  });

  // Lower Cobalt Body Skirt + Sloped Front Bonnet Nose
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(4.25, 0.80, 1.86), matCobalt);
  lowerBody.position.set(0.14, 0.72, 0);
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  van.add(lowerBody);

  const frontNose = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 1.82), matCobalt);
  frontNose.position.set(-2.08, 0.66, 0);
  frontNose.rotation.z = 0.18;
  frontNose.castShadow = true;
  van.add(frontNose);

  // Red & Gold Waistline Livery Stripe
  const redStripe = new THREE.Mesh(new THREE.BoxGeometry(4.32, 0.13, 1.88), matStripeRed);
  redStripe.position.set(0.12, 1.15, 0);
  van.add(redStripe);

  // Upper White Passenger Cabin + Sloped Front Windshield Header
  const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.94, 1.82), matWhite);
  upperCabin.position.set(0.26, 1.66, 0);
  upperCabin.castShadow = true;
  van.add(upperCabin);

  const windshieldPillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.92, 1.78), matWhite);
  windshieldPillar.position.set(-1.78, 1.58, 0);
  windshieldPillar.rotation.z = -0.32;
  van.add(windshieldPillar);

  // Contoured Roof Cap + Tubular Roof Luggage Rack + Cargo Bundles
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.14, 1.72), matWhite);
  roofCap.position.set(0.28, 2.18, 0);
  van.add(roofCap);

  const roofRack = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.08, 1.44), matSteel);
  roofRack.position.set(0.35, 2.28, 0);
  const cargoBundle1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.24, 0.68),
    sharedArtLibrary.getMaterial('trotro_cargo_tan', { color: 0xb45309, roughness: 0.78 })
  );
  cargoBundle1.position.set(0.15, 2.40, -0.22);
  const cargoBundle2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.22, 0.58),
    sharedArtLibrary.getMaterial('trotro_cargo_blue', { color: 0x0369a1, roughness: 0.72 })
  );
  cargoBundle2.position.set(0.95, 2.39, 0.25);
  van.add(roofRack, cargoBundle1, cargoBundle2);

  // Segmented Side Passenger Windows & Angled Front Windshield
  for (const wx of [-1.05, -0.10, 0.85, 1.72]) {
    const winBay = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.52, 1.85), matWindow);
    winBay.position.set(wx, 1.68, 0);
    van.add(winBay);
  }

  // Sliding Passenger Door Track & Boarding Step on Curb Side (+Z)
  const doorTrack = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.04, 0.04), matSteel);
  doorTrack.position.set(-0.05, 1.24, 0.94);
  van.add(doorTrack);

  const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.64, 1.60), matWindow);
  frontWindshield.position.set(-1.95, 1.62, 0);
  frontWindshield.rotation.z = -0.32;
  van.add(frontWindshield);

  // Yellow Destination Placard in Front Windshield ("CIRCLE · OSU")
  const destPlaca = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.16, 0.56),
    sharedArtLibrary.getMaterial('shop_sign_yellow', { color: 0xfacc15, roughness: 0.45 })
  );
  destPlaca.position.set(-2.06, 1.38, 0.36);
  destPlaca.rotation.z = -0.32;
  van.add(destPlaca);

  // Side Wing Mirrors
  for (const side of [-1, 1]) {
    const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.14), matTire);
    mirrorHousing.position.set(-1.82, 1.48, side * 1.00);
    van.add(mirrorHousing);
  }

  // Front Radiator Grille, Bumpers, Headlights, Amber Indicators & License Plate
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 1.10), matTire);
  frontGrille.position.set(-2.31, 0.68, 0);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.26, 1.92), matTire);
  bumperF.position.set(-2.30, 0.42, 0);
  const bumperB = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 1.92), matTire);
  bumperB.position.set(2.26, 0.42, 0);
  van.add(frontGrille, bumperF, bumperB);

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const amberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
  for (const hz of [-0.68, 0.68]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.26), headlightMat);
    lamp.position.set(-2.32, 0.72, hz);
    const blinker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.10), amberMat);
    blinker.position.set(-2.31, 0.72, hz + Math.sign(hz) * 0.17);
    const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.18), tailLightMat);
    tailLamp.position.set(2.27, 0.88, hz);
    van.add(lamp, blinker, tailLamp);
  }

  // Ghanaian Yellow Commercial License Plate
  const plateMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const plateF = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.38), plateMat);
  plateF.position.set(-2.41, 0.42, 0);
  van.add(plateF);

  // 4 Sculpted Wheels with Hubcaps & Wheel Arches (bottom of tire at Y = 0.00)
  const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18);
  tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.28, 14);
  rimGeo.rotateX(Math.PI / 2);

  const wheelPositions: Array<[number, number]> = [
    [-1.42, -0.88],
    [-1.42, 0.88],
    [1.38, -0.88],
    [1.38, 0.88]
  ];
  for (const [wx, wz] of wheelPositions) {
    const tire = new THREE.Mesh(tireGeo, matTire);
    tire.position.set(wx, 0.36, wz);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, matRim);
    rim.position.set(wx, 0.36, wz);
    van.add(tire, rim);
  }

  return van;
}

// ============================================================================
// 5. ENV_POLE_001 (ACC_PROP_002) & ENV_TREE_001 — Utility Poles & Shade Trees
// ============================================================================
function buildUtilityPole(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  x: number,
  z: number,
  armDirectionZ: number
): void {
  const poleGroup = new THREE.Group();
  poleGroup.name = 'ENV_POLE_001';
  poleGroup.position.set(x, getSurfaceHeightAt(x, z), z);

  const matConcrete = sharedArtLibrary.getMaterial('pole_concrete', {
    color: 0x94a3b8,
    roughness: 0.85
  });
  const matCrossArm = sharedArtLibrary.getMaterial('env_steel_dark', {
    color: 0x334155,
    roughness: 0.6
  });
  const matBulb = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Tapered concrete ECG utility pole + protective base plinth collar
  const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.45, 12), matConcrete);
  baseCollar.position.y = 0.22;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 5.4, 12), matConcrete);
  post.position.y = 2.7;
  post.castShadow = true;
  poleGroup.add(baseCollar, post);

  // Electrical Cross-Arm & Ceramic Insulators
  const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.15), matCrossArm);
  crossArm.position.set(0, 5.15, 0);
  poleGroup.add(crossArm);

  for (const iz of [-0.46, 0, 0.46]) {
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 10), matConcrete);
    insulator.position.set(0, 5.25, iz);
    poleGroup.add(insulator);
  }

  // Curved Cobra-Head Streetlamp Arm
  const lampArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.25), matCrossArm);
  lampArm.position.set(0, 4.75, armDirectionZ * 0.55);
  poleGroup.add(lampArm);

  const lampHousing = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.44), matCrossArm);
  lampHousing.position.set(0, 4.72, armDirectionZ * 1.08);
  const lampLens = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.34), matBulb);
  lampLens.position.set(0, 4.66, armDirectionZ * 1.08);
  poleGroup.add(lampHousing, lampLens);

  scene.add(poleGroup);

  colliders.push({
    id: `ENV_POLE_001_${x}_${z}`,
    minX: x - 0.25,
    maxX: x + 0.25,
    minZ: z - 0.25,
    maxZ: z + 0.25,
    height: 5.4
  });
}

function buildOverheadUtilityCables(
  scene: THREE.Scene,
  poles: Array<[number, number, number]>
): void {
  const wireMat = sharedArtLibrary.getMaterial('env_wire_dark', {
    color: 0x1e293b,
    roughness: 0.7
  });
  for (let i = 0; i < poles.length - 1; i++) {
    const [x1, z1] = poles[i];
    const [x2, z2] = poles[i + 1];
    const spanLen = Math.hypot(x2 - x1, z2 - z1);
    const midX = (x1 + x2) * 0.5;
    const midZ = (z1 + z2) * 0.5;

    for (const offsetZ of [-0.42, 0.42]) {
      const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, spanLen, 6),
        wireMat
      );
      cable.rotation.z = Math.PI / 2;
      cable.position.set(midX, 5.26, midZ + offsetZ);
      scene.add(cable);
    }
  }
}

function buildStylizedShadeTree(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  x: number,
  z: number,
  scale = 1.0
): void {
  const tree = new THREE.Group();
  tree.name = 'ENV_TREE_001';
  tree.position.set(x, getSurfaceHeightAt(x, z), z);
  tree.scale.setScalar(scale);

  const matTrunk = sharedArtLibrary.getMaterial('tree_trunk', {
    color: 0x6b3e26,
    roughness: 0.90
  });
  const matLeafDark = sharedArtLibrary.getMaterial('tree_leaf_dark', {
    color: 0x15803d,
    roughness: 0.76
  });
  const matLeafLight = sharedArtLibrary.getMaterial('tree_leaf_light', {
    color: 0x16a34a,
    roughness: 0.72
  });

  // Protective concrete tree-pit curb ring
  const pitRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.60, 0.16, 16),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  pitRing.position.y = 0.08;
  tree.add(pitRing);

  // Tapered trunk + supporting primary branches reaching into foliage clusters
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.28, 2.25, 12), matTrunk);
  trunk.position.y = 1.12;
  trunk.castShadow = true;
  tree.add(trunk);

  for (const side of [-1, 1]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.1, 8), matTrunk);
    branch.position.set(side * 0.36, 2.32, side * 0.12);
    branch.rotation.z = -side * 0.58;
    branch.castShadow = true;
    tree.add(branch);
  }

  // Layered organic foliage clusters (Neem / Mango crown silhouette)
  const canopyCenter = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 14), matLeafDark);
  canopyCenter.position.set(0, 3.15, 0);
  canopyCenter.scale.set(1.14, 0.84, 1.14);
  canopyCenter.castShadow = true;

  const canopyLeft = new THREE.Mesh(new THREE.SphereGeometry(0.98, 14, 12), matLeafLight);
  canopyLeft.position.set(-0.78, 2.75, 0.25);
  canopyLeft.scale.set(1.08, 0.88, 1.04);
  canopyLeft.castShadow = true;

  const canopyRight = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 12), matLeafLight);
  canopyRight.position.set(0.75, 2.82, -0.22);
  canopyRight.scale.set(1.06, 0.88, 1.06);
  canopyRight.castShadow = true;

  const canopyTop = new THREE.Mesh(new THREE.SphereGeometry(0.88, 14, 12), matLeafLight);
  canopyTop.position.set(0.1, 3.72, 0.12);
  canopyTop.scale.set(1.05, 0.85, 1.05);
  canopyTop.castShadow = true;

  tree.add(canopyCenter, canopyLeft, canopyRight, canopyTop);
  scene.add(tree);

  colliders.push({
    id: `ENV_TREE_001_${x}_${z}`,
    minX: x - 0.42,
    maxX: x + 0.42,
    minZ: z - 0.42,
    maxZ: z + 0.42,
    height: 4.2
  });
}

// ============================================================================
// 6. PHASE 2 NPC VISUAL ARCHETYPE TEST SET (3 Archetypes)
// ============================================================================
function spawnPhase2TestNPCs(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[],
  npcRigs: CharacterRig[]
): void {
  const npcPlacements: Array<{
    id: 'NPC_MALE_001' | 'NPC_FEMALE_001' | 'NPC_OLDER_001';
    x: number;
    z: number;
    rotY: number;
    title: string;
    promptLabel: string;
    response: string;
  }> = [
    {
      id: 'NPC_MALE_001',
      x: -6.1,
      z: -6.2,
      rotY: 0.35,
      title: 'Kojo — Young Adult Male (NPC_MALE_001)',
      promptLabel: 'Greet Kojo',
      response: 'Kojo (NPC_MALE_001): "Chale, good afternoon! Checking out the provision store."'
    },
    {
      id: 'NPC_FEMALE_001',
      x: 11.4,
      z: -6.2,
      rotY: -0.45,
      title: 'Ama — Young Adult Female (NPC_FEMALE_001)',
      promptLabel: 'Greet Ama',
      response: 'Ama (NPC_FEMALE_001): "Sister Akosua’s waakye is the best on this street!"'
    },
    {
      id: 'NPC_OLDER_001',
      x: 5.4,
      z: 5.4,
      rotY: 2.65,
      title: 'Uncle Mensah — Older Adult (NPC_OLDER_001)',
      promptLabel: 'Greet Uncle Mensah',
      response: 'Uncle Mensah (NPC_OLDER_001): "Peace be with you! The Osu trotro just pulled up."'
    }
  ];

  for (const cfg of npcPlacements) {
    const rig = buildStylizedGhanaianCharacter(cfg.id);
    const surfaceY = getSurfaceHeightAt(cfg.x, cfg.z);
    rig.root.position.set(cfg.x, surfaceY, cfg.z);
    rig.root.rotation.y = cfg.rotY;
    scene.add(rig.root);
    npcRigs.push(rig);

    colliders.push({
      id: cfg.id,
      minX: cfg.x - 0.36,
      maxX: cfg.x + 0.36,
      minZ: cfg.z - 0.36,
      maxZ: cfg.z + 0.36,
      height: 1.75
    });

    // Place interaction ring slightly in front of the NPC along their facing direction
    const ringX = cfg.x + Math.sin(cfg.rotY) * 0.95;
    const ringZ = cfg.z + Math.cos(cfg.rotY) * 0.95;

    interactables.push({
      id: cfg.id.toLowerCase(),
      assetId: cfg.id,
      title: cfg.title,
      promptLabel: cfg.promptLabel,
      interactionResponse: cfg.response,
      position: new THREE.Vector3(ringX, surfaceY + 0.04, ringZ),
      lookAtPosition: new THREE.Vector3(cfg.x, surfaceY, cfg.z),
      radius: 2.5
    });
  }
}
