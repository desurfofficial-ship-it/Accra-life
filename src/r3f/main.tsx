/**
 * main.tsx — Phase-1 R3F Bridge entry point
 *
 * Mounts the GameCanvas into a div with id="r3f-root". The div is
 * positioned inside the existing viewport container (#viewportContainer)
 * so the R3F Canvas renders BEHIND the existing DOM HUD elements.
 *
 * The HUD stays fixed (it's in a separate DOM layer above the Canvas).
 * The 3D plane can be rotated via OrbitControls (drag to orbit).
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

/**
 * WebGL availability pre-flight. With WebGL disabled, R3F's Canvas fails
 * to create a context and the viewport used to stay plain navy with no
 * explanation. Detect that BEFORE mounting and render a readable message.
 */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(