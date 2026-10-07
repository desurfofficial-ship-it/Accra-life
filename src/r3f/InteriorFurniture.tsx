/**
 * InteriorFurniture.tsx — Furniture GLB assets in Adabraka district
 *
 * Loads furniture GLB models and places them inside/near the suburb
 * houses in the Adabraka residential district (cells [0,0] to [1,0]).
 *
 * Assets (all CC0/free-license):
 *   - furniture_set.glb (15MB) — general furniture collection
 *   - some_furniture.glb (14MB) — assorted furniture pieces
 *   - chair_table_wardrobe_suitcase_furniture.glb (18MB) — specific items
 *
 * Large assets (48MB+): indian_furniture.glb, living_room_furniture.glb
 * are NOT loaded at runtime (too heavy for browser) — they're in
 * public/assets/glb/furniture/ for future use but not imported.
 *
 * Uses useGLTF from @react-three/drei with Suspense. Only loads the
 * smaller files (under 20MB) to keep the bundle manageable.
 */

import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';

// ── Furniture set (15MB) ────────────────────────────────────────────────────

function FurnitureSet({ position, rotation, scale }: {
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  const { scene } = useGLTF('/assets/glb/furniture/furniture_set.glb');
  const cloned = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return m;
  }, [scene]);

  return (
    <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />
  );
}

// ── Some furniture (14MB) ───────────────────────────────────────────────────

function SomeFurniture({ position, rotation, scale }: {
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  const { scene } = useGLTF('/assets/glb/furniture/some_furniture.glb');
  const cloned = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return m;
  }, [scene]);

  return (
    <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />
  );
}

// ── Chair + table + wardrobe + suitcase (18MB) ──────────────────────────────

function ChairTableWardrobe({ position, rotation, scale }: {
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  const { scene } = useGLTF('/assets/glb/furniture/chair_table_wardrobe_suitcase_furniture.glb');
  const cloned = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return m;
  }, [scene]);

  return (
    <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InteriorFurniture() {
  const [cell0X, cell0Z] = cellCenter(0, 0); // Adabraka [0,0]
  const [cell1X, cell1Z] = cellCenter(1, 0); // Adabraka [1,0]

  return (
    <Suspense fallback={null}>
      {/* Furniture set near the first house */}
      <FurnitureSet
        position={[cell0X - 1, 0, cell0Z + 3]}
        rotation={0.3}
        scale={0.3}
      />

      {/* Some furniture near the second house */}
      <SomeFurniture
        position={[cell1X + 1, 0, cell1Z - 2]}
        rotation={-0.5}
        scale={0.25}
      />

      {/* Chair + table + wardrobe cluster */}
      <ChairTableWardrobe
        position={[cell0X + 3, 0, cell0Z - 1]}
        rotation={1.2}
        scale={0.2}
      />
    </Suspense>
  );
}

// Preload the smallest for faster initial load
useGLTF.preload('/assets/glb/furniture/some_furniture.glb');
