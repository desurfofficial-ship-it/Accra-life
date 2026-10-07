---
name: tro-tro-system
version: 1.0.0
domain: trotro boarding, mate fare negotiation & zone pricing
description: >
  Full lifecycle of boarding a commercial trotro minibus in Accra: queuing
  at the Osu–Circle station, negotiating the fare with the van's Mate,
  sprinting alongside a departing van to catch the sliding door, paying the
  zone fare in cash, and riding out to a destination district.
format: hybrid — [CONTRACT] real repo symbols + [LOGIC] behavior rules + [EXAMPLES]
source_systems:
  - src/game/World/NeighborhoodTrotro.ts
  - src/game/Player/PlayerController.ts
  - src/game/Player/InputManager.ts
  - src/game/Art/CharacterBuilder.ts
  - src/game/Player/InteractionSystem.ts
  - src/game/Economy/EconomyManager.ts
  - src/game/Economy/Wallet.ts
  - src/game/World/Locations.ts
adapter: skills/agent-adapter.ts#MovementSkill (travel op) + this file
independence: callable alone; depends on economy only for the fare payment
---

# tro-tro-system

## [CONTRACT]

Exact TypeScript interfaces and functions this skill binds to. Everything in
**A** already exists in the repo; **B** is adapter-owned state this skill
introduces (the user-reference names `PlayerState` / `updateBalance()` /
`triggerAnimation()` map to real repo symbols as shown below).

### A. Existing repo symbols (used as-is)

| Repo symbol | File | Role in boarding |
|---|---|---|
| `buildTrotroStopAndVehicle(scene, colliders, interactables)` | `src/game/World/NeighborhoodTrotro.ts` | Spawns shelter `ACC_PROP_001` at world `(9.0, 0, 6.2)`, parked Sprinter van `ACC_TROTRO_001` at world `(9.0, 0.02, 2.55)` facing West (−X) with curb-side sliding door (+Z) toward the shelter, plus colliders `ACC_PROP_001_SHELTER` (X 6.4–11.6, Z 5.45–7.6) and `ACC_TROTRO_001` (X 6.3–11.6, Z 1.45–3.65) |
| `InteractableTarget` (`trotro_stop`: position `(9.0, 0.14, 4.9)`, `lookAtPosition (9.0, 0.14, 3.2)`, `radius 3.5`, promptLabel `'Trotro'`, interactionResponse `'Osu–Circle station — mate collecting fares.'`) | `src/game/Player/InteractionSystem.ts` | The boarding trigger zone; `InteractionSystem.triggerCurrentInteraction()` opens negotiation |
| `PlayerController` — `position`, `rotationY`, `isMoving`, `isSprinting`, `update(dt, cameraYaw, colliders)`; internal `walkSpeed = 4.5`, `sprintSpeed = 7.3`, `playerRadius = 0.42`, `worldBoundsX = 25.0`, `worldBoundsZ = 17.2` | `src/game/Player/PlayerController.ts` | **→ the `PlayerState` reference.** Supplies chase physics for the running-alongside phase |
| `InputManager` — `setJoystickInput(x, y)`, `setVirtualSprint(enabled)`, `isVirtualSprintEnabled()`, `getMovementInput(): MovementInput {moveX, moveZ, magnitude, sprint}` | `src/game/Player/InputManager.ts` | Skill drives chase by setting virtual joystick + sprint |
| `CharacterRig.updateAnimation(dt, isMoving, isSprinting, phaseOffset?, turnRate?, moveSpeedRatio?)` | `src/game/Art/CharacterBuilder.ts` | **→ the `triggerAnimation()` reference.** Sprint cycle plays whenever `isSprinting=true` while running alongside |
| `ColliderBox` | `src/game/Player/PlayerController.ts` | Van/shelter collision boxes consumed by `PlayerController.update` during the chase |
| `EconomyManager.canAfford(amountGHS, channel)` / `purchaseEverydayExpense('EXP_TROTRO_FARE')` | `src/game/Economy/EconomyManager.ts` | **→ the `updateBalance()` reference for the canonical ₵6 fare.** `EXP_TROTRO_FARE` (₵6, category `TRANSPORT`, interactableId `trotro_stop`) matches the signboard canon "TROTRO STOP · ADABRAKA · ₵6 FARE" |
| `Wallet.canAfford(amount, channel)`, `Wallet.spendMoney({amount, category, description, channel})` | `src/game/Economy/Wallet.ts` | **→ the `updateBalance()` reference for non-canonical zone fares.** CASH channel only; ledger keeps the receipt |
| `LocationId`, `LocationDef`, `getLocationAt(x, z)`, `circle_trotro_stop` bounds `X [5.5, 12.0], Z [4.0, 12.0]`; reserved travel destinations `makola_market`, `labadi_beach` | `src/game/World/Locations.ts` | Zone pricing origins/destinations; boarding requires standing inside `circle_trotro_stop` bounds |

