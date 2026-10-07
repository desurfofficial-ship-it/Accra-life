/**
 * StreetCanvas.tsx — Phase-1 R3F Bridge with full Tro-tro boarding system
 *
 * Renders:
 * 1. OrthographicCamera (flat, 2D-like view)
 * 2. Accra street plane
 * 3. <TroTroBoarding /> — full 7-step boarding sequence per tro-tro-system.md v2.0.0
 *    (dialogue → capacity → fare → debit → ticket → animation → transit)
 * 4. Player Avatar — WASD movement, shares its ref with TroTroBoarding
 *    for proximity check via useFrame
 * 5. OrbitControls for view rotation
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef, useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { TroTroBoarding } from './TroTroBoarding';

// ── Constants ────────────────────────────────────────────────────────────────

const TROTRO_STOP_POSITION: [number, number, number] = [0, 0, 0];
const MOVE_SPEED = 4.0;
const WORLD_BOUNDS = { minX: -24, maxX: 24, minZ: -16, maxZ: 16 };

// ── Accra Street Plane ──────────────────────────────────────────────────────

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

// ── Player Avatar ────────────────────────────────────────────────────────────

interface PlayerAvatarProps {
  groupRef: RefObject<THREE.Group | null>;
}

function PlayerAvatar({ groupRef }: PlayerAvatarProps) {
  const keysRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
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
  }, []);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    const keys = keysRef.current;
    let dx = 0;
    let dz = 0;
    if (keys['w'] || keys['arrowup']) dz -= 1;
    if (keys['s'] || keys['arrowdown']) dz += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len;
      dz /= len;
    }

    const moveDist = MOVE_SPEED * delta;
    groupRef.current.position.x += dx * moveDist;
    groupRef.current.position.z += dz * moveDist;

    groupRef.current.position.x = THREE.MathUtils.clamp(
      groupRef.current.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX
    );
    groupRef.current.position.z = THREE.MathUtils.clamp(
      groupRef.current.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ
    );

    if (dx !== 0 || dz !== 0) {
      const targetAngle = Math.atan2(dx, dz);
      const current = groupRef.current.rotation.y;
      let diff = targetAngle - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 8]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.6, 8, 16]} />
        <meshStandardMaterial color="#2563eb" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// ── Main Canvas ─────────────────────────────────────────────────────────────

export function StreetCanvas() {
  // Shared ref — the TroTroBoarding component reads the player's position
  // from this ref via useFrame for the proximity check (Rule 1).
  const playerGroupRef = useRef<THREE.Group>(null);

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

      {/* Full Tro-tro boarding system — implements tro-tro-system.md v2.0.0
          7-step sequence: dialogue → capacity → fare → debit → ticket →
          animation → transit. Shares playerGroupRef for proximity check. */}
      <TroTroBoarding
        stopPosition={TROTRO_STOP_POSITION}
        playerRef={playerGroupRef}
        onArriveAt={(destId) => {
          console.log(`[tro-tro] onArriveAt callback → ${destId}`);
          // Hook point: when integrated with the real game, this calls
          // travelToDestination(destId) to teleport the player.
        }}
      />

      {/* Player avatar — moves with WASD, shares ref with TroTroBoarding */}
      <PlayerAvatar groupRef={playerGroupRef} />

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
