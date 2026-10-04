import * as THREE from 'three';

export interface InteractableTarget {
  id: string;
  assetId: string;
  title: string;
  promptLabel: string;
  interactionResponse: string;
  position: THREE.Vector3;
  radius: number;
  mesh?: THREE.Object3D;
  onInteract?: (target: InteractableTarget) => void;
}

export class InteractionSystem {
  private targets: InteractableTarget[] = [];
  private activeTarget: InteractableTarget | null = null;
  private indicatorRing: THREE.Mesh;
  private pulseClock = 0;

  private onActiveTargetChange?: (target: InteractableTarget | null) => void;
  private onInteractTriggered?: (target: InteractableTarget) => void;

  constructor(
    scene: THREE.Scene,
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
    this.indicatorRing.position.y = 0.04;
    scene.add(this.indicatorRing);

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyE' || e.code === 'Enter') {
        this.triggerCurrentInteraction();
      }
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

    for (const target of this.targets) {
      const dx = target.position.x - playerPosition.x;
      const dz = target.position.z - playerPosition.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= target.radius) {
        // Favor objects the player is both close to and generally facing
        const toTarget = new THREE.Vector3(dx, 0, dz).normalize();
        const dot = playerForward.dot(toTarget); // -1 (behind) to +1 (directly ahead)
        if (dot > -0.35) {
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
        0.04,
        this.activeTarget.position.z
      );
      const scale = 1 + Math.sin(this.pulseClock) * 0.08;
      this.indicatorRing.scale.set(scale, 1, scale);
    } else {
      this.indicatorRing.visible = false;
    }
  }
}
