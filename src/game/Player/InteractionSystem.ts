/**
 * InteractionSystem.ts — proximity targets + objective beacon (sim scene).
 * E / Enter are bound by game-init → handleActPress (shared with Act button).
 */

import * as THREE from 'three';
import type { InputManager } from './InputManager';

export interface InteractableTarget {
  id: string;
  title: string;
  promptLabel: string;
  position: THREE.Vector3;
  radius: number;
  actionVerb?: string;
  onInteract?: (target: InteractableTarget) => void;
}

export class InteractionSystem {
  private targets: InteractableTarget[] = [];
  private activeTarget: InteractableTarget | null = null;
  private objectiveTargetId: string | null = null;
  private objectiveBeaconGroup: THREE.Group;
  private objectiveDiamondMesh: THREE.Mesh;
  private objectiveFlashUntil = 0;
  private onInteractTriggered?: (target: InteractableTarget) => void;

  constructor(
    scene: THREE.Scene,
    _inputManager: InputManager,
    onInteractTriggered?: (target: InteractableTarget) => void
  ) {
    this.onInteractTriggered = onInteractTriggered;

    this.objectiveBeaconGroup = new THREE.Group();
    this.objectiveBeaconGroup.visible = false;

    const ringGeo = new THREE.RingGeometry(0.55, 0.72, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const objRingMesh = new THREE.Mesh(ringGeo, ringMat);
    objRingMesh.rotation.x = -Math.PI / 2;
    objRingMesh.position.y = 0.05;

    const diamondGeo = new THREE.OctahedronGeometry(0.22, 0);
    const diamondMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    this.objectiveDiamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
    this.objectiveDiamondMesh.position.y = 2.35;
    this.objectiveDiamondMesh.scale.set(0.85, 1.35, 0.85);

    this.objectiveBeaconGroup.add(objRingMesh, this.objectiveDiamondMesh);
    scene.add(this.objectiveBeaconGroup);

    // E / Enter are bound by game-init → handleActPress (shared with the
    // Act button). Do NOT auto-bind here — triggerCurrentInteraction alone
    // skips the out-of-range walk toast.
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

  public getObjectiveTarget(): InteractableTarget | null {
    if (!this.objectiveTargetId) return null;
    return this.targets.find((t) => t.id === this.objectiveTargetId) ?? null;
  }

  public setObjectiveTarget(id: string | null): void {
    this.objectiveTargetId = id;
  }

  public flashObjectiveMarker(ms = 1200): void {
    this.objectiveFlashUntil = performance.now() + ms;
  }

  public isObjectiveFlashing(): boolean {
    return performance.now() < this.objectiveFlashUntil;
  }

  public update(playerPos: THREE.Vector3): void {
    let nearest: InteractableTarget | null = null;
    let nearestDist = Infinity;
    for (const t of this.targets) {
      const d = playerPos.distanceTo(t.position);
      if (d <= t.radius && d < nearestDist) {
        nearest = t;
        nearestDist = d;
      }
    }
    this.activeTarget = nearest;

    const obj = this.getObjectiveTarget();
    if (obj) {
      this.objectiveBeaconGroup.visible = true;
      this.objectiveBeaconGroup.position.copy(obj.position);
      const flashing = this.isObjectiveFlashing();
      const diamond = this.objectiveDiamondMesh;
      const mat = diamond.material as THREE.MeshBasicMaterial;
      mat.color.setHex(flashing ? 0xfacc15 : 0x34d399);
    } else {
      this.objectiveBeaconGroup.visible = false;
    }
  }

  public triggerCurrentInteraction(): boolean {
    if (!this.activeTarget) return false;
    if (this.activeTarget.onInteract) {
      this.activeTarget.onInteract(this.activeTarget);
    }
    if (this.onInteractTriggered) {
      this.onInteractTriggered(this.activeTarget);
    }
    return true;
  }
}
