---
name: economy
version: 1.0.0
domain: wallet, jobs & hustles, crime heat, housing spend, needs recovery
description: >
  Full financial and work authority for the player: multi-channel wallet
  (cash / MoMo / bank / unsecured illicit), everyday Accra expenses,
  place-tied recovery actions, legal jobs and side hustles with requirement
  gates, risky/illegal hustles with police heat and arrests, and all
  housing-related spending (furniture, room upgrades, cooking, sleep).
source_systems:
  - src/game/Economy/EconomyManager.ts
  - src/game/Economy/Wallet.ts
  - src/game/Economy/EconomicTypes.ts
  - src/game/Economy/Transaction.ts
  - src/game/Jobs/JobRegistry.ts
  - src/game/Jobs/JobManager.ts
  - src/game/Crime/HeatSystem.ts
  - src/game/Needs/NeedsSystem.ts
  - src/game/Home/HomeSystem.ts
adapter: skills/agent-adapter.ts#EconomySkill
independence: callable alone; work-advance steps pair with movement
---

# economy_skill

## 1. Purpose

The economy skill unifies everything the game tracks about money, work and
survival. Today these flows live across `EconomyManager` (expenses, income,
progression), `Wallet` (validated channels + ledger), `JobManager`
(3-step legal jobs and side hustles), `HeatSystem` (illegal hustles, heat,
arrests), `NeedsSystem` (hunger/energy gates) and `HomeSystem` (housing tiers,
furniture, cooking). The skill exposes them as one ops table so the main agent
can plan a full Accra day — earn, eat, recover, gamble on risk, upgrade the
room — through a single consistent contract.

## 2. When to call this skill

- Any plan step involving cedis: "buy", "pay", "earn", "wages", "afford".
- Before movement ops that cost fare (`movement.travel` auto-delegates here).
- After any `E_INSUFFICIENT_FUNDS` / `E_REQUIREMENTS_UNMET` from other skills.
- When deciding risk: read heat and arrest exposure *before* illegal hustles.
- When hunger/energy threaten a job's requirements — recover first.

## 3. Behavioral rules (voice & conduct)

- **Survival-first budgeting.** Keep at least one meal (₵10–12) buffered; a
  collapse of hunger/energy blocks every job requirement gate.
- **Honest ledger.** Only `award_income` may credit the wallet, always with a
  real category + description; the agent never narrates balances it hasn't
  read from `get_wallet` this turn.
- **Channel discipline.** Street vendors are CASH; MoMo sends and bank
  transfers use their own balances and never silently convert channels.
- **Risk honesty.** Illegal hustles must be labeled to the player with their
  real `riskLabel` (heat per step, fine, seizure). Illicit payouts are
  *unsecured cash* — an arrest confiscates them plus the fine.
- **Cooldown respect.** Every job/hustle/recovery action carries a cooldown;
  re-running early returns `E_COOLDOWN` — schedule, don't hammer.
- **Escalate comfort, don't hoard.** Surplus cash above the meal buffer should
  flow to housing tiers/furniture, which raise sleep restore, cooking value
  and job payout percentage.
- **Arrest protocol.** On `E_ARRESTED`: stop risk-taking for the session arc,
  read `details.arrest`, pay/acknowledge the fine, and reduce heat via legal
  recovery actions before considering any future hustle.

## 4. Code map

| Game system | File | What the skill wraps |
|---|---|---|
| `EconomyManager` | `src/game/Economy/EconomyManager.ts` | `canAfford`, `awardIncome`, `purchaseEverydayExpense`, `ACCRA_EVERYDAY_EXPENSES`, progression tier recompute, snapshot save |
| `Wallet` | `src/game/Economy/Wallet.ts` | cash/momo/bank/`unsecuredIllegalCash` balances, `addFunds` validation (≤ ₵5,000/credit, category whitelists), 40-entry ledger |
| `EconomicTypes` | `src/game/Economy/EconomicTypes.ts` | `PaymentChannel`, `TransactionCategory`, `ECONOMIC_PROGRESSION_TIERS` (₵0/60/180/500/1500 lifetime thresholds) |
| `JobManager` | `src/game/Jobs/JobManager.ts` | accept/cancel/`tryAdvanceAtInteractable`, cooldown map, requirement evaluation, single active slot |
| `JobRegistry` | `src/game/Jobs/JobRegistry.ts` | 3 legal jobs (₵15–22, 30–60 s cooldowns), 2 side hustles (₵10 / ₵5→₵16) |
| `HeatSystem` | `src/game/Crime/HeatSystem.ts` | heat 0–100, `PoliceStatus`, wanted stars 0–3, arrest roll + confiscation/fine, 2 illegal hustles (₵45 / ₵68) |
| `NeedsSystem` | `src/game/Needs/NeedsSystem.ts` | hunger −0.35/s, energy −0.22/s decay; `eatMeal` +45, `sleep` +55, `restLight`, `canWork` gate |
| `HomeSystem` | `src/game/Home/HomeSystem.ts` | 6 housing tiers (₵0→luxury), `FURNITURE_CATALOG` (₵25–350), buy/place/sell, comfort & payout bonuses |

