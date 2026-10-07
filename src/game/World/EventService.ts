/**
 * Accra Life — EventService: the shared daily-event state machine
 *
 * THE single source of truth for world events (v4.9 rush-hour spec,
 * skills/tro-tro-system.md [CONTRACT] gameAPI.getCurrentEvent()):
 *   - NORMAL     — the relaxed default: base fares, slow van rhythm
 *   - RUSH_HOUR  — the chaos window: fares surge ×1.5 (₵5 → ₵7.5 on the
 *                  Osu–Circle corridor), the van cycles ~40% faster and
 *                  the Mate barks rush-hour lines
 *
 * Exported as the `eventService` singleton (the same pattern as the
 * MATE_LINES constant) so BOTH layers that own a TrotroService — the
 * systems layer (src/main.ts) and the visible map (StreetCanvas →
 * LivingTrotro) — read one shared event state with zero wiring drift.
 *
 * Consumers:
 *   - src/game/GameAPI.ts routes getCurrentEvent() / getFareDue() here
 *   - src/game/World/TrotroService.ts scales its cycle timings and fare
 *   - src/r3f/LivingTrotro.tsx + TroTroBoarding.tsx switch Mate dialogue
 *
 * Timing (deliberately gameplay-paced, not real Accra clock hours):
 *   NORMAL holds ~90 s, RUSH_HOUR burns ~45 s, forever. start() arms the
 *   loop (idempotent); pre-boot the event is deterministically NORMAL.
 */

export type GameEventId = 'NORMAL' | 'RUSH_HOUR';

/** Fare surge multiplier during RUSH_HOUR — ₵5 base ⇒ ₵7.5 due. */
export const RUSH_HOUR_FARE_MULTIPLIER = 1.5;

/** Van-cycle + boarding speed factor during RUSH_HOUR (40% faster). */
export const RUSH_HOUR_SPEED_FACTOR = 0.6;

/** Speed factor in NORMAL — timings run at spec pace (v4.7 numbers). */
export const NORMAL_SPEED_FACTOR = 1.0;

const NORMAL_DURATION_MS = 90_000;   // 90 s of calm between rush windows
const RUSH_HOUR_DURATION_MS = 45_000; // 45 s of chaos

export interface GameEventSnapshot {
  readonly event: GameEventId;
  readonly fareMultiplier: number;
  readonly speedFactor: number;
}

export type GameEventListener = (event: GameEventId) => void;

export class EventService {
  private event: GameEventId = 'NORMAL';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<GameEventListener>();

  /** Current world event — the [CONTRACT] method routes here. */
  public getCurrentEvent(): GameEventId {
    return this.event;
  }

  /** Fare surge multiplier for the live event (1.0 | 1.5). */
  public getFareMultiplier(): number {
    return this.event === 'RUSH_HOUR' ? RUSH_HOUR_FARE_MULTIPLIER : 1.0;
  }

  /** Van-cycle / boarding speed factor for the live event (1.0 | 0.6). */
  public getSpeedFactor(): number {
    return this.event === 'RUSH_HOUR' ? RUSH_HOUR_SPEED_FACTOR : NORMAL_SPEED_FACTOR;
  }

  public isRushHour(): boolean {
    return this.event === 'RUSH_HOUR';
  }

  public getSnapshot(): GameEventSnapshot {
    return {
      event: this.event,
      fareMultiplier: this.getFareMultiplier(),
      speedFactor: this.getSpeedFactor(),
    };
  }

  public onEventChange(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Force an event (for testing or scripted days). Rearms the auto-cycle. */
  public setEvent(event: GameEventId): void {
    if (event === this.event) return;
    this.transitionTo(event);
  }

  /** Arm the auto-cycle — idempotent; call once at systems boot. */
  public start(): void {
    if (this.timer) return;
    this.scheduleNext();
  }

  /** Stop the auto-cycle and freeze the current event (tests, teardown). */
  public stop(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  private scheduleNext(): void {
    const ms = this.event === 'RUSH_HOUR' ? RUSH_HOUR_DURATION_MS : NORMAL_DURATION_MS;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.transitionTo(this.event === 'RUSH_HOUR' ? 'NORMAL' : 'RUSH_HOUR');
      this.scheduleNext();
    }, ms);
  }

  private transitionTo(event: GameEventId): void {
    this.event = event;
    for (const l of this.listeners) {
      try { l(event); } catch { /* listener errors shouldn't crash */ }
    }
  }
}

/** Shared singleton — both game layers and the GameAPI bridge read this. */
export const eventService = new EventService();
