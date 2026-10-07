---
name: tro-tro-system
version: 4.8.0
domain: trotro boarding & transit (GameAPI six-method contract on the
  live custom grid map, incl. the van lifecycle state machine)
description: >
  Governs how AI agents board the Accra trotro through the live GameAPI
  bridge (window.GameAPI, wired in src/main.ts startGame()). The [CONTRACT]
  is the owner-issued six-method surface — every call is a real method on
  src/game/GameAPI.ts, runtime smoke-tested. v4.6 adds the physical van
  state: getTrotroStatus() exposes the phase-5 lifecycle state machine
  (EN_ROUTE → ARRIVING → IDLE_AT_STOP → BOARDING → DEPARTING) and [LOGIC]
  makes IDLE_AT_STOP a mandatory pre-condition before any funds or space
  check. v4.7 makes the stop a real fare dwell: an unboarded van departs
  on its own after ~8 s, so the DEPARTING "Ah! You missed it!" window
  exists without any boarding. v4.8 is the cultural authenticity pass:
  the Mate voice now matches real Accra station culture — route barks
  with intermediate stops ("Osu! Circle! Osu! Circle!"), the iconic
  change call ("Enter with your change o!"), and a dwell bark so the
  Mate is LOUDEST while the van waits to fill, not silent. The [ROUTING]
  section maps each method to the src/game/ file that actually executes it.
format: hybrid — [CONTRACT] GameAPI methods + [ROUTING] + [LOGIC] + [EXAMPLES] (TypeScript)
contract_policy: six-method surface, copy-exact from src/game/GameAPI.ts
supersedes: v4.7.0 (fare dwell: the unboarded van departs on its own —
  unchanged; v4.8 adds the Mate-voice culture pass: MATE_LINES.ARRIVING
  route barks + MATE_LINES.DWELL fill-up barks, LivingTrotro dwell shout);
  v4.6.0 (van lifecycle state machine: the getTrotroStatus bridge
  method, the mandatory IDLE_AT_STOP pre-board gate and the DEPARTING
  missed-van culture — unchanged; v4.7 adds the 8 s fare dwell so the
  unboarded van departs on its own);
  v4.3 momo_agent / susu_collector / chale_wote_panel anchors + GLB pack
  mounts — unchanged;
  v4.2 [E]-key Mate panel routing + provision/waakye/NPC cell anchors +
  systems-layer render pause — unchanged;
  v4.0.0 five-method contract — unchanged;
  v3.x real-symbol rewrites; v2.x GridLocation/GPS specs — dropped;
  v1.0.0 deep mechanics live in skills/tro-tro-adapter.ts
source_files:
  - src/game/GameAPI.ts (the bridge — live at window.GameAPI; getTrotroStatus
    routes 1:1 to TrotroService.getState)
  - src/game/Economy/Wallet.ts (canAfford / spendMoney)
  - src/game/Economy/EconomyManager.ts (hasOwnedItem → ownership)
  - src/game/World/TrotroService.ts (getTrotroStatus / isTrotroFull /
    boardPassenger + the phase-5 lifecycle machine: type TrotroState,
    auto-timers 2 s / dwell 8 s / 5 s / 8 s, MATE_LINES incl. MISSED and
    NOT_AT_STOP)
  - src/r3f/LivingTrotro.tsx (drives startCycle(), renders every state,
    plays MATE_LINES shout/bubble per transition)
  - src/r3f/StreetCanvas.tsx (adopts window.GameAPI.trotro at boot — the
    visible van and the AI bridge share ONE TrotroService instance)
  - src/game/World/GridMap.ts (canonical 5x5 grid: cells, districts,
    zone->LocationId, TROTRO_STATION_GRID, TROTRO_DESTINATIONS,
    PROVISION_STORE_ANCHOR, FOOD_VENDOR_ANCHOR, MOMO_AGENT_ANCHOR,
    SUSU_COLLECTOR_ANCHOR, CHALE_WOTE_ANCHOR, HOME_COMPOUND_ANCHOR)
  - src/r3f/TroTroBoarding.tsx (the visible custom map world — avatar,
    station, boarding panel with the v4.6 state gate, [E] listener)
  - src/game/World/Locations.ts (getLocationAt: venue-proximity zones →
    grid districts → legacy bounds; anchor-derived venue rects)
  - src/game/World/WorldSurface.ts (surface elevations: anchor-derived
    compound courtyard/step/interior, flat 0 everywhere else on the grid)
  - src/game/World/PlayerCompound.ts (home compound — group, colliders,
    cutaway zones, home_door interactable, all derived from
    HOME_COMPOUND_ANCHOR)
  - src/r3f/HomeCompound.tsx + src/r3f/ResidentialShowroom.tsx (visible
    compound landmark + residential scene.gltf diorama on cell [3,1])
  - src/main.ts#handleWorldTargetInteracted ([E] key → TROTRO_BOARD_EVENT)
