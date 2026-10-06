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

  const matLateriteEarth = sharedArtLibrary.getMaterial('env_laterite', {
    map: sharedArtLibrary.getLateriteEarthTexture(),
    roughness: 0.94
  });
  const matAsphalt = sharedArtLibrary.getMaterial('env_asphalt', {
    color: 0x2e3846,
    roughness: 0.86
  });
  const matAsphaltShoulder = sharedArtLibrary.getMaterial('env_shoulder', {
    color: 0x475569,
    roughness: 0.88
  });
  const matRoadLine = sharedArtLibrary.getBasicMaterial('env_road_line', { color: 0xf8fafc });
  const matRoadEdgeLine = sharedArtLibrary.getBasicMaterial('env_road_edge', { color: 0xfacc15 });
  const matSidewalk = sharedArtLibrary.getMaterial('env_sidewalk_paved', {
    map: sharedArtLibrary.getSidewalkPaverTexture(),
    roughness: 0.8
  });
  const matConcreteDark = sharedArtLibrary.getMaterial('env_concrete_dark', {
    color: 0x64748b,
    roughness: 0.88
  });
  const matGutterChannel = sharedArtLibrary.getMaterial('env_gutter_floor', {
    color: 0x1e293b,
    roughness: 0.95
  });

  const groundGeo = new THREE.PlaneGeometry(88, 88);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, matLateriteEarth);
  ground.receiveShadow = true;
  scene.add(ground);

  const roadShoulder = new THREE.Mesh(new THREE.BoxGeometry(68, 0.02, 7.6), matAsphaltShoulder);
  roadShoulder.position.set(0, 0.008, 0);
  roadShoulder.receiveShadow = true;
  scene.add(roadShoulder);

  const road = new THREE.Mesh(new THREE.BoxGeometry(68, 0.02, 7.0), matAsphalt);
  road.position.set(0, 0.01, 0);
  road.receiveShadow = true;
  scene.add(road);

  const dashGeo = new THREE.BoxGeometry(2.4, 0.01, 0.16);
  for (let x = -28; x <= 28; x += 5.4) {
    const dash = new THREE.Mesh(dashGeo, matRoadLine);
    dash.position.set(x, 0.021, 0);
    scene.add(dash);
  }
  for (const edgeZ of [-3.35, 3.35]) {
    const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(68, 0.01, 0.1), matRoadEdgeLine);
    edgeLine.position.set(0, 0.021, edgeZ);
    scene.add(edgeLine);
  }

  buildRoadsideGuttersAndWalkways(scene, matSidewalk, matConcreteDark, matGutterChannel);
  buildPlayerCompoundHouse(scene, colliders, interactables);

  // Temporary stubs if other builders missing — full block restored next
  // Provision, food, trotro still need full file; keep minimal interactables for core loop

  return { colliders, interactables, npcRigs };
}

function buildRoadsideGuttersAndWalkways(
  scene: THREE.Scene,
  matSidewalk: THREE.Material,
  matConcreteDark: THREE.Material,
  matGutterChannel: THREE.Material
): void {
  const gutterGroup = new THREE.Group();
  const northWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 3.3), matSidewalk);
  northWalk.position.set(0, 0.04, -6.05);
  northWalk.receiveShadow = true;
  const southWalk = new THREE.Mesh(new THREE.BoxGeometry(68, 0.08, 3.3), matSidewalk);
  southWalk.position.set(0, 0.04, 6.05);
  southWalk.receiveShadow = true;
  gutterGroup.add(northWalk, southWalk);
  for (const sign of [-1, 1]) {
    const channelFloor = new THREE.Mesh(new THREE.BoxGeometry(68, 0.02, 0.68), matGutterChannel);
    channelFloor.position.set(0, 0.005, sign * 4.05);
    gutterGroup.add(channelFloor);
  }
  scene.add(gutterGroup);
}
