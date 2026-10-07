---
name: tro-tro-system
version: 4.3.0
domain: trotro boarding & transit (GameAPI five-method contract on the
  live custom grid map)
description: >
  Governs how AI agents board the Accra trotro through the live GameAPI
  bridge (window.GameAPI, wired in src/main.ts startGame()). The [CONTRACT]
  is the owner-issued five-method surface — every call is a real method on
  src/game/GameAPI.ts, runtime smoke-tested. The [ROUTING] section maps
  each method to the src/game/ file that actually executes it.
format: hybrid — [CONTRACT] GameAPI methods + [ROUTING] + [LOGIC] + [EXAMPLES] (TypeScript)
contract_policy: five-method surface, copy-exact from src/game/GameAPI.ts
supersedes: v4.2.0 (map layer — unchanged; v4.3 completes the venue
  migration: momo_agent / susu_collector / chale_wote_panel moved onto
  canonical GridMap anchors, and the user's InteriorFurniture + BeachProps
  GLB packs are mounted into StreetCanvas);
  v4.2 [E]-key Mate panel routing + provision/waakye/NPC cell anchors +
  systems-layer render pause — unchanged;
  v4.0.0 five-method contract — unchanged;
  v3.x real-symbol rewrites; v2.x GridLocation/GPS specs — dropped;
  v1.0.0 deep mechanics live in skills/tro-tro-adapter.ts
source_files:
  - src/game/GameAPI.ts (the bridge — live at window.GameAPI)
  - src/game/Economy/Wallet.ts (canAfford / spendMoney)
  - src/game/Economy/EconomyManager.ts (hasOwnedItem → ownership)
  - src/game/World/TrotroService.ts (isTrotroFull / boardPassenger)
  - src/game/World/GridMap.ts (canonical 5x5 grid: cells, districts,
    zone->LocationId, TROTRO_STATION_GRID, TROTRO_DESTINATIONS,
    PROVISION_STORE_ANCHOR, FOOD_VENDOR_ANCHOR, MOMO_AGENT_ANCHOR,
    SUSU_COLLECTOR_ANCHOR, CHALE_WOTE_ANCHOR)
  - src/r3f/StreetCanvas.tsx + src/r3f/TroTroBoarding.tsx (the visible
    custom map world — avatar, station, boarding panel, [E] listener)
  - src/main.ts#handleWorldTargetInteracted ([E] key → TROTRO_BOARD_EVENT)
adapter: skills/agent-adapter.ts#GameBindings + skills/tro-tro-adapter.ts
independence: callable alone; needs only the five methods below
---

# Skill: Tro-Tro Boarding & Transit System

> **Surface note.** The agent talks to the live bridge instance
> (`window.GameAPI`, constructed in `src/main.ts` `startGame()`). The
> brief's guessed file names (`trotro.ts`, `wallet.ts`, `controller.ts`)
> are actually **`NeighborhoodTrotro.ts`**, **`Wallet.ts`** and
> **`PlayerController.ts`**. `deductCedis`, `deductBalance`,
> `addToInventory` and `triggerNPCDialogue` do not exist anywhere in src —
> the five real methods below replace them all.

## [CONTRACT] Allowed GameAPI Methods (copy-exact from src/game/GameAPI.ts)

```ts
// src/game/GameAPI.ts — wired live as window.GameAPI
gameAPI.canAfford(amount: number, channel: 'CASH'): boolean;

gameAPI.spendMoney(params: {
  amount: number;
  description: string;
  channel: 'CASH';
}): TransactionRecord | null;   // null ⇒ debit refused (insufficient funds)

gameAPI.hasOwnedItem('trotro_ticket_osu_circle'): boolean;

gameAPI.isTrotroFull(): boolean;    // true ⇒ mate refuses ("No space! Next one!")

gameAPI.boardPassenger(): boolean;  // false ⇒ van filled between checks
```

No other call is part of this skill's contract. (The bridge exposes more —
`getSnapshot`, `getCashBalance`, `purchaseEverydayExpense`,
`triggerCurrentInteraction`, `alightPassenger`, … — for the host and the
other skills; see [ROUTING] for what the five above hit.)

## [ROUTING] Where Each Method Really Executes

