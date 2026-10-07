/**
 * StreetCanvas.tsx — the live custom map world (phase-1-custom-map)
 *
 * Renders the 5x5 Accra grid (AccraCityGrid) and integrates the REAL game
 * systems through window.GameAPI once the game boots:
 * - Player avatar is driven by the real InputManager (keyboard WASD +
 *   agent setJoystickInput) and mirrors its position into PlayerController
 *   every frame, so InteractionSystem, getLocationAt() and presence all
 *   follow the custom map player.
 * - The interactive tro-tro stop sits at the Circle station cell [3,2]
 *   (GridMap.TROTRO_STATION_WORLD); boarding uses the real Wallet,
 *   EXP_TROTRO_FARE ticket SKU and TrotroService seat state (TroTroBoarding).
 * - Prompt overlay shows the live cash balance + canonical fare.
 * Pre-boot (onboarding) the canvas runs in demo mode: local WASD, demo
 * balance.
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef, useEffect, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { AccraCityGrid } from './AccraCityGrid';
import { MarketStalls } from './MarketStalls';
import { CityTrees } from './CityTrees';
import { LandscapeProps } from './LandscapeProps';
import { SuburbHouses } from './SuburbHouses';
import { InteriorFurniture } from './InteriorFurniture';
import { BeachProps } from './BeachProps';
import { TroTroBoarding } from './TroTroBoarding';
import { TroTroPrompt } from '../ui/TroTroPrompt';
import { getGameAPI } from './gameAPIBridge';
import { TROTRO_STATION_WORLD, TOTAL_SIZE } from '../game/World/GridMap';

// ── Constants ────────────────────────────────────────────────────────────────

// The interactive tro-tro stop sits AT the Circle station cell [3,2] on the
// custom grid map (GridMap.TROTRO_STATION_WORLD = [0, 16]) — the same spot
// the hidden world's trotro_stop interactable and mate occupy.
const TROTRO_STOP_POSITION: [number, number, number] = [
  TROTRO_STATION_WORLD[0], 0, TROTRO_STATION_WORLD[1]
];
const TROTRO_FARE = 5;
const TROTRO_STOP_ID = 'trotro_stop';
const MOVE_SPEED = 6.0;   // demo-mode walk speed (pre-onboarding)
const WALK_SPEED = 4.5;   // canon PlayerController walkSpeed
const SPRINT_SPEED = 7.3; // canon PlayerController sprintSpeed
const WORLD_BOUNDS = {
  minX: -TOTAL_SIZE / 2, maxX: TOTAL_SIZE / 2,
  minZ: -TOTAL_SIZE / 2, maxZ: TOTAL_SIZE / 2,
};

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
    </group>
  );
}

// ── Player Avatar ────────────────────────────────────────────────────────────

interface PlayerAvatarProps {
  groupRef: RefObject<THREE.Group | null>;
}

/**
 * The visible player on the custom map. Movement input comes from the REAL
 * InputManager (via window.GameAPI) once the game boots — so local WASD and
 * agent-driven setJoystickInput both move this avatar. Before boot it falls
 * back to a local keyboard handler (onboarding demo). Every frame the
 * avatar's position is mirrored into the PlayerController object so the
 * InteractionSystem, location resolution and multiplayer presence follow
 * the custom map player.
 */
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
    const api = getGameAPI();

    // Movement input: real InputManager when live, local keys pre-boot
    let dx = 0, dz = 0;
    let speed = MOVE_SPEED;
    if (api) {
      const mi = api.input.getMovementInput();
      dx = mi.moveX;
      dz = mi.moveZ;
      speed = mi.sprint ? SPRINT_SPEED : WALK_SPEED;
    } else {
      const keys = keysRef.current;
      if (keys['w'] || keys['arrowup']) dz -= 1;
      if (keys['s'] || keys['arrowdown']) dz += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
    }
    if (dx !== 0 || dz !== 0) { const len = Math.sqrt(dx*dx + dz*dz); dx /= len; dz /= len; }
    const moveDist = speed * delta;
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

    // Mirror into the real PlayerController (shared Vector3) — keeps
    // InteractionSystem proximity + facing, getLocationAt(), presence
    // (position AND heading) and the agent-facing gameAPI.position in
    // step with the visible avatar.
    if (api) {
      const p = api.player.position;
      p.set(groupRef.current.position.x, p.y, groupRef.current.position.z);
      api.player.rotationY = groupRef.current.rotation.y;
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

// ── Tro-tro Stop with emissive glow when active ──────────────────────────────

function GlowingTroTroStop({ isActive }: { isActive: boolean }) {
  const signRef = useRef<THREE.Mesh>(null);
  const targetEmissive = isActive ? 0.4 : 0.15;

  useFrame(() => {
    if (!signRef.current) return;
    const mat = signRef.current.material as THREE.MeshStandardMaterial;
    if (mat && mat.emissive) {
      // Smooth lerp toward the target emissive intensity
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.1;
    }
  });

  return (
    <group position={TROTRO_STOP_POSITION}>
      {/* Sign post */}
      <mesh castShadow>
        <cylinderGeometry args={[0.04, 0.05, 3.0, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Yellow sign panel — this is the one that glows */}
      <mesh ref={signRef} position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 6]} />
        <meshStandardMaterial
          color="#facc15"
          roughness={0.35}
          emissive="#facc15"
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Base plate */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.04, 12]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>

      {/* Interaction zone wireframe (visible only when active) */}
      {isActive && (
        <mesh>
          <sphereGeometry args={[3, 16, 12]} />
          <meshBasicMaterial color="#facc15" wireframe transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  );
}

// ── Interaction Detector — checks player distance to tro-tro stop ────────────

function InteractionDetector({
  playerRef,
  onActiveChange,
}: {
  playerRef: RefObject<THREE.Group | null>;
  onActiveChange: (active: boolean) => void;
}) {
  const isActiveRef = useRef(false);

  useFrame(() => {
    if (!playerRef.current) return;
    const playerPos = playerRef.current.position;
    const stopPos = new THREE.Vector3(...TROTRO_STOP_POSITION);
    const distance = playerPos.distanceTo(stopPos);
    const isActive = distance < 3.0;

    if (isActive !== isActiveRef.current) {
      isActiveRef.current = isActive;
      onActiveChange(isActive);
      if (isActive) {
        console.log('Tro-tro interaction available: Press E to board');
      }
    }
  });

  return null;
}

// ── Main Canvas ─────────────────────────────────────────────────────────────

export function StreetCanvas() {
  const playerGroupRef = useRef<THREE.Group>(null);
  const [troTroActive, setTroTroActive] = useState(false);
  // Live wallet data for the GTA-style prompt — demo values until the
  // real bridge boots (window.GameAPI appears after onboarding).
  const [balance, setBalance] = useState(20);
  const [fare, setFare] = useState(TROTRO_FARE);

  useEffect(() => {
    const t = window.setInterval(() => {
      const api = getGameAPI();
      if (!api) return;
      setBalance(api.getCashBalance());
      setFare(api.getCanonicalFareGHS());
    }, 400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <>
      {/* R3F Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true }}
        onCreated={({ scene, camera }) => {
          (window as unknown as { __r3fScene?: THREE.Scene; __r3fCamera?: THREE.Camera }).__r3fScene = scene;
          (window as unknown as { __r3fCamera?: THREE.Camera }).__r3fCamera = camera;
        }}
      >
        <OrthographicCamera makeDefault position={[0, 25, 25]} zoom={18} near={0.1} far={100} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 20, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        {/* ── The custom 5x5 Accra grid map ──
            District blocks, roads, landmarks (AccraCityGrid) + the asset
            packs placed on grid cells (stalls, trees, offices, farm,
            suburb houses, furniture, beach props). These were previously
            unmounted — the map is now the live game world. */}
        <AccraCityGrid />
        <MarketStalls />
        <CityTrees />
        <LandscapeProps />
        <SuburbHouses />
        <InteriorFurniture />
        <BeachProps />

        <AccraStreetPlane />

        {/* Tro-tro stop with emissive glow when player is in range */}
        <GlowingTroTroStop isActive={troTroActive} />

        {/* Tro-tro boarding system */}
        <TroTroBoarding
          stopPosition={TROTRO_STOP_POSITION}
          playerRef={playerGroupRef}
          onArriveAt={(destId) => console.log(`[tro-tro] Arrived at ${destId}`)}
        />

        <PlayerAvatar groupRef={playerGroupRef} />

        {/* Interaction detector — checks distance each frame */}
        <InteractionDetector
          playerRef={playerGroupRef}
          onActiveChange={setTroTroActive}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minZoom={10}
          maxZoom={30}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>

      {/* GTA-style tro-tro prompt overlay — shows when player is in range */}
      <TroTroPrompt
        fare={fare}
        playerBalance={balance}
        visible={troTroActive}
      />
    </>
  );
}
