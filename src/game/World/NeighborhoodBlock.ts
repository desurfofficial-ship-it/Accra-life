import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';

// ============================================================================
// CHALÉ LIFE — Art Bible Asset Specification Registry (Rules 23 & 24)
// ============================================================================
export interface AssetSpecification {
  assetId: string;
  purpose: string;
  location: string;
  scaleMeters: [number, number, number];
  materials: string[];
  colorLanguage: string[];
  detailLevel: 'medium-stylized';
}

export const NEIGHBORHOOD_ASSET_MANIFEST: Record<string, AssetSpecification> = {
  ACC_HOUSE_001: {
    assetId: 'ACC_HOUSE_001',
    purpose: 'Player residential compound house with veranda, breeze-block wall, and water tank stand',
    location: 'South-West plot (-10.5, 0, 12.0)',
    scaleMeters: [9.6, 4.4, 8.2],
    materials: ['Warm plastered masonry', 'Terracotta hipped roofing', 'Hardwood door & louver frames'],
    colorLanguage: ['#FDE68A warm cream walls', '#9A3412 terracotta roof', '#78350F mahogany woodwork'],
    detailLevel: 'medium-stylized'
  },
  ACC_SHOP_001: {
    assetId: 'ACC_SHOP_001',
    purpose: 'Neighborhood provision store & kiosk with service window, shelves, and yellow fascia',
    location: 'North-West plot (-9.5, 0, -10.5)',
    scaleMeters: [6.0, 3.5, 4.8],
    materials: ['Painted container/masonry panels', 'Corrugated steel roof', 'Counter display shelves'],
    colorLanguage: ['#0284C7 Accra kiosk blue', '#FACC15 vibrant yellow fascia', '#F8FAFC trim'],
    detailLevel: 'medium-stylized'
  },
  ACC_RESTAURANT_001: {
    assetId: 'ACC_RESTAURANT_001',
    purpose: 'Roadside Waakye & Jollof food joint with glass food showcase, cooking pots, and canopy seating',
    location: 'North-East plot (8.5, 0, -10.5)',
    scaleMeters: [6.8, 3.5, 5.2],
    materials: ['Warm ochre plaster', 'Striped fabric awning', 'Aluminum cooking pots & wood counter'],
    colorLanguage: ['#EA580C warm spice orange', '#DC2626 canopy accent', '#FEF3C7 cream walls'],
    detailLevel: 'medium-stylized'
  },
  ACC_PROP_001: {
    assetId: 'ACC_PROP_001',
    purpose: 'Neighborhood Trotro stop commuter shelter, waiting bench, and route signpost',
    location: 'South-East roadside curb (9.0, 0, 6.2)',
    scaleMeters: [4.6, 2.8, 2.4],
    materials: ['Painted steel posts', 'Corrugated shade canopy', 'Hardwood passenger bench'],
    colorLanguage: ['#059669 emerald canopy', '#F59E0B route sign gold', '#334155 steel frame'],
    detailLevel: 'medium-stylized'
  },
  ACC_PROP_002: {
    assetId: 'ACC_PROP_002',
    purpose: 'Concrete utility & streetlight pole along neighborhood road',
    location: 'Roadside curb intervals',
    scaleMeters: [0.35, 5.4, 0.9],
    materials: ['Precast concrete post', 'Galvanized lamp arm', 'Warm LED luminaire'],
    colorLanguage: ['#94A3B8 concrete gray', '#FEF08A warm bulb glow'],
    detailLevel: 'medium-stylized'
  },
  ACC_PROP_003: {
    assetId: 'ACC_PROP_003',
    purpose: 'Accra roadside open storm drain gutter with concrete crossover slabs',
    location: 'North and South street edges (Z = ±4.2)',
    scaleMeters: [64.0, 0.35, 0.85],
    materials: ['Cast concrete channel', 'Concrete pedestrian entrance bridges'],
    colorLanguage: ['#94A3B8 concrete', '#475569 recessed channel'],
    detailLevel: 'medium-stylized'
  }
};

