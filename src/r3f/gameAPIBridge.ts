/**
 * gameAPIBridge.ts — safe window.GameAPI accessor for the R3F custom map.
 *
 * The real game systems boot in src/main.ts AFTER onboarding completes and
 * expose the bridge on window.GameAPI (skills/tro-tro-system.md [ROUTING]).
 * The custom map renders from first paint, so every R3F consumer must
 * tolerate the bridge being absent (pre-onboarding demo mode) and poll for
 * it lazily. Type-only import — the R3F layer never imports game internals
 * at runtime except the pure World/GridMap module.
 */

import type { GameAPI } from '../game/GameAPI';

/**
 * DOM event that routes the [E] key press at the tro-tro stop from the
 * systems layer into the R3F boarding panel. Fired by main.ts's
 * handleWorldTargetInteracted('trotro_stop') — the InteractionSystem path —
 * and handled by src/r3f/TroTroBoarding.tsx, which starts the Mate sequence.
 */
export const TROTRO_BOARD_EVENT = 'lagos-life:trotro-board';

export function getGameAPI(): GameAPI | null {
  return (window as unknown as { GameAPI?: GameAPI }).GameAPI ?? null;
}
