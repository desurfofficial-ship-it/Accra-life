/**
 * Accra Life — PresenceManager
 *
 * Owns the local player's presence doc at `/presence/{uid}` and subscribes
 * to the same collection filtered by `currentLocation` so the local player can
 * see everyone sharing their location.
 *
 * Design notes:
 * - Presence docs are intentionally PII-free (no email, no account info).
 * - Heartbeats write `serverTimestamp()` as `lastSeenAt` so the server is the
 *   authority on "is this player still here" — clients cannot fake a future
 *   timestamp (rules enforce `lastSeenAt == request.time`).
 * - Stale presence (> PRESENCE_STALE_MS without a heartbeat) is dropped
 *   client-side so the UI never shows ghost players. A separate "janitor"
 *   pass could delete stale docs server-side via Cloud Functions later; for
 *   the MVP we just filter them out client-side.
 * - Disconnect is handled on a best-effort basis via `pagehide`,
 *   `visibilitychange` (hidden), and `beforeunload`. Mobile browsers do not
 *   reliably fire `beforeunload`, so the heartbeat + stale-timeout is the
 *   real liveness guarantee; the disconnect handler is a fast-clear hint.
 *
 * This class is read-only for guests — it never writes if `uid` is null.
 */

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  NearbyPlayer,
  PresenceDoc,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_STALE_MS,
  PresenceLook
} from './types';

export type NearbyListener = (players: NearbyPlayer[]) => void;
export type PresenceStatusListener = (status: PresenceStatus) => void;

export type PresenceStatus =
  | { kind: 'offline'; reason: 'guest' | 'no-uid' | 'left' | 'error'; message?: string }
  | { kind: 'online' }
  | { kind: 'connecting' };

export interface PresenceOptions {
  uid: string;
  displayName: string;
  currentLocation: string;
  origin?: string;
  look?: PresenceLook;
}

export class PresenceManager {
  private uid: string | null;
  private displayName: string;
  private currentLocation: string;
  private readonly origin?: string;
  private readonly look?: PresenceLook;

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;

  private readonly nearbyListeners = new Set<NearbyListener>();
  private readonly statusListeners = new Set<PresenceStatusListener>();
  private nearbyCache: NearbyPlayer[] = [];

  private lastPos: { x: number; z: number; rotY: number } | null = null;

  constructor(opts: PresenceOptions) {
    this.uid = opts.uid;
    this.displayName = opts.displayName;
    this.currentLocation = opts.currentLocation;
    this.origin = opts.origin;
    this.look = opts.look;
  }

  // ------------------------------------------------------------------ lifecycle