export interface BuiltNeighborhoodBlock {
  colliders: ColliderBox[];
  interactables: InteractableTarget[];
}

export function buildFirstNeighborhoodBlock(scene: THREE.Scene): BuiltNeighborhoodBlock {
  const colliders: ColliderBox[] = [];
  const interactables: InteractableTarget[] = [];

  // Shared stylized material palette (warm, clean, consistent roughness)
  const matLateriteEarth = new THREE.MeshStandardMaterial({ color: 0xd9b99b, roughness: 0.92 });
  const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.86 });
  const matRoadLine = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const matSidewalk = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.82 });
  const matConcreteDark = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88 });
  const matGutterChannel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });

  // 1. Base Ground Plane (Warm Accra Laterite Earth)
  const groundGeo = new THREE.PlaneGeometry(84, 84);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, matLateriteEarth);
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Main Neighborhood Asphalt Road (East-West along Z = 0)
  const road = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 7.4), matAsphalt);
  road.position.set(0, 0.04, 0);
  road.receiveShadow = true;
  scene.add(road);

  // Road Center Dashed Markings & Edge Lines
  const dashGeo = new THREE.BoxGeometry(2.4, 0.09, 0.18);
  for (let x = -28; x <= 28; x += 5.4) {
    const dash = new THREE.Mesh(dashGeo, matRoadLine);
    dash.position.set(x, 0.05, 0);
    scene.add(dash);
  }

  // 3. ACC_PROP_003 — Roadside Open Storm Gutters & Concrete Entrance Crossover Slabs
  buildRoadsideGuttersAndWalkways(scene, matSidewalk, matConcreteDark, matGutterChannel);

  // 4. ACC_HOUSE_001 — Player Residential Compound House (South-West Plot)
  buildPlayerCompoundHouse(scene, colliders, interactables);

  // 5. ACC_SHOP_001 — Neighborhood Provision Store (North-West Plot)
  buildProvisionStore(scene, colliders, interactables);

  // 6. ACC_RESTAURANT_001 — Roadside Waakye & Jollof Food Joint (North-East Plot)
  buildFoodVendorJoint(scene, colliders, interactables);

  // 7. ACC_PROP_001 — Neighborhood Trotro Stop Shelter & Signpost (South-East Curb)
  buildTrotroStop(scene, colliders, interactables);

  // 8. ACC_PROP_002 — Concrete Streetlight & Utility Poles + Stylized Shade Trees
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

  const treeCoords: Array<[number, number]> = [
    [-19.5, -6.8],
    [-1.5, -7.2],
    [17.5, -6.8],
    [-19.5, 7.2],
    [0.5, 7.8],
    [17.5, 7.2]
  ];
  for (const [tx, tz] of treeCoords) {
    buildStylizedShadeTree(scene, colliders, tx, tz);
  }

  // 9. Street-End Boundary Bollards (marks the East/West ends of the Phase 1 block)
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });
  for (const bx of [-25.6, 25.6]) {
    for (const bz of [-5.8, -2.2, 0, 2.2, 5.8]) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.85, 10), bollardMat);
      bollard.position.set(bx, 0.42, bz);
      bollard.castShadow = true;
      scene.add(bollard);
    }
  }

  return { colliders, interactables };
}

