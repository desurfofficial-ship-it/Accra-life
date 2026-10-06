import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { getSurfaceHeightAt } from './WorldSurface';

export function buildProvisionStore(
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

  const basePad = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.1, 5.2),
    sharedArtLibrary.getMaterial('env_concrete_pad', { color: 0x94a3b8, roughness: 0.85 })
  );
  basePad.position.set(0, 0.05, 0.2);
  basePad.receiveShadow = true;
  group.add(basePad);

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
    sharedArtLibrary.getBasicMaterial('sign_panel_shop_001', { map: signTex })
  );
  frontSignPanel.position.set(0, 3.28, 2.22);
  group.add(frontSignPanel);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 5.5), matRoofGalv);
  roof.position.set(0, 3.7, 0.38);
  roof.rotation.x = 0.07;
  roof.castShadow = true;
  group.add(roof);

  const hatchRecess = new THREE.Mesh(
    new THREE.BoxGeometry(3.3, 1.4, 0.22),
    sharedArtLibrary.getMaterial('shop_interior_dark', { color: 0x0f172a, roughness: 0.9 })
  );
  hatchRecess.position.set(-0.35, 1.85, 2.04);
  group.add(hatchRecess);

  const counterLedge = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.05, 0.78), matKioskLightBlue);
  counterLedge.position.set(-0.35, 0.58, 2.32);
  counterLedge.castShadow = true;
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.1, 0.92), matCounterWood);
  counterTop.position.set(-0.35, 1.14, 2.36);
  group.add(counterLedge, counterTop);

  scene.add(group);

  colliders.push({
    id: 'ACC_SHOP_001',
    minX: -12.4,
    maxX: -6.6,
    minZ: -12.6,
    maxZ: -8.2,
    height: 3.8
  });

  interactables.push({
    id: 'provision_shop',
    assetId: 'ACC_SHOP_001',
    title: 'Adabraka Provision Store & MoMo',
    promptLabel: 'Shop',
    interactionResponse: 'Adabraka Provisions — Milo, Peak milk, bottled water, MoMo.',
    position: new THREE.Vector3(-9.5, 0.14, -6.7),
    lookAtPosition: new THREE.Vector3(-9.5, 0.14, -8.2),
    radius: 3.1
  });
}
