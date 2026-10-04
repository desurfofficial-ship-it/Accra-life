import * as THREE from 'three';
import { InputManager } from './InputManager';
import { buildStylizedGhanaianCharacter, CharacterRig } from '../Art/CharacterBuilder';

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height?: number;
}

export class PlayerController {
  public readonly group: THREE.Group;
  public readonly characterRig: CharacterRig;
  public readonly position: THREE.Vector3;
  public readonly velocity: THREE.Vector3 = new THREE.Vector3();
  public rotationY = Math.PI;
  public isMoving = false;
  public isSprinting = false;

  private readonly inputManager: InputManager;
  private readonly walkSpeed = 4.6;
  private readonly sprintSpeed = 7.4;
  private readonly turnSmoothness = 12.0;
  private readonly playerRadius = 0.42;
  private readonly worldBoundsX = 25.0;
  private readonly worldBoundsZ = 17.2;

  // Pre-allocated vector to avoid per-frame allocations in the animation loop
  private readonly forwardVec = new THREE.Vector3(0, 0, -1);

  constructor(inputManager: InputManager, spawnPosition = new THREE.Vector3(0, 0, 5.8)) {
    this.inputManager = inputManager;
    this.characterRig = buildStylizedGhanaianCharacter('PLAYER_GHA_001');
    this.group = this.characterRig.root;
    this.group.position.copy(spawnPosition);
    this.position = this.group.position;
    this.position.y = 0;
    this.rotationY = Math.PI;
    this.group.rotation.y = this.rotationY;
  }

  public setJoystickInput(x: number, y: number): void {
    this.inputManager.setJoystickInput(x, y);
  }

  public setSprintState(active: boolean): void {
    this.inputManager.setVirtualSprint(active);
  }

  public update(dt: number, cameraYaw: number, colliders: ColliderBox[]): void {
    const input = this.inputManager.getMovementInput();

    this.isMoving = input.magnitude > 0.05;
    this.isSprinting = this.isMoving && input.sprint;

    if (this.isMoving) {
      // Camera-relative movement on the XZ plane
      const sinYaw = Math.sin(cameraYaw);
      const cosYaw = Math.cos(cameraYaw);

      const worldDirX = input.moveX * cosYaw + input.moveZ * sinYaw;
      const worldDirZ = -input.moveX * sinYaw + input.moveZ * cosYaw;

      const baseSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
      const speed = baseSpeed * input.magnitude;
      this.velocity.set(worldDirX * speed, 0, worldDirZ * speed);

      // Smoothly rotate character to face movement vector
      const targetAngle = Math.atan2(worldDirX, worldDirZ);
      this.rotationY = this.lerpAngle(this.rotationY, targetAngle, Math.min(1, dt * this.turnSmoothness));
      this.group.rotation.y = this.rotationY;

      // Substep movement to prevent tunneling through thin walls or poles at high dt
      const steps = 2;
      const stepDt = dt / steps;
      for (let s = 0; s < steps; s++) {
        const nextX = this.position.x + this.velocity.x * stepDt;
        if (!this.checkCollision(nextX, this.position.z, colliders)) {
          this.position.x = nextX;
        }

        const nextZ = this.position.z + this.velocity.z * stepDt;
        if (!this.checkCollision(this.position.x, nextZ, colliders)) {
          this.position.z = nextZ;
        }

        this.resolvePenetration(colliders);
      }
    } else {
      this.velocity.set(0, 0, 0);
      this.resolvePenetration(colliders);
    }

    // Clamp to neighborhood play area and keep player strictly grounded
    this.position.x = THREE.MathUtils.clamp(this.position.x, -this.worldBoundsX, this.worldBoundsX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -this.worldBoundsZ, this.worldBoundsZ);
    this.position.y = 0;

    this.characterRig.updateAnimation(dt, this.isMoving, this.isSprinting);
  }

  private checkCollision(x: number, z: number, colliders: ColliderBox[]): boolean {
    const r = this.playerRadius;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      const closestX = Math.max(box.minX, Math.min(x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < r * r) {
        return true;
      }
    }
    return false;
  }

  private resolvePenetration(colliders: ColliderBox[]): void {
    const r = this.playerRadius;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      const closestX = Math.max(box.minX, Math.min(this.position.x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(this.position.z, box.maxZ));
      const dx = this.position.x - closestX;
      const dz = this.position.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < r * r) {
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = r - dist + 0.002;
          this.position.x += (dx / dist) * overlap;
          this.position.z += (dz / dist) * overlap;
        } else {
          const penLeft = Math.abs(this.position.x - box.minX);
          const penRight = Math.abs(box.maxX - this.position.x);
          const penBack = Math.abs(this.position.z - box.minZ);
          const penFront = Math.abs(box.maxZ - this.position.z);
          const minPen = Math.min(penLeft, penRight, penBack, penFront);

          if (minPen === penLeft) this.position.x = box.minX - r - 0.01;
          else if (minPen === penRight) this.position.x = box.maxX + r + 0.01;
          else if (minPen === penBack) this.position.z = box.minZ - r - 0.01;
          else this.position.z = box.maxZ + r + 0.01;
        }
      }
    }
  }

  public getForwardVector(): THREE.Vector3 {
    this.forwardVec.set(Math.sin(this.rotationY), 0, Math.cos(this.rotationY)).normalize();
    return this.forwardVec;
  }

  private lerpAngle(current: number, target: number, t: number): number {
    let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * t;
  }
}
