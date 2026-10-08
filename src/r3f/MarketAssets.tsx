/**
 * MarketAssets.tsx — 4 market GLB models placed across the AccraCityGrid.
 * Uses fitToFootprint() for auto-scaling — no hand-tuned SCALES.
 */
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter, CELL_SIZE } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';
import { fitToFootprint } from './fitModel';

const TARGET_FOOTPRINT = 0.8 * CELL_SIZE;
const TARGET_HEIGHT = 1.2 * CELL_SIZE;

const PLACEMENTS = [
  { id: 'super_market', row: 2, col: 4 },
  { id: 'mini_market', row: 0, col: 2 },
  { id: 'cat_market', row: 4, col: 1 },
  { id: 'chinese_market', row: 3, col: 4 },
] as const;

type MarketId = 'super_market' | 'mini_market' | 'cat_market' | 'chinese_market';

const URLS: Record<MarketId, string> = {
  super_market: assetUrl('assets/glb/markets/super-market/super_market.glb'),
  mini_market: assetUrl('assets/glb/markets/mini-market/mini_market.glb'),
  cat_market: assetUrl('assets/glb/markets/cat-market/cat_market.glb'),
  chinese_market: assetUrl('assets/glb/markets/chinese-market/chinese_market.glb'),
};

function GLBMarket({
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

export function MarketAssets() {
  return (
    <Suspense fallback={null}>
      {PLACEMENTS.map((p) => {
        const [cx, cz] = cellCenter(p.row, p.col);
        const url = URLS[p.id as MarketId];
        return (
          <GLBMarket
            key={`market-${p.id}`}
            url={url}
            position={[cx, 0, cz]}
            rotation={0}
          />
        );
      })}
    </Suspense>
  );
}
