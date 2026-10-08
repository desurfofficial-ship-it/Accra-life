/** BuildingAssets.tsx — GLB buildings auto-scaled via fitToFootprint. */
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter, CELL_SIZE } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';
import { fitToFootprint } from './fitModel';

const TARGET_FOOTPRINT = 0.8 * CELL_SIZE;
const TARGET_HEIGHT = 1.2 * CELL_SIZE;

function GLBModel({
  url,
  position,
  rotation = 0,
}: {
  url: string;
  position: [number, number, number];
  rotation?: number;
}) {
  const { scene } = useGLTF(url, assetUrl('draco/'));
  const fitted = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return fitToFootprint(m, TARGET_FOOTPRINT, TARGET_HEIGHT, url);
  }, [scene, url]);

  return (
    <primitive
      object={fitted}
      position={position}
      rotation={[0, rotation, 0]}
    />
  );
}

export function BuildingAssets() {
  const [a00X, a00Z] = cellCenter(0, 0);
  const [a10X, a10Z] = cellCenter(1, 0);
  const [m11X, m11Z] = cellCenter(1, 1);
  const [mx24X, mx24Z] = cellCenter(2, 4);
  const [mx03X, mx03Z] = cellCenter(0, 3);
  const [o33X, o33Z] = cellCenter(3, 3);

  return (
    <Suspense fallback={null}>
      <GLBModel url={assetUrl('assets/glb/buildings/house_exterior.glb')} position={[a00X - 3, 0, a00Z + 3]} rotation={0.5} />
      <GLBModel url={assetUrl('assets/glb/interior/room_apartment_furniture.glb')} position={[a00X + 1, 0, a00Z - 2]} rotation={-0.3} />
      <GLBModel url={assetUrl('assets/glb/interior/room_bathroom.glb')} position={[a00X + 4, 0, a00Z + 1]} rotation={1.2} />
      <GLBModel url={assetUrl('assets/glb/interior/house_1f_interior.glb')} position={[a10X, 0, a10Z]} rotation={0} />
      <GLBModel url={assetUrl('assets/glb/props/plastic_water_bottle.glb')} position={[m11X + 2, 0.8, m11Z - 1]} rotation={0.8} />
      <GLBModel url={assetUrl('assets/glb/buildings/building_office_room_window.glb')} position={[mx24X, 0, mx24Z]} rotation={0.5} />
      <GLBModel url={assetUrl('assets/glb/buildings/building_office_room_curtain.glb')} position={[mx03X, 0, mx03Z]} rotation={-0.3} />
      <GLBModel url={assetUrl('assets/glb/interior/cinemamovie_theater_seat.glb')} position={[o33X - 1, 0, o33Z + 2]} rotation={1.5} />
    </Suspense>
  );
}
