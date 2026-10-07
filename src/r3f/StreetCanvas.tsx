/**
 * StreetCanvas.tsx — Phase-1 R3F Bridge
 *
 * Renders:
 * 1. An OrthographicCamera (flat, 2D-like view)
 * 2. An Accra street plane (asphalt + markings + sidewalks)
 * 3. A Tro-tro Stop model (yellow sign + small shelter)
 * 4. A Player Avatar (capsule mesh that moves with WASD/arrows)
 * 5. useFrame distance check: when the avatar is within 2m of the
 *    tro-tro stop, logs "Tro-tro interaction available" to the console
 * 6. OrbitControls so the 3D plane can be rotated
 *
 * The existing GTA-style HUD (from index.html) stays FIXED on top.
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef, useState, useEffect, type RefObject } from 'react';
import * as THREE from 'three';

// ────────────────────────────────────────────────────────────────────────────
// Accra Street Plane
// ────────────────────────────────────────────────────────────────────────────

function AccraStreetPlane() {
  return (
    <group>
      {/* Asphalt road (68m × 7m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[68, 0.02, 7.0]} />
        <meshStandardMaterial color="#2e3846" roughness={0.86} />
      </mesh>

      {/* Center dashed line */}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={`dash-${i}`} position={[-28 + i * 5.4, 0.021, 0]}>
          <boxGeometry args={[2.4, 0.01, 0.16]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      ))}

      {/* Edge lines (yellow) */}
      {[-3.35, 3.35].map((z, i) => (
        <mesh key={`edge-${i}`} position={[0, 0.021, z]}>
          <boxGeometry args={[68, 0.01, 0.1]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}

      {/* Sidewalks */}
      {[-6.05, 6.05].map((z, i) => (
        <mesh key={`sidewalk-${i}`} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <boxGeometry args={[68, 0.08, 3.3]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
      ))}

      {/* Laterite ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[88, 0.01, 88]} />
        <meshStandardMaterial color="#a6754b" roughness={0.94} />
      </mesh>
    </group>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tro-tro Stop — yellow sign + small shelter
// ────────────────────────────────────────────────────────────────────────────

const TROTRO_STOP_POSITION: [number, number, number] = [9.0, 0, 5.0];

function TrotroStop() {
  return (
    <group position={TROTRO_STOP_POSITION}>
      {/* Shelter roof (flat box) */}
      <mesh position={[0, 2.6, -2.5]} castShadow>
        <boxGeometry args={[4.5, 0.12, 2.8]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>

      {/* Shelter posts (2) */}
      {[-2.0, 2.0].map((x, i) => (
        <mesh key={`post-${i}`} position={[x, 1.25, -2.5]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 2.5, 8]} />
          <meshStandardMaterial color="#64748b" roughness={0.7} />
        </mesh>
      ))}

      {/* Bench under shelter */}
      <mesh position={[0, 0.4, -2.3]} castShadow>
        <boxGeometry args={[3.6, 0.4, 0.5]} />
        <meshStandardMaterial color="#78350f" roughness={0.72} />
      </mesh>

      {/* Yellow "TROTRO" sign post */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 3.0, 8]} />
        <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Sign panel (yellow plane) */}
      <mesh position={[0, 2.2, 0.02]}>
        <planeGeometry args={[1.2, 0.4]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Sign text stripe (blue band) */}
      <mesh position={[0, 2.2, 0.03]}>
        <planeGeometry args={[1.0, 0.14]} />
        <meshStandardMaterial color="#005bb5" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Player Avatar — capsule mesh that moves with WASD/arrows
// ────────────────────────────────────────────────────────────────────────────

const MOVE_SPEED = 4.0; // meters per second
const INTERACTION_RANGE = 2.0; // meters — trigger distance for tro-tro stop

function PlayerAvatar({ trotroStopPosition }: { trotroStopPosition: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const wasInRangeRef = useRef(false); // debounce: only log on ENTERING range

  // Set up keyboard listeners
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

  // useFrame: move the avatar + check distance to tro-tro stop
  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // Read keyboard input → movement vector
    const keys = keysRef.current;
    let dx = 0;
    let dz = 0;
    if (keys['w'] || keys['arrowup']) dz -= 1;
    if (keys['s'] || keys['arrowdown']) dz += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      dx /= len;
      dz /= len;
    }

    // Apply movement (delta = seconds since last frame)
    const moveDist = MOVE_SPEED * delta;
    groupRef.current.position.x += dx * moveDist;
    groupRef.current.position.z += dz * moveDist;

    // Clamp to world bounds (±25 X, ±17 Z)
    groupRef.current.position.x = THREE.MathUtils.clamp(groupRef.current.position.x, -24, 24);
    groupRef.current.position.z = THREE.MathUtils.clamp(groupRef.current.position.z, -16, 16);

    // Rotate the avatar to face movement direction
    if (dx !== 0 || dz !== 0) {
      const targetAngle = Math.atan2(dx, dz);
      // Smooth rotation (lerp toward target angle)
      const current = groupRef.current.rotation.y;
      let diff = targetAngle - current;
      // Wrap to shortest path
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.15;
    }

    // ── Distance check: is the avatar within 2m of the tro-tro stop? ──
    const playerPos = groupRef.current.position;
    const stopPos = new THREE.Vector3(...trotroStopPosition);
    const distance = playerPos.distanceTo(stopPos);

    if (distance <= INTERACTION_RANGE) {
      // Only log on ENTERING range (not every frame while inside)
      if (!wasInRangeRef.current) {
        wasInRangeRef.current = true;
        console.log('Tro-tro interaction available');
      }
    } else {
      wasInRangeRef.current = false;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 5.8]}>
      {/* Body capsule (blue) */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.6, 8, 16]} />
        <meshStandardMaterial color="#2563eb" roughness={0.5} />
      </mesh>

      {/* Head sphere (lighter blue) */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#60a5fa" roughness={0.5} />
      </mesh>

      {/* Shadow blob (simple dark circle under the avatar) */}
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
      <OrthographicCamera
        makeDefault
        position={[0, 25, 25]}
        zoom={18}
        near={0.1}
        far={100}
      />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Accra street */}
      <AccraStreetPlane />

      {/* Tro-tro Stop model */}
      <TrotroStop />

      {/* Player Avatar — moves with WASD/arrows, checks distance to
          tro-tro stop via useFrame */}
      <PlayerAvatar trotroStopPosition={TROTRO_STOP_POSITION} />

      {/* OrbitControls — rotate the view. Keyboard movement still
          works because OrbitControls only captures mouse/touch. */}
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
