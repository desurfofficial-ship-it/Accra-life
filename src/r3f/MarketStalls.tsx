import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import { cellCenter } from './AccraCityGrid';

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
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} position={position} scale={scale} castShadow receiveShadow />;
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
              <FoodItem file={item.file} position={[item.offset[0], 0.78, item.offset[2]]} scale={item.scale} />
            </group>
          ))}
        </group>
      ))}
    </Suspense>
  );
}

FOOD_ITEMS.forEach((item) => useGLTF.preload(`/assets/glb/food/${item.file}.glb`));
