/**
 * Lagos Life Ghana — Agent Skill Adapter (interface contract)
 * ============================================================
 *
 * Declares the TypeScript surface that backs the three skill files in this
 * folder (`movement_skill.md`, `dialogue_skill.md`, `economy_skill.md`).
 *
 * The main agent speaks JSON envelopes (see `skills/README.md` §2); the host
 * game implements `createSkills(bindings)` below to translate envelopes into
 * calls on the live systems. This file is deliberately `import type`-only:
 * it compiles to nothing and is excluded from the app build (tsconfig
 * includes `src/` only) — wire it from a host module when integrating.
 *
 * Call flow:
 *   Main Agent → JSON envelope → SkillRouter (host) → Skill interface → game systems
 */

import type { PlayerController } from '../src/game/Player/PlayerController';
import type { InputManager } from '../src/game/Player/InputManager';
import type { InteractionSystem, InteractableTarget } from '../src/game/Player/InteractionSystem';
import type { LocationDef, LocationId, PlaceRecoveryAction } from '../src/game/World/Locations';
import type { EconomyManager, EverydayExpenseOption } from '../src/game/Economy/EconomyManager';
import type { Wallet } from '../src/game/Economy/Wallet';
import type {
  EconomicProgressionLevel,
  PaymentChannel,
  TransactionCategory
} from '../src/game/Economy/EconomicTypes';
import type { TransactionRecord } from '../src/game/Economy/Transaction';
import type { JobManager } from '../src/game/Jobs/JobManager';
import type { HeatSystem } from '../src/game/Crime/HeatSystem';
import type { NeedsSystem } from '../src/game/Needs/NeedsSystem';
import type { HomeSystem } from '../src/game/Home/HomeSystem';
import type { LocationChatManager } from '../src/game/Multiplayer/LocationChatManager';

// ------------------------------------------------------------------ envelope

export type SkillName = 'movement' | 'dialogue' | 'economy';

export interface AgentCallContext {
  sessionId: string;
  playerUid: string | null; // null → anonymous guest (chat sends blocked)
  issuedAtMs: number;
}

export interface SkillRequest<P = Record<string, unknown>> {
  v: 1;
  requestId: string;
  skill: SkillName;
  op: string;
  params: P;
  context: AgentCallContext;
}

export type ErrorCode =
  | 'E_BAD_ENVELOPE' | 'E_INVALID_PARAM' | 'E_UNKNOWN_ID'
  | 'E_NOT_AT_LOCATION' | 'E_COOLDOWN' | 'E_RATE_LIMITED'
  | 'E_INSUFFICIENT_FUNDS' | 'E_REQUIREMENTS_UNMET' | 'E_BUSY'
  | 'E_GUEST_READONLY' | 'E_ARRESTED' | 'E_WORLD_BOUNDS'
  | 'E_STORE_FULL' | 'E_INTERNAL';

export interface SkillError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface SkillResponse<R> {
  v: 1;
  requestId: string;
  ok: boolean;
  result: R | null;
  error: SkillError | null;
}

// ------------------------------------------------------------------ movement

export type MoveMode = 'walk' | 'sprint';

export interface MoveResult {
  arrived: boolean;
  finalPosition: { x: number; y: number; z: number };
  locationId: LocationId;
  etaSeconds: number;
  blockedBy?: string;
}

export interface MovementSkill {
  getState(): Promise<MovementState>;
  /** target: world point OR interactable id; resolves when inside arriveRadius. */
  moveTo(params: {
    target: { x: number; z: number } | { interactableId: string };
    mode?: MoveMode;
    arriveRadius?: number;
  }): Promise<MoveResult>;
  approachInteractable(params: {
    interactableId: string;
    mode?: MoveMode;
  }): Promise<MoveResult & { promptLabel: string }>;
  setSprint(active: boolean): Promise<void>;
  stop(): Promise<void>;
  /** Trotro trip; fare (EXP_TROTRO_FARE ₵6) charged through EconomySkill. */
  travel(params: {
    destination: Extract<LocationId, 'makola_market' | 'labadi_beach'>;
    payFare?: boolean;
  }): Promise<{
    traveled: boolean;
    chargedGHS: number;
    originLocationId: LocationId;
    destinationLocationId: LocationId;
    note: string;
  }>;
}

export interface MovementState {
  position: { x: number; y: number; z: number };
  rotationY: number;
  isMoving: boolean;
  isSprinting: boolean;
  locationId: LocationId;
  locationName: string;
  insideInteractRadiusOf: string | null;
}

// ------------------------------------------------------------------ dialogue

export interface InteractableCard {
  id: string;
  title: string;
  promptLabel: string;
  interactionResponse: string;
  distanceM: number;
  withinRadius: boolean;
}

export interface DialogueSkill {
  listInteractables(params: { nearOnly?: boolean }): Promise<InteractableCard[]>;
  getActiveTarget(): Promise<InteractableCard | null>;
  interact(params: { interactableId?: string }): Promise<{
    handled: boolean;
    targetId: string | null;
    promptLabel: string | null;
    responseLine: string | null;
    cooldownRemainingMs: number;
  }>;
  npcProfile(params: {
    npcId: 'npc_male_001' | 'npc_female_001' | 'npc_older_001';
  }): Promise<{ npcId: string; name: string; promptLabel: string; voice: string; hustleHook: string | null }>;
  chatRead(params: { limit?: number }): Promise<ChatMessageView[]>;
  chatSend(params: { text: string }): Promise<{ delivered: boolean; locationId: LocationId }>;
  chatSwitchLocation(params: { locationId: LocationId }): Promise<{ switched: boolean }>;
  setObjectiveMarker(params: { targetId: string | null; isRisky?: boolean }): Promise<void>;
}

