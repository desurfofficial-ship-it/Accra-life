import * as THREE from 'three';
import { InputManager } from './InputManager';
import { ColliderBox } from './PlayerController';

export class ThirdPersonCamera {
  public readonly camera: THREE.PerspectiveCamera;
  public yaw = 0; // Horizontal orbit angle (radians)
  public pitch = 0.42; // Vertical tilt angle (radians)
  public distance = 7.2;

  private readonly inputManager: InputManager;
  private readonly minPitch = 0.16;
  private readonly maxPitch = 1.18;
  private readonly minDistance = 3.2;
  private readonly maxDistance = 12.5;
  private readonly followLerpSpeed = 10.0;
  private readonly targetHeightOffset = 1.38;
  private readonly cameraCollisionPadding = 0.38;

  private currentDistance = 7.2;
  private readonly currentLookTarget = new THREE.Vector3();
  private readonly targetFocus = new THREE.Vector3();
  private readonly desiredCameraPos = new THREE.Vector3();

  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private lastPinchDist = 0;

  constructor(
    domElement: HTMLElement,
    inputManager: InputManager,
    initialTargetPos: THREE.Vector3
  ) {
    this.inputManager = inputManager;
    this.camera = new THREE.PerspectiveCamera(
      52,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      160
    );

    this.currentLookTarget.set(
      initialTargetPos.x,
      initialTargetPos.y + this.targetHeightOffset,
      initialTargetPos.z
    );

    this.bindCameraControls(domElement);
    this.update(0.016, initialTargetPos, [], true);
  }

