import * as THREE from 'three';
import { ColliderBox } from '../Player/PlayerController';
import { InteractableTarget } from '../Player/InteractionSystem';
import { sharedArtLibrary } from '../Art/AssetRegistry';
import { buildStylizedGhanaianCharacter, CharacterRig } from '../Art/CharacterBuilder';
import { getSurfaceHeightAt } from './WorldSurface';

export function buildRoadsideGuttersAndWalkways(
  scene: THREE.Scene,
  matSidewalk: THREE.Material,
  matConcreteDark: THREE.Material,
  matGutterChannel: THREE.Material
): void {
  const gutterGroup = new THREE.Group();
  gutterGroup.name = 'ENV_DRAIN_001';

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

    const innerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.09, 0.12), matConcreteDark);
    innerWall.position.set(0, 0.045, sign * 3.74);

    const outerWall = new THREE.Mesh(new THREE.BoxGeometry(68, 0.09, 0.12), matConcreteDark);
    outerWall.position.set(0, 0.045, sign * 4.36);

    gutterGroup.add(channelFloor, innerWall, outerWall);
  }

  const crossoverPositions: Array<[number, number, number]> = [
    [-10.5, 4.05, 3.6],
    [-9.5, -4.05, 3.6],
    [8.5, -4.05, 4.0],
    [9.0, 4.05, 4.4],
    [0, -4.05, 3.0],
    [0, 4.05, 3.0]
  ];

  for (const [cx, cz, width] of crossoverPositions) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.085, 0.86), matSidewalk);
    slab.position.set(cx, 0.0425, cz);
    slab.receiveShadow = true;
    gutterGroup.add(slab);
  }

  scene.add(gutterGroup);
}
