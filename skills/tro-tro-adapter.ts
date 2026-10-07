/**
 * Lagos Life Ghana — Tro-Tro Skill Adapter (reference implementation)
 * ===================================================================
 *
 * Implements the adapter-owned contract declared in `tro-tro-system.md`
 * ([CONTRACT] §B): the boarding state machine, Mate fare negotiation, the
 * zone fare table, and the "running alongside" door-chase mechanic.
 *
 * Like `agent-adapter.ts`, this module is `import type`-only against `src/`,
 * so it compiles to nothing in the app build (tsconfig includes `src/` only)
 * and CI is unaffected. Unlike the interface-only adapter, this file IS real
 * runtime code with zero runtime dependencies: a host router can import it
 * directly and drive it through `handleOp()` JSON envelopes (README §2) or
 * the typed `TroTroSystem` methods.
 *
 * Verify with a scoped typecheck (src + skills):
 *   npx tsc --noEmit -p tsconfig.skills.json
 *
 * Call flow:
 *   Main Agent → JSON envelope → host router → TroTroSystemRuntime.handleOp
 *     → Wallet / EconomyManager / PlayerController / InputManager (bindings)
 *     → host ports (van state, clock, arrival override)
 *
 * Numerical canon (see tro-tro-system.md [LOGIC]):
 *   walk 4.5 m/s < van 5.5 m/s < sprint 7.3 m/s  → sprint is mandatory to catch
 *   catch  = gap ≤ 2.2 m for 1.2 s continuous, sprint held
 *   miss   = gap > 3.5 m, or sprint released > 0.8 s
 *   quote  = base × demand multiplier (1.5× rush 07:00–09:30 / 16:30–19:00)
 *   haggle = max 2 rounds, −₵1 per round, base fare floor, CASH only
 */

import type { GameBindings, SkillError } from './agent-adapter';
import type { LocationId } from '../src/game/World/Locations';
import type { TransactionRecord } from '../src/game/Economy/Transaction';

// ------------------------------------------------------------- public types

export type BoardingPhase =
  | 'IDLE' | 'QUEUED' | 'NEGOTIATING' | 'RUNNING_ALONGSIDE'
  | 'BOARDED' | 'MISSED' | 'REFUSED_FUNDS' | 'REFUSED_NEGOTIATION';

export type TrotroRouteId =
  | 'OSU_CIRCLE_LOCAL'             // short hop along Osu Oxford St / Adabraka
  | 'CIRCLE_TO_37'                 // → 37 Station (proposed dest id '37_station')
  | 'CIRCLE_TO_MAKOLA'             // → makola_market (reserved LocationId)
  | 'CIRCLE_TO_LABADI';            // → labadi_beach (reserved LocationId)

/**
 * `37_station` is NOT yet a member of `LocationId` — registering it is a
 * one-line union extension in `src/game/World/Locations.ts` when the landing
 * zone ships (same pattern as the reserved `makola_market` / `labadi_beach`).
 */
export type TrotroDestination = LocationId | '37_station';

export interface MateOffer {
  routeId: TrotroRouteId;
  quotedFareGHS: number;           // base × demand multiplier
  baseFareGHS: number;
  demandMultiplier: number;        // 1.0 off-peak, 1.5 rush hour
  negotiationRoundsLeft: 0 | 1 | 2;
  mateLine: string;                // Pidgin quote line for UI/chat
}

export interface TroTroSystem {
  queueAtStop(): Promise<{ phase: 'QUEUED'; nextVanMs: number }>;
  negotiateFare(routeId: TrotroRouteId): Promise<MateOffer>;
  contestFare(): Promise<MateOffer | { refused: true }>;   // max 2 rounds
  payAndBoard(payment: { amountGHS: number; routeId: TrotroRouteId }):
    Promise<{ phase: 'BOARDED' } | { phase: 'REFUSED_FUNDS'; shortfallGHS: number }>;
  chaseAndBoard(): Promise<{ boarded: boolean; gapM: number }>; // running-alongside
}

/** Extra runtime surface the host router needs beyond the skill contract. */
export interface TroTroSystemRuntime extends TroTroSystem {
  /** Canonical ₵6 signboard fare — routes through EconomyManager's EXP_TROTRO_FARE SKU. */
  payCanonicalFare(): Promise<CanonicalFareResult>;
  /** Per-frame pump: van cycle, quote expiry, chase evaluation, chase steering. */
  tick(dtMs: number): void;
  /** Abandon the current boarding flow and release player inputs. */
  stop(): void;
  /** Read-only snapshot for envelope `get_state` / agent re-anchoring. */
  getState(): TroTroStateView;
  /** JSON-envelope entrypoint; accepts snake_case and camelCase op ids. */
  handleOp(op: string, params: Record<string, unknown>):
    Promise<{ ok: true; result: unknown } | { ok: false; error: SkillError }>;
}

