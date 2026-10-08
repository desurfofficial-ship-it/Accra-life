/**
 * Playability patch — core-loop regression tests.
 *
 * Pins the contract the playtest review demanded ("Make the core loop
 * playable: Act, movement, first earnings"):
 *
 *   1. ACT DECISION MATRIX (src/game/Player/ActDecision.ts):
 *      - Player at a job step's target → 'interact' (step advances).
 *      - Objective active, player 50 m away → 'walk' toast decision with
 *        the live distance — and NO 'hub' kind exists in the union at
 *        all, so Act can never open the economy hub again.
 *      - No objective → 'noObjective' nudge (hub stays on the JOBS btn).
 *
 *   2. INTERACTION SYSTEM RANGE (src/game/Player/InteractionSystem.ts):
 *      - triggerCurrentInteraction() succeeds inside the target radius,
 *        fails outside it, and the objective target getters/flash work.
 *
 *   3. FIRST EARNINGS (src/game/Jobs/* starter hustle):
 *      - Completing the free starter hustle ("Help Aunty Ba carry pans")
 *        credits the wallet (+₵15), after which the ₵5 trotro fare
 *        purchase succeeds — the reviewer's "first cedis → food/fare"
 *        chain, headlessly.
 *      - A wrong assetId does NOT advance a step (guard intact).
 *
 *   4. CANCEL IS POSITION-NEUTRAL: cancelling a hustle clears the
 *      objective without touching wallet balance or needing a teleport
 *      (JobManager/HeatSystem have no position writes — pinned here by
 *      asserting state, the location pill follows the single mirrored
 *      player position by construction).
 *
 *   5. STARTER NEEDS DRAIN (src/game/Needs/NeedsSystem.ts):
 *      - Level-1 starter profile drains ~3/min hunger + ~2/min energy;
 *        the survival profile drains ~21/min + ~13.2/min.
 *      - drinkWater() is free and restores energy/hunger.
 *
 * Run via: npm run test:playability
 */
import './helpers/node-storage-stub';
import assert from 'node:assert/strict';
import { resolveActDecision, type ActDecision } from '../src/game/Player/ActDecision';
import { InteractionSystem } from '../src/game/Player/InteractionSystem';
import { InputManager } from '../src/game/Player/InputManager';
import { JobManager } from '../src/game/Jobs/JobManager';
import { EconomyManager } from '../src/game/Economy/EconomyManager';
import { NeedsSystem } from '../src/game/Needs/NeedsSystem';
import { ACCRA_SIDE_HUSTLES } from '../src/game/Jobs/JobRegistry';
import * as THREE from 'three';

