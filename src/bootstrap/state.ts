/**
 * Shared mutable game context — the single source of truth for cross-module
 * runtime state (Task 18 modular refactor of the former main.ts monolith).
 *
 * Every former module-level `let` lives on the exported `S` object so any
 * bootstrap module can read AND write it. Immutable shared handles (Maps,
 * Sets, mesh registries, compound anchors) are exported as named consts.
 */
import * as THREE from 'three';
import type { Phase1Scene } from '../game/Core/Phase1Scene';
import type { GameAPI } from '../game/GameAPI';
import type { PresenceManager } from '../game/Multiplayer/PresenceManager';
import type { LocationChatManager } from '../game/Multiplayer/LocationChatManager';
import type { FriendsSystem } from '../game/Multiplayer/FriendsSystem';
import type { NearbyPlayerAvatars } from '../game/Multiplayer/NearbyPlayerAvatars';
import type { LiveEventsSystem } from '../game/Events/LiveEventsSystem';
import type { HomeFurnitureVisuals } from '../game/Home/HomeFurnitureVisuals';
import type { PlacementEngine } from '../game/Housing/PlacementEngine';
import type { LocationId } from '../game/World/Locations';
import type { HousingTierId } from '../game/Home/HomeSystem';
import type { TraitId } from '../onboarding';
import { loadSavedProfile } from '../onboarding';
import { HOME_COMPOUND_ANCHOR } from '../game/World/GridMap';

export type ModalTabId = 'jobs' | 'hustles' | 'spend' | 'wallet';

/**
 * Active home visit session. While set, the world compound shows the
 * HOST's tier + furniture; the local player's HomeSystem state is NEVER
 * mutated (their own save is safe) and all home-editing entry points are
 * blocked until leaveVisitMode() restores the player's own compound.
 */
export interface VisitSession {
  hostUid: string;
  hostName: string;
  savedTier: HousingTierId;
  hostTier: HousingTierId;
}

/** Shared mutable runtime state. Field docs live with their owning systems. */
export const S = {
  toastTimeout: null as ReturnType<typeof setTimeout> | null,
  deltaTimeout: null as ReturnType<typeof setTimeout> | null,
  sprintToggled: false,
  currentModalTab: 'jobs' as ModalTabId,
  currentFocusedInteractableId: null as string | null,
  phase1SceneRef: null as Phase1Scene | null,
  /** Live GameAPI bridge (AI-agent skill layer routing, skills/tro-tro-system.md). */
  gameAPI: null as GameAPI | null,
  presenceManager: null as PresenceManager | null,
  chatManager: null as LocationChatManager | null,
  chatSheetOpen: false,
  chatUnreadCount: 0,
  chatLastSeenAtMs: 0,
  isAccountMode: false,
  currentLocationId: 'adabraka_neighborhood' as LocationId,
  recoveryRenderedLocId: null as LocationId | null,
  friendsSystem: null as FriendsSystem | null,
  friendsSheetOpen: false,
  visitSession: null as VisitSession | null,
  homeVisuals: null as HomeFurnitureVisuals | null,
  // ---- Live events + 3D nearby avatars ----
  nearbyAvatars: null as NearbyPlayerAvatars | null,
  liveEvents: null as LiveEventsSystem | null,
  lastLiveEventId: null as string | null,
  lastLiveEventShownSeconds: -1,
  // Debounce handle for the housing → Firestore cloud sync.
  housingCloudSyncTimer: null as ReturnType<typeof setTimeout> | null,
  playerDisplayName: 'Chale',
  playerTrait: (loadSavedProfile()?.trait as TraitId) || 'hustler',
  lastCooldownUiTickMs: 0,
  placementEngine: null as PlacementEngine | null,
  currentStoreCategory: 'all',
};

// ---- Place-tied recovery actions (per-location food/rest chip) ----
// actionId → epoch ms when the action becomes usable again.
export const recoveryCooldownUntil = new Map<string, number>();

// ---- Friends + home visiting module refs ----
/** Placed-furniture 3D meshes visible during a friend-home visit. */
export const visitFurnitureMeshes: THREE.Object3D[] = [];
/** Host uids we already sent a visit ping to this session (courtesy dedupe). */
export const visitPingSentFor = new Set<string>();

// ── Housing: 3D mesh registry ────────────────────────────────────────────
/** instanceId → live mesh. Lets us add/remove meshes the moment furniture
 * is placed or sold, instead of waiting for the next game reload. */
export const placedFurnitureMeshes = new Map<string, THREE.Group>();

/** Shared room origin (compound interior floor center, per PlayerCompound).
 * Derived from GridMap.HOME_COMPOUND_ANCHOR (mixed cell [row 2, col 0],
 * world [-32, 0]); the interior floor sits 1.1 m south of the anchor. */
export const ROOM_ORIGIN = new THREE.Vector3(
  HOME_COMPOUND_ANCHOR.world[0],
  0.24,
  HOME_COMPOUND_ANCHOR.world[1] - 1.1
);

/** Compound gate spawn — just outside the front-wall gate gap (systems
 * colliders span COMPOUND_Z - 4.28..-3.62; spawn 0.9 m clear of the wall).
 * Derived from the same GridMap anchor so arrest respawn + home-visit
 * enter/leave all stay on the compound's real cell. Spawn faces the
 * courtyard (rotationY 0 = +z). */
export const COMPOUND_GATE_SPAWN = {
  x: HOME_COMPOUND_ANCHOR.world[0],
  y: 0.08,
  z: HOME_COMPOUND_ANCHOR.world[1] - 5.2
};