export interface CanonicalFareResult {
  phase: 'BOARDED' | 'REFUSED_FUNDS';
  shortfallGHS?: number;
  transaction: TransactionRecord | null;
  message: string;
}

export interface ChaseOutcome {
  boarded: boolean;
  gapM: number;
  phaseAfter: BoardingPhase;
  shortfallGHS?: number;
}

export interface TroTroStateView {
  phase: BoardingPhase;
  offer: MateOffer | null;
  quoteExpiresInMs: number | null;
  vanPresent: boolean;
  nextVanMs: number;
  lastContestRefused: boolean;
  doorGapM: number | null;
}

// ----------------------------------------------------------- configuration

export const TROTRO_CONFIG = {
  /** Sliding door leaf world point: van origin (9.0, 2.55) + local (0.84, 1.05). */
  PARKED_VAN_DOOR: { x: 9.84, z: 3.6 },
  STOP_INTERACT_POINT: { x: 9.0, z: 4.9 },       // trotro_stop interactable
  STOP_INTERACT_RADIUS_M: 3.5,                   // InteractableTarget.radius
  STOP_LOCATION_ID: 'circle_trotro_stop' as LocationId,
  VAN_SPEED_MPS: 5.5,
  CATCH_RADIUS_M: 2.2,
  CATCH_HOLD_S: 1.2,
  MISS_GAP_M: 3.5,
  SPRINT_RELEASE_GRACE_S: 0.8,
  QUOTE_WINDOW_MS: 12_000,                       // pay within 12 s of the quote
  NEXT_VAN_MS: 30_000,                           // respawn after a departure
  PEAK_MULTIPLIER: 1.5,
  RUSH_HOUR_WINDOWS: [[7.0, 9.5], [16.5, 19.0]] as ReadonlyArray<readonly [number, number]>,
  MAX_CONTEST_ROUNDS: 2,
  CONTEST_STEP_GHS: 1,
  CANONICAL_EXPENSE_ID: 'EXP_TROTRO_FARE',       // ₵6 signboard canon
} as const;

export interface ZoneFareRow {
  routeId: TrotroRouteId;
  label: string;
  baseFareGHS: number;
  /** null = hop that ends in the same zone (no location override). */
  destination: TrotroDestination | null;
  /** All zone fares are CASH-only via Wallet.spendMoney (TRANSPORT ledger). */
  payment: 'WALLET_CASH';
}

/** Origin is always `circle_trotro_stop` — see tro-tro-system.md [LOGIC] §3. */
export const TROTRO_ZONE_FARES: readonly ZoneFareRow[] = [
  { routeId: 'OSU_CIRCLE_LOCAL', label: 'Osu Oxford St / Adabraka hop',
    baseFareGHS: 4, destination: null, payment: 'WALLET_CASH' },
  { routeId: 'CIRCLE_TO_37', label: 'Circle → 37 Station',
    baseFareGHS: 7, destination: '37_station', payment: 'WALLET_CASH' },
  { routeId: 'CIRCLE_TO_MAKOLA', label: 'Circle → Makola Market',
    baseFareGHS: 8, destination: 'makola_market', payment: 'WALLET_CASH' },
  { routeId: 'CIRCLE_TO_LABADI', label: 'Circle → Labadi Beach',
    baseFareGHS: 10, destination: 'labadi_beach', payment: 'WALLET_CASH' },
];

const FARE_BY_ROUTE: Record<TrotroRouteId, ZoneFareRow> = Object.fromEntries(
  TROTRO_ZONE_FARES.map((r) => [r.routeId, r])
) as Record<TrotroRouteId, ZoneFareRow>;

