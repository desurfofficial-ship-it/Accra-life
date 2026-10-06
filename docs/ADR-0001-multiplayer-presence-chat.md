# ADR-0001 — Multiplayer Presence + Location Chat on Firebase

Status: Accepted
Date: 2026-10-06
Scope: `src/game/Multiplayer/`, `firestore.rules`, `index.html`, `src/main.ts`

## Context

The product brief calls for an "authoritative server" for consequential game
state and lists `apps/server/` (Node.js/NestJS) as the conceptual architecture.
However, the existing repo:

- is a **Vite + TypeScript SPA** with no separate server process;
- already uses **Firebase Auth + Firestore** for cloud save;
- has working single-player systems that the brief says we should not throw
  away ("Do not throw away working systems or rebuild the application from
  scratch simply because a different architecture may be theoretically
  better.");
- needs **multiplayer presence + location chat** next (per the README roadmap
  and the brief's "multiplayer presence is the main retention engine").

A Node.js authoritative server is the right long-term target for high-frequency
simulation ticks (need decay, time progression, etc.). But for the **first
multiplayer vertical slice** — "see who is here" + "talk to people here" —
Firestore's built-in real-time listeners (`onSnapshot`) plus Firebase Auth
already provide a fully authoritative, anti-cheat substrate:

- writes are validated server-side by Firestore security rules;
- timestamps are server-set (`serverTimestamp()` enforced as
  `request.time` by rules);
- `senderId == request.auth.uid` is enforced by rules — a client cannot
  impersonate another player;
- field-level `hasAll` / `hasOnly` / `size()` checks prevent schema drift and
  shadow-field injection (see `security_spec.md` for the spec pattern).

## Decision

For the multiplayer presence + location chat slice, **do not** introduce a
separate Node.js server. Implement directly on top of the existing Firebase
stack, with new Firestore collections:

- `/presence/{uid}` — one document per signed-in player, carrying only
  `displayName`, `currentLocation`, `lastSeenAt` (server timestamp),
  in-world position stub, and an optional look stub. No PII.
- `/location_chats/{locationId}/messages/{messageId}` — append-only chat
  messages for a location, validated by rules (sender == auth, text 1-500
  chars, immutable).

Client-side code lives in `src/game/Multiplayer/`:

- `types.ts` — shared types + cadence constants.
- `PresenceManager.ts` — writes own presence, heartbeats every 20 s,
  subscribes to nearby presence filtered by `currentLocation`, drops stale
  docs (>60 s without heartbeat) client-side, best-effort deletes on
  `pagehide` / `visibilitychange(hidden)` / `beforeunload`.
- `LocationChatManager.ts` — subscribes to last 50 messages for the current
  location, sends validated messages with a 1.5 s client-side rate limit.

UI lives in `index.html` (GTA-yellow/black sheet consistent with the existing
design system) and is wired in `src/main.ts::initMultiplayer()`.

Guests (`profile.mode === 'guest'`) get **read-only chat**: they can see
messages and the nearby-players strip, but cannot send messages or write a
presence doc. This keeps the free-trial loop intact while giving signed-in
players a clear upgrade reason.

## Consequences

### Positive

- No new infrastructure. Firestore + Auth already provisioned. Zero new
  servers to deploy, monitor, or scale.
- Real-time out of the box via `onSnapshot`. No need to operate a WebSocket
  fleet for presence/chat.
- Strong anti-cheat posture from day one (rules validate every write).
- Consistent with the brief's "better + simpler" principle.
- Path forward to multi-region Firebase when scale demands it.

### Negative

- **Cost**: Firestore read/write pricing scales with concurrency. A 1k-DAU
  game with 20 s heartbeats + 1.5 s chat rate-limit should be cheap, but a
  viral spike (the Lagos Life scenario) could get expensive fast. Mitigation:
  heartbeat cadence is tunable; we can extend to 30-60 s once we have real
  retention data. A Redis-backed presence server is the natural escalation
  if/when this becomes a problem.
- **No authoritative game tick**: presence/chat are fine on Firestore, but
  **need decay and time progression are NOT**. The current `NeedsSystem`
  ticks client-side and persists to `localStorage` — this is
  client-authoritative and a separate, deferred gap. See ADR-0002 (future)
  for the authoritative tick plan.
- **List queries** on `/presence` are necessary so clients can see who's at
  a location. Rules cap `request.query.limit <= 50`. Presence docs carry no
  PII, so a successful list scrape costs the attacker writes but exposes only
  display names + locations. Acceptable for MVP.

### Operational notes

- Stale presence docs (player closed tab without firing `pagehide`) are
  filtered client-side via the `PRESENCE_STALE_MS` (60 s) threshold. A
  server-side janitor (Cloud Functions scheduled job that deletes
  `/presence` docs with `lastSeenAt < now - 5 min`) is the natural follow-up
  and is documented as a TODO in `PresenceManager.ts`.
- The `security_spec.md` file describes a stricter ruleset (verified email,
  full `hasAll`/`hasOnly` schema validation on `/players` and `/profiles`)
  that has **not** been applied to the live `firestore.rules` yet. That is
  a separate, deferred task — this ADR does not touch it.
- The current `firestore.rules` adds **new** collections (`/presence`,
  `/location_chats`) with field validation, but does **not** tighten the
  existing `/players`, `/profiles`, or `/chats` rules.

## Alternatives considered

1. **Node.js + Socket.io server** (matches the brief's conceptual
   architecture). Rejected for this slice: would require new infrastructure,
   a new process to run, and a rewrite of the auth flow. The existing
   Firebase setup already does what we need for presence/chat. Re-evaluate
   when the game needs an authoritative tick (needs/time) or finer-grained
   room sharding than Firestore's query model supports.
2. **Supabase Realtime** as a drop-in replacement for Firestore listeners.
   Rejected: would mean running two real-time backends side-by-side. If we
   ever migrate off Firebase, do it as one cohesive migration, not a
   piecemeal one.
3. **Client-side-only presence** (each player pings a shared Firestore doc
   with their coordinates; no server enforcement). Rejected: trivially
   cheatable and against the brief's "authoritative server" requirement.

## Follow-ups (not in this slice)

- 3D avatar rendering for nearby players (reuse `CharacterBuilder` to spawn
  a mesh per `PresenceDoc`, lerp to the reported `posX`/`posZ` between
  heartbeats).
- Server-side janitor Cloud Function for stale `/presence` docs.
- Apply the strict `security_spec.md` ruleset to `/players` and `/profiles`.
- Multiple location IDs (currently hardcoded to `accra_neighborhood`); wire
  the existing neighborhood travel system to update `currentLocation`.
- Anonymous auth for guests so they can also write presence + chat (currently
  guests are read-only).
