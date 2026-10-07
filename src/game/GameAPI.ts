import * as THREE from 'three';
import { EconomyManager } from './Economy/EconomyManager';
import {
  RemoveFundsParams,
  Wallet,
  WalletValidationResult
} from './Economy/Wallet';
// RemoveFundsParams re-exported for hosts that want the strict Wallet shape.
import { TransactionRecord } from './Economy/Transaction';
import { PaymentChannel, TransactionCategory } from './Economy/EconomicTypes';
import { PlayerController } from './Player/PlayerController';
import { InputManager } from './Player/InputManager';
import { InteractableTarget, InteractionSystem } from './Player/InteractionSystem';
import {
  TROTRO_VEHICLE_ID,
  TrotroPassengerSnapshot,
  TrotroService,
  TrotroState
} from './World/TrotroService';
import { eventService, GameEventId } from './World/EventService';
import { VendorService, VENDOR_JOB_ID } from './Jobs/VendorService';

/**
 * GameAPI — the routing bridge between AI agent skills and the live game.
 * ============================================================
 *
 * This is the concrete bridge referenced by the [ROUTING] section of
 * `skills/tro-tro-system.md`: the agent never imports `src/` internals;
 * it calls methods on a `GameAPI` instance and each method routes 1:1 to
 * the owning system. Routing map (AI-facing call → real target file):
 *
 *   getCashBalance / canAfford / spendMoney / addFunds / getTransactions
 *     → src/game/Economy/Wallet.ts
 *   purchaseEverydayExpense / getOwnedItemIds / hasOwnedItem
 *     → src/game/Economy/EconomyManager.ts
 *   position / setJoystickInput / setSprintState / isSprinting
 *     → src/game/Player/PlayerController.ts
 *   getActiveTarget / triggerCurrentInteraction
 *     → src/game/Player/InteractionSystem.ts
 *   getTrotroStatus / boardPassenger / alightPassenger / getSnapshot / isFull …
 *     → src/game/World/TrotroService.ts (phase-5 lifecycle state machine:
 *       EN_ROUTE → ARRIVING → IDLE_AT_STOP → BOARDING → DEPARTING → …)
 *   getCurrentEvent / getEventMultiplier
 *     → src/game/World/EventService.ts (shared NORMAL ↔ RUSH_HOUR cycle)
 *   startVendorJob / getCurrentJob
 *     → src/game/Jobs/VendorService.ts (Makola street-vendor timed shift,
 *       skills/vendor-system.md)
 *
 * Boot wiring (host, e.g. `src/main.ts`): construct the live systems,
 * then hand them to the factory —
 *
 *   import { createGameAPI } from './game/GameAPI';
 *   const gameAPI = createGameAPI({ economy: economyManager, player: phase1.player,
 *                                   input: phase1.inputManager, interactions: phase1.interactionSystem });
 *
 * Omitted options are defaulted (fresh EconomyManager, spawn-default
 * PlayerController, empty TrotroService), so the bridge also works in
 * headless tests.
 */

export interface GameAPIOptions {
  economy?: EconomyManager;
  player?: PlayerController;
  input?: InputManager;
  interactions?: InteractionSystem;
  trotro?: TrotroService;
  /** Makola street-vendor shift service (skills/vendor-system.md). */
  vendor?: VendorService;
}

export class GameAPI {
  public readonly economy: EconomyManager;
  public readonly wallet: Wallet;
  public readonly player: PlayerController;
  public readonly input: InputManager;
  public readonly interactions: InteractionSystem;
  public readonly trotro: TrotroService;
  public readonly vendor: VendorService;
  public readonly vehicleId: string = TROTRO_VEHICLE_ID;
  public readonly vendorJobId: string = VENDOR_JOB_ID;

  constructor(options: GameAPIOptions = {}) {
    this.economy = options.economy ?? new EconomyManager();
    this.wallet = this.economy.wallet;
    this.input = options.input ?? new InputManager();
    this.player = options.player ?? new PlayerController(this.input);
    this.interactions = options.interactions ?? new InteractionSystem(
      // Standalone default scene — hosts pass the live one via options.
      new THREE.Scene(),
      this.input,
      () => undefined,
      () => undefined
    );
    this.trotro = options.trotro ?? new TrotroService();
    // VendorService reads the Makola stand position straight from GridMap,
    // so a headless default (no live stand builder) still enforces the
    // same proximity gate as the wired game.
    this.vendor = options.vendor ?? new VendorService(this.economy);
  }