The AI never imports `src/` directly. `window.GameAPI` is constructed at
boot with the live instances; every method delegates 1:1:

- **When the AI calls `gameAPI.canAfford(5, 'CASH')`, the GameAPI bridge
  routes this to `Wallet.canAfford` in `src/game/Economy/Wallet.ts`.**
- **When the AI calls `gameAPI.spendMoney({ amount, description,
  channel: 'CASH' })`, the GameAPI bridge routes this to
  `Wallet.spendMoney` in `src/game/Economy/Wallet.ts`** — the bridge
  applies `category: 'TRANSPORT'` when it is omitted, so the ledger row is
  always a fare row.
- **When the AI calls `gameAPI.hasOwnedItem('trotro_ticket_osu_circle')`,
  the GameAPI bridge routes this to
  `EconomyManager.getOwnershipFoundations().ownedItemIds` in
  `src/game/Economy/EconomyManager.ts`.**
- **When the AI calls `gameAPI.isTrotroFull()`, the GameAPI bridge routes
  this to `TrotroService.isFull` in `src/game/World/TrotroService.ts`
  (capacity 14).**
- **When the AI calls `gameAPI.boardPassenger()`, the GameAPI bridge
  routes this to `TrotroService.boardPassenger` in
  `src/game/World/TrotroService.ts`.**

| AI-facing call | Routed to | File |
|---|---|---|
| `gameAPI.canAfford(amount, 'CASH')` | `Wallet.canAfford` | `src/game/Economy/Wallet.ts` |
| `gameAPI.spendMoney({amount, description, channel: 'CASH'})` | `Wallet.spendMoney` (bridge adds `category: 'TRANSPORT'`) | `src/game/Economy/Wallet.ts` |
| `gameAPI.hasOwnedItem('trotro_ticket_osu_circle')` | `EconomyManager.getOwnershipFoundations().ownedItemIds` | `src/game/Economy/EconomyManager.ts` |
| `gameAPI.isTrotroFull()` | `TrotroService.isFull` (capacity 14) | `src/game/World/TrotroService.ts` |
| `gameAPI.boardPassenger()` | `TrotroService.boardPassenger` | `src/game/World/TrotroService.ts` |

Passenger turnover is automatic: the adapter seats the player on
`board()` and frees seats when the van cycle resets
(`skills/tro-tro-adapter.ts`), and every seat change is persisted into the
`EconomyPersistence` snapshot via `EconomyManager.bindTrotroPassengerState`.

## [ROUTING] The Live Custom Map (v4.2)

The game world is the custom 5x5 Accra grid (`src/r3f`, mounted in
`StreetCanvas.tsx` — 84 m, 12 m cells, 4 m roads). `src/game/World/GridMap.ts`
is the canonical module both the visuals and the game systems consume.

- **The station is at grid cell column 2, row 3** —
  `GridMap.TROTRO_STATION_GRID = { x: 2, z: 3, zone: 'circle_station' }`,
  world center `TROTRO_STATION_WORLD = [0, 16]`. The R3F interactive stop,
  the hidden world's `trotro_stop` interactable (radius 3.5) and the Mate
  panel all sit on the same cell.
- **Zones map 1:1 onto real LocationIds** (`GridMap.resolveLocationIdOnGrid`,
  consumed first by `Locations.getLocationAt`): adabraka →
  `adabraka_neighborhood`, makola → `makola_market`, circle_station →
  `circle_trotro_stop`, osu → `osu_oxford_street`, labadi →
  `labadi_beach`. Roads/mixed cells fall through to legacy bounds.
- **The visible player is the R3F avatar** (`StreetCanvas.PlayerAvatar`):
  movement input comes from the real `InputManager` (keyboard WASD **and**
  agent `gameAPI.setJoystickInput`), speeds are canon (4.5 walk / 7.3
  sprint), and every frame the avatar's position + rotation are mirrored
  into `PlayerController` — so `gameAPI.position`, `getActiveTarget()`,
  `getLocationAt()`, presence and the location pill all follow the avatar.
