/**
 * One-time first-60-seconds controls hint (playability patch rule 6).
 *
 * Shows a dismissible chip over the viewport: "Drag left stick to walk ·
 * Act when near a marker · WASD on desktop". Disappears on the first
 * movement input / Act press / tap, or after ~14s — and never comes back
 * (localStorage flag), so it only ever costs the player one glance.
 */

import { interactTriggerBtn } from '../ui/dom-refs';

const HINT_SEEN_KEY = 'chale_controls_hint_v1';
const HINT_TIMEOUT_MS = 14_000;

export function maybeShowControlsHint(): void {
  const el = document.getElementById('controlsHint');
  if (!el || localStorage.getItem(HINT_SEEN_KEY)) return;

  let dismissed = false;
  const cleanup = () => {
    window.removeEventListener('keydown', onKey, true);
    el.removeEventListener('pointerdown', onPointer);
    interactTriggerBtn?.removeEventListener('click', dismiss);
    window.removeEventListener('blur', cleanup);
  };
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    el.style.display = 'none';
    try {
      localStorage.setItem(HINT_SEEN_KEY, '1');
    } catch {
      /* private mode — hint just shows once per pageload */
    }
    cleanup();
  };
  const onKey = (e: KeyboardEvent) => {
    const walkKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (walkKeys.includes(e.code)) dismiss();
  };
  const onPointer = () => dismiss();

  el.style.display = 'flex';
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('pointerdown', onPointer);
  // Tapping Act with the hint up means the player got it — dismiss.
  interactTriggerBtn?.addEventListener('click', dismiss, { once: true });
  window.addEventListener('blur', cleanup);
  window.setTimeout(dismiss, HINT_TIMEOUT_MS);
}
