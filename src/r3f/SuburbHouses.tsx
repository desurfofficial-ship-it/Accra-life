/**
 * SuburbHouses.tsx — Suburb asset pack houses in Adabraka district
 *
 * BIT 5: Suburb houses (OBJ + MTL, CC0)
 * - Loads house OBJ models via OBJLoader + MTLLoader
 * - Places varied house types in the Adabraka residential district
 *   (cells [0,0] to [1,0]) — matching the "home" area
 *
 * House types used:
 *   - house-small (starter home)
 *   - house-mid (mid-tier)
 *   - house-modern (modern)
 *   - house-luxurious (premium)
 *   - house-country (rural)
 *   - gas-station (fuel station on the road edge)
 *
 * Deterministic placement via srand() — same layout every render.
 */

import { useLoader } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { cellCenter, CELL_SIZE } from './AccraCityGrid';

// House variants to load
const HOUSE_VARIANTS = [
  { file: 'house-small', scale: 0.35 },
  { file: 'house-mid', scale: 0.35 },
  { file: 'house-modern', scale: 0.3 },
  { file: 'house-luxurious', scale: 0.28 },
  { file: 'house-country', scale: 0.32 },
  { file: 'gas-station', scale: 0.3 },
];

// Deterministic random
function srand(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// ── House loader (OBJ + MTL) ────────────────────────────────────────────────

function HouseModel({ file, position, rotation, scale }: {
  file: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  const materials = useLoader(MTLLoader, `/assets/obj/houses/${file}.mtl`);
  const obj = useLoader(OBJLoader, `/assets/obj/houses/${file}.obj`);

  const cloned = useMemo(() => {
    materials.preload();
    const m = obj.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Try to apply the material from the MTL file
        const matKey = Object.keys(materials.materials)[0];
        if (matKey && materials.materials[matKey]) {
          child.material = materials.materials[matKey];
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return m;
  }, [obj, materials]);

  return (
    <primitive
      object={cloned}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SuburbHouses() {
  // Place houses in Adabraka district (cells [0,0] and [1,0])
  const [cell0X, cell0Z] = cellCenter(0, 0);
  const [cell1X, cell1Z] = cellCenter(1, 0);

  // Deterministic placements within each cell
  const placements = useMemo(() => {
    const items: Array<{ file: string; position: [number, number, number]; rotation: number; scale: number }> = [];

    // Cell [0,0] — 3 houses + 1 gas station
    const variant0 = HOUSE_VARIANTS[0]; // house-small
    const variant1 = HOUSE_VARIANTS[1]; // house-mid
    const variant2 = HOUSE_VARIANTS[5]; // gas-station

    items.push({
      file: variant0.file,
      position: [cell0X - 3, 0, cell0Z - 2],
      rotation: srand(1) * Math.PI * 2,
      scale: variant0.scale,
    });
    items.push({
      file: variant1.file,
      position: [cell0X + 2, 0, cell0Z - 1],
      rotation: srand(2) * Math.PI * 2,
      scale: variant1.scale,
    });
    items.push({
      file: variant2.file,
      position: [cell0X + 3, 0, cell0Z + 3],
      rotation: srand(3) * Math.PI * 2,
      scale: variant2.scale,
    });

    // Cell [1,0] — 2 houses (modern + luxurious)
    items.push({
      file: HOUSE_VARIANTS[2].file, // house-modern
      position: [cell1X - 2, 0, cell1Z],
      rotation: srand(4) * Math.PI * 2,
      scale: HOUSE_VARIANTS[2].scale,
    });
    items.push({
      file: HOUSE_VARIANTS[3].file, // house-luxurious
      position: [cell1X + 2, 0, cell1Z + 2],
      rotation: srand(5) * Math.PI * 2,
      scale: HOUSE_VARIANTS[3].scale,
    });

    return items;
  }, [cell0X, cell0Z, cell1X, cell1Z]);

  return (
    <Suspense fallback={null}>
      {placements.map((p, i) => (
        <HouseModel
          key={`house-${i}`}
          file={p.file}
          position={p.position}
          rotation={p.rotation}
          scale={p.scale}
        />
      ))}
    </Suspense>
  );
}

// Preload all house variants
HOUSE_VARIANTS.forEach((v) => {
  useLoader.preload(MTLLoader, `/assets/obj/houses/${v.file}.mtl`);
  useLoader.preload(OBJLoader, `/assets/obj/houses/${v.file}.obj`);
});
