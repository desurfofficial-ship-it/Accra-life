import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { PHASE2_ASSET_REGISTRY, sharedArtLibrary } from '../Art/AssetRegistry';
import { buildStylizedGhanaianCharacter, CharacterRig } from '../Art/CharacterBuilder';
import { getSurfaceHeightAt } from './WorldSurface';
import { buildPlayerCompoundHouse } from './PlayerCompound';

export { PHASE2_ASSET_REGISTRY, getSurfaceHeightAt };

export interface BuiltNeighborhoodBlock {
  colliders: ColliderBox[];
  interactables: InteractableTarget[];
  npcRigs: CharacterRig[];
}

export function buildFirstNeighborhoodBlock(scene: THREE.Scene): BuiltNeighborhoodBlock {
  const colliders: ColliderBox[] = [];
  const interactables: InteractableTarget[] = [];
  const npcRigs: CharacterRig[] = [];

  const matLaterite = sharedArtLibrary.getMaterial('env_laterite', {
    map: sharedArtLibrary.getLateriteEarthTexture(),
    roughness: 0.94
  });
  const matAsphalt = sharedArtLibrary.getMaterial('env_asphalt', { color: 0x2e3846, roughness: 0.86 });
  const matSidewalk = sharedArtLibrary.getMaterial('env_sidewalk_paved', {
    map: sharedArtLibrary.getSidewalkPaverTexture(),
    roughness: 0.8
  });

  const groundGeo = new THREE.PlaneGeometry(88, 88);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, matLaterite);
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(new THREE.BoxGeometry(68, 0.02, 7.0), matAsphalt);
  road.position.set(0, 0.01, 0);
  road.receiveShadow = true;
  scene.add(road);

  const northWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 3.3), matSidewalk);
  northWalk.position.set(0, 0.04, -6.05);
  northWalk.receiveShadow = true;
  const southWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 3.3), matSidewalk);
  southWalk.position.set(0, 0.04, 6.05);
  southWalk.receiveShadow = true;
  scene.add(northWalk, southWalk);

  buildPlayerCompoundHouse(scene, colliders, interactables);
  addSimpleShop(scene, colliders, interactables);
  addSimpleFood(scene, colliders, interactables);
  addSimpleTrotro(scene, colliders, interactables);
  addSimpleNpcs(scene, colliders, interactables, npcRigs);

  return { colliders, interactables, npcRigs };
}

function addSimpleShop(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const mat = sharedArtLibrary.getMaterial('shop_blue_simple', { color: 0x1d4ed8, roughness: 0.55 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 4.2), mat);
  box.position.set(-9.5, 1.6, -10.4);
  box.castShadow = true;
  scene.add(box);
  colliders.push({ id: 'ACC_SHOP_001', minX: -12.3, maxX: -6.7, minZ: -12.5, maxZ: -8.3, height: 3.2 });
  interactables.push({
    id: 'provision_shop',
    assetId: 'ACC_SHOP_001',
    title: 'Provision Store',
    promptLabel: 'Shop',
    interactionResponse: 'Adabraka Provision & MoMo',
    position: new THREE.Vector3(-9.5, 0.1, -8.2),
    radius: 2.8
  });
}

function addSimpleFood(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const mat = sharedArtLibrary.getMaterial('food_joint_simple', { color: 0xf59e0b, roughness: 0.6 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.8, 3.8), mat);
  box.position.set(8.5, 1.4, -10.0);
  box.castShadow = true;
  scene.add(box);
  colliders.push({ id: 'ACC_RESTAURANT_001', minX: 6.0, maxX: 11.0, minZ: -12.0, maxZ: -8.0, height: 2.8 });
  interactables.push({
    id: 'food_vendor',
    assetId: 'ACC_RESTAURANT_001',
    title: 'Waakye Joint',
    promptLabel: 'Waakye · ₵12',
    interactionResponse: 'Sister Akosua’s Waakye',
    position: new THREE.Vector3(8.5, 0.1, -8.0),
    radius: 2.8
  });
}

function addSimpleTrotro(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void {
  const mat = sharedArtLibrary.getMaterial('trotro_simple', { color: 0xeab308, roughness: 0.5 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 6.0), mat);
  box.position.set(9.0, 1.2, 8.5);
  box.castShadow = true;
  scene.add(box);
  colliders.push({ id: 'ACC_PROP_001', minX: 7.4, maxX: 10.6, minZ: 5.5, maxZ: 11.5, height: 2.4 });
  interactables.push({
    id: 'trotro_stop',
    assetId: 'ACC_PROP_001',
    title: 'Trotro Stop',
    promptLabel: 'Trotro',
    interactionResponse: 'Osu–Circle station',
    position: new THREE.Vector3(9.0, 0.1, 5.8),
    radius: 2.8
  });
}

function addSimpleNpcs(
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
  }> = [
    { id: 'NPC_MALE_001', x: -2.5, z: -7.2, title: 'Kojo', prompt: 'Talk' },
    { id: 'NPC_FEMALE_001', x: 4.0, z: -7.0, title: 'Ama', prompt: 'Talk' },
    { id: 'NPC_OLDER_001', x: -4.0, z: 7.0, title: 'Uncle Mensah', prompt: 'Errand' }
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
      id: cfg.id.toLowerCase(),
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
