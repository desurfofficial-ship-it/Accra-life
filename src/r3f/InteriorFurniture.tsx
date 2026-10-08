/** InteriorFurniture.tsx — furniture GLBs auto-scaled via fitToFootprint. */
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';
import { fitToFootprint } from './fitModel';

function FurnitureModel({ url, position, rotation = 0 }: {
  url: string; position: [number, number, number]; rotation?: number;
}) {
  const { scene } = useGLTF(url, assetUrl('draco/'));
  const fitted = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } });
    return fitToFootprint(m, 2, undefined, url);
  }, [scene, url]);
  return <primitive object={fitted} position={position} rotation={[0, rotation, 0]} />;
}

export function InteriorFurniture() {
  const [c0X, c0Z] = cellCenter(0, 0), [c1X, c1Z] = cellCenter(1, 0);
  return (
    <Suspense fallback={null}>
      <FurnitureModel url={assetUrl('assets/glb/furniture/furniture_set.glb')} position={[c0X - 1, 0, c0Z + 3]} rotation={0.3} />
      <FurnitureModel url={assetUrl('assets/glb/furniture/some_furniture.glb')} position={[c1X + 1, 0, c1Z - 2]} rotation={-0.5} />
      <FurnitureModel url={assetUrl('assets/glb/furniture/chair_table_wardrobe_suitcase_furniture.glb')} position={[c0X + 3, 0, c0Z - 1]} rotation={1.2} />
    </Suspense>
  );
}
