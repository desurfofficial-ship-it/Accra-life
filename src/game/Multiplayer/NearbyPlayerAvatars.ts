/**
 * Accra Life — NearbyPlayerAvatars
 *
 * Renders a 3D character rig per signed-in nearby player, so multiplayer
 * presence becomes visible — you see other Accraians walking around your
 * neighborhood in real time, not just their names in a chat panel.
 *
 * Reuses `buildStylizedGhanaianCharacter` (the same builder the local player
 * and NPCs use) so nearby avatars are visually consistent with the rest of
 * the world.
 *
 * Movement model:
 * - Presence heartbeats fire every ~20s, so the (posX, posZ, rotY) we get
 *   from each NearbyPlayer doc is at best a 20s-stale snapshot.
 * - To avoid jarring "snap-teleport" every 20s, we lerp each avatar's
 *   current position toward the latest target every frame (factor 0.06,
 *   ~16 frames to half-converge). When the avatar is close enough to its
 *   target (< 0.05m), we treat it as "idle" and stop the walking anim.
 * - Y is always re-derived from `getSurfaceHeightAt(x, z)` so avatars
 *   naturally step onto sidewalks, crossover slabs, the road, etc.
 *   without sinking or hovering — same logic as the local player.
 *
 * Lifecycle:
 * - `syncFromNearby(players)` diffs against the tracked set: spawns new
 *   rigs for uids we don't have, despawns rigs for uids that left.
 * - `update(dt)` runs every frame, lerping + animating.
 * - `dispose()` tears everything down for clean session end.
 */

import * as THREE from 'three';
import {
  buildStylizedGhanaianCharacter,
  CharacterRig,
  type PlayerLookOptions,
  type PlayerSkinPreset,
  type PlayerHairPreset
} from '../Art/CharacterBuilder';
import { getSurfaceHeightAt } from '../World/WorldSurface';
import type { NearbyPlayer, PresenceLook } from './types';

const SKIN_PRESETS: readonly PlayerSkinPreset[] = ['deep', 'rich', 'warm', 'light'];
const HAIR_PRESETS: readonly PlayerHairPreset[] = ['fade', 'twists', 'bun', 'short'];

/** Lerp factor per frame at ~60fps. Higher = snappier but more jittery. */
const LERP_FACTOR = 0.06;
/** Distance (m) below which we consider the avatar "arrived" and idle the walk anim. */
const IDLE_THRESHOLD = 0.05;
/** Distance (m) above which we consider the avatar "in motion". */
const MOVE_THRESHOLD = 0.12;

interface AvatarEntry {
  uid: string;
  rig: CharacterRig;
  /** Live in-world coords, lerped toward target every frame. */
  currentX: number;
  currentZ: number;
  currentRotY: number;
  /** Latest target from a presence heartbeat. */
  targetX: number;
  targetZ: number;
  targetRotY: number;
  /** True if we've ever received a non-default position for this avatar. */
  hasPosition: boolean;
  /** Last animation tick (ms) — used to compute dt for updateAnimation. */
  lastAnimMs: number;
}