### B. Adapter-owned additions (declared here, implemented in adapter)

```ts
export type BoardingPhase =
  | 'IDLE' | 'QUEUED' | 'NEGOTIATING' | 'RUNNING_ALONGSIDE'
  | 'BOARDED' | 'MISSED' | 'REFUSED_FUNDS' | 'REFUSED_NEGOTIATION';

export interface MateOffer {
  routeId: TrotroRouteId;          // zone table below
  quotedFareGHS: number;           // base × demand multiplier
  baseFareGHS: number;
  demandMultiplier: number;        // 1.0 off-peak, 1.5 rush hour
  negotiationRoundsLeft: 0 | 1 | 2;
  mateLine: string;                // Pidgin quote line for UI/chat
}

export type TrotroRouteId =
  | 'OSU_CIRCLE_LOCAL'             // hop within Osu Oxford St / Adabraka
  | 'CIRCLE_TO_37'                 // Circle → 37 Station (proposed dest id '37_station')
  | 'CIRCLE_TO_MAKOLA'             // → makola_market (already reserved)
  | 'CIRCLE_TO_LABADI';            // → labadi_beach (already reserved)

export interface TroTroSystem {
  queueAtStop(): Promise<{ phase: 'QUEUED'; nextVanMs: number }>;
  negotiateFare(routeId: TrotroRouteId): Promise<MateOffer>;
  contestFare(): Promise<MateOffer | { refused: true }>;   // max 2 rounds
  payAndBoard(payment: { amountGHS: number; routeId: TrotroRouteId }):
    Promise<{ phase: 'BOARDED' } | { phase: 'REFUSED_FUNDS'; shortfallGHS: number }>;
  chaseAndBoard(): Promise<{ boarded: boolean; gapM: number }>; // running-alongside
}
```

## [LOGIC]

Behavioral rules for the full boarding loop, in phase order:

### 1. Station rules (pre-boarding)

- The agent must be **inside `circle_trotro_stop` bounds** (X 5.5–12.0, Z 4.0–12.0)
  and within the `trotro_stop` interact radius (**3.5 m** of `(9.0, 4.9)`) before
  any boarding op; otherwise `E_NOT_AT_LOCATION`.
- Boarding happens on the **curb side (+Z)** — the van's sliding door faces the
  shelter. Never route the agent between the van and the road (−Z side); the
  `ACC_TROTRO_001` collider will block and the chase will fail.
- Vans run on a cycle: one parked at the bay, next van arrives **30 s** after a
  departure. The Mate stands at the shelter collecting fares while the van waits.

### 2. Fare negotiation with the Mate

- The Mate quotes `baseFareGHS × demandMultiplier` for the requested route.
  **Rush-hour windows** (07:00–09:30, 16:30–19:00 in-game) apply the 1.5×
  multiplier; otherwise 1.0×.
- The agent may **contest** the quote at most **2 rounds**: each successful
  contest drops the quote by **₵1** down to the base fare floor. The Mate
  refuses further haggling (`{ refused: true }`) if the agent contests at the
  floor already, or after 2 rounds — at which point the quoted fare stands or
  the van waves on.
