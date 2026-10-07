import { ACCRA_EVERYDAY_EXPENSES } from '../Economy/EconomyManager';
import { eventService } from './EventService';

/**
 * TrotroService — real passenger/capacity state + living state machine.
 * ============================================================
 *
 * Phase 5: Living Trotro — the van now has a lifecycle state machine:
 *
 *   EN_ROUTE → ARRIVING → IDLE_AT_STOP → BOARDING → DEPARTING → EN_ROUTE ...
 *
 * The state machine auto-transitions:
 *   - ARRIVING → IDLE_AT_STOP after 2s (van arrives, doors open, mate greets)
 *   - IDLE_AT_STOP → DEPARTING after 8s dwell if nobody boards (van waits a
 *     few seconds for fares, then pulls away on its own — the "Ah! You
 *     missed it!" window is real)
 *   - BOARDING → DEPARTING after 5s (passengers seated, doors close, van pulls away)
 *   - DEPARTING → EN_ROUTE after 8s (van arrives at next stop, cycle repeats)
 *
 * Listeners receive { state, prevState, van } on every transition so
 * the R3F renderer can play animations, swap meshes, trigger audio, etc.
 */

export const TROTRO_VEHICLE_ID = 'ACC_TROTRO_001';
export const TROTRO_DEFAULT_CAPACITY = 14;
export const TROTRO_ROUTE_EXPENSE_ID = 'EXP_TROTRO_FARE';
export const TROTRO_TICKET_ITEM_ID = 'trotro_ticket_osu_circle';

// ── State machine types ────────────────────────────────────────────────────

export type TrotroState = 'EN_ROUTE' | 'ARRIVING' | 'IDLE_AT_STOP' | 'BOARDING' | 'DEPARTING';

export interface TrotroStateChange {
  state: TrotroState;
  prevState: TrotroState | null;
  timestamp: number;
}

export type TrotroStateListener = (change: TrotroStateChange) => void;

// ── Auto-transition timings (ms) ────────────────────────────────────────────

const ARRIVING_TO_IDLE_MS = 2000;     // 2s — van arrives, doors open
const IDLE_DWELL_TO_DEPARTING_MS = 8000; // 8s — fare dwell, then departs unboarded
const BOARDING_TO_DEPARTING_MS = 5000; // 5s — passengers board
const DEPARTING_TO_EN_ROUTE_MS = 8000; // 8s — van arrives at next stop

// ── Mate dialogue lines (authentic Accra flavor per spec) ──────────────────

export const MATE_LINES = {
  // v4.8 culture pass: real Mates bark the route with intermediate stops and
  // the iconic change call — passengers with big notes get the cold shoulder.
  ARRIVING: [
    'Circle! Circle! Enter well!',
    'Oga, move inside make we go!',
    'Last stop! Enter make we move!',
    'Osu! Circle! Osu! Circle!',
    'Enter with your change o!',
  ],
  // v4.8 dwell culture: the van is docked but NOT leaving until it fills —
  // real Mates keep barking while they wait ("we dey wait one more person").
  DWELL: [
    'One more person make we move!',
    'Enter with your change!',
    'Two for the front seat, workers!',
    'We dey go soon — make you enter with your change!',
  ],
  FULL: 'No space! Next one!',
  // v4.9 rush-hour chaos (skills/tro-tro-system.md [LOGIC]): while the
  // world event is RUSH_HOUR the Mate drops the relaxed patter and barks
  // the surge — no time to argue, enter or stay.
  RUSH_HOUR: [
    'Circle! Circle! Rush hour o! No time to argue, enter or stay!',
    'Rush hour! Enter with your change sharp sharp!',
    'Move fast make we go — traffic dey wait us!',
    'Rush hour fare! ₵7.5 — no haggling today! Enter or stay!',
  ],
  INSUFFICIENT: 'Oga, you no get change? Abeg shift make others enter.',
  BOARDED: 'Make you sit well. We dey go!',
  DEPARTING: 'Hold tight! We dey move!',
  // v4.6 physical state gate — scene/player lines for refused boarding
  // (skills/tro-tro-system.md [LOGIC]: getTrotroStatus() !== 'IDLE_AT_STOP'
  // ⇒ ABORT; DEPARTING gets the missed-van line + a chase/wait beat).
  MISSED: 'Ah! You missed it! Wait for the next one!',
  NOT_AT_STOP: 'No van at the stop yet — wait for the next one!',
} as const;

