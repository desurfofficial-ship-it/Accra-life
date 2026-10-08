---
name: vendor-system
version: 1.1.0
domain: Makola street-vendor job (GameAPI contract for the timed
  selling shift at the Makola Market vendor stand, on the live
  custom grid map, incl. the NORMAL/RUSH_HOUR payout tiers)
description: >
  Governs how AI agents work the Makola street-vendor stand through the
  live GameAPI bridge (window.GameAPI, wired in src/main.ts startGame()).
  The player presses [E] at the stand and works a 10-second selling
  shift; the payout tier is locked from the shared world event:
  NORMAL pays ₵10 with the relaxed greeting ('Welcome! What you need
  today?'), RUSH_HOUR pays ₵15 with the bonus chaos line ('Rush hour!
  Everyone buying! Make haste!'). The ENGINE owns the shift timer and
  credits the wallet itself through the addFunds path — the agent never
  moves the money. The [CONTRACT] is the owner-issued surface — every
  call is a real method on src/game/GameAPI.ts, runtime smoke-tested.
  v1.1 adds the [ASSETS] section: the procedural vendor stand (NO GLB
  yet), the market food GLB stalls and the vendor water bottle that
  dress the Makola cell, and the pointers to docs/ASSET_MAPPING.md +
  assets/registry.json that stop agents from inventing asset paths or
  replacing the stand with unregistered props.
format: hybrid — [CONTRACT] GameAPI methods + [ROUTING] + [ASSETS] +
  [LOGIC] + [EXAMPLES] (TypeScript)
contract_policy: four-method surface (startVendorJob, getCurrentJob,
  addFunds, getCurrentEvent), copy-exact from src/game/GameAPI.ts
supersedes: v1.0.0 (initial release — four-method contract, engine-pays
  shift, ₵10/₵15 event tiers; unchanged; v1.1 adds the [ASSETS]
  asset-path section)
source_files:
  - src/game/GameAPI.ts (the bridge — startVendorJob injects the live
    player position into the service's proximity gate; addFunds defaults
    category 'SALE' + channel 'CASH')
  - src/game/Jobs/VendorService.ts (the timed shift machine — phase
    IDLE → SELLING → PAID, event-locked earnings + dialogue, engine-only
    payout via EconomyManager.awardIncome → Wallet.addFunds, VENDOR_LINES,
    30 s restock cooldown)
  - src/game/World/EventService.ts (the shared NORMAL ↔ RUSH_HOUR cycle —
    the same singleton the trotro surge reads; NOT the multiplayer
    LiveEventsSystem banner)
  - src/game/World/GridMap.ts (MAKOLA_VENDOR_ANCHOR cell [2,1],
    MAKOLA_VENDOR_STAND_WORLD [-12.6, 2.6] — the proximity anchor)
  - src/game/World/NeighborhoodMarket.ts (hidden-layer
    'makola_vendor_stand' interactable, radius 3.5)
  - src/r3f/LivingVendor.tsx (the visible stand — [E] listener,
    dialogue bubble, 10 s shift bar, sale chime, '+₵' payout float;
    fully procedural — NO GLB stand model yet)
  - src/r3f/StreetCanvas.tsx (mounts LivingVendor at
    MAKOLA_VENDOR_STAND_WORLD; adopts window.GameAPI.vendor)
  - src/bootstrap/game-init.ts (VendorService construction with live
    EconomyManager — the modular factory that replaces inline construction
    in main.ts)
  - src/bootstrap/agent-runtime.ts (AgentRuntime class — per-frame RAF tick
    loop that advances the 10-second shift timer)
  - src/main.ts (vendorService instance → createGameAPI;
    handleWorldTargetInteracted('makola_vendor_stand') →
    VENDOR_SELL_EVENT)
  - src/game/Economy/Wallet.ts (addFunds — validates amount, category
    against ALLOWED_INCOME_CATEGORIES, description length)
adapter: none yet — the GameAPI methods below ARE the contract; the
  reference implementation lives in src/game/Jobs/VendorService.ts
independence: callable alone; needs only the four methods below
---

# Skill: Makola Street-Vendor System

> **Surface note.** The agent talks to the live bridge instance
> (`window.GameAPI`, constructed in `src/main.ts` `startGame()`). The
> vendor is a TIMED STATION SHIFT — a different shape of work from the
> walk-step jobs in `src/game/Jobs/JobManager.ts` (those pay through the
> economy modal flow and are documented in `economy_skill.md`; they do
> not appear through `getCurrentJob()`). One architectural rule before
> anything else: **the engine pays the shift, not the agent.** The 10 s
> timer is the only credit path and it lands through the `addFunds`
> wallet path — an agent that calls `gameAPI.addFunds()` manually for a
> vendor sale double-credits and violates this contract.

## [CONTRACT] Allowed GameAPI Methods (copy-exact from src/game/GameAPI.ts)

```ts
// src/game/GameAPI.ts — wired live as window.GameAPI

gameAPI.startVendorJob(): void;
//   Start a 10-second selling shift at the Makola vendor stand. The
//   bridge injects the live player position into the service's
//   proximity gate (≤ 3.5 m of GridMap.MAKOLA_VENDOR_STAND_WORLD) —
//   a shift can only be worked AT the stand, never remotely.
//   Returns void by contract: VERIFY the shift took with
//   getCurrentJob() (below). Refusals (already selling / restock
//   cooldown / too far) leave getCurrentJob() null and log a
//   '[vendor] start refused (REASON)' line.

gameAPI.getCurrentJob(): string | null;
//   'VENDOR_MAKOLA' while a shift is selling, else null.
//   The agent's verification read: non-null ⇒ shift running (10 s
//   timer armed); null again ⇒ shift over — check the money with
//   getCashBalance()/getTransactions().

gameAPI.addFunds(params: {
  amount: number;
  description: string;
  channel: 'CASH';
}): WalletValidationResult;
//   The street-income credit path. The bridge defaults category
//   'SALE' (Wallet validates it against ALLOWED_INCOME_CATEGORIES) and
//   channel 'CASH', and rejects amounts ≤ 0, > ₵5,000 or descriptions
//   shorter than 3 chars.
//   ⚠️ VENDOR RULE: the ENGINE calls this path itself when a shift
//   completes. The agent must NOT call addFunds for a vendor sale —
//   use it only for OTHER host-driven credits. Verify vendor money via
//   getCashBalance()/getTransactions() instead.

gameAPI.getCurrentEvent(): 'NORMAL' | 'RUSH_HOUR';
//   The live world event (shared EventService singleton — the same
//   cycle the trotro surge reads). Read it BEFORE startVendorJob():
//   it decides the payout tier and the opening line. The event is
//   LOCKED into the shift at start; mid-shift flips change nothing.
```

No other call is part of this skill's contract. (The bridge exposes
more — `getCashBalance`, `getTransactions`, `getActiveTarget`,
`setJoystickInput`, … — for the host and the other skills; see
[ROUTING] for what the four above hit.)

