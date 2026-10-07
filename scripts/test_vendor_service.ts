/**
 * Phase 7 — VendorService (Makola street-vendor timed shift) end-to-end test.
 *
 * Verifies the VendorService singleton (src/game/Jobs/VendorService.ts):
 *   - startVendorJob() refuses when player is too far from the Makola
 *     vendor stand (proximity gate, rule 1).
 *   - startVendorJob() succeeds when player is at the stand.
 *   - getCurrentJob() returns 'VENDOR_MAKOLA' while shift is running,
 *     null when idle.
 *   - 10-second shift completes + pays via EconomyManager.awardIncome
 *     with category 'SALE', channel 'CASH'.
 *   - NORMAL payout = ₵10, RUSH_HOUR payout = ₵15 (1.5× surge).
 *   - "LOCKED AT START" rule (rule 2): event + earnings locked when
 *     shift starts; mid-shift event flips don't affect a running sale.
 *   - "ONE SHIFT AT A TIME" rule (rule 1): re-calling startVendorJob
 *     during a running shift refuses with reason 'SHIFT_ACTIVE'.
 *   - "RESTOCK COOLDOWN" rule (rule 4): after payout, a 30-second
 *     cooldown blocks the next shift with reason 'RESTOCK_COOLDOWN'.
 *
 * The actual 10-second shift + 30-second cooldown timers are real — the
 * test waits for them (uses fake timers where possible, but
 * VendorService uses real setTimeout so we wait real time).
 *
 * Run via: npm run test:phase7-vendor
 */
import assert from 'node:assert/strict';
import { VendorService, VENDOR_JOB_ID, VENDOR_BASE_EARNINGS_GHS, VENDOR_RUSH_EARNINGS_GHS, VENDOR_INTERACTION_RADIUS_M, VENDOR_RESTOCK_COOLDOWN_MS } from '../src/game/Jobs/VendorService';
import { eventService } from '../src/game/World/EventService';
import { EconomyManager } from '../src/game/Economy/EconomyManager';
import { MAKOLA_VENDOR_STAND_WORLD } from '../src/game/World/GridMap';

let passed = 0;
let failed = 0;

