/**
 * Accra Life — ClockHud (Phase 6+ polish: persistent in-game clock)
 *
 * Small fixed-position top-right HUD chip showing:
 *   - In-game time (HH:MM) — large
 *   - Day-phase icon + label (🌙 Night / 🌅 Dawn / ☀️ Morning / 🌞 Midday
 *     / 🌤️ Afternoon / 🌇 Dusk / 🌙 Evening)
 *   - Current event badge (NORMAL / RUSH_HOUR) — green / orange-red
 *   - Next Rush Hour countdown — "Next rush at 17:00 (in 4 min)"
 *
 * Subscribes to:
 *   - gameClock via a 1s setInterval tick (GameClock has no onUpdate for
 *     time-tick, only hour-change). Local 1s refresh keeps the time + next-
 *     rush countdown ticking continuously.
 *   - eventService.onEventChange for the current event badge.
 *   - eventScheduler.getNextTriggerHour() for the next-rush countdown.
 *
 * Mounting: rendered as a sibling to <TroTroPrompt /> + <EventBanner /> in
 * StreetCanvas's JSX fragment. position: fixed top-right with inline CSS
 * (no separate CSS file) — matches the existing UI-overlay pattern.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { gameClock, type DayPhase } from '../game/Time/GameClock';
import { eventService, type GameEventId } from '../game/World/EventService';
import { eventScheduler } from '../game/Events/EventScheduler';

const DAY_PHASE_ICON: Record<DayPhase, string> = {
  night: '🌙',
  dawn: '🌅',
  morning: '☀️',
  midday: '🌞',
  afternoon: '🌤️',
  dusk: '🌇',
  evening: '🌆',
};

const DAY_PHASE_LABEL: Record<DayPhase, string> = {
  night: 'Night',
  dawn: 'Dawn',
  morning: 'Morning',
  midday: 'Midday',
  afternoon: 'Afternoon',
  dusk: 'Dusk',
  evening: 'Evening',
};

const STYLES = {
  chip: {
    position: 'fixed' as const,
    top: '14px',
    right: '14px',
    zIndex: 9000,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
    padding: '10px 14px',
    background: 'rgba(9, 13, 22, 0.85)',
    border: '1.5px solid rgba(250, 204, 21, 0.4)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontFamily: "'Outfit', system-ui, sans-serif",
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'none' as const,
    minWidth: '160px',
  } as CSSProperties,
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as CSSProperties,
  phaseIcon: {
    fontSize: '1.4em',
    lineHeight: 1,
  } as CSSProperties,
  timeText: {
    fontSize: '1.4em',
    fontWeight: 800,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.05em',
  } as CSSProperties,
  phaseLabel: {
    fontSize: '0.7em',
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    fontWeight: 600,
  } as CSSProperties,
  eventBadge: {
    fontSize: '0.65em',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    padding: '2px 8px',
    borderRadius: '4px',
    letterSpacing: '0.08em',
    marginTop: '2px',
  } as CSSProperties,
  eventNormal: {
    background: 'rgba(74, 222, 128, 0.2)',
    color: '#4ade80',
    border: '1px solid rgba(74, 222, 128, 0.4)',
  } as CSSProperties,
  eventRush: {
    background: 'rgba(234, 88, 12, 0.25)',
    color: '#fb923c',
    border: '1px solid rgba(234, 88, 12, 0.5)',
  } as CSSProperties,
  nextRush: {
    fontSize: '0.65em',
    color: '#94a3b8',
    marginTop: '2px',
    fontFamily: "'JetBrains Mono', monospace",
  } as CSSProperties,
};

export function ClockHud() {
  const [timeStr, setTimeStr] = useState<string>(gameClock.getFormattedTime());
  const [phase, setPhase] = useState<DayPhase>(gameClock.getDayPhase());
  const [event, setEvent] = useState<GameEventId>(eventService.getCurrentEvent());
  const [nextRushLabel, setNextRushLabel] = useState<string>('');

  // 1s tick — refresh the time + day phase + next-rush countdown every second.
  // GameClock has no onUpdate for time-tick (only hour-change), so we poll.
  useEffect(() => {
    const updateClock = () => {
      setTimeStr(gameClock.getFormattedTime());
      setPhase(gameClock.getDayPhase());

      // Compute the next-rush countdown.
      const currentHour = gameClock.getHour();
      const currentMinute = gameClock.getMinute();
      const nextRule = eventScheduler.getNextTriggerHour(currentHour);
      if (nextRule) {
        // Compute minutes remaining until nextRule.hour:00.
        let minutesRemaining: number;
        if (nextRule.hour >= currentHour) {
          // Today's trigger — same-day countdown.
          minutesRemaining = (nextRule.hour - currentHour) * 60 - currentMinute;
        } else {
          // Wrapped — next-day trigger. 24 hours forward + the trigger's hour.
          minutesRemaining = (24 - currentHour + nextRule.hour) * 60 - currentMinute;
        }
        if (minutesRemaining < 0) minutesRemaining = 0;
        const hh = nextRule.hour.toString().padStart(2, '0');
        const mins = Math.ceil(minutesRemaining);
        setNextRushLabel(`Next rush ${hh}:00 · ${mins}m`);
      } else {
        setNextRushLabel('');
      }
    };

    updateClock(); // initial paint
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Subscribe to event state changes for the badge.
  useEffect(() => {
    const unsubscribe = eventService.onEventChange((newEvent) => {
      setEvent(newEvent);
    });
    return unsubscribe;
  }, []);

  const isRush = event === 'RUSH_HOUR';

  return (
    <div style={STYLES.chip}>
      <div style={STYLES.timeRow}>
        <span style={STYLES.phaseIcon}>{DAY_PHASE_ICON[phase]}</span>
        <span style={STYLES.timeText}>{timeStr}</span>
      </div>
      <div style={STYLES.phaseLabel}>{DAY_PHASE_LABEL[phase]}</div>
      <div style={{ ...STYLES.eventBadge, ...(isRush ? STYLES.eventRush : STYLES.eventNormal) }}>
        {isRush ? '⚠ RUSH HOUR' : 'NORMAL'}
      </div>
      {!isRush && nextRushLabel && (
        <div style={STYLES.nextRush}>{nextRushLabel}</div>
      )}
    </div>
  );
}
