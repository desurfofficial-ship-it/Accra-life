import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { buildStylizedGhanaianCharacter, CharacterRig } from '../Art/CharacterBuilder';
import { getSurfaceHeightAt } from './WorldSurface';

export function buildUtilityPole(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  px: number,
  pz: number,
  dir: number
): void {
  const matConcrete = sharedArtLibrary.getMaterial('pole_concrete', {
    color: 0x94a3b8,
    roughness: 0.88
  });
  const matWood = sharedArtLibrary.getMaterial('pole_crossarm', {
    color: 0x78350f,
    roughness: 0.7
  });
  const matInsulator = sharedArtLibrary.getMaterial('pole_insulator', {
    color: 0xf8fafc,
    roughness: 0.4
  });
  const matLamp = sharedArtLibrary.getBasicMaterial('pole_lamp', { color: 0xfef08a });

  const baseY = getSurfaceHeightAt(px, pz);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.2, 12), matConcrete);
  pole.position.set(px, baseY + 3.6, pz);
  pole.castShadow = true;
  scene.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.12), matWood);
  arm.position.set(px + dir * 0.6, baseY + 6.4, pz);
  scene.add(arm);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), matLamp);
  lamp.position.set(px + dir * 1.2, baseY + 6.2, pz);
  scene.add(lamp);

  for (const ox of [-0.4, 0.4]) {
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), matInsulator);
    ins.position.set(px + ox, baseY + 6.9, pz);
    scene.add(ins);
  }

  colliders.push({
    id: `POLE_${px}_${pz}`,
    minX: px - 0.22,
    maxX: px + 0.22,
    minZ: pz - 0.22,
    maxZ: pz + 0.22,
    height: 7.2
  });
}

export function buildOverheadUtilityCables(
  scene: THREE.Scene,
  poles: Array<[number, number, number]>
): void {
  const matCable = sharedArtLibrary.getMaterial('overhead_cable', {
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.3
  });
  for (let i = 0; i < poles.length - 1; i++) {
    const [x1, z1] = poles[i];
    const [x2, z2] = poles[i + 1];
    const y = 6.9;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 6), matCable);
    cable.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    cable.rotation.z = Math.PI / 2;
    cable.rotation.y = Math.atan2(dz, dx);
    scene.add(cable);
  }
}

export function buildStylizedShadeTree(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  tx: number,
  tz: number,
  scale: number
): void {
  const matTrunk = sharedArtLibrary.getMaterial('tree_trunk', {
    color: 0x5c3d1e,
    roughness: 0.9
  });
  const matFoliage = sharedArtLibrary.getMaterial('tree_foliage', {
    color: 0x166534,
    roughness: 0.85
  });
  const baseY = getSurfaceHeightAt(tx, tz);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.4 * scale, 10),
    matTrunk
  );
  trunk.position.set(tx, baseY + 1.2 * scale, tz);
  trunk.castShadow = true;
  scene.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.4 * scale, 12, 10),
    matFoliage
  );
  canopy.position.set(tx, baseY + 3.0 * scale, tz);
  canopy.castShadow = true;
  scene.add(canopy);

  const canopy2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.0 * scale, 10, 8),
    matFoliage
  );
  canopy2.position.set(tx + 0.5 * scale, baseY + 2.6 * scale, tz - 0.3 * scale);
  scene.add(canopy2);

  colliders.push({
    id: `TREE_${tx}_${tz}`,
    minX: tx - 0.35 * scale,
    maxX: tx + 0.35 * scale,
    minZ: tz - 0.35 * scale,
    maxZ: tz + 0.35 * scale,
    height: 2.5 * scale
  });
}

export function spawnPhase2TestNPCs(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[],
  npcRigs: CharacterRig[]
): void {
  const placements: Array<{
    id: 'NPC_MALE_001' | 'NPC_FEMALE_001' | 'NPC_OLDER_001';
    x: number;
    z: number;
    title: string;
    prompt: string;
    interactId: string;
  }> = [
    {
      id: 'NPC_MALE_001',
      x: -2.5,
      z: -7.2,
      title: 'Kojo',
      prompt: 'Talk',
      interactId: 'npc_male_001'
    },
    {
      id: 'NPC_FEMALE_001',
      x: 4.0,
      z: -7.0,
      title: 'Ama',
      prompt: 'Talk',
      interactId: 'npc_female_001'
    },
    {
      id: 'NPC_OLDER_001',
      x: -4.0,
      z: 7.0,
      title: 'Uncle Mensah',
      prompt: 'Errand',
      interactId: 'npc_older_001'
    }
  ];

  for (const cfg of placements) {
    const rig = buildStylizedGhanaianCharacter(cfg.id);
    const y = getSurfaceHeightAt(cfg.x, cfg.z);
    rig.root.position.set(cfg.x, y, cfg.z);
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
    interactables.push({
      id: cfg.interactId,
      assetId: cfg.id,
      title: cfg.title,
      promptLabel: cfg.prompt,
      interactionResponse: cfg.title,
      position: new THREE.Vector3(cfg.x, y + 0.04, cfg.z + 0.9),
      lookAtPosition: new THREE.Vector3(cfg.x, y, cfg.z),
      radius: 2.5
    });
  }
}
