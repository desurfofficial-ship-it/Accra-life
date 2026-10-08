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
  const controlsRef = controls as unknown as { getAzimuthalAngle(): number; setAzimuthalAngle(a: number): void; target: THREE.Vector3; update(): void; enabled: boolean } | null;
  const firstFrameRef = useRef(true);
  // Store the current yaw + zoom for the Reset Camera button + movement.
  const yawRef = useRef(0);

  useFrame((_, delta) => {
    const player = targetRef.current;
    if (!player) return;

    // Desired target: player world position, slightly above ground (y+1).
    const desiredTarget = new THREE.Vector3(
      player.position.x,
      player.position.y + 1,
      player.position.z,
    );

    // Get the current orbit azimuth (yaw) from controls. If no controls,
    // default to 0 (looking straight down the -Z axis).
    const yaw = controlsRef?.getAzimuthalAngle?.() ?? 0;
    yawRef.current = yaw;
    // Expose for PlayerAvatar to read (camera-relative movement).
    (window as unknown as { __r3fCameraYaw: number }).__r3fCameraYaw = yaw;

    // Rotate the offset by the orbit yaw so the follow stays behind the
    // camera's current view direction (not always looking from the south).
    const offsetVec = new THREE.Vector3(offset[0], offset[1], offset[2]);
    offsetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    // Desired camera position: target + rotated offset (scaled by 1/zoom
    // so higher zoom = closer).
    const zoom = (camera as THREE.OrthographicCamera).zoom || 10;
    const scale = 10 / zoom; // zoom 10 → scale 1; zoom 20 → scale 0.5
    const desiredPos = desiredTarget.clone().add(offsetVec.multiplyScalar(scale));

    // Frame-rate-independent lerp: k = 1 - exp(-speed * delta).
    const k = 1 - Math.exp(-lerpSpeed * delta);

    if (firstFrameRef.current) {
      // First frame: snap immediately (no lerp — avoid the camera flying
      // from [0,0,0] to the player on load).
      camera.position.copy(desiredPos);
      if (controlsRef) {
        controlsRef.target.copy(desiredTarget);
        controlsRef.update();
      }
      firstFrameRef.current = false;
    } else {
      camera.position.lerp(desiredPos, k);
      if (controlsRef) {
        controlsRef.target.lerp(desiredTarget, k);
        controlsRef.update();
      }
    }
  });

  // Expose camera + controls on window for ?debug=1 overlay.
  useEffect(() => {
    (window as unknown as { __r3fCamera?: THREE.Camera }).__r3fCamera = camera;
    if (controlsRef) {
      (window as unknown as { __r3fControls?: unknown }).__r3fControls = controlsRef;
    }

    // Reset Camera button: snaps yaw to 0, zoom to defaultZoom, target to player.
    (window as unknown as { __r3fResetCamera?: () => void }).__r3fResetCamera = () => {
      const player = targetRef.current;
      if (!player || !controlsRef) return;
      controlsRef.setAzimuthalAngle(0);
      (camera as THREE.OrthographicCamera).zoom = defaultZoom;
      (camera as THREE.OrthographicCamera).updateProjectionMatrix();
      controlsRef.target.set(player.position.x, player.position.y + 1, player.position.z);
      firstFrameRef.current = true; // snap next frame
    };

    // Joystick guard: disable OrbitControls while the joystick is active.
    // OrbitControls listens on the canvas DOM element; if a pointerdown
    // starts inside #joystickZone or on a HUD button, we disable controls
    // so the drag doesn't spin the camera.
    const joystickZone = document.getElementById('joystickZone');
    const handleJoystickStart = () => {
      if (controlsRef) controlsRef.enabled = false;
    };
    const handleJoystickEnd = () => {
      if (controlsRef) controlsRef.enabled = true;
    };
    joystickZone?.addEventListener('pointerdown', handleJoystickStart);
    joystickZone?.addEventListener('pointerup', handleJoystickEnd);
    joystickZone?.addEventListener('pointercancel', handleJoystickEnd);
    joystickZone?.addEventListener('pointerleave', handleJoystickEnd);

    return () => {
      delete (window as unknown as { __r3fCamera?: THREE.Camera }).__r3fCamera;
      delete (window as unknown as { __r3fControls?: unknown }).__r3fControls;
      delete (window as unknown as { __r3fResetCamera?: () => void }).__r3fResetCamera;
      joystickZone?.removeEventListener('pointerdown', handleJoystickStart);
      joystickZone?.removeEventListener('pointerup', handleJoystickEnd);
      joystickZone?.removeEventListener('pointercancel', handleJoystickEnd);
      joystickZone?.removeEventListener('pointerleave', handleJoystickEnd);
    };
  }, [camera, controlsRef, targetRef, defaultZoom]);

  return null;
}
