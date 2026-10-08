/**
 * main.tsx — Phase-1 R3F Bridge entry point
 *
 * Mounts the GameCanvas into a div with id="r3f-root". The div is
 * positioned inside the existing viewport container (#viewportContainer)
 * so the R3F Canvas renders BEHIND the existing DOM HUD elements.
 */

import { createRoot } from 'react-dom/client';
import { GameCanvas } from './GameCanvas';
import { bootstrapDebugOverlay } from '../debug/DebugOverlay';

bootstrapDebugOverlay();

// Wire the "Reset Camera" button (FollowCamera exposes window.__r3fResetCamera).
document.getElementById('resetCameraBtn')?.addEventListener('click', () => {
  (window as unknown as { __r3fResetCamera?: () => void }).__r3fResetCamera?.();
});

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(