/** Deterministic Pidgin line pools — reproducible for agent examples. */
const MATE_LINES: Record<TrotroRouteId, { quote: string[]; haggle: string[] }> = {
  OSU_CIRCLE_LOCAL: {
    quote: ['Short drop? ₵{F}. Enter, enter!', 'Oxford Street drop, ₵{F} only.'],
    haggle: ['Ahh chale, ₵{F} for you, I dey beg.', 'OK ok, ₵{F}, last price.']
  },
  CIRCLE_TO_37: {
    quote: ['37 wote? ₵{F}, rush hour dey inside, enter!',
            '37 Station! ₵{F} sharp, we dey go now now.'],
    haggle: ['Ok, ₵{F} last, I for drop am for the junction.',
             'Chale you sabi price o. ₵{F}, enter make we go.']
  },
  CIRCLE_TO_MAKOLA: {
    quote: ['Makola? ₵{F}, market women full inside o!',
            'Makola direct, ₵{F}. We dey move!'],
    haggle: ['Ei, you be Makola regular. ₵{F}, enter.', 'Small small, ₵{F} last.']
  },
  CIRCLE_TO_LABADI: {
    quote: ['Labadi beach run? ₵{F}, cool breeze dey wait you.',
            'Labadi! ₵{F} per head, sun dey beat.'],
    haggle: ['Wahala! OK, ₵{F}, but no tell anybody.', '₵{F} final, beach route be that.']
  },
};

const REFUSAL_LINES = [
  'No money, no motion, chale.',
  'Mate no dey do credit. Cash first!',
  'Abeg no waste my time — ₵ or you comot.'
];

// ------------------------------------------------------------- pure helpers

/** Rush-hour demand multiplier for an in-game 24 h clock reading. */
export function demandMultiplierAt(hour24: number): number {
  for (const [start, end] of TROTRO_CONFIG.RUSH_HOUR_WINDOWS) {
    if (hour24 >= start && hour24 < end) return TROTRO_CONFIG.PEAK_MULTIPLIER;
  }
  return 1.0;
}

/** Mate quotes in ₵0.5 steps (10.5 stays 10.5 — matches skill Example 1). */
export function roundToHalfCedi(value: number): number {
  return Math.round(value * 2) / 2;
}

export function quoteFare(route: ZoneFareRow, hour24: number): {
  baseFareGHS: number; quotedFareGHS: number; demandMultiplier: number;
} {
  const demandMultiplier = demandMultiplierAt(hour24);
  return {
    baseFareGHS: route.baseFareGHS,
    quotedFareGHS: roundToHalfCedi(route.baseFareGHS * demandMultiplier),
    demandMultiplier
  };
}

function mateLine(routeId: TrotroRouteId, kind: 'quote' | 'haggle', roundIndex: number): string {
  const pool = MATE_LINES[routeId][kind];
  return pool[roundIndex % pool.length];
}

export interface CatchSample {
  gapM: number;          // horizontal distance to the sliding door point
  isSprinting: boolean;  // PlayerController.isSprinting (isMoving && input.sprint)
  dtS: number;           // frame delta
}

export interface CatchState {
  heldS: number;         // continuous time inside CATCH_RADIUS while sprinting
  releasedS: number;     // continuous time sprint was not held
}

export type CatchVerdict =
  | { kind: 'HOLDING' }
  | { kind: 'CAUGHT' }
  | { kind: 'MISSED'; reason: 'GAP_TOO_WIDE' | 'SPRINT_RELEASED' };

/**
 * Pure per-frame catch evaluation — the [LOGIC] §4 rules, testable in
 * isolation. `HOLDING` means "keep running"; `CAUGHT` fires the payment.
 */
export function evaluateCatchFrame(
  state: CatchState,
  sample: CatchSample
): { verdict: CatchVerdict; next: CatchState } {
  const next: CatchState = { heldS: state.heldS, releasedS: state.releasedS };

  if (sample.gapM > TROTRO_CONFIG.MISS_GAP_M) {
    return { verdict: { kind: 'MISSED', reason: 'GAP_TOO_WIDE' }, next };
  }

  if (sample.isSprinting) {
    next.releasedS = 0;
  } else {
    next.releasedS += sample.dtS;
    if (next.releasedS > TROTRO_CONFIG.SPRINT_RELEASE_GRACE_S) {
      return { verdict: { kind: 'MISSED', reason: 'SPRINT_RELEASED' }, next };
    }
  }

  if (sample.gapM <= TROTRO_CONFIG.CATCH_RADIUS_M && sample.isSprinting) {
    next.heldS += sample.dtS;
    if (next.heldS >= TROTRO_CONFIG.CATCH_HOLD_S) {
      return { verdict: { kind: 'CAUGHT' }, next };
    }
  }

  return { verdict: { kind: 'HOLDING' }, next };
}