let passed = 0;
function ok(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

// ── 1. Act decision matrix ──────────────────────────────────────────────────
console.log('\n[1] Act decision matrix (no hub escape hatch)');
ok('in-range target → interact', () => {
  const d = resolveActDecision({
    hasActiveTarget: true,
    objective: { targetInteractableId: 'food_vendor', targetTitle: 'Aunty Ba', stepTag: 'Step 1/3' },
    objectiveTargetPosition: { x: 0, z: -16 },
    playerPosition: { x: 0, z: -17 }
  });
  assert.equal(d.kind, 'interact');
});
ok('objective active at 50 m → walk toast decision with distance', () => {
  const d = resolveActDecision({
    hasActiveTarget: false,
    objective: { targetInteractableId: 'food_vendor', targetTitle: 'Aunty Ba (Waakye Joint)', stepTag: 'Step 1/3' },
    objectiveTargetPosition: { x: 0, z: -16 },
    playerPosition: { x: 0, z: 34 } // exactly 50 m south of the target
  });
  assert.equal(d.kind, 'walk');
  assert.equal(d.kind === 'walk' ? d.distanceM : -2, 50);
  assert.equal(d.kind === 'walk' ? d.targetTitle : '', 'Aunty Ba (Waakye Joint)');
});
ok('objective with unregistered target still guides (no menu)', () => {
  const d = resolveActDecision({
    hasActiveTarget: false,
    objective: { targetInteractableId: 'ghost_target', targetTitle: 'Ghost', stepTag: 'Step 1/2' },
    objectiveTargetPosition: null,
    playerPosition: { x: 0, z: 0 }
  });
  assert.equal(d.kind, 'walk');
  assert.equal(d.kind === 'walk' ? d.distanceM : 0, -1);
});
ok('no objective → noObjective nudge', () => {
  const d = resolveActDecision({
    hasActiveTarget: false,
    objective: null,
    objectiveTargetPosition: null,
    playerPosition: { x: 0, z: 0 }
  });
  assert.equal(d.kind, 'noObjective');
});
ok('the ActDecision union has NO hub kind — Act cannot open the hub', () => {
  const kinds = new Set<string>(
    [
      resolveActDecision({ hasActiveTarget: true, objective: null, objectiveTargetPosition: null, playerPosition: { x: 0, z: 0 } }),
      resolveActDecision({ hasActiveTarget: false, objective: null, objectiveTargetPosition: null, playerPosition: { x: 0, z: 0 } }),
      resolveActDecision({
        hasActiveTarget: false,
        objective: { targetInteractableId: 't', targetTitle: 'T', stepTag: 's' },
        objectiveTargetPosition: { x: 3, z: 4 },
        playerPosition: { x: 0, z: 0 }
      })
    ].map((d: ActDecision) => d.kind)
  );
  assert.ok(kinds.has('interact') && kinds.has('noObjective') && kinds.has('walk'));
  assert.ok(!kinds.has('hub') && !kinds.has('openHub'));
});

// ── 2. InteractionSystem range behavior ─────────────────────────────────────
console.log('\n[2] InteractionSystem range gating');
ok('triggerCurrentInteraction succeeds inside the radius', () => {
  const scene = new THREE.Scene();
  const system = new InteractionSystem(scene, new InputManager());
  system.registerTarget({
    id: 'food_vendor',
    assetId: 'ACC_RESTAURANT_001',
    title: 'Aunty Ba',
    promptLabel: 'Waakye',
    interactionResponse: '',
    position: new THREE.Vector3(0, 0, -16),
    radius: 2.5
  });
  const playerPos = new THREE.Vector3(0.5, 0, -15.5);
  const forward = new THREE.Vector3(0, 0, 1); // facing the stand
  system.update(0.016, playerPos, forward);
  assert.ok(system.getActiveTarget(), 'target should be focused inside radius');
  assert.equal(system.triggerCurrentInteraction(), true);
});
ok('triggerCurrentInteraction fails 50 m away (no hub fallthrough upstream)', () => {
  const scene = new THREE.Scene();
  const system = new InteractionSystem(scene, new InputManager());
  system.registerTarget({
    id: 'food_vendor',
    assetId: 'ACC_RESTAURANT_001',
    title: 'Aunty Ba',
    promptLabel: 'Waakye',
    interactionResponse: '',
    position: new THREE.Vector3(0, 0, -16),
    radius: 2.5
  });
  const playerPos = new THREE.Vector3(0, 0, 34);
  system.update(0.016, playerPos, new THREE.Vector3(0, 0, 1));
  assert.equal(system.getActiveTarget(), null);
  assert.equal(system.triggerCurrentInteraction(), false);
});
ok('objective target getter + flash lifecycle', () => {
  const scene = new THREE.Scene();
  const system = new InteractionSystem(scene, new InputManager());
  system.registerTarget({
    id: 'food_vendor',
    assetId: 'ACC_RESTAURANT_001',
    title: 'Aunty Ba',
    promptLabel: 'Waakye',
    interactionResponse: '',
    position: new THREE.Vector3(0, 0, -16),
    radius: 2.5
  });
  assert.equal(system.getObjectiveTarget(), null);
  system.setObjectiveTarget('food_vendor', false);
  assert.equal(system.getObjectiveTarget()?.id, 'food_vendor');
  system.setObjectiveTarget(null);
  assert.equal(system.getObjectiveTarget(), null);
  system.flashObjectiveMarker();
  assert.equal(system.isObjectiveFlashing(), true);
});

// ── 3. First earnings: starter hustle → wallet → trotro fare ────────────────
console.log('\n[3] Starter hustle pays, fare purchase succeeds');
ok('completing "Help Aunty Ba carry pans" credits +₵15, then ₵5 fare buys', () => {
  const economy = new EconomyManager();
  const jobs = new JobManager(economy);
  const wallet = economy.wallet;
  assert.equal(wallet.getCashBalance(), 0);

  const starter = ACCRA_SIDE_HUSTLES.find((h) => h.id === 'HUSTLE_AUNTY_BA_STARTER');
  assert.ok(starter, 'starter hustle must exist in the registry');
  assert.equal(starter.upfrontCapitalGHS, 0, 'starter must be free');

  const start = jobs.startSideHustle('HUSTLE_AUNTY_BA_STARTER');
  assert.equal(start.success, true, `start should succeed: ${start.message}`);

  const step1 = jobs.tryAdvanceAtInteractable('food_vendor', 'ACC_RESTAURANT_001');
  assert.equal(step1.handled, true);
  assert.equal(step1.completedWork, false);
  const step2 = jobs.tryAdvanceAtInteractable('food_vendor', 'ACC_RESTAURANT_001');
  assert.equal(step2.handled, true);
  assert.equal(step2.completedWork, false);
  const step3 = jobs.tryAdvanceAtInteractable('food_vendor', 'ACC_RESTAURANT_001');
  assert.equal(step3.handled, true);
  assert.equal(step3.completedWork, true);
  assert.equal(step3.earnedGHS, 15);

  assert.equal(wallet.getCashBalance(), 15, 'wallet must go up by the payout');
  assert.ok(wallet.canAfford(5, 'CASH'), '₵5 trotro fare must be affordable');
  const fare = wallet.spendMoney({
    amount: 5,
    description: 'Trotro fare (Circle)',
    category: 'TRANSPORT',
    channel: 'CASH'
  });
  assert.ok(fare, 'fare purchase must succeed');
  assert.equal(wallet.getCashBalance(), 10);
});
ok('wrong assetId does not advance a step', () => {
  const economy = new EconomyManager();
  const jobs = new JobManager(economy);
  jobs.startSideHustle('HUSTLE_AUNTY_BA_STARTER');
  const wrong = jobs.tryAdvanceAtInteractable('food_vendor', 'ACC_SHOP_001');
  assert.equal(wrong.handled, false);
});

// ── 4. Cancel is position-neutral ───────────────────────────────────────────
console.log('\n[4] Cancel leaves wallet/objective state clean');
ok('cancelActiveWork clears the hustle without touching the balance', () => {
  const economy = new EconomyManager();
  const jobs = new JobManager(economy);
  jobs.startSideHustle('HUSTLE_AUNTY_BA_STARTER');
  jobs.tryAdvanceAtInteractable('food_vendor', 'ACC_RESTAURANT_001');
  const before = economy.wallet.getCashBalance();
  const msg = jobs.cancelActiveWork();
  assert.match(msg, /Cancelled side hustle/);
  assert.equal(jobs.getActiveHustle(), null);
  assert.equal(jobs.getActiveJob(), null);
  assert.equal(economy.wallet.getCashBalance(), before, 'cancel must not charge or pay');
});

// ── 5. Starter needs drain + free water ─────────────────────────────────────
console.log('\n[5] Starter drain profile + free water');
ok('starter profile drains ~3/min hunger, ~2/min energy', () => {
  const needs = new NeedsSystem();
  needs.setStarterDecay(true);
  const h0 = needs.getState().hunger;
  const e0 = needs.getState().energy;
  // tick() clamps dt to ≤2s (per-frame contract) — simulate 60s of frames.
  for (let i = 0; i < 3750; i++) needs.tick(0.016); // 3750 × 0.016 = 60 s
  const s = needs.getState();
  assert.ok(Math.abs(h0 - s.hunger - 3) < 0.01, `hunger drop ${h0 - s.hunger} should be 3/min`);
  assert.ok(Math.abs(e0 - s.energy - 2) < 0.01, `energy drop ${e0 - s.energy} should be 2/min`);
});
ok('survival profile (Level 2+) drains ~21/min hunger', () => {
  const needs = new NeedsSystem();
  needs.setStarterDecay(false);
  const h0 = needs.getState().hunger;
  for (let i = 0; i < 3750; i++) needs.tick(0.016);
  const s = needs.getState();
  assert.ok(Math.abs(h0 - s.hunger - 21) < 0.01, `hunger drop ${h0 - s.hunger} should be 21/min`);
});
ok('drinkWater() is free and restores energy + hunger', () => {
  const needs = new NeedsSystem();
  needs.setStarterDecay(false);
  for (let i = 0; i < 3750; i++) needs.tick(0.016); // make room below full
  const before = needs.getState();
  const water = needs.drinkWater();
  assert.equal(water.success, true);
  const after = needs.getState();
  assert.equal(after.energy - before.energy, 10);
  assert.equal(after.hunger - before.hunger, 6);
});

console.log(`\nplayability: ${passed} checks passed`);