adapter: skills/agent-adapter.ts#GameBindings + skills/tro-tro-adapter.ts
independence: callable alone; needs only the six methods below
---

# Skill: Tro-Tro Boarding & Transit System

> **Surface note.** The agent talks to the live bridge instance
> (`window.GameAPI`, constructed in `src/main.ts` `startGame()`). The
> brief's guessed file names (`trotro.ts`, `wallet.ts`, `controller.ts`)
> are actually **`NeighborhoodTrotro.ts`**, **`Wallet.ts`** and
> **`PlayerController.ts`**. `deductCedis`, `deductBalance`,
> `addToInventory` and `triggerNPCDialogue` do not exist anywhere in src —
> the six real methods below replace them all. The van is a living
> vehicle (phase 5): it drives its own lifecycle, and the AI must respect
> its physical state before touching money or seats.

## [CONTRACT] Allowed GameAPI Methods (copy-exact from src/game/GameAPI.ts)

```ts
// src/game/GameAPI.ts — wired live as window.GameAPI
gameAPI.getTrotroStatus():
  'EN_ROUTE' | 'ARRIVING' | 'IDLE_AT_STOP' | 'BOARDING' | 'DEPARTING';
//   Physical state of ACC_TROTRO_001 — real type: TrotroState
//   (src/game/World/TrotroService.ts, auto-timed lifecycle):
//   • EN_ROUTE     — van on the road, nowhere near the stop
//   • ARRIVING     — van pulling in (auto → IDLE_AT_STOP after 2 s)
//   • IDLE_AT_STOP — docked, door open, Mate taking fares ← BOARD HERE
//                    (fare dwell: auto → DEPARTING after ~8 s if nobody
//                    boards — the window is real, don't dawdle)
//   • BOARDING     — boarding window open (auto → DEPARTING after 5 s;
//                    the engine still seats latecomers, the [LOGIC]
//                    gate below does not — don't start a purchase here)
//   • DEPARTING    — van pulling away (auto → EN_ROUTE after 8 s)
//   Read-only for the AI: only the host/renderer drives the lifecycle.

gameAPI.canAfford(amount: number, channel: 'CASH'): boolean;

gameAPI.spendMoney(params: {
  amount: number;
  description: string;
  channel: 'CASH';
}): TransactionRecord | null;   // null ⇒ debit refused (insufficient funds)

gameAPI.hasOwnedItem('trotro_ticket_osu_circle'): boolean;

gameAPI.isTrotroFull(): boolean;    // true ⇒ mate refuses ("No space! Next one!")

gameAPI.boardPassenger(): boolean;  // false ⇒ van not docked (state gate) or
                                    //         filled between checks
```

No other call is part of this skill's contract. (The bridge exposes more —
`getSnapshot` (includes `.state`), `getCashBalance`,
`purchaseEverydayExpense`, `triggerCurrentInteraction`, `alightPassenger`,
… — for the host and the other skills; see [ROUTING] for what the six
above hit.)

## [ROUTING] Where Each Method Really Executes

The AI never imports `src/` directly. `window.GameAPI` is constructed at
boot with the live instances; every method delegates 1:1:

