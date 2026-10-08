/**
 * main.tsx — Phase-1 R3F Bridge entry point
 *
 * Mounts the GameCanvas into #r3f-root behind the DOM HUD.
 */

import { createRoot } from 'react-dom/client';
import { GameCanvas } from './GameCanvas';
import { bootstrapDebugOverlay } from '../debug/DebugOverlay';

// Boot the DebugOverlay (?debug=1) + strip backdrop-filter on mobile.
bootstrapDebugOverlay();

// Wire the "Reset Camera" button to call the FollowCamera's reset fn.
// The fn is exposed on window.__r3fResetCamera by FollowCamera.tsx once
// the R3F tree mounts. Before that (pre-onboarding), it's a no-op.
document.getElementById('resetCameraBtn')?.addEventListener('click', () => {
  (window as unknown as { __r3fResetCamera?: () => void }).__r3fResetCamera?.();
});

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl1 = canvas.getContext('webgl');
    return !!(window.WebGLRenderingContext && (gl2 || gl1));
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
    container.innerHTML =
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#090d16;z-index:1;padding:24px">' +
      '<p style="max-width:320px;margin:0;text-align:center;color:#cbd5e1;font-size:0.95rem;line-height:1.5;font-family:system-ui,-apple-system,sans-serif">' +
      "Your browser can't show the 3D city. Try Safari/Chrome with hardware acceleration on." +
      '</p></div>';
  }
}