// ── Asset loading ────────────────────────────────────────────────────────────

export interface TrotroLoadedAssets {
  vanModelUrl: string | null;
  mateModelUrl: string | null;
  loaded: boolean;
}

/**
 * loadTrotroAssets — fetches GLTF/GLB models for the trotro van and mate.
 *
 * In production this would fetch from the asset registry. For now it
 * returns placeholder URLs (procedural geometry is used in the R3F
 * renderer since no dedicated van/mate GLBs were uploaded).
 */
export async function loadTrotroAssets(): Promise<TrotroLoadedAssets> {
  // Check if a dedicated van GLB exists in the public assets
  const vanModelUrl = null; // '/assets/glb/trotro_van.glb' when available
  const mateModelUrl = null; // '/assets/glb/trotro_mate.glb' when available
  return { vanModelUrl, mateModelUrl, loaded: true };
}

// ── Snapshot (existing, preserved) ─────────────────────────────────────────

export interface TrotroPassengerSnapshot {
  readonly vehicleId: string;
  readonly routeExpenseId: string;
  readonly ticketItemId: string;
  readonly currentPassengers: number;
  readonly capacity: number;
  readonly seatsAvailable: number;
  readonly isFull: boolean;
  readonly state: TrotroState;
}

// ── Service class ────────────────────────────────────────────────────────────

export class TrotroService {
  private currentPassengers = 0;
  private readonly capacity: number;
  private state: TrotroState = 'EN_ROUTE';
  private stateTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<TrotroStateListener>();

  constructor(capacity: number = TROTRO_DEFAULT_CAPACITY) {
    if (capacity < 0 || !Number.isFinite(capacity)) {
      throw new Error(`TrotroService: invalid capacity ${capacity}`);
    }
    this.capacity = Math.floor(capacity);
  }

  // ── State machine ─────────────────────────────────────────────────────────

  public getState(): TrotroState { return this.state; }