## 5. Operations

| Op | Description | Key params → result | Cost / gate |
|---|---|---|---|
| `economy.get_wallet` | Balances + progression + active flags | — → `WalletSnapshot` | none |
| `economy.get_transactions` | Recent ledger | `limit?: 1..40` → `TransactionRecord[]` | none |
| `economy.can_afford` | Dry-run affordability | `amountGHS`, `channel?` → `{ affordable }` | none |
| `economy.award_income` | Credit validated income | `amountGHS`, `category`, `description`, `channel?`, `isIllegalOrigin?` → `TransactionRecord` | whitelist + ≤ ₵5,000 |
| `economy.purchase_expense` | Buy a fixed everyday SKU | `expenseId` → `PurchaseResult` | CASH; funds check |
| `economy.recovery_action` | Zone-tied rest/eat action | `recoveryActionId` → `RecoveryResult` | cost + zone presence + cooldown |
| `economy.list_work` | Jobs, hustles, illegal offers, active state | — → `WorkBoard` | none |
| `economy.accept_work` | Accept legal job or side hustle | `workId` → `AcceptResult` | requirements + not busy |
| `economy.advance_work` | Attempt step at a target | `interactableId`, `assetId?` → `AdvanceResult` | correct step target |
| `economy.cancel_work` | Drop active job/hustle | — → `cancelledId` | none |
| `economy.start_illegal` | Begin risky hustle | `hustleId` → `AcceptResult` | not busy; adds heat |
| `economy.get_heat` | Police state | — → `HeatSnapshot` | none |
| `economy.needs_state` | Hunger/energy + work gate | — → `NeedsSnapshot` | none |
| `economy.needs_action` | eat / sleep / rest / boost | `action`, `label?` → `NeedsResult` | internal rules |
| `economy.housing_overview` | Tier, slots, comfort, effects | — → `HousingSnapshot` | none |
| `economy.housing_buy` | Buy furniture item | `furnitureId` → `HousingBuyResult` | funds + slot capacity |
| `economy.housing_sell` | Sell placed instance | `instanceId` → `HousingSellResult` | must be placed |
| `economy.housing_upgrade` | Move up a housing tier | `tierId` → `HousingUpgradeResult` | funds; unlock persists |

## 6. Typed I/O (core schemas)

```ts
// economy.get_wallet → WalletSnapshot
interface WalletSnapshot {
  cashGHS: number; momoGHS: number; bankGHS: number;
  unsecuredIllegalCashGHS: number;      // seizable on arrest
  lifetimeEarnedGHS: number; lifetimeSpentGHS: number;
  progression: { level: EconomicProgressionLevel; title: string;
                 nextThresholdGHS: number | null };
}

// economy.purchase_expense — fixed SKUs (ACCRA_EVERYDAY_EXPENSES)
// EXP_WAAKYE_MEAL ₵12 FOOD · EXP_TROTRO_FARE ₵6 TRANSPORT ·
// EXP_PROVISION_BUNDLE ₵5 PURCHASE (grants everyday_water_airtime_pack)
interface PurchaseResult { success: boolean; message: string;
                          transaction: TransactionRecord | null; }

// economy.accept_work / advance_work
interface WorkOffer { workId: string; kind: "legal_job" | "side_hustle" | "illegal";
  title: string; payGHS: number;        // hustles: grossPayoutGHS
  capitalGHS?: number; cooldownSeconds?: number;
  requirements?: { minEnergy: number; minHunger?: number; traits?: string[] };
  riskLabel?: string; steps: { stepId: string; stepTitle: string;
    targetInteractableId: string; actionVerb: string }[]; }
interface ActiveWork { workId: string; kind: WorkOffer["kind"];
  currentStepIndex: number; totalSteps: number;
  currentStep: WorkOffer["steps"][number]; }
interface AdvanceResult { handled: boolean; completedWork: boolean;
  earnedGHS: number; message: string; }

// economy.get_heat → HeatSnapshot
interface HeatSnapshot { heatLevel: number;                      // 0..100
  policeStatus: "NORMAL"|"CLEAN"|"SUSPICIOUS"|"WANTED"|"ARRESTED";
  wantedStars: 0|1|2|3; arrestCount: number;
  activeIllegalHustle: ActiveWork | null; }

// economy.needs_state → NeedsSnapshot
interface NeedsSnapshot { hunger: number; energy: number;        // 0..100
  canWork: { ok: boolean; reason?: string }; }

// economy.housing_buy / housing_upgrade
interface HousingBuyResult { success: boolean; message: string;
  purchasePriceGHS: number; comfortScore: number; }
interface HousingUpgradeResult { success: boolean; message: string;
  tier: { id: string; title: string; costGHS: number; maxFurnitureSlots: number;
          sleepEnergyRestore: number; jobPayoutBonusPct: number }; }
```

### Reference tables the agent should memorize