- **The GTA-style boarding panel on the map** (`src/r3f/TroTroBoarding.tsx`)
  executes the same five-method sequence as [LOGIC]: proximity →
  `isTrotroFull()` → `purchaseEverydayExpense('EXP_TROTRO_FARE')` (real
  debit + real ticket) → `hasOwnedItem('trotro_ticket_osu_circle')` →
  `boardPassenger()` → transit → teleport to the destination district cell
  (`GridMap.TROTRO_DESTINATIONS` / `destinationArrival`) →
  `alightPassenger()` turnover. Fare shown is
  `gameAPI.getCanonicalFareGHS()` (₵6) for every destination.
- **Agent-facing movement**: `gameAPI.setJoystickInput(x, y)` drives the
  visible avatar (positive y = south/+z, positive x = east/+x); world
  bounds are the map edge (±42 m, `GridMap.HALF`).
- **The [E] key at the station opens the Mate panel** (v4.2): pressing E
  inside the `trotro_stop` radius (3.5 m) fires
  `InteractionSystem.triggerCurrentInteraction` →
  `src/main.ts` `handleWorldTargetInteracted('trotro_stop')` → dispatches
  `CustomEvent('lagos-life:trotro-board')` (`TROTRO_BOARD_EVENT` in
  `src/r3f/gameAPIBridge.ts`) → `TroTroBoarding.tsx` starts the Mate
  sequence (idempotent — ignored if the proximity auto-trigger already
  opened the panel; the old jobs-modal fallthrough is gone).
- **Every venue stands on its matching grid cell** (v4.2, completed in
  v4.3, anchored by `GridMap` so hidden-layer interactables coincide with
  visible map cells): `provision_shop` on the Adabraka cell
  `[row 0, col 1]` (`PROVISION_STORE_ANCHOR`, world [-16, -32]),
  `food_vendor` on the Makola cell `[row 1, col 2]` (`FOOD_VENDOR_ANCHOR`,
  world [0, -16]), `momo_agent` on the Osu cell `[row 3, col 4]`
  (`MOMO_AGENT_ANCHOR`, world [32, 16]), `susu_collector` on the
  northwest community block `[row 3, col 0]` (`SUSU_COLLECTOR_ANCHOR`,
  world [-32, 16]), `chale_wote_panel` on the Osu street-art corner
  `[row 4, col 3]` (`CHALE_WOTE_ANCHOR`, world [16, 32]), Kojo on Makola
  `[2,1]`, Ama on Makola `[2,2]`, Uncle Mensah on the Adabraka corner
  `[1,1]` — colliders moved with them.
- **The user's GLB asset packs are mounted on the map** (v4.3):
  `StreetCanvas` renders `<InteriorFurniture />` (three furniture GLB
  sets on the Adabraka house cells `[0,0]`/`[1,0]`) and
  `<BeachProps />` (beach ball/table/kit/reef on the Labadi cells
  `[4,0]`/`[4,1]`) — lazy-loaded via `useGLTF` + Suspense, so they add
  no boot cost and appear once their chunks stream in.
- **The systems-layer scene no longer renders behind the map** (v4.2):
  `main.ts` sets `phase1.renderEnabled = false` when the R3F root is
  live — simulation (movement, interactions, NPC rigs) continues, only
  the hidden canvas draw is skipped (GPU headroom); `window.__phase1Scene`
  exposes the scene for debug.

## [LOGIC] Behavioral Instructions

1. **Capacity gate**: IF `gameAPI.isTrotroFull()` is true, the Mate
   refuses — 'No space! Next one!' — abort boarding. Do NOT call
   `spendMoney`. Wait for the next van (passenger turnover is automatic
   when the van cycle resets).

2. **Fare gate + boarding**: IF `gameAPI.canAfford(5, 'CASH')` is true,
   THEN call `gameAPI.spendMoney({ amount: 5, description: "Trotro fare
   (Mate's van)", channel: 'CASH' })` and then `gameAPI.boardPassenger()`.
   - A `null` receipt ⇒ the wallet refused the debit — abort and surface
     `E_INSUFFICIENT_FUNDS`.
   - A `false` from `gameAPI.boardPassenger()` ⇒ the van filled between
     the checks — treat as a refusal; the fare is already paid and counts
     toward the next boarding attempt.

