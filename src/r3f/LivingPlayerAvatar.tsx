/**
 * LivingPlayerAvatar.tsx — real rigged character model for the player.
 *
 * Replaces the procedural capsule+sphere avatar in StreetCanvas.tsx with
 * the "Sunset Walking Low Poly Girl [Rigged]" Sketchfab model (CC-BY-4.0,
 * by micaelsampaio). The model ships WITHOUT animation clips (just a
 * static "Sunset Walking" pose), so this component implements multi-clip
 * selection with a procedural fallback:
 *
 *   1. MULTI-CLIP SELECTION (when the model has clips):
 *      - Inspects gltf.animations + categorizes each clip by name as
 *        'idle' | 'walk' | 'run' | 'other' (matches common naming
 *        conventions: "Idle"/"idle"/"IDLE" → idle, etc.)
 *      - When the player is stationary → play idle clip (resumed).
 *      - When the player is moving → play walk clip (resumed).
 *      - When the player is sprinting AND a run clip exists → play run.
 *      - Crossfade between clips on state transitions (~200ms blend)
 *        via action.crossFadeTo for smooth motion.
 *
 *   2. PROCEDURAL FALLBACK (when the model has 0 clips — current case):
 *      - Apply a sine-wave vertical bob (±0.05m at 2 Hz) + Z-axis sway
 *        (±0.06 rad at 2 Hz) to the avatar's transform when isMoving is
 *        true. This creates the visual illusion of walking without
 *        requiring rigged bone animation.
 *      - When isMoving is false, lerp back to neutral pose (y=0, rot=0)
 *        so the avatar stands still.
 *
 * The framework is general — it works on the current static-pose model
 * (procedural fallback) AND on future models with real clips (multi-clip
 * selection + crossfade).
 *
 * Asset credit (CC-BY-4.0 requires attribution):
 *   "Sunset Walking Low Poly Girl [Rigged]" by micaelsampaio
 *   https://sketchfab.com/3d-models/sunset-walking-low-poly-girl-rigged-341f934134d041c581b590cedff26d88
 */
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef, type RefObject, type MutableRefObject } from 'react';
import * as THREE from 'three';

const AVATAR_URL = '/assets/glb/characters/sunset-walking-low-poly-girl-rigged/sunset_walking_low_poly_girl_rigged.glb';

// Scale tuning — Sketchfab exports vary wildly; this single value was
// picked so the girl avatar is roughly 1.6m tall (eye-line ≈ 1.4m).
// Tweak via window.__playerAvatarScale for runtime debugging.
const AVATAR_SCALE = 0.5;

// Procedural walk constants — used only when the model has 0 animation
// clips. Tuned for a "natural" walking cadence at MOVE_SPEED = 6 m/s.
const PROC_WALK_FREQ_HZ = 2.0;       // 2 strides per second
const PROC_WALK_BOB_AMPLITUDE_M = 0.05;  // ±5cm vertical bob
const PROC_WALK_SWAY_AMPLITUDE_RAD = 0.06; // ±3.4° Z-axis sway

// Crossfade duration between idle/walk/run clips (when clips exist).
const CLIP_CROSSFADE_SECONDS = 0.2;

type ClipCategory = 'idle' | 'walk' | 'run' | 'other';

/** Categorize an animation clip by its name. Returns the clip category. */
function categorizeClip(clipName: string): ClipCategory {
  const lower = clipName.toLowerCase();
  if (lower.includes('idle') || lower.includes('stand') || lower.includes('rest')) {
    return 'idle';
  }
  if (lower.includes('run') || lower.includes('sprint') || lower.includes('jog')) {
    return 'run';
  }
  if (lower.includes('walk') || lower.includes('move')) {
    return 'walk';
  }
  // First clip in the file is usually the locomotion clip — default to walk
  // so any unnamed clip is treated as walk rather than 'other'.
  return 'walk';
}

