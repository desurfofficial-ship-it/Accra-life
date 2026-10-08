/** PlayerAvatar — capsule-first movement; GLB swaps in when ready. */
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { LivingPlayerAvatar } from './LivingPlayerAvatar';
import { AssetBoundary } from './AssetBoundary';
import { getGameAPI } from './gameAPIBridge';
import { TOTAL_SIZE } from '../game/World/GridMap';

const MOVE_SPEED = 4.0;
const WORLD_BOUNDS = {
  minX: -TOTAL_SIZE / 2,
  maxX: TOTAL_SIZE / 2,
  minZ: -TOTAL_SIZE / 2,
  maxZ: TOTAL_SIZE / 2,
};
const SPAWN_X = 0;
const SPAWN_Z = 0;

interface PlayerAvatarProps {
  groupRef: RefObject<THREE.Group | null>;
}

export function PlayerAvatar({ groupRef }: PlayerAvatarProps) {
  const keysRef = useRef<Record<string, boolean>>({});
  const isMovingRef = useRef(false);
  const isSprintingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    const api = getGameAPI();
    let dx = 0, dz = 0;
    if (api) {
      const input = api.input.getMovementInput();
      dx = input.moveX;
      dz = input.moveZ;
    } else {
      const keys = keysRef.current;
      if (keys['w'] || keys['arrowup']) dz -= 1;
      if (keys['s'] || keys['arrowdown']) dz += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
    }
    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len;
      dz /= len;
    }
    const moveDist = MOVE_SPEED * delta;
    groupRef.current.position.x += dx * moveDist;
    groupRef.current.position.z += dz * moveDist;
    groupRef.current.position.x = THREE.MathUtils.clamp(groupRef.current.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
    groupRef.current.position.z = THREE.MathUtils.clamp(groupRef.current.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);

    if (dx !== 0 || dz !== 0) {
      const targetYaw = Math.atan2(dx, dz);
      let diff = targetYaw - groupRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.15;
    }
    isMovingRef.current = dx !== 0 || dz !== 0;
    if (api) {
      isSprintingRef.current = api.input.getMovementInput().sprint;
    } else {
      isSprintingRef.current = !!(keysRef.current['shift'] || keysRef.current['shiftleft'] || keysRef.current['shiftright']);
    }
  });

  return (
    <group ref={groupRef} position={[SPAWN_X, 0, SPAWN_Z]}>
      <Suspense fallback={<PlayerPlaceholder />}>
        <AssetBoundary name="PlayerAvatarModel">
          <LivingPlayerAvatar isMovingRef={isMovingRef} isSprintingRef={isSprintingRef} />
        </AssetBoundary>
      </Suspense>
    </group>
  );
}

function PlayerPlaceholder() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.34, 0.95, 12]} />
        <meshStandardMaterial color={0x38bdf8} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color={0xf1c27d} roughness={0.6} />
      </mesh>
    </group>
  );
}
