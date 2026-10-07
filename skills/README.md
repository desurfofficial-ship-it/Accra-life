# Lagos Life Ghana — Agent Skill Layer

Main-agent orchestration protocol for the three independently callable skills:

| Skill file | Domain | Extracted from |
|---|---|---|
| [`movement_skill.md`](./movement_skill.md) | Locomotion, approach, trotro travel | `src/game/Player/*`, `src/game/World/Locations.ts` |
| [`dialogue_skill.md`](./dialogue_skill.md) | Interactions, NPC talk, location chat | `src/game/Player/InteractionSystem.ts`, `src/game/Multiplayer/LocationChatManager.ts` |
| [`economy_skill.md`](./economy_skill.md) | Wallet, jobs, hustles, crime heat, housing spend | `src/game/Economy/*`, `src/game/Jobs/*`, `src/game/Crime/HeatSystem.ts`, `src/game/Home/HomeSystem.ts` |

These skills factor the game's hardcoded interaction prompts (`promptLabel` /
`interactionResponse` on every vendor, NPC, station and door) into a uniform
contract so an LLM main agent can drive the character without touching render
or systems code directly. The TypeScript surface the skills wrap is declared in
[`agent-adapter.ts`](./agent-adapter.ts).

---

## 1. Architecture

```
                 ┌────────────────────────────┐
                 │          Main Agent        │
                 │  (LLM planner / orchestr.) │
                 └─────────┬──────────────────┘
                           │  JSON call envelope (§2)
                           ▼
                 ┌────────────────────────────┐
                 │      AgentSkillAdapter     │   skills/agent-adapter.ts
                 │  movement │ dialogue │ economy
                 └─────┬──────────┬─────────┬─┘
                       ▼          ▼         ▼
              PlayerController  InteractionSystem + LocationChatManager
              Locations/Trotro  Firestore /location_chats
                                 EconomyManager + Wallet + JobManager
                                 HeatSystem + NeedsSystem + HomeSystem
```

Rules of engagement:

1. **Skills are the only surface.** The main agent never imports game classes;
   every capability goes through one of the three skill files' operations.
2. **One envelope per operation.** Operations are atomic from the agent's view;
   multi-step flows (e.g. a 3-step job) are driven by repeated `*_advance` calls.
3. **State reads are cheap and side-effect free.** `get_state` style ops should
   be used between every mutating call to re-anchor the agent's world model.
4. **Preconditions live in the game, not the prompt.** Cooldowns, requirements,
   funds and bounds are enforced by the systems — the skill returns typed
   errors the agent must react to, never guess around.

---

## 2. Call Envelope (JSON)

### Request

