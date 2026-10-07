---
name: tro-tro-system
version: 2.0.0
domain: trotro boarding & transit governance (mate dialogue, capacity gate, fare gate)
description: >
  Governs how AI agents handle Tro-tro interactions: proximity evaluation at
  the stop, the Mate's authentic Accra dialogue, capacity and fare checks,
  boarding with ticket issuance, and position transit to the next zone.
format: hybrid — [CONTRACT] allowed tools & types + [LOGIC] behavior rules + [EXAMPLES]
supersedes: v1.0.0 (deep spec for haggle rounds / door chase / zone-fare table —
  mechanics preserved in skills/tro-tro-adapter.ts, history commit 3ca8aa7)
source_systems:
  - src/game/World/NeighborhoodTrotro.ts
  - src/game/Player/PlayerController.ts
  - src/game/Player/InteractionSystem.ts
  - src/game/Economy/Wallet.ts
  - src/game/Economy/EconomyManager.ts
adapter: skills/agent-adapter.ts#TroTroSystem + skills/tro-tro-adapter.ts
independence: callable alone; economy binding only for the fare debit
---

# Skill: Tro-Tro Boarding & Transit System

## [CONTRACT] Allowed Tools & Types
The agent may ONLY interact with the following TypeScript interfaces and functions from the game state:

```ts
interface PlayerState { id: string; balance: number; position: Vector3; inventory: string[]; }
interface TroTroState { id: string; route: string; currentStop: string; nextStop: string; fare: number; capacity: number; currentPassengers: number; }
function getDistance(playerPos: Vector3, objectPos: Vector3): number
function deductBalance(amount: number): Promise<boolean>
function addToInventory(item: string): void
function triggerNPCDialogue(npcId: string, dialogueKey: string): void
```

### Repo symbol binding (spec name → live systems)

Every spec symbol above maps onto code that already exists in the repo, plus
adapter-owned extensions declared here and implemented in
`skills/tro-tro-adapter.ts` / the host router. The agent never touches `src/`
directly — this table is the translation layer.

| Spec symbol | Real repo binding | File | Notes |
|---|---|---|---|
| `PlayerState` | `PlayerController` (id/position/inventory) + `Wallet` (balance) | `src/game/Player/PlayerController.ts`, `src/game/Economy/Wallet.ts` | `position` is a live `THREE.Vector3`; `balance` = CASH channel (`getCashBalance()`); `inventory` = `ownership.ownedItemIds` |
| `TroTroState` | Van `ACC_TROTRO_001` + adapter-owned passenger/capacity state | `src/game/World/NeighborhoodTrotro.ts`, `skills/tro-tro-adapter.ts` | repo van is stationary scenery at world `(9.0, 2.55)` facing West; capacity canon = **14 seats** (Sprinter); `currentPassengers` is adapter-owned |
| `getDistance` | Horizontal `Math.hypot(dx, dz)` — the same XZ metric `InteractionSystem` uses for its radius checks | `src/game/Player/InteractionSystem.ts` | Y is ignored (flat Accra) |
| `deductBalance` | `Wallet.spendMoney({ category: 'TRANSPORT', channel: 'CASH' })`; canonical ₵6 signboard fare → `EconomyManager.purchaseEverydayExpense('EXP_TROTRO_FARE')` | `src/game/Economy/Wallet.ts`, `src/game/Economy/EconomyManager.ts` | `TransactionRecord \| null` result → boolean; **CASH-only** — the Mate takes no MoMo, no bank, no credit |
| `addToInventory` | `ownership.ownedItemIds.push('tro-tro-ticket')` | `src/game/Economy/EconomyManager.ts` (ownership) | `tro-tro-ticket` is a new adapter-owned item id; the ticket is perishable and dropped on arrival |
| `triggerNPCDialogue` | `InteractionSystem.triggerCurrentInteraction()` / dialogue skill `interact` | `src/game/Player/InteractionSystem.ts` | `mate_01` is a new adapter-owned NPC id; the Mate's canon today lives in the `trotro_stop` `interactionResponse` ("Osu–Circle station — mate collecting fares.") |
| position → next zone | `arriveAt(destination)` location override — same mechanism as `movement.travel` | `skills/agent-adapter.ts#MovementSkill.travel` | reserved destinations `makola_market` / `labadi_beach`; `circle`, `kaneshie`, `37_station` are adapter-owned extensions following the same pattern |

## [LOGIC] Behavioral Instructions
1. **Proximity Check**: WHEN `getDistance` between player and Tro-tro stop is < 3 meters, the agent evaluates interaction.
2. **The 'Mate' Interaction**: 
   - The NPC 'Mate' must initiate dialogue with authentic Accra flavor (e.g., 'Circle! Circle! Enter well!', 'Oga, move inside make we go!').
   - The agent must check `TroTroState.capacity`. If `currentPassengers >= capacity`, the Mate refuses entry and says 'No space! Next one!'.
3. **Fare & Boarding Logic**:
   - IF player requests to board, CHECK if `PlayerState.balance >= TroTroState.fare`.
   - IF YES: Call `deductBalance(fare)`. On success, call `addToInventory('tro-tro-ticket')`, trigger a 'boarding' animation, and update the player's `position` to the next zone.
   - IF NO: Trigger dialogue: 'Oga, you no get change? Abeg shift make others enter.' Do not allow boarding.

### Binding notes (how each rule executes against the repo)