function buildRoadsideGuttersAndWalkways(
  scene: THREE.Scene,
  matSidewalk: THREE.Material,
  matConcreteDark: THREE.Material,
  matGutterChannel: THREE.Material
): void {
  const gutterGroup = new THREE.Group();
  gutterGroup.name = 'ACC_PROP_003';

  // North & South Pedestrian Walkways
  const northWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.16, 3.2), matSidewalk);
  northWalk.position.set(0, 0.08, -6.0);
  northWalk.receiveShadow = true;

  const southWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.16, 3.2), matSidewalk);
  southWalk.position.set(0, 0.08, 6.0);
  southWalk.receiveShadow = true;
  gutterGroup.add(northWalk, southWalk);

  // Open storm drain channels between road edge (Z = ±3.7) and sidewalk (Z = ±4.4)
  for (const sign of [-1, 1]) {
    const channelFloor = new THREE.Mesh(new THREE.BoxGeometry(68, 0.04, 0.68), matGutterChannel);
    channelFloor.position.set(0, 0.02, sign * 4.05);

    const innerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.18, 0.12), matConcreteDark);
    innerWall.position.set(0, 0.09, sign * 3.74);

    const outerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.18, 0.12), matConcreteDark);
    outerWall.position.set(0, 0.09, sign * 4.36);

    gutterGroup.add(channelFloor, innerWall, outerWall);
  }

  // Concrete crossover slabs bridging the gutter at each building entrance & crossing
  const crossoverPositions: Array<[number, number, number]> = [
    [-10.5, 4.05, 3.4], // Player Home entrance slab
    [-9.5, -4.05, 3.4], // Provision Store entrance slab
    [8.5, -4.05, 3.8],  // Food Joint entrance slab
    [9.0, 4.05, 4.2],   // Trotro Stop boarding slab
    [0, -4.05, 2.8],    // Central pedestrian crossing North
    [0, 4.05, 2.8]      // Central pedestrian crossing South
  ];

  for (const [cx, cz, width] of crossoverPositions) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 0.82), matSidewalk);
    slab.position.set(cx, 0.09, cz);
    slab.receiveShadow = true;
    gutterGroup.add(slab);
  }

  scene.add(gutterGroup);
}

