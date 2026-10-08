/**
 * GameLoop.ts — The main game loop extracted from startGame()'s RAF closure.
 *
 * This is the systems-layer game loop — it advances every game system by
 * one frame. The AgentRuntime in bootstrap/agent-runtime.ts wraps this
 * with RAF scheduling + HUD refresh callbacks.
 *
 * The R3F canvas has its own internal useFrame loop (via @react-three/fiber)
 * — that drives the 3D rendering. This GameLoop drives the SIMULATION:
 *   - Crime heat decay
 *   - Needs tick (hunger, energy with housing modifiers)
 *   - Live events cycle
 *   - EventManager tick (Rush Hour expiry)
 *   - GameClock tick (in-game time advance)
 *   - Nearby avatar interpolation
 *   - Home visuals cutaway
 *   - Player position mirror (R3F → systems layer)
 *
 * Usage:
 *   const loop = new GameLoop(ctx);
 *   loop.setCallbacks({ onHudRefresh, onPlayerMirror, ... });
 *   loop.start();
 */
import type { GameContext } from '../bootstrap/game-init';

export interface GameLoopCallbacks {
  onHudRefresh?: () => void;
  onLiveEventTick?: () => void;
  onNearbyAvatarsUpdate?: (dt: number) => void;
  onHomeVisualsUpdate?: () => void;
  onPlayerMirror?: () => void;
}

export class GameLoop {
  private ctx: GameContext;
  private callbacks: GameLoopCallbacks = {};
  private rafHandle: number | null = null;
  private lastTickMs = performance.now();
  private lastCooldownUiTickMs = 0;
  private running = false;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
  }

  setCallbacks(cb: GameLoopCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cb };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTickMs = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  private tick = (): void => {
    if (!this.running) return;
    const tickStartMs = performance.now();
    const realDeltaMs = tickStartMs - this.lastTickMs;
    this.lastTickMs = tickStartMs;

    const { crime, needs, home, gameClock } = this.ctx;

    // Crime heat decay
    crime.tickHeatDecay(1 / 60);

    // Needs tick with housing-tier fatigue reduction
    const agg = home.getAggregateGameplayEffects();
    needs.tick(1 / 60, { energy: agg.energyDecayMultiplier });

    // Live events cycle
    this.callbacks.onLiveEventTick?.();

    // GameClock tick (in-game time advance — fires Rush Hour at 7 AM + 5 PM)
    gameClock.tick(realDeltaMs);

    // Player position mirror (R3F → systems layer)
    this.callbacks.onPlayerMirror?.();

    // Nearby avatars interpolation
    this.callbacks.onNearbyAvatarsUpdate?.(1 / 60);

    // Home visuals cutaway
    this.callbacks.onHomeVisualsUpdate?.();

    // HUD refresh (throttled to 500ms)
    if (tickStartMs - this.lastCooldownUiTickMs >= 500) {
      this.lastCooldownUiTickMs = tickStartMs;
      this.callbacks.onHudRefresh?.();
    }

    this.rafHandle = requestAnimationFrame(this.tick);
  };
}
