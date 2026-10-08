/**
 * Accra Life — VendorService: the Makola street-vendor timed shift
 *
 * THE single source of truth for the street-vendor job (v1.0 spec,
 * skills/vendor-system.md [CONTRACT] gameAPI.startVendorJob/getCurrentJob):
 * the player presses [E] at the Makola Market vendor stand and works a
 * 10-second selling shift whose payout tier is locked from the shared
 * world event:
 *   - NORMAL     — ₵10  · 'Welcome! What you need today?'
 *   - RUSH_HOUR  — ₵15  · 'Rush hour! Everyone buying! Make haste!'
 *
 * Architectural guarantees (the "no flaw" rules):
 *   1. ENGINE PAYS, ONCE. The 10 s timer is the only credit path — it
 *      lands through EconomyManager.awardIncome → Wallet.addFunds
 *      ({ amount: earnings, description, channel: 'CASH', category:
 *      'SALE' }). The AI agent must NEVER call gameAPI.addFunds()
 *      manually for a vendor sale (double-credit guard); it verifies the
 *      payout via getCashBalance()/getTransactions().
 *   2. LOCKED AT START. The event is read ONCE when the shift starts and
 *      the earnings + dialogue freeze with it (the spec's ordering:
 *      check event → quote line → 10 s → pay). An event flip mid-shift
 *      can neither surge nor de-surge a running sale.
 *   3. PROXIMITY GATE. startVendorJob takes the live player position
 *      (injected by the GameAPI bridge from PlayerController) and
 *      refuses anything farther than VENDOR_INTERACTION_RADIUS_M from
 *      GridMap.MAKOLA_VENDOR_STAND_WORLD — no earning from the sofa.
 *   4. ONE SHIFT AT A TIME + RESTOCK COOLDOWN. A running shift rejects
 *      re-starts, and after each payout the table restocks for
 *      VENDOR_RESTOCK_COOLDOWN_MS — the anti-grind balance rule that
 *      keeps the vendor (₵15/40 s worst case) in line with the walk-step
 *      jobs (₵18–22 per shift) instead of becoming a money printer.
 *
 * Exported as a plain class (constructed once in src/main.ts with the
 * live EconomyManager, then handed to createGameAPI) — the same shape as
 * JobManager next door. The R3F visible stand (src/r3f/LivingVendor.tsx)
 * adopts the shared instance via window.GameAPI.vendor, exactly like
 * StreetCanvas adopts window.GameAPI.trotro.
 *
 * Consumers:
 *   - src/game/GameAPI.ts routes startVendorJob()/getCurrentJob() here
 *   - src/main.ts routes the [E] key ('makola_vendor_stand') to
 *     VENDOR_SELL_EVENT, handled by LivingVendor.tsx
 *   - src/r3f/LivingVendor.tsx renders the shift from onShiftUpdate()
 */

import { EconomyManager } from '../Economy/EconomyManager';
import { eventService, GameEventId, RUSH_HOUR_FARE_MULTIPLIER } from '../World/EventService';
import { MAKOLA_VENDOR_STAND_WORLD } from '../World/GridMap';

// ── Spec constants ──────────────────────────────────────────────────────────

/** The job id getCurrentJob() reports while a shift is running. */
export const VENDOR_JOB_ID = 'VENDOR_MAKOLA';

/** Shift length — spec [LOGIC]: 'After 10 seconds … addFunds'. */
export const VENDOR_SHIFT_MS = 10_000;

/** NORMAL payout — spec: earnings = 10 Cedis. */
export const VENDOR_BASE_EARNINGS_GHS = 10;

/** RUSH_HOUR payout — spec bonus tier: ₵10 × the shared 1.5 surge = ₵15. */
export const VENDOR_RUSH_EARNINGS_GHS = VENDOR_BASE_EARNINGS_GHS * RUSH_HOUR_FARE_MULTIPLIER;

/** Restock cooldown between shifts — anti-grind balance rule (see header). */
export const VENDOR_RESTOCK_COOLDOWN_MS = 30_000;

/** Proximity gate — matches the stand's InteractionSystem radius + the
 * visible map's [E] range (same number the tro-tro stop uses). */
export const VENDOR_INTERACTION_RADIUS_M = 3.5;

/** How long the PAID celebration shows before the service returns to IDLE. */
export const VENDOR_PAYOUT_ANNOUNCE_MS = 2_500;

/** Wallet income category for vendor sales (ALLOWED_INCOME_CATEGORIES member). */
export const VENDOR_INCOME_CATEGORY = 'SALE' as const;

/** Payout ledger description — the addFunds-path description string. */
export function vendorPayoutDescription(event: GameEventId): string {
  return event === 'RUSH_HOUR'
    ? 'Makola Market street-vendor sales — rush hour'
    : 'Makola Market street-vendor sales — normal hours';
}