## [ROUTING] Where Each Method Really Executes

The AI never imports `src/` directly. `window.GameAPI` is constructed
at boot with the live instances; every method delegates 1:1:

> **Post phase-0.5 refactor**: system construction lives in
> `src/bootstrap/game-init.ts` (modular factory). The per-frame tick
> loop that advances the 10-second shift timer lives in
> `src/bootstrap/agent-runtime.ts`. UI prompts are in `src/ui/HUD.tsx`.
> The 3D scene (including LivingVendor) is in `src/r3f/GameCanvas.tsx`.
> `src/main.ts` is still the live entry point — see [FILE_LOCATIONS]
> below for the full module map.

| AI-facing call | Routed to | File |
|---|---|---|
| `gameAPI.startVendorJob()` | `VendorService.startVendorJob({x,z})` — position injected from `PlayerController` | `src/game/Jobs/VendorService.ts` |
| `gameAPI.getCurrentJob()` | `VendorService.getCurrentJob` | `src/game/Jobs/VendorService.ts` |
| `gameAPI.addFunds({amount, description, channel: 'CASH'})` | `Wallet.addFunds` (bridge adds `category: 'SALE'` when omitted) | `src/game/Economy/Wallet.ts` |
| `gameAPI.getCurrentEvent()` | `eventService.getCurrentEvent` (shared NORMAL ↔ RUSH_HOUR cycle) | `src/game/World/EventService.ts` |