- **Rule 1 — proximity.** The spec's 3 m gate is stricter than the repo's
  `trotro_stop` interactable radius (3.5 m at `(9.0, 0.14, 4.9)`), so inside
  3 m the agent is guaranteed to be inside the game's own radius. The agent
  must also be standing inside `circle_trotro_stop` bounds (X 5.5–12.0,
  Z 4.0–12.0) — `getLocationAt(x, z).id` must resolve to
  `circle_trotro_stop` before any boarding op, otherwise `E_NOT_AT_LOCATION`.
- **Rule 2 — capacity.** When `currentPassengers >= capacity` the Mate's
  refusal ('No space! Next one!') ends the interaction with **no fare debit**;
  the van departs and the next one arrives on the adapter's 30 s cycle. The
  agent must re-run the proximity check for the new van rather than retrying
  immediately.
- **Rule 3 — fare gate.** `deductBalance` resolves `false` when the CASH
  channel cannot cover the fare (`E_INSUFFICIENT_FUNDS`, details carry
  `requiredGHS` / `cashGHS`); in that state boarding is aborted exactly as the
  dialogue line demands — no partial payment, no IOU, no MoMo. On `true`, the
  'boarding' animation is the host surfacing of
  `CharacterRig.updateAnimation` while the agent calls the position override;
  the ledger entry (`TRANSPORT` category) is the audit trail for the trip.
- **Ordering is mandatory**: dialogue → capacity check → fare check → debit →
  ticket → animation → position update. Skipping straight to `deductBalance`
  without the Mate's greeting is an agent violation of this contract.

## [EXAMPLES] Successful Execution
- **Context**: Player is at 'Kaneshie' stop. Target route is 'Circle'. Fare is 5 Cedis. Player balance is 20 Cedis.
- **Agent Action**: 
  1. Call `triggerNPCDialogue('mate_01', 'greeting_circle')`.
  2. Call `deductBalance(5)`.
  3. Call `addToInventory('tro-tro-ticket')`.
  4. Update `PlayerState.position` to 'Circle'.
- **Result**: Player successfully travels, balance is 15, inventory updated.

Illustrative envelope trace (`KANESHIE_TO_CIRCLE` is an adapter-owned route
extension; ₵5 sits under the canonical ₵6 Osu–Circle signboard fare):

```json
[
  { "skill": "movement", "op": "approach_interactable",
    "params": { "interactableId": "trotro_stop" } },
  { "ok": true, "result": { "arrived": true, "locationId": "circle_trotro_stop" } },

  { "skill": "dialogue", "op": "interact", "params": { "interactableId": "trotro_stop" } },
  { "ok": true, "result": { "handled": true, "responseLine": "Circle! Circle! Enter well!" } },

  { "skill": "tro-tro", "op": "pay_and_board",
    "params": { "amountGHS": 5, "routeId": "KANESHIE_TO_CIRCLE" } },
  { "ok": true, "result": { "phase": "BOARDED", "ticket": "tro-tro-ticket",
    "balanceAfterGHS": 15, "position": "Circle" } },

  { "skill": "economy", "op": "get_transactions", "params": { "limit": 1 } },
  { "ok": true, "result": [
    { "category": "TRANSPORT", "description": "Trotro fare Kaneshie → Circle (Mate's van)",
      "amount": -5, "channel": "CASH" } ] }
]
```

## [EXAMPLES] Failed Execution
- **Context**: Player balance is 2 Cedis. Fare is 5 Cedis.
- **Agent Action**: 
  1. Evaluate balance < fare.
  2. Call `triggerNPCDialogue('mate_01', 'insufficient_funds')`.
  3. Abort boarding sequence.
- **Result**: Player remains at stop, no balance deducted, authentic rejection dialogue played.

Illustrative envelope trace:

```json
[
  { "skill": "tro-tro", "op": "pay_and_board",
    "params": { "amountGHS": 5, "routeId": "KANESHIE_TO_CIRCLE" } },
  { "ok": false, "error": { "code": "E_INSUFFICIENT_FUNDS", "retryable": false,
    "message": "Mate: 'Oga, you no get change? Abeg shift make others enter.'",
    "details": { "requiredGHS": 5, "cashGHS": 2 } } },

  { "skill": "economy", "op": "accept_work", "params": { "workId": "JOB_TROTRO_MATE" } },
  { "ok": true, "result": { "success": true, "message": "Collecting fares with the Mate (₵15)." } }
]
```

**Agent recovery plan after the failure**: earn honestly first —
`JOB_TROTRO_MATE` (₵15, 30 s cooldown, Energy ≥ 15 / Hunger ≥ 10) pays more
than double the fare at the same stop — then re-run the successful sequence
once `balance >= fare`. The van cycle returns in 30 s; the agent re-runs the
proximity check for the new van.

## Extended mechanics (adapter reference)

The v1.0.0 deep spec — Mate haggle rounds (max 2, −₵1 per round, base-fare
floor), the zone fare table (Osu hop ₵4 / Circle→37 ₵7 / Makola ₵8 /
Labadi ₵10, ×1.5 rush hour), and the "running alongside" door-chase mechanic
(sprint 7.3 m/s vs van 5.5 m/s, 2.2 m window held 1.2 s, miss past 3.5 m) —
remains in force as the **reference implementation**
[`skills/tro-tro-adapter.ts`](./tro-tro-adapter.ts). This file's simpler
capacity/fare gate is the agent-facing contract; the adapter adds the
negotiation layer on top without contradicting it (a haggle only ever lowers
`TroTroState.fare` before Rule 3 runs).
