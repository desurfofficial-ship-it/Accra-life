---
name: dialogue
version: 1.0.0
domain: world interactions, NPC talk & location chat
description: >
  Lets the main agent read the world's interaction prompts, trigger them
  (Talk / Errand / Shop / Trotro / MoMo / Susu / View Art / Home), converse
  with named NPCs, and participate in per-location multiplayer broadcast chat
  backed by Firestore. Social layer only — no wallet or movement authority.
source_systems:
  - src/game/Player/InteractionSystem.ts
  - src/game/Multiplayer/LocationChatManager.ts
  - src/game/Multiplayer/types.ts
  - src/game/World/NeighborhoodStreet.ts
  - firestore.rules
adapter: skills/agent-adapter.ts#DialogueSkill
independence: callable alone; may pair with movement for approach
---

# dialogue_skill

## 1. Purpose

The dialogue skill extracts two hardcoded conversation surfaces into one
contract. First, the single-target interaction prompts: every world entity
registers an `InteractableTarget` with a `promptLabel` ("Talk", "Errand",
"Shop", "MoMo"…) and an `interactionResponse` line that today just prints to
the HUD toast. Second, the multiplayer location chat: `LocationChatManager`
streams the last 50 messages of `/location_chats/{locationId}/messages` to
everyone standing in the same zone. This skill lets the agent do both — pull
nearby prompts, trigger them for their canned response, chat with NPCs in
character, and broadcast to the room.

## 2. When to call this skill

- Any plan step containing "talk to", "greet", "ask", "chat", "say", "errand".
- To discover what an unknown target does: `list_interactables` returns each
  target's `promptLabel` and `interactionResponse` before committing to it.
- To keep presence alive in multiplayer: periodic `chat_read` + occasional
  in-character `chat_send` while working a zone.
- To place or clear the objective beacon during multi-step jobs
  (`set_objective_marker`) so the player can visually follow the agent's plan.

## 3. Behavioral rules (voice & conduct)

- **NPC voice.** Kojo, Ama and Uncle Mensah speak warm Accra street English
  with light Pidgin seasoning ("chale", "ehn", "small small", "I dey come").
  Keep it affectionate, never caricature; plain English is fine when clarity wins.
- **Vendor voice.** Interaction responses stay one or two punchy lines that
  match the registered `interactionResponse` tone (see `NeighborhoodStreet.ts`
  / `NeighborhoodExtras.ts` for canon lines).
- **Chat etiquette.** One message per 1.5 s maximum (`MIN_SEND_INTERVAL_MS`);
  1–500 characters; trim trailing whitespace; never spam the same text.
- **No impersonation.** Firestore rules force `senderId == request.auth.uid`;
  the agent sends *as* the player, never as another persona, and never signs
  a message with someone else's name.
- **Guests are read-only.** With `uid === null`, `chat_send` returns
  `E_GUEST_READONLY`; the agent may still read and should narrate silently.
- **Append-only.** Never promise edits or deletions — chat messages cannot be
  updated or deleted once written.
- **Keep the fiction.** Don't break character to discuss game internals in
  location chat; system-level reporting belongs to the agent's own logs.
- **Sensitive-content guard.** No slurs, harassment, real-world politics or
  scam scripts in chat; the local Pidgin flavor is welcoming by default.

## 4. Code map

| Game system | File | What the skill wraps |
|---|---|---|
| `InteractionSystem` | `src/game/Player/InteractionSystem.ts` | `registerTarget`, `getActiveTarget`, `triggerCurrentInteraction` (250 ms cooldown), proximity focus rule `dist ≤ radius` and `dist ≤ 1.15 \|\| dot > −0.25` |
| `InteractableTarget` | same file | fields `id`, `title`, `promptLabel`, `interactionResponse`, `position`, `radius`, `onInteract` |
| `LocationChatManager` | `src/game/Multiplayer/LocationChatManager.ts` | `enter/leave`, `switchLocation`, `getMessages`, `sendMessage` (guest/empty/too-long/rate-limited reasons), `CHAT_RING_SIZE = 50` |
| Chat transport | `firestore.rules` | `/location_chats/{locationId}/messages/{messageId}`; `senderId == request.auth.uid`; `text` 1–500; append-only (`update, delete: if false`) |
| NPC registry | `src/game/World/NeighborhoodStreet.ts` | Kojo `npc_male_001` ("Talk"), Ama `npc_female_001` ("Talk"), Uncle Mensah `npc_older_001` ("Errand") |

## 5. Operations

| Op | Description | Key params → result | Cost / gate |
|---|---|---|---|
| `dialogue.list_interactables` | All registered targets with labels & canned responses | `nearOnly?: bool` → `InteractableCard[]` | none |
| `dialogue.get_active_target` | The one target currently in focus radius | — → `InteractableCard \| null` | none |
| `dialogue.interact` | Trigger the focused (or named) target's `onInteract` | `interactableId?` → `InteractionOutcome` | 250 ms interact cooldown |
| `dialogue.npc_profile` | Canonical voice + role of a named NPC | `npcId` → `NpcProfile` | none |
| `dialogue.chat_read` | Latest buffered messages for current zone | `limit?: 1..50` → `ChatMessageView[]` | none |
| `dialogue.chat_send` | Broadcast to current zone | `text: string` → `ChatSendAck` | signed-in; 1.5 s throttle; ≤ 500 chars |
| `dialogue.chat_switch_location` | Re-point chat stream after travel | `locationId` → `switched: bool` | none (auto re-enters) |
| `dialogue.set_objective_marker` | Show/hide the 3D waypoint beacon | `targetId: string \| null`, `isRisky?: bool` → `void` | none |

