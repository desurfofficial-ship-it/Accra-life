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
  private indicatorRing: THREE.Mesh;
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

    // Subscribe to single-press E / Enter via InputManager (key auto-repeat is filtered out)
    inputManager.onInteractPressed(() => {
      this.triggerCurrentInteraction();
    });
  }

  public registerTarget(target: InteractableTarget): void {
    this.targets.push(target);
  }

  public getActiveTarget(): InteractableTarget | null {
    return this.activeTarget;
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

        // Always allow interaction when standing directly on the ring (dist <= 1.15)
        // or when generally facing the building/counter
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
        Math.max(0.22, this.activeTarget.position.y),
        this.activeTarget.position.z
      );
      const scale = 1 + Math.sin(this.pulseClock) * 0.08;
      this.indicatorRing.scale.set(scale, 1, scale);
    } else {
      this.indicatorRing.visible = false;
    }
  }
}
