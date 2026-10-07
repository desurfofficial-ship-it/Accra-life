---
name: tro-tro-system
version: 2.1.0
domain: trotro boarding & transit governance (mate dialogue, capacity gate, fare gate)
description: >
  Governs how AI agents handle Tro-tro interactions on the custom grid map:
  grid-distance proximity at the stop, the Mate's authentic Accra dialogue,
  capacity and fare checks, boarding with ticket issuance, and grid-cell
  transit to the destination zone.
format: hybrid — [CONTRACT] allowed tools & types + [LOGIC] behavior rules + [EXAMPLES]
map_architecture: custom grid — agents speak GridLocation only; world/GPS
  coordinates are adapter-internal and never appear in any op or result
supersedes: v2.0.0 (GPS/Vector3-flavored contract); v1.0.0 deep mechanics
  (haggle/chase/zone table) preserved in skills/tro-tro-adapter.ts
source_systems:
  - skills/tro-tro-adapter.ts (grid layer + boarding state machine)
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
interface GridLocation { x: number; z: number; zone: string; }
interface PlayerState { id: string; balance: number; position: GridLocation; inventory: string[]; }
interface TroTroState { id: string; route: string; currentStop: string; nextStop: string; fare: number; capacity: number; currentPassengers: number; stop: GridLocation; }
function getDistance(playerPos: GridLocation, objectPos: GridLocation): number
function deductBalance(amount: number): Promise<boolean>
function addToInventory(item: string): void
function triggerNPCDialogue(npcId: string, dialogueKey: string): void
```

Canonical station cell: `TROTRO_STATION_GRID = { x: 2, z: 4, zone: 'circle_station' }`.

### Repo symbol binding (spec name → live systems)

Every spec symbol maps onto code that already exists in the repo, plus
adapter-owned extensions implemented in `skills/tro-tro-adapter.ts` / the
host router. **The grid is the only agent-facing coordinate system**: the
adapter translates `GridLocation` ⇄ the repo's internal world XZ plane at the
`handleOp` boundary (zone-anchored mapping), so no op, param, or result ever
carries GPS/world coordinates.

| Spec symbol | Real repo binding | File | Notes |
|---|---|---|---|
| `GridLocation` | Adapter-owned grid layer over the repo's world plane; `zone` strings align with repo `LocationId`s — `'circle_station'` ↔ `'circle_trotro_stop'`, `'makola_market'` ↔ `'makola_market'`; `'kaneshie'` is an adapter-owned extension | `skills/tro-tro-adapter.ts`, `src/game/World/Locations.ts` | grid `(x, z)` are unit cells; the station cell is `{ x: 2, z: 4, zone: 'circle_station' }` |
| `PlayerState` | `PlayerController` (id/inventory) + `Wallet` (balance) | `src/game/Player/PlayerController.ts`, `src/game/Economy/Wallet.ts` | `position` is the agent-facing `GridLocation` (translated from the internal `THREE.Vector3`); `balance` = CASH channel; `inventory` = `ownership.ownedItemIds` |
| `TroTroState` | Van `ACC_TROTRO_001` + adapter-owned passenger state | `src/game/World/NeighborhoodTrotro.ts`, `skills/tro-tro-adapter.ts` | `currentStop`/`nextStop` are zone strings; `stop` carries the canonical station cell; capacity canon = **14 seats** (Sprinter); `currentPassengers` is adapter-owned |
| `getDistance` | Euclidean distance over grid cells — `Math.hypot(dx, dz)` on the two `GridLocation` values | `skills/tro-tro-adapter.ts` | measured in grid units; the internal XZ equivalent is the same metric `InteractionSystem` uses for radius checks |
| `deductBalance` | `Wallet.spendMoney({ category: 'TRANSPORT', channel: 'CASH' })`; canonical ₵6 signboard fare → `EconomyManager.purchaseEverydayExpense('EXP_TROTRO_FARE')` | `src/game/Economy/Wallet.ts`, `src/game/Economy/EconomyManager.ts` | `TransactionRecord \| null` result → boolean; **CASH-only** — the Mate takes no MoMo, no bank, no credit |
| `addToInventory` | `ownership.ownedItemIds.push('tro-tro-ticket')` | `src/game/Economy/EconomyManager.ts` (ownership) | `tro-tro-ticket` is an adapter-owned item id; the ticket is perishable and dropped on arrival |
| `triggerNPCDialogue` | `InteractionSystem.triggerCurrentInteraction()` / dialogue skill `interact` | `src/game/Player/InteractionSystem.ts` | `mate_01` is an adapter-owned NPC id; the Mate's canon today lives in the `trotro_stop` `interactionResponse` |
| position → next zone | `arriveAt(destination)` zone override — same mechanism as `movement.travel` | `skills/agent-adapter.ts#MovementSkill.travel` | destinations are zone strings (`'kaneshie'`, `'circle_station'`, reserved `'makola_market'` / `'labadi_beach'`); the adapter resolves the landing grid cell |

