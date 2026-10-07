<<<<<<< HEAD
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { cellCenter } from './AccraCityGrid';

=======
/**
 * MarketStalls.tsx — Kenney Food Kit GLBs in Makola Market
 *
 * Loads a curated selection of food GLBs from the Kenney Food Kit
 * (CC0 license) and places them as market stall displays in the
 * Makola Market district (cells [1,1] to [2,2]) of the AccraCityGrid.
 *
 * Uses useGLTF from @react-three/drei with Suspense for async loading.
 * Only loads ~10 items (not all 200) — cherry-picked for visual variety.
 */

import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter, CELL_SIZE } from './AccraCityGrid';

// Curated food items — cherry-picked for market variety
>>>>>>> origin/main
const FOOD_ITEMS = [
  { file: 'banana', scale: 0.8, offset: [-3, 0, -2] },
  { file: 'apple', scale: 0.8, offset: [-1.5, 0, -2] },
  { file: 'bread', scale: 0.7, offset: [0, 0, -2] },
  { file: 'beet', scale: 0.7, offset: [1.5, 0, -2] },
  { file: 'avocado', scale: 0.7, offset: [3, 0, -2] },
  { file: 'barrel', scale: 0.6, offset: [-3, 0, 2] },
  { file: 'bowl', scale: 0.6, offset: [-1, 0, 2] },
  { file: 'bottle-ketchup', scale: 0.7, offset: [1, 0, 2] },
  { file: 'bag', scale: 0.7, offset: [3, 0, 2] },
];

function FoodItem({ file, position, scale }: { file: string; position: [number, number, number]; scale: number }) {
  const { scene } = useGLTF(`/assets/glb/food/${file}.glb`);
<<<<<<< HEAD
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} position={position} scale={scale} castShadow receiveShadow />;
}

function StallTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
=======

  // Clone the scene so multiple instances can have different positions
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <primitive
      object={cloned}
      position={position}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

// Simple wooden stall table for food to sit on
function StallTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tabletop */}
>>>>>>> origin/main
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.06, 0.6]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} />
      </mesh>
<<<<<<< HEAD
=======
      {/* Legs */}
>>>>>>> origin/main
      {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([lx, lz], i) => (
        <mesh key={`leg-${i}`} position={[lx, 0.36, lz]} castShadow>
          <boxGeometry args={[0.06, 0.72, 0.06]} />
          <meshStandardMaterial color="#78350f" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function MarketStalls() {
<<<<<<< HEAD
  const stallPositions = [cellCenter(1, 1), cellCenter(2, 2)];
=======
  // Place stalls in Makola Market cells [1,1] and [2,2]
  const stallPositions = [
    cellCenter(1, 1),  // NW corner of Makola
    cellCenter(2, 2),  // SE corner of Makola
  ];

>>>>>>> origin/main
  return (
    <Suspense fallback={null}>
      {stallPositions.map(([cx, cz], stallIdx) => (
        <group key={`stall-${stallIdx}`} position={[cx, 0, cz]}>
<<<<<<< HEAD
          {FOOD_ITEMS.map((item, i) => (
            <group key={`food-${stallIdx}-${i}`}>
              <StallTable position={[item.offset[0], 0, item.offset[2]]} />
              <FoodItem file={item.file} position={[item.offset[0], 0.78, item.offset[2]]} scale={item.scale} />
            </group>
          ))}
=======
          {FOOD_ITEMS.map((item, i) => {
            const pos: [number, number, number] = [
              item.offset[0],
              0.78, // sit on top of the table (0.75 tabletop + 0.03)
              item.offset[2],
            ];
            return (
              <group key={`food-${stallIdx}-${i}`}>
                <StallTable position={[item.offset[0], 0, item.offset[2]]} />
                <FoodItem file={item.file} position={pos} scale={item.scale} />
              </group>
            );
          })}
>>>>>>> origin/main
        </group>
      ))}
    </Suspense>
  );
}

<<<<<<< HEAD
FOOD_ITEMS.forEach((item) => useGLTF.preload(`/assets/glb/food/${item.file}.glb`));
=======
// Preload GLBs for faster loading
FOOD_ITEMS.forEach((item) => {
  useGLTF.preload(`/assets/glb/food/${item.file}.glb`);
});
>>>>>>> origin/main
