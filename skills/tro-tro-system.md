---
name: tro-tro-system
version: 3.1.0
domain: trotro boarding & transit (real-symbol contract + real GameAPI bridge)
description: >
  Governs how AI agents handle Tro-tro interactions using ONLY functions
  that actually exist in lagos-life-ghana/src/game/. The [CONTRACT] lists
  exact exported TypeScript signatures from the source files; the [ROUTING]
  section maps every AI call to the file the GameAPI bridge routes it to.
  v3.1 closes the two flagged gaps IN SRC: the fare purchase now grants a
  real ticket item (grantOwnedItemId) and passenger/capacity state lives in
  a real service (TrotroService, capacity 14).
format: hybrid — [CONTRACT] real exports + [ROUTING] GameAPI bridge + [LOGIC] + [EXAMPLES]
contract_policy: zero invented names — every symbol below is copy-exact from src
supersedes: v3.0.0 (real-symbol rewrite; ticket + capacity were flagged
  not-in-src — both are now implemented in src and contracted here);
  v2.1.0 GridLocation spec — dropped: no grid type exists in src;
  v1.0.0 deep mechanics live in skills/tro-tro-adapter.ts
source_files:
  - src/game/Player/PlayerController.ts
  - src/game/Economy/Wallet.ts
  - src/game/World/NeighborhoodTrotro.ts
  - src/game/World/TrotroService.ts (NEW v3.1 — passenger/capacity state)
  - src/game/GameAPI.ts (NEW v3.1 — the routing bridge itself)
  - src/game/Player/InteractionSystem.ts (interact trigger)
  - src/game/Economy/EconomyManager.ts (canonical fare SKU + ticket grant)
adapter: skills/agent-adapter.ts#GameBindings + skills/tro-tro-adapter.ts
independence: callable alone; economy binding only for the fare debit
---

# Skill: Tro-Tro Boarding & Transit System

