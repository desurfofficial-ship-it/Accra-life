/**
 * Accra Life — Live Events system
 *
 * Data-driven events that modify game behavior on a schedule. Designed so
 * new events can be added by appending to the LIVE_EVENTS array — no
 * engine changes needed.
 *
 * Events are time-based (day-of-week + hour range) and provide named
 * modifiers that other systems query via `getModifier(key, default)`.
 *
 * Sample events shipped in this slice (all distinctly Accra-flavored):
 *   - Dumsor:           every day 18:00-22:00, funDecayMultiplier=1.5
 *                       (no music, no AC — joy drains faster)
 *   - Friday Trotro Surge: Fridays 17:00-21:00, fareMultiplier=1.5
 *                       (rush-hour fare hike, like real Accra trotros)
 *   - Saturday Makola Market Day: Saturdays 8:00-18:00, foodCostMultiplier=0.8
 *                       (fresh produce in season — waakye is cheaper)
 *
 * Future events can be added by pushing to LIVE_EVENTS. Eventual migration
 * to Firestore collection `/events` is straightforward — the public API
 * (getActiveEvents, getModifier) stays the same.
 *
 * Design notes:
 *   - The schedule uses dayOfWeek (0=Sun..6=Sat) and hour-of-day (0-23).
 *     This is intentionally coarse-grained — fine for MVP. Finer-grained
 *     scheduling (e.g., specific minutes, recurring patterns) is a
 *     follow-up.
 *   - Modifiers multiply the BASE value, so 1.0 = no change. Multiple
 *     active events compound multiplicatively (e.g., dumsor + market day
 *     both active = foodCost × 1.0 × 0.8 = 0.8).
 *   - The class is a singleton — one instance per session. Main.ts polls
 *     getActiveEvents() once per minute (or on-demand when an action
 *     needs a modifier).
 */

export type EventType =
  | 'dumsor'
  | 'fare_surge'
  | 'market_day'
  | 'festival'
  | 'policy';

export interface EventSchedule {
  /** 0 = Sunday, 1 = Monday, ..., 6 = Saturday. -1 = every day. */
  dayOfWeek: number;
  /** Hour of day (0-23) when the event becomes active. */
  startHour: number;
  /** Hour of day (0-23) when the event ends (exclusive). */
  endHour: number;
}

export interface LiveEvent {
  id: string;
  type: EventType;
  name: string;
  description: string;
  schedule: EventSchedule;
  /** Named modifiers consumed by other systems. Multiplied together. */
  modifiers: Record<string, number>;
  /** Emoji icon for the HUD pill. */
  icon: string;
}

/** All known events. Add new ones here — no other code changes needed. */
export const LIVE_EVENTS: readonly LiveEvent[] = [
  {
    id: 'dumsor',
    type: 'dumsor',
    name: 'Dumsor',
    description: 'Power cut across the neighborhood. No music, no AC. Fun drains faster.',
    schedule: { dayOfWeek: -1, startHour: 18, endHour: 22 },
    modifiers: { funDecayMultiplier: 1.5 },
    icon: '⚡'
  },
  {
    id: 'friday_trotro_surge',
    type: 'fare_surge',
    name: 'Friday Trotro Surge',
    description: 'Rush-hour fare hike on the Osu–Circle route. Mate is collecting 1.5× the usual.',
    schedule: { dayOfWeek: 5, startHour: 17, endHour: 21 },
    modifiers: { fareMultiplier: 1.5 },
    icon: '🚐'
  },
  {
    id: 'saturday_makola_market_day',
    type: 'market_day',
    name: 'Saturday Makola Market Day',
    description: 'Fresh produce in season at Makola. Waakye bundles are 20% cheaper.',
    schedule: { dayOfWeek: 6, startHour: 8, endHour: 18 },
    modifiers: { foodCostMultiplier: 0.8 },
    icon: '🥬'
  }
] as const;

/**
 * Live-events manager. The class is intentionally stateless — it just
 * answers questions about the current time. Main.ts polls once per minute
 * to update the HUD pill; action handlers call getModifier() on-demand.
 */
export class LiveEvents {
  /**
   * Returns all events active at the given time. Defaults to `new Date()`
   * if no time is supplied (useful for tests).
   */
  public getActiveEvents(now: Date = new Date()): LiveEvent[] {
    const day = now.getDay();
    const hour = now.getHours();
    return LIVE_EVENTS.filter((e) => {
      const s = e.schedule;
      const dayMatch = s.dayOfWeek === -1 || s.dayOfWeek === day;
      // Handle wrap-around midnight (e.g., 22:00-2:00). For MVP we don't
      // have any wrap-around events, but support it for future-proofing.
      const hourMatch = s.startHour <= s.endHour
        ? (hour >= s.startHour && hour < s.endHour)
        : (hour >= s.startHour || hour < s.endHour);
      return dayMatch && hourMatch;
    });
  }

  /**
   * Returns the compounded multiplier for the given key.
   *
   * Multipliers from multiple active events multiply together, so if both
   * `dumsor` (funDecayMultiplier=1.5) and a hypothetical `festival`
   * (funDecayMultiplier=0.8 — parties during festivals) are active,
   * the result is 1.5 × 0.8 = 1.2.
   *
   * If no active event sets the key, returns `defaultValue`.
   */
  public getModifier(key: string, defaultValue: number, now: Date = new Date()): number {
    let result = defaultValue;
    for (const ev of this.getActiveEvents(now)) {
      const m = ev.modifiers[key];
      if (typeof m === 'number') {
        result *= m;
      }
    }
    return result;
  }

  /**
   * Convenience: returns the active events as a styled string
   * (e.g., "⚡ Dumsor · 🥬 Saturday Makola Market Day") for HUD display.
   * Returns empty string when no events are active.
   */
  public getActiveEventsLabel(now: Date = new Date()): string {
    const active = this.getActiveEvents(now);
    if (active.length === 0) return '';
    return active.map((e) => `${e.icon} ${e.name}`).join(' · ');
  }
}

/** Module-scope singleton — one LiveEvents instance per session. */
export const liveEvents = new LiveEvents();