- **When the AI calls `gameAPI.getTrotroStatus()`, the GameAPI bridge
  routes this to `TrotroService.getState` in
  `src/game/World/TrotroService.ts`** — the phase-5 lifecycle state
  machine, read-only for the AI.
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
| `gameAPI.getTrotroStatus()` | `TrotroService.getState` (phase-5 machine) | `src/game/World/TrotroService.ts` |
| `gameAPI.canAfford(amount, 'CASH')` | `Wallet.canAfford` | `src/game/Economy/Wallet.ts` |
| `gameAPI.spendMoney({amount, description, channel: 'CASH'})` | `Wallet.spendMoney` (bridge adds `category: 'TRANSPORT'`) | `src/game/Economy/Wallet.ts` |
| `gameAPI.hasOwnedItem('trotro_ticket_osu_circle')` | `EconomyManager.getOwnershipFoundations().ownedItemIds` | `src/game/Economy/EconomyManager.ts` |
| `gameAPI.isTrotroFull()` | `TrotroService.isFull` (capacity 14) | `src/game/World/TrotroService.ts` |
| `gameAPI.boardPassenger()` | `TrotroService.boardPassenger` | `src/game/World/TrotroService.ts` |

Passenger turnover is automatic: the adapter seats the player on
`board()` and frees seats when the van cycle resets
(`skills/tro-tro-adapter.ts`), and every seat change is persisted into the
`EconomyPersistence` snapshot via `EconomyManager.bindTrotroPassengerState`.

**One van, one machine (v4.6).** The van is a living vehicle:
`TrotroService` runs the phase-5 lifecycle (`EN_ROUTE → ARRIVING →
IDLE_AT_STOP → BOARDING → DEPARTING → EN_ROUTE`, auto-timers 2 s arrival /
8 s fare dwell / 5 s boarding / 8 s pull-away + 1 s en-route gap,
`MATE_LINES` shout/bubble per transition via
`LivingTrotro`, which calls `startCycle()` on mount). Since v4.7 the
IDLE_AT_STOP dwell is finite — an unboarded van pulls away by itself after
~8 s, then the next van docks ~11 s later (8 s DEPARTING + 1 s EN_ROUTE +
2 s ARRIVING). Since v4.6 the
visible van and the bridge share ONE instance — `src/r3f/StreetCanvas.tsx`
adopts `window.GameAPI.trotro` as soon as the systems layer boots (a
pre-boot fallback van runs before that) — so what the AI reads through
`getTrotroStatus()` is exactly the physical van the player sees. (Before
this wiring the bridge instance sat in 'EN_ROUTE' forever and
`boardPassenger()` was dead on main — the state gate is what made that
bug visible.)

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
  consumed by `Locations.getLocationAt` AFTER the venue-proximity pass):
  adabraka → `adabraka_neighborhood`, makola → `makola_market`,
  circle_station → `circle_trotro_stop`, osu → `osu_oxford_street`, labadi
  → `labadi_beach`. Roads/mixed cells fall through to legacy bounds.
- **Venue-proximity pass restores the fine-grained venue pills** (v4.5):
  the provision store and waakye joint stand INSIDE district cells, so the
  district resolution used to shadow their zones forever — standing at the
  kiosk read 'Adabraka'/'Makola Market' with no recovery action.
  `Locations.getLocationAt` now checks `VENUE_PROXIMITY_ZONES` FIRST
  (provisions anchor [-16,-32] → `adabraka_provisions`, waakye anchor
  [0,-16] → `osu_waakye_joint`, station [0,16] → `circle_trotro_stop`;
  half-extent 5 m so the pill flips only around the venue, not the whole
  cell). The legacy rects for those three zones are anchor-derived too,
  which also deleted the phantom pre-map zones that still matched road
  strips near the map center (e.g. the old (-13..-5.5, -13..-7.7)
  provisions rect). Runtime-verified: pill '🏪Adabraka Provisions' +
  '🧊 Voltic & Bofrot · ₵4' chip at the store, '🍲Osu Waakye Joint' +
  '🍲 Waakye & Sobolo · ₵10' at the joint.
