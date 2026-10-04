export interface MovementInput {
  moveX: number; // Normalized [-1, 1]
  moveZ: number; // Normalized [-1, 1]
  magnitude: number; // Clamped [0, 1]
  sprint: boolean;
}

export class InputManager {
  private keysPressed: Set<string> = new Set();
  private joystickVector = { x: 0, y: 0 };
  private virtualSprintEnabled = false;
  private interactCallbacks: Array<() => void> = [];

  // Reusable output struct to avoid per-frame object allocation
  private readonly movementOutput: MovementInput = {
    moveX: 0,
    moveZ: 0,
    magnitude: 0,
    sprint: false
  };

  constructor() {
    this.bindKeyboardEvents();
    this.bindTouchGuards();
  }

  private bindKeyboardEvents(): void {
    const preventedCodes = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
      'KeyQ',
      'KeyR',
      'KeyE',
      'Space',
      'Enter'
    ]);

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (preventedCodes.has(e.code)) {
        e.preventDefault();
      }

      // Single-press interaction trigger (KeyE and Enter exclusively; ignore key hold auto-repeat)
      if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) {
        for (const cb of this.interactCallbacks) {
          cb();
        }
      }

      this.keysPressed.add(e.code);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keysPressed.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.clearAllInputs();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') {
        this.clearAllInputs();
      }
    });
  }

  private bindTouchGuards(): void {
    // Prevent accidental browser pinch-zoom or pull-to-refresh on mobile
    window.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  public clearAllInputs(): void {
    this.keysPressed.clear();
    this.joystickVector.x = 0;
    this.joystickVector.y = 0;
  }

  public onInteractPressed(callback: () => void): void {
    this.interactCallbacks.push(callback);
  }

  public setJoystickInput(x: number, y: number): void {
    this.joystickVector.x = Math.max(-1, Math.min(1, x));
    this.joystickVector.y = Math.max(-1, Math.min(1, y));
  }

  public setVirtualSprint(enabled: boolean): void {
    this.virtualSprintEnabled = enabled;
  }

  public isVirtualSprintEnabled(): boolean {
    return this.virtualSprintEnabled;
  }

  public getCameraOrbitDirection(): number {
    let dir = 0;
    if (this.keysPressed.has('KeyQ')) dir += 1;
    if (this.keysPressed.has('KeyR')) dir -= 1;
    return dir;
  }

  public getMovementInput(): MovementInput {
    let rawX = 0;
    let rawZ = 0;

    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) rawZ -= 1;
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) rawZ += 1;
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) rawX -= 1;
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) rawX += 1;

    // Virtual joystick overrides keyboard directional vector if active
    const stickMag = Math.hypot(this.joystickVector.x, this.joystickVector.y);
    if (stickMag > 0.05) {
      rawX = this.joystickVector.x;
      rawZ = this.joystickVector.y;
    }

    const rawMag = Math.hypot(rawX, rawZ);
    if (rawMag > 0.05) {
      // Normalize diagonal movement so diagonal speed never exceeds cardinal speed,
      // while preserving proportional analog tilt when rawMag < 1 on the virtual thumbstick
      const clampedMag = Math.min(1, rawMag);
      this.movementOutput.moveX = (rawX / rawMag) * clampedMag;
      this.movementOutput.moveZ = (rawZ / rawMag) * clampedMag;
      this.movementOutput.magnitude = clampedMag;
    } else {
      this.movementOutput.moveX = 0;
      this.movementOutput.moveZ = 0;
      this.movementOutput.magnitude = 0;
    }

    this.movementOutput.sprint =
      this.virtualSprintEnabled ||
      this.keysPressed.has('ShiftLeft') ||
      this.keysPressed.has('ShiftRight');

    return this.movementOutput;
  }
}
