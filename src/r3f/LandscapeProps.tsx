import { useLoader } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { cellCenter } from './AccraCityGrid';

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
