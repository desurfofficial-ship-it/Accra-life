<<<<<<< HEAD
=======
/**
 * LandscapeProps.tsx — Landscape asset pack + farm FBX in AccraCityGrid
 *
 * BIT 3: Landscape v2a office building (OBJ format, CC0)
 * - Loads building-office-small.obj + .mtl via OBJLoader + MTLLoader
 * - Places 2 copies in the mixed-use district cells (non-district areas)
 *
 * BIT 4: Farm (FBX format, CC0)
 * - Loads farm2_textured.FBX via FBXLoader
 * - Places 1 farm in the Labadi district (cells [4,0]-[4,1]) — rural edge
 */

>>>>>>> origin/main
import { useLoader } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { cellCenter } from './AccraCityGrid';

<<<<<<< HEAD
function OfficeBuilding({position,rotation,scale}:{position:[number,number,number];rotation:number;scale:number}) {
  const materials=useLoader(MTLLoader,'/assets/obj/landscape/building-office-small.mtl');
  const obj=useLoader(OBJLoader,'/assets/obj/landscape/building-office-small.obj');
  const cloned=useMemo(()=>{materials.preload();const m=obj.clone(true);m.traverse((c)=>{if(c instanceof THREE.Mesh){c.material=materials.materials.Material||c.material;c.castShadow=true;c.receiveShadow=true;}});return m;},[obj,materials]);
  return <primitive object={cloned} position={position} rotation={[0,rotation,0]} scale={scale} />;
}

function FarmBuilding({position,rotation,scale}:{position:[number,number,number];rotation:number;scale:number}) {
  const fbx=useLoader(FBXLoader,'/assets/fbx/farm/farm2_textured.FBX');
  const cloned=useMemo(()=>{const m=fbx.clone(true);m.traverse((c)=>{if(c instanceof THREE.Mesh){c.castShadow=true;c.receiveShadow=true;}});return m;},[fbx]);
  return <primitive object={cloned} position={position} rotation={[0,rotation,0]} scale={scale} />;
}

export function LandscapeProps() {
  const [o1X,o1Z]=cellCenter(2,4), [o2X,o2Z]=cellCenter(0,3), [fX,fZ]=cellCenter(4,1);
  return (<Suspense fallback={null}>
    <OfficeBuilding position={[o1X,0,o1Z]} rotation={0.5} scale={0.3} />
    <OfficeBuilding position={[o2X,0,o2Z]} rotation={-0.3} scale={0.25} />
    <FarmBuilding position={[fX,0,fZ]} rotation={0.8} scale={0.02} />
  </Suspense>);
}
useLoader.preload(MTLLoader,'/assets/obj/landscape/building-office-small.mtl');
useLoader.preload(OBJLoader,'/assets/obj/landscape/building-office-small.obj');
useLoader.preload(FBXLoader,'/assets/fbx/farm/farm2_textured.FBX');
=======
// ── BIT 3: Office building (OBJ + MTL) ──────────────────────────────────────

function OfficeBuilding({ position, rotation, scale }: {
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  // Load MTL material first, then OBJ with the material applied
  const materials = useLoader(MTLLoader, '/assets/obj/landscape/building-office-small.mtl');
  const obj = useLoader(OBJLoader, '/assets/obj/landscape/building-office-small.obj');

  const cloned = useMemo(() => {
    materials.preload();
    const m = obj.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = materials.materials.Material || child.material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return m;
  }, [obj, materials]);

  return (
    <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />
  );
}

// ── BIT 4: Farm (FBX) ───────────────────────────────────────────────────────

function FarmBuilding({ position, rotation, scale }: {
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  const fbx = useLoader(FBXLoader, '/assets/fbx/farm/farm2_textured.FBX');

  const cloned = useMemo(() => {
    const m = fbx.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Apply the farm diffuse map if the material exists
        if (child.material && child.material.map) {
          child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
          child.material.map.magFilter = THREE.LinearFilter;
        }
      }
    });
    return m;
  }, [fbx]);

  return (
    <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LandscapeProps() {
  // Place office buildings in mixed-use cells (non-district areas)
  const [office1X, office1Z] = cellCenter(2, 4); // east edge, mixed use
  const [office2X, office2Z] = cellCenter(0, 3); // west edge, mixed use

  // Place farm in Labadi area (rural edge of the map)
  const [farmX, farmZ] = cellCenter(4, 1); // Labadi beach area

  return (
    <Suspense fallback={null}>
      {/* Office buildings in mixed-use districts */}
      <OfficeBuilding position={[office1X, 0, office1Z]} rotation={0.5} scale={0.3} />
      <OfficeBuilding position={[office2X, 0, office2Z]} rotation={-0.3} scale={0.25} />

      {/* Farm building near Labadi (rural edge) */}
      <FarmBuilding position={[farmX, 0, farmZ]} rotation={0.8} scale={0.02} />
    </Suspense>
  );
}

// Preload
useLoader.preload(MTLLoader, '/assets/obj/landscape/building-office-small.mtl');
useLoader.preload(OBJLoader, '/assets/obj/landscape/building-office-small.obj');
useLoader.preload(FBXLoader, '/assets/fbx/farm/farm2_textured.FBX');
>>>>>>> origin/main
