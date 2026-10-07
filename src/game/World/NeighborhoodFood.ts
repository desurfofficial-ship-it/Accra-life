import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { FOOD_VENDOR_ANCHOR } from './GridMap';

export function buildFoodVendorJoint(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_RESTAURANT_001';
  // Custom map integration: the joint stands on its Makola market cell
  // [row 1, col 2] (GridMap.FOOD_VENDOR_ANCHOR = world [0, -16]) so the
  // interactable coincides with the visible R3F market stalls.
  group.position.set(FOOD_VENDOR_ANCHOR.world[0], 0, FOOD_VENDOR_ANCHOR.world[1]);

  const matPatioSlab = sharedArtLibrary.getMaterial('food_patio_slab', {
    color: 0xd6d3d1,
    roughness: 0.82
  });
  const matTerracottaWall = sharedArtLibrary.getMaterial('food_terra_wall', {
    color: 0xc2410c,
    roughness: 0.65
  });
  const matOchreTrim = sharedArtLibrary.getMaterial('food_ochre_trim', {
    color: 0xf59e0b,
    roughness: 0.52
  });
  const matCreamWall = sharedArtLibrary.getMaterial('food_cream_plaster', {
    color: 0xfef3c7,
    roughness: 0.72
  });
  const matWoodDark = sharedArtLibrary.getMaterial('food_wood_mahogany', {
    color: 0x78350f,
    roughness: 0.6
  });
  const matRoofRust = sharedArtLibrary.getMaterial('food_roof_corrugated', {
    map: sharedArtLibrary.getCorrugatedRoofTexture('#9a3412', '#7c2d12'),
    roughness: 0.52
  });
  const matAluminumPot = sharedArtLibrary.getMaterial('food_aluminum_cauldron', {
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.65
  });
  const matCoalPot = sharedArtLibrary.getMaterial('food_coal_pot', {
    color: 0x1f2937,
    roughness: 0.75,
    metalness: 0.35
  });
  const matEmberGlow = sharedArtLibrary.getBasicMaterial('food_ember_glow', {
    color: 0xff4500
  });
  const matWaakyeFood = sharedArtLibrary.getMaterial('food_waakye_rice_beans', {
    color: 0x7c2d12,
    roughness: 0.75
  });
  const matJollofFood = sharedArtLibrary.getMaterial('food_jollof_orange', {
    color: 0xea580c,
    roughness: 0.68
  });
  const matPlantainGold = sharedArtLibrary.getMaterial('food_plantain_gold', {
    color: 0xfacc15,
    roughness: 0.55
  });
  const matSieveGlass = sharedArtLibrary.getMaterial('food_sieve_glass', {
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42
  });
  const matLeafGreen = sharedArtLibrary.getMaterial('food_waakye_leaf', {
    color: 0x15803d,
    roughness: 0.62
  });
  const matChairBlue = sharedArtLibrary.getMaterial('food_chair_blue', {
    color: 0x1d4ed8,
    roughness: 0.42
  });
  const matChairRed = sharedArtLibrary.getMaterial('food_chair_red', {
    color: 0xdc2626,
    roughness: 0.42
  });

  // 1. Concrete dining patio slab & front walkway step
  const patioSlab = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.1, 5.8), matPatioSlab);
  patioSlab.position.set(0, 0.05, 0.1);
  patioSlab.receiveShadow = true;
  const frontStep = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 0.55), matTerracottaWall);
  frontStep.position.set(-0.2, 0.06, 2.75);
  frontStep.receiveShadow = true;
  group.add(patioSlab, frontStep);

  // Rear kitchen backdrop wall with warm cream upper plaster & menu board
  const backWallLower = new THREE.Mesh(new THREE.BoxGeometry(7.1, 1.25, 0.26), matTerracottaWall);
  backWallLower.position.set(0, 0.68, -2.55);
  backWallLower.castShadow = true;
  const backWallUpper = new THREE.Mesh(new THREE.BoxGeometry(7.1, 1.55, 0.24), matCreamWall);
  backWallUpper.position.set(0, 2.05, -2.55);
  backWallUpper.castShadow = true;

  const westHalfWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 5.2), matTerracottaWall);
  westHalfWall.position.set(-3.48, 0.58, 0.05);
  westHalfWall.castShadow = true;
  const eastHalfWall = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 5.2), matTerracottaWall);
  eastHalfWall.position.set(3.48, 0.58, 0.05);
  eastHalfWall.castShadow = true;
  group.add(backWallLower, backWallUpper, westHalfWall, eastHalfWall);

  // 2. Six sturdy mahogany pavilion posts & pitched corrugated metal canopy roof
  for (const [px, pz] of [
    [-3.35, -2.4],
    [0, -2.4],
    [3.35, -2.4],
    [-3.35, 2.45],
    [0, 2.45],
    [3.35, 2.45]
  ] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.1, 0.22), matWoodDark);
    post.position.set(px, 1.6, pz);
    post.castShadow = true;
    group.add(post);
  }

  // Perimeter structural beams (hollow overhead frame instead of a giant solid block)
  const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(7.35, 0.32, 0.28), matOchreTrim);
  frontBeam.position.set(0, 3.12, 2.45);
  const backBeam = new THREE.Mesh(new THREE.BoxGeometry(7.35, 0.32, 0.28), matOchreTrim);
  backBeam.position.set(0, 3.12, -2.4);
  group.add(frontBeam, backBeam);

  const roofSlopeFront = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.12, 3.2), matRoofRust);
  roofSlopeFront.position.set(0, 3.52, 1.42);
  roofSlopeFront.rotation.x = 0.14;
  roofSlopeFront.castShadow = true;
  const roofSlopeBack = new THREE.Mesh(new THREE.BoxGeometry(7.7, 0.12, 3.2), matRoofRust);
  roofSlopeBack.position.set(0, 3.52, -1.32);
  roofSlopeBack.rotation.x = -0.14;
  roofSlopeBack.castShadow = true;
  const ridgeCap = new THREE.Mesh(new THREE.BoxGeometry(7.75, 0.16, 0.34), matWoodDark);
  ridgeCap.position.set(0, 3.76, 0.05);
  group.add(roofSlopeFront, roofSlopeBack, ridgeCap);

  // Prominent rooftop signboard mounted ABOVE the front roof eave (never shadowed or clipped!)
  const signBacking = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.82, 0.16), matWoodDark);
  signBacking.position.set(0, 4.08, 2.38);
  signBacking.castShadow = true;
  const signTex = sharedArtLibrary.getSignboardTexture(
    'restaurant_001_v2',
    '#fef08a',
    '#b91c1c',
    'SISTER AKOSUA’S JOINT',
    'HOT WAAKYE · JOLLOF · KELEWELE · SHITO',
    '#7c2d12'
  );
  const frontSignBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(6.34, 0.72),
    sharedArtLibrary.getBasicMaterial('sign_panel_food_001_v2', { map: signTex })
  );
  frontSignBoard.position.set(0, 4.08, 2.47);
  group.add(signBacking, frontSignBoard);

  // 3. Full-width front serving counter & hearth bench (spans x = -3.05 to +2.25 so BOTH cauldrons sit solidly on it!)
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.98, 0.96), matTerracottaWall);
  counterBase.position.set(-0.4, 0.56, 1.78);
  counterBase.castShadow = true;
  const counterStripe = new THREE.Mesh(new THREE.BoxGeometry(5.34, 0.18, 0.99), matOchreTrim);
  counterStripe.position.set(-0.4, 0.82, 1.78);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.46, 0.09, 1.08), matWoodDark);
  counterTop.position.set(-0.4, 1.09, 1.78);
  group.add(counterBase, counterStripe, counterTop);

  // 4. Authentic 4-post framed glass/mesh "Waakye Showcase" on the left side of the counter
  // Built with open corner posts + glass walls so you see the trays of food inside!
  const scX = -1.95;
  const scZ = 1.78;
  const scW = 1.65;
  const scD = 0.74;
  const scH = 0.72;
  const scBase = new THREE.Mesh(new THREE.BoxGeometry(scW, 0.06, scD), matWoodDark);
  scBase.position.set(scX, 1.16, scZ);
  const scTop = new THREE.Mesh(new THREE.BoxGeometry(scW + 0.06, 0.07, scD + 0.06), matWoodDark);
  scTop.position.set(scX, 1.16 + scH, scZ);
  group.add(scBase, scTop);

  for (const [ox, oz] of [
    [-scW / 2 + 0.04, -scD / 2 + 0.04],
    [scW / 2 - 0.04, -scD / 2 + 0.04],
    [-scW / 2 + 0.04, scD / 2 - 0.04],
    [scW / 2 - 0.04, scD / 2 - 0.04]
  ] as [number, number][]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, scH, 0.07), matWoodDark);
    post.position.set(scX + ox, 1.16 + scH / 2, scZ + oz);
    group.add(post);
  }

  // Visible food trays inside the Waakye showcase (fried plantain, spaghetti, boiled eggs, shito)
  const tray1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), matPlantainGold);
  tray1.position.set(scX - 0.48, 1.24, scZ);
  const tray2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), matWaakyeFood);
  tray2.position.set(scX, 1.24, scZ);
  const tray3 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.44), matJollofFood);
  tray3.position.set(scX + 0.48, 1.24, scZ);
  const scGlassBox = new THREE.Mesh(new THREE.BoxGeometry(scW - 0.08, scH - 0.08, scD - 0.04), matSieveGlass);
  scGlassBox.position.set(scX, 1.16 + scH / 2, scZ);
  group.add(tray1, tray2, tray3, scGlassBox);

  // Stack of green katemfe leaves (Waakye leaves), black shito pot & red pepper bowl in the center of counter
  const leafStack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.11, 0.38), matLeafGreen);
  leafStack.position.set(-0.55, 1.19, 1.78);
  const shitoPot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.2, 12), matCoalPot);
  shitoPot.position.set(-0.02, 1.23, 1.78);
  const pepperBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.14, 12), matChairRed);
  pepperBowl.position.set(0.32, 1.2, 1.92);
  group.add(leafStack, shitoPot, pepperBowl);

  // 5. Two large Ghanaian aluminum cauldrons (dadesen) resting SOLIDLY on the counter hearth
  const potConfigs: Array<{ x: number; z: number; foodMat: THREE.Material }> = [
    { x: 0.78, z: 1.76, foodMat: matWaakyeFood },
    { x: 1.76, z: 1.76, foodMat: matJollofFood }
  ];
  for (const cfg of potConfigs) {
    // Charcoal pot base resting directly on counterTop (y = 1.13)
    const coalPotStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.24, 0.28, 14),
      matCoalPot
    );
    coalPotStand.position.set(cfg.x, 1.27, cfg.z);
    const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.06, 12), matEmberGlow);
    embers.position.set(cfg.x, 1.41, cfg.z);

    // Big rounded aluminum dadesen cauldron sitting on the coal pot
    const cauldron = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.34, 0.44, 18),
      matAluminumPot
    );
    cauldron.position.set(cfg.x, 1.63, cfg.z);
    cauldron.castShadow = true;

    // Visible Waakye / Jollof rice mound inside the open top of the cauldron!
    const foodFill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16),
      cfg.foodMat
    );
    foodFill.position.set(cfg.x, 1.83, cfg.z);

    // Tilted aluminum lid resting on the back rim so customers see the food
    const tiltedLid = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.12, 16), matAluminumPot);
    tiltedLid.position.set(cfg.x, 1.92, cfg.z - 0.24);
    tiltedLid.rotation.x = -0.55;

    group.add(coalPotStand, embers, cauldron, foodFill, tiltedLid);
  }

  // 6. Shaded dining tables & colorful plastic chairs in the patio
  for (const tx of [-1.75, 1.45]) {
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.07, 0.9), matOchreTrim);
    tableTop.position.set(tx, 0.78, -0.75);
    tableTop.castShadow = true;
    const tablePost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.72, 10), matWoodDark);
    tablePost.position.set(tx, 0.4, -0.75);
    group.add(tableTop, tablePost);

    for (const [cx, cz, matChair] of [
      [tx - 0.88, -0.75, matChairBlue],
      [tx + 0.88, -0.75, matChairRed]
    ] as [number, number, THREE.Material][]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.44), matChair);
      seat.position.set(cx, 0.28, cz);
      seat.castShadow = true;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.44), matChair);
      back.position.set(cx + (cx < tx ? -0.18 : 0.18), 0.62, cz);
      group.add(seat, back);
    }
  }

  // 7. Roadside hand-washing "Veronica bucket" at the right front entrance
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.52), matCoalPot);
  standBase.position.set(2.88, 0.42, 2.05);
  const veronicaBucket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.19, 0.5, 14),
    matChairBlue
  );
  veronicaBucket.position.set(2.88, 1.03, 2.05);
  const bucketLid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 14), matChairRed);
  bucketLid.position.set(2.88, 1.3, 2.05);
  group.add(standBase, veronicaBucket, bucketLid);

  scene.add(group);

  // Collider tracks the relocated group (same local offsets as the old
  // world: x -3.6..+3.6, z -2.7..+2.3 around the anchor).
  const fx = FOOD_VENDOR_ANCHOR.world[0];
  const fz = FOOD_VENDOR_ANCHOR.world[1];
  colliders.push({
    id: 'ACC_RESTAURANT_001',
    minX: fx - 3.6,
    maxX: fx + 3.6,
    minZ: fz - 2.7,
    maxZ: fz + 2.3,
    height: 3.8
  });

  interactables.push({
    id: 'food_vendor',
    assetId: 'ACC_RESTAURANT_001',
    title: 'Sister Akosua’s Waakye & Jollof Joint',
    promptLabel: 'Waakye · ₵12',
    interactionResponse: 'Sister Akosua’s Waakye — rice, beans, shito, plantain, egg.',
    position: new THREE.Vector3(fx, 0.14, fz + 3.3),
    lookAtPosition: new THREE.Vector3(fx, 0.14, fz + 1.8),
    radius: 3.4
  });
}
