/**
 * worldLabel.ts — safe HTML labels under OrthographicCamera.
 *
 * drei <Html distanceFactor> multiplies by camera.zoom for ortho cameras
 * (objectScale returns camera.zoom). At zoom 12 that makes labels ~100×
 * too big. Never use distanceFactor in this scene.
 *
 * Also budgets labels: within 25 m of the player, at most 4 at once,
 * hidden while any modal/sheet is open.
 */

const LABEL_RANGE_M = 25;
const MAX_LABELS = 4;

/** Modal backdrops use class `open` when visible (see economy-modal.ts). */
export function isAnyModalOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector(
    '.economy-modal-backdrop.open, .home-modal-backdrop.open, .chat-modal-backdrop.open, .friends-modal-backdrop.open',
  );
}

type Candidate = { id: string; dist: number; frame: number };
const candidates = new Map<string, Candidate>();
let currentFrame = 0;

/** Call once per useFrame from any label that wants a slot. */
export function reportWorldLabel(id: string, dist: number): void {
  candidates.set(id, { id, dist, frame: currentFrame });
}

/** Advance the frame counter and prune stale entries. Call from one place. */
export function tickWorldLabelFrame(): void {
  currentFrame++;
  for (const [id, c] of candidates) {
    if (currentFrame - c.frame > 2) candidates.delete(id);
  }
}

/**
 * Returns true if this label should be visible this frame.
 * Must call reportWorldLabel first in the same frame.
 */
export function shouldShowWorldLabel(id: string): boolean {
  if (isAnyModalOpen()) return false;
  const self = candidates.get(id);
  if (!self || self.dist > LABEL_RANGE_M) return false;

  const nearby = [...candidates.values()]
    .filter((c) => c.dist <= LABEL_RANGE_M && currentFrame - c.frame <= 1)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_LABELS);

  return nearby.some((c) => c.id === id);
}
