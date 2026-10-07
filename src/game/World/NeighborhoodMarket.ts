import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { MAKOLA_VENDOR_STAND_WORLD } from './GridMap';

/**
 * Makola street-vendor stand (skills/vendor-system.md) — the HIDDEN systems
 * layer's venue for the `makola_vendor_stand` interactable. The VISIBLE
 * stand lives in src/r3f/LivingVendor.tsx; both derive their position from
 * GridMap.MAKOLA_VENDOR_STAND_WORLD so the interactable, the [E] proximity
 * gate and the VendorService guard all sit on the same spot.
 *
 * The stand shares makola cell [row 2, col 1] (MAKOLA_VENDOR_ANCHOR,
 * world [-16, 0]) with Kojo, offset to the cell's NE corner so the two
 * interactables never fight for the [E] key from the same spot.
 */
export function buildMakolaVendorStand(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_VENDOR_STAND_001';
  const [sx, sz] = MAKOLA_VENDOR_STAND_WORLD;
  group.position.set(sx, 0, sz);

  const matWoodDark = sharedArtLibrary.getMaterial('vendor_wood_mahogany', {
    color: 0x78350f,
    roughness: 0.6
  });
  const matTableTop = sharedArtLibrary.getMaterial('vendor_table_top', {
    color: 0x92400e,
    roughness: 0.7
  });
  const matUmbrella = sharedArtLibrary.getMaterial('vendor_umbrella_red', {
    color: 0xc2410c,
    roughness: 0.55
  });
  const matCrate = sharedArtLibrary.getMaterial('vendor_crate_wood', {
    color: 0xa16207,
    roughness: 0.75
  });
  const matTomato = sharedArtLibrary.getMaterial('vendor_tomato_red', {
    color: 0xdc2626,
    roughness: 0.4
  });
  const matYam = sharedArtLibrary.getMaterial('vendor_yam_brown', {
    color: 0x7c2d12,
    roughness: 0.8
  });
  const matSign = sharedArtLibrary.getBasicMaterial('vendor_sign_panel', {
    color: 0xfacc15
  });

  // Table + legs (the selling counter)
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.9), matTableTop);
  tableTop.position.set(0, 0.82, 0);
  tableTop.castShadow = true;
  group.add(tableTop);
  for (const [lx, lz] of [[-0.95, -0.3], [0.95, -0.3], [-0.95, 0.3], [0.95, 0.3]] as [number, number][]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.82, 0.08), matWoodDark);
    leg.position.set(lx, 0.41, lz);
    group.add(leg);
  }

  // Goods: tomato pyramid + yams + a supply crate under the table
  for (let i = 0; i < 6; i++) {
    const row = i < 3 ? 0 : 1;
    const col = i % 3;
    const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), matTomato);
    tomato.position.set(-0.7 + col * 0.2, 0.95 - row * 0.16, 0.1);
    tomato.castShadow = true;
    group.add(tomato);
  }
  for (const [yx, yrot] of [[0.15, 0.2], [0.45, -0.15]] as [number, number][]) {
    const yam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 8), matYam);
    yam.position.set(yx, 0.94, 0.05);
    yam.rotation.z = yrot;
    yam.castShadow = true;
    group.add(yam);
  }
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), matCrate);
  crate.position.set(0.75, 0.23, -0.45);
  crate.castShadow = true;
  group.add(crate);

  // Market umbrella (pole + red cone) — shade for the vendor
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), matWoodDark);
  pole.position.set(-0.8, 1.2, -0.75);
  group.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.55, 8), matUmbrella);
  canopy.position.set(-0.8, 2.5, -0.75);
  canopy.castShadow = true;
  group.add(canopy);

  // Small yellow price sign on the table edge
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.3), matSign);
  sign.position.set(0.1, 1.02, 0.46);
  group.add(sign);

  scene.add(group);

  // Compact table collider — the stand is furniture, not a wall; the player
  // still walks around the cell freely (Kojo's collider is untouched).
  colliders.push({
    id: 'ACC_VENDOR_STAND_001',
    minX: sx - 1.2,
    maxX: sx + 1.2,
    minZ: sz - 0.6,
    maxZ: sz + 0.6,
    height: 1.0
  });

  // The vendor stand interactable — radius matches the R3F [E] range and
  // the VendorService proximity gate (3.5 m, same as the tro-tro stop).
  interactables.push({
    id: 'makola_vendor_stand',
    assetId: 'ACC_VENDOR_STAND_001',
    title: 'Makola Street-Vendor Stand',
    promptLabel: 'Sell · [E]',
    interactionResponse: 'Open your table at Makola — greet customers, work the 10s rush.',
    position: new THREE.Vector3(sx, 0.14, sz + 1.4),
    lookAtPosition: new THREE.Vector3(sx, 0.14, sz),
    radius: 3.5
  });
}