**Everyday SKUs:** Waakye pack ₵12 · Trotro fare ₵6 · Provisions+airtime ₵5.
**Progression tiers:** Survival ₵0 → Stability ₵60 → Improvement ₵180 →
Prosperity ₵500 → Wealth ₵1,500 (lifetime earned).
**Legal jobs:** Provisions Assistant ₵18/45 s · Waakye Dispatch ₵22/60 s ·
Trotro Mate ₵15/30 s — all 3-step walks with energy/hunger gates.
**Side hustles:** Uncle Mensah errand ₵10 (₵0 capital) · Cold-water trading
₵16 (₵5 capital).
**Illegal hustles:** Contraband parcel ₵45 (22% arrest, +30 heat/step, ₵18
fine) · Black-market run ₵68 (34% arrest, +38 heat/step, ₵25 fine).
**Housing:** single room ₵0 → chamber+kitchen/bath ₵650 → self-contained →
one-bed → premium → luxury (see `HOUSING_TIERS` for exact mid-tier prices;
upgrades unlock permanently).
**Furniture examples:** plastic chair ₵25 · wooden stool ₵40 · veranda table
₵80 · woven rug ₵120 · kente tapestry ₵150 · 2-seater sofa ₵350.

## 7. Failure modes

| Situation | Error | Recovery |
|---|---|---|
| Cash short at purchase/fare/upgrade | `E_INSUFFICIENT_FUNDS` | take a job/hustle; keep meal buffer |
| Energy/hunger below job minimums | `E_REQUIREMENTS_UNMET` | recovery action, eat, or sleep |
| Accepting while work active | `E_BUSY` (+`activeWorkId`) | finish or `cancel_work` |
| Step advanced at wrong target | `handled:false` (silent) | re-read `list_work` current step |
| Job on cooldown | `E_COOLDOWN` | schedule around `retryAfterMs` |
| Credit > ₵5,000 or bad category | rejected by `Wallet.addFunds` | split income; use whitelist |
| Arrest mid-hustle | `E_ARRESTED` + confiscation/fine | legal play until heat decays |
| Furniture slots full | `E_STORE_FULL` | upgrade tier or sell placed items |

## 8. Worked examples

**Example A — a legal earning loop (₵22):**

```json
[
  { "skill": "economy", "op": "needs_state", "params": {} },
  { "ok": true, "result": { "hunger": 61, "energy": 74,
    "canWork": { "ok": true } } },
  { "skill": "economy", "op": "accept_work", "params": { "workId": "JOB_WAAKYE_DISPATCH" } },
  { "ok": true, "result": { "success": true, "workId": "JOB_WAAKYE_DISPATCH",
    "currentStep": { "stepId": "waa_1", "targetInteractableId": "food_vendor" } } },
  { "skill": "movement", "op": "approach_interactable", "params": { "interactableId": "food_vendor" } },
  { "skill": "economy", "op": "advance_work", "params": { "interactableId": "food_vendor" } },
  { "ok": true, "result": { "handled": true, "completedWork": false,
    "earnedGHS": 0, "message": "Step 2/3: Packs ready. Take them to the trotro stop." } }
]
```

**Example B — an illegal gamble that ends in arrest:**

```json
[
  { "skill": "economy", "op": "start_illegal",
    "params": { "hustleId": "ILLEGAL_CONTRABAND_PARCEL" } },
  { "ok": true, "result": { "success": true, "riskLabel":
    "Medium-High Risk · +30 Heat/Step · Police Seizure & ₵18 Fine if Caught" } },
  { "skill": "economy", "op": "advance_work", "params": { "interactableId": "trotro_stop" } },
  { "ok": false, "error": { "code": "E_ARRESTED", "retryable": false,
    "message": "Patrol interception during unlicensed parcel drop.",
    "details": { "arrest": { "confiscatedGHS": 45, "finePaidGHS": 18 } } } },
  { "skill": "economy", "op": "get_wallet", "params": {} }
]
```

**Example C — spend surplus on comfort:**

```json
[
  { "skill": "economy", "op": "housing_upgrade",
    "params": { "tierId": "chamber_kitchen_bath" } },
  { "ok": true, "result": { "success": true,
    "message": "Upgraded to 🏠 Single Room + Kitchen/Bath (25 m²)!",
    "tier": { "id": "chamber_kitchen_bath", "costGHS": 650,
              "maxFurnitureSlots": 6, "sleepEnergyRestore": 72,
              "jobPayoutBonusPct": 5 } } },
  { "skill": "economy", "op": "housing_buy", "params": { "furnitureId": "sofa" } },
  { "ok": true, "result": { "success": true, "purchasePriceGHS": 350,
    "message": "2-Seater Lounge Sofa added · Comfort 62%", "comfortScore": 62 } }
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

- Skill logic: `skills/economy_skill.md`
- GameAPI bridge: `src/game/GameAPI.ts`
- Agent runtime: `src/bootstrap/agent-runtime.ts`
- UI prompts: `src/ui/HUD.tsx`
- 3D scene: `src/r3f/GameCanvas.tsx`
- Shared runtime state: `src/bootstrap/state.ts`
- System singletons + hydration: `src/bootstrap/services.ts`
- Boot orchestrator (<50 lines): `src/main.ts`
