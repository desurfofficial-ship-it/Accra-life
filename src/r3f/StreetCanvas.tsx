/**
 * StreetCanvas.tsx — Phase-1 Real Map Base
 *
 * Architecture:
 *   <AccraMap> (Mapbox GL, z-index:0) — real Accra map with 3D buildings
 *     └── <StreetCanvas3D> (R3F Canvas, z-index:1, pointer-events:none)
 *           ├── Accra street plane (transparent — shows map below)
 *           ├── TroTroBoarding (7-step boarding system)
 *           ├── PlayerAvatar (WASD movement)
 *           └── OrbitControls
 *
 * The Mapbox canvas is the base layer showing real Accra geography.
 * The R3F Canvas overlays on top — for now it renders the game's 3D
 * objects (street plane, tro-tro stop, player avatar). In future
 * phases, the R3F Canvas will be fully synced to the Mapbox camera
 * so 3D objects appear at real-world GPS coordinates.
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef, useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { AccraMap } from './AccraMap';
import { TroTroBoarding } from './TroTroBoarding';

// ── Constants ────────────────────────────────────────────────────────────────

const TROTRO_STOP_POSITION: [number, number, number] = [0, 0, 0];
const MOVE_SPEED = 4.0;
const WORLD_BOUNDS = { minX: -24, maxX: 24, minZ: -16, maxZ: 16 };

// ── Accra Street Plane (transparent — shows the Mapbox map below) ──────────

function AccraStreetPlane() {
  return (
    <group>
      {/* Transparent ground — lets the Mapbox map show through */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <boxGeometry args={[68, 0.001, 7.0]} />
        <meshStandardMaterial color="#2e3846" transparent opacity={0.3} roughness={0.86} />
      </mesh>

      {/* Center dashed line (still visible on top of the map) */}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[-28 + i * 5.4, 0.021, 0]}>
          <boxGeometry args={[2.4, 0.01, 0.16]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}

      {/* Edge lines */}
      {[-3.35, 3.35].map((z, i) => (
        <mesh key={`edge-${i}`} position={[0, 0.021, z]}>
          <boxGeometry args={[68, 0.01, 0.1]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}
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
    const keys = keysRef.current;
    let dx = 0, dz = 0;
    if (keys['w'] || keys['arrowup']) dz -= 1;
    if (keys['s'] || keys['arrowdown']) dz += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (dx !== 0 || dz !== 0) { const len = Math.sqrt(dx*dx + dz*dz); dx /= len; dz /= len; }
    const moveDist = MOVE_SPEED * delta;
    groupRef.current.position.x += dx * moveDist;
    groupRef.current.position.z += dz * moveDist;
    groupRef.current.position.x = THREE.MathUtils.clamp(groupRef.current.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
    groupRef.current.position.z = THREE.MathUtils.clamp(groupRef.current.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
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

// ── R3F Canvas (overlaid on top of the Mapbox map) ──────────────────────────

function StreetCanvas3D({ playerGroupRef }: { playerGroupRef: RefObject<THREE.Group | null> }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ antialias: true, alpha: true }}
    >
      <OrthographicCamera makeDefault position={[0, 25, 25]} zoom={18} near={0.1} far={100} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 5]} intensity={1.0} castShadow />

      <AccraStreetPlane />
      <TroTroBoarding
        stopPosition={TROTRO_STOP_POSITION}
        playerRef={playerGroupRef}
        onArriveAt={(destId) => console.log(`[tro-tro] onArriveAt → ${destId}`)}
      />
      <PlayerAvatar groupRef={playerGroupRef} />
    </Canvas>
  );
}

// ── Main export — AccraMap base + R3F overlay ──────────────────────────────

export function StreetCanvas() {
  const playerGroupRef = useRef<THREE.Group>(null);

  return (
    <AccraMap>
      <StreetCanvas3D playerGroupRef={playerGroupRef} />
    </AccraMap>
  );
}
