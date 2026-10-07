import { useLoader } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { cellCenter } from './AccraCityGrid';

const HOUSE_VARIANTS = [
  { file: 'house-small', scale: 0.35 },
  { file: 'house-mid', scale: 0.35 },
  { file: 'house-modern', scale: 0.3 },
  { file: 'house-luxurious', scale: 0.28 },
  { file: 'gas-station', scale: 0.3 },
];

function srand(seed: number): number { const v=Math.sin(seed*127.1+311.7)*43758.5453; return v-Math.floor(v); }

function HouseModel({file,position,rotation,scale}:{file:string;position:[number,number,number];rotation:number;scale:number}) {
  const materials=useLoader(MTLLoader,`/assets/obj/houses/${file}.mtl`);
  const obj=useLoader(OBJLoader,`/assets/obj/houses/${file}.obj`);
  const cloned=useMemo(()=>{materials.preload();const m=obj.clone(true);m.traverse((c)=>{if(c instanceof THREE.Mesh){const k=Object.keys(materials.materials)[0];if(k&&materials.materials[k])c.material=materials.materials[k];c.castShadow=true;c.receiveShadow=true;}});return m;},[obj,materials]);
  return <primitive object={cloned} position={position} rotation={[0,rotation,0]} scale={scale} />;
}

export function SuburbHouses() {
  const [c0X,c0Z]=cellCenter(0,0), [c1X,c1Z]=cellCenter(1,0);
  return (<Suspense fallback={null}>
    <HouseModel file="house-small" position={[c0X-3,0,c0Z-2]} rotation={srand(1)*Math.PI*2} scale={0.35} />
    <HouseModel file="house-mid" position={[c0X+2,0,c0Z-1]} rotation={srand(2)*Math.PI*2} scale={0.35} />
    <HouseModel file="gas-station" position={[c0X+3,0,c0Z+3]} rotation={srand(3)*Math.PI*2} scale={0.3} />
    <HouseModel file="house-modern" position={[c1X-2,0,c1Z]} rotation={srand(4)*Math.PI*2} scale={0.3} />
    <HouseModel file="house-luxurious" position={[c1X+2,0,c1Z+2]} rotation={srand(5)*Math.PI*2} scale={0.28} />
  </Suspense>);
}
HOUSE_VARIANTS.forEach(v=>{useLoader.preload(MTLLoader,`/assets/obj/houses/${v.file}.mtl`);useLoader.preload(OBJLoader,`/assets/obj/houses/${v.file}.obj`);});
