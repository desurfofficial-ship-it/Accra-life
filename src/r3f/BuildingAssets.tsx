/**
 * BuildingAssets.tsx — 8 new uploaded GLB models placed across AccraCityGrid
 *
 * Assets mapped to districts:
 *   house_exterior.glb (373KB)        → Adabraka [0,0] (residential exterior)
 *   house_1f_interior.glb (6.7MB)     → Adabraka [1,0] (1st-floor interior)
 *   room_apartment_furniture.glb (9MB) → Adabraka [0,0] (apartment furniture)
 *   room_bathroom.glb (484KB)         → Adabraka [0,0] (bathroom fixtures)
 *   building_office_room_window.glb (7.3MB) → Mixed-use [2,4] (office window)
 *   building_office_room_curtain.glb (7.3MB) → Mixed-use [0,3] (office curtain)
 *   cinemamovie_theater_seat.glb (419KB) → Osu [3,3] (cinema/theater seat)
 *   plastic_water_bottle.glb (303KB)  → Makola [1,1] (vendor water bottle)
 *
 * Uses useGLTF from @react-three/drei with Suspense. All meshes get
 * castShadow + receiveShadow. Scale tuned per model.
 */

import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';

// ── Generic GLB loader ─────────────────────────────────────────────────────

function GLBModel({
  url,
  position,
  rotation = 0,
  scale = 1,
}: {
  url: string;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  const { scene } = useGLTF(url);
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
    <primitive
      object={cloned}
      position={position}
      rotation={[0, rotation, 0]}
      scale={scale}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BuildingAssets() {
  // District cell centers
  const [adabraka00X, adabraka00Z] = cellCenter(0, 0); // Adabraka home
  const [adabraka10X, adabraka10Z] = cellCenter(1, 0); // Adabraka row 2
  const [makola11X, makola11Z] = cellCenter(1, 1);     // Makola Market
  const [mixed24X, mixed24Z] = cellCenter(2, 4);        // Mixed-use east
  const [mixed03X, mixed03Z] = cellCenter(0, 3);        // Mixed-use west
  const [osu33X, osu33Z] = cellCenter(3, 3);            // Osu nightlife

  return (
    <Suspense fallback={null}>
      {/* ── Adabraka [0,0]: house exterior + apartment furniture + bathroom ── */}
      <GLBModel
        url="/assets/glb/buildings/house_exterior.glb"
        position={[adabraka00X - 3, 0, adabraka00Z + 3]}
        rotation={0.5}
        scale={0.4}
      />
      <GLBModel
        url="/assets/glb/interior/room_apartment_furniture.glb"
        position={[adabraka00X + 1, 0, adabraka00Z - 2]}
        rotation={-0.3}
        scale={0.3}
      />
      <GLBModel
        url="/assets/glb/interior/room_bathroom.glb"
        position={[adabraka00X + 4, 0, adabraka00Z + 1]}
        rotation={1.2}
        scale={0.25}
      />

      {/* ── Adabraka [1,0]: 1st-floor interior ── */}
      <GLBModel
        url="/assets/glb/interior/house_1f_interior.glb"
        position={[adabraka10X, 0, adabraka10Z]}
        rotation={0}
        scale={0.3}
      />

      {/* ── Makola [1,1]: plastic water bottle (vendor item) ── */}
      <GLBModel
        url="/assets/glb/props/plastic_water_bottle.glb"
        position={[makola11X + 2, 0.8, makola11Z - 1]}
        rotation={0.8}
        scale={0.5}
      />

      {/* ── Mixed-use [2,4]: office window ── */}
      <GLBModel
        url="/assets/glb/buildings/building_office_room_window.glb"
        position={[mixed24X, 0, mixed24Z]}
        rotation={0.5}
        scale={0.35}
      />

      {/* ── Mixed-use [0,3]: office curtain ── */}
      <GLBModel
        url="/assets/glb/buildings/building_office_room_curtain.glb"
        position={[mixed03X, 0, mixed03Z]}
        rotation={-0.3}
        scale={0.35}
      />

      {/* ── Osu [3,3]: cinema/theater seat ── */}
      <GLBModel
        url="/assets/glb/interior/cinemamovie_theater_seat.glb"
        position={[osu33X - 1, 0, osu33Z + 2]}
        rotation={1.5}
        scale={0.4}
      />
    </Suspense>
  );
}

// Preload the smallest assets for faster initial load
useGLTF.preload('/assets/glb/props/plastic_water_bottle.glb');
useGLTF.preload('/assets/glb/buildings/house_exterior.glb');