**One stand, one machine.** The visible stand (`src/r3f/LivingVendor.tsx`)
and the AI bridge share ONE `VendorService` instance — `main.ts`
constructs it with the live `EconomyManager` and hands the SAME instance
to `createGameAPI({ vendor: vendorService })`; `LivingVendor` adopts
`window.GameAPI.vendor` at boot (the same adoption pattern as the
trotro van). What the agent verifies through `getCurrentJob()` is
exactly the shift the player sees on the map.

**The live custom map.** The stand sits on makola cell `[row 2, col 1]`
(`GridMap.MAKOLA_VENDOR_ANCHOR`, world [-16, 0] — Kojo's cell), offset
to the cell's NE corner at `GridMap.MAKOLA_VENDOR_STAND_WORLD =
[-12.6, 2.6]` so the vendor interactable and Kojo's never fight for the
[E] key. The hidden-layer `makola_vendor_stand` interactable (radius
3.5, `NeighborhoodMarket.ts`), the visible stand's [E] range and the
`VendorService` proximity gate all use the same 3.5 m radius on the
same point. Pressing [E] in range fires
`handleWorldTargetInteracted('makola_vendor_stand')` →
`CustomEvent('lagos-life:vendor-sell')` (`VENDOR_SELL_EVENT` in
`src/r3f/gameAPIBridge.ts`) → `LivingVendor` calls
`gameAPI.startVendorJob()` — the same method the agent calls.

**Payout plumbing.** The shift timer credits
`EconomyManager.awardIncome({ amountGHS: earnings, category: 'SALE',
description: 'Makola Market street-vendor sales — …', channel: 'CASH' })`
which routes into `Wallet.addFunds` — the same function
`gameAPI.addFunds()` wraps. The wallet notifies its listeners, so the
HUD balance and the ledger row appear with no extra agent work. Do not
confuse the world event (`EventService`, drives the ₵15 tier) with the
multiplayer `LiveEventsSystem` banner ('Rush Hour · +35% Job Pay') —
different system, different multiplier, different file.

## [ASSETS] The Stand, the Market and the Props (v1.1)

The Makola stand is procedural ON PURPOSE — no vendor-stall GLB exists
in the repo, and an agent that swaps in an unregistered model (or a raw
cube) breaks the visual contract either way. Everything that IS a real
model around the stand is listed below. Paths are copy-exact and serve
from the Vite `public/` root (URL `/assets/…` ↔ file `public/assets/…`).
The master object → asset map is **`docs/ASSET_MAPPING.md`**; the
provenance/licensing ledger is **`assets/registry.json`**. Two hard
rules: (1) never replace a mapped GLB with a box; (2) never invent an
asset path — if it is not in this table or in the master map, it does
not exist.

| Contract object | Asset | Path (copy-exact) | Loaded by |
|---|---|---|---|
| The vendor stand (visible) | **NO GLB YET** — procedural | — | `src/r3f/LivingVendor.tsx` — wooden table + legs, tomato spheres, yam cylinders, crate, umbrella pole at `MAKOLA_VENDOR_STAND_WORLD` [-12.6, 2.6]; the [E] prompt, dialogue bubble, 10 s shift bar and '+₵' float are DOM overlays on this group |
| The hidden interactable | no asset — pure data | — | `src/game/World/NeighborhoodMarket.ts` — `makola_vendor_stand` interactable, radius 3.5 (the systems-layer twin of the visible stand) |
| Market stall produce (dressing around the stand) | 9 food GLBs: `banana`, `apple`, `bread`, `beet`, `avocado`, `barrel`, `bowl`, `bottle-ketchup`, `bag` | `/assets/glb/food/{file}.glb` | `src/r3f/MarketStalls.tsx` — 2 stalls × 9 items on cells [1,1] + [2,2] (Makola), procedural `StallTable`, per-item scale 0.6–0.8, all preloaded at module scope |
| The vendor water bottle | `plastic_water_bottle.glb` (303 KB) | `/assets/glb/props/plastic_water_bottle.glb` | `src/r3f/BuildingAssets.tsx` — Makola cell [1,1] offset [+2, 0.8, −1], scale 0.5, preloaded |
| Food GLB textures (dependency) | `colormap.png` | `/assets/glb/food/Textures/colormap.png` | required by every food GLB internally — ships with the pack; if the folder is moved the textures 404 silently (v4.4 tro-tro fix) |
| Sale-complete feedback | WebAudio chime + DOM float (no file) | — | `LivingVendor.tsx` — chime + '+₵15'/'₵10' float + 'Sales counted — ₵… in hand!' PAID beat; verified via `getCashBalance()`/`getTransactions()`, not the animation |

**Planned drops (paths RESERVED under the registry's
`assets/accra/props/` layout, files DO NOT exist — never reference
them):** a hand-crafted Accra vendor stall GLB (wooden kiosk + umbrella
+ waakye pot), local food props (waakye plates, kelewele pans, sachet
water racks) and Makola signage. When one lands, register it in
`assets/registry.json` first, add it to `docs/ASSET_MAPPING.md` second,
and only then wire it into `LivingVendor.tsx`.

## [LOGIC] The Vendor Behavior

1. **Proximity gate — be at the stand**: the shift only starts within
   3.5 m of `GridMap.MAKOLA_VENDOR_STAND_WORLD` ([-12.6, 2.6]). The
   bridge reads the LIVE player position, so a remote `startVendorJob()`
   is refused (`'[vendor] start refused (TOO_FAR)'`,
   `getCurrentJob()` stays null). Walk to Makola first —
   `setJoystickInput` or the trotro (destination 'makola', arrival cell
   [2,2], then head one cell west).

2. **Event gate — read the world before opening the table**: call
   `gameAPI.getCurrentEvent()` BEFORE `startVendorJob()` and branch:
   - **IF `gameAPI.getCurrentEvent() === 'RUSH_HOUR'`**: earnings =
     **₵15** (base ₵10 × the shared 1.5 surge — the rush bonus) and the
     vendor's dialogue must change to reflect the chaos:
     **'Rush hour! Everyone buying! Make haste!'** — the table opens
     hot, customers swarm, no leisurely patter.
   - **IF `gameAPI.getCurrentEvent() === 'NORMAL'`**: earnings =
     **₵10**, dialogue: **'Welcome! What you need today?'** — the
     standard, relaxed selling shift.
   - The service reads the event ONCE at start and LOCKS both the
     earnings and the line with it (VENDOR_LINES, exact strings). An
     event flip mid-shift can neither surge nor de-surge a running
     sale — quote what was locked, not a live re-read.

3. **Start + verify**: call `gameAPI.startVendorJob()` (void), then
   confirm with `gameAPI.getCurrentJob() === 'VENDOR_MAKOLA'`. Null ⇒
   the start was refused — read the `[vendor] start refused (…)`
   console line for the reason (TOO_FAR / SHIFT_ACTIVE /
   RESTOCK_COOLDOWN) and do NOT retry blindly.

4. **The 10-second shift — engine-owned**: the service arms a 10 s
   timer (`VENDOR_SHIFT_MS`). The agent waits — poll `getCurrentJob()`
   if it needs the moment — and does NOTHING with money during the
   shift. When the timer fires, the engine itself credits the wallet
   through the addFunds path: `{ amount: earnings, description:
   'Makola Market street-vendor sales — normal hours | — rush hour',
   channel: 'CASH', category: 'SALE' }` (spec: 'After 10 seconds, call
   gameAPI.addFunds({ amount: earnings, … })' — the engine executes
   exactly this call shape; the agent executing it too would
   double-credit, which is the one forbidden move in this skill).

5. **Sale-complete beat**: at payout the stand announces the sale —
   chime + '+₵15'/'₵10' float on the visible panel
   (`[vendor] Sale complete — +₵… via addFunds (SALE/CASH) · balance ₵…`
   in the console), shows 'Sales counted — ₵… in hand!' for ~2.5 s
   (`PAID`), then returns to idle. The agent verifies the money, not
   the animation: `getCashBalance()` delta and the top
   `getTransactions()` row (`type: 'INCOME'`, `category: 'SALE'`,
   `channel: 'CASH'`).

6. **One shift at a time + restock cooldown**: `startVendorJob()` while
   selling is a no-op (the running shift's timer is untouched —
   double-presses can never double-arm the payout). After each payout
   the table restocks for **30 s** (`VENDOR_RESTOCK_COOLDOWN_MS`,
   armed at payout time): starts during the window get
   `'[vendor] start refused (RESTOCK_COOLDOWN)'` and the line
   'Table empty — I dey restock. Come back small!'. This is the
   anti-grind balance rule — worst-case throughput ₵15 per 40 s keeps
   the vendor in line with the walk-step jobs (₵18–22 per shift)
   instead of becoming a money printer.

**Ordering is mandatory**: `getCurrentEvent()` → `startVendorJob()` →
`getCurrentJob()` (verify) → wait 10 s (engine pays) →
`getCashBalance()`/`getTransactions()` (verify).
Calling `addFunds` for a vendor sale, or `startVendorJob` for a
second shift while one is selling, is a contract violation.

## [EXAMPLES] Exact TypeScript the Agent Generates

### Example 1 — Normal-hour sale (₵10 earned)

```ts
// Player walks up to the Makola vendor stand on a calm afternoon.
// Cash balance: ₵120. Event: NORMAL.

async function workVendorStandNormal(): Promise<
  'SOLD_10' | 'NOT_AT_STAND' | 'START_REFUSED'
> {
  // 1. Event gate FIRST — it decides the tier and the opening line.
  const event = gameAPI.getCurrentEvent();          // 'NORMAL'

  // 2. Start the shift (the bridge injects the live player position —
  //    the agent never passes coordinates).
  gameAPI.startVendorJob();

  // 3. Verify the shift took (void contract → verify by read).
  if (gameAPI.getCurrentJob() !== 'VENDOR_MAKOLA') {
    // e.g. '[vendor] start refused (TOO_FAR)' — walk closer first.
    return 'NOT_AT_STAND';
  }

  // 4. NORMAL branch — the relaxed table (exact spec line, locked by
  //    the engine at start; the agent mirrors it in its narration).
  if (event === 'NORMAL') {
    console.log('[vendor] Welcome! What you need today?');
    console.log('[vendor] Selling for 10s — ₵10 locked at start.');
  }

  // 5. Wait out the engine-owned timer. The shift ends by itself;
  //    getCurrentJob() flips back to null when the payout lands.
  while (gameAPI.getCurrentJob() === 'VENDOR_MAKOLA') {
    await new Promise(r => setTimeout(r, 500));
  }

  // 6. Verify the money — the ENGINE credited it through the addFunds
  //    path (category 'SALE', channel 'CASH'). The agent did NOT call
  //    addFunds — that is the double-credit guard.
  const balance = gameAPI.getCashBalance();         // 130 (was ₵120)
  const top = gameAPI.getTransactions()[0];
  // top.type === 'INCOME' · top.category === 'SALE' · top.channel === 'CASH'
  // top.description === 'Makola Market street-vendor sales — normal hours'
  console.log(`[vendor] Sale complete — balance now ₵${balance}`);

  return 'SOLD_10';                                 // +₵10, ledger clean
}
```

### Example 2 — Rush Hour sale (₵15 earned, bonus dialogue)

```ts
// The player reaches the stand mid-RUSH_HOUR — Makola is heaving.
// Cash balance: ₵130. Event: RUSH_HOUR.

async function workVendorStandRushHour(): Promise<
  'SOLD_15' | 'NOT_AT_STAND' | 'ON_COOLDOWN' | 'START_REFUSED'
> {
  // 1. Event gate — read the world BEFORE opening the table.
  const event = gameAPI.getCurrentEvent();          // 'RUSH_HOUR'

  // 2. Start the shift.
  gameAPI.startVendorJob();

  // 3. Verify. Null ⇒ refused — distinguish the reasons and react.
  if (gameAPI.getCurrentJob() !== 'VENDOR_MAKOLA') {
    console.log('[vendor] start refused — check the [vendor] console line');
    return event === 'RUSH_HOUR' ? 'ON_COOLDOWN' : 'NOT_AT_STAND';
    // RESTOCK_COOLDOWN → 'Table empty — I dey restock. Come back small!'
    //   wait out the 30 s restock, then re-run from step 1.
    // TOO_FAR → walk to the stand ([-12.6, 2.6]) first.
  }

  // 4. RUSH_HOUR branch — the bonus tier + the chaos voice (exact
  //    spec lines; the engine locked ₵15 and this line at start).
  if (event === 'RUSH_HOUR') {
    console.log('[vendor] Rush hour! Everyone buying! Make haste!');
    console.log('[vendor] Surge pricing works for the seller too — ₵15 locked.');
  }

  // 5. Wait out the 10 s shift — no money calls mid-shift.
  while (gameAPI.getCurrentJob() === 'VENDOR_MAKOLA') {
    await new Promise(r => setTimeout(r, 500));
  }

  // 6. Verify the surged payout (engine-paid, ledger-verified).
  const balance = gameAPI.getCashBalance();         // 145 (was ₵130)
  const top = gameAPI.getTransactions()[0];
  // top.amount === 15 · top.type === 'INCOME' · top.category === 'SALE'
  // top.description === 'Makola Market street-vendor sales — rush hour'
  console.log(`[vendor] Sale complete — +₵15 rush bonus, balance ₵${balance}`);

  // 7. Post-sale reality: the table restocks for 30 s (armed at payout).
  //    If the rush window still burns, queue the next shift AFTER the
  //    cooldown instead of hammering startVendorJob.

  return 'SOLD_15';                                 // +₵15, ledger clean
}
```

---

## [FILE_LOCATIONS]

- Skill logic: `skills/vendor-system.md`
- GameAPI bridge: `src/game/GameAPI.ts` (startVendorJob / getCurrentJob / addFunds)
- Agent runtime: `src/bootstrap/agent-runtime.ts` (per-frame system tick loop)
- UI prompts: `src/ui/HUD.tsx` (EventBanner + ClockHud + TroTroPrompt consolidated)
- 3D scene: `src/r3f/GameCanvas.tsx` (re-exports StreetCanvas — mounts LivingVendor)
- Game systems init: `src/bootstrap/game-init.ts` (VendorService construction)
- Firebase init: `src/bootstrap/firebase-init.ts`
- Game loop: `src/game/GameLoop.ts` (systems-layer RAF tick)
- Asset loader: `src/assetUrl.ts` (Vite-aware base path for Pages deploy)
- Error boundary: `src/r3f/AssetBoundary.tsx` (per-group error isolation)

> **Post phase-0.5 refactor**: `src/main.ts` is still the live entry point
> (2718 lines). The modular skeleton above is the target architecture.
> `src/bootstrap/game-init.ts` constructs the VendorService with the live
> EconomyManager; `src/bootstrap/agent-runtime.ts` wraps the RAF tick loop
> that drives the 10-second shift timer. See `src/bootstrap/index.ts` for
> the migration path.