// ============================================================================
// 1. ACC_HOUSE_001 — Contemporary Accra Compound House
// ============================================================================
function buildPlayerCompoundHouse(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_HOUSE_001';
  group.position.set(-10.5, 0, 12.2);

  const matWallCream = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.72 });
  const matTerracottaPlinth = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 });
  const matRoofRust = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.62 });
  const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 });
  const matGlassWindow = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.2 });
  const matWhiteTrim = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const matCompoundWall = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 });
  const matPolyTank = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4 });

  // Tiled Courtyard Floor inside Compound
  const courtyard = new THREE.Mesh(
    new THREE.BoxGeometry(9.6, 0.14, 8.2),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.75 })
  );
  courtyard.position.set(0, 0.07, 0);
  courtyard.receiveShadow = true;
  group.add(courtyard);

  // Main House Body
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.5, 5.2), matWallCream);
  mainBody.position.set(0, 1.85, 0.9);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  // Lower Terracotta Plinth Band (prevents rain splash staining — classic Accra detail)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.48, 0.55, 5.28), matTerracottaPlinth);
  plinth.position.set(0, 0.35, 0.9);
  plinth.castShadow = true;
  group.add(plinth);

  // Hipped Terracotta Roof (2-tier stepped stylized hip roof)
  const roofLower = new THREE.Mesh(new THREE.BoxGeometry(8.1, 0.38, 6.2), matRoofRust);
  roofLower.position.set(0, 3.75, 0.6);
  roofLower.castShadow = true;
  const roofUpper = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.42, 4.4), matRoofRust);
  roofUpper.position.set(0, 4.12, 0.7);
  roofUpper.castShadow = true;
  group.add(roofLower, roofUpper);

  // Front Shaded Veranda Deck & Support Pillars
  const verandaDeck = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.28, 1.6), matTerracottaPlinth);
  verandaDeck.position.set(0, 0.2, -2.3);
  verandaDeck.receiveShadow = true;
  group.add(verandaDeck);

  for (const px of [-3.2, -1.2, 1.2, 3.2]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 3.4, 0.26), matWhiteTrim);
    pillar.position.set(px, 1.9, -2.9);
    pillar.castShadow = true;
    group.add(pillar);
  }

  // Front Hardwood Door & Louver Windows
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.35, 0.16), matWhiteTrim);
  doorFrame.position.set(0, 1.4, -1.72);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.2, 0.18), matWoodDark);
  doorPanel.position.set(0, 1.38, -1.73);
  group.add(doorFrame, doorPanel);

  for (const wx of [-2.2, 2.2]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.25, 0.16), matWhiteTrim);
    winFrame.position.set(wx, 1.95, -1.72);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 0.18), matGlassWindow);
    winGlass.position.set(wx, 1.95, -1.73);
    group.add(winFrame, winGlass);
  }

  // Low Perimeter Compound Wall with Open Front Entrance Gateway
  const leftFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.45, 0.28), matCompoundWall);
  leftFrontWall.position.set(-3.2, 0.72, -3.95);
  leftFrontWall.castShadow = true;

  const rightFrontWall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.45, 0.28), matCompoundWall);
  rightFrontWall.position.set(3.2, 0.72, -3.95);
  rightFrontWall.castShadow = true;

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

  // Iconic Overhead Black Water Storage Tank (Polytank) on Steel Tower at Back-Right
  const tankStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.8, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
  );
  tankStand.position.set(4.3, 1.4, 2.4);
  tankStand.castShadow = true;

  const polyTank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 1.45, 16),
    matPolyTank
  );
  polyTank.position.set(4.3, 3.5, 2.4);
  polyTank.castShadow = true;
  group.add(tankStand, polyTank);

  scene.add(group);

  // Main House Collider (allows player to walk through the front gate onto the porch)
  colliders.push(
    { id: 'ACC_HOUSE_001_MAIN', minX: -14.3, maxX: -6.7, minZ: 10.2, maxZ: 16.0, height: 4.3 },
    { id: 'ACC_HOUSE_001_POLYTANK', minX: -6.9, maxX: -5.5, minZ: 13.8, maxZ: 15.4, height: 4.2 },
    { id: 'ACC_HOUSE_001_WALL_L', minX: -15.3, maxX: -12.1, minZ: 8.0, maxZ: 8.5, height: 1.5 },
    { id: 'ACC_HOUSE_001_WALL_R', minX: -8.9, maxX: -5.7, minZ: 8.0, maxZ: 8.5, height: 1.5 },
    { id: 'ACC_HOUSE_001_WALL_W', minX: -15.4, maxX: -14.9, minZ: 8.0, maxZ: 16.4, height: 1.7 },
    { id: 'ACC_HOUSE_001_WALL_E', minX: -6.1, maxX: -5.5, minZ: 8.0, maxZ: 16.4, height: 1.7 },
    { id: 'ACC_HOUSE_001_WALL_BACK', minX: -15.4, maxX: -5.5, minZ: 15.9, maxZ: 16.4, height: 1.7 }
  );

  interactables.push({
    id: 'home_door',
    assetId: 'ACC_HOUSE_001',
    title: 'Player Compound House (ACC_HOUSE_001)',
    promptLabel: 'Enter Home Veranda',
    interactionResponse: 'ACC_HOUSE_001: Compound House Entrance — Ready for home interior.',
    position: new THREE.Vector3(-10.5, 0.24, 9.2),
    lookAtPosition: new THREE.Vector3(-10.5, 0, 10.6),
    radius: 3.1
  });
}

