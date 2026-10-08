/**
 * Accra Life — EventScheduler (Phase 6+ follow-up: Rush Hour auto-scheduler)
 *
 * Watches the GameClock + auto-fires Rush Hour events at Accra's commute
 * hours (7 AM morning + 5 PM evening in-game). When initialized, takes
 * over from EventService's existing real-time auto-cycle (which fires
 * every 90s/45s) — instead, Rush Hour fires at in-game hour 7, holds
 * for 2 in-game hours, then returns to NORMAL. Same at 17.
 *
 * Public API:
 *   - init(): stops EventService's real-time auto-cycle + subscribes to
 *     GameClock.onHourChange. Idempotent — safe to call multiple times.
 *   - shutdown(): unsubscribes + (optionally) restarts EventService's
 *     real-time auto-cycle. Mainly for tests.
 *   - setTriggerRules(rules): override the default 7 AM + 5 PM triggers.
 *
 * Default trigger rules (Accra commute pattern):
 *   - Hour 7  → fire RUSH_HOUR, hold for 2 hours (until hour 9)
 *   - Hour 17 → fire RUSH_HOUR, hold for 2 hours (until hour 19)
 *
 * The scheduler is a thin glue layer — Rush Hour state + fare multiplier
 * logic stays in EventService. This module just decides WHEN to flip it.
 *
 * Manual triggering still works alongside (gameAPI.getCurrentEvent() /
 * EventService.setEvent() can be called directly for tests or scripted
 * story beats — but they'll be overridden on the next hour-change tick).
 *
 * Singleton exported as `eventScheduler`.
 */
import { gameClock } from '../Time/GameClock';
import { eventService, type GameEventId } from '../World/EventService';

export interface RushHourTriggerRule {
  /** Hour of the day (0-23) to fire Rush Hour at. */
  hour: number;
  /** Human-readable label for logs/debug. */
  label: string;
  /** How many in-game hours to hold RUSH_HOUR before returning to NORMAL.
   *  Default 2 (e.g. 7 AM → 9 AM). */
  holdHours?: number;
}

/** Default Accra commute-pattern triggers: 7 AM + 5 PM, hold 2 hours each. */
export const DEFAULT_RUSH_HOUR_TRIGGERS: readonly RushHourTriggerRule[] = [
  { hour: 7, label: 'Morning Rush', holdHours: 2 },
  { hour: 17, label: 'Evening Rush', holdHours: 2 },
];

class EventScheduler {
  private triggerRules: readonly RushHourTriggerRule[] = DEFAULT_RUSH_HOUR_TRIGGERS;
  private initialized = false;
  private unsubscribe: (() => void) | null = null;
  /** Hours currently in an active Rush Hour window. Set when fired,
   *  decremented each subsequent hour-change. When 0, transition to NORMAL. */
  private remainingRushHours = 0;

  /**
   * Stop EventService's real-time auto-cycle + subscribe to GameClock
   * hour changes. Idempotent — safe to call multiple times.
   */
  public init(): void {
    if (this.initialized) return;
    // Halt the existing real-time auto-cycle so it doesn't fight with
    // our GameClock-driven override.
    eventService.stop();
    this.unsubscribe = gameClock.onHourChange((newHour) => {
      this.handleHourChange(newHour);
    });
    this.initialized = true;
    // eslint-disable-next-line no-console
    console.log(
      '[EventScheduler] initialized — Rush Hour will auto-fire at in-game ' +
      'hours ' + this.triggerRules.map(r => `${r.hour} (${r.label})`).join(', ')
    );
  }

  /** Tear down the subscription (mainly for tests). */
  public shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.initialized = false;
    this.remainingRushHours = 0;
    // Restore NORMAL on shutdown so we don't leave Rush Hour hanging.
    eventService.setEvent('NORMAL');
  }

  /** Returns the current list of trigger rules. */
  public getTriggerRules(): readonly RushHourTriggerRule[] {
    return this.triggerRules;
  }

  /**
   * Returns the next trigger rule that will fire, given the current in-game
   * hour. Wraps at midnight (returns the first trigger of the next day if
   * we're past all of today's triggers). Returns null if no rules configured.
   *
   * Used by ClockHud to show "Next rush at HH:00 (in N min)" — gives the
   * player a planning aid so they know when Rush Hour is coming.
   */
  public getNextTriggerHour(currentHour: number): RushHourTriggerRule | null {
    if (this.triggerRules.length === 0) return null;
    // Find the next trigger at or AFTER currentHour.
    for (const rule of this.triggerRules) {
      if (rule.hour >= currentHour) return rule;
    }
    // Wrap — all today's triggers are past. Return the first trigger
    // (next day). Caller can compute the wrap-around countdown.
    return this.triggerRules[0];
  }

  /** Override the default trigger rules (e.g. for tests or admin config). */
  public setTriggerRules(rules: readonly RushHourTriggerRule[]): void {
    this.triggerRules = rules;
  }

  /**
   * Internal: fired by GameClock.onHourChange when the in-game hour
   * increments. Checks if the new hour matches any trigger rule; if so,
   * fires Rush Hour via eventService.setEvent() + sets the remaining
   * hold counter. Otherwise decrements the counter + returns to NORMAL
   * when it hits 0.
   */
  private handleHourChange(newHour: number): void {
    // Check if this hour is a trigger.
    const rule = this.triggerRules.find((r) => r.hour === newHour);
    if (rule) {
      // Fire Rush Hour + set the hold counter.
      this.remainingRushHours = rule.holdHours ?? 2;
      this.fireRushHour(rule.label);
      return;
    }
    // Not a trigger hour — if we're in a Rush Hour window, decrement + maybe end.
    if (this.remainingRushHours > 0) {
      this.remainingRushHours -= 1;
      if (this.remainingRushHours === 0) {
        // Hold window expired — return to NORMAL.
        this.endRushHour();
      }
    }
  }

  private fireRushHour(label: string): void {
    const prevEvent: GameEventId = eventService.getCurrentEvent();
    eventService.setEvent('RUSH_HOUR');
    // eslint-disable-next-line no-console
    console.log(
      `[EventScheduler] auto-fired RUSH_HOUR at in-game hour ${gameClock.getHour()}` +
      ` (${label}) — holds for ${this.remainingRushHours} in-game hours.` +
      (prevEvent === 'RUSH_HOUR' ? ' (was already RUSH_HOUR)' : '')
    );
  }

  private endRushHour(): void {
    const prevEvent: GameEventId = eventService.getCurrentEvent();
    eventService.setEvent('NORMAL');
    if (prevEvent !== 'NORMAL') {
      // eslint-disable-next-line no-console
      console.log(
        `[EventScheduler] Rush Hour window expired at in-game hour ${gameClock.getHour()} — returning to NORMAL.`
      );
    }
  }
}

/** Singleton — the only EventScheduler in the app. */
export const eventScheduler = new EventScheduler();
