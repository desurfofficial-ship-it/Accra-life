import * as THREE from 'three';
import { InputManager } from './InputManager';
import { buildStylizedGhanaianCharacter, CharacterRig, type PlayerLookOptions } from '../Art/CharacterBuilder';
import { getSurfaceHeightAt } from '../World/WorldSurface';
import { HALF as GRID_MAP_HALF } from '../World/GridMap';

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
  private readonly walkSpeed = 4.5;
  private readonly sprintSpeed = 7.3;
  private readonly playerRadius = 0.42;
  // Custom map integration: movement bounds follow the 5x5 Accra grid map
  // (±42m, GridMap.HALF) instead of the legacy neighborhood (±25/±17.2).
  private readonly worldBoundsX = GRID_MAP_HALF;
  private readonly worldBoundsZ = GRID_MAP_HALF;

  private currentSpeed = 0;
  private smoothedTurnRate = 0;
  private lastPivotSign = 1;

  private readonly forwardVec = new THREE.Vector3(0, 0, -1);

  constructor(
    inputManager: InputManager,
    spawnPosition = new THREE.Vector3(0, 0, 5.8),
    look?: PlayerLookOptions
  ) {
    this.inputManager = inputManager;
    this.characterRig = buildStylizedGhanaianCharacter('PLAYER_GHA_001', look);
    this.group = this.characterRig.root;
    this.group.position.copy(spawnPosition);
    this.position = this.group.position;
    this.position.y = getSurfaceHeightAt(this.position.x, this.position.z);
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

    const baseSpeed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;

    if (this.isMoving) {
      const sinYaw = Math.sin(cameraYaw);
      const cosYaw = Math.cos(cameraYaw);

      const worldDirX = input.moveX * cosYaw + input.moveZ * sinYaw;
      const worldDirZ = -input.moveX * sinYaw + input.moveZ * cosYaw;

      const targetAngle = Math.atan2(worldDirX, worldDirZ);
      let angleDiff = this.shortestAngleDiff(this.rotationY, targetAngle);

      if (Math.abs(angleDiff) > 2.75) {
        angleDiff = Math.abs(angleDiff) * this.lastPivotSign;
      } else if (Math.abs(angleDiff) > 0.15) {
        this.lastPivotSign = Math.sign(angleDiff) || 1;
      }

      const absDiff = Math.abs(angleDiff);
      const turnResponsiveness = absDiff > 1.1 ? 16.5 : 12.5;
      const turnStep = angleDiff * (1 - Math.exp(-dt * turnResponsiveness));

      this.rotationY = this.wrapAngle(this.rotationY + turnStep);
      this.group.rotation.y = this.rotationY;

      const rawTurnRate = dt > 0.0001 ? THREE.MathUtils.clamp((turnStep / dt) / 9.0, -1, 1) : 0;
      this.smoothedTurnRate = THREE.MathUtils.lerp(
        this.smoothedTurnRate,
        rawTurnRate,
        1 - Math.exp(-dt * 14)
      );

      const alignmentFactor = THREE.MathUtils.clamp(Math.cos(absDiff) * 0.45 + 0.58, 0.26, 1.0);
      const desiredSpeed = baseSpeed * input.magnitude * alignmentFactor;
      this.currentSpeed = THREE.MathUtils.lerp(
        this.currentSpeed,
        desiredSpeed,
        1 - Math.exp(-dt * 15)
      );

      const facingX = Math.sin(this.rotationY);
      const facingZ = Math.cos(this.rotationY);
      const moveDirX = facingX * 0.68 + worldDirX * 0.32;
      const moveDirZ = facingZ * 0.68 + worldDirZ * 0.32;
      const moveLen = Math.hypot(moveDirX, moveDirZ) || 1;

      this.velocity.set(
        (moveDirX / moveLen) * this.currentSpeed,
        0,
        (moveDirZ / moveLen) * this.currentSpeed
      );
    } else {
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, 0, 1 - Math.exp(-dt * 18));
      this.smoothedTurnRate = THREE.MathUtils.lerp(
        this.smoothedTurnRate,
        0,
        1 - Math.exp(-dt * 14)
      );
      if (this.currentSpeed < 0.08) {
        this.currentSpeed = 0;
        this.velocity.set(0, 0, 0);
      } else {
        this.velocity.set(
          Math.sin(this.rotationY) * this.currentSpeed,
          0,
          Math.cos(this.rotationY) * this.currentSpeed
        );
      }
    }

    if (this.currentSpeed > 0.005) {
      const steps = 8;
      const stepDt = dt / steps;
      for (let s = 0; s < steps; s++) {
        const nextX = this.position.x + this.velocity.x * stepDt;
        if (!this.checkCollision(nextX, this.position.z, colliders)) {
          this.position.x = nextX;
        } else {
          this.velocity.x = 0;
        }
        const nextZ = this.position.z + this.velocity.z * stepDt;
        if (!this.checkCollision(this.position.x, nextZ, colliders)) {
          this.position.z = nextZ;
        } else {
          this.velocity.z = 0;
        }
        this.resolvePenetration(colliders);
      }
    } else {
      this.resolvePenetration(colliders);
    }

    this.position.x = THREE.MathUtils.clamp(this.position.x, -this.worldBoundsX, this.worldBoundsX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -this.worldBoundsZ, this.worldBoundsZ);
    const targetSurfaceY = getSurfaceHeightAt(this.position.x, this.position.z);
    if (targetSurfaceY >= this.position.y) {
      this.position.y = targetSurfaceY;
    } else {
      this.position.y = THREE.MathUtils.lerp(this.position.y, targetSurfaceY, Math.min(1, dt * 28));
    }

    const moveSpeedRatio = this.currentSpeed / baseSpeed;
    this.characterRig.updateAnimation(
      dt,
      this.isMoving || this.currentSpeed > 0.25,
      this.isSprinting,
      0,
      this.smoothedTurnRate,
      moveSpeedRatio
    );
  }

  private checkCollision(x: number, z: number, colliders: ColliderBox[]): boolean {
    const r = this.playerRadius;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      const closestX = Math.max(box.minX, Math.min(x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < r * r) return true;
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

  private shortestAngleDiff(current: number, target: number): number {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
  }

  private wrapAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }
}
