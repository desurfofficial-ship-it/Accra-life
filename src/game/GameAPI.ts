import * as THREE from 'three';
import { EconomyManager } from './Economy/EconomyManager';
import {
  AddFundsParams,
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
  TrotroService
} from './World/TrotroService';

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
 *   boardPassenger / alightPassenger / getSnapshot / isFull …
 *     → src/game/World/TrotroService.ts
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
}

export class GameAPI {
  public readonly economy: EconomyManager;
  public readonly wallet: Wallet;
  public readonly player: PlayerController;
  public readonly input: InputManager;
  public readonly interactions: InteractionSystem;
  public readonly trotro: TrotroService;
  public readonly vehicleId: string = TROTRO_VEHICLE_ID;

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

  public addFunds(params: AddFundsParams): WalletValidationResult {
    return this.wallet.addFunds(params);
  }

  public getTransactions(): ReadonlyArray<TransactionRecord> {
    return this.wallet.getTransactions();
  }

  // --------------------------------------------- EconomyManager routing
  // Routed to: src/game/Economy/EconomyManager.ts

  public purchaseEverydayExpense(expenseId: string): {
    success: boolean;
    message: string;
    transaction: TransactionRecord | null;
  } {
    return this.economy.purchaseEverydayExpense(expenseId);
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

  public getSnapshot(): TrotroPassengerSnapshot {
    return this.trotro.getSnapshot();
  }

  /** `false` → van full, mate refuses ("No space! Next one!"). */
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

  /** Canonical Osu–Circle fare from the real SKU table. */
  public getCanonicalFareGHS(): number {
    return this.trotro.getCanonicalFareGHS();
  }
}

export function createGameAPI(options: GameAPIOptions = {}): GameAPI {
  return new GameAPI(options);
}
