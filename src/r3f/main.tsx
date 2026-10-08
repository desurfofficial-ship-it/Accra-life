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

/**
 * Playability patch rule 8: WebGL availability pre-flight. With WebGL
 * disabled, R3F's Canvas fails to create a context and the viewport used
 * to stay plain navy with no explanation. Detect that BEFORE mounting and
 * render a readable message into #r3f-root instead.
 */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

const container = document.getElementById('r3f-root');
if (container) {
  if (hasWebGL()) {
    const root = createRoot(container);
    root.render(<GameCanvas />);
  } else {
    // Match the viewport navy so the message reads as intentional UI.
    container.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#090d16;z-index:1;padding:24px">
        <p style="max-width:320px;margin:0;text-align:center;color:#cbd5e1;font-size:0.95rem;line-height:1.5;font-family:system-ui,-apple-system,sans-serif">
          Your browser has WebGL turned off. The 3D city can't load.
        </p>
      </div>
    `;
  }
}