> **Naming note.** The brief referenced `src/game/World/trotro.ts`,
> `src/game/Economy/wallet.ts` and `src/game/Player/controller.ts`. The real
> files are **`NeighborhoodTrotro.ts`**, **`Wallet.ts`** and
> **`PlayerController.ts`** — case-sensitive, exact names below. Likewise,
> `deductCedis`, `deductBalance`, `triggerNPCDialogue`, `addToInventory` and
> `GridLocation` **do not exist anywhere in src/**; the real equivalents are
> contracted in this version (see the rename table at the end of [CONTRACT]).
> Since v3.1 the two former gaps are closed **in src itself**: a fare
> purchase grants the real item `trotro_ticket_osu_circle`, and
> passenger/capacity state is real (`src/game/World/TrotroService.ts`).
> `src/game/GameAPI.ts` is also real now — the bridge the [ROUTING] section
> describes is code, not prose.

## [CONTRACT] Real Exported Symbols (copy-exact from src)

The agent may ONLY interact through the following TypeScript signatures,
quoted exactly as exported by the codebase.

### `src/game/Player/PlayerController.ts`

```ts
export interface ColliderBox {
  id: string;
  minX: number; maxX: number;
  minZ: number; maxZ: number;
  height?: number;
}

export class PlayerController {
  public readonly position: THREE.Vector3;      // live world position
  public readonly velocity: THREE.Vector3;
  public rotationY: number;
  public isMoving: boolean;
  public isSprinting: boolean;

  constructor(inputManager: InputManager, spawnPosition = new THREE.Vector3(0, 0, 5.8), look?: PlayerLookOptions);

  public setJoystickInput(x: number, y: number): void;
  public setSprintState(active: boolean): void;
  public update(dt: number, cameraYaw: number, colliders: ColliderBox[]): void;
  public getForwardVector(): THREE.Vector3;
}
```

### `src/game/Economy/Wallet.ts`

```ts
export interface AddFundsParams {
  amount: number;
  category: TransactionCategory;
  description: string;
  sourceEntityId?: string;
  channel?: PaymentChannel;
  isIllegalOrigin?: boolean;
}

export interface RemoveFundsParams {
  amount: number;
  category: TransactionCategory;
  description: string;
  targetEntityId?: string;
  channel?: PaymentChannel;
}

export interface WalletValidationResult {
  success: boolean;
  error?: string;
  transaction: TransactionRecord | null;
  balanceAfter: number;
}

export type WalletChangeListener = (
  balance: number,
  transaction: TransactionRecord | null
) => void;

export class Wallet {
  constructor(enableFirebaseAutoSync = true);

  public getCashBalance(): number;
  public getMomoBalance(): number;
  public getBankBalance(): number;
  public getUnsecuredIllegalCash(): number;
  public getLifetimeEarned(): number;
  public getLifetimeSpent(): number;
  public getTransactions(): ReadonlyArray<TransactionRecord>;

  public canAfford(amount: number, channel: PaymentChannel = 'CASH'): boolean;
  public addFunds(params: AddFundsParams): WalletValidationResult;
  public removeFunds(params: RemoveFundsParams): WalletValidationResult;
  public receiveMoney(params: AddFundsParams): TransactionRecord | null;
  public spendMoney(params: RemoveFundsParams): TransactionRecord | null;

  public onBalanceChange(listener: WalletChangeListener): () => void;
}
```

### `src/game/World/NeighborhoodTrotro.ts`

```ts
export function buildTrotroStopAndVehicle(
  scene: THREE.Scene,
  colliders: ColliderBox[],
  interactables: InteractableTarget[]
): void;
```

Boot-time world builder (not an AI call). Its exact registered artifacts:

- Interactable `trotro_stop`: `position (9.0, 0.14, 4.9)`,
  `lookAtPosition (9.0, 0.14, 3.2)`, `radius 3.5`, `promptLabel 'Trotro'`,
  `interactionResponse 'Osu–Circle station — mate collecting fares.'`
- Colliders `ACC_PROP_001_SHELTER` (X 6.4–11.6, Z 5.45–7.6) and
  `ACC_TROTRO_001` (X 6.3–11.6, Z 1.45–3.65); van group `ACC_TROTRO_001`
  parked at world `(9.0, 2.55)` facing West, sliding door leaf at world
  `(9.84, 3.6)`

### Supporting real types (imported by the files above)

```ts
// src/game/Player/InteractionSystem.ts
export interface InteractableTarget {
  id: string; assetId: string; title: string;
  promptLabel: string; interactionResponse: string;
  position: THREE.Vector3; lookAtPosition?: THREE.Vector3;
  radius: number; mesh?: THREE.Object3D;
  onInteract?: (target: InteractableTarget) => void;
}
export class InteractionSystem {
  public getActiveTarget(): InteractableTarget | null;
  public triggerCurrentInteraction(): boolean;   // 250 ms cooldown enforced internally
  // ...
}

// src/game/Economy/EconomicTypes.ts
export type PaymentChannel = 'CASH' | 'MOMO_WALLET' | 'BANK';
export type TransactionCategory = 'WAGES' | 'JOB_PAYMENT' | 'SIDE_HUSTLE' | 'SALE'
  | 'REWARD' | 'RISKY_HUSTLE' | 'FOOD' | 'TRANSPORT' | 'PURCHASE' | 'FINE' | 'CONFISCATION';

// src/game/Economy/Transaction.ts
export interface TransactionRecord { /* id, amount, category, channel, description, ... */ }

// src/game/Economy/EconomyManager.ts
export interface EverydayExpenseOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly costGHS: number;
  readonly category: TransactionCategory;
  readonly locationAssetId: string;
  readonly interactableId: string;
  readonly grantOwnedItemId?: string;   // real owned-item grant on purchase
}

export const ACCRA_EVERYDAY_EXPENSES: Record<string, EverydayExpenseOption>;
//   EXP_TROTRO_FARE → { costGHS: 6.0, category: 'TRANSPORT',
//     interactableId: 'trotro_stop', grantOwnedItemId: 'trotro_ticket_osu_circle' }
export class EconomyManager {
  public canAfford(amountGHS: number, channel: PaymentChannel = 'CASH'): boolean;
  public purchaseEverydayExpense(expenseId: string): {
    success: boolean; message: string; transaction: TransactionRecord | null;
  };
  public getOwnershipFoundations(): Readonly<PlayerOwnershipFoundations>;
  //   .ownedItemIds gains 'trotro_ticket_osu_circle' on a successful fare purchase
  // ...
}