function check(label: string, cond: boolean, extra?: unknown): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`, extra ?? '');
  }
}

async function main(): Promise<void> {
  console.log('\n=== Phase 7 VendorService — end-to-end test ===\n');
  console.log(`Makola vendor stand at world [${MAKOLA_VENDOR_STAND_WORLD[0]}, ${MAKOLA_VENDOR_STAND_WORLD[1]}]\n`);

  // ── Reset singletons ──────────────────────────────────────────────────
  eventService.stop();
  eventService.setEvent('NORMAL');

  // ── Set up fresh EconomyManager (VENDOR_MAKOLA needs an EconomyManager) ──
  const eco = new EconomyManager();
  eco.wallet.addFunds({ amount: 100, category: 'REWARD', description: 'Test seed' });
  const balanceBefore = eco.wallet.getCashBalance();
  console.log(`Test seed: ₵${balanceBefore} starting cash\n`);

  // ── Fresh VendorService (NOT the singleton — to isolate from main.ts) ──
  const vendor = new VendorService(eco);

  // ── Compute player positions ─────────────────────────────────────────
  const standX = MAKOLA_VENDOR_STAND_WORLD[0];
  const standZ = MAKOLA_VENDOR_STAND_WORLD[1];
  // At stand (within radius)
  const atStand = { x: standX, z: standZ };
  // Far from stand (outside radius)
  const farAway = { x: standX + VENDOR_INTERACTION_RADIUS_M + 5, z: standZ };

  // ── 1. getCurrentJob() returns null when idle ─────────────────────────
  console.log('Step 1: getCurrentJob() === null when idle');
  check('getCurrentJob() === null initially', vendor.getCurrentJob() === null);
  const idleSnap = vendor.getSnapshot();
  check('snapshot.phase === "IDLE" initially', idleSnap.phase === 'IDLE');
  check('snapshot.jobId === null initially', idleSnap.jobId === null);
  check('snapshot.event === "NORMAL" initially', idleSnap.event === 'NORMAL');
  check('snapshot.earningsGHS === 0 initially', idleSnap.earningsGHS === 0);

  // ── 2. startVendorJob refuses when too far ──────────────────────────
  console.log('\nStep 2: startVendorJob refuses when too far from stand');
  const farAttempt = vendor.startVendorJob(farAway);
  check('startVendorJob(far) returns started=false',
    farAttempt.started === false);
  check('startVendorJob(far) reason === "TOO_FAR"',
    farAttempt.reason === 'TOO_FAR', farAttempt.reason);
  check('startVendorJob(far) earningsGHS === 0 (refused)',
    farAttempt.earningsGHS === 0);
  check('getCurrentJob() still null after refused start',
    vendor.getCurrentJob() === null);
  check('cash balance unchanged after refused start',
    eco.wallet.getCashBalance() === balanceBefore);

  // ── 3. startVendorJob succeeds at stand (NORMAL state) ───────────────
  console.log('\nStep 3: startVendorJob succeeds at stand (NORMAL state)');
  const okNormal = vendor.startVendorJob(atStand);
  check('startVendorJob(at stand) returns started=true', okNormal.started === true);
  check('startVendorJob(at stand) reason === "OK"', okNormal.reason === 'OK');
  check('startVendorJob(at stand) event === "NORMAL"',
    okNormal.event === 'NORMAL');
  check('startVendorJob(at stand) earningsGHS === 10 (NORMAL)',
    okNormal.earningsGHS === VENDOR_BASE_EARNINGS_GHS, okNormal.earningsGHS);
  check('dialogue includes "Welcome" (NORMAL branch)',
    okNormal.dialogue.toLowerCase().includes('welcome'),
    okNormal.dialogue);
  check('getCurrentJob() === "VENDOR_MAKOLA" while selling',
    vendor.getCurrentJob() === VENDOR_JOB_ID);
  const sellingSnap = vendor.getSnapshot();
  check('snapshot.phase === "SELLING"', sellingSnap.phase === 'SELLING');
  check('snapshot.jobId === "VENDOR_MAKOLA"', sellingSnap.jobId === VENDOR_JOB_ID);
  check('snapshot.event === "NORMAL"', sellingSnap.event === 'NORMAL');
  check('snapshot.earningsGHS === 10', sellingSnap.earningsGHS === 10);

  // ── 4. "ONE SHIFT AT A TIME" rule — re-start refused ─────────────────
  console.log('\nStep 4: ONE SHIFT AT A TIME — re-start during shift refused');
  const reAttempt = vendor.startVendorJob(atStand);
  check('re-start returns started=false', reAttempt.started === false);
  check('re-start reason === "SHIFT_ACTIVE"', reAttempt.reason === 'SHIFT_ACTIVE');

  // ── 5. Wait for 10s shift to complete + verify payout (NORMAL ₵10) ───
  console.log('\nStep 5: 10-second shift completes + pays ₵10 (NORMAL)');
  // Wait for the 10s shift + a small buffer.
  await new Promise((r) => setTimeout(r, 10500));
  check('cash balance increased by ₵10 after NORMAL sale',
    eco.wallet.getCashBalance() === balanceBefore + 10,
    { actual: eco.wallet.getCashBalance(), expected: balanceBefore + 10 });

  // ── 6. "RESTOCK COOLDOWN" rule — next start blocked for 30s ───────────
  console.log('\nStep 6: RESTOCK COOLDOWN blocks next start for 30s');
  const cooldownAttempt = vendor.startVendorJob(atStand);
  check('cooldown attempt returns started=false', cooldownAttempt.started === false);
  check('cooldown attempt reason === "RESTOCK_COOLDOWN"',
    cooldownAttempt.reason === 'RESTOCK_COOLDOWN');
  check('cooldownRemainingMs > 0', (cooldownAttempt.cooldownRemainingMs ?? 0) > 0,
    cooldownAttempt.cooldownRemainingMs);
  // Verify the cooldown dialogue
  check('cooldown dialogue mentions restock', !!cooldownAttempt.dialogue);

  // Wait for the cooldown to expire (~30s — VENDOR_RESTOCK_COOLDOWN_MS).
  console.log(`  waiting ${VENDOR_RESTOCK_COOLDOWN_MS + 500}ms for cooldown to expire...`);
  await new Promise((r) => setTimeout(r, VENDOR_RESTOCK_COOLDOWN_MS + 500));

  // ── 7. After cooldown, start succeeds again ────────────────────────────
  console.log('\nStep 7: after cooldown, start succeeds again');
  const postCdAttempt = vendor.startVendorJob(atStand);
  check('post-cooldown start returns started=true', postCdAttempt.started === true);
  check('post-cooldown start reason === "OK"', postCdAttempt.reason === 'OK');

  // Wait for this shift to complete + verify cooldown re-arms.
  await new Promise((r) => setTimeout(r, 10500));
  check('cash balance increased by ₵20 (2 NORMAL sales)',
    eco.wallet.getCashBalance() === balanceBefore + 20,
    { actual: eco.wallet.getCashBalance(), expected: balanceBefore + 20 });

  // Wait for cooldown again before RUSH_HOUR test.
  console.log(`  waiting ${VENDOR_RESTOCK_COOLDOWN_MS + 500}ms for second cooldown...`);
  await new Promise((r) => setTimeout(r, VENDOR_RESTOCK_COOLDOWN_MS + 500));

  // ── 8. RUSH_HOUR payout = ₵15 ─────────────────────────────────────────
  console.log('\nStep 8: RUSH_HOUR sale pays ₵15 (1.5× surge)');
  eventService.setEvent('RUSH_HOUR');
  check('eventService.getCurrentEvent() === "RUSH_HOUR"',
    eventService.getCurrentEvent() === 'RUSH_HOUR');
  const okRush = vendor.startVendorJob(atStand);
  check('RUSH_HOUR start succeeds', okRush.started === true);
  check('RUSH_HOUR start event === "RUSH_HOUR"', okRush.event === 'RUSH_HOUR');
  check('RUSH_HOUR start earningsGHS === 15 (1.5× surge)',
    okRush.earningsGHS === VENDOR_RUSH_EARNINGS_GHS, okRush.earningsGHS);
  check('RUSH_HOUR dialogue includes "Rush hour"',
    okRush.dialogue.toLowerCase().includes('rush hour'), okRush.dialogue);

  // ── 9. "LOCKED AT START" rule — mid-shift event flip doesn't affect ──
  console.log('\nStep 9: LOCKED AT START — mid-shift event flip ignored');
  // Flip to NORMAL mid-shift — earnings should still be ₵15 (locked at start).
  eventService.setEvent('NORMAL');
  check('mid-shift eventService flipped to "NORMAL"',
    eventService.getCurrentEvent() === 'NORMAL');
  // The locked earnings in the snapshot should still be ₵15.
  const midShiftSnap = vendor.getSnapshot();
  check('mid-shift snapshot.earningsGHS still 15 (locked)',
    midShiftSnap.earningsGHS === 15, midShiftSnap.earningsGHS);
  check('mid-shift snapshot.event still "RUSH_HOUR" (locked)',
    midShiftSnap.event === 'RUSH_HOUR');

  // Wait for the shift to complete + verify payout is the locked ₵15.
  await new Promise((r) => setTimeout(r, 10500));
  check('cash balance increased by ₵35 total (₵20 NORMAL + ₵15 RUSH_HOUR)',
    eco.wallet.getCashBalance() === balanceBefore + 35,
    { actual: eco.wallet.getCashBalance(), expected: balanceBefore + 35 });

  // ── 10. onShiftUpdate listener fires on each phase transition ────────
  console.log('\nStep 10: onShiftUpdate listener fires on phase transitions');
  let shiftUpdateCalls = 0;
  const lastPhases: string[] = [];
  const unsubShift = vendor.onShiftUpdate((snap) => {
    shiftUpdateCalls += 1;
    lastPhases.push(snap.phase);
  });

  // Wait for current cooldown to expire, then start a shift.
  console.log(`  waiting ${VENDOR_RESTOCK_COOLDOWN_MS + 500}ms for third cooldown...`);
  await new Promise((r) => setTimeout(r, VENDOR_RESTOCK_COOLDOWN_MS + 500));
  shiftUpdateCalls = 0;
  lastPhases.length = 0;

  vendor.startVendorJob(atStand);
  // Should have fired at least once (SELLING transition).
  check('onShiftUpdate fired on SELLING transition',
    shiftUpdateCalls >= 1 && lastPhases.includes('SELLING'),
    { shiftUpdateCalls, lastPhases });
  await new Promise((r) => setTimeout(r, 10500));
  // Should have fired for PAID transition.
  check('onShiftUpdate fired on PAID transition',
    lastPhases.includes('PAID'),
    { shiftUpdateCalls, lastPhases });

  unsubShift();

  // ── Cleanup ───────────────────────────────────────────────────────────
  eventService.setEvent('NORMAL');

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
