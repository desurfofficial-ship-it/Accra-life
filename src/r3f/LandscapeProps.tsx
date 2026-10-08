/**
 * LandscapeProps.tsx — office OBJ + farm FBX auto-scaled via fitToFootprint.
 * Cells chosen to avoid MarketAssets / BuildingAssets collisions.
 */
import { useLoader } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { cellCenter, CELL_SIZE } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';
import { fitToFootprint } from './fitModel';

const OFFICE_FOOTPRINT = 0.7 * CELL_SIZE;
const OFFICE_HEIGHT = 1.2 * CELL_SIZE;
const FARM_FOOTPRINT = 0.7 * CELL_SIZE;
const FARM_HEIGHT = 1.0 * CELL_SIZE;

function OfficeBuilding({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: number;
}) {
  const materials = useLoader(
    MTLLoader,
    assetUrl('assets/obj/landscape/building-office-small.mtl'),
  );
  const obj = useLoader(
    OBJLoader,
    assetUrl('assets/obj/landscape/building-office-small.obj'),
  );
  const fitted = useMemo(() => {
    materials.preload();
    const m = obj.clone(true);
    m.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.material = materials.materials.Material || c.material;
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return fitToFootprint(
      m,
      OFFICE_FOOTPRINT,
      OFFICE_HEIGHT,
      'building-office-small.obj',
    );
  }, [obj, materials]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={fitted} />
    </group>
  );
}

function FarmBuilding({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: number;
}) {
  const fbx = useLoader(
    FBXLoader,
    assetUrl('assets/fbx/farm/farm2_textured.FBX'),
  );
  const fitted = useMemo(() => {
    const m = fbx.clone(true);
    m.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return fitToFootprint(m, FARM_FOOTPRINT, FARM_HEIGHT, 'farm2_textured.FBX');
  }, [fbx]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={fitted} />
    </group>
  );
}

export function LandscapeProps() {
  // Avoid cells occupied by MarketAssets (2,4), (0,2), (4,1), (3,4)
  // and BuildingAssets office rooms at (2,4), (0,3).
  const [o1X, o1Z] = cellCenter(1, 3);
  const [o2X, o2Z] = cellCenter(2, 1);
  const [fX, fZ] = cellCenter(4, 3);

  return (
    <Suspense fallback={null}>
      <OfficeBuilding position={[o1X, 0, o1Z]} rotation={0.5} />
      <OfficeBuilding position={[o2X, 0, o2Z]} rotation={-0.3} />
      <FarmBuilding position={[fX, 0, fZ]} rotation={0.8} />
    </Suspense>
  );
}