  // ------------------------------------------------------ Wallet routing
  // Routed to: src/game/Economy/Wallet.ts

  public getCashBalance(): number {
    return this.wallet.getCashBalance();
  }

  public canAfford(amount: number, channel: PaymentChannel = 'CASH'): boolean {
    return this.wallet.canAfford(amount, channel);
  }

  public spendMoney(params: {
    amount: number;
    description: string;
    channel?: PaymentChannel;
    /** Defaults to 'TRANSPORT' — the bridge's dominant use-case (fares). */
    category?: TransactionCategory;
    targetEntityId?: string;
  }): TransactionRecord | null {
    return this.wallet.spendMoney({
      amount: params.amount,
      description: params.description,
      channel: params.channel ?? 'CASH',
      category: params.category ?? 'TRANSPORT',
      targetEntityId: params.targetEntityId
    });
  }

  public addFunds(params: {
    amount: number;
    description: string;
    /** Defaults to 'SALE' — street-income credits (skills/vendor-system.md
     * calls addFunds WITHOUT a category; Wallet.addFunds validates the
     * category against ALLOWED_INCOME_CATEGORIES, so the bridge supplies
     * one the same way spendMoney defaults 'TRANSPORT'). */
    category?: TransactionCategory;
    sourceEntityId?: string;
    /** Defaults to 'CASH'. */
    channel?: PaymentChannel;
    isIllegalOrigin?: boolean;
  }): WalletValidationResult {
    return this.wallet.addFunds({
      amount: params.amount,
      description: params.description,
      category: params.category ?? 'SALE',
      sourceEntityId: params.sourceEntityId,
      channel: params.channel ?? 'CASH',
      isIllegalOrigin: params.isIllegalOrigin
    });
  }

  public getTransactions(): ReadonlyArray<TransactionRecord> {
    return this.wallet.getTransactions();
  }

  // --------------------------------------------- EconomyManager routing
  // Routed to: src/game/Economy/EconomyManager.ts

  public purchaseEverydayExpense(expenseId: string, options?: {
    /** v4.9 surge override — pass getFareDue() during RUSH_HOUR. */
    amountGHS?: number;
  }): {
    success: boolean;
    message: string;
    transaction: TransactionRecord | null;
  } {
    return this.economy.purchaseEverydayExpense(expenseId, options);
  }

  /** Real owned-item check — includes the trotro ticket `trotro_ticket_osu_circle`. */
  public getOwnedItemIds(): readonly string[] {
    return this.economy.getOwnershipFoundations().ownedItemIds;
  }

  public hasOwnedItem(itemId: string): boolean {
    return this.getOwnedItemIds().includes(itemId);
  }

  // ------------------------------------------ PlayerController routing
  // Routed to: src/game/Player/PlayerController.ts

  /** Live world position (read-only reference into the controller). */
  public get position(): THREE.Vector3 {
    return this.player.position;
  }

  public setJoystickInput(x: number, y: number): void {
    this.player.setJoystickInput(x, y);
  }

  public setSprintState(active: boolean): void {
    this.player.setSprintState(active);
  }

  public get isSprinting(): boolean {
    return this.player.isSprinting;
  }

  // ----------------------------------------- InteractionSystem routing
  // Routed to: src/game/Player/InteractionSystem.ts

  public getActiveTarget(): InteractableTarget | null {
    return this.interactions.getActiveTarget();
  }

  /** 250 ms cooldown is enforced inside InteractionSystem. */
  public triggerCurrentInteraction(): boolean {
    return this.interactions.triggerCurrentInteraction();
  }

  // ------------------------------------------- TrotroService routing
  // Routed to: src/game/World/TrotroService.ts

  /**
   * Physical state of ACC_TROTRO_001 (skills/tro-tro-system.md v4.6 state
   * gate): 'EN_ROUTE' | 'ARRIVING' | 'IDLE_AT_STOP' | 'BOARDING' |
   * 'DEPARTING'. Read-only for the AI — only the host/renderer drives the
   * lifecycle (LivingTrotro calls startCycle(); auto-timers do the rest).
   */
  public getTrotroStatus(): TrotroState {
    return this.trotro.getState();
  }

