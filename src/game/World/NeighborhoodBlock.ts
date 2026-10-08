import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { PHASE2_ASSET_REGISTRY, sharedArtLibrary } from '../Art/AssetRegistry';
import { CharacterRig } from '../Art/CharacterBuilder';
import { getSurfaceHeightAt } from './WorldSurface';
import { cellCenter } from './GridMap';
import { buildPlayerCompoundHouse } from './PlayerCompound';
import { buildRoadsideGuttersAndWalkways } from './NeighborhoodGutters';
import { buildProvisionStore } from './NeighborhoodProvision';
import { buildFoodVendorJoint } from './NeighborhoodFood';
import { buildMakolaVendorStand } from './NeighborhoodMarket';
import { buildTrotroStopAndVehicle } from './NeighborhoodTrotro';
import { buildNeighborhoodExtras } from './NeighborhoodExtras';
import {
  buildUtilityPole,
  buildOverheadUtilityCables,
  buildStylizedShadeTree,
  spawnPhase2TestNPCs
} from './NeighborhoodStreet';

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
  buildProvisionStore(scene, colliders, interactables);
  buildFoodVendorJoint(scene, colliders, interactables);
  buildMakolaVendorStand(scene, colliders, interactables);
  buildTrotroStopAndVehicle(scene, colliders, interactables);
  buildNeighborhoodExtras(scene, colliders, interactables);

  const northPoles: Array<[number, number, number]> = [
    [-16, -4.8, 1],
    [-2, -4.8, 1],
    [15, -4.8, 1]
  ];
  const southPoles: Array<[number, number, number]> = [
    [-15, 4.8, -1],
    [2, 4.8, -1],
    [16, 4.8, -1]
  ];
  for (const [px, pz, dir] of [...northPoles, ...southPoles]) {
    buildUtilityPole(scene, colliders, px, pz, dir);
  }
  buildOverheadUtilityCables(scene, northPoles);
  buildOverheadUtilityCables(scene, southPoles);

  const treeCoords: Array<[number, number, number]> = [
    [-19.5, -7.2, 1.05],
    [-1.8, -7.5, 0.95],
    [17.5, -7.2, 1.1],
    [-19.5, 7.4, 1.0],
    [0.5, 8.0, 0.92],
    [17.8, 7.4, 1.06]
  ];
  for (const [tx, tz, scale] of treeCoords) {
    buildStylizedShadeTree(scene, colliders, tx, tz, scale);
  }

  spawnPhase2TestNPCs(scene, colliders, interactables, npcRigs);

  // Starter hustle anchors — both within ~12 m of Adabraka spawn (cell [0,0]).
  {
    const [sx, sz] = cellCenter(0, 0);
    interactables.push({
      id: 'auntie_carry_1',
      assetId: 'AUNTIE_CARRY_1',
      title: "Auntie's Crate",
      promptLabel: 'Pick Up',
      interactionResponse: 'Auntie: "Chale, carry this for me."',
      position: new THREE.Vector3(sx + 4, 0.14, sz + 3),
      radius: 3.0
    });
    interactables.push({
      id: 'auntie_carry_2',
      assetId: 'AUNTIE_CARRY_2',
      title: 'Corner Stall',
      promptLabel: 'Drop Crate',
      interactionResponse: 'Auntie: "Eii, thank you!"',
      position: new THREE.Vector3(sx + 9, 0.14, sz - 2),
      radius: 3.0
    });
  }

  const bollardMat = sharedArtLibrary.getMaterial('env_bollard', {
    color: 0xf59e0b,
    roughness: 0.55
  });
  const bollardCapMat = sharedArtLibrary.getMaterial('env_bollard_cap', {
    color: 0x1e293b,
    roughness: 0.6
  });
  for (const bx of [-25.6, 25.6]) {
    for (const bz of [-5.8, -2.2, 0, 2.2, 5.8]) {
      const baseY = getSurfaceHeightAt(bx, bz);
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.82, 14), bollardMat);
      bollard.position.set(bx, baseY + 0.41, bz);
      bollard.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.14, 14), bollardCapMat);
      cap.position.set(bx, baseY + 0.78, bz);
      scene.add(bollard, cap);
    }
  }

  return { colliders, interactables, npcRigs };
}
