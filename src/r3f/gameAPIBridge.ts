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

export function getGameAPI(): GameAPI | null {
  return (window as unknown as { GameAPI?: GameAPI }).GameAPI ?? null;
}
