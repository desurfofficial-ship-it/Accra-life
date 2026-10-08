/**
 * main.tsx — Phase-1 R3F Bridge entry point
 */
import { createRoot } from 'react-dom/client';
import { GameCanvas } from './GameCanvas';
import { bootstrapDebugOverlay } from '../debug/DebugOverlay';

bootstrapDebugOverlay();

if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')) {
  document.body.classList.add('debug-mode');
}

document.getElementById('resetCameraBtn')?.addEventListener('click', () => {
  (window as unknown as { __r3fResetCamera?: () => void }).__r3fResetCamera?.();
});

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

const container = document.getElementById('r3f-root');
const fallback = document.getElementById('webglFallbackCard');

if (container) {
  if (!hasWebGL()) {
    fallback?.classList.add('show');
  } else {
    const root = createRoot(container);
    root.render(<GameCanvas />);
  }
}
