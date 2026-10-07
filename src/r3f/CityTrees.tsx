/**
 * CityTrees.tsx — Craftpix tree + bush FBX models in the AccraCityGrid
 *
 * Loads a curated selection of tree and bush FBX files from the Craftpix
 * low-poly packs (CC0 license) and places them at deterministic positions
 * along the roads and in green spaces of the AccraCityGrid.
 *
 * Uses useLoader with Three.js FBXLoader for async FBX loading.
 * Trees are placed at road intersections + along sidewalk edges.
 * Bushes are clustered near trees for natural landscaping.
 *
 * Deterministic placement (seeded by index — same layout every render).
 */

import { useLoader, useThree } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { cellCenter, CELL_SIZE, ROAD_WIDTH, TOTAL_SIZE } from './AccraCityGrid';

// ── Tree + bush placement (deterministic) ───────────────────────────────────

interface TreePlacement {
  model: 'tree' | 'bush';
  file: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
}

// Pick a few trees + bushes for variety
const TREE_FILES = [
  'Tree_temp_climate_001.FBX',
  'Tree_temp_climate_003.FBX',
  'Tree_temp_climate_005.FBX',
  'Tree_temp_climate_007.FBX',
  'Tree_temp_climate_009.FBX',
];

const BUSH_FILES = [
  'Bush_temp_climate_001.fbx',
  'Bush_temp_climate_003.fbx',
  'Bush_temp_climate_005.fbx',
];

// Deterministic pseudo-random
function srand(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// Generate placements: trees at road intersections, bushes near trees
// (plain module-level IIFE — deterministic data, no hooks at module scope)
const PLACEMENTS: TreePlacement[] = (() => {
  const items: TreePlacement[] = [];
  const HALF = TOTAL_SIZE / 2;

  // Trees at road intersection corners (every other intersection)
  for (let row = 0; row <= 5; row++) {
    for (let col = 0; col <= 5; col++) {
      const seed = row * 7 + col * 13;
      if (srand(seed) < 0.4) continue; // skip 60% of intersections

      const x = -HALF + col * (CELL_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;
      const z = -HALF + row * (CELL_SIZE + ROAD_WIDTH) + ROAD_WIDTH / 2;

      // Offset to the corner of the intersection
      const ox = srand(seed + 1) > 0.5 ? 1.2 : -1.2;
      const oz = srand(seed + 2) > 0.5 ? 1.2 : -1.2;

      items.push({
        model: 'tree',
        file: TREE_FILES[Math.floor(srand(seed + 3) * TREE_FILES.length)],
        position: [x + ox, 0, z + oz],
        scale: 0.015 + srand(seed + 4) * 0.01, // FBX scale is typically large — 0.015-0.025
        rotation: srand(seed + 5) * Math.PI * 2,
      });
    }
  }

  // Bushes clustered near some trees
  items.slice(0, 12).forEach((tree, i) => {
    if (srand(i + 100) < 0.5) {
      items.push({
        model: 'bush',
        file: BUSH_FILES[Math.floor(srand(i + 200) * BUSH_FILES.length)],
        position: [
          tree.position[0] + (srand(i + 300) - 0.5) * 2,
          0,
          tree.position[2] + (srand(i + 400) - 0.5) * 2,
        ],
        scale: 0.01 + srand(i + 500) * 0.008,
        rotation: srand(i + 600) * Math.PI * 2,
      });
    }
  });

  return items;
})();

// ── FBX loader component ─────────────────────────────────────────────────────

function FBXModel({ url, position, scale, rotation }: {
  url: string;
  position: [number, number, number];
  scale: number;
  rotation: number;
}) {
  const fbx = useLoader(FBXLoader, url);
  const cloned = useMemo(() => fbx.clone(true), [fbx]);

  // Apply shadows + material tweaks
  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <primitive
      object={cloned}
      position={position}
      scale={scale}
      rotation={[0, rotation, 0]}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CityTrees() {
  return (
    <Suspense fallback={null}>
      {PLACEMENTS.map((item, i) => (
        <FBXModel
          key={`greenery-${i}`}
          url={`/assets/fbx/trees/${item.file}`}
          position={item.position}
          scale={item.scale}
          rotation={item.rotation}
        />
      ))}
    </Suspense>
  );
}

// Preload for faster loading
TREE_FILES.forEach((f) => useLoader.preload(FBXLoader, `/assets/fbx/trees/${f}`));
BUSH_FILES.forEach((f) => useLoader.preload(FBXLoader, `/assets/fbx/trees/${f}`));
