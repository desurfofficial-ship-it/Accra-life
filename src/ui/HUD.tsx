/**
 * HUD.tsx — Consolidated UI overlay components.
 *
 * Wraps the existing React UI overlays into a single <HUD /> component
 * that StreetCanvas mounts alongside the R3F <Canvas>. Each sub-
 * component subscribes to its own state singleton internally — no
 * prop drilling needed.
 *
 * Components:
 *   - <EventBanner /> — GTA-style Rush Hour alert (slides down from top)
 *   - <ClockHud /> — Persistent in-game time + day phase + next-rush
 *   - <TroTroPrompt /> — GTA-style [E] Board Tro-tro interaction prompt
 *
 * Future components (TODO: extract from main.ts inline DOM code):
 *   - <WalletHud /> — Cash balance display + floating delta
 *   - <NeedsHud /> — Hunger + energy bars
 *   - <LocationPill /> — Current location + nearby strip
 *   - <LiveEventPill /> — Active live event pill
 *   - <ObjectiveBanner /> — Active objective display
 *
 * Usage:
 *   <HUD fare={5} playerBalance={100} promptVisible={true} />
 */
import { type CSSProperties } from 'react';
import { EventBanner } from './EventBanner';
import { ClockHud } from './ClockHud';
import { TroTroPrompt } from './TroTroPrompt';

export interface HUDProps {
  /** Tro-tro fare for the prompt (GHS). */
  fare?: number;
  /** Player cash balance for the prompt (GHS). */
  playerBalance?: number;
  /** Whether the tro-tro prompt is visible. */
  promptVisible?: boolean;
}

/**
 * <HUD /> — all React-based UI overlays in one component.
 * Mounted by StreetCanvas as a sibling to the R3F <Canvas>.
 */
export function HUD({
  fare = 5,
  playerBalance = 0,
  promptVisible = true,
}: HUDProps) {
  return (
    <>
      <EventBanner />
      <ClockHud />
      <TroTroPrompt
        fare={fare}
        playerBalance={playerBalance}
        visible={promptVisible}
      />
    </>
  );
}
