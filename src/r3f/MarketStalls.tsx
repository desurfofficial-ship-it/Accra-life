/**
 * MarketStalls.tsx — food GLB props on stall tables, auto-scaled.
 */
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';
import { fitToFootprint } from './fitModel';

const FOOD_ITEMS = [
  { file: 'banana', offset: [-3, 0, -2] as [number, number, number] },
  { file: 'apple', offset: [-1.5, 0, -2] as [number, number, number] },
  { file: 'bread', offset: [0, 0, -2] as [number, number, number] },
  { file: 'beet', offset: [1.5, 0, -2] as [number, number, number] },
  { file: 'avocado', offset: [3, 0, -2] as [number, number, number] },
  { file: 'barrel', offset: [-3, 0, 2] as [number, number, number] },
  { file: 'bowl', offset: [-1, 0, 2] as [number, number, number] },
  { file: 'bottle-ketchup', offset: [1, 0, 2] as [number, number, number] },
  { file: 'bag', offset: [3, 0, 2] as [number, number, number] },
];

function FoodItem({
  file,
  position,
}: {
  file: string;
  position: [number, number, number];
}) {
  const url = assetUrl(`assets/glb/food/${file}.glb`);
  const { scene } = useGLTF(url, assetUrl('draco/'));
  const fitted = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return fitToFootprint(m, 0.4, 0.5, url);
  }, [scene, url]);

  return (
    <group position={position}>
      <primitive object={fitted} />
    </group>
  );
}

function StallTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.06, 0.6]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} />
      </mesh>
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
  const stallPositions = [cellCenter(1, 1), cellCenter(2, 2)];
  return (
    <Suspense fallback={null}>
      {stallPositions.map(([cx, cz], stallIdx) => (
        <group key={`stall-${stallIdx}`} position={[cx, 0, cz]}>
          {FOOD_ITEMS.map((item, i) => (
            <group key={`food-${stallIdx}-${i}`}>
              <StallTable position={[item.offset[0], 0, item.offset[2]]} />
              <FoodItem
                file={item.file}
                position={[item.offset[0], 0.78, item.offset[2]]}
              />
            </group>
          ))}
        </group>
      ))}
    </Suspense>
  );
}