/**
 * Maps a desired world-space steering direction to joystick axes, inverse of
 * PlayerController's camera-yaw rotation (world = R(yaw) · input):
 *   inputX = dx·cos(yaw) − dz·sin(yaw), inputZ = dx·sin(yaw) + dz·cos(yaw)
 */
export function worldDirToJoystick(
  dx: number, dz: number, cameraYaw: number
): { x: number; y: number } {
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return { x: 0, y: 0 };
  const nx = dx / len;
  const nz = dz / len;
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  return {
    x: Math.max(-1, Math.min(1, nx * cos - nz * sin)),
    y: Math.max(-1, Math.min(1, nx * sin + nz * cos))
  };
}

// ------------------------------------------------------------------- errors

/** Typed failure surfaced through envelopes as `error` (README §2). */
export class TroTroOpError extends Error {
  constructor(public readonly error: SkillError) {
    super(error.message);
    this.name = 'TroTroOpError';
  }
}

function err(
  code: SkillError['code'], message: string, retryable: boolean,
  details?: Record<string, unknown>
): TroTroOpError {
  return new TroTroOpError({ code, message, retryable, details });
}

// -------------------------------------------------------------- host ports

/**
 * Host-supplied simulation ports. Everything has a sane default so that
 * `createTroTroSystem(bindings)` runs against the repo as-is (stationary van,
 * off-peak clock, arrival override stubbed to the HUD toast).
 */
export interface TroTroPorts {
  /** In-game 24 h clock (rush-hour windows). Default: 12 h (off-peak). */
  getInGameHours?(): number;
  /** Camera yaw in radians for joystick mapping. Default: 0. */
  getCameraYaw?(): number;
  /** Current sliding-door world point (moves with the van). Default: parked bay. */
  getVanDoorPoint?(): { x: number; z: number };
  /** Van speed in m/s; ≥ 0.5 means a chase is physically required. Default: 0. */
  getVanSpeedMps?(): number;
  /** Location override on BOARDED — same mechanism as movement.travel. */
  arriveAt?(destination: TrotroDestination): void;
  /** Monotonic clock in ms. Default: Date.now. */
  nowMs?(): number;
}

function resolvePorts(ports: TroTroPorts | undefined): Required<TroTroPorts> {
  return {
    getInGameHours: ports?.getInGameHours ?? (() => 12),
    getCameraYaw: ports?.getCameraYaw ?? (() => 0),
    getVanDoorPoint: ports?.getVanDoorPoint ?? (() => ({ ...TROTRO_CONFIG.PARKED_VAN_DOOR })),
    getVanSpeedMps: ports?.getVanSpeedMps ?? (() => 0),
    arriveAt: ports?.arriveAt ?? (() => undefined),
    nowMs: ports?.nowMs ?? (() => Date.now())
  };
}

// ----------------------------------------------------------- implementation

type ChaseResult = ChaseOutcome;

export class TroTroSystemImpl implements TroTroSystemRuntime {
  private readonly b: GameBindings;
  private readonly ports: Required<TroTroPorts>;

  private phase: BoardingPhase = 'IDLE';
  private offer: MateOffer | null = null;
  private quoteDeadlineMs: number | null = null;
  private nextVanAtMs: number | null = null;   // null → a van is at the bay
  private lastContestRefused = false;
  private catchState: CatchState = { heldS: 0, releasedS: 0 };
  private pendingChase: ((outcome: ChaseResult) => void) | null = null;

  constructor(bindings: GameBindings, ports?: TroTroPorts) {
    this.b = bindings;
    this.ports = resolvePorts(ports);
  }

  // ---------------------------------------------------- station & gating

  private vanPresent(): boolean {
    return this.nextVanAtMs === null || this.ports.nowMs() >= this.nextVanAtMs;
  }

  private nextVanMs(): number {
    if (this.vanPresent()) return 0;
    return Math.max(0, (this.nextVanAtMs ?? 0) - this.ports.nowMs());
  }