## [LOGIC] Behavioral Instructions
1. **Proximity Check**: The agent calculates the grid distance between the player's `GridLocation` and the Tro-tro station's `GridLocation` (`TROTRO_STATION_GRID = { x: 2, z: 4, zone: 'circle_station' }`). WHEN `getDistance` < 3 grid units, the agent evaluates interaction — and boarding logic **triggers when the player enters the `circle_station` zone** (`PlayerState.position.zone === 'circle_station'`), which is the authoritative trigger.
2. **The 'Mate' Interaction**: 
   - The NPC 'Mate' must initiate dialogue with authentic Accra flavor (e.g., 'Circle! Circle! Enter well!', 'Oga, move inside make we go!').
   - The agent must check `TroTroState.capacity`. If `currentPassengers >= capacity`, the Mate refuses entry and says 'No space! Next one!'.
3. **Fare & Boarding Logic**:
   - IF player requests to board, CHECK if `PlayerState.balance >= TroTroState.fare`.
   - IF YES: Call `deductBalance(fare)`. On success, call `addToInventory('tro-tro-ticket')`, trigger a 'boarding' animation, and update the player's `position` to the destination zone's `GridLocation` (`nextStop`).
   - IF NO: Trigger dialogue: 'Oga, you no get change? Abeg shift make others enter.' Do not allow boarding.

### Binding notes (how each rule executes against the repo)

- **Rule 1 — grid proximity.** `getDistance` runs on grid units; inside 3
  units the adapter guarantees the player is within the game's own 3.5 m
  interact radius at the station. Zone entry (`position.zone ===
  'circle_station'`) is the boarding trigger — grid distance alone only
  gates when the agent may *evaluate* interaction while navigating. A player
  in another zone (e.g. `makola_market`) is never boardable, no matter the
  distance reading.
- **Rule 2 — capacity.** When `currentPassengers >= capacity` the Mate's
  refusal ('No space! Next one!') ends the interaction with **no fare debit**;
  the van departs and the next one arrives on the adapter's 30 s cycle. The
  agent re-runs the grid proximity check for the new van rather than retrying
  immediately.
- **Rule 3 — fare gate.** `deductBalance` resolves `false` when the CASH
  channel cannot cover the fare (`E_INSUFFICIENT_FUNDS`, details carry
  `requiredGHS` / `cashGHS`); boarding is aborted exactly as the dialogue
  line demands — no partial payment, no IOU, no MoMo. On `true`, the
  'boarding' animation is the host surfacing of `CharacterRig.updateAnimation`
  while the agent writes the destination `GridLocation`; the ledger entry
  (`TRANSPORT` category) is the audit trail for the trip.
- **Ordering is mandatory**: grid proximity → zone entry → dialogue →
  capacity check → fare check → debit → ticket → animation → grid-cell
  transit. Skipping straight to `deductBalance` without the Mate's greeting
  is an agent violation of this contract.

## [EXAMPLES] Successful Execution
- **Context**: Player is at x: 1, z: 1 (zone: 'makola_market'). The Tro-tro station is at x: 2, z: 4 (zone: 'circle_station'). Fare is 5 Cedis (route `circle_station` → `kaneshie`). Player balance is 20 Cedis.
- **Agent Action**: 
  1. Calculate the grid distance: `getDistance({x:1, z:1, zone:'makola_market'}, {x:2, z:4, zone:'circle_station'})` = √10 ≈ 3.16 units — outside the 3-unit radius, so navigate the player toward the station.
  2. When the player's `GridLocation` enters the `circle_station` zone (e.g. position `{ x: 2, z: 4, zone: 'circle_station' }`), boarding logic triggers: call `triggerNPCDialogue('mate_01', 'greeting_circle')`.
  3. Call `deductBalance(5)`.
  4. Call `addToInventory('tro-tro-ticket')`.
  5. Update `PlayerState.position` to the destination zone: `{ x: 5, z: 2, zone: 'kaneshie' }`.
