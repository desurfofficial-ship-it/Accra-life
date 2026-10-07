<<<<<<< HEAD
=======
/**
 * InteriorFurniture.tsx — Furniture GLB assets in Adabraka district
 *
 * Loads the three furniture GLB packs and mounts them as compact yard
 * displays in the Adabraka residential cells ([0,0] and [1,0]), placed to
 * clear the SuburbHouses footprints (house-small/mid at the north of
 * [0,0], gas-station south-east, house-modern/luxurious in [1,0]).
 *
 * IMPORTANT — these packs are Sketchfab-style SHOWCASE LINEUPS: furniture
 * arranged in a long row for display, NOT compact room clusters. Measured
 * world spans at their original scales were ~39 m (furniture_set, single
 * merged mesh), ~159 m (some_furniture — sticking ~148 m off the south
 * map edge!) and ~16 m (chair_table_wardrobe). Fixed scales therefore
 * cannot work; each model is now measured at load (Box3) and uniformly
 * auto-fit to a target footprint (7-10 m) with its base on the ground,
 * then centered on its yard spot.
 *
 * Assets (all CC0/free-license):
 *   - furniture_set.glb (15MB) — general furniture collection
 *   - some_furniture.glb (14MB) — assorted furniture pieces
 *   - chair_table_wardrobe_suitcase_furniture.glb (18MB) — specific items
 *
 * Large assets (48MB+): indian_furniture.glb, living_room_furniture.glb
 * are NOT loaded at runtime (too heavy for browser) — they're in
 * public/assets/glb/furniture/ for future use but not imported.
 */

>>>>>>> origin/main
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';

<<<<<<< HEAD
function FurnitureModel({ url, position, rotation, scale }: { url: string; position: [number, number, number]; rotation: number; scale: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => { const m = scene.clone(true); m.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } }); return m; }, [scene]);
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

export function InteriorFurniture() {
  const [c0X, c0Z] = cellCenter(0, 0);
  const [c1X, c1Z] = cellCenter(1, 0);
  return (
    <Suspense fallback={null}>
      <FurnitureModel url="/assets/glb/furniture/furniture_set.glb" position={[c0X - 1, 0, c0Z + 3]} rotation={0.3} scale={0.3} />
      <FurnitureModel url="/assets/glb/furniture/some_furniture.glb" position={[c1X + 1, 0, c1Z - 2]} rotation={-0.5} scale={0.25} />
      <FurnitureModel url="/assets/glb/furniture/chair_table_wardrobe_suitcase_furniture.glb" position={[c0X + 3, 0, c0Z - 1]} rotation={1.2} scale={0.2} />
    </Suspense>
  );
}
=======
/** Measure + uniformly scale a loaded scene so its largest dimension
 *  equals targetSize, recentering the footprint around the origin with
 *  the base at y = 0. Returns a ready-to-place wrapper group. */
function useFittedModel(gltfScene: THREE.Object3D, targetSize: number) {
  return useMemo(() => {
    const m = gltfScene.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(m);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? targetSize / maxDim : 1;

    const wrapper = new THREE.Group();
    m.scale.setScalar(scale);
    m.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    wrapper.add(m);
    return wrapper;
  }, [gltfScene, targetSize]);
}

function FurnitureModel({ url, targetSize, position, rotation }: {
  url: string;
  targetSize: number;
  position: [number, number, number];
  rotation: number;
}) {
  const { scene } = useGLTF(url);
  const fitted = useFittedModel(scene, targetSize);

  return (
    <primitive
      object={fitted}
      position={position}
      rotation={[0, rotation, 0]}
    />
  );
}

// ── Yard placements (auto-fit targets in meters) ────────────────────────────

export function InteriorFurniture() {
  const [cell0X, cell0Z] = cellCenter(0, 0); // Adabraka [0,0]
  const [cell1X, cell1Z] = cellCenter(1, 0); // Adabraka [1,0]

  return (
    <Suspense fallback={null}>
      {/* Furniture set — south-west yard of cell [0,0] */}
      <FurnitureModel
        url="/assets/glb/furniture/furniture_set.glb"
        targetSize={7}
        position={[cell0X - 4.2, 0, cell0Z + 4.3]}
        rotation={0.9}
      />

      {/* Some furniture — west strip of cell [1,0] */}
      <FurnitureModel
        url="/assets/glb/furniture/some_furniture.glb"
        targetSize={10}
        position={[cell1X - 4.6, 0, cell1Z - 3.4]}
        rotation={0.4}
      />

      {/* Chair + table + wardrobe cluster — north-east corner of cell [0,0] */}
      <FurnitureModel
        url="/assets/glb/furniture/chair_table_wardrobe_suitcase_furniture.glb"
        targetSize={6}
        position={[cell0X + 4.4, 0, cell0Z - 4.7]}
        rotation={1.2}
      />
    </Suspense>
  );
}

// Preload the smallest for faster initial load
>>>>>>> origin/main
useGLTF.preload('/assets/glb/furniture/some_furniture.glb');