// ============================================================================
// 2. ACC_SHOP_001 — Neighborhood Provision Store & Blue Kiosk
// ============================================================================
function buildProvisionStore(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_SHOP_001';
  group.position.set(-9.5, 0, -10.4);

  const matKioskBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.62 });
  const matKioskLightBlue = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.65 });
  const matSignYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.48 });
  const matRoofGalv = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.35 });
  const matCounterWood = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });

  // Concrete Plinth Pad
  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.22, 5.0),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 })
  );
  basePad.position.set(0, 0.11, 0.2);
  basePad.receiveShadow = true;
  group.add(basePad);

  // Main Kiosk Structure
  const kioskBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.0, 4.2), matKioskBlue);
  kioskBody.position.set(0, 1.6, 0);
  kioskBody.castShadow = true;
  kioskBody.receiveShadow = true;
  group.add(kioskBody);

  // Upper Yellow Signboard Fascia ("PROVISIONS & MOMO")
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.62, 4.4), matSignYellow);
  fascia.position.set(0, 3.25, 0);
  fascia.castShadow = true;
  group.add(fascia);

  // Accent Red/Green Brand Stripe on Fascia Front
  const fasciaStripe = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.18, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
  );
  fasciaStripe.position.set(0, 3.25, 2.22);
  group.add(fasciaStripe);

  // Sloped Corrugated Roof Overhang
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.18, 5.4), matRoofGalv);
  roof.position.set(0, 3.64, 0.35);
  roof.rotation.x = 0.06;
  roof.castShadow = true;
  group.add(roof);

  // Open Service Hatch Recess & Counter Shelf (Facing South toward street)
  const hatchRecess = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.35, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
  );
  hatchRecess.position.set(0, 1.85, 2.06);
  group.add(hatchRecess);

  const counterLedge = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 0.75), matKioskLightBlue);
  counterLedge.position.set(0, 0.62, 2.32);
  counterLedge.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.12, 0.88), matCounterWood);
  counterTop.position.set(0, 1.18, 2.35);
  group.add(counterLedge, counterTop);

  // Colorful Provision Goods Stacked on Counter (Milo tins, milk cartons, water packs)
  const itemColors = [0x16a34a, 0xef4444, 0xf59e0b, 0x3b82f6];
  for (let i = 0; i < 4; i++) {
    const tin = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.38, 0.28),
      new THREE.MeshStandardMaterial({ color: itemColors[i], roughness: 0.5 })
    );
    tin.position.set(-1.1 + i * 0.72, 1.42, 2.25);
    tin.castShadow = true;
    group.add(tin);
  }

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
    title: 'Neighborhood Provision Store (ACC_SHOP_001)',
    promptLabel: 'Shop at Provision Counter',
    interactionResponse: 'ACC_SHOP_001: Provision Store Counter — Ready for shopping & Mobile Money.',
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

  const matWarmWall = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.74 });
  const matSpiceTrim = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.62 });
  const matCanopyRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.58 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.68 });
  const matAluminumPot = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.65 });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.55,
    roughness: 0.15
  });

  // Concrete Dining Patio Slab
  const patioSlab = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.18, 5.8),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 })
  );
  patioSlab.position.set(0, 0.09, 0.4);
  patioSlab.receiveShadow = true;
  group.add(patioSlab);

  // Rear Kitchen Structure
  const kitchenBlock = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.1, 3.4), matWarmWall);
  kitchenBlock.position.set(0, 1.64, -0.7);
  kitchenBlock.castShadow = true;
  kitchenBlock.receiveShadow = true;
  group.add(kitchenBlock);

  const headerBand = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.55, 3.6), matSpiceTrim);
  headerBand.position.set(0, 3.25, -0.7);
  headerBand.castShadow = true;
  group.add(headerBand);

  // Front Shade Canopy Extending Over Serving Counter
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.2, 3.2), matCanopyRed);
  canopy.position.set(0, 2.85, 1.8);
  canopy.rotation.x = 0.12;
  canopy.castShadow = true;
  group.add(canopy);

  // Support Poles for Front Canopy
  for (const px of [-3.1, 3.1]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.75, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    pole.position.set(px, 1.4, 3.1);
    pole.castShadow = true;
    group.add(pole);
  }

  // Wooden Serving Counter + Glass "Sieve/Showcase" Food Display Box
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 0.95), matWood);
  counter.position.set(-0.8, 0.58, 1.95);
  counter.castShadow = true;
  group.add(counter);

  const glassCase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.68, 0.72), matGlass);
  glassCase.position.set(-1.5, 1.42, 1.95);
  group.add(glassCase);

  // Traditional Big Aluminum Waakye & Jollof Pots on the Counter
  for (const potX of [-0.2, 0.55]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.46, 14), matAluminumPot);
    pot.position.set(potX, 1.31, 1.95);
    pot.castShadow = true;
    group.add(pot);
  }

  // Outdoor Plastic Table & Two Stools on Right Side of Patio
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.76, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5 })
  );
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
    title: 'Roadside Waakye & Jollof Joint (ACC_RESTAURANT_001)',
    promptLabel: 'Order at Food Showcase',
    interactionResponse: 'ACC_RESTAURANT_001: Waakye & Jollof Stand — Ready for food & hunger system.',
    position: new THREE.Vector3(7.9, 0.24, -6.7),
    lookAtPosition: new THREE.Vector3(7.9, 0, -8.5),
    radius: 3.1
  });
}

