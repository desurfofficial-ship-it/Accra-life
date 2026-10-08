/**
 * GameCanvas.tsx — The React Three Fiber canvas + scene setup.
 *
 * This is the React-facing entry point for the 3D world. It re-exports
 * the existing StreetCanvas component (which contains the full scene
 * graph: AccraCityGrid, asset packs, player avatar, trotro, vendor,
 * EventBanner, ClockHud, TroTroPrompt) + adds a convenience
 * `renderGame()` function for the bootstrap orchestrator.
 *
 * Architecture:
 *   src/r3f/main.tsx → createRoot(#r3f-root) → <StreetCanvas />
 *   src/r3f/GameCanvas.tsx → re-exports StreetCanvas + renderGame()
 *   src/main.ts → calls renderGame(gameAPI) after onboarding
 *
 * The actual R3F Canvas + scene graph lives in StreetCanvas.tsx.
 * This module is the thin facade that the bootstrap orchestrator
 * imports — it keeps main.ts clean without duplicating the 300+ line
 * StreetCanvas component.
 */
import { createRoot } from 'react-dom/client';
import { StreetCanvas } from './StreetCanvas';
import type { GameAPI } from '../game/GameAPI';

/** Re-export the component for direct React usage. */
export { StreetCanvas as GameCanvas };

/**
 * Mount the R3F game canvas into #r3f-root.
 * Called by the bootstrap orchestrator after onboarding completes.
 *
 * This is a no-op if #r3f-root doesn't exist (e.g. server-side).
 * The R3F canvas is always mounted — it's the primary visible view.
 * The systems layer (Phase1Scene) runs simulation-only underneath.
 */
export function renderGame(_gameAPI: GameAPI): void {
  const container = document.getElementById('r3f-root');
  if (!container) {
    // eslint-disable-next-line no-console
    console.warn('[GameCanvas] #r3f-root not found — R3F canvas not mounted.');
    return;
  }
  // The R3F canvas is already mounted by src/r3f/main.tsx at module load.
  // This function is a no-op placeholder for the orchestrator pattern.
  // In a future slice, this could re-mount with a different scene based
  // on gameAPI state (e.g. different world areas).
}