  public onStateChange(listener: TrotroStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Force a state transition (for testing or scripted events). */
  public setState(newState: TrotroState): void {
    if (newState === this.state) return;
    this.transitionTo(newState);
  }

  /** Start the van cycle — van begins arriving at the stop. */
  public startCycle(): void {
    this.transitionTo('ARRIVING');
  }

  private transitionTo(newState: TrotroState): void {
    const prev = this.state;
    this.state = newState;
    if (this.stateTimer) { clearTimeout(this.stateTimer); this.stateTimer = null; }

    const change: TrotroStateChange = { state: newState, prevState: prev, timestamp: Date.now() };
    for (const l of this.listeners) {
      try { l(change); } catch { /* listener errors shouldn't crash */ }
    }

    // Auto-transitions
    switch (newState) {
      case 'ARRIVING':
        // After 2s (× event speed), van arrives → doors open → mate greets → IDLE
        this.stateTimer = setTimeout(() => this.transitionTo('IDLE_AT_STOP'), this.arrivingMs());
        break;
      case 'IDLE_AT_STOP':
        // Fare dwell: the van waits a few seconds for passengers; if nobody
        // boards it pulls away on its own (real trotro behavior — the
        // DEPARTING "missed it" window exists without any boarding).
        // v4.9: the dwell shortens during RUSH_HOUR (8 s → ~5 s) — the
        // Mate has no time to argue.
        this.stateTimer = setTimeout(() => this.transitionTo('DEPARTING'), this.idleDwellMs());
        break;
      case 'BOARDING':
        // After 5s (× event speed), passengers seated → doors close → DEPARTING
        this.stateTimer = setTimeout(() => this.transitionTo('DEPARTING'), this.boardingMs());
        break;
      case 'DEPARTING':
        // After 8s (× event speed), van arrives at next stop → cycle resets
        this.stateTimer = setTimeout(() => {
          this.transitionTo('EN_ROUTE');
          // Brief EN_ROUTE then arrive again
          this.stateTimer = setTimeout(() => this.transitionTo('ARRIVING'), this.enRouteMs());
        }, this.departingMs());
        break;
    }
  }

  // ── Event-aware cycle timings (v4.9) ──────────────────────────────────
  // Spec numbers (ARRIVING 2s / dwell 8s / BOARDING 5s / DEPARTING 8s) run
  // at NORMAL pace and scale by the shared event speed factor — RUSH_HOUR
  // compresses every phase to ~60% so the whole van rhythm turns urgent.
  private arrivingMs(): number {
    return Math.round(ARRIVING_TO_IDLE_MS * eventService.getSpeedFactor());
  }
  private idleDwellMs(): number {
    return Math.round(IDLE_DWELL_TO_DEPARTING_MS * eventService.getSpeedFactor());
  }
  private boardingMs(): number {
    return Math.round(BOARDING_TO_DEPARTING_MS * eventService.getSpeedFactor());
  }
  private departingMs(): number {
    return Math.round(DEPARTING_TO_EN_ROUTE_MS * eventService.getSpeedFactor());
  }
  private enRouteMs(): number {
    return Math.round(1000 * eventService.getSpeedFactor());
  }

  // ── Boarding (triggers BOARDING state) ─────────────────────────────────────

  /**
   * Attempt to board a passenger. If IDLE_AT_STOP and not full,
   * transitions to BOARDING state + seats the passenger.
   * Returns true if boarding succeeded.
   */
  public boardPassenger(): boolean {
    if (this.state !== 'IDLE_AT_STOP' && this.state !== 'BOARDING') {
      return false; // Can't board when van isn't at the stop
    }
    if (this.isFull()) {
      return false;
    }
    if (this.state === 'IDLE_AT_STOP') {
      this.transitionTo('BOARDING');
    }
    this.currentPassengers += 1;
    return true;
  }

  // ── Existing capacity methods (preserved) ──────────────────────────────────

  public getCurrentPassengers(): number { return this.currentPassengers; }
  public getCapacity(): number { return this.capacity; }
  public getSeatsAvailable(): number { return this.capacity - this.currentPassengers; }
  public isFull(): boolean { return this.currentPassengers >= this.capacity; }

  public alightPassenger(): boolean {
    if (this.currentPassengers <= 0) return false;
    this.currentPassengers -= 1;
    return true;
  }

  public loadPassengers(count: number): number {
    if (count <= 0) return 0;
    const before = this.currentPassengers;
    this.currentPassengers = Math.min(this.capacity, before + Math.floor(count));
    return this.currentPassengers - before;
  }

  public resetVehicle(): void {
    this.currentPassengers = 0;
    if (this.stateTimer) { clearTimeout(this.stateTimer); this.stateTimer = null; }
    this.state = 'EN_ROUTE';
  }

  public getSnapshot(): TrotroPassengerSnapshot {
    return {
      vehicleId: TROTRO_VEHICLE_ID,
      routeExpenseId: TROTRO_ROUTE_EXPENSE_ID,
      ticketItemId: TROTRO_TICKET_ITEM_ID,
      currentPassengers: this.currentPassengers,
      capacity: this.capacity,
      seatsAvailable: this.getSeatsAvailable(),
      isFull: this.isFull(),
      state: this.state,
    };
  }

  /** Base route fare from the canonical economy table (₵5, event-blind). */
  public getBaseFareGHS(): number {
    return ACCRA_EVERYDAY_EXPENSES[TROTRO_ROUTE_EXPENSE_ID].costGHS;
  }

  /**
   * Fare actually due at the door (v4.9): base × the live event's surge
   * multiplier — ₵5 normally, ₵7.5 during RUSH_HOUR. This is the number
   * the Mate collects; GameAPI.getFareDue() routes here.
   */
  public getFareDueGHS(): number {
    return Math.round(this.getBaseFareGHS() * eventService.getFareMultiplier() * 100) / 100;
  }

  /** Canonical fare — kept as the BASE price (callers wanting the surged
   * door price must use getFareDueGHS()). */
  public getCanonicalFareGHS(): number {
    return this.getBaseFareGHS();
  }
}