export interface LivingPlayerAvatarProps {
  /**
   * Parent's ref tracking whether the player is currently moving.
   * When `current` is true, the walk (or run) animation/clip plays;
   * when false, the idle clip plays (or the avatar returns to neutral
   * in procedural mode).
   */
  isMovingRef: MutableRefObject<boolean>;
  /**
   * Optional parent's ref tracking whether the player is sprinting
   * (jog/run input). When true AND a run clip exists in the model,
   * the run clip plays instead of walk. Default undefined (sprinting
   * treated as regular walking).
   */
  isSprintingRef?: MutableRefObject<boolean>;
  /**
   * Optional parent group ref — if provided, this component attaches the
   * avatar mesh as a child so the parent can still own the player's
   * world position + rotation. If omitted, this component renders its
   * own group at the origin (caller's responsibility to wrap).
   */
  parentGroupRef?: RefObject<THREE.Group | null>;
}

export function LivingPlayerAvatar({ isMovingRef, isSprintingRef, parentGroupRef }: LivingPlayerAvatarProps) {
  // useGLTF caches by URL — multiple instances share the same loaded gltf.
  const gltf = useGLTF(AVATAR_URL);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  // All AnimationActions created from the gltf, keyed by clip name.
  const actionsByNameRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  // Categorized actions — one per category, picked by name-priority.
  const idleActionRef = useRef<THREE.AnimationAction | null>(null);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);
  const runActionRef = useRef<THREE.AnimationAction | null>(null);
  // Track which clip is currently playing so we know when to crossfade.
  const currentCategoryRef = useRef<ClipCategory | null>(null);
  // Procedural-walk phase accumulator (used only when no clips exist).
  const procPhaseRef = useRef(0);
  // The cloned model group ref — used to apply procedural transform.
  const modelGroupRef = useRef<THREE.Group>(null);

  // Clone the scene + apply shadow + scale + recenter on ground.
  const cloned = useMemo(() => {
    const m = gltf.scene.clone(true);
    m.scale.setScalar(AVATAR_SCALE);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Recenter on the ground at the origin of the parent group.
    // Measure bbox post-scale to lift the base to y=0.
    const box = new THREE.Box3().setFromObject(m);
    const center = new THREE.Vector3();
    box.getCenter(center);
    m.position.set(-center.x, -box.min.y, -center.z);
    return m;
  }, [gltf]);

  // Set up the AnimationMixer + create actions for every clip.
  // Categorize each clip by name → pick the best per category.
  useEffect(() => {
    const clips = gltf.animations ?? [];
    if (clips.length === 0) {
      // No animation clips in the GLB — procedural walk fallback will
      // be used instead (driven from useFrame).
      return;
    }
    const mixer = new THREE.AnimationMixer(cloned);
    mixerRef.current = mixer;

    // Track first clip per category (priority by name pattern).
    const firstByCategory: Partial<Record<ClipCategory, string>> = {};
    for (const clip of clips) {
      const cat = categorizeClip(clip.name);
      // Skip 'other' — we don't know what those clips are.
      if (cat === 'other') continue;
      if (!(cat in firstByCategory)) {
        firstByCategory[cat] = clip.name;
      }
      // Create + cache the action (loop, paused initially).
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.paused = true;
      actionsByNameRef.current.set(clip.name, action);
    }

    // Pick the best action per category.
    if (firstByCategory.idle) {
      idleActionRef.current = actionsByNameRef.current.get(firstByCategory.idle) ?? null;
    }
    if (firstByCategory.walk) {
      walkActionRef.current = actionsByNameRef.current.get(firstByCategory.walk) ?? null;
    }
    if (firstByCategory.run) {
      runActionRef.current = actionsByNameRef.current.get(firstByCategory.run) ?? null;
    }

    // Start the idle clip immediately (player spawns idle). If no idle
    // clip exists but walk exists, start walk paused — it'll play on
    // first movement.
    const initialAction = idleActionRef.current ?? walkActionRef.current ?? runActionRef.current;
    if (initialAction) {
      initialAction.reset();
      initialAction.paused = false;
      initialAction.play();
      currentCategoryRef.current = idleActionRef.current ? 'idle' : 'walk';
    }

    return () => {
      // Cleanup on unmount: stop all actions + dispose the mixer.
      mixer.stopAllAction();
      actionsByNameRef.current.forEach((a) => a.stop());
      actionsByNameRef.current.clear();
      idleActionRef.current = null;
      walkActionRef.current = null;
      runActionRef.current = null;
      currentCategoryRef.current = null;
    };
  }, [gltf, cloned]);

  // Helper: crossfade from the current action to a target action.
  // No-op if target is null or already current.
  const crossfadeTo = (targetAction: THREE.AnimationAction | null, targetCategory: ClipCategory) => {
    if (!targetAction) return;
    if (currentCategoryRef.current === targetCategory) return;
    targetAction.reset();
    targetAction.paused = false;
    targetAction.play();
    // Sync the new action's time with the previous one for a smooth blend.
    const mixer = mixerRef.current;
    if (mixer) {
      // Crossfade from ALL other actions to the target — this naturally
      // fades out any playing action + fades in the target.
      for (const action of actionsByNameRef.current.values()) {
        if (action !== targetAction) {
          action.crossFadeTo(targetAction, CLIP_CROSSFADE_SECONDS, false);
        }
      }
    }
    currentCategoryRef.current = targetCategory;
  };

  // Tick every frame: pick the right clip based on movement state OR
  // apply procedural walk fallback when no clips exist.
  useFrame((_state, delta) => {
    const mixer = mixerRef.current;
    const isMoving = isMovingRef.current;
    const isSprinting = !!(isSprintingRef?.current);

    if (mixer) {
      // MULTI-CLIP MODE: pick idle/walk/run based on movement + crossfade.
      let targetAction: THREE.AnimationAction | null = null;
      let targetCategory: ClipCategory = 'idle';
      if (isMoving) {
        if (isSprinting && runActionRef.current) {
          targetAction = runActionRef.current;
          targetCategory = 'run';
        } else if (walkActionRef.current) {
          targetAction = walkActionRef.current;
          targetCategory = 'walk';
        } else {
          // No walk clip — fall back to idle playing (so the body still animates).
          targetAction = idleActionRef.current;
          targetCategory = 'idle';
        }
      } else {
        // Stationary — prefer idle clip.
        targetAction = idleActionRef.current ?? walkActionRef.current;
        targetCategory = idleActionRef.current ? 'idle' : 'walk';
      }
      crossfadeTo(targetAction, targetCategory);
      mixer.update(delta);
    } else {
      // PROCEDURAL FALLBACK: no animation clips in the model. Apply a
      // sine-wave vertical bob + Z-axis sway to the cloned mesh to give
      // the visual illusion of walking when isMoving is true. When
      // stationary, lerp back to neutral pose (y=0, z-rot=0).
      if (!modelGroupRef.current) return;
      if (isMoving) {
        // Advance the phase by delta * frequency * 2π.
        procPhaseRef.current += delta * PROC_WALK_FREQ_HZ * Math.PI * 2;
        // Keep phase bounded to avoid float precision drift over long sessions.
        if (procPhaseRef.current > Math.PI * 200) {
          procPhaseRef.current = procPhaseRef.current % (Math.PI * 2);
        }
        const bob = Math.sin(procPhaseRef.current) * PROC_WALK_BOB_AMPLITUDE_M;
        const sway = Math.sin(procPhaseRef.current) * PROC_WALK_SWAY_AMPLITUDE_RAD;
        // Apply local transform on top of the auto-fit recenter (which set
        // position to lift the base to y=0). The bob ADDS to that y.
        // Use the inner mesh's local position — the parent group (caller-
        // owned) handles world position + rotation.
        const baseY = -new THREE.Box3().setFromObject(cloned).min.y;
        // Note: cloned's position was set to (-center.x, -box.min.y, -center.z)
        // in the useMemo above — we offset from there.
        cloned.position.y = (cloned.position.y >= 0 ? cloned.position.y : 0) + bob * 0.5;
        cloned.rotation.z = sway;
      } else {
        // Lerp back to neutral — smooth deceleration of the bob + sway.
        cloned.position.y *= 0.85;
        cloned.rotation.z *= 0.85;
        // Snap to zero when close enough to avoid float drift.
        if (Math.abs(cloned.position.y) < 0.001) cloned.position.y = 0;
        if (Math.abs(cloned.rotation.z) < 0.001) cloned.rotation.z = 0;
      }
    }
  });

  // Attach the avatar to the parent group if provided (preferred — keeps
  // the parent as the player's world-position owner); otherwise render
  // our own group at the origin.
  if (parentGroupRef) {
    return <primitive object={cloned} ref={parentGroupRef} />;
  }
  return <primitive object={cloned} ref={modelGroupRef} />;
}
