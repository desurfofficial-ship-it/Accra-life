/** BeachProps.tsx — beach GLB props auto-scaled via fitToFootprint. */
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';
import { fitToFootprint } from './fitModel';

function BeachItem({
  url,
  position,
  rotation = 0,
  footprint = 1.5,
}: {
  url: string;
  position: [number, number, number];
  rotation?: number;
  footprint?: number;
}) {
  const { scene } = useGLTF(url, assetUrl('draco/'));
  const fitted = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return fitToFootprint(m, footprint, undefined, url);
  }, [scene, url, footprint]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={fitted} />
    </group>
  );
}

export function BeachProps() {
  const [c0X, c0Z] = cellCenter(4, 0);
  const [c1X, c1Z] = cellCenter(4, 2); // was (4,1) — conflicted with cat_market

  return (
    <Suspense fallback={null}>
      <BeachItem
        url={assetUrl('assets/glb/beach/beach_ball.glb')}
        position={[c0X, 0, c0Z]}
        footprint={1}
      />
      <BeachItem
        url={assetUrl('assets/glb/beach/beach_table.glb')}
        position={[c0X + 2, 0, c0Z + 2]}
        rotation={0.5}
        footprint={1.5}
      />
      <BeachItem
        url={assetUrl('assets/glb/beach/beach_kit.glb')}
        position={[c1X - 1, 0, c1Z]}
        footprint={3}
      />
      <BeachItem
        url={assetUrl('assets/glb/beach/beach_reef.glb')}
        position={[c1X + 2, 0, c1Z + 2]}
        footprint={3}
      />
    </Suspense>
  );
}
