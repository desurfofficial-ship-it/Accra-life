/**
 * FollowCamera.tsx — camera that follows the player avatar with smooth lerp.
 *
 * Keeps the player centred on screen while walking. Respects OrbitControls
 * yaw (one-finger drag / pinch-zoom still work) by offsetting the follow
 * position by the current orbit azimuth angle.
 *
 * Movement is camera-relative: the PlayerAvatar reads
 * `window.__r3fCameraYaw` (set here each frame) and rotates the joystick
 * vector so "up" = "away from the camera on screen".
 *
 * The "Reset Camera" button calls `window.__r3fResetCamera()` which snaps
 * the yaw back to 0, zoom to 12, and target to the player.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

export interface FollowCameraProps {
  targetRef: RefObject<THREE.Group | null>;
  /** Initial isometric offset from the target (before zoom scaling). */
  offset?: [number, number, number];
  /** Lerp speed — higher = snappier. Default 6 (frame-rate-independent). */
  lerpSpeed?: number;
  /** Default zoom for the "Reset Camera" button. Default 12. */
  defaultZoom?: number;
}

export function FollowCamera({
  targetRef,
  offset = [0, 40, 40],
  lerpSpeed = 6,
  defaultZoom = 12,
}: FollowCameraProps) {
  const { camera, controls } = useThree();
  const controlsRef = controls as unknown as {
    getAzimuthalAngle(): number;
    setAzimuthalAngle(a: number): void;
    target: THREE.Vector3;
    update(): void;
    enabled: boolean;
  } | null;
  const firstFrameRef = useRef(true);
  const yawRef = useRef(0);

  // Reuse vectors — no per-frame allocation
  const desiredTarget = useRef(new THREE.Vector3());
  const desiredPos = useRef(new THREE.Vector3());
  const offsetVec = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const player = targetRef.current;
    if (!player) return;

    desiredTarget.current.set(player.position.x, player.position.y + 1, player.position.z);

    const yaw = controlsRef?.getAzimuthalAngle?.() ?? 0;
    yawRef.current = yaw;
    (window as unknown as { __r3fCameraYaw: number }).__r3fCameraYaw = yaw;

    offsetVec.current.set(offset[0], offset[1], offset[2]);
    offsetVec.current.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    desiredPos.current.copy(desiredTarget.current).add(offsetVec.current);

    const k = 1 - Math.exp(-lerpSpeed * delta);
    if (firstFrameRef.current) {
      camera.position.copy(desiredPos.current);
      if (controlsRef) {
        controlsRef.target.copy(desiredTarget.current);
        controlsRef.update();
      }
      firstFrameRef.current = false;
    } else {
      camera.position.lerp(desiredPos.current, k);
      if (controlsRef) {
        controlsRef.target.lerp(desiredTarget.current, k);
        controlsRef.update();
      }
    }
  });

  useEffect(() => {
    (window as unknown as { __r3fCamera?: THREE.Camera }).__r3fCamera = camera;
    if (controlsRef) {
      (window as unknown as { __r3fControls?: unknown }).__r3fControls = controlsRef;
    }

    (window as unknown as { __r3fResetCamera?: () => void }).__r3fResetCamera = () => {
      const player = targetRef.current;
      if (!player || !controlsRef) return;
      controlsRef.setAzimuthalAngle(0);
      (camera as THREE.OrthographicCamera).zoom = defaultZoom;
      (camera as THREE.OrthographicCamera).updateProjectionMatrix();
      controlsRef.target.set(player.position.x, player.position.y + 1, player.position.z);
      firstFrameRef.current = true;
    };

    const joystickZone = document.getElementById('joystickZone');
    const handleJoystickStart = () => {
      if (controlsRef) controlsRef.enabled = false;
    };
    const handleJoystickEnd = () => {
      if (controlsRef) controlsRef.enabled = true;
    };
    // window-level pointerup/cancel — do NOT use pointerleave (re-enables mid-drag)
    joystickZone?.addEventListener('pointerdown', handleJoystickStart);
    window.addEventListener('pointerup', handleJoystickEnd);
    window.addEventListener('pointercancel', handleJoystickEnd);

    return () => {
      delete (window as unknown as { __r3fCamera?: THREE.Camera }).__r3fCamera;
      delete (window as unknown as { __r3fControls?: unknown }).__r3fControls;
      delete (window as unknown as { __r3fResetCamera?: () => void }).__r3fResetCamera;
      joystickZone?.removeEventListener('pointerdown', handleJoystickStart);
      window.removeEventListener('pointerup', handleJoystickEnd);
      window.removeEventListener('pointercancel', handleJoystickEnd);
    };
  }, [camera, controlsRef, targetRef, defaultZoom]);

  return null;
}
