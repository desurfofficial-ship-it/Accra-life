/**
 * Accra Life — Multiplayer types (presence + location chat).
 *
 * These types describe the Firestore documents that back the real-time
 * multiplayer layer. They are intentionally minimal: presence carries no PII
 * (just a display name, location id, last-seen timestamp, and an optional
 * in-world coordinate stub), and location chat messages are append-only.
 *
 * The Firestore security rules in `firestore.rules` enforce the same shape
 * server-side, so a misbehaving client cannot poison these collections.
 */

/** Logical Accra location a player can be at. */
export type LocationId = string;

/** Look stub propagated to nearby players (used later to render their avatars). */
export interface PresenceLook {
  skin?: string;
  hair?: string;
}

/** Document stored at `/presence/{uid}`. */
export interface PresenceDoc {
  /** Auth uid — same as the document id. Used by Firestore rules. */
  uid: string;
  /** Display name chosen at onboarding (1-24 chars, validated by rules). */
  displayName: string;
  /** Logical location (e.g. "accra_neighborhood"). Validated by rules. */
  currentLocation: LocationId;
  /** Server timestamp written by the client (`serverTimestamp()`). */
  lastSeenAt: number | import('firebase/firestore').Timestamp | null;
  /** In-world x position (Three.js). Optional. */
  posX?: number;
  /** In-world z position (Three.js). Optional. */
  posZ?: number;
  /** Body rotation Y (radians). Optional. */
  rotY?: number;
  /** Skin/hair stub for nearby-player rendering. Optional. */
  look?: PresenceLook;
}

/** Document stored at `/location_chats/{locationId}/messages/{messageId}`. */
export interface ChatMessageDoc {
  /** Sender auth uid. Must equal `request.auth.uid` (enforced by rules). */
  senderId: string;
  /** Sender display name (1-24 chars, validated by rules). */
  senderName: string;
  /** Message text (1-500 chars, validated by rules). */
  text: string;
  /** Server timestamp (`serverTimestamp()`). */
  createdAt: number | import('firebase/firestore').Timestamp | null;
  /** Optional origin tag (e.g. "dbee" / "aunty_ba") for flavor. */
  origin?: string;
}

/**
 * A nearby-player snapshot delivered to listeners. This is a stripped-down
 * view of a PresenceDoc — the uid is included so friends/visiting can be built
 * later, but no PII (no email, no account info) is ever propagated.
 */
export interface NearbyPlayer {
  uid: string;
  displayName: string;
  currentLocation: LocationId;
  /** Milliseconds since the player's last heartbeat. Used to grey out idle. */
  staleAfterMs: number;
  posX?: number;
  posZ?: number;
  rotY?: number;
  look?: PresenceLook;
}

/** A view of a chat message suitable for UI rendering. */
export interface ChatMessageView {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  /** Unix ms (or null while the server timestamp is pending). */
  createdAtMs: number | null;
  /** True if this message is from the local player. */
  isMine: boolean;
}

/** Heartbeat cadence. Must be < the stale threshold in the listener. */
export const PRESENCE_HEARTBEAT_MS = 20_000;
/** A presence doc older than this is considered stale and dropped. */
export const PRESENCE_STALE_MS = 60_000;
/** How many chat messages to keep in the client-side ring buffer. */
export const CHAT_RING_SIZE = 50;