  /** Pre-boarding gate: inside circle_trotro_stop + within the 3.5 m radius. */
  private requireAtStop(): void {
    const p = this.b.player.position;
    if (this.b.locationAt(p.x, p.z).id !== TROTRO_CONFIG.STOP_LOCATION_ID) {
      throw err('E_NOT_AT_LOCATION',
        'Boarding requires standing inside circle_trotro_stop bounds (X 5.5–12.0, Z 4.0–12.0).',
        true, { locationId: this.b.locationAt(p.x, p.z).id, requiredLocationId: TROTRO_CONFIG.STOP_LOCATION_ID });
    }
    const dx = p.x - TROTRO_CONFIG.STOP_INTERACT_POINT.x;
    const dz = p.z - TROTRO_CONFIG.STOP_INTERACT_POINT.z;
    const dist = Math.hypot(dx, dz);
    if (dist > TROTRO_CONFIG.STOP_INTERACT_RADIUS_M) {
      throw err('E_NOT_AT_LOCATION',
        `Get within ${TROTRO_CONFIG.STOP_INTERACT_RADIUS_M} m of the mate at (9.0, 4.9) — currently ${dist.toFixed(1)} m away.`,
        true, { distanceM: Number(dist.toFixed(2)), requiredWithinM: TROTRO_CONFIG.STOP_INTERACT_RADIUS_M });
    }
  }

  private requireVanPresent(): void {
    if (!this.vanPresent()) {
      throw err('E_COOLDOWN', 'No van at the bay — the mate waved the last one on.',
        true, { retryAfterMs: this.nextVanMs(), nextVanMs: this.nextVanMs() });
    }
  }

  private requireNotChasing(): void {
    if (this.phase === 'RUNNING_ALONGSIDE' || this.pendingChase !== null) {
      throw err('E_BUSY', 'A door chase is in flight — wait for it to resolve.',
        true, { phase: this.phase });
    }
  }

  private doorGapM(): number {
    const p = this.b.player.position;
    const door = this.ports.getVanDoorPoint();
    return Math.hypot(p.x - door.x, p.z - door.z);
  }

  // ------------------------------------------------------- skill ops

  async queueAtStop(): Promise<{ phase: 'QUEUED'; nextVanMs: number }> {
    this.requireAtStop();
    this.phase = 'QUEUED';
    return { phase: 'QUEUED', nextVanMs: this.nextVanMs() };
  }

  async negotiateFare(routeId: TrotroRouteId): Promise<MateOffer> {
    this.requireAtStop();
    this.requireVanPresent();
    this.requireNotChasing();

    const route = FARE_BY_ROUTE[routeId];
    if (!route) {
      throw err('E_UNKNOWN_ID', `Unknown trotro route: ${String(routeId)}.`, false,
        { knownRoutes: TROTRO_ZONE_FARES.map((r) => r.routeId) });
    }

    const q = quoteFare(route, this.ports.getInGameHours());
    this.offer = {
      routeId: route.routeId,
      quotedFareGHS: q.quotedFareGHS,
      baseFareGHS: q.baseFareGHS,
      demandMultiplier: q.demandMultiplier,
      negotiationRoundsLeft: TROTRO_CONFIG.MAX_CONTEST_ROUNDS,
      mateLine: mateLine(route.routeId, 'quote', 0).replace('{F}', q.quotedFareGHS.toString())
    };
    this.quoteDeadlineMs = this.ports.nowMs() + TROTRO_CONFIG.QUOTE_WINDOW_MS;
    this.lastContestRefused = false;
    this.phase = 'NEGOTIATING';
    return this.offer;
  }

  async contestFare(): Promise<MateOffer | { refused: true }> {
    this.requireAtStop();
    this.requireNotChasing();

    if (!this.offer || this.phase !== 'NEGOTIATING') {
      throw err('E_BUSY', 'No open quote to contest — call negotiate_fare first.', true,
        { phase: this.phase });
    }

    // Boarding window closed while haggling: the van waves on.
    if (this.quoteDeadlineMs !== null && this.ports.nowMs() > this.quoteDeadlineMs) {
      this.departVan('MISSED');
      return { refused: true };
    }

    const { offer } = this;
    const atFloor = offer.quotedFareGHS <= offer.baseFareGHS;
    const roundsExhausted = offer.negotiationRoundsLeft === 0;

    if (atFloor || roundsExhausted) {
      // Mate refuses further haggling; the standing quote remains payable.
      this.lastContestRefused = true;
      return { refused: true };
    }

    const nextQuoted = Math.max(
      offer.baseFareGHS,
      roundToHalfCedi(offer.quotedFareGHS - TROTRO_CONFIG.CONTEST_STEP_GHS)
    );
    offer.quotedFareGHS = nextQuoted;
    offer.negotiationRoundsLeft = (offer.negotiationRoundsLeft - 1) as 0 | 1 | 2;
    offer.mateLine = mateLine(offer.routeId, 'haggle', offer.negotiationRoundsLeft)
      .replace('{F}', nextQuoted.toString());
    this.lastContestRefused = false;
    return offer;
  }