```json
{
  "v": 1,
  "requestId": "req_01HABC...",
  "skill": "movement | dialogue | economy",
  "op": "move_to",
  "params": { "target": { "x": 8.5, "z": -6.9 }, "mode": "walk" },
  "context": {
    "sessionId": "run-2026-10-07-01",
    "playerUid": "uid-or-null-for-guest",
    "issuedAtMs": 1759776000000
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `v` | `1` | Envelope schema version. Reject others with `E_BAD_ENVELOPE`. |
| `requestId` | string | UUID-ish; echoed back for correlation. |
| `skill` | enum | Must match a skill file in this folder. |
| `op` | string | Operation id, namespaced per skill (see each skill's ops table). |
| `params` | object | Per-op schema defined in the skill file. Unknown keys → `E_INVALID_PARAM`. |
| `context.playerUid` | string\|null | `null` = anonymous guest (dialogue sends blocked, cloud sync off). |

### Response

```json
{
  "v": 1,
  "requestId": "req_01HABC...",
  "ok": true,
  "result": { "arrived": true, "locationId": "osu_waakye_joint" },
  "error": null
}
```

On failure `ok:false` and `error` is populated:

```json
{
  "v": 1,
  "requestId": "req_01HABC...",
  "ok": false,
  "result": null,
  "error": {
    "code": "E_INSUFFICIENT_FUNDS",
    "message": "Not enough cash for Hot Waakye (requires ₵12.00).",
    "retryable": false,
    "details": { "requiredGHS": 12, "cashGHS": 3.5, "expenseId": "EXP_WAAKYE_MEAL" }
  }
}
```

### Shared error codes

| Code | Meaning | Typical agent reaction |
|---|---|---|
| `E_BAD_ENVELOPE` | Malformed request (version/skill/op unknown). | Fix envelope; do not retry as-is. |
| `E_INVALID_PARAM` | Param missing, wrong type, or out of range. | Correct params. |
| `E_UNKNOWN_ID` | Unknown interactable / job / hustle / expense / tier / location id. | Re-list via the skill's `list_*` op. |
| `E_NOT_AT_LOCATION` | Op requires standing in a zone or within interact radius. | `movement.move_to` / `approach_interactable` first. |
| `E_COOLDOWN` | Op still cooling down. | Wait `details.retryAfterMs`. |
| `E_RATE_LIMITED` | Client-side throttle (e.g. chat 1 msg / 1.5 s). | Wait `details.retryAfterMs`. |
| `E_INSUFFICIENT_FUNDS` | Wallet channel cannot cover cost. | Earn first (`economy.accept_job`). |
| `E_REQUIREMENTS_UNMET` | Needs/traits gate failed (e.g. energy < min). | Recover (recovery action, sleep, eat) then retry. |
| `E_BUSY` | Conflicting active work / placement mode. | `cancel_*` or finish current activity. |
| `E_GUEST_READONLY` | Anonymous guest attempting a write (chat send). | Sign in, or skip social ops. |
| `E_ARRESTED` | Police arrest interrupted the flow. | Read `details.arrest`, pay fine, change behavior. |
| `E_WORLD_BOUNDS` | Target outside walkable bounds (X ±25, Z ±17.2). | Clamp target into bounds. |
| `E_STORE_FULL` | Furniture slots exhausted for current housing tier. | Upgrade tier or sell items. |
| `E_INTERNAL` | Unexpected system failure. | Retry once, then report. |

---

## 3. Routing table (intent → skill.op)

| Agent intent | Route |
|---|---|
| "Where am I / what's around?" | `movement.get_state` → `dialogue.list_interactables` |
| "Go to the waakye joint" | `movement.approach_interactable("food_vendor")` |
| "Talk to Kojo" | `movement.approach_interactable("npc_male_001")` → `dialogue.interact` |
| "Get to Makola Market" | `movement.travel("makola_market")` (auto-pays fare via economy) |
| "Earn money" | `economy.list_jobs` → `economy.accept_job` → loop `economy.advance_work` at each step target |
| "Buy waakye" | stand at `food_vendor` → `economy.purchase_expense("EXP_WAAKYE_MEAL")` |
| "Say something in location chat" | `dialogue.chat_send` (1–500 chars, signed-in only) |
| "Check police heat" | `economy.get_heat` |
| "Upgrade my room" | `economy.housing_upgrade` (uses wallet `canAfford`/`spend` callbacks) |
| "Recover energy for free" | stand in a zone → `economy.recovery_action(<zone id>)` |

---

## 4. Concurrency & conflict rules

1. **Movement is exclusive.** `move_to` cancels any prior in-flight `move_to`.
   Placement mode (housing ghost) must be inactive or movement ops return `E_BUSY`.
2. **One legal job OR one side hustle at a time** (`JobManager` holds a single
   active slot; `getActiveJob()` / `getActiveHustle()` never both populated by
   the accept flow). Accepting while busy → `E_BUSY` with `details.activeWorkId`.
   Illegal hustles use the same single slot via `HeatSystem`.
3. **Arrest preempts everything.** On `E_ARRESTED`, in-flight work is cancelled,
   illicit cash is confiscated and the fine is charged. The agent must re-read
   `economy.get_wallet` and `economy.get_heat` before planning further risk.
4. **Economy gates movement.** Travel and fare-gated ops validate funds first;
   on `E_INSUFFICIENT_FUNDS` the agent should route to earning before retrying.
5. **Dialogue is always available** and independent of work state; chat send is
   additionally throttled (1.5 s) and length-capped (500 chars) client-side.
6. **No order inversion within a job.** Steps must be advanced at their own
   `targetInteractableId`; advancing at the wrong target is a silent no-op
   (`handled:false`) — re-check `economy.get_active_work` instead of repeating.

---

## 5. Security & integrity notes

- `senderId` in chat is forced to `request.auth.uid` by `firestore.rules`;
  the agent cannot impersonate players, and messages are append-only.
- `Wallet.addFunds` rejects non-finite, ≤ 0, or > ₵5,000 single credits and
  enforces category whitelists — the agent cannot mint "magic money".
- Illegal-origin income is flagged `isIllegalOrigin:true` (category
  `RISKY_HUSTLE`) and lands in **unsecured** cash that police can confiscate
  on arrest (`CONFISCATION`), separate from lawful balances.
- Cloud writes for wallet/home/needs require signed-in accounts (verified-email
  or anonymous) per `firestore.rules`; guests degrade to local persistence.
- The travel modal (`index.html#travelBackdrop`) and the reserved destination
  ids `makola_market` / `labadi_beach` are **UI-shell stage**: long-distance
  travel op exists in the movement skill but currently behaves as fare-payment
  + location override until the teleport landing zones ship.

---

## 6. Adapter wiring

`skills/agent-adapter.ts` declares the TypeScript interfaces binding each skill
to the live systems:

- `MovementSkill` ← `PlayerController` + `InputManager` + `Locations`
- `DialogueSkill` ← `InteractionSystem` + `LocationChatManager`
- `EconomySkill` ← `EconomyManager` + `Wallet` + `JobManager` + `HeatSystem` +
  `NeedsSystem` + `HomeSystem`

Host integration is one call: `createSkills(bindings)` receives the constructed
game systems and returns the three skill objects that (de)serialize the JSON
envelope. See the header of `agent-adapter.ts` for the binding contract.