// ============================================================================
// 4. ACC_PROP_001 — Neighborhood Trotro Stop Shelter & Route Signpost
// ============================================================================
function buildTrotroStop(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_PROP_001';
  group.position.set(9.0, 0, 6.2);

  const matShelterGreen = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.55 });
  const matGoldSign = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
  const matBenchWood = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.72 });

  // Raised Curb Boarding Pad
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 0.2, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 })
  );
  pad.position.set(0, 0.1, 0.2);
  pad.receiveShadow = true;
  group.add(pad);

  // Canopy Roof & Fascia
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 2.2), matShelterGreen);
  roof.position.set(0, 2.65, 0.2);
  roof.castShadow = true;
  group.add(roof);

  // Back Windscreen Panel
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.4, 0.12), matShelterGreen);
  backPanel.position.set(0, 1.55, 1.1);
  backPanel.castShadow = true;
  group.add(backPanel);

  // Support Posts
  for (const px of [-1.9, 1.9]) {
    for (const pz of [-0.6, 1.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), matSteel);
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
  const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8), matSteel);
  signPole.position.set(-2.55, 1.35, -0.85);
  signPole.castShadow = true;

  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.08), matGoldSign);
  signPlate.position.set(-2.55, 2.45, -0.85);
  signPlate.castShadow = true;
  group.add(signPole, signPlate);

  scene.add(group);

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
    }
  );

  interactables.push({
    id: 'trotro_stop',
    assetId: 'ACC_PROP_001',
    title: 'Neighborhood Trotro Stop (ACC_PROP_001)',
    promptLabel: 'Wait at Trotro Stop',
    interactionResponse: 'ACC_PROP_001: Trotro Stop Shelter — Ready for Trotro & Taxi transport.',
    position: new THREE.Vector3(9.0, 0.24, 4.7),
    lookAtPosition: new THREE.Vector3(9.0, 0, 6.2),
    radius: 3.1
  });
}

// ============================================================================
// 5. ACC_PROP_002 — Concrete Streetlight & Utility Pole + Stylized Shade Trees
// ============================================================================
function buildUtilityPole(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  x: number,
  z: number,
  armDirectionZ: number
): void {
  const poleGroup = new THREE.Group();
  poleGroup.name = 'ACC_PROP_002';
  poleGroup.position.set(x, 0, z);

  const matConcrete = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
  const matBulb = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.2, 0.24), matConcrete);
  post.position.y = 2.6;
  post.castShadow = true;
  poleGroup.add(post);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.25), matConcrete);
  arm.position.set(0, 4.95, armDirectionZ * 0.55);
  poleGroup.add(arm);

  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.44), matBulb);
  lampHead.position.set(0, 4.86, armDirectionZ * 1.05);
  poleGroup.add(lampHead);

  scene.add(poleGroup);

  colliders.push({
    id: `ACC_PROP_002_${x}_${z}`,
    minX: x - 0.25,
    maxX: x + 0.25,
    minZ: z - 0.25,
    maxZ: z + 0.25
  });
}

function buildStylizedShadeTree(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  x: number,
  z: number
): void {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.30, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
  );
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  const canopyMain = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.5, 1),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.76 })
  );
  canopyMain.position.y = 2.95;
  canopyMain.castShadow = true;
  tree.add(canopyMain);

  scene.add(tree);

  colliders.push({
    id: `TREE_${x}_${z}`,
    minX: x - 0.42,
    maxX: x + 0.42,
    minZ: z - 0.42,
    maxZ: z + 0.42
  });
}
