import * as THREE from 'three';
/**
 * Small shared helpers (Task 18 modular refactor).
 */

import { getLocationDef, type LocationId } from '../game/World/Locations';

/** Human label for a presence location id; falls back to the raw id. */
export function locationLabel(locId: string | undefined): string {
  if (!locId) return 'somewhere in Accra';
  try {
    return getLocationDef(locId as LocationId).displayName;
  } catch {
    return locId;
  }
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      m.geometry?.dispose?.();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose?.());
      else mat?.dispose?.();
    }
  });
}

export function isValidUidStr(s: string): boolean {
  return typeof s === 'string' && s.length >= 1 && s.length <= 128;
}

// ── Task: wire dormant systems (live events pill + housing cloud sync) ─────

/**
 * Diff `homeSystem.getPlaced()` against the 3D mesh registry: spawns meshes
 * for new instances, removes + disposes meshes for sold/replaced instances.
 * Keeps the scene in sync with HomeSystem state WITHOUT a game reload —
 * covers initial load, placement confirm, sell, and cloud restore.
 */
export function formatChatTime(unixMs: number): string {
  const d = new Date(unixMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