  private bindCameraControls(domElement: HTMLElement): void {
    domElement.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2 || e.pointerType === 'touch') {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.activePointers.size === 2) {
          this.lastPinchDist = this.computePinchDistance();
        }
      }
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      const prev = this.activePointers.get(e.pointerId);
      if (!prev) return;

      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;

      if (this.activePointers.size === 1) {
        const sensitivity = 0.0068;
        this.yaw = this.normalizeYaw(this.yaw - dx * sensitivity);
        this.pitch = THREE.MathUtils.clamp(
          this.pitch + dy * sensitivity,
          this.minPitch,
          this.maxPitch
        );
      } else if (this.activePointers.size === 2) {
        const newPinchDist = this.computePinchDistance();
        if (this.lastPinchDist > 0 && newPinchDist > 0) {
          const pinchDelta = this.lastPinchDist - newPinchDist;
          this.distance = THREE.MathUtils.clamp(
            this.distance + pinchDelta * 0.025,
            this.minDistance,
            this.maxDistance
          );
        }
        this.lastPinchDist = newPinchDist;
      }
    });

    const removePointer = (e: PointerEvent) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.delete(e.pointerId);
        if (this.activePointers.size < 2) {
          this.lastPinchDist = 0;
        }
      }
    };

    window.addEventListener('pointerup', removePointer);
    window.addEventListener('pointercancel', removePointer);
    window.addEventListener('blur', () => {
      this.activePointers.clear();
      this.lastPinchDist = 0;
    });

    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    domElement.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        this.distance = THREE.MathUtils.clamp(
          this.distance + e.deltaY * 0.005,
          this.minDistance,
          this.maxDistance
        );
      },
      { passive: false }
    );
  }

  private computePinchDistance(): number {
    const pts = Array.from(this.activePointers.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private normalizeYaw(angle: number): number {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  public resize(width: number, height: number): void {
    const safeW = Math.max(1, width);
    const safeH = Math.max(1, height);
    this.camera.aspect = safeW / safeH;
    this.camera.updateProjectionMatrix();
  }

  public resetBehindPlayer(playerRotationY: number): void {
    this.yaw = this.normalizeYaw(playerRotationY + Math.PI);
    this.pitch = 0.42;
    this.distance = 7.2;
  }

  public update(
    dt: number,
    playerPosition: THREE.Vector3,
    colliders: ColliderBox[],
    snap = false
  ): void {
    // Support Q / R keyboard camera orbit
    const orbitDir = this.inputManager.getCameraOrbitDirection();
    if (orbitDir !== 0) {
      const keyOrbitSpeed = 1.9;
      this.yaw = this.normalizeYaw(this.yaw + orbitDir * keyOrbitSpeed * dt);
    }

    this.targetFocus.set(
      playerPosition.x,
      playerPosition.y + this.targetHeightOffset,
      playerPosition.z
    );

    if (snap) {
      this.currentLookTarget.copy(this.targetFocus);
    } else {
      this.currentLookTarget.lerp(this.targetFocus, Math.min(1, dt * this.followLerpSpeed));
    }

    // Raycast / segment check from player to desired camera offset so camera never clips inside buildings
    const dirX = Math.sin(this.yaw) * Math.cos(this.pitch);
    const dirY = Math.sin(this.pitch);
    const dirZ = Math.cos(this.yaw) * Math.cos(this.pitch);

    const unobstructedDist = this.computeSafeCameraDistance(
      this.currentLookTarget.x,
      this.currentLookTarget.y,
      this.currentLookTarget.z,
      dirX,
      dirY,
      dirZ,
      this.distance,
      colliders
    );

    if (snap || unobstructedDist < this.currentDistance) {
      // Pull camera in quickly when obstructed by a building wall
      this.currentDistance = THREE.MathUtils.lerp(
        this.currentDistance,
        unobstructedDist,
        snap ? 1 : Math.min(1, dt * 22)
      );
    } else {
      // Ease camera back out smoothly once line of sight clears
      this.currentDistance = THREE.MathUtils.lerp(
        this.currentDistance,
        unobstructedDist,
        Math.min(1, dt * 8)
      );
    }

    this.desiredCameraPos.set(
      this.currentLookTarget.x + dirX * this.currentDistance,
      Math.max(0.65, this.currentLookTarget.y + dirY * this.currentDistance),
      this.currentLookTarget.z + dirZ * this.currentDistance
    );

    if (snap) {
      this.camera.position.copy(this.desiredCameraPos);
    } else {
      this.camera.position.lerp(this.desiredCameraPos, Math.min(1, dt * (this.followLerpSpeed + 4)));
    }

    this.camera.lookAt(this.currentLookTarget);
  }

  private computeSafeCameraDistance(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    colliders: ColliderBox[]
  ): number {
    let closestHitDist = maxDist;
    const pad = this.cameraCollisionPadding;

    const isInsideCompoundRoom =
      ox >= -14.5 && ox <= -6.5 && oz >= 9.0 && oz <= 15.95;

    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      if (
        isInsideCompoundRoom &&
        (box.id === 'ACC_HOUSE_001_WALL_S_L' || box.id === 'ACC_HOUSE_001_WALL_S_R')
      ) {
        continue;
      }
      const boxHeight = box.height ?? 3.6;
      // Ignore very narrow poles/trees or low compound walls below camera ray height
      const boxWidth = box.maxX - box.minX;
      const boxDepth = box.maxZ - box.minZ;
      if (boxWidth < 1.2 && boxDepth < 1.2) continue;

      const minX = box.minX - pad;
      const maxX = box.maxX + pad;
      const minY = 0;
      const maxY = boxHeight + pad;
      const minZ = box.minZ - pad;
      const maxZ = box.maxZ + pad;

      // Slab intersection test along the ray from player head to camera
      let tmin = 0;
      let tmax = closestHitDist;

      if (Math.abs(dx) < 1e-6) {
        if (ox < minX || ox > maxX) continue;
      } else {
        const invX = 1 / dx;
        let t1 = (minX - ox) * invX;
        let t2 = (maxX - ox) * invX;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      if (Math.abs(dy) < 1e-6) {
        if (oy < minY || oy > maxY) continue;
      } else {
        const invY = 1 / dy;
        let t1 = (minY - oy) * invY;
        let t2 = (maxY - oy) * invY;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      if (Math.abs(dz) < 1e-6) {
        if (oz < minZ || oz > maxZ) continue;
      } else {
        const invZ = 1 / dz;
        let t1 = (minZ - oz) * invZ;
        let t2 = (maxZ - oz) * invZ;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      if (tmin > 0.2 && tmin < closestHitDist) {
        closestHitDist = Math.max(1.6, tmin - 0.15);
      }
    }

    return closestHitDist;
  }
}