- **Surface elevations are anchor-derived and the grid plays flat** (v4.5):
  `WorldSurface.getSurfaceHeightAt` now returns 0 everywhere except the
  compound regions derived from `HOME_COMPOUND_ANCHOR` (gate apron 0.10 →
  veranda step 0.16 → courtyard 0.10 → interior floor 0.24, matching
  `ROOM_ORIGIN.y` and the R3F landmark slabs). The pre-grid tiers (old
  main road, sidewalks, gutter crossovers, and the provision/waakye/
  trotro pads at pre-map coordinates — phantom 0.08–0.24 m floats on
  today's map) are gone.
- **The visible player is the R3F avatar** (`StreetCanvas.PlayerAvatar`):
  movement input comes from the real `InputManager` (keyboard WASD **and**
  agent `gameAPI.setJoystickInput`), speeds are canon (4.5 walk / 7.3
  sprint), and every frame the avatar's position + rotation are mirrored
  into `PlayerController` — so `gameAPI.position`, `getActiveTarget()`,
  `getLocationAt()`, presence and the location pill all follow the avatar.
- **The GTA-style boarding panel on the map** (`src/r3f/TroTroBoarding.tsx`)
  executes the same six-method sequence as [LOGIC]: proximity →
  `getTrotroStatus()` (v4.6 state gate — only 'IDLE_AT_STOP'/'BOARDING'
  proceed; 'DEPARTING' surfaces `MATE_LINES.MISSED`, 'EN_ROUTE'/'ARRIVING'
  `MATE_LINES.NOT_AT_STOP`) → `isTrotroFull()` →
  `purchaseEverydayExpense('EXP_TROTRO_FARE')` (real debit + real ticket) →
  `hasOwnedItem('trotro_ticket_osu_circle')` → `boardPassenger()` →
  transit → teleport to the destination district cell
  (`GridMap.TROTRO_DESTINATIONS` / `destinationArrival`) →
  `alightPassenger()` turnover. Fare shown is
  `gameAPI.getCanonicalFareGHS()` (₵6) for every destination. The old 30 s
  `resetVehicle()` cooldown is gone — the live machine cycles the van back
  to the stop by itself.
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
- **The player's home compound sits on mixed cell `[row 2, col 0]`**
  (v4.4, `HOME_COMPOUND_ANCHOR`, world [-32, 0], just north of the
  suburb-house cells — Adabraka cells [0,0]/[1,0] host houses, [0,1] the
  provision store, [1,1] the stalls). The cell is deliberately MIXED so
  `getLocationAt` falls through to the fine-grained `home_compound`
  bounds (Locations.ts, also anchor-derived): the pill reads
  'Home Compound' and the veranda-nap recovery action stays reachable.
  Everything in `PlayerCompound.ts` (group origin, 6 perimeter colliders,
  dynamic room-shell wall colliders, cutaway hysteresis zones, the
  `home_door` interactable 'Home · Rest & Upgrade') plus the housing
  `ROOM_ORIGIN` in `main.ts` and the `HomeFurnitureVisuals` slots derive
  from the anchor — walking into the compound at [-32, 0] triggers the
  home sheet exactly like the old-world compound did. The visible
  landmark (`src/r3f/HomeCompound.tsx`) mirrors the systems-layer
  geometry (courtyard slab, breeze-block walls + gate, house shell,
  hipped roof, polytank tower) so the home is findable on the map.
- **All compound teleports + the placement room origin derive from the
  anchor** (v4.5, last pre-map coordinate leftovers fixed):
  `main.ts` `COMPOUND_GATE_SPAWN` (world [-32, -5.2], 0.9 m clear of the
  front-wall gate colliders, rotationY 0 = facing the courtyard — the old
  code's Math.PI faced away) is shared by the arrest respawn and the
  home-visit enter/leave teleports, which previously dumped arrestees and
  visitors ~22 m away on the pre-map compound spot (-10.5, 6.2).
  `enterPlacementMode` + `initHousingEngine` now call
  `placementEngine.setRoomOrigin(ROOM_ORIGIN…)` instead of the hardcoded
  (-10.5, 0.24, 11.1) — furniture ghosts and validity checks evaluate at
  the real compound; runtime-verified: bought a plastic chair via the
  Home Store and the ghost spawned at world [-32, 0.24, -1.6] with
  '✓ Valid placement', confirmed, and rendered at the compound.
- **Home visit mode passes its E2E pass** (v4.5): with a dev showcase
  override (`__accraShowcase.setOverride`, dev-only seam in
  `HomeShowcase.ts`), `__accraVisit.enter('host-smoke-1', 'Kwame')` →
  banner '🏠 Visiting Kwame — Single Room — Starter' visible, three
  host furniture meshes built at the anchor-derived `ROOM_ORIGIN`, and
  `__accraVisit.leave()` restores the own compound, furniture and HUD
  with zero leftover meshes. NOTE for harnesses: anonymous sign-in is
  disabled in this Firebase project (ADMIN_ONLY_OPERATION), so the
  friends uid is null for guests — the smoke sets the dev-handle uid
  (`__accraFriends.uid = '…'`) to exercise the visit machinery; the auth
  gate itself is Firebase-console config, not code.
- **The residential scene.gltf is mounted as a showroom diorama** (v4.4):
  `src/r3f/ResidentialShowroom.tsx` loads the 50 MB
  `/assets/glb/residential/scene.gltf` (ATD-London, CC-BY-4.0) on mixed
  cell `[row 3, col 1]` (world [-16, 16]) and footprint-fits it to 11 m
  via a runtime Box3 measure (the pack is a floor-plan-style layout —
  0.2 m tall at this scale, like an architectural model).
  `AccraCityGrid.RESERVED_CELLS` (`'2,0'`, `'3,1'`) skips the generic
  district buildings on both cells so nothing intersects the landmarks.
- **The furniture GLB packs are auto-fitted yard displays** (v4.4): the
  three Adabraka packs are showcase LINEUPS, not compact clusters —
  measured 39 m (furniture_set, one merged mesh), ~159 m (some_furniture,
  previously sticking ~148 m off the south map edge) and 16 m
  (chair_table_wardrobe) at their old fixed scales. `InteriorFurniture`
  now Box3-measures each model at load and uniformly fits it to 7/10/6 m
  into the yard strips of cells [0,0]/[1,0], clear of the SuburbHouses
  footprints.
- **Food GLB texture path fixed** (v4.4): all 200 market food packs
  internally reference `Textures/colormap.png`; the file now ships at
  `public/assets/glb/food/Textures/colormap.png` (was only at the pack
  root — every food model 404'd its only texture since PR #4).
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

1. **State gate — mandatory, checked FIRST (v4.6)**: BEFORE checking
   funds or space, call `gameAPI.getTrotroStatus()`. IF
   `gameAPI.getTrotroStatus() !== 'IDLE_AT_STOP'` THEN ABORT — do not
   call `isTrotroFull`, `canAfford`, `spendMoney` or `boardPassenger`.
   A van that is 'EN_ROUTE', 'ARRIVING' or 'DEPARTING' cannot be boarded
   no matter what the seat count says; the AI must respect the physical
   state of the vehicle.
   - **'DEPARTING'** (the van is pulling away): say the missed-van line —
     **'Ah! You missed it! Wait for the next one!'** — while the Mate
     shouts his own pull-away line (`MATE_LINES.DEPARTING`, 'Hold tight!
     We dey move!'). Then initiate a **wait** state at the stop. An
     optional short **chase** beat is allowed using the v1.0 door-chase
     numbers (sprint 7.3 vs van 5.5 m/s, 2.2 m window held 1.2 s, miss
     past 3.5 m) — but the chase is pure flavor: the state gate means a
     'DEPARTING' van can never be re-boarded, so the beat always ends in
     the wait state. No money moves.
   - **'EN_ROUTE' / 'ARRIVING'**: wait at the stop ('No van at the stop
     yet — wait for the next one.'). The machine docks the van by itself
     (auto → 'IDLE_AT_STOP' after 2 s).
   - **'IDLE_AT_STOP' — the window is finite (v4.7)**: the van dwells at
     the stop for ~8 s taking fares; if nobody boards it departs on its
     own. Read the status IMMEDIATELY before every attempt — a status
     read from a previous tick may already be stale, and a stale
     'IDLE_AT_STOP' is how fares get burned into a closing window.
   - **'BOARDING'**: the Mate is still seating someone in the 5 s window
     that auto-closes into 'DEPARTING'. The engine would physically seat
     a latecomer, but this skill's gate is stricter on purpose — an agent
     that starts a purchase inside a closing window is how fares get
     burned. Wait for the next clean 'IDLE_AT_STOP'.

2. **Capacity gate**: IF `gameAPI.isTrotroFull()` is true, the Mate
   refuses — 'No space! Next one!' — abort boarding. Do NOT call
   `spendMoney`. Wait for the next van (passenger turnover is automatic
   when the van cycle resets).

3. **Fare gate + boarding**: IF `gameAPI.canAfford(5, 'CASH')` is true,
   THEN call `gameAPI.spendMoney({ amount: 5, description: "Trotro fare
   (Mate's van)", channel: 'CASH' })` and then `gameAPI.boardPassenger()`.
   - A `null` receipt ⇒ the wallet refused the debit — abort and surface
     `E_INSUFFICIENT_FUNDS`.
   - A `false` from `gameAPI.boardPassenger()` ⇒ the van filled or pulled
     away between the checks — treat as a refusal; the fare is already
     paid and counts toward the next boarding attempt.

4. **Ticket verification**: the canonical fare purchase grants the real
   owned item — after a successful `spendMoney`,
   `gameAPI.hasOwnedItem('trotro_ticket_osu_circle')` returns `true`.
   Verify it before declaring the boarding complete.

5. **Recovery**: IF `gameAPI.canAfford(5, 'CASH')` is false, do NOT call
   `spendMoney` — the Mate waves the player back ('Oga, you no get
   change? Abeg shift make others enter.'). Earn first:
   `JOB_TROTRO_MATE` (₵15, 30 s cooldown) via the economy flow, then
   retry the sequence.

**Ordering is mandatory**: `getTrotroStatus()` → `isTrotroFull()` →
`canAfford()` → `spendMoney()` → `boardPassenger()` → `hasOwnedItem()`.
Calling `spendMoney` while the van is not 'IDLE_AT_STOP', or
`boardPassenger` before the debit, is a contract violation.

### The Mate voice — cultural authenticity beats (v4.8)

The Mate is not a vending machine with dialogue; he is the van's
hustling co-owner. The lines below are the exact strings in
`MATE_LINES` (src/game/World/TrotroService.ts) — every agent-facing
surface (LivingTrotro shouts, TroTroBoarding panel, refusal branches)
reads from that one constant.

1. **Route bark with intermediate stops** (on 'ARRIVING'): real Mates
   call the destination AND the stops along the way — 'Osu! Circle!
   Osu! Circle!' — mixed with 'Circle! Circle! Enter well!'. The
   destination is shouted at least twice; that repetition IS the signal
   the van is boarding.
2. **The change call** (on 'ARRIVING' / 'IDLE_AT_STOP'): the single
   most iconic Mate line in Accra — 'Enter with your change o!'.
   Passengers who board with big notes slow the van down and get the
   cold shoulder; the in-game INSUFFICIENT line ('Oga, you no get
   change? Abeg shift make others enter.') is the refusal end of that
   same culture.
3. **Dwell grumble** (on 'IDLE_AT_STOP', v4.8): a real van does not
   move until it fills — the Mate keeps barking while he waits, not a
   dry seats readout. MATE_LINES.DWELL: 'One more person make we
   move!', 'Enter with your change!', 'Two for the front seat,
   workers!', 'We dey go soon — make you enter with your change!'.
   The "two for the front seat" squeeze is standard: three-seat rows
   routinely carry four, and the front bench is sold twice.
4. **The departure beat** (on 'DEPARTING'): 'Hold tight! We dey move!'
   plus the missed-van call 'Ah! You missed it! Wait for the next
   one!' for latecomers — chasing a pulling-away van is real Accra
   behavior, and the v4.6 chase beat above is that culture
   formalized.
5. **Capacity & fare realism**: 14 passengers is a true 207/Sprinter
   trotro load (driver + Mate + 14); ₵5 matches current short-hop
   shared fares on the Osu–Circle corridor.
6. **Roadmap (documented, not yet implemented)**: the roof-tap
   alighting signal (passengers knock the van ceiling and shout
   'Mate, branch here!'), the Mate making change from a wad of small
   notes mid-ride, and hand-painted van decals ('No Condition Be
   Permanent'). These are flavor upgrades; none are contract-level.

## [EXAMPLES] Exact TypeScript the Agent Generates

### Successful boarding — fare ₵5, balance ₵20, van docked

```ts
// Player at the Osu–Circle stop. Fare: ₵5. Cash balance: ₵20.
async function boardTrotro(fare: number): Promise<
  'BOARDED' | 'VAN_MOVING' | 'VAN_FULL' | 'NO_FUNDS' | 'DEBIT_REFUSED'
> {
  // 0. State gate (v4.6, MANDATORY FIRST) — physical state of the van.
  //    Abort before ANY funds or space check unless the van is docked.
  if (gameAPI.getTrotroStatus() !== 'IDLE_AT_STOP') {
    return 'VAN_MOVING';                     // see the DEPARTING example below
  }

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

### Boarding rejected — the van is 'DEPARTING' (the v4.6 state rule)

```ts
// The player reaches ACC_PROP_001 just as the Mate taps the van side and
// the doors shut. The AI must respect the physical state of the vehicle:
// the status check comes FIRST, before funds or space.

// Step 1 — read the van's physical state (routes to TrotroService.getState).
const status = gameAPI.getTrotroStatus();

if (status !== 'IDLE_AT_STOP') {
  // Step 2 — ABORT. No isTrotroFull, no canAfford, no spendMoney,
  // no boardPassenger. The seat count is irrelevant — the van is moving.

  if (status === 'DEPARTING') {
    // Step 3 — cultural response. The Mate is shouting his own line
    // (MATE_LINES.DEPARTING: 'Hold tight! We dey move!'); the AI answers
    // with the verbatim missed-van line and sets the wait state.
    //   say("Ah! You missed it! Wait for the next one!")
    //   set_state('WAIT_NEXT_TROTRO')          // stand at the stop
    //
    // Optional one-beat chase (flavor ONLY — it can never board a
    // DEPARTING van): sprint alongside using the v1.0 door-chase numbers
    // (7.3 vs 5.5 m/s, 2.2 m window held 1.2 s, miss past 3.5 m), then
    // settle back into WAIT_NEXT_TROTRO.
    //
    // No wallet debit, no ledger row, no ticket — nothing to roll back.
    // The machine auto-cycles: DEPARTING →(8 s)→ EN_ROUTE →(1 s)→
    // ARRIVING →(2 s)→ IDLE_AT_STOP — retry from the state gate then.
    return 'VAN_MOVING';                     // ≈ 11 s until the next stop
  }

  // 'EN_ROUTE' / 'ARRIVING' / 'BOARDING' — same abort, no chase beat:
  // wait at the stop until the status reads 'IDLE_AT_STOP' again.
  return 'VAN_MOVING';
}

// Step 4 — only NOW the van is docked: proceed to the capacity gate.
if (gameAPI.isTrotroFull()) return 'VAN_FULL';
```

What the AI did right: it **asked the van before it asked the wallet**.
Under the old five-method ordering an agent could pass the capacity and
fare gates and only discover at `boardPassenger()` that the van had left —
fare already gone. Under v4.6 the moving-van case never reaches money.

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
bypasses the [LOGIC] ordering. Since v4.6 the door-chase doubles as the
[LOGIC] 'DEPARTING' chase beat — pure flavor that always ends in the wait
state, because the state gate keeps boarding impossible once the van pulls
away.
