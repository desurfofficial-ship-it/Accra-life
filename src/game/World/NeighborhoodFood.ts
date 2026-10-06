import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';

export function buildFoodVendorJoint(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_RESTAURANT_001';
  group.position.set(8.5, 0, -10.2);

  const matCanopy = sharedArtLibrary.getMaterial('food_canopy_orange', {
    color: 0xea580c,
    roughness: 0.55
  });
  const matWood = sharedArtLibrary.getMaterial('food_wood', {
    color: 0x78350f,
    roughness: 0.7
  });
  const matPot = sharedArtLibrary.getMaterial('food_pot', {
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.5
  });
  const matCloth = sharedArtLibrary.getMaterial('food_cloth', {
    color: 0xfacc15,
    roughness: 0.8
  });

  // Serving shed
  const shed = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.4, 3.2), matCanopy);
  shed.position.set(0, 1.3, 0);
  shed.castShadow = true;
  group.add(shed);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 3.8), matCloth);
  roof.position.set(0, 2.6, 0.1);
  roof.rotation.x = 0.05;
  roof.castShadow = true;
  group.add(roof);

  // Counter
  const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 0.9), matWood);
  counter.position.set(0, 0.55, 1.8);
  counter.castShadow = true;
  group.add(counter);

  // Cooking pots
  for (const ox of [-1.2, 0, 1.2]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 12), matPot);
    pot.position.set(ox, 1.25, 1.7);
    group.add(pot);
  }

  // Bench
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.5), matWood);
  bench.position.set(0, 0.28, 3.2);
  group.add(bench);

  // Sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.55, 0.08),
    sharedArtLibrary.getMaterial('food_sign', { color: 0xfacc15, roughness: 0.5 })
  );
  sign.position.set(0, 2.9, 1.7);
  group.add(sign);

  scene.add(group);

  colliders.push({
    id: 'ACC_RESTAURANT_001',
    minX: 6.0,
    maxX: 11.0,
    minZ: -12.0,
    maxZ: -8.2,
    height: 3.0
  });

  interactables.push({
    id: 'food_vendor',
    assetId: 'ACC_RESTAURANT_001',
    title: 'Waakye & Jollof Joint',
    promptLabel: 'Waakye · ₵12',
    interactionResponse: 'Sister Akosua’s Waakye — rice, beans, shito, egg.',
    position: new THREE.Vector3(8.5, 0.14, -7.8),
    lookAtPosition: new THREE.Vector3(8.5, 0.14, -9.0),
    radius: 3.1
  });
}
