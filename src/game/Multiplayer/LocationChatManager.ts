/**
 * Accra Life — LocationChatManager
 *
 * Broadcast chat for everyone currently at the same Accra location.
 *
 * Data path: `/location_chats/{locationId}/messages/{messageId}`
 * - `senderId` is forced by Firestore rules to equal `request.auth.uid`,
 *   so a client cannot impersonate another player.
 * - `text` is bounded 1-500 chars by rules.
 * - Messages are append-only (`allow update, delete: if false`).
 *
 * The manager keeps a small ring buffer of the most recent
 * `CHAT_RING_SIZE` messages and exposes a subscribe/unsubscribe API so the
 * HUD can render the chat panel without coupling to Firestore internals.
 *
 * Guests (`uid === null`) are read-only: they can see chat but cannot send.
 */

import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  CHAT_RING_SIZE,
  ChatMessageDoc,
  ChatMessageView,
  LocationId
} from './types';
import type { Timestamp } from 'firebase/firestore';

export type ChatMessagesListener = (messages: ChatMessageView[]) => void;
export type ChatSendResult =
  | { ok: true }
  | { ok: false; reason: 'guest' | 'empty' | 'too-long' | 'rate-limited' | 'error'; message?: string };

export interface LocationChatOptions {
  uid: string | null;
  displayName: string;
  locationId: LocationId;
  origin?: string;
}

const MIN_SEND_INTERVAL_MS = 1_500; // basic client-side rate limit
const MAX_TEXT_LEN = 500;

export class LocationChatManager {
  private readonly uid: string | null;
  private readonly displayName: string;
  private locationId: LocationId; // mutable — switchLocation updates this
  private readonly origin?: string;

  private unsubscribeSnapshot: (() => void) | null = null;
  private readonly listeners = new Set<ChatMessagesListener>();
  private messagesCache: ChatMessageView[] = [];
  private lastSendAt = 0;

  constructor(opts: LocationChatOptions) {
    this.uid = opts.uid;
    this.displayName = opts.displayName;
    this.locationId = opts.locationId;
    this.origin = opts.origin;
  }

  // ------------------------------------------------------------------ lifecycle

  /** Idempotent. Subscribes to the location's chat stream. */
  public enter(): void {
    if (this.unsubscribeSnapshot) return;

    // Ensure the parent doc exists (rules allow this lazily on first message).
    void setDoc(doc(db, 'location_chats', this.locationId), {
      id: this.locationId
    }, { merge: true }).catch(() => { /* non-fatal */ });

    const q = query(
      collection(db, 'location_chats', this.locationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(CHAT_RING_SIZE)
    );
    this.unsubscribeSnapshot = onSnapshot(
      q,
      (snap) => {
        const next: ChatMessageView[] = [];
        for (const d of snap.docs) {
          const data = d.data() as ChatMessageDoc;
          next.push({
            id: d.id,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            createdAtMs: toUnixMs(data.createdAt),
            isMine: data.senderId === this.uid
          });
        }
        this.messagesCache = next;
        this.emit();
      },
      (err) => {
        console.warn('[chat] snapshot error:', err);
      }
    );
  }

  /** Idempotent. */
  public leave(): void {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    this.messagesCache = [];
    this.emit();
  }

  /**
   * Switch to a new location's chat stream. Unsubscribes from the old
   * location, clears the message cache, updates the locationId, and
   * re-subscribes to the new location. If the new location is the same as
   * the current one, this is a no-op (returns false).
   *
   * If the manager was previously left() (no active subscription), this
   * also re-activates the subscription — i.e. switchLocation() implies enter()
   * for the new location.
   */
  public switchLocation(newLocationId: LocationId): boolean {
    if (newLocationId === this.locationId && this.unsubscribeSnapshot) return false;
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    this.locationId = newLocationId;
    this.messagesCache = [];
    this.emit();
    this.enter();
    return true;
  }

  /** Current location id (read-only view for the game loop). */
  public getCurrentLocation(): LocationId {
    return this.locationId;
  }

  // ------------------------------------------------------------------ queries

  public getMessages(): ChatMessageView[] {
    return this.messagesCache;
  }

  public onMessages(listener: ChatMessagesListener): () => void {
    this.listeners.add(listener);
    listener(this.messagesCache);
    return () => this.listeners.delete(listener);
  }

  // ------------------------------------------------------------------ send

  public async sendMessage(rawText: string): Promise<ChatSendResult> {
    if (!this.uid) {
      return { ok: false, reason: 'guest', message: 'Sign in to chat with Accra.' };
    }
    const text = (rawText ?? '').trim();
    if (text.length === 0) return { ok: false, reason: 'empty', message: 'Empty message.' };
    if (text.length > MAX_TEXT_LEN) return { ok: false, reason: 'too-long', message: 'Too long (max 500).' };

    const now = Date.now();
    if (now - this.lastSendAt < MIN_SEND_INTERVAL_MS) {
      return { ok: false, reason: 'rate-limited', message: 'Slow down, chale.' };
    }
    this.lastSendAt = now;

    const payload: Omit<ChatMessageDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      senderId: this.uid,
      senderName: this.displayName,
      text,
      createdAt: serverTimestamp()
    };
    if (this.origin) payload.origin = this.origin;

    try {
      await addDoc(collection(db, 'location_chats', this.locationId, 'messages'), payload);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        reason: 'error',
        message: err instanceof Error ? err.message : String(err)
      };
    }
  }

  // ------------------------------------------------------------------ internals

  private emit(): void {
    for (const l of this.listeners) {
      try { l(this.messagesCache); } catch { /* ignore listener errors */ }
    }
  }
}

/** Convert Firestore `createdAt` (Timestamp | number | null) to Unix ms. */
function toUnixMs(v: number | Timestamp | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const anyV = v as unknown as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000 + Math.floor((anyV.nanoseconds ?? 0) / 1_000_000);
  return null;
}
