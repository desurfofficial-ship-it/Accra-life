import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { PROVISION_STORE_ANCHOR } from './GridMap';

export function buildProvisionStore(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_SHOP_001';
  // Custom map integration: the store stands on its Adabraka district cell
  // [row 0, col 1] (GridMap.PROVISION_STORE_ANCHOR = world [-16, -32]) so
  // the interactable coincides with the visible R3F map cell.
  group.position.set(PROVISION_STORE_ANCHOR.world[0], 0, PROVISION_STORE_ANCHOR.world[1]);

  const matKioskBlue = sharedArtLibrary.getMaterial('shop_kiosk_blue', {
    color: 0x0284c7,
    roughness: 0.52
  });
  const matKioskLightBlue = sharedArtLibrary.getMaterial('shop_kiosk_lightblue', {
    color: 0x38bdf8,
    roughness: 0.58
  });
  const matKioskNavy = sharedArtLibrary.getMaterial('shop_kiosk_navy', {
    color: 0x0c4a6e,
    roughness: 0.62
  });
  const matSignYellow = sharedArtLibrary.getMaterial('shop_sign_yellow', {
    color: 0xfacc15,
    roughness: 0.4
  });
  const matRoofGalv = sharedArtLibrary.getMaterial('shop_roof_corrugated_galv', {
    map: sharedArtLibrary.getCorrugatedRoofTexture('#94a3b8', '#64748b'),
    roughness: 0.45,
    metalness: 0.35
  });
  const matCounterWood = sharedArtLibrary.getMaterial('shop_counter_wood', {
    color: 0x92400e,
    roughness: 0.62
  });
  const matInteriorCream = sharedArtLibrary.getMaterial('shop_interior_cream', {
    color: 0xfef3c7,
    roughness: 0.7
  });
  const matIronBar = sharedArtLibrary.getMaterial('house_ironwork', {
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.55
  });
  const matWhiteTrim = sharedArtLibrary.getMaterial('shop_white_trim', {
    color: 0xf8fafc,
    roughness: 0.55
  });
  const matMiloGreen = sharedArtLibrary.getMaterial('shop_milo_green', {
    color: 0x15803d,
    roughness: 0.42
  });
  const matTomatoRed = sharedArtLibrary.getMaterial('shop_tomato_red', {
    color: 0xdc2626,
    roughness: 0.42
  });
  const matPeakBlue = sharedArtLibrary.getMaterial('shop_peak_blue', {
    color: 0x1d4ed8,
    roughness: 0.42
  });
  const matCrateAmber = sharedArtLibrary.getMaterial('shop_crate_amber', {
    color: 0xd97706,
    roughness: 0.58
  });
  const matBreadGold = sharedArtLibrary.getMaterial('shop_bread_gold', {
    color: 0xb45309,
    roughness: 0.72
  });
  const matGlassCase = sharedArtLibrary.getMaterial('shop_glass_case', {
    color: 0xe0f2fe,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.5
  });

  // 1. Concrete foundation pad & front customer step
  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.1, 5.6),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  basePad.position.set(0, 0.05, 0.25);
  basePad.receiveShadow = true;
  const frontStep = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 0.12, 0.6),
    sharedArtLibrary.getMaterial('env_concrete_dark', { color: 0x64748b, roughness: 0.88 })
  );
  frontStep.position.set(-0.35, 0.06, 2.75);
  frontStep.receiveShadow = true;
  group.add(basePad, frontStep);

  // 2. Main container shell with a GENUINELY HOLLOW recessed front serving alcove
  // Back section (z from -2.1 to +1.35)
  const lowerPlinth = new THREE.Mesh(new THREE.BoxGeometry(5.76, 0.34, 4.32), matKioskNavy);
  lowerPlinth.position.set(0, 0.27, 0);
  group.add(lowerPlinth);

  const rearBody = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.86, 3.45), matKioskBlue);
  rearBody.position.set(0, 1.72, -0.375);
  rearBody.castShadow = true;
  rearBody.receiveShadow = true;
  group.add(rearBody);

  // Front Left Pier (x in [-2.8, -2.05], z in [1.35, 2.1])
  const frontPierL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.86, 0.75), matKioskBlue);
  frontPierL.position.set(-2.425, 1.72, 1.725);
  frontPierL.castShadow = true;

  // Front Right Pier (x in [1.35, 2.8], z in [1.35, 2.1])
  const frontPierR = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.86, 0.75), matKioskBlue);
  frontPierR.position.set(2.075, 1.72, 1.725);
  frontPierR.castShadow = true;

  // Front Lower Apron below serving window (x in [-2.05, 1.35], y in [0.29, 1.16])
  const frontLowerWall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.88, 0.75), matKioskBlue);
  frontLowerWall.position.set(-0.35, 0.73, 1.725);
  frontLowerWall.castShadow = true;

  // Front Upper Header above serving window (x in [-2.05, 1.35], y in [2.62, 3.15])
  const frontUpperHeader = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.53, 0.75), matKioskBlue);
  frontUpperHeader.position.set(-0.35, 2.885, 1.725);
  frontUpperHeader.castShadow = true;
  group.add(frontPierL, frontPierR, frontLowerWall, frontUpperHeader);

  // Corrugated steel container ribs on side walls ONLY (never crossing the front window!)
  for (let rz = -1.8; rz <= 1.8; rz += 0.52) {
    const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.78, 0.1), matKioskLightBlue);
    ribL.position.set(-2.82, 1.72, rz);
    const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.78, 0.1), matKioskLightBlue);
    ribR.position.set(2.82, 1.72, rz);
    group.add(ribL, ribR);
  }
  for (const [cx, cz] of [
    [-2.8, -2.1],
    [2.8, -2.1],
    [-2.8, 2.1],
    [2.8, 2.1]
  ] as [number, number][]) {
    const cornerPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.05, 0.16), matWhiteTrim);
    cornerPost.position.set(cx, 1.62, cz);
    group.add(cornerPost);
  }

  // 3. Brightly lit recessed interior alcove with stocked provision shelves
  const alcoveBackWall = new THREE.Mesh(new THREE.BoxGeometry(3.36, 1.46, 0.06), matInteriorCream);
  alcoveBackWall.position.set(-0.35, 1.89, 1.39);
  const alcoveCeilingLight = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.04, 0.14),
    sharedArtLibrary.getBasicMaterial('shop_warm_tube_light', { color: 0xfef9c3 })
  );
  alcoveCeilingLight.position.set(-0.35, 2.58, 1.68);
  group.add(alcoveBackWall, alcoveCeilingLight);

  // White window surround trim framing the open alcove
  const trimTop = new THREE.Mesh(new THREE.BoxGeometry(3.56, 0.1, 0.12), matWhiteTrim);
  trimTop.position.set(-0.35, 2.62, 2.1);
  const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.12), matWhiteTrim);
  trimLeft.position.set(-2.08, 1.88, 2.1);
  const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.12), matWhiteTrim);
  trimRight.position.set(1.38, 1.88, 2.1);
  group.add(trimTop, trimLeft, trimRight);

  // 3 deep wooden shelves inside the alcove (z = 1.68, completely in front of alcoveBackWall at z = 1.39)
  const shelfHeights = [1.34, 1.76, 2.18];
  for (let sIdx = 0; sIdx < shelfHeights.length; sIdx++) {
    const sy = shelfHeights[sIdx];
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.28, 0.05, 0.34), matCounterWood);
    shelf.position.set(-0.35, sy, 1.66);
    group.add(shelf);

    for (let tx = -1.78; tx <= 1.08; tx += 0.26) {
      const colIdx = Math.round((tx + 2) * 10 + sIdx * 3) % 4;
      const tinMat =
        colIdx === 0
          ? matMiloGreen
          : colIdx === 1
            ? matTomatoRed
            : colIdx === 2
              ? matPeakBlue
              : matSignYellow;
      const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 12), tinMat);
      tin.position.set(tx, sy + 0.145, 1.68);
      group.add(tin);
    }
  }

  // Open wooden shutters swung outward on left and right of the serving window
  for (const [shX, rotY] of [
    [-2.35, -0.35],
    [1.65, 0.35]
  ] as [number, number][]) {
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.44, 0.06), matKioskNavy);
    shutter.position.set(shX, 1.88, 2.22);
    shutter.rotation.y = rotY;
    group.add(shutter);
  }

  // 4. Front serving counter, wooden countertop, and glass bread/pastry display box
  const counterLedge = new THREE.Mesh(new THREE.BoxGeometry(3.65, 1.04, 0.65), matKioskLightBlue);
  counterLedge.position.set(-0.35, 0.58, 2.24);
  counterLedge.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 0.82), matCounterWood);
  counterTop.position.set(-0.35, 1.14, 2.28);
  group.add(counterLedge, counterTop);

  // Glass Sugar Bread & Egg Showcase on left end of counter
  const breadCaseBase = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.06, 0.48), matCounterWood);
  breadCaseBase.position.set(-1.55, 1.22, 2.32);
  const breadCaseGlass = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.42, 0.44), matGlassCase);
  breadCaseGlass.position.set(-1.55, 1.45, 2.32);
  const loaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.22), matBreadGold);
  loaf1.position.set(-1.72, 1.32, 2.32);
  const loaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.22), matBreadGold);
  loaf2.position.set(-1.36, 1.32, 2.32);
  group.add(breadCaseBase, breadCaseGlass, loaf1, loaf2);

  // 5. Sloped corrugated roof overhang & HIGH rooftop signboard (never blocked by struts!)
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(5.86, 0.42, 4.46), matSignYellow);
  fascia.position.set(0, 3.32, 0);
  group.add(fascia);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.14, 5.6), matRoofGalv);
  roof.position.set(0, 3.62, 0.35);
  roof.rotation.x = 0.06;
  roof.castShadow = true;
  group.add(roof);

  // Prominent rooftop billboard mounted cleanly ABOVE the front roof overhang
  const signBackboard = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.86, 0.16), matKioskNavy);
  signBackboard.position.set(0, 4.18, 2.15);
  signBackboard.castShadow = true;
  const signTex = sharedArtLibrary.getSignboardTexture(
    'shop_001_v2',
    '#facc15',
    '#0284c7',
    'ADABRAKA PROVISIONS',
    'MOMO · AIRTIME · BREAD · COLD DRINKS'
  );
  const frontSignPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(5.36, 0.76),
    sharedArtLibrary.getBasicMaterial('sign_panel_shop_001_v2', { map: signTex })
  );
  frontSignPanel.position.set(0, 4.18, 2.24);
  group.add(signBackboard, frontSignPanel);

  // Side-only support posts for rooftop sign
  for (const sx of [-2.4, 2.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), matIronBar);
    post.position.set(sx, 3.76, 2.15);
    group.add(post);
  }

  // 6. Stacked Coca-Cola & Fanta bottle crates on the left side (-X)
  for (let cy = 0; cy < 4; cy++) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.32, 0.48),
      cy % 2 === 0 ? matTomatoRed : matCrateAmber
    );
    crate.position.set(-2.55, 0.26 + cy * 0.33, 2.42);
    crate.castShadow = true;
    group.add(crate);
  }

  // 7. MTN Mobile Money Agent corner stand & yellow umbrella on the right side (+X)
  const momoDesk = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.96, 0.78), matSignYellow);
  momoDesk.position.set(2.15, 0.56, 2.38);
  momoDesk.castShadow = true;
  const momoDeskBanner = new THREE.Mesh(new THREE.BoxGeometry(1.17, 0.26, 0.8), matKioskBlue);
  momoDeskBanner.position.set(2.15, 0.82, 2.38);
  const momoDeskTop = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 0.88), matCounterWood);
  momoDeskTop.position.set(2.15, 1.06, 2.38);
  const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 2.35, 10), matIronBar);
  umbrellaPole.position.set(2.15, 1.82, 2.38);
  const umbrellaCanopy = new THREE.Mesh(new THREE.ConeGeometry(1.28, 0.52, 8), matSignYellow);
  umbrellaCanopy.position.set(2.15, 2.95, 2.38);
  umbrellaCanopy.castShadow = true;
  const umbrellaRim = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.08, 8), matKioskBlue);
  umbrellaRim.position.set(2.15, 2.68, 2.38);
  group.add(momoDesk, momoDeskBanner, momoDeskTop, umbrellaPole, umbrellaCanopy, umbrellaRim);

  scene.add(group);

  // Collider tracks the relocated group (same local offsets as the old
  // world: x -3.1..+3.1, z -2.4..+2.75 around the anchor).
  const sx = PROVISION_STORE_ANCHOR.world[0];
  const sz = PROVISION_STORE_ANCHOR.world[1];
  colliders.push({
    id: 'ACC_SHOP_001',
    minX: sx - 3.1,
    maxX: sx + 3.1,
    minZ: sz - 2.4,
    maxZ: sz + 2.75,
    height: 4.2
  });

  interactables.push({
    id: 'provision_shop',
    assetId: 'ACC_SHOP_001',
    title: 'Adabraka Provision Store & MoMo',
    promptLabel: 'Shop',
    interactionResponse: 'Adabraka Provisions — Milo, Peak milk, sugar bread, MoMo.',
    position: new THREE.Vector3(sx, 0.14, sz + 3.7),
    lookAtPosition: new THREE.Vector3(sx, 0.14, sz + 2.2),
    radius: 3.4
  });
}
