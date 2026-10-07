/**
 * Accra Life — EventBanner (Phase 6+ follow-up: Rush Hour alert)
 *
 * GTA-style top-of-screen banner that slides down when Rush Hour is
 * active. Subscribes to eventService.onEventChange — when the event
 * becomes 'RUSH_HOUR', the banner slides down from the top with
 *   "⚠️ RUSH HOUR · Trotro Fares Surged +50% · Traffic Heavy"
 * in orange/red, plus a live mm:ss countdown of the remaining hold
 * window. When state transitions back to NORMAL, the banner slides
 * back up (off-screen above the viewport).
 *
 * The countdown is approximate — it uses the EventScheduler's hold
 * window (default 2 in-game hours = 2 minutes of real time at 60×
 * time scale). Read directly from gameClock for the live countdown.
 *
 * Mounting: rendered as a sibling to TroTroPrompt inside StreetCanvas
 * (matches the existing UI-overlay pattern). Uses inline CSS styles
 * (no separate CSS file) + position:fixed so it overlays the Canvas.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { eventService, type GameEventId } from '../game/World/EventService';
import { gameClock } from '../game/Time/GameClock';

interface EventBannerState {
  event: GameEventId;
}

const BANNER_STYLES = {
  banner: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '14px 22px',
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 800,
    color: '#fff',
    background: 'linear-gradient(180deg, #b91c1c 0%, #ea580c 100%)',
    borderBottom: '3px solid rgba(0, 0, 0, 0.35)',
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.4)',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
    transform: 'translateY(-110%)',
    transition: 'transform 240ms cubic-bezier(0.2, 0.9, 0.3, 1)',
    pointerEvents: 'none' as const,
  } as CSSProperties,
  bannerVisible: {
    transform: 'translateY(0)',
  } as CSSProperties,
  icon: {
    fontSize: '1.6em',
    lineHeight: 1,
  } as CSSProperties,
  text: {
    fontSize: 'clamp(13px, 2.4vw, 18px)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
  } as CSSProperties,
  separator: {
    opacity: 0.6,
    margin: '0 6px',
  } as CSSProperties,
  clock: {
    fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(0, 0, 0, 0.35)',
    padding: '3px 9px',
    borderRadius: '4px',
    fontSize: '0.85em',
    marginLeft: '6px',
  } as CSSProperties,
};

export function EventBanner() {
  const [state, setState] = useState<EventBannerState>({
    event: eventService.getCurrentEvent(),
  });
  const [inGameTime, setInGameTime] = useState<string>(gameClock.getFormattedTime());

  // Subscribe to eventService state transitions.
  useEffect(() => {
    const unsubscribe = eventService.onEventChange((newEvent: GameEventId) => {
      setState({ event: newEvent });
    });
    return unsubscribe;
  }, []);

  // Local 1s tick: refresh the in-game time display so the clock chip
  // updates continuously while Rush Hour is active.
  useEffect(() => {
    if (state.event !== 'RUSH_HOUR') return;
    const interval = window.setInterval(() => {
      setInGameTime(gameClock.getFormattedTime());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.event]);

  const visible = state.event === 'RUSH_HOUR';

  return (
    <div
      style={{
        ...BANNER_STYLES.banner,
        ...(visible ? BANNER_STYLES.bannerVisible : {}),
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span style={BANNER_STYLES.icon}>⚠️</span>
      <span style={BANNER_STYLES.text}>
        RUSH HOUR
        <span style={BANNER_STYLES.separator}>·</span>
        Trotro Fares Surged +50%
        <span style={BANNER_STYLES.separator}>·</span>
        Traffic Heavy
      </span>
      {visible && (
        <span style={BANNER_STYLES.clock}>{inGameTime}</span>
      )}
    </div>
  );
}