- Conduct rules: haggle is polite Pidgin ("Mate, abeg, na small small I get"),
  never abusive; the Mate answers with the vehicle's route placard line
  ("CIRCLE – OSU" placard is canon on `ACC_TROTRO_001`).
- **Payment is CASH only.** Canonical ₵6 routes go through
  `purchaseEverydayExpense('EXP_TROTRO_FARE')`; other zone fares go through
  `Wallet.spendMoney({ category: 'TRANSPORT', channel: 'CASH' })`. No MoMo,
  no bank, no partial payment, no credit — the Mate does not move for less.

### 3. Zone-based fare table (origin: `circle_trotro_stop`)

| Route | Destination | Base fare | Peak (×1.5) | Payment path |
|---|---|---|---|---|
| `OSU_CIRCLE_LOCAL` | Hop along Osu Oxford St / Adabraka | ₵4 | ₵6 | `Wallet.spendMoney` |
| `CIRCLE_TO_37` | `37_station` — 37 Military Hospital/Station (proposed new `LocationId`, registered like `makola_market`) | ₵7 | ₵10.5 → Mate rounds to ₵10 | `Wallet.spendMoney` |
| `CIRCLE_TO_MAKOLA` | `makola_market` (reserved id) | ₵8 | ₵12 | `Wallet.spendMoney` |
| `CIRCLE_TO_LABADI` | `labadi_beach` (reserved id) | ₵10 | ₵15 | `Wallet.spendMoney` |
| *(canonical)* Osu–Circle hop | `trotro_stop` itself | **₵6** (signboard canon, `EXP_TROTRO_FARE`) | ₵9 | `purchaseEverydayExpense` |

Fare is per-seat and per-van: one payment boards one passenger; the Mate
hands change rounded **down** to the nearest ₵0.5.

### 4. The 'running alongside' mechanic (catch phase)

- Trigger: the van **pulls away West (−X)** along Oxford Street when the
  boarding window closes (player hasn't paid within 12 s of the Mate's quote,
  or the agent issued `chaseAndBoard()` explicitly).
- The van accelerates to **5.5 m/s**; the player sprints at **7.3 m/s**
  (`setVirtualSprint(true)` + joystick held toward the sliding door).
- Catch condition — all must hold for **1.2 s continuous**:
  1. Player within **2.2 m** of the sliding door world point `(9.84, 3.6)` tracking
     the moving van (door leaf local `(0.84, 1.32, 1.05)` on van origin world `(9.0, 2.55)`);
  2. `PlayerController.isSprinting === true` (walk speed 4.5 < van 5.5 — walking
     can never catch it; sprint is mandatory);
  3. `CharacterRig.updateAnimation(..., isSprinting=true, moveSpeedRatio ≥ 0.9)`
     is playing (visual sanity for the sprint cycle).
- Fail conditions: horizontal gap > **3.5 m** at any moment → `MISSED`; player
  releases sprint > 0.8 s → `MISSED`; player hits the `ACC_TROTRO_001` collider
  from the road side → stumble, 1.5 s stun, then `MISSED`.
- On `MISSED`: van despawns past `worldBoundsX` (−25.0), next van in 30 s, no
  fare charged. Two consecutive misses and the Mate jokes in chat but never
  punishes mechanically.
- Energy is **not** additionally drained by the sprint (repo `NeedsSystem` has
  no sprint cost) — the chase is pure positioning skill. Chasing while
  `hunger < 15` is allowed but the sprint is mechanically slower to steer;
  agents should prefer catching the *parked* van.

### 5. Boarding resolution

- `BOARDED`: fare debited, `economy.get_wallet` shows the `TRANSPORT` ledger
  entry, destination `LocationId` overrides the player's location (same
  mechanism as `movement.travel`), and the HUD toast shows the Mate's line
  ("Circle, 37, woye!"). Ride duration is skipped — arrival is one heartbeat
  after debit for canonical hops; travel destinations land at the reserved
  zone.