  /** Idempotent. Safe to call multiple times. */
  public async enter(): Promise<void> {
    if (!this.uid) {
      this.emitStatus({ kind: 'offline', reason: 'no-uid', message: 'Guest mode — no presence.' });
      return;
    }
    this.emitStatus({ kind: 'connecting' });

    // 1) Write our own presence doc immediately so other players see us ASAP.
    try {
      await this.writePresence();
    } catch (err) {
      this.emitStatus({
        kind: 'offline',
        reason: 'error',
        message: err instanceof Error ? err.message : String(err)
      });
      // Don't bail — the subscription can still work for read-only nearby.
    }

    // 2) Heartbeat every PRESENCE_HEARTBEAT_MS to keep our doc fresh.
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      void this.writePresence().catch(() => {
        // Soft-fail — network blips shouldn't kill the session.
      });
    }, PRESENCE_HEARTBEAT_MS);

    // 3) Subscribe to nearby presence.
    this.subscribeNearby();

    this.emitStatus({ kind: 'online' });
  }

  /** Idempotent. Safe to call multiple times. */
  public async leave(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    if (this.uid) {
      try {
        // `navigator.sendBeacon`-friendly: deleteDoc is a fetch, but we also
        // have the server-side stale-timeout as a safety net for tabs that
        // close before this resolves.
        await deleteDoc(doc(db, 'presence', this.uid));
      } catch {
        /* swallow — see comment above */
      }
    }
    this.nearbyCache = [];
    this.emitNearby();
    this.emitStatus({ kind: 'offline', reason: 'left' });
  }

  /** Live in-world position update. Coalesced to the heartbeat cadence. */
  public reportPosition(x: number, z: number, rotY: number): void {
    this.lastPos = { x, z, rotY };
  }

  /**
   * Update the player's current location. Called by the game loop when the
   * player crosses a location boundary. Performs three things atomically:
   *   1. Update the in-memory currentLocation.
   *   2. Immediately write a fresh presence doc with the new currentLocation
   *      (so other players see us "leave" the old location and "arrive" at
   *      the new one without waiting for the next 20s heartbeat).
   *   3. Re-subscribe to the nearby query filtered by the new currentLocation.
   *
   * Returns true if the location actually changed, false if it was the same.
   * Safe to call from a guest (no-op write, but the subscription still
   * switches so they can see who's at the new place).
   */
  public updateLocation(newLocation: string): boolean {
    if (newLocation === this.currentLocation) return false;
    this.currentLocation = newLocation;
    // Force an immediate write so other players see the location change fast.
    if (this.uid) {
      void this.writePresence().catch(() => { /* soft-fail */ });
    }
    // Re-subscribe to nearby for the new location.
    this.subscribeNearby();
    // Clear the nearby cache — listeners will get a fresh snapshot from the
    // new subscription shortly, but clearing now avoids flashing stale names.
    this.nearbyCache = [];
    this.emitNearby();
    return true;
  }

  /** Current location id (read-only view for the game loop). */
  public getCurrentLocation(): string {
    return this.currentLocation;
  }

  // ------------------------------------------------------------------ queries

  public getNearby(): NearbyPlayer[] {
    return this.nearbyCache;
  }

  public onNearby(listener: NearbyListener): () => void {
    this.nearbyListeners.add(listener);
    listener(this.nearbyCache);
    return () => this.nearbyListeners.delete(listener);
  }

  public onStatus(listener: PresenceStatusListener): () => void {
    this.statusListeners.add(listener);
    listener({ kind: this.uid ? 'connecting' : 'offline', reason: 'no-uid' });
    return () => this.statusListeners.delete(listener);
  }

  // ------------------------------------------------------------------ internals

  private async writePresence(): Promise<void> {
    if (!this.uid) return;
    const payload: Partial<PresenceDoc> = {
      uid: this.uid,
      displayName: this.displayName,
      currentLocation: this.currentLocation,
      lastSeenAt: serverTimestamp() as unknown as Timestamp
    };
    if (this.lastPos) {
      payload.posX = this.lastPos.x;
      payload.posZ = this.lastPos.z;
      payload.rotY = this.lastPos.rotY;
    }
    if (this.look) payload.look = this.look;
    await setDoc(doc(db, 'presence', this.uid), payload, { merge: true });
  }

  private subscribeNearby(): void {
    if (this.unsubscribeSnapshot) this.unsubscribeSnapshot();
    const q = query(
      collection(db, 'presence'),
      where('currentLocation', '==', this.currentLocation)
    );

    this.unsubscribeSnapshot = onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const out: NearbyPlayer[] = [];
        for (const d of snap.docs) {
          const data = d.data() as PresenceDoc;
          if (!data || data.uid === this.uid) continue; // skip self
          const lastSeenMs = toUnixMs(data.lastSeenAt);
          if (lastSeenMs === null) continue;
          const age = now - lastSeenMs;
          if (age > PRESENCE_STALE_MS) continue; // drop stale
          out.push({
            uid: data.uid,
            displayName: data.displayName,
            currentLocation: data.currentLocation,
            staleAfterMs: PRESENCE_STALE_MS - age,
            posX: typeof data.posX === 'number' ? data.posX : undefined,
            posZ: typeof data.posZ === 'number' ? data.posZ : undefined,
            rotY: typeof data.rotY === 'number' ? data.rotY : undefined,
            look: data.look
          });
        }
        // Sort by displayName for stable ordering in the UI.
        out.sort((a, b) => a.displayName.localeCompare(b.displayName));
        this.nearbyCache = out;
        this.emitNearby();
      },
      (err) => {
        console.warn('[presence] snapshot error:', err);
        // Don't clear the cache on transient errors — last known good is fine.
      }
    );
  }

  private emitNearby(): void {
    for (const l of this.nearbyListeners) {
      try { l(this.nearbyCache); } catch { /* listener errors shouldn't crash the loop */ }
    }
  }

  private emitStatus(s: PresenceStatus): void {
    for (const l of this.statusListeners) {
      try { l(s); } catch { /* ignore */ }
    }
  }
}

/** Convert Firestore `lastSeenAt` (Timestamp | number | null) to Unix ms. */
function toUnixMs(v: number | Timestamp | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  // Firestore Timestamp shape — toMillis exists at runtime.
  const anyV = v as unknown as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000 + Math.floor((anyV.nanoseconds ?? 0) / 1_000_000);
  return null;
}
