/**
 * MarketAssets.tsx — 4 user-uploaded market GLB models placed across the
 * AccraCityGrid as commercial landmarks at distinct grid cells.
 *
 * Assets:
 *   super_market.glb    (26MB)  → cell [2,4] (East side — Makola market row)
 *   mini_market.glb     (7.6MB) → cell [0,2] (Adabraka corner shop)
 *   cat_market.glb      (33MB)  → cell [4,1] (Labadi — decorative cat-themed market)
 *   chinese_market.glb  (13MB)  → cell [3,4] (Osu — Chinatown-style market)
 *
 * Asset provenance:
 *   - super_market.glb, cat_market.glb, chinese_market.glb: user-uploaded
 *     .glb files (Sketchfab exports).
 *   - mini_market.glb: re-downloaded from Sketchfab API as GLB (the user
 *     uploaded .zip only contained .usdz + textures, not a usable GLB).
 *     Model: "Mini Market" (uid 725af75672704fc599a692d64e946475, CC-BY-4.0).
 *
 * Uses useGLTF from @react-three/drei with Suspense. Each GLB is loaded
 * once (R3F caches by URL) + cloned per placement. All meshes get
 * castShadow + receiveShadow. Scale tuned per model — Sketchfab exports
 * vary wildly in native scale.
 */

import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';

// ── Per-asset scale tuning ─────────────────────────────────────────────────
// Sketchfab exports have wildly different native scales; these constants
// were picked so each market fits roughly within a 10-12m grid cell.
const SCALES = {
  super_market: 1.0,
  mini_market: 1.0,
  cat_market: 1.0,
  chinese_market: 1.0,
} as const;

// ── Placement map (cell [row, col] → asset id) ─────────────────────────────
// Each market sits on a distinct grid cell so they're visually spread
// across the world — no overlap.
const PLACEMENTS = [
  { id: 'super_market', row: 2, col: 4, label: 'Super Market' },
  { id: 'mini_market', row: 0, col: 2, label: 'Mini Market' },
  { id: 'cat_market', row: 4, col: 1, label: 'Cat Market' },
  { id: 'chinese_market', row: 3, col: 4, label: 'Chinese Market' },
] as const;

type MarketId = keyof typeof SCALES;

const URLS: Record<MarketId, string> = {
  super_market: assetUrl('assets/glb/markets/super-market/super_market.glb'),
  mini_market: assetUrl('assets/glb/markets/mini-market/mini_market.glb'),
  cat_market: assetUrl('assets/glb/markets/cat-market/cat_market.glb'),
  chinese_market: assetUrl('assets/glb/markets/chinese-market/chinese_market.glb'),
};

// ── Generic GLB loader (matches BuildingAssets.tsx pattern) ────────────────

function GLBMarket({
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

export function MarketAssets() {
  return (
    <Suspense fallback={null}>
      {PLACEMENTS.map((p) => {
        const [cx, cz] = cellCenter(p.row, p.col);
        const url = URLS[p.id as MarketId];
        const scale = SCALES[p.id as MarketId];
        return (
          <GLBMarket
            key={`market-${p.id}`}
            url={url}
            position={[cx, 0, cz]}
            rotation={0}
            scale={scale}
          />
        );
      })}
    </Suspense>
  );
}

// Preload all market GLBs at module load (R3F caches by URL).
// This kicks off fetches early so the Suspense fallback is brief.
Object.values(URLS).forEach((url) => useGLTF.preload(url));
