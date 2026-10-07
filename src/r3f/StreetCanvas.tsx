/**
 * StreetCanvas.tsx — Phase-1 R3F Bridge
 *
 * Renders:
 * 1. OrthographicCamera (flat, 2D-like view)
 * 2. Accra street plane (asphalt + markings + sidewalks)
 * 3. <TroTroStop /> — modular yellow sign at [0, 0, 0]
 * 4. Player Avatar — WASD movement + useFrame distance check
 *    to TroTroStop. When distance < 3m, logs:
 *    'Tro-tro interaction available: Press E to board'
 * 5. OrbitControls for view rotation
 *
 * The existing GTA-style HUD (from index.html) stays fixed on top.
 *
 * Ready to hook into tro-tro-system.md skill logic: the PlayerAvatar
 * accepts an optional `onTroTroBoard` callback. When the player is in
 * range and presses E, the callback fires (default: console.log).
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TroTroStop } from './TroTroStop';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

/** World position of the Tro-tro Stop sign. */
const TROTRO_STOP_POSITION: [number, number, number] = [0, 0, 0];

/** Distance (meters) within which the tro-tro interaction is available. */
const INTERACTION_RANGE = 3;

/** Movement speed (meters/second). */
const MOVE_SPEED = 4.0;

/** World bounds for clamping the avatar. */
const WORLD_BOUNDS = { minX: -24, maxX: 24, minZ: -16, maxZ: 16 };

// ────────────────────────────────────────────────────────────────────────────
// Accra Street Plane
// ────────────────────────────────────────────────────────────────────────────

function AccraStreetPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[68, 0.02, 7.0]} />
        <meshStandardMaterial color="#2e3846" roughness={0.86} />
      </mesh>
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[-28 + i * 5.4, 0.021, 0]}>
          <boxGeometry args={[2.4, 0.01, 0.16]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}
      {[-3.35, 3.35].map((z, i) => (
        <mesh key={`edge-${i}`} position={[0, 0.021, z]}>
          <boxGeometry args={[68, 0.01, 0.1]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}
      {[-6.05, 6.05].map((z, i) => (
        <mesh key={`sidewalk-${i}`} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <boxGeometry args={[68, 0.08, 3.3]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[88, 0.01, 88]} />
        <meshStandardMaterial color="#a6754b" roughness={0.94} />
      </mesh>
    </group>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Player Avatar — WASD movement + useFrame distance check to TroTroStop
// ────────────────────────────────────────────────────────────────────────────

interface PlayerAvatarProps {
  /** Callback when the player presses E while in range of the tro-tro stop.
   *  Default: console.log. Ready to hook into tro-tro-system.md skill logic. */
  onTroTroBoard?: () => void;
}

function PlayerAvatar({ onTroTroBoard }: PlayerAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const wasInRangeRef = useRef(false);

  // Keyboard listeners — store in ref for efficient per-frame reads
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;

      // E key — boarding action (only fires if currently in range)
      if (e.key.toLowerCase() === 'e' && wasInRangeRef.current) {
        if (onTroTroBoard) {
          onTroTroBoard();
        } else {
          console.log('Boarding tro-tro... (skill logic not yet hooked)');
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onTroTroBoard]);

  // useFrame — movement + distance check (runs every frame, synced to render)
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // ── Read keyboard → movement vector ──
    const keys = keysRef.current;
    let dx = 0;
    let dz = 0;
    if (keys['w'] || keys['arrowup']) dz -= 1;
    if (keys['s'] || keys['arrowdown']) dz += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Normalize diagonal
    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len;
      dz /= len;
    }

    // Apply movement
    const moveDist = MOVE_SPEED * delta;
    groupRef.current.position.x += dx * moveDist;
    groupRef.current.position.z += dz * moveDist;

    // Clamp to world bounds
    groupRef.current.position.x = THREE.MathUtils.clamp(
      groupRef.current.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX
    );
    groupRef.current.position.z = THREE.MathUtils.clamp(
      groupRef.current.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ
    );

    // Smooth rotation toward movement direction
    if (dx !== 0 || dz !== 0) {
      const targetAngle = Math.atan2(dx, dz);
      const current = groupRef.current.rotation.y;
      let diff = targetAngle - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.15;
    }

    // ── Distance check: player vs Tro-tro Stop ──
    const playerPos = groupRef.current.position;
    const stopPos = new THREE.Vector3(...TROTRO_STOP_POSITION);
    const distance = playerPos.distanceTo(stopPos);

    if (distance < INTERACTION_RANGE) {
      // Only log on ENTERING range (debounce — not every frame)
      if (!wasInRangeRef.current) {
        wasInRangeRef.current = true;
        console.log('Tro-tro interaction available: Press E to board');
      }
    } else {
      wasInRangeRef.current = false;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 8]}>
      {/* Body capsule (blue) */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.6, 8, 16]} />
        <meshStandardMaterial color="#2563eb" roughness={0.5} />
      </mesh>
      {/* Head sphere */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.5} />
      </mesh>
      {/* Shadow blob */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Canvas
// ────────────────────────────────────────────────────────────────────────────

export function StreetCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <OrthographicCamera makeDefault position={[0, 25, 25]} zoom={18} near={0.1} far={100} />

      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <AccraStreetPlane />

      {/* Modular Tro-tro Stop at [0, 0, 0] — yellow cylinder sign */}
      <TroTroStop position={TROTRO_STOP_POSITION} />

      {/* Player avatar with useFrame distance check + E key boarding */}
      <PlayerAvatar />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minZoom={10}
        maxZoom={30}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
