import * as THREE from 'three';

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface InputState {
  moveX: number; // -1 (left) to +1 (right)
  moveZ: number; // -1 (forward) to +1 (backward)
  sprint: boolean;
}

export class PlayerController {
  public readonly group: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly velocity: THREE.Vector3 = new THREE.Vector3();
  public rotationY = 0;
  public isMoving = false;
  public isSprinting = false;

  private readonly walkSpeed = 4.6;
  private readonly sprintSpeed = 7.4;
  private readonly turnSmoothness = 12.0;
  private readonly playerRadius = 0.42;
  private readonly worldLimit = 26;

  private headMesh!: THREE.Mesh;
  private torsoMesh!: THREE.Mesh;
  private leftArmPivot!: THREE.Group;
  private rightArmPivot!: THREE.Group;
  private leftLegPivot!: THREE.Group;
  private rightLegPivot!: THREE.Group;
  private shadowRing!: THREE.Mesh;

  private animClock = 0;
  private keysPressed: Set<string> = new Set();
  private joystickVector: { x: number; y: number } = { x: 0, y: 0 };

  constructor(spawnPosition = new THREE.Vector3(0, 0, 6)) {
    this.group = new THREE.Group();
    this.group.name = 'PLAYER_ACTOR_001';
    this.group.position.copy(spawnPosition);
    this.position = this.group.position;

    this.buildStylizedCharacterMesh();
    this.bindKeyboardListeners();
  }

