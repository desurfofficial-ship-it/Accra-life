/**
 * main.tsx — Phase-1 R3F Bridge entry point
 *
 * Mounts the GameCanvas into a div with id="r3f-root". The div is
 * positioned inside the existing viewport container (#viewportContainer)
 * so the R3F Canvas renders BEHIND the existing DOM HUD elements.
 *
 * The HUD stays fixed (it's in a separate DOM layer above the Canvas).
 * The 3D plane can be rotated via OrbitControls (drag to orbit).
 *
 * This is the bridge — it proves the R3F Canvas can coexist with the
 * existing DOM-based HUD + game systems. The full migration would move
 * Phase1Scene.ts, PlayerController, etc. into R3F components, but that's
 * a future phase.
 */

import { createRoot } from 'react-dom/client';
import { GameCanvas } from './GameCanvas';
import { bootstrapDebugOverlay } from '../debug/DebugOverlay';

// Boot the DebugOverlay (?debug=1) + strip backdrop-filter on mobile.
// Safe to call at module load — it checks IS_MOBILE + DEBUG_ENABLED
// internally and no-ops when neither applies.
bootstrapDebugOverlay();

const container = document.getElementById('r3f-root');
if (container) {
  const root = createRoot(container);
  root.render(<GameCanvas />);
}
