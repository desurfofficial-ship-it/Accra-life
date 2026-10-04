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
  const matSidewalk = sharedArtLibrary.getMaterial('env_sidewalk', {
    color: 0xcbd5e1,
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

  // 1. Base Ground Plane (Warm Accra Laterite Earth)
  const groundGeo = new THREE.PlaneGeometry(88, 88);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, matLateriteEarth);
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Main Neighborhood Asphalt Road (East-West along Z = 0)
  const roadShoulder = new THREE.Mesh(new THREE.BoxGeometry(68, 0.06, 7.6), matAsphaltShoulder);
  roadShoulder.position.set(0, 0.03, 0);
  roadShoulder.receiveShadow = true;
  scene.add(roadShoulder);

  const road = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 7.0), matAsphalt);
  road.position.set(0, 0.04, 0);
  road.receiveShadow = true;
  scene.add(road);

  // Road Center Dashed Markings & Edge Lines
  const dashGeo = new THREE.BoxGeometry(2.4, 0.09, 0.16);
  for (let x = -28; x <= 28; x += 5.4) {
    const dash = new THREE.Mesh(dashGeo, matRoadLine);
    dash.position.set(x, 0.05, 0);
    scene.add(dash);
  }
  for (const edgeZ of [-3.35, 3.35]) {
    const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(68, 0.085, 0.10), matRoadEdgeLine);
    edgeLine.position.set(0, 0.048, edgeZ);
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

  // 8. ENV_POLE_001 (ACC_PROP_002) — Concrete Utility & Streetlight Poles
  const polePositions: Array<[number, number, number]> = [
    [-16, -4.8, 1],
    [-2, -4.8, 1],
    [15, -4.8, 1],
    [-15, 4.8, -1],
    [2, 4.8, -1],
    [16, 4.8, -1]
  ];
  for (const [px, pz, dir] of polePositions) {
    buildUtilityPole(scene, colliders, px, pz, dir);
  }

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

  // 11. Street-End Boundary Bollards (marks the East/West ends of the Phase 1/2 block)
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
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.82, 12), bollardMat);
      bollard.position.set(bx, 0.41, bz);
      bollard.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.14, 12), bollardCapMat);
      cap.position.set(bx, 0.78, bz);
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

  // North & South Pedestrian Walkways with curb coping
  const northWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.16, 3.3), matSidewalk);
  northWalk.position.set(0, 0.08, -6.05);
  northWalk.receiveShadow = true;

  const southWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.16, 3.3), matSidewalk);
  southWalk.position.set(0, 0.08, 6.05);
  southWalk.receiveShadow = true;
  gutterGroup.add(northWalk, southWalk);

  // Open storm drain channels between road edge (Z = ±3.7) and sidewalk (Z = ±4.4)
  for (const sign of [-1, 1]) {
    const channelFloor = new THREE.Mesh(new THREE.BoxGeometry(68, 0.04, 0.68), matGutterChannel);
    channelFloor.position.set(0, 0.02, sign * 4.05);

    const innerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.19, 0.12), matConcreteDark);
    innerWall.position.set(0, 0.095, sign * 3.74);

    const outerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.19, 0.12), matConcreteDark);
    outerWall.position.set(0, 0.095, sign * 4.36);

    gutterGroup.add(channelFloor, innerWall, outerWall);
  }

  // Concrete crossover slabs bridging the gutter at each building entrance & crossing
  const crossoverPositions: Array<[number, number, number]> = [
    [-10.5, 4.05, 3.6], // Player Home entrance bridge
    [-9.5, -4.05, 3.6], // Provision Store entrance bridge
    [8.5, -4.05, 4.0],  // Food Joint entrance bridge
    [9.0, 4.05, 4.4],   // Trotro Stop boarding bridge
    [0, -4.05, 3.0],    // Central pedestrian crossing North
    [0, 4.05, 3.0]      // Central pedestrian crossing South
  ];

  for (const [cx, cz, width] of crossoverPositions) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 0.86), matSidewalk);
    slab.position.set(cx, 0.09, cz);
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
  const matRoofRust = sharedArtLibrary.getMaterial('house_roof_terra', {
    color: 0x9a3412,
    roughness: 0.60
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
  const matCompoundWall = sharedArtLibrary.getMaterial('house_compound_wall', {
    color: 0xfef3c7,
    roughness: 0.78
  });
  const matIronWork = sharedArtLibrary.getMaterial('house_ironwork', {
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.5
  });
  const matPolyTank = sharedArtLibrary.getMaterial('house_polytank', {
    color: 0x111827,
    roughness: 0.36
  });

  // Tiled Courtyard Paving inside Compound
  const courtyard = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.14, 8.2),
    sharedArtLibrary.getMaterial('house_courtyard_tile', { color: 0xe2e8f0, roughness: 0.74 })
  );
  courtyard.position.set(0, 0.07, 0);
  courtyard.receiveShadow = true;
  group.add(courtyard);

  // Main House Body + Roof Fascia Cornice
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.5, 5.2), matWallCream);
  mainBody.position.set(0, 1.85, 0.9);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  const corniceBand = new THREE.Mesh(new THREE.BoxGeometry(7.62, 0.22, 5.42), matWhiteTrim);
  corniceBand.position.set(0, 3.52, 0.9);
  group.add(corniceBand);

  // Lower Terracotta Anti-Splash Plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.48, 0.55, 5.28), matTerracottaPlinth);
  plinth.position.set(0, 0.35, 0.9);
  plinth.castShadow = true;
  group.add(plinth);

  // Multi-Tier Hipped Ghanaian Terracotta Roof with Ridge Cap
  const roofLower = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.34, 6.4), matRoofRust);
  roofLower.position.set(0, 3.76, 0.55);
  roofLower.castShadow = true;
  const roofMid = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.36, 4.7), matRoofRust);
  roofMid.position.set(0, 4.08, 0.65);
  roofMid.castShadow = true;
  const roofPeak = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.28, 2.8), matRoofRust);
  roofPeak.position.set(0, 4.36, 0.7);
  roofPeak.castShadow = true;
  group.add(roofLower, roofMid, roofPeak);

  // Front Shaded Veranda Deck, Columns, and Decorative Balustrade
  const verandaDeck = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.28, 1.65), matTerracottaPlinth);
  verandaDeck.position.set(0, 0.2, -2.3);
  verandaDeck.receiveShadow = true;
  group.add(verandaDeck);

  for (const px of [-3.3, -1.25, 1.25, 3.3]) {
    // Stepped pillar base + fluted column shaft + capital
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.36), matTerracottaPlinth);
    colBase.position.set(px, 0.45, -2.92);
    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.95, 14), matWhiteTrim);
    colShaft.position.set(px, 2.05, -2.92);
    colShaft.castShadow = true;
    group.add(colBase, colShaft);
  }

  // Veranda Balustrade Railings on Left & Right Sides (leaving center steps open)
  for (const sideX of [-2.28, 2.28]) {
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.08, 0.12), matWhiteTrim);
    topRail.position.set(sideX, 0.92, -2.92);
    group.add(topRail);
    for (let b = -0.72; b <= 0.72; b += 0.36) {
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.58, 8), matWhiteTrim);
      baluster.position.set(sideX + b, 0.62, -2.92);
      group.add(baluster);
    }
  }

  // Panelled Mahogany Front Entrance Door + Brass Handle + Transom Light
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.42, 0.16), matWhiteTrim);
  doorFrame.position.set(0, 1.42, -1.72);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.20, 2.24, 0.18), matWoodDark);
  doorPanel.position.set(0, 1.38, -1.73);
  const doorHandle = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 10),
    sharedArtLibrary.getMaterial('gold_accessory', { color: 0xfacc15, roughness: 0.3, metalness: 0.8 })
  );
  doorHandle.position.set(0.42, 1.25, -1.84);
  group.add(doorFrame, doorPanel, doorHandle);

  // Louvered Windows with White Hood Moldings & Burglar-Proof Security Bars
  for (const wx of [-2.25, 2.25]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.52, 1.32, 0.16), matWhiteTrim);
    winFrame.position.set(wx, 1.95, -1.72);
    const winHood = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 0.28), matWhiteTrim);
    winHood.position.set(wx, 2.64, -1.78);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.12, 0.17), matGlassWindow);
    winGlass.position.set(wx, 1.95, -1.73);
    group.add(winFrame, winHood, winGlass);

    // Horizontal louver slats & burglar bars
    for (let ly = -0.36; ly <= 0.36; ly += 0.24) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.025, 0.20), matIronWork);
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

  // Gate Pillars with Warm Globe Lanterns at the Open Entrance (X = ±1.55)
  const globeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  for (const gx of [-1.55, 1.55]) {
    const gatePillar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.78, 0.44), matTerracottaPlinth);
    gatePillar.position.set(gx, 0.89, -3.95);
    gatePillar.castShadow = true;
    const pillarCap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.10, 0.52), matWhiteTrim);
    pillarCap.position.set(gx, 1.82, -3.95);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), globeMat);
    lantern.position.set(gx, 1.98, -3.95);
    group.add(gatePillar, pillarCap, lantern);
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

  // Iconic Overhead Black Polytank Water Storage Tower on Steel Frame at Back-Right
  const tankStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 2.85, 1.35),
    matIronWork
  );
  tankStand.position.set(4.25, 1.42, 2.4);
  tankStand.castShadow = true;

  const polyTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 1.48, 18),
    matPolyTank
  );
  polyTank.position.set(4.25, 3.55, 2.4);
  polyTank.castShadow = true;

  const tankLid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 0.18, 14),
    matPolyTank
  );
  tankLid.position.set(4.25, 4.35, 2.4);
  group.add(tankStand, polyTank, tankLid);

  scene.add(group);

  colliders.push(
    { id: 'ACC_HOUSE_001_MAIN', minX: -14.3, maxX: -6.7, minZ: 10.2, maxZ: 16.0, height: 4.4 },
    { id: 'ACC_HOUSE_001_POLYTANK', minX: -6.9, maxX: -5.5, minZ: 13.8, maxZ: 15.4, height: 4.3 },
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
    position: new THREE.Vector3(-10.5, 0.24, 9.2),
    lookAtPosition: new THREE.Vector3(-10.5, 0, 10.6),
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
    roughness: 0.60
  });
  const matKioskLightBlue = sharedArtLibrary.getMaterial('shop_kiosk_lightblue', {
    color: 0x38bdf8,
    roughness: 0.62
  });
  const matSignYellow = sharedArtLibrary.getMaterial('shop_sign_yellow', {
    color: 0xfacc15,
    roughness: 0.48
  });
  const matRoofGalv = sharedArtLibrary.getMaterial('shop_roof_galv', {
    color: 0x94a3b8,
    roughness: 0.45,
    metalness: 0.4
  });
  const matCounterWood = sharedArtLibrary.getMaterial('shop_counter_wood', {
    color: 0x92400e,
    roughness: 0.68
  });

  // Concrete Plinth Pad
  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.22, 5.2),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  basePad.position.set(0, 0.11, 0.2);
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

  // Sloped Corrugated Roof Overhang
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.18, 5.5), matRoofGalv);
  roof.position.set(0, 3.70, 0.38);
  roof.rotation.x = 0.07;
  roof.castShadow = true;
  group.add(roof);

  // Open Service Hatch Recess & Stocked Interior Shelves
  const hatchRecess = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 1.4, 0.16),
    sharedArtLibrary.getMaterial('shop_interior_dark', { color: 0x0f172a, roughness: 0.9 })
  );
  hatchRecess.position.set(0, 1.85, 2.06);
  group.add(hatchRecess);

  const counterLedge = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.05, 0.78), matKioskLightBlue);
  counterLedge.position.set(0, 0.62, 2.32);
  counterLedge.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.12, 0.92), matCounterWood);
  counterTop.position.set(0, 1.18, 2.36);
  group.add(counterLedge, counterTop);

  // Stocked Provision Tins & Cartons (Milo green, Peak red/white, Nido yellow, Voltic blue)
  const itemColors = [0x15803d, 0xdc2626, 0xf59e0b, 0x2563eb, 0x16a34a];
  for (let i = 0; i < 5; i++) {
    const tin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.36, 12),
      sharedArtLibrary.getMaterial(`tin_${itemColors[i]}`, { color: itemColors[i], roughness: 0.45 })
    );
    tin.position.set(-1.28 + i * 0.64, 1.42, 2.28);
    tin.castShadow = true;
    group.add(tin);
  }

  // Iconic Yellow Mobile Money Vendor Umbrella/Parasol beside the Kiosk
  const umbrellaPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.35, 8),
    matRoofGalv
  );
  umbrellaPole.position.set(2.55, 1.25, 2.25);
  const umbrellaCanopy = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 0.48, 12),
    matSignYellow
  );
  umbrellaCanopy.position.set(2.55, 2.45, 2.25);
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
    position: new THREE.Vector3(-9.5, 0.24, -6.7),
    lookAtPosition: new THREE.Vector3(-9.5, 0, -8.2),
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
  const matCanopyRed = sharedArtLibrary.getMaterial('food_canopy_red', {
    color: 0xdc2626,
    roughness: 0.56
  });
  const matWood = sharedArtLibrary.getMaterial('food_wood_counter', {
    color: 0x7c2d12,
    roughness: 0.66
  });
  const matAluminumPot = sharedArtLibrary.getMaterial('food_aluminum_pot', {
    color: 0xdbeafe,
    roughness: 0.28,
    metalness: 0.72
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.52,
    roughness: 0.15
  });

  // Concrete Dining Patio Slab
  const patioSlab = new THREE.Mesh(
    new THREE.BoxGeometry(7.4, 0.18, 5.9),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  patioSlab.position.set(0, 0.09, 0.4);
  patioSlab.receiveShadow = true;
  group.add(patioSlab);

  // Rear Kitchen Structure + Hand-Painted Chop Bar Signboard
  const kitchenBlock = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.1, 3.4), matWarmWall);
  kitchenBlock.position.set(0, 1.64, -0.7);
  kitchenBlock.castShadow = true;
  kitchenBlock.receiveShadow = true;
  group.add(kitchenBlock);

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

  // Front Shade Canopy Extending Over Serving Counter
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.2, 3.3), matCanopyRed);
  canopy.position.set(0, 2.86, 1.85);
  canopy.rotation.x = 0.12;
  canopy.castShadow = true;
  group.add(canopy);

  // Support Poles for Front Canopy
  const poleMat = sharedArtLibrary.getMaterial('env_steel_dark', { color: 0x334155, roughness: 0.6 });
  for (const px of [-3.1, 3.1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.75, 10), poleMat);
    pole.position.set(px, 1.4, 3.1);
    pole.castShadow = true;
    group.add(pole);
  }

  // Wooden Serving Counter + Ghanaian Glass "Sieve/Showcase" Food Box
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 0.95), matWood);
  counter.position.set(-0.8, 0.58, 1.95);
  counter.castShadow = true;
  group.add(counter);

  const glassCase = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.72, 0.76), matGlass);
  glassCase.position.set(-1.55, 1.44, 1.95);
  group.add(glassCase);

  // Warm trays inside the glass showcase (Waakye & Jollof trays)
  const waakyeTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.14, 0.55),
    sharedArtLibrary.getMaterial('food_waakye', { color: 0x7f1d1d, roughness: 0.8 })
  );
  waakyeTray.position.set(-1.92, 1.16, 1.95);
  const jollofTray = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.14, 0.55),
    sharedArtLibrary.getMaterial('food_jollof', { color: 0xea580c, roughness: 0.75 })
  );
  jollofTray.position.set(-1.18, 1.16, 1.95);
  group.add(waakyeTray, jollofTray);

  // Traditional Big Hammered Aluminum Waakye & Jollof Cauldrons on Counter
  for (const potX of [-0.2, 0.58]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.27, 0.46, 16), matAluminumPot);
    pot.position.set(potX, 1.31, 1.95);
    pot.castShadow = true;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), matAluminumPot);
    lid.position.set(potX, 1.55, 1.95);
    group.add(pot, lid);
  }

  // Outdoor Plastic Dining Table & Two Stools on Right Side of Patio
  const tableMat = sharedArtLibrary.getMaterial('food_plastic_blue', {
    color: 0x2563eb,
    roughness: 0.45
  });
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.76, 1.1), tableMat);
  table.position.set(2.1, 0.45, 2.1);
  table.castShadow = true;
  group.add(table);

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
      minX: 10.0,
      maxX: 11.2,
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
    position: new THREE.Vector3(7.9, 0.24, -6.7),
    lookAtPosition: new THREE.Vector3(7.9, 0, -8.5),
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
    roughness: 0.52
  });
  const matGoldSign = sharedArtLibrary.getMaterial('trotro_sign_gold', {
    color: 0xf59e0b,
    roughness: 0.45
  });
  const matSteel = sharedArtLibrary.getMaterial('env_steel_dark', {
    color: 0x334155,
    roughness: 0.65
  });
  const matBenchWood = sharedArtLibrary.getMaterial('trotro_bench_wood', {
    color: 0x92400e,
    roughness: 0.72
  });

  // Raised Curb Boarding Pad
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 0.2, 2.5),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  pad.position.set(0, 0.1, 0.2);
  pad.receiveShadow = true;
  group.add(pad);

  // Canopy Roof & Fascia
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 2.2), matShelterGreen);
  roof.position.set(0, 2.65, 0.2);
  roof.castShadow = true;
  group.add(roof);

  // Back Windscreen Panel with Route Header
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.4, 0.12), matShelterGreen);
  backPanel.position.set(0, 1.55, 1.1);
  backPanel.castShadow = true;
  group.add(backPanel);

  // Support Posts
  for (const px of [-1.9, 1.9]) {
    for (const pz of [-0.6, 1.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 10), matSteel);
      post.position.set(px, 1.35, pz);
      post.castShadow = true;
      group.add(post);
    }
  }

  // Passenger Waiting Bench
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.14, 0.62), matBenchWood);
  benchSeat.position.set(0, 0.56, 0.68);
  benchSeat.castShadow = true;
  const benchLegL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.52), matSteel);
  benchLegL.position.set(-1.2, 0.3, 0.68);
  const benchLegR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.52), matSteel);
  benchLegR.position.set(1.2, 0.3, 0.68);
  group.add(benchSeat, benchLegL, benchLegR);

  // Roadside Trotro Stop Signpost ("TROTRO STOP · OSU / CIRCLE")
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 10), matSteel);
  signPole.position.set(-2.55, 1.35, -0.85);
  signPole.castShadow = true;

  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.08), matGoldSign);
  signPlate.position.set(-2.55, 2.45, -0.85);
  signPlate.castShadow = true;
  group.add(signPole, signPlate);

  scene.add(group);

  // ACC_TROTRO_001 — Iconic Stationary Accra Trotro Minibus at the Layby Curb
  const trotroVan = buildAccraTrotroMinibus();
  trotroVan.position.set(14.6, 0, 2.25);
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
    position: new THREE.Vector3(9.0, 0.24, 4.7),
    lookAtPosition: new THREE.Vector3(9.0, 0, 6.2),
    radius: 3.1
  });
}