  async payAndBoard(payment: {
    amountGHS: number; routeId: TrotroRouteId;
  }): Promise<{ phase: 'BOARDED' } | { phase: 'REFUSED_FUNDS'; shortfallGHS: number }> {
    this.requireAtStop();
    this.requireVanPresent();
    this.requireNotChasing();

    if (!this.offer || this.phase !== 'NEGOTIATING') {
      throw err('E_BUSY', 'The mate quotes before he moves — call negotiate_fare first.', true,
        { phase: this.phase });
    }
    if (this.offer.routeId !== payment.routeId) {
      throw err('E_INVALID_PARAM',
        `Open quote is for ${this.offer.routeId}, not ${String(payment.routeId)}.`, false,
        { openRouteId: this.offer.routeId });
    }
    if (typeof payment.amountGHS !== 'number' || payment.amountGHS <= 0) {
      throw err('E_INVALID_PARAM', 'amountGHS must be a positive number.', false,
        { amountGHS: payment.amountGHS });
    }
    if (payment.amountGHS !== this.offer.quotedFareGHS) {
      // The mate takes the exact quoted fare — no tipping, no shorting.
      throw err('E_INVALID_PARAM', 'Pay the exact quoted fare.', false,
        { expectedGHS: this.offer.quotedFareGHS, gotGHS: payment.amountGHS });
    }

    const amount = payment.amountGHS;
    if (!this.b.wallet.canAfford(amount, 'CASH')) {
      const shortfall = Number((amount - this.b.wallet.getCashBalance()).toFixed(2));
      // No partial boarding, no IOU — the mate waves the van on (Example 2).
      this.departVan('REFUSED_FUNDS');
      return { phase: 'REFUSED_FUNDS', shortfallGHS: Math.max(0, shortfall) };
    }

    const route = FARE_BY_ROUTE[payment.routeId];
    const tx = this.b.wallet.spendMoney({
      amount,
      category: 'TRANSPORT',
      description: `Trotro fare ${route.label} (Mate's van)`,
      channel: 'CASH'
    });
    if (!tx) {
      throw err('E_INTERNAL', 'Wallet rejected the fare debit despite canAfford — report this.', true);
    }

    this.board(route.destination, `Circle, ${route.label}, woye!`);
    return { phase: 'BOARDED' };
  }

  async payCanonicalFare(): Promise<CanonicalFareResult> {
    this.requireAtStop();
    this.requireVanPresent();
    this.requireNotChasing();

    const result = this.b.economy.purchaseEverydayExpense(TROTRO_CONFIG.CANONICAL_EXPENSE_ID);
    if (!result.success) {
      const cash = this.b.wallet.getCashBalance();
      const fare = this.b.expenses[TROTRO_CONFIG.CANONICAL_EXPENSE_ID]?.costGHS ?? 6;
      this.departVan('REFUSED_FUNDS');
      return {
        phase: 'REFUSED_FUNDS',
        shortfallGHS: Math.max(0, Number((fare - cash).toFixed(2))),
        transaction: null,
        message: `Mate refuses: '${REFUSAL_LINES[0]}' — ${result.message}`
      };
    }
    this.board(null, 'Osu–Circle, ₵6, enter with your ₵6!');
    return {
      phase: 'BOARDED',
      transaction: result.transaction,
      message: result.message
    };
  }

  async chaseAndBoard(): Promise<{ boarded: boolean; gapM: number }> {
    this.requireAtStop();
    this.requireNotChasing();
    this.requireVanPresent();

    // Auto-quote for the open route (or re-quote the last one) — mid-chase the
    // 12 s window does not apply; the mate shouts the fare through the window.
    if (!this.offer || this.phase !== 'NEGOTIATING') {
      const route = this.offer ? FARE_BY_ROUTE[this.offer.routeId] : FARE_BY_ROUTE.OSU_CIRCLE_LOCAL;
      const q = quoteFare(route, this.ports.getInGameHours());
      this.offer = {
        routeId: route.routeId,
        quotedFareGHS: q.quotedFareGHS,
        baseFareGHS: q.baseFareGHS,
        demandMultiplier: q.demandMultiplier,
        negotiationRoundsLeft: TROTRO_CONFIG.MAX_CONTEST_ROUNDS,
        mateLine: mateLine(route.routeId, 'quote', 0).replace('{F}', q.quotedFareGHS.toString())
      };
    }

    const gapM = this.doorGapM();
    const vanMoving = this.ports.getVanSpeedMps() >= 0.5;

    if (!vanMoving) {
      // Parked van: no chase physics — a single door-approach evaluation.
      const sprinting = this.b.player.isSprinting || this.b.input.isVirtualSprintEnabled();
      if (gapM > TROTRO_CONFIG.MISS_GAP_M || !sprinting || gapM > TROTRO_CONFIG.CATCH_RADIUS_M) {
        this.phase = 'MISSED';
        return { boarded: false, gapM: Number(gapM.toFixed(2)) };
      }
      const outcome = this.settleChasePayment(Number(gapM.toFixed(2)));
      return { boarded: outcome.boarded, gapM: outcome.gapM };
    }

    // Moving van: enter RUNNING_ALONGSIDE; tick() evaluates each frame.
    this.phase = 'RUNNING_ALONGSIDE';
    this.catchState = { heldS: 0, releasedS: 0 };
    this.b.input.setVirtualSprint(true);   // walk 4.5 < van 5.5 — sprint mandatory

    return new Promise<ChaseResult>((resolve) => {
      this.pendingChase = resolve;
    });
  }

