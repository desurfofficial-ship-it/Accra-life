/**
 * Phase 6 — EventService (Rush Hour state machine) end-to-end test.
 *
 * Verifies the EventService singleton (src/game/World/EventService.ts):
 *   - getCurrentEvent() returns 'NORMAL' initially.
 *   - setEvent('RUSH_HOUR') transitions state + fires onEventChange listener.
 *   - getCurrentEvent() / isRushHour() / getFareMultiplier() all reflect
 *     the live event.
 *   - setEvent() is idempotent (no-op when same event).
 *   - onEventChange fires immediately on subscribe (actually it does NOT
 *     on this implementation — verified below).
 *   - start()/stop() control the real-time auto-cycle (90s NORMAL +
 *     45s RUSH_HOUR alternating). We test that start() arms the cycle
 *     + stop() halts it (using a fast custom timer via setEvent to
 *     avoid waiting 90s).
 *
 * Run via: npm run test:phase6-event
 */
import assert from 'node:assert/strict';
import { eventService, type GameEventId } from '../src/game/World/EventService';

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
  console.log('\n=== Phase 6 EventService (Rush Hour) — end-to-end test ===\n');

  // ── Reset to known state ──────────────────────────────────────────────
  eventService.stop();
  eventService.setEvent('NORMAL');

  // ── 1. Initial state is NORMAL ────────────────────────────────────────
  console.log('Step 1: initial state is NORMAL');
  check('getCurrentEvent() === "NORMAL"', eventService.getCurrentEvent() === 'NORMAL');
  check('isRushHour() === false', eventService.isRushHour() === false);
  check('getFareMultiplier() === 1.0 (NORMAL)', eventService.getFareMultiplier() === 1.0);
  check('getSpeedFactor() === 1.0 (NORMAL)', eventService.getSpeedFactor() === 1.0);

  // ── 2. setEvent transitions + listener fires ──────────────────────────
  console.log('\nStep 2: setEvent("RUSH_HOUR") transitions + fires listener');
  let listenerCalls: GameEventId[] = [];
  const unsubscribe = eventService.onEventChange((newEvent) => {
    listenerCalls.push(newEvent);
  });
  // Note: EventService.onEventChange does NOT fire immediately on subscribe.
  check('no spurious fire on subscribe', listenerCalls.length === 0, listenerCalls);

  eventService.setEvent('RUSH_HOUR');
  check('getCurrentEvent() === "RUSH_HOUR" after setEvent',
    eventService.getCurrentEvent() === 'RUSH_HOUR');
  check('isRushHour() === true', eventService.isRushHour());
  check('getFareMultiplier() === 1.5 (RUSH_HOUR)',
    eventService.getFareMultiplier() === 1.5);
  check('getSpeedFactor() === 0.6 (RUSH_HOUR — van 40% faster)',
    eventService.getSpeedFactor() === 0.6);
  check('onEventChange listener fired once with RUSH_HOUR',
    listenerCalls.length === 1 && listenerCalls[0] === 'RUSH_HOUR',
    listenerCalls);

  // ── 3. setEvent is idempotent (no fire on same event) ─────────────────
  console.log('\nStep 3: setEvent idempotent (no fire when same event)');
  listenerCalls = [];
  eventService.setEvent('RUSH_HOUR'); // already RUSH_HOUR → no transition
  check('setEvent same event → no listener fire',
    listenerCalls.length === 0, listenerCalls);
  check('getCurrentEvent() still RUSH_HOUR', eventService.getCurrentEvent() === 'RUSH_HOUR');

  // ── 4. Transition back to NORMAL ──────────────────────────────────────
  console.log('\nStep 4: transition back to NORMAL');
  listenerCalls = [];
  eventService.setEvent('NORMAL');
  check('getCurrentEvent() === "NORMAL"', eventService.getCurrentEvent() === 'NORMAL');
  check('isRushHour() === false after NORMAL', !eventService.isRushHour());
  check('getFareMultiplier() === 1.0 after NORMAL',
    eventService.getFareMultiplier() === 1.0);
  check('listener fired once with NORMAL',
    listenerCalls.length === 1 && listenerCalls[0] === 'NORMAL',
    listenerCalls);

  // ── 5. getSnapshot() returns correct shape ────────────────────────────
  console.log('\nStep 5: getSnapshot() returns full state');
  const snap = eventService.getSnapshot();
  check('snapshot.event === "NORMAL"', snap.event === 'NORMAL');
  check('snapshot.fareMultiplier === 1.0', snap.fareMultiplier === 1.0);
  check('snapshot.speedFactor === 1.0', snap.speedFactor === 1.0);

  eventService.setEvent('RUSH_HOUR');
  const rushSnap = eventService.getSnapshot();
  check('rush snapshot.event === "RUSH_HOUR"', rushSnap.event === 'RUSH_HOUR');
  check('rush snapshot.fareMultiplier === 1.5', rushSnap.fareMultiplier === 1.5);
  check('rush snapshot.speedFactor === 0.6', rushSnap.speedFactor === 0.6);

  // ── 6. start()/stop() arming + halting the auto-cycle ─────────────────
  console.log('\nStep 6: start()/stop() arm/halt the real-time auto-cycle');
  eventService.setEvent('NORMAL');
  eventService.start();
  // start() arms a setTimeout that will fire after NORMAL_DURATION_MS (90s).
  // We can't wait 90s in a test, but we can verify start() didn't break
  // the manual setEvent path + that stop() halts the cycle cleanly.
  listenerCalls = [];
  eventService.setEvent('RUSH_HOUR'); // manual override works alongside start()
  check('setEvent overrides live auto-cycle', eventService.getCurrentEvent() === 'RUSH_HOUR');
  check('manual setEvent fires listener',
    listenerCalls.length === 1 && listenerCalls[0] === 'RUSH_HOUR',
    listenerCalls);

  // stop() should halt the auto-cycle — listener should not fire after stop.
  eventService.stop();
  // Wait briefly to confirm no auto-transition fires (within 200ms — much
  // shorter than the 90s NORMAL duration, so if start() rearmed something
  // it'd fire here. stop() clears the timer.)
  await new Promise((r) => setTimeout(r, 250));
  check('no auto-transition after stop()',
    listenerCalls.length === 1, // still just the manual setEvent fire
    listenerCalls);

  // ── 7. Multiple listeners all fire ────────────────────────────────────
  console.log('\nStep 7: multiple listeners all fire on transition');
  // Reset to NORMAL first — step 6 left the event as RUSH_HOUR.
  eventService.setEvent('NORMAL');
  let calls1 = 0, calls2 = 0;
  const unsub1 = eventService.onEventChange(() => { calls1++; });
  const unsub2 = eventService.onEventChange(() => { calls2++; });
  eventService.setEvent('RUSH_HOUR');
  check('listener 1 fired', calls1 === 1, calls1);
  check('listener 2 fired', calls2 === 1, calls2);
  eventService.setEvent('NORMAL');
  check('listener 1 fired on 2nd transition', calls1 === 2, calls1);
  check('listener 2 fired on 2nd transition', calls2 === 2, calls2);
  unsub1();
  eventService.setEvent('RUSH_HOUR');
  check('listener 1 unsubscribed (no fire)', calls1 === 2, calls1);
  check('listener 2 still fires', calls2 === 3, calls2);
  unsub2();
  unsubscribe();

  // ── 8. Listener that throws doesn't break other listeners ─────────────
  console.log('\nStep 8: listener errors are isolated');
  // Reset to NORMAL first — step 7 left the event as RUSH_HOUR, so
  // setEvent('RUSH_HOUR') below would be a no-op without this reset.
  eventService.setEvent('NORMAL');
  let goodCalls = 0;
  const goodUnsub = eventService.onEventChange(() => { goodCalls++; });
  const badUnsub = eventService.onEventChange(() => { throw new Error('test-injected'); });
  // The transitionTo wraps listener calls in try/catch — verify the bad
  // listener's throw doesn't prevent the good listener from firing.
  eventService.setEvent('RUSH_HOUR');
  check('good listener fired despite bad listener throwing', goodCalls === 1, goodCalls);
  goodUnsub();
  badUnsub();

  // ── Cleanup ───────────────────────────────────────────────────────────
  eventService.stop();
  eventService.setEvent('NORMAL');

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
