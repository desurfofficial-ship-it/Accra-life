/**
 * test_playable_loop.ts — core loop playability unit tests.
 * Run: npx --yes tsx scripts/test_playable_loop.ts
 */
import { JobManager } from '../src/game/Jobs/JobManager';
import { EconomyManager } from '../src/game/Economy/EconomyManager';
import { NeedsSystem } from '../src/game/Needs/NeedsSystem';
import { getSideHustleById, ACCRA_SIDE_HUSTLES } from '../src/game/Jobs/JobRegistry';
import { ACT_RANGE_M } from '../src/bootstrap/act-handler';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL  ${msg}`);
  }
}

console.log('=== playable core-loop tests ===');

{
  const h = getSideHustleById('HUSTLE_AUNTIE_CARRY');
  assert(!!h, 'starter hustle registered');
  assert(!!h && h.upfrontCapitalGHS === 0, 'starter is free');
  assert(!!h && h.grossPayoutGHS === 25, 'starter pays ₵25');
  assert(!!h && h.steps.length === 2, 'starter has 2 steps');
  assert(ACCRA_SIDE_HUSTLES[0].id === 'HUSTLE_AUNTIE_CARRY', 'starter listed first');
}

{
  const economy = new EconomyManager();
  economy.wallet.resetToZero();
  const jobs = new JobManager(economy);
  const start = jobs.startSideHustle('HUSTLE_AUNTIE_CARRY');
  assert(start.success, `start starter: ${start.message}`);
  const a1 = jobs.tryAdvanceAtInteractable('auntie_carry_1', 'AUNTIE_CARRY_1');
  assert(a1.handled && !a1.completedWork, `step 1: ${a1.message}`);
  const a2 = jobs.tryAdvanceAtInteractable('auntie_carry_2', 'AUNTIE_CARRY_2');
  assert(a2.handled && a2.completedWork, `step 2: ${a2.message}`);
  assert(a2.earnedGHS === 25, `payout ₵25 got ${a2.earnedGHS}`);
  assert(economy.wallet.getCashBalance() >= 25, `wallet ≥25 got ${economy.wallet.getCashBalance()}`);
}

{
  const needs = new NeedsSystem();
  needs.reset();
  const before = needs.getState().hunger;
  needs.setDrainPaused(true);
  needs.tick(1.0);
  assert(Math.abs(needs.getState().hunger - before) < 0.001, 'drain paused');
  needs.setDrainPaused(false);
  needs.tick(1.0);
  assert(needs.getState().hunger < before, 'drain resumes');
}

assert(ACT_RANGE_M === 2.5, `ACT_RANGE_M=2.5`);

{
  const economy = new EconomyManager();
  const jobs = new JobManager(economy);
  jobs.startSideHustle('HUSTLE_AUNTIE_CARRY');
  assert(!!jobs.getActiveHustle(), 'active before cancel');
  jobs.cancelActiveWork();
  assert(!jobs.getActiveHustle() && !jobs.getActiveJob(), 'cleared after cancel');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