  // ------------------------------------------------- chase internals

  /** Debit the standing quote for a caught van. Never throws. */
  private settleChasePayment(gapM: number): ChaseOutcome {
    const offer = this.offer!;
    if (!this.b.wallet.canAfford(offer.quotedFareGHS, 'CASH')) {
      const shortfall = Number((offer.quotedFareGHS - this.b.wallet.getCashBalance()).toFixed(2));
      this.departVan('REFUSED_FUNDS');
      return { boarded: false, gapM, phaseAfter: 'REFUSED_FUNDS', shortfallGHS: Math.max(0, shortfall) };
    }
    const route = FARE_BY_ROUTE[offer.routeId];
    const tx = this.b.wallet.spendMoney({
      amount: offer.quotedFareGHS,
      category: 'TRANSPORT',
      description: `Trotro fare ${route.label} (caught the door)`,
      channel: 'CASH'
    });
    if (!tx) {
      this.departVan('MISSED');
      return { boarded: false, gapM, phaseAfter: 'MISSED' };
    }
    this.board(route.destination, `You catch am! ${route.label}, woye!`);
    return { boarded: true, gapM, phaseAfter: 'BOARDED' };
  }

  /**Van departs (waves on) — despawns past worldBoundsX (−25) in the host. */
  private departVan(phase: BoardingPhase): void {
    this.phase = phase;
    this.offer = null;
    this.quoteDeadlineMs = null;
    this.nextVanAtMs = this.ports.nowMs() + TROTRO_CONFIG.NEXT_VAN_MS;
    this.releaseChaseControls();
  }

  /** BOARDED resolution: debit done, location override + mate toast. */
  private board(destination: TrotroDestination | null, toastLine: string): void {
    this.phase = 'BOARDED';
    this.offer = null;
    this.quoteDeadlineMs = null;
    this.nextVanAtMs = this.ports.nowMs() + TROTRO_CONFIG.NEXT_VAN_MS;
    this.releaseChaseControls();
    if (destination) this.ports.arriveAt(destination);
    this.b.toast(toastLine);
  }

  private releaseChaseControls(): void {
    this.b.input.setJoystickInput(0, 0);
    this.b.input.setVirtualSprint(false);
  }

  // ------------------------------------------------------ runtime pump

  tick(dtMs: number): void {
    const dtS = Math.max(0, dtMs) / 1000;
    const now = this.ports.nowMs();

    // 1. Van respawn cycle.
    if (this.nextVanAtMs !== null && now >= this.nextVanAtMs) {
      this.nextVanAtMs = null;
      if (this.phase === 'MISSED' || this.phase === 'REFUSED_FUNDS' ||
          this.phase === 'QUEUED') {
        this.phase = 'IDLE';
      }
    }

    // 2. Quote expiry (only while calmly negotiating — never mid-chase).
    if (this.phase === 'NEGOTIATING' && this.quoteDeadlineMs !== null &&
        now > this.quoteDeadlineMs) {
      this.departVan('MISSED');
      return;
    }

    // 3. Door chase evaluation + steering.
    if (this.phase === 'RUNNING_ALONGSIDE' && this.pendingChase !== null) {
      const gapM = this.doorGapM();
      const sprinting = this.b.player.isSprinting && this.b.input.isVirtualSprintEnabled();
      const { verdict } = evaluateCatchFrame(this.catchState, {
        gapM, isSprinting: sprinting, dtS
      });

      // Pure-pursuit steering toward the moving sliding door.
      const door = this.ports.getVanDoorPoint();
      const p = this.b.player.position;
      const joy = worldDirToJoystick(door.x - p.x, door.z - p.z, this.ports.getCameraYaw());
      this.b.input.setJoystickInput(joy.x, joy.y);
      this.b.input.setVirtualSprint(true);

      const gapRounded = Number(gapM.toFixed(2));
      if (verdict.kind === 'MISSED') {
        this.departVan('MISSED');
        this.pendingChase({ boarded: false, gapM: gapRounded, phaseAfter: 'MISSED' });
        this.pendingChase = null;
      } else if (verdict.kind === 'CAUGHT') {
        const outcome = this.settleChasePayment(gapRounded);
        this.pendingChase(outcome);
        this.pendingChase = null;
      }
    }
  }