- **Result**: Player successfully travels, balance is 15, inventory updated, position zone is now 'kaneshie'.

Illustrative envelope trace (`CIRCLE_TO_KANESHIE` is an adapter-owned route
extension; ₵5 sits under the canonical ₵6 signboard fare):

```json
[
  { "skill": "movement", "op": "move_to",
    "params": { "target": { "x": 2, "z": 4, "zone": "circle_station" } } },
  { "ok": true, "result": { "arrived": true, "position": { "x": 2, "z": 4, "zone": "circle_station" } } },

  { "skill": "dialogue", "op": "interact", "params": { "interactableId": "trotro_stop" } },
  { "ok": true, "result": { "handled": true, "responseLine": "Circle! Circle! Enter well!" } },

  { "skill": "tro-tro", "op": "pay_and_board",
    "params": { "amountGHS": 5, "routeId": "CIRCLE_TO_KANESHIE" } },
  { "ok": true, "result": { "phase": "BOARDED", "ticket": "tro-tro-ticket",
    "balanceAfterGHS": 15, "position": { "x": 5, "z": 2, "zone": "kaneshie" } } },

  { "skill": "economy", "op": "get_transactions", "params": { "limit": 1 } },
  { "ok": true, "result": [
    { "category": "TRANSPORT", "description": "Trotro fare circle_station → kaneshie (Mate's van)",
      "amount": -5, "channel": "CASH" } ] }
]
```

## [EXAMPLES] Failed Execution
- **Context**: Player is at x: 2, z: 4, zone: 'circle_station' (already inside the station zone). Fare is 5 Cedis. Player balance is 2 Cedis.
- **Agent Action**: 
  1. Zone entry satisfied — evaluate balance < fare.
  2. Call `triggerNPCDialogue('mate_01', 'insufficient_funds')`.
  3. Abort boarding sequence.
- **Result**: Player remains at x: 2, z: 4 (zone: 'circle_station'), no balance deducted, authentic rejection dialogue played.

Illustrative envelope trace:

```json
[
  { "skill": "tro-tro", "op": "pay_and_board",
    "params": { "amountGHS": 5, "routeId": "CIRCLE_TO_KANESHIE" } },
  { "ok": false, "error": { "code": "E_INSUFFICIENT_FUNDS", "retryable": false,
    "message": "Mate: 'Oga, you no get change? Abeg shift make others enter.'",
    "details": { "requiredGHS": 5, "cashGHS": 2,
                 "position": { "x": 2, "z": 4, "zone": "circle_station" } } } },

  { "skill": "economy", "op": "accept_work", "params": { "workId": "JOB_TROTRO_MATE" } },
  { "ok": true, "result": { "success": true, "message": "Collecting fares with the Mate (₵15)." } }
]
```

**Agent recovery plan after the failure**: earn honestly first —
`JOB_TROTRO_MATE` (₵15, 30 s cooldown, Energy ≥ 15 / Hunger ≥ 10) pays more
than double the fare at the same stop — then re-run the successful sequence
once `balance >= fare`. The van cycle returns in 30 s; the agent re-runs the
grid proximity check for the new van.

## Extended mechanics (adapter reference)

The v1.0.0 deep spec — Mate haggle rounds (max 2, −₵1 per round, base-fare
floor), the zone fare table (Osu hop ₵4 / Circle→37 ₵7 / Makola ₵8 /
Labadi ₵10, ×1.5 rush hour), and the "running alongside" door-chase mechanic
(sprint 7.3 m/s vs van 5.5 m/s, 2.2 m window held 1.2 s, miss past 3.5 m) —
remains in force as the **reference implementation**
[`skills/tro-tro-adapter.ts`](./tro-tro-adapter.ts). All of it runs on the
adapter's internal world plane and is invisible to agents: every op crosses
the grid ⇄ world translation at the `handleOp` boundary. This file's simpler
grid-based capacity/fare gate is the agent-facing contract; the adapter adds
the negotiation layer on top without contradicting it (a haggle only ever
lowers `TroTroState.fare` before Rule 3 runs).
