import { useLoader } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CELL_SIZE, ROAD_WIDTH, TOTAL_SIZE } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';
import { fitToFootprint } from './fitModel';

const TREE_FILES = ['Tree_temp_climate_001.FBX','Tree_temp_climate_003.FBX','Tree_temp_climate_005.FBX','Tree_temp_climate_007.FBX','Tree_temp_climate_009.FBX'];
const BUSH_FILES = ['Bush_temp_climate_001.fbx','Bush_temp_climate_003.fbx','Bush_temp_climate_005.fbx'];

function srand(seed: number): number { const v = Math.sin(seed*127.1+311.7)*43758.5453; return v-Math.floor(v); }

const PLACEMENTS = (() => {
  const items: Array<{file:string;position:[number,number,number];scale:number;rotation:number}> = [];
  const HALF = TOTAL_SIZE/2;
  for (let row=0; row<=5; row++) for (let col=0; col<=5; col++) {
    const seed=row*7+col*13; if (srand(seed)<0.4) continue;
    const x=-HALF+col*(CELL_SIZE+ROAD_WIDTH)+ROAD_WIDTH/2;
    const z=-HALF+row*(CELL_SIZE+ROAD_WIDTH)+ROAD_WIDTH/2;
    const ox=srand(seed+1)>0.5?1.2:-1.2, oz=srand(seed+2)>0.5?1.2:-1.2;
    items.push({file:TREE_FILES[Math.floor(srand(seed+3)*TREE_FILES.length)],position:[x+ox,0,z+oz],scale:0.015+srand(seed+4)*0.01,rotation:srand(seed+5)*Math.PI*2});
  }
  items.slice(0,12).forEach((t,i)=>{ if(srand(i+100)<0.5) items.push({file:BUSH_FILES[Math.floor(srand(i+200)*BUSH_FILES.length)],position:[t.position[0]+(srand(i+300)-0.5)*2,0,t.position[2]+(srand(i+400)-0.5)*2],scale:0.01+srand(i+500)*0.008,rotation:srand(i+600)*Math.PI*2}); });
  return items;
})();

function FBXModel({url,position,scale,rotation}:{url:string;position:[number,number,number];scale:number;rotation:number}) {
  const fbx=useLoader(FBXLoader,url);
  const cloned=useMemo(()=>{const m=fbx.clone(true);m.traverse((c)=>{if(c instanceof THREE.Mesh){c.castShadow=true;c.receiveShadow=true;}});return m;},[fbx]);
  return <primitive object={cloned} position={position} scale={scale} rotation={[0,rotation,0]} />;
}

export function CityTrees() {
  return (<Suspense fallback={null}>{PLACEMENTS.map((item,i)=><FBXModel key={`g-${i}`} url={assetUrl(`assets/fbx/trees/${item.file}`)} position={item.position} scale={item.scale} rotation={item.rotation} />)}</Suspense>);
}
// REMOVED FOR BOOT PAYLOAD: TREE_FILES.forEach(f=>useLoader.preload(FBXLoader,assetUrl(`assets/fbx/trees/${f}`)));
// REMOVED FOR BOOT PAYLOAD: BUSH_FILES.forEach(f=>useLoader.preload(FBXLoader,assetUrl(`assets/fbx/trees/${f}`)));
