import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';

export function buildTrotroStopAndVehicle(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const group = new THREE.Group();
  group.name = 'ACC_PROP_001';
  group.position.set(9.0, 0, 7.5);

  const matShelter = sharedArtLibrary.getMaterial('trotro_shelter', {
    color: 0x64748b,
    roughness: 0.7
  });
  const matYellow = sharedArtLibrary.getMaterial('trotro_yellow', {
    color: 0xeab308,
    roughness: 0.5
  });
  const matBody = sharedArtLibrary.getMaterial('trotro_body', {
    color: 0xf8fafc,
    roughness: 0.55
  });
  const matTire = sharedArtLibrary.getMaterial('trotro_tire', {
    color: 0x1e293b,
    roughness: 0.9
  });

  // Shelter
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 2.8), matShelter);
  roof.position.set(0, 2.6, -2.5);
  roof.castShadow = true;
  group.add(roof);
  for (const ox of [-2.0, 2.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8), matShelter);
    post.position.set(ox, 1.25, -2.5);
    group.add(post);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 0.5), matShelter);
  bench.position.set(0, 0.4, -2.3);
  group.add(bench);

  // Trotro van
  const van = new THREE.Group();
  van.position.set(0, 0, 1.5);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 5.2), matBody);
  body.position.y = 1.3;
  body.castShadow = true;
  van.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.1, 1.4), matYellow);
  cab.position.set(0, 1.85, -1.8);
  van.add(cab);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.25, 5.15), matYellow);
  stripe.position.y = 1.0;
  van.add(stripe);
  for (const [wx, wz] of [
    [-0.9, -1.6],
    [0.9, -1.6],
    [-0.9, 1.6],
    [0.9, 1.6]
  ] as [number, number][]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12), matTire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.35, wz);
    van.add(tire);
  }
  group.add(van);

  scene.add(group);

  colliders.push(
    {
      id: 'ACC_PROP_001_SHELTER',
      minX: 6.7,
      maxX: 11.3,
      minZ: 4.5,
      maxZ: 5.8,
      height: 2.7
    },
    {
      id: 'ACC_TROTRO_001',
      minX: 7.8,
      maxX: 10.2,
      minZ: 6.5,
      maxZ: 11.5,
      height: 2.5
    }
  );

  interactables.push({
    id: 'trotro_stop',
    assetId: 'ACC_PROP_001',
    title: 'Trotro Stop',
    promptLabel: 'Trotro',
    interactionResponse: 'Osu–Circle station — mate collecting.',
    position: new THREE.Vector3(9.0, 0.14, 5.2),
    lookAtPosition: new THREE.Vector3(9.0, 0.14, 6.5),
    radius: 3.1
  });
}
