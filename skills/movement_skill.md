---
name: movement
version: 1.0.0
domain: player locomotion, spatial approach & trotro travel
description: >
  Drives the player avatar through the 3D Adabraka/Osu neighborhood:
  walking, sprinting, approaching interactables within their prompt radius,
  and paying-fare trotro travel between Accra districts. Purely spatial —
  owns no money, no chat, no jobs.
source_systems:
  - src/game/Player/PlayerController.ts
  - src/game/Player/InputManager.ts
  - src/game/Player/InteractionSystem.ts
  - src/game/World/Locations.ts
  - src/game/World/NeighborhoodTrotro.ts
adapter: skills/agent-adapter.ts#MovementSkill
independence: callable alone; needs economy only for travel fare
---

# movement_skill

## 1. Purpose

The movement skill converts the game's keyboard/joystick locomotion layer
(`PlayerController.update` reading `InputManager` state) into discrete
agent-callable operations. In the shipped game, the player sees a floating
`#interactionPrompt` ("Waakye · ₵12", "Talk", "Trotro", "Home · Rest & Upgrade")
whenever they drift inside an interactable's radius; this skill lets the main
agent reproduce that loop deliberately: decide a destination, walk there,
and end the move standing inside the prompt radius of the chosen target.

## 2. When to call this skill

- Any plan step containing "go to", "walk to", "approach", "reach", "travel to".
- Before any other skill's location-gated op (vendors, NPC talk, recovery
  actions, job steps) — the other skills assume the avatar is already in place.
- After a failed `E_NOT_AT_LOCATION` error from dialogue or economy.

## 3. Behavioral rules (voice & conduct)

- Move like a commuter, not a missile: prefer `walk` inside named zones
  (markets, compound) and `sprint` only on open street stretches (`osu_oxford_street`)
  or when a job step has no deadline pressure but energy to spare.
- Never route through world edges: clamp requested targets to X ∈ [-25.0, 25.0],
  Z ∈ [-17.2, 17.2]; anything beyond is `E_WORLD_BOUNDS`.
- Treat the spawn point `(0, 0, 5.8)` on Osu Oxford Street as the anchor for
  "town center" descriptions.