function buildAccraTrotroMinibus(): THREE.Group {
  const van = new THREE.Group();
  van.name = 'ACC_TROTRO_001';

  const matWhite = sharedArtLibrary.getMaterial('trotro_white', {
    color: 0xf8fafc,
    roughness: 0.42
  });
  const matCobalt = sharedArtLibrary.getMaterial('trotro_cobalt', {
    color: 0x0284c7,
    roughness: 0.48
  });
  const matStripeRed = sharedArtLibrary.getMaterial('trotro_stripe_red', {
    color: 0xdc2626,
    roughness: 0.5
  });
  const matWindow = sharedArtLibrary.getMaterial('trotro_window', {
    color: 0x1e293b,
    roughness: 0.2,
    metalness: 0.35
  });
  const matTire = sharedArtLibrary.getMaterial('trotro_tire', {
    color: 0x18181b,
    roughness: 0.85
  });
  const matRim = sharedArtLibrary.getMaterial('trotro_rim', {
    color: 0xe2e8f0,
    roughness: 0.35,
    metalness: 0.6
  });

  // Lower Blue Body Skirt
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.82, 1.86), matCobalt);
  lowerBody.position.set(0, 0.72, 0);
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  van.add(lowerBody);

  // Red & Gold Waistline Livery Stripe
  const redStripe = new THREE.Mesh(new THREE.BoxGeometry(4.54, 0.14, 1.88), matStripeRed);
  redStripe.position.set(0, 1.16, 0);
  van.add(redStripe);

  // Upper White Passenger Cabin
  const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(4.35, 0.96, 1.82), matWhite);
  upperCabin.position.set(0.05, 1.68, 0);
  upperCabin.castShadow = true;
  van.add(upperCabin);

  // Rounded Roof Cap + Roof Luggage Rack
  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.14, 1.72), matWhite);
  roofCap.position.set(0.05, 2.20, 0);
  const roofRack = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.12, 1.45),
    sharedArtLibrary.getMaterial('env_steel_dark', { color: 0x334155, roughness: 0.6 })
  );
  roofRack.position.set(0.2, 2.30, 0);
  van.add(roofCap, roofRack);

  // Side Passenger Windows & Front Windshield
  const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.56, 1.85), matWindow);
  sideWindows.position.set(0.08, 1.68, 0);
  const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 1.62), matWindow);
  frontWindshield.position.set(-2.12, 1.66, 0);
  van.add(sideWindows, frontWindshield);

  // Front Bumpers & Headlights
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 1.92), matTire);
  bumperF.position.set(-2.24, 0.44, 0);
  const bumperB = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 1.92), matTire);
  bumperB.position.set(2.24, 0.44, 0);
  van.add(bumperF, bumperB);

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  for (const hz of [-0.68, 0.68]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.28), headlightMat);
    lamp.position.set(-2.26, 0.78, hz);
    van.add(lamp);
  }

  // 4 Sculpted Wheels with Hubcaps
  const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16);
  tireGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.28, 12);
  rimGeo.rotateX(Math.PI / 2);

  const wheelPositions: Array<[number, number]> = [
    [-1.38, -0.88],
    [-1.38, 0.88],
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
  poleGroup.position.set(x, 0, z);

  const matConcrete = sharedArtLibrary.getMaterial('pole_concrete', {
    color: 0x94a3b8,
    roughness: 0.85
  });
  const matCrossArm = sharedArtLibrary.getMaterial('env_steel_dark', {
    color: 0x334155,
    roughness: 0.6
  });
  const matBulb = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  // Tapered concrete ECG utility pole
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 5.4, 10), matConcrete);
  post.position.y = 2.7;
  post.castShadow = true;
  poleGroup.add(post);

  // Electrical Cross-Arm & Ceramic Insulators
  const crossArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), matCrossArm);
  crossArm.position.set(0, 5.15, 0);
  poleGroup.add(crossArm);

  for (const iz of [-0.45, 0, 0.45]) {
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), matConcrete);
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

