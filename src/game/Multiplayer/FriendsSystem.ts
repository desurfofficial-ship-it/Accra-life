/**
 * Accra Life — FriendsSystem
 *
 * Real friends list + visiting groundwork (README roadmap: "Real friends
 * list + visiting — Next"). Works entirely within the EXISTING Firestore
 * security rules — zero rule changes needed for the social graph:
 *
 *   /players/{uid}/friends/{friendUid}  — owner read/write friend cards
 *     { uid, displayName, addedAt, lastLoc?, lastSeenAtMs? }
 *
 *   /players/{uid}/inbox/{msgId}        — request/activity transport
 *     { type, fromUid, fromName, createdAt }
 *     Rules: ANY signed-in player may create (friend requests + visit
 *     pings must work even between strangers), owner may read/delete.
 *
 * Request flow (works even though no one can write into someone else's
 * friends subcollection):
 *   1. A → inbox(B): { type: 'friend_request' }
 *   2. B accepts → B writes friend doc for A in B's OWN subcollection,
 *      then A → inbox(B)... no wait, B → inbox(A): { type: 'friend_accept' }
 *   3. A receives the accept → A writes friend doc for B in A's OWN
 *      subcollection. Both sides now have each other. One tap for B,
 *      automatic completion for A.
 *
 * Online status: /presence/{uid} is owner-read (no get), but the whole
 * collection is LISTABLE by signed-in users (limit ≤ 50 — same surface the
 * PresenceManager nearby query already uses). So we subscribe once to a
 * 50-cap presence snapshot and cross-reference friend uids client-side.
 *
 * Guests (uid === null) are fully inert — no subscriptions, no writes.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';

// ------------------------------------------------------------------ types

/** One card in the player's friends list (mirrors the friend doc). */
export interface FriendEntry {
  uid: string;
  displayName: string;
  addedAtMs: number | null;
  /** Friend's presence location id, when they're online (client-derived). */
  online: boolean;
  /** Friend's current location id while online (client-derived). */
  currentLocation?: string;
}

/** One message in the player's inbox (requests + visit pings). */
export interface InboxMessageView {
  id: string;
  type: 'friend_request' | 'friend_accept' | 'home_visit';
  fromUid: string;
  fromName: string;
  createdAtMs: number | null;
}

export type FriendsListener = (friends: FriendEntry[]) => void;
export type InboxListener = (messages: InboxMessageView[]) => void;

export type FriendActionResult =
  | { ok: true }
  | { ok: false; reason: 'guest' | 'self' | 'already-friends' | 'already-requested' | 'invalid' | 'error'; message?: string };

export interface FriendsSystemOptions {
  uid: string | null;
  displayName: string;
}

const MAX_FRIENDS = 50;
const MAX_INBOX_RENDER = 20;
const PRESENCE_WATCH_MS = 45_000; // re-poll presence for friend online dots

// ------------------------------------------------------------------ class

export class FriendsSystem {
  private readonly uid: string | null;
  private readonly displayName: string;

  private unsubscribeFriends: (() => void) | null = null;
  private unsubscribeInbox: (() => void) | null = null;
  private presenceWatchTimer: ReturnType<typeof setInterval> | null = null;

  private friendsCache: FriendEntry[] = [];
  private inboxCache: InboxMessageView[] = [];
  /** uids we sent a friend_request to this session (client-side dedupe). */
  private readonly requestedUids = new Set<string>();
  /** uids that sent US a friend_request (for Add-button cross-check). */
  private pendingRequestFrom = new Set<string>();

  private readonly friendsListeners = new Set<FriendsListener>();
  private readonly inboxListeners = new Set<InboxListener>();

  constructor(opts: FriendsSystemOptions) {
    this.uid = opts.uid || null;
    this.displayName = opts.displayName || 'Chale';
  }

  public get isGuest(): boolean {
    return this.uid === null;
  }

  // ------------------------------------------------------------------ lifecycle

