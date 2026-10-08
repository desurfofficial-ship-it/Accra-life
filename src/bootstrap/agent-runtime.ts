

import { liveEventPillEl, liveEventTextEl } from '../ui/dom-refs';
import { S } from './state';
import { economyManager, trotroService, vendorService } from './services';
import { showInteractionFeedback } from '../ui/HUD';
import { Phase1Scene } from '../game/Core/Phase1Scene';
import { createGameAPI, GameAPI } from '../game/GameAPI';
import { TrotroService } from '../game/World/TrotroService';
import { eventService } from '../game/World/EventService';
import { eventScheduler } from '../game/Events/EventScheduler';
import { gameClock } from '../game/Time/GameClock';
import { LiveEventsSystem, type ActiveLiveEventState } from '../game/Events/LiveEventsSystem';

/**
 * Agent runtime (Task 18 modular refactor).
 *
 * Owns everything the AI-agent skill layer + devtools touch:
 *  - window.GameAPI (createGameAPI wiring over the owning systems)
 *  - debug handles: __phase1Scene, __eventService, __gameClock, __eventScheduler
 *  - EventScheduler takeover + GameClock dawn start
 *  - LiveEventsSystem pill cycle incl. the v4.11 Rush Hour banner/pill dedup
 */

let rendererWired = false;

/** Wire GameAPI + debug handles. Called once from startGame(). */
export function initAgentRuntime(phase1: Phase1Scene): void {
// GameAPI bridge — live wiring for the AI-agent skill layer
// (skills/tro-tro-system.md [ROUTING]): every AI-facing call below
// routes 1:1 into the owning system. Exposed on window so the agent
// host (and devtools) can drive the game without touching internals.
S.gameAPI = createGameAPI({
  economy: economyManager,
  player: phase1.player,
  input: phase1.inputManager,
  interactions: phase1.interactionSystem,
  trotro: trotroService,
  vendor: vendorService
});
(window as unknown as { GameAPI?: GameAPI }).GameAPI = S.gameAPI;
// v4.9: arm the shared world-event cycle (NORMAL ↔ RUSH_HOUR) — both
// TrotroService layers and the GameAPI bridge read the same singleton.
// Phase 6+ follow-up: instead of EventService's real-time 90s/45s
// auto-cycle, hand control to EventScheduler which fires Rush Hour at
// in-game hours 7 (morning) + 17 (evening) — matches Accra's real
// commute pattern. EventScheduler.init() calls eventService.stop()
// then subscribes to GameClock hour changes + takes over.
eventScheduler.init();
// Start the GameClock at in-game hour 6 (dawn) so the first morning
// rush fires ~1 min after game start (1 real sec = 1 in-game min at
// default 60× scale → 24-min real day → 7 AM fires at in-game hour 7
// = 1 real min after game start).
gameClock.setHour(6);
// Debug handle (mirrors __phase1Scene): lets devtools / QA force the
// event via __eventService.setEvent('RUSH_HOUR').
(window as unknown as { __eventService?: typeof eventService }).__eventService = eventService;
// Phase 6+ follow-up: expose GameClock + EventScheduler on window for
// dev console / AI / future admin panel access.
(window as unknown as { __gameClock?: typeof gameClock }).__gameClock = gameClock;
(window as unknown as { __eventScheduler?: typeof eventScheduler }).__eventScheduler = eventScheduler;
// Custom map: the R3F canvas owns the visible view — keep this scene
// SIMULATING (movement, interactions, NPC rigs) but skip its renderer
// to save GPU. Falls back to rendering if the R3F root is missing.
if (document.getElementById('r3f-root')) {
  phase1.renderEnabled = false;
}
// Dev/debug handle — mirrors the window.__r3fScene/__r3fCamera pattern.
(window as unknown as { __phase1Scene?: Phase1Scene }).__phase1Scene = phase1;
}

/** Create the LiveEventsSystem pill cycle + Rush Hour dedup wiring. */
export function initLiveEventsPill(): void {
// ── Accra Live Events: cycle world events + drive the HUD pill ─────────
// tick() runs inside the RAF loop below (cheap Date.now check); the
// onUpdate listener updates the pill + toasts new events.
S.liveEvents = new LiveEventsSystem();
S.liveEvents.onUpdate((state) => updateLiveEventPill(state));
// Rush Hour dedup (v4.11): the world-level RUSH_HOUR (EventService —
// trotro fare surge + the top EventBanner) and the live-event pill's
// 'trotro_rush_hour' (job-pay boost) are different systems, but both
// say "Rush Hour" — showing both at once reads as a duplicate. While
// the world event is active the pill cycle skips the look-alike, and
// if it is mid-display when the world event fires we advance
// immediately to the next neighborhood event.
S.liveEvents.setBlockPredicate(
  (ev) => ev.id === 'trotro_rush_hour' && eventService.getCurrentEvent() === 'RUSH_HOUR'
);
eventService.onEventChange((evt) => {
  if (
    evt === 'RUSH_HOUR' &&
    S.liveEvents &&
    S.liveEvents.getActiveEvent().event.id === 'trotro_rush_hour'
  ) {
    S.liveEvents.triggerNextEvent();
  }
});
liveEventPillEl?.addEventListener('click', () => {
  const ev = S.liveEvents?.getActiveEvent();
  if (ev) {
    showInteractionFeedback(`${ev.event.icon} ${ev.event.title} · ${ev.event.description}`);
  }
});

}

export function updateLiveEventPill(state: ActiveLiveEventState): void {
  const secs = Math.max(0, Math.round(state.remainingSeconds));
  if (state.event.id === S.lastLiveEventId && secs === S.lastLiveEventShownSeconds) return;
  const isNewEvent = state.event.id !== S.lastLiveEventId;
  S.lastLiveEventId = state.event.id;
  S.lastLiveEventShownSeconds = secs;
  if (liveEventTextEl) {
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, '0');
    liveEventTextEl.textContent = `${state.event.icon} ${state.event.shortBanner} · ${mm}:${ss}`;
  }
  liveEventPillEl?.setAttribute(
    'title',
    `${state.event.title} — ${state.event.description} (${state.event.effectSummary})`
  );
  if (isNewEvent) {
    showInteractionFeedback(`${state.event.icon} ${state.event.title} — ${state.event.effectSummary}`);
  }
}

/**
 * Debounced housing → Firestore sync. Fires 4s after the last home change
 * (buy / place / sell / upgrade) so rapid furniture shuffles coalesce into
 * one write. Guests are localStorage-only and skip this entirely.
 */