3. **Ticket verification**: the canonical fare purchase grants the real
   owned item — after a successful `spendMoney`,
   `gameAPI.hasOwnedItem('trotro_ticket_osu_circle')` returns `true`.
   Verify it before declaring the boarding complete.

4. **Recovery**: IF `gameAPI.canAfford(5, 'CASH')` is false, do NOT call
   `spendMoney` — the Mate waves the player back ('Oga, you no get
   change? Abeg shift make others enter.'). Earn first:
   `JOB_TROTRO_MATE` (₵15, 30 s cooldown) via the economy flow, then
   retry the sequence.

**Ordering is mandatory**: `isTrotroFull()` → `canAfford()` →
`spendMoney()` → `boardPassenger()` → `hasOwnedItem()`. Calling
`spendMoney` while the van is full, or `boardPassenger` before the debit,
is a contract violation.

## [EXAMPLES] Exact TypeScript the Agent Generates

### Successful boarding — fare ₵5, balance ₵20

```ts
// Player at the Osu–Circle stop. Fare: ₵5. Cash balance: ₵20.
async function boardTrotro(fare: number): Promise<
  'BOARDED' | 'VAN_FULL' | 'NO_FUNDS' | 'DEBIT_REFUSED'
> {
  // 1. Capacity gate — real state from TrotroService (capacity 14).
  if (gameAPI.isTrotroFull()) {
    return 'VAN_FULL';                       // Mate: 'No space! Next one!'
  }

  // 2. Fare gate — canAfford(5, 'CASH') → true (balance ₵20 ≥ ₵5).
  if (!gameAPI.canAfford(fare, 'CASH')) {
    return 'NO_FUNDS';                       // no spendMoney call is made
  }

  // 3. Debit — routes to Wallet.spendMoney; ledger row: TRANSPORT / CASH.
  const receipt = gameAPI.spendMoney({
    amount: fare,                            // 5
    description: "Trotro fare (Mate's van)",
    channel: 'CASH'
  });
  if (!receipt) return 'DEBIT_REFUSED';      // wallet refused → abort

  // 4. Seat the passenger — TrotroService.boardPassenger() → true.
  const seated = gameAPI.boardPassenger();   // true

  // 5. Ticket proof — fare purchase granted the real owned item.
  const ticketHeld = gameAPI.hasOwnedItem('trotro_ticket_osu_circle'); // true

  return 'BOARDED';                          // balance now ₵15, van 1 seat fuller
}
```

### Failed boarding — balance ₵2, fare ₵5

```ts
// Balance ₵2. Fare ₵5.
if (!gameAPI.canAfford(5, 'CASH')) {
  // → false. Mate: 'Oga, you no get change? Abeg shift make others enter.'
  //
  // NO gameAPI.spendMoney call. NO gameAPI.boardPassenger call.
  // Balance stays ₵2; no TRANSPORT ledger row; no ticket granted.
  //
  // Recovery: run JOB_TROTRO_MATE (₵15, 30 s cooldown) via the economy
  // flow, then re-run this sequence once canAfford(5, 'CASH') is true.
}
```

### Full-van variant

```ts
// Van at 14/14.
if (gameAPI.isTrotroFull()) {
  // → true. Mate: 'No space! Next one!'
  // No debit. Wait for the van cycle reset — passenger turnover frees
  // seats automatically — then retry from the capacity gate.
}
```

## Extended mechanics (adapter reference)

The v1.0.0 deep spec — Mate haggle rounds (max 2, −₵1 per round, base-fare
floor), the zone fare table (Osu hop ₵4 / Circle→37 ₵7 / Makola ₵8 /
Labadi ₵10, ×1.5 rush hour), and the "running alongside" door-chase mechanic
(sprint 7.3 m/s vs van 5.5 m/s, 2.2 m window held 1.2 s, miss past 3.5 m) —
remains in force as the **reference implementation**
[`skills/tro-tro-adapter.ts`](./tro-tro-adapter.ts), which composes only
the real systems above (`Wallet`, `TrotroService`, `EconomyManager`) and
now drives passenger turnover automatically at the transit end. Haggle
only ever lowers the fare argument passed to `spendMoney` — it never
bypasses the [LOGIC] ordering.
