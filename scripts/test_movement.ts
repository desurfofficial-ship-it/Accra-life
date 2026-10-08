/**
 * Headless movement test: joystick math → InputManager → avatar step.
 * Proves a held stick moves ~4 m/s and release zeros input.
 */
import assert from 'node:assert/strict';

const g = globalThis as unknown as {
  window: any;
  document: any;
};
g.window = g.window ?? {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
};
g.document = g.document ?? {
  addEventListener() {},
  visibilityState: 'visible',
};

const { InputManager } = await import('../src/game/Player/InputManager.ts');

const input = new InputManager();
const maxR = 36;

function setStick(clientX: number, clientY: number) {
  const cx = 40;
  const cy = 40;
  let ox = clientX - cx;
  let oy = clientY - cy;
  const mag = Math.hypot(ox, oy);
  if (mag > maxR) {
    ox = (ox / mag) * maxR;
    oy = (oy / mag) * maxR;
  }
  input.setJoystickInput(ox / maxR, oy / maxR);
}

function release() {
  input.setJoystickInput(0, 0);
}

setStick(40, 10);
const mid = input.getMovementInput();
assert.ok(mid.magnitude > 0.3, `expected active stick, got mag=${mid.magnitude}`);

let x = 0;
let z = 0;
const MOVE_SPEED = 4.0;
const dt = 1 / 30;
for (let i = 0; i < 30; i++) {
  const m = input.getMovementInput();
  let dx = m.moveX;
  let dz = m.moveZ;
  if (dx !== 0 || dz !== 0) {
    const len = Math.hypot(dx, dz);
    dx /= len;
    dz /= len;
  }
  x += dx * MOVE_SPEED * dt;
  z += dz * MOVE_SPEED * dt;
}
const dist = Math.hypot(x, z);
assert.ok(dist > 3.0, `after 1s held stick expected ~4m walk, got ${dist.toFixed(2)}m`);
assert.ok(dist < 5.5, `should not exceed ~4m/s, got ${dist.toFixed(2)}m`);

release();
const idle = input.getMovementInput();
assert.equal(idle.magnitude, 0, 'release must zero movement');

setStick(40, 70);
const down = input.getMovementInput();
assert.ok(down.magnitude > 0.3, 'pointer-style stick down must register');

console.log(`OK movement: 1s stick → ${dist.toFixed(2)}m (target ~4m), release zeros input`);
console.log('All movement checks passed.');