export class NearbyPlayerAvatars {
  private readonly scene: THREE.Scene;
  private readonly entries = new Map<string, AvatarEntry>();
  private spawnCounter = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Diff the current tracked set against a fresh nearby-players snapshot.
   * Spawns rigs for new uids, despawns rigs for uids that left, and
   * updates targets for uids that remained.
   */
  public syncFromNearby(players: NearbyPlayer[]): void {
    const freshUids = new Set(players.map((p) => p.uid));

    // 1. Despawn rigs whose uid is no longer nearby.
    for (const [uid, entry] of this.entries) {
      if (!freshUids.has(uid)) {
        this.scene.remove(entry.rig.root);
        // Best-effort dispose — CharacterRig.root is a Group of Meshes;
        // disposing the root's children traverses the tree.
        entry.rig.root.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose?.();
            const mat = mesh.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
            else mat?.dispose?.();
          }
        });
        this.entries.delete(uid);
      }
    }

    // 2. Spawn or update for each fresh player.
    for (const p of players) {
      const existing = this.entries.get(p.uid);
      if (existing) {
        // Update target only if the heartbeat actually moved them.
        if (typeof p.posX === 'number' && typeof p.posZ === 'number') {
          existing.targetX = p.posX;
          existing.targetZ = p.posZ;
          existing.hasPosition = true;
        }
        if (typeof p.rotY === 'number') {
          existing.targetRotY = p.rotY;
        }
        continue;
      }

      // New uid — spawn a rig.
      const look = coerceLook(p.look);
      const assetId = `REMOTE_${this.spawnCounter++}` as unknown as Parameters<typeof buildStylizedGhanaianCharacter>[0];
      const rig = buildStylizedGhanaianCharacter(assetId, look);
      const startX = typeof p.posX === 'number' ? p.posX : 0;
      const startZ = typeof p.posZ === 'number' ? p.posZ : 0;
      const startY = getSurfaceHeightAt(startX, startZ);
      const startRotY = typeof p.rotY === 'number' ? p.rotY : Math.PI;
      rig.root.position.set(startX, startY, startZ);
      rig.root.rotation.y = startRotY;
      this.scene.add(rig.root);
      this.entries.set(p.uid, {
        uid: p.uid,
        rig,
        currentX: startX,
        currentZ: startZ,
        currentRotY: startRotY,
        targetX: startX,
        targetZ: startZ,
        targetRotY: startRotY,
        hasPosition: typeof p.posX === 'number' && typeof p.posZ === 'number',
        lastAnimMs: performance.now()
      });
    }
  }

  /**
   * Per-frame update. Call this from the game loop's RAF tick.
   * Lerps each avatar toward its target + drives the walk animation.
   */
  public update(_dt: number): void {
    const now = performance.now();
    for (const entry of this.entries.values()) {
      if (!entry.hasPosition) continue;

      // Lerp position toward target.
      const dx = entry.targetX - entry.currentX;
      const dz = entry.targetZ - entry.currentZ;
      const dist = Math.hypot(dx, dz);
      const isMoving = dist > MOVE_THRESHOLD;

      if (dist > IDLE_THRESHOLD) {
        entry.currentX += dx * LERP_FACTOR;
        entry.currentZ += dz * LERP_FACTOR;
      }
      const y = getSurfaceHeightAt(entry.currentX, entry.currentZ);
      entry.rig.root.position.set(entry.currentX, y, entry.currentZ);

      // Lerp rotation toward target (shortest angular path).
      if (isMoving) {
        const targetRot = Math.atan2(dx, dz);
        entry.currentRotY = lerpAngleShortest(entry.currentRotY, targetRot, LERP_FACTOR);
        entry.rig.root.rotation.y = entry.currentRotY;
      }

      // Drive the walk anim. dt in seconds.
      const animDt = Math.min(0.1, (now - entry.lastAnimMs) / 1000);
      entry.lastAnimMs = now;
      entry.rig.updateAnimation(animDt, isMoving, false);
    }
  }

  /** Tear down: remove all rigs from the scene + dispose their resources. */
  public dispose(): void {
    for (const entry of this.entries.values()) {
      this.scene.remove(entry.rig.root);
      entry.rig.root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose?.();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.());
          else mat?.dispose?.();
        }
      });
    }
    this.entries.clear();
  }

  /** For HUD/debug: how many avatars are currently being rendered. */
  public get count(): number {
    return this.entries.size;
  }
}

/**
 * Coerce a PresenceLook (untyped strings from Firestore) into a
 * PlayerLookOptions (typed presets). Returns `{}` if look is missing or
 * the values aren't recognized presets — `buildStylizedGhanaianCharacter`
 * handles `{}` by falling back to the default 'PLAYER_GHA_001' archetype.
 */
function coerceLook(look?: PresenceLook): PlayerLookOptions {
  if (!look) return {};
  const out: PlayerLookOptions = {};
  const skin = look.skin as string | undefined;
  const hair = look.hair as string | undefined;
  if (skin && (SKIN_PRESETS as readonly string[]).includes(skin)) {
    out.skin = skin as PlayerSkinPreset;
  }
  if (hair && (HAIR_PRESETS as readonly string[]).includes(hair)) {
    out.hair = hair as PlayerHairPreset;
  }
  return out;
}

/**
 * Lerp `from` toward `to` along the shortest angular path (radians).
 * Handles the wrap-around at ±π.
 */
function lerpAngleShortest(from: number, to: number, t: number): number {
  let diff = to - from;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return from + diff * t;
}