  public getSnapshot(): TrotroPassengerSnapshot {
    return this.trotro.getSnapshot();
  }

  /** `false` → van not docked (state gate: EN_ROUTE/ARRIVING/DEPARTING) or
   *  van full — mate refuses ("No space! Next one!"). */
  public boardPassenger(): boolean {
    const seated = this.trotro.boardPassenger();
    if (seated) this.economy.saveSnapshot();
    return seated;
  }

  public alightPassenger(): boolean {
    const dropped = this.trotro.alightPassenger();
    if (dropped) this.economy.saveSnapshot();
    return dropped;
  }

  public getCurrentPassengers(): number {
    return this.trotro.getCurrentPassengers();
  }

  public getCapacity(): number {
    return this.trotro.getCapacity();
  }

  public getSeatsAvailable(): number {
    return this.trotro.getSeatsAvailable();
  }

  public isTrotroFull(): boolean {
    return this.trotro.isFull();
  }

  /** Bulk load (world-state rebuild); returns passengers actually seated. */
  public loadPassengers(count: number): number {
    const seated = this.trotro.loadPassengers(count);
    if (seated > 0) this.economy.saveSnapshot();
    return seated;
  }

  /** Van pulls away / depot reset — empties the vehicle. */
  public resetVehicle(): void {
    this.trotro.resetVehicle();
    this.economy.saveSnapshot();
  }

  /** Canonical Osu–Circle fare from the real SKU table (BASE price, ₵5).
   * For the door price — base × live event surge — use getFareDue(). */
  public getCanonicalFareGHS(): number {
    return this.trotro.getCanonicalFareGHS();
  }

  // --------------------------------------------- EventService routing (v4.9)
  // Routed to: src/game/World/EventService.ts (shared eventService singleton)

  /**
   * The live world event — 'NORMAL' | 'RUSH_HOUR' (v4.9 rush-hour spec).
   * RUSH_HOUR: fare surges ×1.5 (₵5 → ₵7.5), the van cycles ~40% faster
   * and the Mate barks 'Circle! Circle! Rush hour o! No time to argue,
   * enter or stay!'. Read this BEFORE the boarding sequence.
   */
  public getCurrentEvent(): GameEventId {
    return eventService.getCurrentEvent();
  }

  /** Fare multiplier for the live event — 1.0 (NORMAL) | 1.5 (RUSH_HOUR). */
  public getEventMultiplier(): number {
    return eventService.getFareMultiplier();
  }

  /**
   * The fare actually due at the door right now (v4.9): base × event
   * multiplier — ₵5 normally, ₵7.5 during RUSH_HOUR. The boarding flow
   * MUST debit this amount (single source of truth for the surge).
   */
  public getFareDue(): number {
    return this.trotro.getFareDueGHS();
  }

  // ---------------------------------------------- VendorService routing
  // Routed to: src/game/Jobs/VendorService.ts (skills/vendor-system.md)

  /**
   * Start a Makola street-vendor selling shift (10 s). The bridge injects
   * the live player position into the service's proximity gate — a shift
   * can only be started AT the stand (≤ 3.5 m from
   * GridMap.MAKOLA_VENDOR_STAND_WORLD). Void per contract: verify the
   * shift took with getCurrentJob() ('VENDOR_MAKOLA' while selling).
   * The ENGINE credits the payout after 10 s through the addFunds wallet
   * path — never call addFunds() manually for a vendor sale.
   */
  public startVendorJob(): void {
    this.vendor.startVendorJob({
      x: this.player.position.x,
      z: this.player.position.z
    });
  }

  /**
   * The active street-vendor job id — 'VENDOR_MAKOLA' while a shift is
   * selling, else null. Null after the payout lands: verify the money
   * with getCashBalance()/getTransactions() (top row: INCOME · SALE).
   * (JobManager walk-step shifts are a separate surface — economy_skill.)
   */
  public getCurrentJob(): typeof VENDOR_JOB_ID | null {
    return this.vendor.getCurrentJob();
  }
}

export function createGameAPI(options: GameAPIOptions = {}): GameAPI {
  return new GameAPI(options);
}