  stop(): void {
    if (this.pendingChase !== null) {
      const gapM = Number(this.doorGapM().toFixed(2));
      this.pendingChase({ boarded: false, gapM, phaseAfter: this.phase });
      this.pendingChase = null;
    }
    this.releaseChaseControls();
    if (this.phase === 'RUNNING_ALONGSIDE' || this.phase === 'QUEUED' ||
        this.phase === 'NEGOTIATING') {
      this.phase = 'IDLE';
    }
  }

  getState(): TroTroStateView {
    return {
      phase: this.phase,
      offer: this.offer ? { ...this.offer } : null,
      quoteExpiresInMs: this.quoteDeadlineMs !== null
        ? Math.max(0, this.quoteDeadlineMs - this.ports.nowMs())
        : null,
      vanPresent: this.vanPresent(),
      nextVanMs: this.nextVanMs(),
      lastContestRefused: this.lastContestRefused,
      doorGapM: Number(this.doorGapM().toFixed(2))
    };
  }

  // -------------------------------------------------- envelope routing

  async handleOp(
    op: string,
    params: Record<string, unknown>
  ): Promise<{ ok: true; result: unknown } | { ok: false; error: SkillError }> {
    const key = op.replace(/_/g, '').toLowerCase();
    try {
      switch (key) {
        case 'queueatstop': {
          const r = await this.queueAtStop();
          return { ok: true, result: r };
        }
        case 'negotiatefare': {
          const routeId = params.routeId;
          if (typeof routeId !== 'string') {
            throw err('E_INVALID_PARAM', 'params.routeId (TrotroRouteId) is required.', false);
          }
          const r = await this.negotiateFare(routeId as TrotroRouteId);
          return { ok: true, result: r };
        }
        case 'contestfare': {
          const r = await this.contestFare();
          return { ok: true, result: r };
        }
        case 'payandboard': {
          const amountGHS = params.amountGHS;
          const routeId = params.routeId;
          if (typeof amountGHS !== 'number' || typeof routeId !== 'string') {
            throw err('E_INVALID_PARAM',
              'params.amountGHS (number) and params.routeId (TrotroRouteId) are required.', false);
          }
          const r = await this.payAndBoard({ amountGHS, routeId: routeId as TrotroRouteId });
          return { ok: true, result: r };
        }
        case 'paycanonicalfare': {
          const r = await this.payCanonicalFare();
          return { ok: true, result: r };
        }
        case 'chaseandboard': {
          const r = await this.chaseAndBoard();
          return { ok: true, result: r };
        }
        case 'getstate': {
          return { ok: true, result: this.getState() };
        }
        default:
          return {
            ok: false,
            error: {
              code: 'E_BAD_ENVELOPE',
              message: `Unknown tro-tro op: ${op}.`,
              retryable: false,
              details: {
                knownOps: ['queue_at_stop', 'negotiate_fare', 'contest_fare',
                  'pay_and_board', 'pay_canonical_fare', 'chase_and_board', 'get_state']
              }
            }
          };
      }
    } catch (e) {
      if (e instanceof TroTroOpError) return { ok: false, error: e.error };
      return {
        ok: false,
        error: { code: 'E_INTERNAL', message: String(e), retryable: true }
      };
    }
  }
}

// ------------------------------------------------------------------ factory

/**
 * Host factory — mirrors `createSkills(bindings)` in agent-adapter.ts.
 * The returned system satisfies the `TroTroSystem` contract from
 * tro-tro-system.md plus the runtime pump/envelope surface.
 */
export function createTroTroSystem(
  bindings: GameBindings,
  ports?: TroTroPorts
): TroTroSystemRuntime {
  return new TroTroSystemImpl(bindings, ports);
}
