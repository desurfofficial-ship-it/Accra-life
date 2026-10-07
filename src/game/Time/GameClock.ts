/**
 * Accra Life — GameClock (Phase 6+ follow-up: in-game time auto-scheduler)
 *
 * Tracks in-game time at a configurable scale (default 60× — 1 real second
 * = 1 in-game minute). At default scale a full 24-hour day takes 24
 * minutes of real time, so the player will see morning (7 AM) and evening
 * (5 PM) rush hours during a typical play session without needing to wait
 * real hours. Drives the EventScheduler which fires Rush Hour at the
 * Accra commute hours (7 AM + 5 PM in-game).
 *
 * Public API:
 *   - tick(realDeltaMs): advances in-game time. Call once per RAF frame
 *     with the real elapsed milliseconds since the last tick.
 *   - getHour(): 0-23
 *   - getMinute(): 0-59
 *   - getFormattedTime(): "HH:MM" (24h)
 *   - getDayPhase(): 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'evening'
 *   - setTimeScale(scale): override default (e.g. for tests use 3600× = 1s real = 1h in-game)
 *   - setHour(hour): jump to a specific hour (used by tests + debug "skip to morning")
 *   - onHourChange(listener): fires when in-game hour increments
 *
 * The clock is a singleton (exported as `gameClock`). Time advances
 * monotonically; tick(realDeltaMs) accepts any positive value. Negative
 * or zero deltas are no-ops (no rewind).
 *
 * Used by:
 *   - src/game/Events/EventScheduler.ts: subscribes to onHourChange + auto-fires
 *     Rush Hour at in-game hour 7 + 17.
 *   - src/main.ts: tick() called in RAF loop with real delta from performance.now().
 */

export type DayPhase =
  | 'night'      // 0-5
  | 'dawn'       // 5-7
  | 'morning'    // 7-11
  | 'midday'     // 11-13
  | 'afternoon'  // 13-17
  | 'dusk'       // 17-19
  | 'evening';   // 19-24

export type HourChangeListener = (newHour: number, prevHour: number) => void;

/** Default: 1 real second = 1 in-game minute (60× speed). 24-min day. */
export const DEFAULT_TIME_SCALE = 60;

class GameClock {
  /** In-game minutes elapsed since clock start. 1 day = 1440 minutes. */
  private inGameMinutes = 0;
  /** Time scale: in-game minutes advanced per real minute of elapsed time. */
  private timeScale = DEFAULT_TIME_SCALE;
  /** Last hour we fired an hourChange listener for. -1 = never fired. */
  private lastFiredHour = -1;
  private hourChangeListeners = new Set<HourChangeListener>();

  /**
   * Advance in-game time. Call once per RAF frame.
   * @param realDeltaMs Real elapsed milliseconds since last tick.
   *
   * Math: timeScale = in-game minutes per real minute.
   *   realDeltaMs / 60000 = real minutes
   *   realDeltaMs / 60000 * timeScale = in-game minutes advanced
   *   i.e. deltaMin = realDeltaMs * timeScale / 60000
   *   With timeScale=60: 1 real sec (1000 ms) → 1 in-game min. ✓
   */
  public tick(realDeltaMs: number): void {
    if (realDeltaMs <= 0) return;
    const deltaMin = (realDeltaMs * this.timeScale) / 60000;
    this.inGameMinutes += deltaMin;

    // Wrap to keep the number bounded (1 day = 1440 minutes).
    if (this.inGameMinutes >= 1440) {
      this.inGameMinutes = this.inGameMinutes % 1440;
    }

    // Check if the hour changed since last tick.
    const currentHour = Math.floor(this.inGameMinutes / 60);
    if (this.lastFiredHour !== -1 && currentHour !== this.lastFiredHour) {
      // Could be a wrap (e.g. 23 → 0) — handle gracefully.
      const prevHour = this.lastFiredHour;
      this.lastFiredHour = currentHour;
      for (const l of this.hourChangeListeners) {
        try {
          l(currentHour, prevHour);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[GameClock] hour change listener threw:', err);
        }
      }
    } else if (this.lastFiredHour === -1) {
      // First tick — initialize lastFiredHour without firing listeners
      // (so callers don't see a spurious transition on game start).
      this.lastFiredHour = currentHour;
    }
  }

  public getHour(): number {
    return Math.floor(this.inGameMinutes / 60) % 24;
  }

  public getMinute(): number {
    return Math.floor(this.inGameMinutes) % 60;
  }

  public getFormattedTime(): string {
    const h = this.getHour().toString().padStart(2, '0');
    const m = this.getMinute().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  public getDayPhase(): DayPhase {
    const h = this.getHour();
    if (h < 5) return 'night';
    if (h < 7) return 'dawn';
    if (h < 11) return 'morning';
    if (h < 13) return 'midday';
    if (h < 17) return 'afternoon';
    if (h < 19) return 'dusk';
    return 'evening';
  }

  /** Override the time scale (for tests + debug). */
  public setTimeScale(scale: number): void {
    if (scale > 0) this.timeScale = scale;
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Jump to a specific hour (0-23). Used by tests + debug "skip to morning".
   *
   * If the new hour differs from the previously-fired hour, the hour-change
   * listeners fire immediately with (newHour, prevHour). If lastFiredHour
   * is -1 (no prior tick has run), the listeners do NOT fire — the call is
   * treated as a "set up starting state" operation, not a transition.
   */
  public setHour(hour: number): void {
    const clamped = ((hour % 24) + 24) % 24;
    const prevHour = this.lastFiredHour;
    this.inGameMinutes = clamped * 60;
    // Set lastFiredHour to the new hour so the NEXT tick that crosses a
    // boundary correctly compares against this (not -1, which would silently
    // absorb the first hour boundary after setHour).
    this.lastFiredHour = clamped;
    // If we have a previously-fired hour AND it differs from the new one,
    // fire the listener immediately so callers see the transition.
    if (prevHour !== -1 && prevHour !== clamped) {
      for (const l of this.hourChangeListeners) {
        try {
          l(clamped, prevHour);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[GameClock] hour change listener threw (in setHour):', err);
        }
      }
    }
  }

  public onHourChange(listener: HourChangeListener): () => void {
    this.hourChangeListeners.add(listener);
    return () => {
      this.hourChangeListeners.delete(listener);
    };
  }
}

/** Singleton — the only GameClock in the app. */
export const gameClock = new GameClock();
