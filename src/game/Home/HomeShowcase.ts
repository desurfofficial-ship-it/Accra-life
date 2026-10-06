/**
 * Accra Life — HomeShowcase
 *
 * Public, visit-ready snapshot of a player's home at `/homes/{uid}`.
 *
 * WHY this exists: `/players/{uid}` (where the authoritative cloud save
 * lives) is owner-read-only per security_spec.md. Friends visiting each
 * other's homes need a PUBLIC read surface, so this collection is the
 * deliberately-minimal, PII-free "showcase" copy: just the housing tier
 * and the placed-furniture layout. It contains no wallet, no needs, no
 * identity beyond the doc id. firestore.rules exposes:
 *   get    → any signed-in + verified player (matches /profiles read)
 *   write  → owner only, hasOnly whitelist, bounded placed list
 *
 * FOREIGN DATA IS NEVER TRUSTED: fetch() validates every field against
 * the frozen HOUSING_TIERS / FURNITURE_CATALOG registries before anything
 * reaches the renderer (same hygiene as HomeSystem.hydrateCloudState).
 */

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { FURNITURE_CATALOG, HOUSING_TIERS, type HousingTierId } from './HomeSystem';

/** Minimal layout entry needed to render someone else's furniture. */
export interface ShowcaseFurnitureItem {
  catalogId: string;
  x: number;
  z: number;
  rotationY: number;
}

/** The full /homes/{uid} snapshot shape (already validated). */
export interface HomeShowcaseData {
  ownerId: string;
  tier: HousingTierId;
  placed: ShowcaseFurnitureItem[];
}

/** Raw doc shape as stored (pre-validation). */
interface RawShowcaseDoc {
  ownerId?: string;
  tier?: string;
  placed?: unknown[];
  updatedAt?: unknown;
}

// Bounds — kept in lockstep with the /homes rules block in firestore.rules.
const MAX_PLACED_ITEMS = 40;
const MAX_ROOM_COORD = 12; // room-local meters; biggest tier room is 8.8 × 5.6

// Registry lookup sets (built once — FURNITURE_CATALOG is app-frozen).
const VALID_TIER_IDS = new Set<string>(HOUSING_TIERS.map((t) => t.id));
const VALID_CATALOG_IDS = new Set<string>(FURNITURE_CATALOG.map((f) => f.id));

/**
 * Publish (merge-write) this player's home showcase. Called debounced from
 * the same housing-change path as the private cloud save — guests and
 * unverified accounts are skipped by the same emailVerified gate.
 * Returns true when the write was attempted and succeeded.
 */
export async function publishHomeShowcase(homeState: {
  housingTier: string;
  placed: Array<{ catalogId: string; x: number; z: number; rotationY: number; placementState?: string }>;
}): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  // Same gate as Wallet.syncHousingToFirebase: anonymous OK, real email
  // must be verified (the /homes rules require isVerified for writes too).
  if (!user.isAnonymous && user.email && !user.emailVerified) return false;

  const tier = homeState.housingTier;
  if (!VALID_TIER_IDS.has(tier)) return false;

  // Only persist CONFIRMED placements ('placing' ghosts are transient).
  const placed = homeState.placed
    .filter((p) => p.placementState !== 'placing')
    .map((p) => ({
      catalogId: p.catalogId,
      x: clampCoord(Number(p.x)),
      z: clampCoord(Number(p.z)),
      rotationY: Number.isFinite(p.rotationY) ? Number(p.rotationY) : 0
    }))
    .filter((p) => VALID_CATALOG_IDS.has(p.catalogId))
    .slice(0, MAX_PLACED_ITEMS);

  try {
    await setDoc(
      doc(db, 'homes', user.uid),
      {
        ownerId: user.uid,
        tier,
        placed,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return true;
  } catch {
    // Offline / rules not yet deployed / transient — the private cloud save
    // is unaffected, and the next housing change retries the publish.
    return false;
  }
}

/**
 * DEV-ONLY E2E seam: lets test harnesses inject a showcase without
 * Firestore (visit-mode is otherwise verified-email-gated by rules, so
 * headless E2E cannot fetch a real doc). Inert in production builds
 * unless something deliberately calls the setter.
 */
let devShowcaseOverride: ((hostUid: string) => HomeShowcaseData | null) | null = null;
export function setDevShowcaseOverride(fn: ((hostUid: string) => HomeShowcaseData | null) | null): void {
  devShowcaseOverride = fn;
}

/**
 * Fetch + validate a friend's home showcase. Returns null when the player
 * is signed out, the doc doesn't exist yet (never published), or anything
 * fails validation / permission (rules not deployed yet, unverified...).
 * Callers surface a friendly "not published yet" message on null.
 */
export async function fetchHomeShowcase(hostUid: string): Promise<HomeShowcaseData | null> {
  if (devShowcaseOverride) {
    const injected = devShowcaseOverride(hostUid);
    if (injected) return injected;
  }
  const user = auth.currentUser;
  if (!user) return null;
  if (!isValidUid(hostUid)) return null;

  let raw: RawShowcaseDoc;
  try {
    const snap = await getDoc(doc(db, 'homes', hostUid));
    if (!snap.exists()) return null;
    raw = snap.data() as RawShowcaseDoc;
  } catch {
    // Permission denied (rules pending deploy) or network — treat as
    // "not available" so the UI can degrade gracefully.
    return null;
  }

  return validateShowcase(hostUid, raw);
}

/** Registry-strict validation of a raw /homes doc. */
function validateShowcase(hostUid: string, raw: RawShowcaseDoc): HomeShowcaseData | null {
  if (!raw || typeof raw !== 'object') return null;
  const tier = raw.tier;
  if (typeof tier !== 'string' || !VALID_TIER_IDS.has(tier)) return null;

  const placedRaw = Array.isArray(raw.placed) ? raw.placed : [];
  const placed: ShowcaseFurnitureItem[] = [];
  for (const entry of placedRaw.slice(0, MAX_PLACED_ITEMS)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const catalogId = e.catalogId;
    const x = Number(e.x);
    const z = Number(e.z);
    const rotationY = Number(e.rotationY);
    if (typeof catalogId !== 'string' || !VALID_CATALOG_IDS.has(catalogId)) continue;
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    placed.push({
      catalogId,
      x: clampCoord(x),
      z: clampCoord(z),
      rotationY: Number.isFinite(rotationY) ? rotationY : 0
    });
  }

  return {
    ownerId: typeof raw.ownerId === 'string' && raw.ownerId === hostUid ? hostUid : hostUid,
    tier: tier as HousingTierId,
    placed
  };
}

function clampCoord(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-MAX_ROOM_COORD, Math.min(MAX_ROOM_COORD, v));
}

function isValidUid(s: string): boolean {
  return s.length >= 1 && s.length <= 128;
}
