import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';

function FurnitureModel({ url, position, rotation, scale }: { url: string; position: [number, number, number]; rotation: number; scale: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => { const m = scene.clone(true); m.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } }); return m; }, [scene]);
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

export function InteriorFurniture() {
  const [c0X, c0Z] = cellCenter(0, 0), [c1X, c1Z] = cellCenter(1, 0);
  return (<Suspense fallback={null}>
    <FurnitureModel url={assetUrl('assets/glb/furniture/furniture_set.glb')} position={[c0X - 1, 0, c0Z + 3]} rotation={0.3} scale={0.3} />
    <FurnitureModel url={assetUrl('assets/glb/furniture/some_furniture.glb')} position={[c1X + 1, 0, c1Z - 2]} rotation={-0.5} scale={0.25} />
    <FurnitureModel url={assetUrl('assets/glb/furniture/chair_table_wardrobe_suitcase_furniture.glb')} position={[c0X + 3, 0, c0Z - 1]} rotation={1.2} scale={0.2} />
  </Suspense>);
}
// REMOVED FOR BOOT PAYLOAD: useGLTF.preload(assetUrl('assets/glb/furniture/some_furniture.glb'));
