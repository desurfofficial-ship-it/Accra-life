/**
 * LivingPlayerAvatar.tsx — real rigged character model for the player.
 *
 * Replaces the procedural capsule+sphere avatar in StreetCanvas.tsx with
 * the "Sunset Walking Low Poly Girl [Rigged]" Sketchfab model (CC-BY-4.0,
 * by micaelsampaio). The model ships with a built-in walk animation clip
 * that this component plays on a loop via AnimationMixer.
 *
 * Animation gating (the requested "Continue" slice):
 *   - The parent (PlayerAvatar in StreetCanvas.tsx) tracks whether the
 *     player is currently moving (dx/dz ≠ 0). It writes the boolean to
 *     a ref (`isMovingRef`) on every frame.
 *   - This component reads isMovingRef.current in useFrame: when true,
 *     the walk animation action is resumed (action.paused = false);
 *     when false (player idle), the action is paused so the avatar
 *     stands still instead of moon-walking in place.
 *
 * Asset credit (CC-BY-4.0 requires attribution):
 *   "Sunset Walking Low Poly Girl [Rigged]" by micaelsampaio
 *   https://sketchfab.com/3d-models/sunset-walking-low-poly-girl-rigged-341f934134d041c581b590cedff26d88
 *   License: CC-BY-4.0 (metadata.json + license.txt ship alongside the .glb)
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

export interface LivingPlayerAvatarProps {
  /**
   * Parent's ref tracking whether the player is currently moving.
   * When `current` is true, the walk animation plays; when false, the
   * action is paused (avatar stands still).
   */
  isMovingRef: MutableRefObject<boolean>;
  /**
   * Optional parent group ref — if provided, this component attaches the
   * avatar mesh as a child so the parent can still own the player's
   * world position + rotation. If omitted, this component renders its
   * own group at the origin (caller's responsibility to wrap).
   */
  parentGroupRef?: RefObject<THREE.Group | null>;
}

export function LivingPlayerAvatar({ isMovingRef, parentGroupRef }: LivingPlayerAvatarProps) {
  // useGLTF caches by URL — multiple instances share the same loaded gltf.
  const gltf = useGLTF(AVATAR_URL);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  // Clone the scene + apply shadow + scale.
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

  // Set up the AnimationMixer + play the first animation clip on a loop.
  useEffect(() => {
    if (!gltf.animations || gltf.animations.length === 0) {
      // No animation clips in the GLB — nothing to play.
      return;
    }
    const mixer = new THREE.AnimationMixer(cloned);
    const clip = gltf.animations[0];
    const action = mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    // Start paused — the avatar should stand still until the player moves.
    action.paused = true;
    mixerRef.current = mixer;
    actionRef.current = action;

    return () => {
      // Cleanup on unmount: stop the action + dispose the mixer.
      action.stop();
      mixer.stopAllAction();
      mixer.uncacheAction(clip);
    };
  }, [gltf, cloned]);

  // Tick the mixer every frame + sync the action's `paused` flag to the
  // parent's isMovingRef.current. This is the animation-gating logic:
  //   - When the player moves (WASD or joystick) → isMovingRef.current=true
  //     → action.paused=false → walk animation plays
  //   - When the player stops → isMovingRef.current=false → action.paused=true
  //     → animation freezes mid-stride (avatar stands still)
  useFrame((_state, delta) => {
    const mixer = mixerRef.current;
    const action = actionRef.current;
    if (!mixer || !action) return;
    action.paused = !isMovingRef.current;
    mixer.update(delta);
  });

  // Attach the avatar to the parent group if provided (preferred — keeps
  // the parent as the player's world-position owner); otherwise render
  // our own group at the origin.
  if (parentGroupRef) {
    return <primitive object={cloned} ref={parentGroupRef} />;
  }
  return <primitive object={cloned} />;
}
