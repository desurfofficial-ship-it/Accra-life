/**
 * StreetCanvas.tsx — Phase-1 Custom Map
 *
 * Architecture:
 *   <Canvas> (R3F, full-screen, opaque)
 *     ├── <AccraCityGrid /> (5x5 grid with roads + buildings + landmarks)
 *     ├── <TroTroBoarding /> (7-step boarding system at Circle Station)
 *     ├── <PlayerAvatar /> (WASD movement on the roads)
 *     └── <OrbitControls />
 *
 * No external map APIs — the entire city is built procedurally.
 * The player can walk on the roads between blocks and navigate
 * between districts (Adabraka, Makola, Circle, Osu, Labadi).
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef, useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { AccraCityGrid, TOTAL_SIZE, cellCenter } from './AccraCityGrid';
import { MarketStalls } from './MarketStalls';
import { CityTrees } from './CityTrees';
import { LandscapeProps } from './LandscapeProps';
import { SuburbHouses } from './SuburbHouses';
import { BeachProps } from './BeachProps';
import { InteriorFurniture } from './InteriorFurniture';
import { TroTroBoarding } from './TroTroBoarding';
import { TroTroPrompt } from '../ui/TroTroPrompt';

// ── Player Avatar ────────────────────────────────────────────────────────────

const MOVE_SPEED = 6.0; // slightly faster for the larger map
const WORLD_BOUNDS = {
  minX: -TOTAL_SIZE / 2,
  maxX: TOTAL_SIZE / 2,
  minZ: -TOTAL_SIZE / 2,
  maxZ: TOTAL_SIZE / 2,
};

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

  // Spawn at Adabraka (cell [0,0] = home district)
  const [spawnX, spawnZ] = cellCenter(0, 0);

  return (
    <group ref={groupRef} position={[spawnX, 0, spawnZ]}>
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
  const playerGroupRef = useRef<THREE.Group>(null);

  // Tro-tro stop position = Circle Station (cell [3,2])
  const [troTroX, troTroZ] = cellCenter(3, 2);
  const trotroStopPosition: [number, number, number] = [troTroX, 0, troTroZ];

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <OrthographicCamera makeDefault position={[0, 50, 50]} zoom={10} near={0.1} far={200} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      {/* Custom Accra city grid — 5x5 blocks with roads + buildings + landmarks */}
      <AccraCityGrid />

      {/* Kenney Food Kit GLBs — market stalls in Makola Market */}
      <MarketStalls />

      {/* Craftpix trees + bushes — greenery along roads */}
      <CityTrees />

      {/* Landscape v2a office buildings + farm FBX */}
      <LandscapeProps />

      {/* Suburb houses in Adabraka residential district */}
      <SuburbHouses />

      {/* Beach GLBs in Labadi district */}
      <BeachProps />

      {/* Furniture GLBs in Adabraka houses */}
      <InteriorFurniture />

      {/* Tro-tro boarding system at Circle Station */}
      <TroTroBoarding
        stopPosition={trotroStopPosition}
        playerRef={playerGroupRef}
        onArriveAt={(destId) => console.log(`[tro-tro] Arrived at ${destId}`)}
      />

      {/* Player avatar — spawns at Adabraka (home), walks with WASD */}
      <PlayerAvatar groupRef={playerGroupRef} />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minZoom={5}
        maxZoom={25}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