  private buildStylizedCharacterMesh(): void {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x6b3e26,
      roughness: 0.65,
      metalness: 0.05
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Warm Accra gold-amber top
      roughness: 0.55
    });
    const accentTrimMat = new THREE.MeshStandardMaterial({
      color: 0x059669, // Contemporary emerald collar/cuff trim
      roughness: 0.5
    });
    const trousersMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Clean dark slate trousers
      roughness: 0.7
    });
    const sneakerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.45
    });

    // Ground contact soft shadow disc
    const shadowGeo = new THREE.RingGeometry(0.05, 0.44, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.26,
      depthWrite: false
    });
    this.shadowRing = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowRing.position.y = 0.02;
    this.group.add(this.shadowRing);

    // Torso (believable stylized proportions)
    const torsoGeo = new THREE.BoxGeometry(0.52, 0.64, 0.28);
    this.torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    this.torsoMesh.position.y = 1.06;
    this.torsoMesh.castShadow = true;
    this.torsoMesh.receiveShadow = true;
    this.group.add(this.torsoMesh);

    // Neckline / Kente-inspired modern collar band
    const collarGeo = new THREE.BoxGeometry(0.54, 0.08, 0.30);
    const collarMesh = new THREE.Mesh(collarGeo, accentTrimMat);
    collarMesh.position.y = 1.35;
    collarMesh.castShadow = true;
    this.group.add(collarMesh);

    // Head
    const headGeo = new THREE.BoxGeometry(0.38, 0.40, 0.38);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.y = 1.64;
    this.headMesh.castShadow = true;
    this.group.add(this.headMesh);

    // Stylized tapered haircut
    const hairGeo = new THREE.BoxGeometry(0.41, 0.16, 0.41);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = 0.16;
    this.headMesh.add(hairMesh);

    // Eyes (helps clearly read facing direction)
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.03);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.09, 0.02, 0.19);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.09, 0.02, 0.19);
    this.headMesh.add(leftEye, rightEye);

    // Left Arm Pivot (at shoulder height)
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.35, 1.34, 0);
    const armGeo = new THREE.BoxGeometry(0.16, 0.56, 0.16);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.y = -0.24;
    leftArm.castShadow = true;
    const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), shirtMat);
    leftSleeve.position.y = -0.08;
    this.leftArmPivot.add(leftSleeve, leftArm);
    this.group.add(this.leftArmPivot);

    // Right Arm Pivot
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.35, 1.34, 0);
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.y = -0.24;
    rightArm.castShadow = true;
    const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), shirtMat);
    rightSleeve.position.y = -0.08;
    this.rightArmPivot.add(rightSleeve, rightArm);
    this.group.add(this.rightArmPivot);

    // Left Leg Pivot (at hip height)
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.14, 0.74, 0);
    const legGeo = new THREE.BoxGeometry(0.20, 0.64, 0.20);
    const leftLeg = new THREE.Mesh(legGeo, trousersMat);
    leftLeg.position.y = -0.32;
    leftLeg.castShadow = true;
    const shoeGeo = new THREE.BoxGeometry(0.22, 0.12, 0.28);
    const leftShoe = new THREE.Mesh(shoeGeo, sneakerMat);
    leftShoe.position.set(0, -0.66, 0.04);
    leftShoe.castShadow = true;
    this.leftLegPivot.add(leftLeg, leftShoe);
    this.group.add(this.leftLegPivot);

    // Right Leg Pivot
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.14, 0.74, 0);
    const rightLeg = new THREE.Mesh(legGeo, trousersMat);
    rightLeg.position.y = -0.32;
    rightLeg.castShadow = true;
    const rightShoe = new THREE.Mesh(shoeGeo, sneakerMat);
    rightShoe.position.set(0, -0.66, 0.04);
    rightShoe.castShadow = true;
    this.rightLegPivot.add(rightLeg, rightShoe);
    this.group.add(this.rightLegPivot);
  }

  private bindKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keysPressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keysPressed.clear();
    });
  }

  public setJoystickInput(x: number, y: number): void {
    this.joystickVector.x = Math.max(-1, Math.min(1, x));
    this.joystickVector.y = Math.max(-1, Math.min(1, y));
  }

  public setSprintState(active: boolean): void {
    if (active) {
      this.keysPressed.add('VirtualSprint');
    } else {
      this.keysPressed.delete('VirtualSprint');
    }
  }

  private readInputState(): InputState {
    let moveX = 0;
    let moveZ = 0;

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) moveZ -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) moveZ += 1;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) moveX -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) moveX += 1;

    if (Math.abs(this.joystickVector.x) > 0.05 || Math.abs(this.joystickVector.y) > 0.05) {
      moveX = this.joystickVector.x;
      moveZ = this.joystickVector.y;
    }

    const sprint =
      this.keysPressed.has('ShiftLeft') ||
      this.keysPressed.has('ShiftRight') ||
      this.keysPressed.has('VirtualSprint');

    return { moveX, moveZ, sprint };
  }

  public update(dt: number, cameraYaw: number, colliders: ColliderBox[]): void {
    const input = this.readInputState();
    const inputMag = Math.hypot(input.moveX, input.moveZ);

    this.isMoving = inputMag > 0.05;
    this.isSprinting = this.isMoving && input.sprint;

    if (this.isMoving) {
      const normX = input.moveX / Math.max(1, inputMag);
      const normZ = input.moveZ / Math.max(1, inputMag);

      // Compute camera-relative movement vector on the XZ plane
      const sinYaw = Math.sin(cameraYaw);
      const cosYaw = Math.cos(cameraYaw);

      const worldDirX = normX * cosYaw + normZ * sinYaw;
      const worldDirZ = -normX * sinYaw + normZ * cosYaw;

      const speed = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
      this.velocity.set(worldDirX * speed, 0, worldDirZ * speed);

      // Smoothly rotate character to face movement direction
      const targetAngle = Math.atan2(worldDirX, worldDirZ);
      this.rotationY = this.lerpAngle(this.rotationY, targetAngle, Math.min(1, dt * this.turnSmoothness));
      this.group.rotation.y = this.rotationY;

      // Apply movement with separate X and Z collision resolution for smooth wall sliding
      const nextX = this.position.x + this.velocity.x * dt;
      if (!this.checkCollision(nextX, this.position.z, colliders)) {
        this.position.x = THREE.MathUtils.clamp(nextX, -this.worldLimit, this.worldLimit);
      }

      const nextZ = this.position.z + this.velocity.z * dt;
      if (!this.checkCollision(this.position.x, nextZ, colliders)) {
        this.position.z = THREE.MathUtils.clamp(nextZ, -this.worldLimit, this.worldLimit);
      }
    } else {
      this.velocity.set(0, 0, 0);
    }

    this.updateLocomotionAnimation(dt);
  }

  private checkCollision(x: number, z: number, colliders: ColliderBox[]): boolean {
    const r = this.playerRadius;
    for (const box of colliders) {
      if (
        x + r > box.minX &&
        x - r < box.maxX &&
        z + r > box.minZ &&
        z - r < box.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  private updateLocomotionAnimation(dt: number): void {
    if (this.isMoving) {
      const freq = this.isSprinting ? 13.5 : 9.0;
      const amp = this.isSprinting ? 0.72 : 0.48;
      this.animClock += dt * freq;

      const swing = Math.sin(this.animClock) * amp;
      this.leftLegPivot.rotation.x = swing;
      this.rightLegPivot.rotation.x = -swing;
      this.leftArmPivot.rotation.x = -swing * 0.85;
      this.rightArmPivot.rotation.x = swing * 0.85;

      // Subtle vertical bounce during stride
      const bounce = Math.abs(Math.cos(this.animClock)) * (this.isSprinting ? 0.055 : 0.032);
      this.torsoMesh.position.y = 1.06 + bounce;
      this.headMesh.position.y = 1.64 + bounce;
    } else {
      this.animClock += dt * 2.2;
      const breath = Math.sin(this.animClock) * 0.012;

      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, dt * 10);
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, dt * 10);
      this.leftArmPivot.rotation.x = THREE.MathUtils.lerp(this.leftArmPivot.rotation.x, 0, dt * 10);
      this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(this.rightArmPivot.rotation.x, 0, dt * 10);

      this.torsoMesh.position.y = 1.06 + breath;
      this.headMesh.position.y = 1.64 + breath * 1.2;
    }
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY)).normalize();
  }

  private lerpAngle(current: number, target: number, t: number): number {
    let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * t;
  }
}
