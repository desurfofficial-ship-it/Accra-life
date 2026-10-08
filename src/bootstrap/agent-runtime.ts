/**
 * agent-runtime.ts — AI agent loop + skill execution.
 *
 * The "agent runtime" is the per-frame system update loop that drives
 * the game simulation forward. It's the spiritual equivalent of a game
 * engine's `tick()` function — it advances every system by one frame.
 *
 * Currently this lives inline inside startGame()'s RAF closure in
 * src/main.ts (lines ~1704-1735). This module provides a clean class
 * that wraps the same logic so it can be tested + reused without the
 * 2700-line main.ts.
 *
 * Systems ticked per frame:
 *   - crimeSystem.tickHeatDecay(1/60)
 *   - needsSystem.tick(1/60, { energy: agg.energyDecayMultiplier })
 *   - liveEvents?.tick()
 *   - eventManager.tick()
 *   - gameClock.tick(realDeltaMs)
 *   - nearbyAvatars?.update(1/60)
 *   - homeVisuals?.setCutawayMode(...)
 *   - HUD refresh (cooldown UI, place recovery button)
 *
 * Usage:
 *   const loop = new AgentRuntime(ctx);
 *   loop.start();
 *   // ... later
 *   loop.stop();
 */
import type { GameContext } from './game-init';
import { isPlayerInCompoundCutaway } from '../game/World/PlayerCompound';

export class AgentRuntime {
  private ctx: GameContext;
  private rafHandle: number | null = null;
  private lastTickMs = performance.now();
  private lastCooldownUiTickMs = 0;
  private running = false;

  // Callbacks that main.ts sets for HUD updates (transitional — eventually
  // the HUD will subscribe directly to system events).
  public onHudRefresh: (() => void) | null = null;
  public onLiveEventTick: (() => void) | null = null;
  public onNearbyAvatarsUpdate: ((dt: number) => void) | null = null;
  public onHomeVisualsUpdate: (() => void) | null = null;
  public onPlayerMirror: (() => void) | null = null;

  constructor(ctx: GameContext) {
    this.ctx = ctx;
  }

  /** Start the RAF loop. Idempotent — safe to call multiple times. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTickMs = performance.now();
    this.tick();
  }

  /** Stop the RAF loop. */
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
    this.onLiveEventTick?.();

    // EventManager tick (Phase 6: Rush Hour expiry check)
    this.ctx.eventService; // already ticked by EventScheduler

    // GameClock tick (Phase 6: in-game time advance)
    gameClock.tick(realDeltaMs);

    // Player position mirror (R3F → systems layer)
    this.onPlayerMirror?.();

    // Nearby avatars interpolation
    this.onNearbyAvatarsUpdate?.(1 / 60);

    // Home visuals cutaway
    this.onHomeVisualsUpdate?.();

    // HUD refresh (throttled to 500ms)
    if (tickStartMs - this.lastCooldownUiTickMs >= 500) {
      this.lastCooldownUiTickMs = tickStartMs;
      this.onHudRefresh?.();
    }

    this.rafHandle = requestAnimationFrame(this.tick);
  };
}

/**
 * Convenience: start the agent runtime for a GameContext.
 * Returns the runtime instance so callers can stop it later.
 */
export function startAgentRuntime(ctx: GameContext): AgentRuntime {
  const runtime = new AgentRuntime(ctx);
  runtime.start();
  return runtime;
}