- `REFUSED_FUNDS`: `Wallet.canAfford` false → Mate waves the van on, agent
  keeps position, **no partial boarding, no IOU**. Recommended in-world
  recovery: work `JOB_TROTRO_MATE` (₵15, 30 s cooldown) *at this same stop* to
  earn the fare honestly.
- The skill never teleports the player to skip payment; the only legitimate
  free movement is walking (bounds X ±25, Z ±17.2) or a paid trotro.

## [EXAMPLES]

### Example 1 — successful boarding (Circle → 37, contested once, peak hour)

```json
[
  { "skill": "movement", "op": "approach_interactable",
    "params": { "interactableId": "trotro_stop" } },
  { "ok": true, "result": { "arrived": true, "locationId": "circle_trotro_stop",
    "promptLabel": "Trotro" } },

  { "skill": "tro-tro", "op": "negotiateFare",
    "params": { "routeId": "CIRCLE_TO_37" } },
  { "ok": true, "result": { "routeId": "CIRCLE_TO_37", "baseFareGHS": 7,
    "quotedFareGHS": 10.5, "demandMultiplier": 1.5, "negotiationRoundsLeft": 2,
    "mateLine": "37 wote? ₵10.5, rush hour dey inside, enter!" } },

  { "skill": "tro-tro", "op": "contestFare", "params": {} },
  { "ok": true, "result": { "routeId": "CIRCLE_TO_37", "baseFareGHS": 7,
    "quotedFareGHS": 9.5, "demandMultiplier": 1.5, "negotiationRoundsLeft": 1,
    "mateLine": "Ok, ₵9.5 last, I for drop am for the junction." } },

  { "skill": "economy", "op": "can_afford",
    "params": { "amountGHS": 9.5, "channel": "CASH" } },
  { "ok": true, "result": { "affordable": true } },

  { "skill": "tro-tro", "op": "payAndBoard",
    "params": { "amountGHS": 9.5, "routeId": "CIRCLE_TO_37" } },
  { "ok": true, "result": { "phase": "BOARDED" } },

  { "skill": "economy", "op": "get_transactions", "params": { "limit": 1 } },
  { "ok": true, "result": [
    { "category": "TRANSPORT", "description": "Trotro fare Circle → 37 (Mate's van)",
      "amount": -9.5, "channel": "CASH" } ] }
]
```

### Example 2 — failed attempt: insufficient funds

```json
[
  { "skill": "movement", "op": "approach_interactable",
    "params": { "interactableId": "trotro_stop" } },
  { "ok": true, "result": { "arrived": true, "locationId": "circle_trotro_stop" } },

  { "skill": "tro-tro", "op": "negotiateFare",
    "params": { "routeId": "CIRCLE_TO_37" } },
  { "ok": true, "result": { "routeId": "CIRCLE_TO_37", "quotedFareGHS": 7,
    "baseFareGHS": 7, "demandMultiplier": 1.0, "negotiationRoundsLeft": 2,
    "mateLine": "37? ₵7 sharp, no ohia pricing today." } },

  { "skill": "economy", "op": "can_afford",
    "params": { "amountGHS": 7, "channel": "CASH" } },
  { "ok": false, "error": { "code": "E_INSUFFICIENT_FUNDS", "retryable": false,
    "message": "Not enough cash for the fare.",
    "details": { "requiredGHS": 7, "cashGHS": 3.5 } } },

  { "skill": "tro-tro", "op": "payAndBoard",
    "params": { "amountGHS": 7, "routeId": "CIRCLE_TO_37" } },
  { "ok": false, "error": { "code": "E_INSUFFICIENT_FUNDS", "retryable": false,
    "message": "Mate refuses: 'No money, no motion, chale.'",
    "details": { "phase": "REFUSED_FUNDS", "shortfallGHS": 3.5,
                 "vanDeparted": true, "nextVanMs": 30000 } } }
]
```

**Agent recovery plan after the failure above:** run
`economy.accept_work("JOB_TROTRO_MATE")` at this same stop (₵15 pay, 30 s
cooldown, Energy ≥ 15 / Hunger ≥ 10), then retry `negotiateFare` when the
next van arrives in 30 s.
