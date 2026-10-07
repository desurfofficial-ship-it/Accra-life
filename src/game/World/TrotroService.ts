import { ACCRA_EVERYDAY_EXPENSES } from '../Economy/EconomyManager';

/**
 * TrotroService — real passenger/capacity state for the Accra trotro van.
 * ============================================================
 *
 * Backs the `ACC_TROTRO_001` Sprinter built by `buildTrotroStopAndVehicle`
 * (this folder, `NeighborhoodTrotro.ts`), which is static scenery: the
 * meshes and colliders live here, but seat state never did. This service
 * owns that state so the AI agent contracts in `skills/tro-tro-system.md`
 * can gate boarding on a real capacity check instead of an adapter-owned
 * fiction.
 *
 * Canon: a standard Accra trotro Sprinter seats 14 passengers plus the
 * driver and the mate. The van loads at the `trotro_stop` interactable
 * (the Osu–Circle station) and the mate refuses additional passengers
 * once `isFull()` is true.
 *
 * The canonical fare expense is `EXP_TROTRO_FARE` in
 * `../Economy/EconomyManager.ts`, whose purchase now also grants the
 * owned item id `trotro_ticket_osu_circle` (see `grantOwnedItemId`).
 */

export const TROTRO_VEHICLE_ID = 'ACC_TROTRO_001';
export const TROTRO_DEFAULT_CAPACITY = 14;
export const TROTRO_ROUTE_EXPENSE_ID = 'EXP_TROTRO_FARE';
export const TROTRO_TICKET_ITEM_ID = 'trotro_ticket_osu_circle';

export interface TrotroPassengerSnapshot {
  readonly vehicleId: string;
  readonly routeExpenseId: string;
  readonly ticketItemId: string;
  readonly currentPassengers: number;
  readonly capacity: number;
  readonly seatsAvailable: number;
  readonly isFull: boolean;
}

export class TrotroService {
  private currentPassengers = 0;
  private readonly capacity: number;

  constructor(capacity: number = TROTRO_DEFAULT_CAPACITY) {
    if (capacity < 0 || !Number.isFinite(capacity)) {
      throw new Error(`TrotroService: invalid capacity ${capacity}`);
    }
    this.capacity = Math.floor(capacity);
  }

  public getCurrentPassengers(): number {
    return this.currentPassengers;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public getSeatsAvailable(): number {
    return this.capacity - this.currentPassengers;
  }

  public isFull(): boolean {
    return this.currentPassengers >= this.capacity;
  }

  /**
   * Attempt to seat one passenger. Returns `true` when a seat was taken,
   * `false` when the van is full (mate refuses: "No space! Next one!").
   */
  public boardPassenger(): boolean {
    if (this.isFull()) {
      return false;
    }
    this.currentPassengers += 1;
    return true;
  }

  /**
   * Drop one passenger (destination reached). Returns `true` when a
   * passenger alighted, `false` when the van was already empty.
   */
  public alightPassenger(): boolean {
    if (this.currentPassengers <= 0) {
      return false;
    }
    this.currentPassengers -= 1;
    return true;
  }

  /**
   * Bulk load (e.g. rebuilding world state). Returns the number of
   * passengers actually loaded, clamped to capacity.
   */
  public loadPassengers(count: number): number {
    if (count <= 0) return 0;
    const before = this.currentPassengers;
    this.currentPassengers = Math.min(this.capacity, before + Math.floor(count));
    return this.currentPassengers - before;
  }

  /** Van pulls away / depot reset — empties the vehicle. */
  public resetVehicle(): void {
    this.currentPassengers = 0;
  }

  public getSnapshot(): TrotroPassengerSnapshot {
    return {
      vehicleId: TROTRO_VEHICLE_ID,
      routeExpenseId: TROTRO_ROUTE_EXPENSE_ID,
      ticketItemId: TROTRO_TICKET_ITEM_ID,
      currentPassengers: this.currentPassengers,
      capacity: this.capacity,
      seatsAvailable: this.getSeatsAvailable(),
      isFull: this.isFull()
    };
  }

  /** Canonical fare for the Osu–Circle route, read from the real SKU table. */
  public getCanonicalFareGHS(): number {
    return ACCRA_EVERYDAY_EXPENSES[TROTRO_ROUTE_EXPENSE_ID].costGHS;
  }
}