- Arrive, then stop: issue `stop` (or rely on move_to's auto-stop) before
  interacting, so the interaction focus dot isn't drifting mid-frame.
- Report progress in *place language* ("at the trotro stop", "on Oxford
  Street"), not raw coordinates, when narrating for the player.

## 4. Code map

| Game system | File | What the skill wraps |
|---|---|---|
| `PlayerController` | `src/game/Player/PlayerController.ts` | `position`, `rotationY`, `isMoving`, `isSprinting`; `walkSpeed=4.5`, `sprintSpeed=7.3`, `playerRadius=0.42`, `worldBoundsX=25.0`, `worldBoundsZ=17.2`; AABB circle collision + penetration resolve |
| `InputManager` | `src/game/Player/InputManager.ts` | `setJoystickInput(x,y)` (virtual stick), `setVirtualSprint(bool)` |
| `InteractionSystem` | `src/game/Player/InteractionSystem.ts` | target registry, proximity scoring `score = dist − dot·0.65` inside `target.radius`, 250 ms interact cooldown |
| `Locations` | `src/game/World/Locations.ts` | `LocationId` union, zone `bounds`, `getLocationAt(x,z)`, place-tied recovery actions |
| Trotro stop | `src/game/World/NeighborhoodTrotro.ts` | `trotro_stop` interactable (fare gate for travel) |
| Travel modal | `index.html` `#travelBackdrop` | UI shell for Makola/Labadi trips (destinations reserved in `LocationId`) |

## 5. Operations

| Op | Description | Key params → result | Cost / gate |
|---|---|---|---|
| `movement.get_state` | Snapshot of avatar + zone | — → `MovementState` | none |
| `movement.move_to` | Walk/sprint to a world point or interactable | `target`, `mode` → `MoveResult` | exclusive; cancels prior move |
| `movement.approach_interactable` | Move into prompt radius of a registered target | `interactableId`, `mode?` → `MoveResult` | needs known target id |
| `movement.set_sprint` | Toggle virtual sprint state | `active: bool` → `void` | none |
| `movement.stop` | Halt in-place (zero joystick) | — → `void` | none |
| `movement.travel` | Trotro trip to a distant district | `destination: LocationId`, `payFare?: bool` → `TravelResult` | fare ₵6 via economy; must start at `trotro_stop` |

## 6. Typed I/O

```ts
// movement.get_state → MovementState
interface MovementState {
  position: { x: number; y: number; z: number };
  rotationY: number;              // radians, facing
  isMoving: boolean;
  isSprinting: boolean;
  locationId: LocationId;         // via getLocationAt(x, z)
  locationName: string;           // LocationDef.displayName
  insideInteractRadiusOf: string | null; // active InteractionSystem target id
}

// movement.move_to
// params
interface MoveToParams {
  target: { x: number; z: number } | { interactableId: string };
  mode: "walk" | "sprint";        // default "walk"
  arriveRadius?: number;          // default 0.9 m; min 0.5
}
// result
interface MoveResult {
  arrived: boolean;               // false if cancelled/blocked timeout
  finalPosition: { x: number; y: number; z: number };
  locationId: LocationId;
  etaSeconds: number;             // straight-line estimate at mode speed
  blockedBy?: string;             // collider id if pathing stalled
}

// movement.approach_interactable
interface ApproachParams {
  interactableId: string;         // e.g. "food_vendor", "npc_male_001"
  mode?: "walk" | "sprint";
}
// result: MoveResult + { promptLabel: string }  (the UI prompt this unlocks)

// movement.travel
interface TravelParams {
  destination: "makola_market" | "labadi_beach"; // extensible LocationId
  payFare?: boolean;              // default true → EXP_TROTRO_FARE ₵6
}
interface TravelResult {
  traveled: boolean;
  chargedGHS: number;
  originLocationId: LocationId;
  destinationLocationId: LocationId;
  note: string;                   // e.g. "UI-shell stage: teleport landing pending"
}
```

### Location registry (zones the agent can name)

| `LocationId` | Display name | Bounds (minX, maxX, minZ, maxZ) | On-site recovery (economy) |
|---|---|---|---|
| `home_compound` | Home Compound | -15.4, -5.5, 8.0, 16.4 | Veranda nap — free, +28 energy, −10 heat |
| `adabraka_provisions` | Adabraka Provisions | -13.0, -5.5, -13.0, -7.7 | Voltic & bofrot — ₵4 |
| `osu_waakye_joint` | Osu Waakye Joint | 5.5, 12.0, -13.0, -7.7 | Waakye & sobolo — ₵10 |
| `circle_trotro_stop` | Circle Trotro Stop | 5.5, 12.0, 4.0, 12.0 | FanIce & chips — ₵5 |
| `osu_oxford_street` | Osu Oxford Street | -25.0, 25.0, -7.7, 7.7 | Fresh coconut — ₵5 |
| `adabraka_neighborhood` | Adabraka (fallback) | infinite | Shade rest — free, −8% heat |
| `makola_market` / `labadi_beach` | Travel destinations | set by travel system | — |

### Registered interactables (approach targets)

| id | promptLabel | World anchor |
|---|---|---|
| `food_vendor` | "Waakye · ₵12" | Sister Akosua's Joint |
| `provision_shop` | "Shop" | Adabraka Provision Store & MoMo |
| `trotro_stop` | "Trotro" | Osu–Circle station |
| `momo_agent` | "MoMo" | Mobile-money umbrella |
| `susu_collector` | "Susu" | Community bank kiosk |
| `chale_wote_panel` | "View Art" | Chale Wote mural |
| `home_door` | "Home · Rest & Upgrade" | Player compound |
| `npc_male_001` / `npc_female_001` / `npc_older_001` | "Talk"/"Talk"/"Errand" | Kojo / Ama / Uncle Mensah |

## 7. Failure modes

| Situation | Error | Recovery |
|---|---|---|
| Target outside bounds | `E_WORLD_BOUNDS` | Clamp into X ±25 / Z ±17.2 |
| Unknown interactable id | `E_UNKNOWN_ID` | `dialogue.list_interactables` for valid ids |
| Housing placement ghost active | `E_BUSY` | Confirm/cancel placement first |
| Arrival timeout (cornered by colliders) | `MoveResult.arrived=false` + `blockedBy` | Reposition to street axis, retry |
| Travel without ₵6 cash | `E_INSUFFICIENT_FUNDS` | Earn first; fare is CASH-channel only |
| Travel not starting at `trotro_stop` | `E_NOT_AT_LOCATION` | `approach_interactable("trotro_stop")` first |

## 8. Worked examples

**Example A — "go buy waakye":**

```json
[
  { "skill": "movement", "op": "approach_interactable",
    "params": { "interactableId": "food_vendor", "mode": "sprint" } },
  { "ok": true, "result": { "arrived": true, "locationId": "osu_waakye_joint",
    "promptLabel": "Waakye · ₵12", "etaSeconds": 6.1 } }
]
```

**Example B — blocked target then recover:**

```json
[
  { "skill": "movement", "op": "move_to",
    "params": { "target": { "x": 40, "z": -6.9 } } },
  { "ok": false, "error": { "code": "E_WORLD_BOUNDS",
    "message": "x=40 exceeds worldBoundsX=25.0" } },
  { "skill": "movement", "op": "move_to",
    "params": { "target": { "x": 24.0, "z": -6.9 }, "mode": "walk" } },
  { "ok": true, "result": { "arrived": true, "locationId": "osu_oxford_street" } }
]
```

**Example C — trotro to the beach:**

```json
[
  { "skill": "movement", "op": "approach_interactable",
    "params": { "interactableId": "trotro_stop" } },
  { "skill": "movement", "op": "travel",
    "params": { "destination": "labadi_beach", "payFare": true } },
  { "ok": true, "result": { "traveled": true, "chargedGHS": 6,
    "originLocationId": "circle_trotro_stop",
    "destinationLocationId": "labadi_beach" } }
]
```

## 9. [ROUTING] Post-refactor wiring (v5)

The boot monolith was split: `src/main.ts` is now a thin orchestrator
(<50 lines) and every concern has a home. For this skill the routing is
unchanged at the game-system layer — `gameAPI.economy.*` still routes to
`src/game/Economy/Wallet.ts` and `gameAPI.player.*` to
`src/game/Player/PlayerController.ts` — but the wiring moved:

- Agent runtime is now in `src/bootstrap/agent-runtime.ts` (GameAPI
  construction + `window` debug handles + EventScheduler takeover,
  called from `startGame()` in `src/bootstrap/game-init.ts`).
- UI rendering is in `src/ui/HUD.tsx` (toasts, wallet deltas, needs and
  economy panels, the interaction prompt).
- The [E]-key interaction routes live in
  `src/bootstrap/interactions.ts` (`handleWorldTargetInteracted`).
- System singletons (EconomyManager, NeedsSystem, HomeSystem, ...) are
  created + hydrated in `src/bootstrap/services.ts`.
- Shared mutable runtime state lives on `S` in `src/bootstrap/state.ts`.

## [FILE_LOCATIONS]

- Skill logic: `skills/movement_skill.md`
- GameAPI bridge: `src/game/GameAPI.ts`
- Agent runtime: `src/bootstrap/agent-runtime.ts`
- UI prompts: `src/ui/HUD.tsx`
- 3D scene: `src/r3f/GameCanvas.tsx`
- Shared runtime state: `src/bootstrap/state.ts`
- System singletons + hydration: `src/bootstrap/services.ts`
- Boot orchestrator (<50 lines): `src/main.ts`

- Act wiring: `src/bootstrap/act.ts` (pure matrix: `src/game/Player/ActDecision.ts`)
- Objective marker (R3F): `src/r3f/ObjectiveMarker.tsx`