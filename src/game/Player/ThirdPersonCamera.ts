import * as THREE from 'three';

export class ThirdPersonCamera {
  public readonly camera: THREE.PerspectiveCamera;
  public yaw = 0; // Horizontal orbit angle (radians)
  public pitch = 0.42; // Vertical tilt angle (radians)
  public distance = 7.2;

  private readonly minPitch = 0.14;
  private readonly maxPitch = 1.15;
  private readonly minDistance = 3.8;
  private readonly maxDistance = 12.5;
  private readonly followLerpSpeed = 9.5;
  private readonly targetHeightOffset = 1.38;

  private currentLookTarget = new THREE.Vector3();
  private desiredCameraPos = new THREE.Vector3();
  private isPointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private orbitKeys: Set<string> = new Set();

  constructor(domElement: HTMLElement, initialTargetPos: THREE.Vector3) {
    this.camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      160
    );

    this.currentLookTarget.copy(initialTargetPos);
    this.currentLookTarget.y += this.targetHeightOffset;

    this.bindCameraControls(domElement);
    this.update(0.016, initialTargetPos, true);
  }

  private bindCameraControls(domElement: HTMLElement): void {
    domElement.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.button === 2 || e.pointerType === 'touch') {
        this.isPointerDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDragging) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      const sensitivity = 0.0068;
      this.yaw -= dx * sensitivity;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch + dy * sensitivity,
        this.minPitch,
        this.maxPitch
      );
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDragging = false;
    });

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.distance = THREE.MathUtils.clamp(
          this.distance + e.deltaY * 0.005,
          this.minDistance,
          this.maxDistance
        );
      },
      { passive: false }
    );

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyQ' || e.code === 'KeyE') {
        this.orbitKeys.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.orbitKeys.delete(e.code);
    });
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  public resetBehindPlayer(playerRotationY: number): void {
    this.yaw = playerRotationY + Math.PI;
    this.pitch = 0.42;
  }

  public update(dt: number, playerPosition: THREE.Vector3, snap = false): void {
    // Support Q / E keyboard camera orbit
    const keyOrbitSpeed = 1.9;
    if (this.orbitKeys.has('KeyQ')) this.yaw += keyOrbitSpeed * dt;
    if (this.orbitKeys.has('KeyE')) this.yaw -= keyOrbitSpeed * dt;

    const targetFocus = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y + this.targetHeightOffset,
      playerPosition.z
    );

    if (snap) {
      this.currentLookTarget.copy(targetFocus);
    } else {
      this.currentLookTarget.lerp(targetFocus, Math.min(1, dt * this.followLerpSpeed));
    }

    const horizDist = this.distance * Math.cos(this.pitch);
    const vertDist = this.distance * Math.sin(this.pitch);

    this.desiredCameraPos.set(
      this.currentLookTarget.x + Math.sin(this.yaw) * horizDist,
      Math.max(0.65, this.currentLookTarget.y + vertDist),
      this.currentLookTarget.z + Math.cos(this.yaw) * horizDist
    );

    if (snap) {
      this.camera.position.copy(this.desiredCameraPos);
    } else {
      this.camera.position.lerp(this.desiredCameraPos, Math.min(1, dt * (this.followLerpSpeed + 2)));
    }

    this.camera.lookAt(this.currentLookTarget);
  }
}
