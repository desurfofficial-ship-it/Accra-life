import * as THREE from 'three';
import { InputManager } from './InputManager';

export interface InteractableTarget {
  id: string;
  assetId: string;
  title: string;
  promptLabel: string;
  interactionResponse: string;
  position: THREE.Vector3;
  lookAtPosition?: THREE.Vector3;
  radius: number;
  mesh?: THREE.Object3D;
  onInteract?: (target: InteractableTarget) => void;
}

export class InteractionSystem {
  private targets: InteractableTarget[] = [];
  private activeTarget: InteractableTarget | null = null;
  private objectiveTargetId: string | null = null;
  private indicatorRing: THREE.Mesh;
  private objectiveBeaconGroup: THREE.Group;
  private objectiveRingMat: THREE.MeshBasicMaterial;
  private objectiveDiamondMat: THREE.MeshBasicMaterial;
  private objectiveDiamondMesh: THREE.Mesh;
  private pulseClock = 0;
  private lastInteractMs = 0;
  private readonly cooldownMs = 250;

  private onActiveTargetChange?: (target: InteractableTarget | null) => void;
  private onInteractTriggered?: (target: InteractableTarget) => void;

  constructor(
    scene: THREE.Scene,
    inputManager: InputManager,
    onActiveTargetChange?: (target: InteractableTarget | null) => void,
    onInteractTriggered?: (target: InteractableTarget) => void
  ) {
    this.onActiveTargetChange = onActiveTargetChange;
    this.onInteractTriggered = onInteractTriggered;

    // Stylized glowing gold ground ring under the currently focused interactable
    const ringGeo = new THREE.RingGeometry(0.62, 0.84, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88
    });
    this.indicatorRing = new THREE.Mesh(ringGeo, ringMat);
    this.indicatorRing.visible = false;
    this.indicatorRing.position.y = 0.24;
    scene.add(this.indicatorRing);

    // 3D Active Job / Hustle Objective Waypoint Beacon
    this.objectiveBeaconGroup = new THREE.Group();
    this.objectiveBeaconGroup.visible = false;

    const objRingGeo = new THREE.RingGeometry(0.92, 1.16, 32);
    objRingGeo.rotateX(-Math.PI / 2);
    this.objectiveRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const objRingMesh = new THREE.Mesh(objRingGeo, this.objectiveRingMat);
    objRingMesh.position.y = 0.02;

    const diamondGeo = new THREE.OctahedronGeometry(0.24, 0);
    this.objectiveDiamondMat = new THREE.MeshBasicMaterial({
      color: 0x34d399
    });
    this.objectiveDiamondMesh = new THREE.Mesh(diamondGeo, this.objectiveDiamondMat);
    this.objectiveDiamondMesh.position.y = 2.35;
    this.objectiveDiamondMesh.scale.set(0.85, 1.35, 0.85);

    this.objectiveBeaconGroup.add(objRingMesh, this.objectiveDiamondMesh);
    scene.add(this.objectiveBeaconGroup);

    // Subscribe to single-press E / Enter via InputManager (key auto-repeat is filtered out)
    inputManager.onInteractPressed(() => {
      this.triggerCurrentInteraction();
    });
  }

  public registerTarget(target: InteractableTarget): void {
    this.targets.push(target);
  }

  public getTargets(): ReadonlyArray<InteractableTarget> {
    return this.targets;
  }

  public getActiveTarget(): InteractableTarget | null {
    return this.activeTarget;
  }

  public setObjectiveTarget(targetId: string | null, isRisky = false): void {
    this.objectiveTargetId = targetId;
    if (!targetId) {
      this.objectiveBeaconGroup.visible = false;
      return;
    }
    const target = this.targets.find((t) => t.id === targetId);
    if (!target) {
      this.objectiveBeaconGroup.visible = false;
      return;
    }

    this.objectiveRingMat.color.setHex(isRisky ? 0xef4444 : 0x10b981);
    this.objectiveDiamondMat.color.setHex(isRisky ? 0xf87171 : 0x34d399);
    this.objectiveBeaconGroup.position.set(
      target.position.x,
      Math.max(0.10, target.position.y),
      target.position.z
    );
    this.objectiveBeaconGroup.visible = true;
  }

  public triggerCurrentInteraction(): boolean {
    if (!this.activeTarget) return false;

    const now = performance.now();
    if (now - this.lastInteractMs < this.cooldownMs) {
      return false;
    }
    this.lastInteractMs = now;

    if (this.activeTarget.onInteract) {
      this.activeTarget.onInteract(this.activeTarget);
    }
    if (this.onInteractTriggered) {
      this.onInteractTriggered(this.activeTarget);
    }
    return true;
  }

  public update(dt: number, playerPosition: THREE.Vector3, playerForward: THREE.Vector3): void {
    this.pulseClock += dt * 4.5;

    let bestCandidate: InteractableTarget | null = null;
    let bestScore = Infinity;

    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      const dx = target.position.x - playerPosition.x;
      const dz = target.position.z - playerPosition.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= target.radius) {
        const focusPoint = target.lookAtPosition || target.position;
        const fdx = focusPoint.x - playerPosition.x;
        const fdz = focusPoint.z - playerPosition.z;
        const fLen = Math.hypot(fdx, fdz);
        const dot =
          fLen > 0.001
            ? playerForward.x * (fdx / fLen) + playerForward.z * (fdz / fLen)
            : 1;

        if (dist <= 1.15 || dot > -0.25) {
          const score = dist - dot * 0.65;
          if (score < bestScore) {
            bestScore = score;
            bestCandidate = target;
          }
        }
      }
    }

    if (bestCandidate !== this.activeTarget) {
      this.activeTarget = bestCandidate;
      if (this.onActiveTargetChange) {
        this.onActiveTargetChange(this.activeTarget);
      }
    }

    if (this.activeTarget) {
      this.indicatorRing.visible = true;
      this.indicatorRing.position.set(
        this.activeTarget.position.x,
        Math.max(0.11, this.activeTarget.position.y),
        this.activeTarget.position.z
      );
      const scale = 1 + Math.sin(this.pulseClock) * 0.08;
      this.indicatorRing.scale.set(scale, 1, scale);
    } else {
      this.indicatorRing.visible = false;
    }

    if (this.objectiveBeaconGroup.visible && this.objectiveTargetId) {
      const pulse = 1 + Math.sin(this.pulseClock * 1.15) * 0.1;
      this.objectiveBeaconGroup.children[0].scale.set(pulse, 1, pulse);
      this.objectiveDiamondMesh.position.y = 2.32 + Math.sin(this.pulseClock * 0.9) * 0.16;
      this.objectiveDiamondMesh.rotation.y += dt * 2.2;
    }
  }
}