  /** Idempotent. Subscribes to friends + inbox + presence watch. */
  public enter(): void {
    if (this.isGuest || this.unsubscribeFriends) return;

    // Live friends list.
    this.unsubscribeFriends = onSnapshot(
      collection(db, 'players', this.uid as string, 'friends'),
      (snap) => {
        const next: FriendEntry[] = [];
        for (const d of snap.docs) {
          const data = d.data() as {
            uid?: string;
            displayName?: string;
            addedAt?: Timestamp | number | null;
            lastLoc?: string;
            lastSeenAtMs?: number;
          };
          const fUid = typeof data.uid === 'string' ? data.uid : d.id;
          if (!isValidUid(fUid)) continue;
          next.push({
            uid: fUid,
            displayName: typeof data.displayName === 'string' ? data.displayName : 'Chale',
            addedAtMs: toUnixMs(data.addedAt),
            online: false,
            currentLocation: typeof data.lastLoc === 'string' ? data.lastLoc : undefined
          });
        }
        next.sort((a, b) => a.displayName.localeCompare(b.displayName));
        this.friendsCache = next.slice(0, MAX_FRIENDS);
        void this.refreshPresenceStatuses();
        this.emitFriends();
      },
      (err) => console.warn('[friends] snapshot error:', err)
    );

    // Live inbox (requests, accepts, visit pings).
    this.unsubscribeInbox = onSnapshot(
      query(collection(db, 'players', this.uid as string, 'inbox'), orderBy('createdAt', 'desc'), limit(MAX_INBOX_RENDER)),
      (snap) => {
        const next: InboxMessageView[] = [];
        this.pendingRequestFrom = new Set();
        for (const d of snap.docs) {
          const data = d.data() as {
            type?: string;
            fromUid?: string;
            fromName?: string;
            createdAt?: Timestamp | number | null;
          };
          if (data.type !== 'friend_request' && data.type !== 'friend_accept' && data.type !== 'home_visit') continue;
          if (!isValidUid(data.fromUid)) continue;
          if (data.type === 'friend_request') this.pendingRequestFrom.add(data.fromUid);
          next.push({
            id: d.id,
            type: data.type,
            fromUid: data.fromUid,
            fromName: typeof data.fromName === 'string' ? data.fromName : 'Chale',
            createdAtMs: toUnixMs(data.createdAt)
          });
        }
        this.inboxCache = next;
        // Auto-complete a pending accept: whoever accepted us becomes a friend.
        void this.processAccepts(next);
        this.emitInbox();
      },
      (err) => console.warn('[friends] inbox error:', err)
    );

    // Presence cross-reference for online dots (poll, cheap: ≤50 docs).
    this.presenceWatchTimer = setInterval(() => void this.refreshPresenceStatuses(), PRESENCE_WATCH_MS);
    void this.refreshPresenceStatuses();
  }

  /** Idempotent. Drops all subscriptions. */
  public leave(): void {
    if (this.unsubscribeFriends) {
      this.unsubscribeFriends();
      this.unsubscribeFriends = null;
    }
    if (this.unsubscribeInbox) {
      this.unsubscribeInbox();
      this.unsubscribeInbox = null;
    }
    if (this.presenceWatchTimer) {
      clearInterval(this.presenceWatchTimer);
      this.presenceWatchTimer = null;
    }
    this.friendsCache = [];
    this.inboxCache = [];
    this.emitFriends();
    this.emitInbox();
  }

  // ------------------------------------------------------------------ queries

  public getFriends(): FriendEntry[] {
    return this.friendsCache;
  }

  public getInbox(): InboxMessageView[] {
    return this.inboxCache;
  }

  public getPendingRequestCount(): number {
    return this.pendingRequestFrom.size;
  }

  /** True if we have an outgoing session request to this uid. */
  public hasRequested(uid: string): boolean {
    return this.requestedUids.has(uid);
  }

  /** True if uid is already a friend. */
  public isFriend(uid: string): boolean {
    return this.friendsCache.some((f) => f.uid === uid);
  }

  public onFriends(listener: FriendsListener): () => void {
    this.friendsListeners.add(listener);
    listener(this.friendsCache);
    return () => this.friendsListeners.delete(listener);
  }

