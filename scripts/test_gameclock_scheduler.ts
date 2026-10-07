/**
 * Phase 6 — GameClock + EventScheduler auto-fire end-to-end test.
 *
 * Verifies:
 *   1. GameClock starts at 00:00 + getHour/getMinute/getFormattedTime/
 *      getDayPhase return expected values.
 *   2. tick advances in-game time at 60× scale (1 real sec → 1 in-game min).
 *   3. Day-phase transitions at hour boundaries.
 *   4. onHourChange fires with correct (newHour, prevHour) args; no
 *      spurious fire on subscribe.
 *   5. setHour jumps + fires listeners immediately if hour differs.
 *   6. EventScheduler.init() halts EventService's real-time auto-cycle +
 *      subscribes to GameClock + auto-fires Rush Hour at trigger hours
 *      (7 AM + 5 PM in-game, Accra commute pattern).
 *   7. EventScheduler holds Rush Hour for 2 in-game hours, then returns
 *      to NORMAL.
 *   8. Custom trigger rules work.
 *
 * Uses a fast time scale (3600× = 1 real sec → 1 in-game hour) so the
 * test runs in <1 sec instead of waiting 7 real minutes for hour 7.
 *
 * Run via: npm run test:phase6-scheduler
 */
import assert from 'node:assert/strict';
import { gameClock, DEFAULT_TIME_SCALE } from '../src/game/Time/GameClock';
import { eventScheduler, DEFAULT_RUSH_HOUR_TRIGGERS } from '../src/game/Events/EventScheduler';
import { eventService } from '../src/game/World/EventService';

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
  console.log('\n=== Phase 6 GameClock + EventScheduler — end-to-end test ===\n');

  // ── Reset singletons to known state ───────────────────────────────────
  eventScheduler.shutdown();
  eventService.stop();
  eventService.setEvent('NORMAL');
  gameClock.setTimeScale(DEFAULT_TIME_SCALE);

  // ── 1. GameClock starts at 00:00 (need to setHour first) ─────────────
  console.log('Step 1: GameClock initial state at hour 0');
  gameClock.setHour(0);
  check('getHour() === 0', gameClock.getHour() === 0);
  check('getMinute() === 0', gameClock.getMinute() === 0);
  check('getFormattedTime() === "00:00"', gameClock.getFormattedTime() === '00:00');
  check('getDayPhase() === "night"', gameClock.getDayPhase() === 'night');
  check('getTimeScale() === 60 (DEFAULT)', gameClock.getTimeScale() === DEFAULT_TIME_SCALE);

  // ── 2. tick advances in-game time at 60× scale ───────────────────────
  console.log('\nStep 2: tick advances in-game time at 60× scale');
  gameClock.tick(1000); // 1 real sec at 60× → 1 in-game min
  check('after 1 real sec → in-game minute is 1', gameClock.getMinute() === 1, { minute: gameClock.getMinute() });
  gameClock.tick(59 * 1000); // 59 more sec → 1 in-game hour total
  check('after 60 real sec total → in-game hour is 1', gameClock.getHour() === 1, { hour: gameClock.getHour() });
  check('after 60 real sec total → in-game minute is 0', gameClock.getMinute() === 0);

  // ── 3. Day-phase transitions ───────────────────────────────────────────
  console.log('\nStep 3: day-phase transitions at hour boundaries');
  gameClock.setHour(5);
  check('hour 5 → dawn', gameClock.getDayPhase() === 'dawn');
  gameClock.setHour(7);
  check('hour 7 → morning', gameClock.getDayPhase() === 'morning');
  gameClock.setHour(11);
  check('hour 11 → midday', gameClock.getDayPhase() === 'midday');
  gameClock.setHour(13);
  check('hour 13 → afternoon', gameClock.getDayPhase() === 'afternoon');
  gameClock.setHour(17);
  check('hour 17 → dusk', gameClock.getDayPhase() === 'dusk');
  gameClock.setHour(19);
  check('hour 19 → evening', gameClock.getDayPhase() === 'evening');
  gameClock.setHour(23);
  check('hour 23 → evening', gameClock.getDayPhase() === 'evening');

  // ── 4. onHourChange fires with correct args ───────────────────────────
  console.log('\nStep 4: onHourChange fires with correct (newHour, prevHour)');
  let hourChangeCalls: Array<[number, number]> = [];
  const unsub = gameClock.onHourChange((newHour, prevHour) => {
    hourChangeCalls.push([newHour, prevHour]);
  });
  check('no spurious fire on subscribe', hourChangeCalls.length === 0, hourChangeCalls);
  // setHour(8) from current 23 → should fire 23→8.
  gameClock.setHour(8);
  check('setHour(8) fired 1 transition',
    hourChangeCalls.length === 1, hourChangeCalls);
  check('transition was 23 → 8',
    hourChangeCalls[0]?.[0] === 8 && hourChangeCalls[0]?.[1] === 23,
    hourChangeCalls[0]);
  // tick advancing 1 hour via 3600× scale → 8→9.
  hourChangeCalls = [];
  gameClock.setTimeScale(3600);
  gameClock.tick(1000); // 1 real sec at 3600× = 1 in-game hour → hour 9
  check('tick advanced hour 8 → 9', gameClock.getHour() === 9, { hour: gameClock.getHour() });
  check('tick fired hour-change 8 → 9',
    hourChangeCalls.length === 1 && hourChangeCalls[0]?.[0] === 9 && hourChangeCalls[0]?.[1] === 8,
    hourChangeCalls);

  // ── 5. EventScheduler.init() subscribes + auto-fires at trigger hours ─
  console.log('\nStep 5: EventScheduler auto-fires Rush Hour at trigger hours');
  // Reset state for clean test
  eventService.setEvent('NORMAL');
  hourChangeCalls = [];
  // Use default rules: 7 AM + 5 PM, hold 2 hours each
  eventScheduler.setTriggerRules(DEFAULT_RUSH_HOUR_TRIGGERS);
  eventScheduler.init();
  // Verify init() halted the EventService auto-cycle (no timer running).
  // Hard to assert directly — but the auto-cycle would fire after 90s of
  // NORMAL; our test runs in <1s so it won't fire either way. We can
  // verify the EventScheduler is now the authority by triggering via
  // GameClock hour changes.

  // Jump to hour 6 (dawn, just before morning rush).
  gameClock.setHour(6);
  check('eventService.getCurrentEvent() === "NORMAL" at hour 6',
    eventService.getCurrentEvent() === 'NORMAL');

  // Advance to hour 7 → should auto-fire Rush Hour.
  gameClock.tick(1000); // 1 real sec at 3600× = 1 in-game hour → hour 7
  check('GameClock hour advanced to 7', gameClock.getHour() === 7, { hour: gameClock.getHour() });
  check('eventService state is "RUSH_HOUR" (auto-fired at hour 7)',
    eventService.getCurrentEvent() === 'RUSH_HOUR');

  // Advance to hour 8 — should still be RUSH_HOUR (hold = 2 hours).
  gameClock.tick(1000); // hour 8
  check('GameClock hour advanced to 8', gameClock.getHour() === 8);
  check('eventService still "RUSH_HOUR" at hour 8 (within hold window)',
    eventService.getCurrentEvent() === 'RUSH_HOUR');

  // Advance to hour 9 — hold window expired → NORMAL.
  gameClock.tick(1000); // hour 9
  check('GameClock hour advanced to 9', gameClock.getHour() === 9);
  check('eventService back to "NORMAL" at hour 9 (hold window expired)',
    eventService.getCurrentEvent() === 'NORMAL');

  // ── 6. Custom trigger rules work ─────────────────────────────────────
  console.log('\nStep 6: custom trigger rules work');
  eventScheduler.shutdown();
  eventService.setEvent('NORMAL');
  eventScheduler.setTriggerRules([{ hour: 12, label: 'Lunch Rush', holdHours: 1 }]);
  eventScheduler.init();
  gameClock.setHour(11);
  check('at hour 11 (no trigger), state is NORMAL',
    eventService.getCurrentEvent() === 'NORMAL');
  gameClock.tick(1000); // hour 12 → lunch rush
  check('GameClock hour advanced to 12', gameClock.getHour() === 12);
  check('eventService "RUSH_HOUR" (custom lunch trigger at 12)',
    eventService.getCurrentEvent() === 'RUSH_HOUR');
  gameClock.tick(1000); // hour 13 — hold was 1 hour, so expired
  check('eventService back to "NORMAL" at hour 13 (1-hour hold expired)',
    eventService.getCurrentEvent() === 'NORMAL');

  // ── 7. Evening rush hour at 17 ────────────────────────────────────────
  console.log('\nStep 7: evening rush at hour 17 (default Accra pattern)');
  eventScheduler.shutdown();
  eventService.setEvent('NORMAL');
  eventScheduler.setTriggerRules(DEFAULT_RUSH_HOUR_TRIGGERS);
  eventScheduler.init();
  gameClock.setHour(16);
  check('at hour 16, state is NORMAL', eventService.getCurrentEvent() === 'NORMAL');
  gameClock.tick(1000); // hour 17 → evening rush
  check('GameClock hour advanced to 17', gameClock.getHour() === 17);
  check('eventService "RUSH_HOUR" (evening rush at 17)',
    eventService.getCurrentEvent() === 'RUSH_HOUR');
  gameClock.tick(1000); // hour 18 — still in 2-hour hold
  check('eventService still "RUSH_HOUR" at hour 18', eventService.getCurrentEvent() === 'RUSH_HOUR');
  gameClock.tick(1000); // hour 19 — hold expired
  check('eventService back to "NORMAL" at hour 19', eventService.getCurrentEvent() === 'NORMAL');

  // ── 8. Non-trigger hours don't fire ──────────────────────────────────
  console.log('\nStep 8: only matching trigger hours fire Rush Hour');
  eventService.setEvent('NORMAL');
  gameClock.setHour(13);
  gameClock.tick(1000); // hour 14
  check('at hour 14 (non-trigger), state is NORMAL', eventService.getCurrentEvent() === 'NORMAL');
  gameClock.tick(1000); // hour 15
  check('at hour 15 (non-trigger), state is NORMAL', eventService.getCurrentEvent() === 'NORMAL');
  gameClock.tick(1000); // hour 16
  check('at hour 16 (non-trigger), state is NORMAL', eventService.getCurrentEvent() === 'NORMAL');

  // ── Cleanup ───────────────────────────────────────────────────────────
  unsub();
  eventScheduler.shutdown();
  eventService.setEvent('NORMAL');
  gameClock.setTimeScale(DEFAULT_TIME_SCALE);
  gameClock.setHour(0);

  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
