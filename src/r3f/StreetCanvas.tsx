/**
 * StreetCanvas.tsx — Phase-1 R3F Bridge
 *
 * A minimal react-three-fiber Canvas that renders:
 * 1. An OrthographicCamera (flat, 2D-like view — no perspective distortion)
 * 2. A simple 3D plane representing an Accra street (asphalt-colored box)
 * 3. Street markings (dashed center line + edge lines)
 * 4. OrbitControls so the plane CAN be rotated by the user (drag to orbit)
 *
 * The HUD overlay (the existing GTA-style elements from index.html) stays
 * FIXED on top of this Canvas — it's a separate DOM layer with
 * pointer-events:none, so the user's drag reaches the Canvas below for
 * rotation, while the HUD buttons remain clickable.
 *
 * This is the "phase-1-bridge" — it proves that R3F can coexist with the
 * existing DOM-based HUD. The full game migration to R3F would replace
 * Phase1Scene.ts with a R3F scene, but that's a future phase.
 */

import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef } from 'react';

function AccraStreetPlane() {
  const meshRef = useRef<any>(null);

  return (
    <group ref={meshRef}>
      {/* Asphalt road plane (68m long × 7m wide, matching the existing NeighborhoodBlock) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[68, 0.02, 7.0]} />
        <meshStandardMaterial color="#2e3846" roughness={0.86} />
      </mesh>

      {/* Center dashed line (white dashes every 5.4m) */}
      {Array.from({ length: 13 }).map((_, i) => {
        const x = -28 + i * 5.4;
        return (
          <mesh key={`dash-${i}`} position={[x, 0.021, 0]}>
            <boxGeometry args={[2.4, 0.01, 0.16]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        );
      })}

      {/* Edge lines (yellow) */}
      {[-3.35, 3.35].map((z, i) => (
        <mesh key={`edge-${i}`} position={[0, 0.021, z]}>
          <boxGeometry args={[68, 0.01, 0.1]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}

      {/* Sidewalk strips (north + south) */}
      {[-6.05, 6.05].map((z, i) => (
        <mesh key={`sidewalk-${i}`} position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[68, 0.08, 3.3]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
      ))}

      {/* Laterite ground (the surrounding earth) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[88, 0.01, 88]} />
        <meshStandardMaterial color="#a6754b" roughness={0.94} />
      </mesh>
    </group>
  );
}

export function StreetCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      {/* OrthographicCamera — flat 2D-like view. Positioned high above
          looking down at an angle so the street is visible as a 3D plane
          (not just a top-down 2D view). */}
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

      {/* The Accra street plane */}
      <AccraStreetPlane />

      {/* OrbitControls — allows the user to drag-rotate the view.
          The HUD overlay (separate DOM layer) stays fixed regardless. */}
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