function buildStylizedShadeTree(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  x: number,
  z: number,
  scale = 1.0
): void {
  const tree = new THREE.Group();
  tree.name = 'ENV_TREE_001';
  tree.position.set(x, 0, z);
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
    new THREE.CylinderGeometry(0.56, 0.60, 0.20, 14),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  pitRing.position.y = 0.10;
  tree.add(pitRing);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.25, 10), matTrunk);
  trunk.position.y = 1.12;
  trunk.castShadow = true;
  tree.add(trunk);

  // Layered organic foliage clusters (Neem / Mango crown silhouette)
  const canopyCenter = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 12), matLeafDark);
  canopyCenter.position.set(0, 3.15, 0);
  canopyCenter.scale.set(1.12, 0.86, 1.12);
  canopyCenter.castShadow = true;

  const canopyLeft = new THREE.Mesh(new THREE.SphereGeometry(0.98, 12, 10), matLeafLight);
  canopyLeft.position.set(-0.78, 2.75, 0.25);
  canopyLeft.castShadow = true;

  const canopyRight = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), matLeafLight);
  canopyRight.position.set(0.75, 2.82, -0.22);
  canopyRight.castShadow = true;

  const canopyTop = new THREE.Mesh(new THREE.SphereGeometry(0.88, 12, 10), matLeafLight);
  canopyTop.position.set(0.1, 3.72, 0.12);
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
    rig.root.position.set(cfg.x, 0, cfg.z);
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
      position: new THREE.Vector3(ringX, 0.24, ringZ),
      lookAtPosition: new THREE.Vector3(cfg.x, 0, cfg.z),
      radius: 2.5
    });
  }
}
