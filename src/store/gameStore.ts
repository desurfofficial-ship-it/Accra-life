/**
 * One game store — position, wallet, needs, job, home, time.
 * The 3D world and the HUD both read from here. No window bridges.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GameState {
  player: {
    position: Vec3;
    yaw: number;
  };
  wallet: { balanceGHS: number };
  needs: { hunger: number; energy: number };
  job: { activeId: string | null; step: number };
  home: { tierId: string };
  time: { hour: number };
}

type Listener = () => void;

const state: GameState = {
  player: { position: { x: 0, y: 0, z: 0 }, yaw: 0 },
  wallet: { balanceGHS: 20 },
  needs: { hunger: 80, energy: 80 },
  job: { activeId: null, step: 0 },
  home: { tierId: 'single_room' },
  time: { hour: 7 },
};

const listeners = new Set<Listener>();

export function getState(): Readonly<GameState> {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function setPlayerPosition(x: number, y: number, z: number): void {
  state.player.position.x = x;
  state.player.position.y = y;
  state.player.position.z = z;
  notify();
}

export function setPlayerYaw(yaw: number): void {
  state.player.yaw = yaw;
  notify();
}

/** Joystick / keyboard input written each frame by the input layer. */
export const movementInput = { x: 0, z: 0, sprint: false };