## 6. Typed I/O

```ts
// dialogue.list_interactables → InteractableCard[]
interface InteractableCard {
  id: string;                    // "food_vendor", "npc_male_001", ...
  title: string;                 // "Sister Akosua's Waakye & Jollof Joint"
  promptLabel: string;           // "Waakye · ₵12" — what the HUD would show
  interactionResponse: string;   // canned line printed on trigger
  distanceM: number;             // from player, world-space
  withinRadius: boolean;         // can `interact` right now?
}

// dialogue.interact → InteractionOutcome
interface InteractionOutcome {
  handled: boolean;              // false when nothing in radius (no target)
  targetId: string | null;
  promptLabel: string | null;
  responseLine: string | null;   // interactionResponse or onInteract result text
  cooldownRemainingMs: number;   // 0 when ready
}

// dialogue.npc_profile → NpcProfile
interface NpcProfile {
  npcId: "npc_male_001" | "npc_female_001" | "npc_older_001";
  name: "Kojo" | "Ama" | "Uncle Mensah";
  promptLabel: string;           // Talk / Talk / Errand
  voice: string;                 // one-line canon voice guidance
  hustleHook: string | null;     // Uncle Mensah → "HUSTLE_NEIGHBORHOOD_ERRAND"
}

// dialogue.chat_read → ChatMessageView[]
interface ChatMessageView {
  id: string;
  senderId: string;
  senderName: string;
  text: string;                  // 1..500 chars
  createdAtMs: number | null;
  isMine: boolean;
}

// dialogue.chat_send
interface ChatSendParams { text: string; }            // trimmed to 1..500
interface ChatSendAck { delivered: boolean; locationId: LocationId; }

// dialogue.set_objective_marker
interface MarkerParams {
  targetId: string | null;       // null clears the beacon
  isRisky?: boolean;             // true → red beacon (police-relevant ops)
}
```

### NPC canon (for banter generation)

| NPC | Prompt | Voice guidance |
|---|---|---|
| Kojo (`npc_male_001`) | "Talk" | Young hustler energy; street-smart, jokes about traffic and Chelsea vs. Accra hearts of Oak; buys iced water on hot days. |
| Ama (`npc_female_001`) | "Talk" | Warm, brisk trader banter; teases regulars; keeps an eye on who owes what at the stall. |
| Uncle Mensah (`npc_older_001`) | "Errand" | Elderly, unhurried, proverb-friendly; the ECG-prepaid errand giver — respect first, business second. |

## 7. Failure modes

| Situation | Error / reason | Recovery |
|---|---|---|
| Nothing within focus radius | `InteractionOutcome.handled=false` | `movement.approach_interactable` first |
| Interact pressed < 250 ms after previous | cooldown-ignored (`handled=false`, `cooldownRemainingMs`) | wait, retry |
| Empty message | `reason:"empty"` | compose non-empty text |
| Text > 500 chars | `reason:"too-long"` | split into two messages |
| Send < 1.5 s after last | `reason:"rate-limited"` / `E_RATE_LIMITED` | wait `retryAfterMs` |
| Guest (`uid === null`) send | `reason:"guest"` / `E_GUEST_READONLY` | sign in or stay read-only |
| Firestore write failure | `reason:"error"` / `E_INTERNAL` | retry once; chat is best-effort |
| Unknown `npcId` / `targetId` | `E_UNKNOWN_ID` | `list_interactables` / `npc_profile` list |

## 8. Worked examples

**Example A — greet Uncle Mensah and take the errand:**

```json
[
  { "skill": "dialogue", "op": "list_interactables", "params": { "nearOnly": true } },
  { "ok": true, "result": [
    { "id": "npc_older_001", "title": "Uncle Mensah", "promptLabel": "Errand",
      "interactionResponse": "Uncle Mensah", "distanceM": 2.1, "withinRadius": true } ] },
  { "skill": "dialogue", "op": "interact", "params": { "interactableId": "npc_older_001" } },
  { "ok": true, "result": { "handled": true, "targetId": "npc_older_001",
    "promptLabel": "Errand", "responseLine": "Uncle Mensah", "cooldownRemainingMs": 250 } }
]
```

**Example B — location chat while waiting at the trotro stop:**

```json
[
  { "skill": "dialogue", "op": "chat_read", "params": { "limit": 5 } },
  { "ok": true, "result": [
    { "id": "m1", "senderId": "u2", "senderName": "Akos", "text": "Mate dey collect ₵6 o",
      "createdAtMs": 1759776001000, "isMine": false } ] },
  { "skill": "dialogue", "op": "chat_send", "params": { "text": "Dey come, chale — save my front seat 🚐" } },
  { "ok": true, "result": { "delivered": true, "locationId": "circle_trotro_stop" } }
]
```

**Example C — guest tries to chat:**

```json
[
  { "skill": "dialogue", "op": "chat_send", "params": { "text": "hello?" } },
  { "ok": false, "error": { "code": "E_GUEST_READONLY",
    "message": "Sign in to chat with Accra.", "retryable": false } }
]
```

---

## [FILE_LOCATIONS]

- Skill logic: `skills/dialogue_skill.md`
- GameAPI bridge: `src/game/GameAPI.ts`
- Agent runtime: `src/bootstrap/agent-runtime.ts`
- UI prompts: `src/ui/HUD.tsx`
- 3D scene: `src/r3f/GameCanvas.tsx`
- Game systems init: `src/bootstrap/game-init.ts`
- Firebase init: `src/bootstrap/firebase-init.ts`
- Game loop: `src/game/GameLoop.ts`