  public onInbox(listener: InboxListener): () => void {
    this.inboxListeners.add(listener);
    listener(this.inboxCache);
    return () => this.inboxListeners.delete(listener);
  }

  // ------------------------------------------------------------------ actions

  /**
   * Send a friend request to a nearby / known player. Writes to THEIR
   * inbox (rules: any signed-in player may create inbox messages).
   */
  public async sendFriendRequest(targetUid: string, targetName: string): Promise<FriendActionResult> {
    if (this.isGuest) return { ok: false, reason: 'guest', message: 'Sign in to add friends.' };
    if (!isValidUid(targetUid)) return { ok: false, reason: 'invalid', message: 'Bad player id.' };
    if (targetUid === this.uid) return { ok: false, reason: 'self', message: "You can't add yourself, chale." };
    if (this.isFriend(targetUid)) return { ok: false, reason: 'already-friends', message: `You and ${targetName} are already friends.` };
    if (this.pendingRequestFrom.has(targetUid)) {
      return { ok: false, reason: 'already-requested', message: `${targetName} already sent you a request — accept it below.` };
    }
    if (this.requestedUids.has(targetUid)) {
      return { ok: false, reason: 'already-requested', message: `Request to ${targetName} already sent.` };
    }
    if (this.friendsCache.length >= MAX_FRIENDS) {
      return { ok: false, reason: 'error', message: `Friends list full (${MAX_FRIENDS}).` };
    }

    try {
      await setDoc(doc(db, 'players', targetUid, 'inbox', `fr_${this.uid}_${Date.now()}`), {
        type: 'friend_request',
        fromUid: this.uid,
        fromName: this.displayName,
        createdAt: serverTimestamp()
      });
      this.requestedUids.add(targetUid);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        reason: 'error',
        message: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Accept a friend request: add the requester to OUR list, tell them
   * (friend_accept → their client auto-adds us), delete the inbox msg.
   */
  public async acceptRequest(msgId: string): Promise<FriendActionResult> {
    if (this.isGuest) return { ok: false, reason: 'guest', message: 'Sign in to add friends.' };
    const msg = this.inboxCache.find((m) => m.id === msgId && m.type === 'friend_request');
    if (!msg || !isValidUid(msg.fromUid)) return { ok: false, reason: 'invalid' };

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'players', this.uid as string, 'friends', msg.fromUid), {
        uid: msg.fromUid,
        displayName: msg.fromName,
        addedAt: serverTimestamp()
      });
      batch.set(doc(db, 'players', msg.fromUid, 'inbox', `fa_${this.uid}_${Date.now()}`), {
        type: 'friend_accept',
        fromUid: this.uid,
        fromName: this.displayName,
        createdAt: serverTimestamp()
      });
      batch.delete(doc(db, 'players', this.uid as string, 'inbox', msgId));
      await batch.commit();
      this.requestedUids.delete(msg.fromUid);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        reason: 'error',
        message: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /** Decline = just delete the request message. */
  public async declineRequest(msgId: string): Promise<FriendActionResult> {
    if (this.isGuest) return { ok: false, reason: 'guest' };
    const msg = this.inboxCache.find((m) => m.id === msgId && m.type === 'friend_request');
    if (!msg) return { ok: false, reason: 'invalid' };
    try {
      await deleteDoc(doc(db, 'players', this.uid as string, 'inbox', msgId));
      this.requestedUids.delete(msg.fromUid);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  }

  /** Remove a friend (one-sided — like unfollowing). */
  public async removeFriend(uid: string): Promise<FriendActionResult> {
    if (this.isGuest) return { ok: false, reason: 'guest' };
    if (!this.isFriend(uid)) return { ok: false, reason: 'invalid' };
    try {
      await deleteDoc(doc(db, 'players', this.uid as string, 'friends', uid));
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Fire-and-forget visit ping: tells the host someone stopped by.
   * Shows up in their Friends sheet activity feed. Never throws.
   */
  public async sendVisitPing(hostUid: string, hostName: string): Promise<void> {
    if (this.isGuest || !isValidUid(hostUid) || hostUid === this.uid) return;
    try {
      await setDoc(doc(db, 'players', hostUid, 'inbox', `hv_${this.uid}_${Date.now()}`), {
        type: 'home_visit',
        fromUid: this.uid,
        fromName: this.displayName,
        createdAt: serverTimestamp()
      });
      void hostName;
    } catch {
      /* visit pings are a courtesy — silent failure is fine */
    }
  }

  /** Delete one inbox message (e.g. a seen visit ping). */
  public async deleteInboxMessage(msgId: string): Promise<void> {
    if (this.isGuest) return;
    try {
      await deleteDoc(doc(db, 'players', this.uid as string, 'inbox', msgId));
    } catch {
      /* non-fatal */
    }
  }

  /** Clear ALL inbox messages (requests pending stay pending server-side… they're gone; acceptable). */
  public async clearActivity(): Promise<void> {
    if (this.isGuest) return;
    const visitMsgs = this.inboxCache.filter((m) => m.type === 'home_visit' || m.type === 'friend_accept');
    if (visitMsgs.length === 0) return;
    try {
      const batch = writeBatch(db);
      for (const m of visitMsgs) batch.delete(doc(db, 'players', this.uid as string, 'inbox', m.id));
      await batch.commit();
    } catch {
      /* non-fatal */
    }
  }

  // ------------------------------------------------------------------ internals

  /** Cross-reference the presence list to mark friends online + cache their location. */
  private async refreshPresenceStatuses(): Promise<void> {
    if (this.isGuest || this.friendsCache.length === 0) return;
    try {
      const snap = await getDocs(query(collection(db, 'presence'), limit(50)));
      const byUid = new Map<string, { loc: string; seenMs: number }>();
      for (const d of snap.docs) {
        const data = d.data() as {
          uid?: string;
          currentLocation?: string;
          lastSeenAt?: Timestamp | number | null;
        };
        if (typeof data.uid !== 'string') continue;
        byUid.set(data.uid, {
          loc: typeof data.currentLocation === 'string' ? data.currentLocation : '',
          seenMs: toUnixMs(data.lastSeenAt) ?? 0
        });
      }
      let changed = false;
      for (const f of this.friendsCache) {
        const p = byUid.get(f.uid);
        const isOnline = !!p && Date.now() - p.seenMs < 60_000;
        if (f.online !== isOnline || (isOnline && f.currentLocation !== p?.loc)) {
          f.online = isOnline;
          f.currentLocation = isOnline ? p?.loc : undefined;
          changed = true;
        }
      }
      if (changed) this.emitFriends();
    } catch {
      /* presence read is a nice-to-have — silent failure */
    }
  }

  /** friend_accept messages → auto-add the sender to our friends list. */
  private async processAccepts(messages: InboxMessageView[]): Promise<void> {
    if (this.isGuest) return;
    const accepts = messages.filter((m) => m.type === 'friend_accept' && isValidUid(m.fromUid));
    if (accepts.length === 0) return;
    for (const acc of accepts) {
      if (this.isFriend(acc.fromUid) || acc.fromUid === this.uid) continue;
      try {
        await setDoc(doc(db, 'players', this.uid as string, 'friends', acc.fromUid), {
          uid: acc.fromUid,
          displayName: acc.fromName,
          addedAt: serverTimestamp()
        });
      } catch {
        /* the friends snapshot will retry on next change; non-fatal */
      }
    }
  }

  private emitFriends(): void {
    for (const l of this.friendsListeners) {
      try { l(this.friendsCache); } catch { /* listener errors must not crash */ }
    }
  }

  private emitInbox(): void {
    for (const l of this.inboxListeners) {
      try { l(this.inboxCache); } catch { /* ignore */ }
    }
  }
}

// ------------------------------------------------------------------ helpers

function isValidUid(s: unknown): s is string {
  return typeof s === 'string' && s.length >= 1 && s.length <= 128;
}

function toUnixMs(v: number | Timestamp | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const anyV = v as unknown as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000 + Math.floor((anyV.nanoseconds ?? 0) / 1_000_000);
  return null;
}
