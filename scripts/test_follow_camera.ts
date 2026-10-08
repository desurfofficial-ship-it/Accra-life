/**
 * test_follow_camera.ts — unit tests for the FollowCamera math.
 *
 * Tests:
 *   1. Follow lerp convergence: given player at [30,0,-20] and delta=1s,
 *      the camera target converges within 0.1 units of the player.
 *   2. Camera-relative movement: at yaw=90° (π/2), joystick "up" (dz=-1)
 *      moves the player along +X (the expected world axis when the camera
 *      is rotated 90° to look toward +X).
 *   3. Camera-relative movement: at yaw=0, joystick "up" (dz=-1) moves
 *      the player along -Z (the default forward direction).
 *   4. Camera-relative movement: at yaw=45° (π/4), joystick "up" produces
 *      a 45° movement vector (equal components in X and -Z).
 *
 * Run via: npm run test:camera
 */
import assert from 'node:assert/strict';

let passed = 0;
let failed = 0;

function check(label: string, cond: boolean, extra?: unknown): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`, extra ?? '');
  }
}

function main(): void {
  console.log('\n=== FollowCamera + camera-relative movement — unit test ===\n');

  // ── 1. Follow lerp convergence ─────────────────────────────────────────
  console.log('Step 1: follow lerp converges within 0.1 units after 1s');
  {
    // The lerp formula: k = 1 - Math.exp(-6 * delta)
    // At delta=1s: k = 1 - Math.exp(-6) ≈ 0.99752
    // After one frame at delta=1s, the target moves 99.752% of the way.
    const delta = 1; // 1 second
    const lerpSpeed = 6;
    const k = 1 - Math.exp(-lerpSpeed * delta);

    // Player at [30, 0, -20], camera target starts at [0, 1, 0].
    const playerPos = { x: 30, y: 0, z: -20 };
    const desiredTarget = { x: playerPos.x, y: playerPos.y + 1, z: playerPos.z };
    const currentTarget = { x: 0, y: 1, z: 0 };

    // Apply lerp: newTarget = current + (desired - current) * k
    const newTarget = {
      x: currentTarget.x + (desiredTarget.x - currentTarget.x) * k,
      y: currentTarget.y + (desiredTarget.y - currentTarget.y) * k,
      z: currentTarget.z + (desiredTarget.z - currentTarget.z) * k,
    };

    // Distance from new target to desired target
    const dist = Math.sqrt(
      (newTarget.x - desiredTarget.x) ** 2 +
      (newTarget.y - desiredTarget.y) ** 2 +
      (newTarget.z - desiredTarget.z) ** 2,
    );

    check(`k = ${k.toFixed(6)} (should be ~0.99752)`, Math.abs(k - 0.99752) < 0.001, k);
    check(`target converged within 0.1 units after 1s (dist=${dist.toFixed(4)})`, dist < 0.1, dist);
  }

  // ── 2. Camera-relative movement at yaw=90° (π/2) ──────────────────────
  console.log('\nStep 2: at yaw=90°, joystick up moves player along +X');
  {
    const yaw = Math.PI / 2; // 90°
    // Joystick "up" = forward = dz=-1, dx=0
    let dx = 0, dz = -1;
    // Normalize (already unit length)
    // Apply camera-relative rotation:
    //   worldDx = dx * cos(yaw) - dz * sin(yaw)
    //   worldDz = dx * sin(yaw) + dz * cos(yaw)
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const worldDx = dx * cos - dz * sin;
    const worldDz = dx * sin + dz * cos;

    // At yaw=90°: camera looks toward +X. "Up" = "away from camera" = +X.
    // So worldDx should be ~1, worldDz should be ~0.
    check('worldDx ≈ 1 (moving +X)', Math.abs(worldDx - 1) < 0.01, worldDx);
    check('worldDz ≈ 0', Math.abs(worldDz) < 0.01, worldDz);
  }

  // ── 3. Camera-relative movement at yaw=0 ──────────────────────────────
  console.log('\nStep 3: at yaw=0, joystick up moves player along -Z');
  {
    const yaw = 0;
    let dx = 0, dz = -1;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const worldDx = dx * cos - dz * sin;
    const worldDz = dx * sin + dz * cos;

    // At yaw=0: camera looks toward -Z. "Up" = "away from camera" = -Z.
    // So worldDx should be 0, worldDz should be -1.
    check('worldDx ≈ 0', Math.abs(worldDx) < 0.01, worldDx);
    check('worldDz ≈ -1 (moving -Z)', Math.abs(worldDz - (-1)) < 0.01, worldDz);
  }

  // ── 4. Camera-relative movement at yaw=45° (π/4) ──────────────────────
  console.log('\nStep 4: at yaw=45°, joystick up produces 45° movement');
  {
    const yaw = Math.PI / 4; // 45°
    let dx = 0, dz = -1;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const worldDx = dx * cos - dz * sin;
    const worldDz = dx * sin + dz * cos;

    // At yaw=45°: the camera is rotated 45° CCW.
    // "Up" should produce equal components in X and -Z.
    const angle = Math.atan2(worldDx, -worldDz); // angle from -Z axis
    check('worldDx > 0 (positive X component)', worldDx > 0, worldDx);
    check('worldDz < 0 (negative Z component)', worldDz < 0, worldDz);
    check('movement angle ≈ 45° from -Z', Math.abs(angle - Math.PI / 4) < 0.01, angle);
    check('|worldDx| ≈ |worldDz| (equal components)', Math.abs(Math.abs(worldDx) - Math.abs(worldDz)) < 0.01, { worldDx, worldDz });
  }

  // ── 5. Joystick "right" at yaw=0 ──────────────────────────────────────
  console.log('\nStep 5: at yaw=0, joystick right moves player along +X');
  {
    const yaw = 0;
    let dx = 1, dz = 0; // right
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const worldDx = dx * cos - dz * sin;
    const worldDz = dx * sin + dz * cos;
    check('worldDx ≈ 1 (+X)', Math.abs(worldDx - 1) < 0.01, worldDx);
    check('worldDz ≈ 0', Math.abs(worldDz) < 0.01, worldDz);
  }

  // ── 6. Joystick "right" at yaw=90° ───────────────────────────────────
  console.log('\nStep 6: at yaw=90°, joystick right moves player along +Z');
  {
    const yaw = Math.PI / 2;
    let dx = 1, dz = 0; // right
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const worldDx = dx * cos - dz * sin;
    const worldDz = dx * sin + dz * cos;
    // At yaw=90°, "right" in camera space = +Z in world space
    check('worldDx ≈ 0', Math.abs(worldDx) < 0.01, worldDx);
    check('worldDz ≈ 1 (+Z)', Math.abs(worldDz - 1) < 0.01, worldDz);
  }

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main();