export interface ChatMessageView {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAtMs: number | null;
  isMine: boolean;
}

// ------------------------------------------------------------------ economy

export interface EconomySkill {
  getWallet(): Promise<{
    cashGHS: number; momoGHS: number; bankGHS: number;
    unsecuredIllegalCashGHS: number;
    lifetimeEarnedGHS: number; lifetimeSpentGHS: number;
    progression: {
      level: EconomicProgressionLevel;
      title: string;
      nextThresholdGHS: number | null;
    };
  }>;
  getTransactions(params: { limit?: number }): Promise<TransactionRecord[]>;
  canAfford(params: { amountGHS: number; channel?: PaymentChannel }): Promise<{ affordable: boolean }>;
  awardIncome(params: {
    amountGHS: number;
    category: TransactionCategory;
    description: string;
    channel?: PaymentChannel;
    isIllegalOrigin?: boolean;
  }): Promise<TransactionRecord | null>;
  purchaseExpense(params: { expenseId: string }): Promise<{
    success: boolean;
    message: string;
    transaction: TransactionRecord | null;
  }>;
  recoveryAction(params: { recoveryActionId: string }): Promise<{
    success: boolean;
    feedbackText: string;
    applied: Pick<PlaceRecoveryAction, 'energyRestore' | 'hungerRestore' | 'heatReduction'>;
  }>;
  listWork(): Promise<WorkOffer[]>;
  acceptWork(params: { workId: string }): Promise<{ success: boolean; workId?: string; message: string }>;
  advanceWork(params: { interactableId: string; assetId?: string }): Promise<{
    handled: boolean;
    completedWork: boolean;
    earnedGHS: number;
    message: string;
  }>;
  cancelWork(): Promise<{ cancelledId: string | null }>;
  startIllegal(params: { hustleId: string }): Promise<{ success: boolean; message: string }>;
  getHeat(): Promise<{
    heatLevel: number;
    policeStatus: string;
    wantedStars: 0 | 1 | 2 | 3;
    arrestCount: number;
    activeIllegalHustle: unknown | null;
  }>;
  needsState(): Promise<{ hunger: number; energy: number; canWork: { ok: boolean; reason?: string } }>;
  needsAction(params: {
    action: 'eat' | 'sleep' | 'rest' | 'boost';
    label?: string;
  }): Promise<{ success: boolean; message: string }>;
  housingOverview(): Promise<{
    tierId: string; tierTitle: string; ownedSlots: number; maxSlots: number;
    comfortScore: number; jobPayoutBonusPct: number;
  }>;
  housingBuy(params: { furnitureId: string }): Promise<{
    success: boolean; message: string; purchasePriceGHS: number; comfortScore: number;
  }>;
  housingSell(params: { instanceId: string }): Promise<{ success: boolean; message: string; refundedGHS: number }>;
  housingUpgrade(params: { tierId: string }): Promise<{
    success: boolean; message: string;
    tier: { id: string; title: string; costGHS: number; maxFurnitureSlots: number;
            sleepEnergyRestore: number; jobPayoutBonusPct: number };
  }>;
}

export interface WorkOffer {
  workId: string;
  kind: 'legal_job' | 'side_hustle' | 'illegal';
  title: string;
  payGHS: number;
  capitalGHS?: number;
  cooldownSeconds?: number;
  requirements?: { minEnergy: number; minHunger?: number; traits?: string[] };
  riskLabel?: string;
  steps: {
    stepId: string;
    stepTitle: string;
    targetInteractableId: string;
    actionVerb: string;
  }[];
}

// ------------------------------------------------------------------ bindings

/**
 * Live game systems the host must hand over. Everything is already
 * constructed during normal boot in `src/main.ts` — no new wiring needed
 * inside those files; the host router merely holds references.
 */
export interface GameBindings {
  player: PlayerController;
  input: InputManager;
  interactions: InteractionSystem;
  /** Resolves world points → LocationDef ( getLocationAt ). */
  locationAt(x: number, z: number): LocationDef;
  economy: EconomyManager;
  wallet: Wallet;
  jobs: JobManager;
  heat: HeatSystem;
  needs: NeedsSystem;
  home: HomeSystem;
  /** Null for fully-offline guests — chat ops degrade to read-only errors. */
  chat: LocationChatManager | null;
  /** Emits a HUD toast line (interactionResponse / feedbackText surfacing). */
  toast(text: string): void;
  /** Interactable registry passthrough for approach/list ops. */
  getTargets(): ReadonlyArray<InteractableTarget>;
  /** Convenience expense catalog passthrough. */
  expenses: Readonly<Record<string, EverydayExpenseOption>>;
}

/** Host factory: returns the three independently callable skills. */
export declare function createSkills(bindings: GameBindings): {
  movement: MovementSkill;
  dialogue: DialogueSkill;
  economy: EconomySkill;
};