// ── Vendor voice (the player IS the vendor — lines to the customers) ────────

const fmtCedi = (n: number): string => `₵${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Exact spec dialogue plus the service's refusal/payout lines. */
export const VENDOR_LINES = {
  // Spec [LOGIC] — NORMAL branch, exact string.
  normal: 'Welcome! What you need today?',
  // Spec [LOGIC] — RUSH_HOUR branch, exact string.
  rush: 'Rush hour! Everyone buying! Make haste!',
  paid: (ghs: number) => `Sales counted — ${fmtCedi(ghs)} in hand!`,
  restock: 'Table empty — I dey restock. Come back small!',
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export type VendorPhase = 'IDLE' | 'SELLING' | 'PAID';

export interface VendorStartContext {
  /** Live player world position (the bridge reads PlayerController). */
  x: number;
  z: number;
}

export type VendorStartReason = 'OK' | 'SHIFT_ACTIVE' | 'RESTOCK_COOLDOWN' | 'TOO_FAR';

export interface VendorStartResult {
  started: boolean;
  reason: VendorStartReason;
  message: string;
  /** The line the stand opens with ('' when refused). */
  dialogue: string;
  /** Event locked at start ('NORMAL' when refused). */
  event: GameEventId;
  /** Earnings locked at start (0 when refused). */
  earningsGHS: number;
  /** Remaining restock cooldown (0 when not on cooldown). */
  cooldownRemainingMs: number;
}

export interface VendorShiftSnapshot {
  readonly phase: VendorPhase;
  /** VENDOR_MAKOLA while SELLING, else null — mirrors getCurrentJob(). */
  readonly jobId: string | null;
  /** Event locked at shift start (or the live event while idle). */
  readonly event: GameEventId;
  /** Earnings locked at shift start (0 while idle). */
  readonly earningsGHS: number;
  readonly dialogue: string;
  readonly startedAtMs: number | null;
  readonly endsAtMs: number | null;
  readonly cooldownEndsAtMs: number;
  /** Last payout amount + transaction id (0/null before any sale). */
  readonly paidGHS: number;
  readonly transactionId: string | null;
}

export type VendorShiftListener = (snapshot: VendorShiftSnapshot) => void;

// ── Service ─────────────────────────────────────────────────────────────────

export class VendorService {
  private readonly economy: EconomyManager;
  private phase: VendorPhase = 'IDLE';
  private lockedEvent: GameEventId = 'NORMAL';
  private lockedEarningsGHS = 0;
  private dialogue = '';
  private startedAtMs: number | null = null;
  private endsAtMs: number | null = null;
  private cooldownEndsAtMs = 0;
  private paidGHS = 0;
  private transactionId: string | null = null;
  private shiftTimer: ReturnType<typeof setTimeout> | null = null;
  private announceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<VendorShiftListener>();

  constructor(economy: EconomyManager) {
    this.economy = economy;
  }

  /**
   * Start a selling shift — the [CONTRACT] gameAPI.startVendorJob() target.
   * `playerPos` is injected by the GameAPI bridge (live PlayerController
   * position); the proximity gate refuses calls from outside the stand
   * radius so the shift can only be worked AT Makola.
   */
  public startVendorJob(playerPos: VendorStartContext): VendorStartResult {
    const now = Date.now();

    // Guard 1 — one shift at a time (the stand is occupied).
    if (this.phase === 'SELLING') {
      const refused: VendorStartResult = {
        started: false,
        reason: 'SHIFT_ACTIVE',
        message: 'A selling shift is already running — wait for it to complete.',
        dialogue: '',
        event: this.lockedEvent,
        earningsGHS: 0,
        cooldownRemainingMs: 0,
      };
      console.log(`[vendor] start refused (SHIFT_ACTIVE) — ${refused.message}`);
      return refused;
    }

    // Guard 2 — restock cooldown (anti-grind balance rule).
    const cooldownRemainingMs = Math.max(0, this.cooldownEndsAtMs - now);
    if (cooldownRemainingMs > 0) {
      const refused: VendorStartResult = {
        started: false,
        reason: 'RESTOCK_COOLDOWN',
        message: `Table restocking — ${Math.ceil(cooldownRemainingMs / 1000)}s until the next shift.`,
        dialogue: VENDOR_LINES.restock,
        event: this.lockedEvent,
        earningsGHS: 0,
        cooldownRemainingMs,
      };
      console.log(`[vendor] start refused (RESTOCK_COOLDOWN) — ${refused.message}`);
      this.dialogue = VENDOR_LINES.restock;
      this.notify();
      return refused;
    }

    // Guard 3 — proximity gate (skills/vendor-system.md [LOGIC] rule 1).
    const dist = Math.hypot(
      playerPos.x - MAKOLA_VENDOR_STAND_WORLD[0],
      playerPos.z - MAKOLA_VENDOR_STAND_WORLD[1]
    );
    if (dist > VENDOR_INTERACTION_RADIUS_M) {
      const refused: VendorStartResult = {
        started: false,
        reason: 'TOO_FAR',
        message: `Too far from the Makola vendor stand (${dist.toFixed(1)}m > ${VENDOR_INTERACTION_RADIUS_M}m). Walk to the stand first.`,
        dialogue: '',
        event: this.lockedEvent,
        earningsGHS: 0,
        cooldownRemainingMs: 0,
      };
      console.log(`[vendor] start refused (TOO_FAR) — ${refused.message}`);
      return refused;
    }

    // [LOGIC] ordering (spec): check the event ONCE, lock earnings + the
    // dialogue with it, then run the 10 s shift. Mid-shift event flips
    // cannot touch a locked sale.
    const event = eventService.getCurrentEvent();
    const earningsGHS =
      event === 'RUSH_HOUR' ? VENDOR_RUSH_EARNINGS_GHS : VENDOR_BASE_EARNINGS_GHS;
    const dialogue = event === 'RUSH_HOUR' ? VENDOR_LINES.rush : VENDOR_LINES.normal;

    this.phase = 'SELLING';
    this.lockedEvent = event;
    this.lockedEarningsGHS = earningsGHS;
    this.dialogue = dialogue;
    this.startedAtMs = now;
    this.endsAtMs = now + VENDOR_SHIFT_MS;

    console.log(
      `[vendor] Shift started — event ${event} · earnings locked ${fmtCedi(earningsGHS)} · ${VENDOR_SHIFT_MS / 1000}s shift`
    );
    this.notify();

    // The ONLY credit path (architectural guarantee 1): the shift timer
    // pays exactly once, through the addFunds wallet path.
    this.shiftTimer = setTimeout(() => {
      this.shiftTimer = null;
      this.completeSale();
    }, VENDOR_SHIFT_MS);

    return {
      started: true,
      reason: 'OK',
      message: `Selling shift started (${event}) — ${fmtCedi(earningsGHS)} locked, ${VENDOR_SHIFT_MS / 1000}s on the table.`,
      dialogue,
      event,
      earningsGHS,
      cooldownRemainingMs: 0,
    };
  }

  /** The [CONTRACT] gameAPI.getCurrentJob() target — id while SELLING. */
  public getCurrentJob(): typeof VENDOR_JOB_ID | null {
    return this.phase === 'SELLING' ? VENDOR_JOB_ID : null;
  }

  public getSnapshot(): VendorShiftSnapshot {
    return {
      phase: this.phase,
      jobId: this.getCurrentJob(),
      event: this.phase === 'IDLE' ? eventService.getCurrentEvent() : this.lockedEvent,
      earningsGHS: this.phase === 'IDLE' ? 0 : this.lockedEarningsGHS,
      dialogue: this.dialogue,
      startedAtMs: this.startedAtMs,
      endsAtMs: this.endsAtMs,
      cooldownEndsAtMs: this.cooldownEndsAtMs,
      paidGHS: this.paidGHS,
      transactionId: this.transactionId,
    };
  }

  /** eventService-style subscription — LivingVendor renders from this. */
  public onShiftUpdate(listener: VendorShiftListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Payout beat — PAID celebration, then back to IDLE (cooldown armed). */
  private completeSale(): void {
    const event = this.lockedEvent;
    const earnings = this.lockedEarningsGHS;

    const tx = this.economy.awardIncome({
      amountGHS: earnings,
      category: VENDOR_INCOME_CATEGORY,
      description: vendorPayoutDescription(event),
      channel: 'CASH',
    });

    this.phase = 'PAID';
    this.paidGHS = earnings;
    this.transactionId = tx?.id ?? null;
    this.dialogue = tx
      ? VENDOR_LINES.paid(earnings)
      : 'Wallet refused the credit — try again shortly.';
    // Cooldown arms at PAYOUT time (not at shift start) so the effective
    // cycle is shift + restock, never shorter than the balance rule.
    this.cooldownEndsAtMs = Date.now() + VENDOR_RESTOCK_COOLDOWN_MS;

    console.log(
      `[vendor] Sale complete — +${fmtCedi(earnings)} via addFunds (${VENDOR_INCOME_CATEGORY}/CASH) · balance ${fmtCedi(this.economy.wallet.getCashBalance())}${tx ? '' : ' · CREDIT REFUSED'}`
    );
    this.notify();

    this.announceTimer = setTimeout(() => {
      this.announceTimer = null;
      this.phase = 'IDLE';
      this.dialogue = '';
      this.startedAtMs = null;
      this.endsAtMs = null;
      this.notify();
    }, VENDOR_PAYOUT_ANNOUNCE_MS);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // listener errors must never break the shift machine
      }
    }
  }
}
