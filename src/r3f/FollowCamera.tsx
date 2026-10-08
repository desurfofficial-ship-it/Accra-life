/**
 * FollowCamera.tsx — camera that follows the player avatar with smooth lerp.
 *
 * Keeps the player centred on screen while walking. Respects OrbitControls
 * yaw (one-finger drag / pinch-zoom still work) by offsetting the follow
 * target using the current azimuth angle.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const _desired = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _tmp = new THREE.Vector3();

interface FollowCameraProps {
  targetRef: React.RefObject<THREE.Group | null>;
}

export function FollowCamera({ targetRef }: FollowCameraProps) {
  const { camera, controls } = useThree();
  const snapped = useRef(false);
  const defaultZoom = 12;

  useEffect(() => {
    const win = window as unknown as {
      __r3fResetCamera?: () => void;
      __r3fCamera?: THREE.Camera;
      __r3fControls?: unknown;
      __r3fCameraYaw?: number;
    };
    win.__r3fCamera = camera;
    win.__r3fControls = controls;

    win.__r3fResetCamera = () => {
      snapped.current = false;
      const t = targetRef.current;
      if (!t) return;
      const zoom = defaultZoom;
      (camera as THREE.OrthographicCamera).zoom = zoom;
      (camera as THREE.OrthographicCamera).updateProjectionMatrix();
      const base = 50;
      const scale = 10 / zoom;
      camera.position.set(
        t.position.x + base * scale,
        t.position.y + base * scale,
        t.position.z + base * scale,
      );
      if (controls && 'target' in controls) {
        (controls as OrbitControlsImpl).target.set(t.position.x, t.position.y + 1, t.position.z);
        (controls as OrbitControlsImpl).update();
      }
    };

    // Joystick guard: disable OrbitControls while pointer is down in joystick zone
    const zone = document.getElementById('joystickZone');
    const onDown = (e: PointerEvent) => {
      if (!zone) return;
      const r = zone.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        if (controls && 'enabled' in controls) (controls as OrbitControlsImpl).enabled = false;
      }
    };
    const onUp = () => {
      if (controls && 'enabled' in controls) (controls as OrbitControlsImpl).enabled = true;
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [camera, controls, targetRef]);

  useFrame((_state, delta) => {
    const t = targetRef.current;
    if (!t) return;

    const orbit = controls as OrbitControlsImpl | null;
    const yaw = orbit ? orbit.getAzimuthalAngle() : 0;
    (window as unknown as { __r3fCameraYaw?: number }).__r3fCameraYaw = yaw;

    const zoom = (camera as THREE.OrthographicCamera).zoom || 10;
    const scale = 10 / zoom;
    const base = 50 * scale;

    // Isometric offset rotated by yaw
    _offset.set(base, base, base);
    _offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    _desired.set(t.position.x, t.position.y + 1, t.position.z);

    if (!snapped.current) {
      camera.position.copy(_desired).add(_offset);
      if (orbit) {
        orbit.target.copy(_desired);
        orbit.update();
      }
      snapped.current = true;
      return;
    }

    const k = 1 - Math.exp(-6 * delta);
    camera.position.lerp(_tmp.copy(_desired).add(_offset), k);
    if (orbit) {
      orbit.target.lerp(_desired, k);
      orbit.update();
    }
  });

  return null;
}