// src/game/World/TrotroService.ts  (NEW in src, v3.1)
export const TROTRO_VEHICLE_ID = 'ACC_TROTRO_001';
export const TROTRO_DEFAULT_CAPACITY = 14;
export const TROTRO_ROUTE_EXPENSE_ID = 'EXP_TROTRO_FARE';
export const TROTRO_TICKET_ITEM_ID = 'trotro_ticket_osu_circle';

export interface TrotroPassengerSnapshot {
  readonly vehicleId: string;
  readonly routeExpenseId: string;
  readonly ticketItemId: string;
  readonly currentPassengers: number;
  readonly capacity: number;
  readonly seatsAvailable: number;
  readonly isFull: boolean;
}

export class TrotroService {
  constructor(capacity?: number /* = TROTRO_DEFAULT_CAPACITY (14) */);
  public getCurrentPassengers(): number;
  public getCapacity(): number;
  public getSeatsAvailable(): number;
  public isFull(): boolean;
  public boardPassenger(): boolean;    // false → van full, mate refuses
  public alightPassenger(): boolean;   // false → van already empty
  public loadPassengers(count: number): number;
  public resetVehicle(): void;
  public getSnapshot(): TrotroPassengerSnapshot;
  public getCanonicalFareGHS(): number;
}

// src/game/GameAPI.ts  (NEW in src, v3.1 — the bridge itself, not prose)
export interface GameAPIOptions {
  economy?: EconomyManager;
  player?: PlayerController;
  input?: InputManager;
  interactions?: InteractionSystem;
  trotro?: TrotroService;
}
export class GameAPI {
  public readonly economy: EconomyManager;
  public readonly wallet: Wallet;
  public readonly player: PlayerController;
  public readonly input: InputManager;
  public readonly interactions: InteractionSystem;
  public readonly trotro: TrotroService;
  public get position(): THREE.Vector3;
  public get isSprinting(): boolean;
  // Every method delegates 1:1 to the routed target listed in [ROUTING].
}
export function createGameAPI(options?: GameAPIOptions): GameAPI;
```

### Rename table (old spec name → real symbol, effective v3.0.0)

| Invented name (dropped) | Real symbol the agent uses instead |
|---|---|
| `deductCedis(amount)` / `deductBalance(amount)` | `wallet.spendMoney({ amount, category: 'TRANSPORT', channel: 'CASH', description })` → `TransactionRecord \| null` |
| `addToInventory('tro-tro-ticket')` | **Real since v3.1:** `purchaseEverydayExpense('EXP_TROTRO_FARE')` grants `grantOwnedItemId: 'trotro_ticket_osu_circle'` into `ownership.ownedItemIds`; verify with `hasOwnedItem('trotro_ticket_osu_circle')` |
| `triggerNPCDialogue(npcId, dialogueKey)` | `interactions.triggerCurrentInteraction(): boolean` — surfaces the Mate's real `interactionResponse` line via `trotro_stop` |
| `getDistance(playerPos, objectPos)` | **No real export exists.** Distance = `player.position.distanceTo(target.position)` (`THREE.Vector3`), compared against `InteractableTarget.radius` |
| `GridLocation` | Not in src — world plane uses `THREE.Vector3` (unchanged since v3.0) |
| `TroTroState.capacity` / `currentPassengers` | **Real since v3.1:** `TrotroService` (`src/game/World/TrotroService.ts`) — `capacity 14`, `isFull()`, `boardPassenger(): boolean` |

## [ROUTING] GameAPI Bridge

The AI never imports `src/` directly. Every call crosses the **GameAPI
bridge** — as of v3.1 a real file: `src/game/GameAPI.ts`. Construct it at
boot with `createGameAPI({ economy, player, input, interactions, trotro })`
(hand it the live instances built in `src/main.ts`); every method then
delegates 1:1 to the owning system. Routing rules:

- **When the AI calls `spendMoney(params)`, the GameAPI bridge routes this to
  `Wallet.spendMoney` in `src/game/Economy/Wallet.ts`.**
- **When the AI calls `canAfford(amount, 'CASH')`, the GameAPI bridge routes
  this to `Wallet.canAfford` in `src/game/Economy/Wallet.ts`.**
- **When the AI calls `purchaseEverydayExpense('EXP_TROTRO_FARE')`, the
  GameAPI bridge routes this to `EconomyManager.purchaseEverydayExpense` in
  `src/game/Economy/EconomyManager.ts`** (which itself debits via
  `Wallet.spendMoney`, same file, and grants the ticket item via
  `grantOwnedItemId`).
- **When the AI calls `hasOwnedItem(itemId)` / `getOwnedItemIds()`, the
  GameAPI bridge routes this to `EconomyManager.getOwnershipFoundations`
  in `src/game/Economy/EconomyManager.ts`** (`.ownedItemIds`).
- **When the AI calls `boardPassenger()` / `alightPassenger()` /
  `isFull()` / `getSnapshot()`, the GameAPI bridge routes this to
  `TrotroService` in `src/game/World/TrotroService.ts`.**
- **When the AI reads `position` / calls `setJoystickInput(x, y)` /
  `setSprintState(active)`, the GameAPI bridge routes this to
  `PlayerController` in `src/game/Player/PlayerController.ts`.**
- **When the AI calls `triggerCurrentInteraction()`, the GameAPI bridge
  routes this to `InteractionSystem.triggerCurrentInteraction` in
  `src/game/Player/InteractionSystem.ts`** (250 ms cooldown, fires
  `onInteract` + the Mate's `interactionResponse`).
- **When the AI reads `getActiveTarget()`, the GameAPI bridge routes this to
  `InteractionSystem.getActiveTarget` in `src/game/Player/InteractionSystem.ts`.**
- `buildTrotroStopAndVehicle(...)` in `src/game/World/NeighborhoodTrotro.ts`
  is **boot-only**: the bridge reads its registered `trotro_stop` target and
  colliders, but the AI cannot call it.

| AI-facing call | Routed to | File |
|---|---|---|
| `getCashBalance()` | `Wallet.getCashBalance` | `src/game/Economy/Wallet.ts` |
| `canAfford(amount, 'CASH')` | `Wallet.canAfford` | `src/game/Economy/Wallet.ts` |
| `spendMoney(params)` | `Wallet.spendMoney` | `src/game/Economy/Wallet.ts` |
| `getTransactions()` | `Wallet.getTransactions` | `src/game/Economy/Wallet.ts` |
| `purchaseEverydayExpense('EXP_TROTRO_FARE')` | `EconomyManager.purchaseEverydayExpense` | `src/game/Economy/EconomyManager.ts` |
| `hasOwnedItem('trotro_ticket_osu_circle')` | `EconomyManager.getOwnershipFoundations().ownedItemIds` | `src/game/Economy/EconomyManager.ts` |
| `boardPassenger()` / `alightPassenger()` | `TrotroService.boardPassenger` / `.alightPassenger` | `src/game/World/TrotroService.ts` |
| `isFull()` / `getSnapshot()` | `TrotroService.isFull` / `.getSnapshot` | `src/game/World/TrotroService.ts` |
| `position` (read) | `PlayerController.position` | `src/game/Player/PlayerController.ts` |
| `setJoystickInput` / `setSprintState` | `PlayerController.*` | `src/game/Player/PlayerController.ts` |
| `triggerCurrentInteraction()` | `InteractionSystem.triggerCurrentInteraction` | `src/game/Player/InteractionSystem.ts` |
| `getActiveTarget()` | `InteractionSystem.getActiveTarget` | `src/game/Player/InteractionSystem.ts` |

## [LOGIC] Behavioral Instructions

1. **Proximity Check**: read `player.position` (THREE.Vector3) and compare
   against the `trotro_stop` `InteractableTarget` —
   `player.position.distanceTo(trotro_stop.position) < trotro_stop.radius`
   (3.5 m at `(9.0, 0.14, 4.9)`). The real, code-backed trigger is
   `interactions.getActiveTarget()?.id === 'trotro_stop'`; only then does the
   agent evaluate interaction.
2. **The 'Mate' Interaction**: 
   - Call `interactions.triggerCurrentInteraction()` (returns `boolean`;
     250 ms cooldown is enforced inside `InteractionSystem`). On `true` the
     Mate's canon line surfaces: 'Osu–Circle station — mate collecting
     fares.' — the bridge may layer the Accra-flavor variants ('Circle!
     Circle! Enter well!', 'Oga, move inside make we go!') on top as host
     copy; the code-backed line is the one in `interactionResponse`.
   - **Capacity** (real since v3.1): call `trotro.getSnapshot()` (or
     `trotro.isFull()`) BEFORE the fare gate. IF `isFull === true` the Mate
     refuses — 'No space! Next one!' — and boarding aborts BEFORE any
     `spendMoney` call. On acceptance `trotro.boardPassenger()` seats the
     passenger (`false` ⇒ full, treat as refusal); call
     `trotro.alightPassenger()` when transit ends; `trotro.resetVehicle()`
     when the van pulls away from the stop.
3. **Fare & Boarding Logic**:
   - IF player requests to board, CHECK `wallet.canAfford(fare, 'CASH')`
     (real signature: `canAfford(amount: number, channel?: PaymentChannel)`,
     defaults `'CASH'`).
   - IF YES: call `wallet.spendMoney({ amount: fare, category: 'TRANSPORT',
     channel: 'CASH', description: "Trotro fare (Mate's van)" })` — returns
     `TransactionRecord | null`; `null` → abort (bridge surfaces
     `E_INSUFFICIENT_FUNDS` / `E_INTERNAL`). Canonical ₵6 route: call
     `economy.purchaseEverydayExpense('EXP_TROTRO_FARE')` instead — one real
     call that validates, debits CASH, writes the `TRANSPORT` ledger row
     AND grants the real ticket item `trotro_ticket_osu_circle` into
     `ownership.ownedItemIds` (verify afterwards with
     `hasOwnedItem('trotro_ticket_osu_circle')`). Then trigger the boarding
     animation (host surfacing of `PlayerController.update` →
     `CharacterRig.updateAnimation`) and apply the position transit
     (adapter-owned `arriveAt` override — no teleport function exists in
     src).
   - IF NO: surface the Mate's refusal ('Oga, you no get change? Abeg shift
     make others enter.'), do NOT call `spendMoney`, player stays put. Real
     recovery: `JOB_TROTRO_MATE` (₵15) via the jobs flow.
- **Ordering is mandatory**: proximity (`getActiveTarget`) →
  `triggerCurrentInteraction` → capacity gate (`getSnapshot().isFull`) →
  `canAfford` → `spendMoney` / `purchaseEverydayExpense` →
  `boardPassenger` → animation → transit. Calling `spendMoney` without the
  Mate interaction first, or while the van `isFull()`, is a contract
  violation.

## [EXAMPLES] Successful Execution

- **Context**: Player at world `(9.0, 0, 4.5)` (inside the `trotro_stop`
  3.5 m radius). Fare = ₵6 canonical (read via `trotro.getCanonicalFareGHS()`).
  Balance read from `wallet.getCashBalance()` = 20. Van snapshot:
  `currentPassengers 12 / capacity 14`.
- **Agent Action**:
  1. `interactions.getActiveTarget()` → `trotro_stop`; then
     `interactions.triggerCurrentInteraction()` → `true` (Mate greets).
  2. `trotro.getSnapshot()` → `isFull: false` (seats available: 2).
  3. `wallet.canAfford(6, 'CASH')` → `true`.
  4. `economy.purchaseEverydayExpense('EXP_TROTRO_FARE')` → `success: true`
     — debits ₵6 CASH, writes the `TRANSPORT` ledger row, and grants
     `trotro_ticket_osu_circle` into `ownership.ownedItemIds`.
  5. `hasOwnedItem('trotro_ticket_osu_circle')` → `true` (ticket held).
  6. `trotro.boardPassenger()` → `true` (12 → 13 seated).
  7. Boarding animation plays; adapter-owned transit overrides the zone.
- **Result**: `wallet.getCashBalance()` = 14;
  `wallet.getTransactions()[0]` shows the `TRANSPORT` row;
  `getOwnedItemIds()` contains `trotro_ticket_osu_circle`; van snapshot
  `13/14`; player position now resolves to the destination zone.

```json
[
  { "skill": "dialogue", "op": "interact", "params": { "interactableId": "trotro_stop" } },
  { "ok": true, "result": { "handled": true,
    "responseLine": "Osu–Circle station — mate collecting fares." } },

  { "skill": "tro-tro", "op": "pay_and_board",
    "params": { "expenseId": "EXP_TROTRO_FARE", "routeId": "CIRCLE_TO_KANESHIE" } },
  { "ok": true, "result": { "phase": "BOARDED", "balanceAfterGHS": 14,
    "transaction": { "category": "TRANSPORT", "amount": -6, "channel": "CASH" },
    "ticketItemId": "trotro_ticket_osu_circle",
    "ticketOwned": true,
    "passengersAfter": 13, "capacity": 14 } }
]
```

## [EXAMPLES] Failed Execution

- **Context**: `wallet.getCashBalance()` = 2. Fare = ₵6
  (`trotro.getCanonicalFareGHS()`).
- **Agent Action**:
  1. `trotro.getSnapshot()` → `isFull: false` (capacity gate passes).
  2. `wallet.canAfford(6, 'CASH')` → `false`.
  3. Surface the Mate's refusal via the interaction channel.
  4. Abort boarding — **no `spendMoney` call is made**, no seat taken
     (`boardPassenger()` NOT called).
- **Result**: `wallet.getCashBalance()` still 2; `wallet.getTransactions()`
  unchanged; `hasOwnedItem('trotro_ticket_osu_circle')` still `false`;
  van snapshot unchanged (12/14); player remains at the stop; rejection
  dialogue played.

```json
[
  { "skill": "tro-tro", "op": "pay_and_board",
    "params": { "expenseId": "EXP_TROTRO_FARE", "routeId": "CIRCLE_TO_KANESHIE" } },
  { "ok": false, "error": { "code": "E_INSUFFICIENT_FUNDS", "retryable": false,
    "message": "Mate: 'Oga, you no get change? Abeg shift make others enter.'",
    "details": { "requiredGHS": 6, "cashGHS": 2 } } },

  { "skill": "economy", "op": "accept_work", "params": { "workId": "JOB_TROTRO_MATE" } },
  { "ok": true, "result": { "success": true, "message": "Collecting fares with the Mate (₵15)." } }
]
```

**Capacity refusal variant (E_VAN_FULL)**: same call when
`trotro.getSnapshot().isFull === true` →

```json
{ "ok": false, "error": { "code": "E_VAN_FULL", "retryable": true,
  "message": "Mate: 'No space! Next one!'",
  "details": { "currentPassengers": 14, "capacity": 14 } } }
```

Wait for `alightPassenger()` turnover at the next stop (van resets via
`resetVehicle()` when it pulls away), then retry the sequence.

**Agent recovery plan after the failure**: run `JOB_TROTRO_MATE` (₵15, 30 s
cooldown) at the same stop, then re-run the successful sequence once
`wallet.canAfford(trotro.getCanonicalFareGHS(), 'CASH')` returns `true`.

## Extended mechanics (adapter reference)

The v1.0.0 deep spec — Mate haggle rounds (max 2, −₵1 per round, base-fare
floor), the zone fare table (Osu hop ₵4 / Circle→37 ₵7 / Makola ₵8 /
Labadi ₵10, ×1.5 rush hour), and the "running alongside" door-chase mechanic
(sprint 7.3 m/s vs van 5.5 m/s, 2.2 m window held 1.2 s, miss past 3.5 m) —
remains in force as the **reference implementation**
[`skills/tro-tro-adapter.ts`](./tro-tro-adapter.ts), which composes only the
real symbols contracted above (`PlayerController`, `Wallet`,
`InteractionSystem`, `EconomyManager`). Haggle only ever lowers the fare
argument passed to `spendMoney` — it never bypasses the [LOGIC] ordering.
