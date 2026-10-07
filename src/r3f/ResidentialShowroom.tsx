/**
 * ResidentialShowroom.tsx — "Residential Furniture" scene mounted on the
 * custom map
 *
 * Mounts the previously-unmounted residential asset pack
 * (public/assets/glb/residential/scene.gltf + scene.bin, ~50 MB) as a
 * furnished model-home showroom on the central-west community block,
 * between the Susu kiosk cell and the Circle station:
 * grid cell [row 3, col 1] (world [-16, 16]).
 *
 * The model is loaded with useGLTF (Suspense — the rest of the scene
 * stays interactive while the 50 MB buffer streams in). On load the
 * scene's bounding box is measured once and the model is uniformly
 * scaled + recentered so it fits inside the 12 m cell (max dimension
 * ~9 m, base at y=0) — no hand-tuned magic numbers.
 *
 * Asset credit (CC-BY-4.0 requires attribution):
 *   "Residential Furniture" by ATD-London
 *   https://sketchfab.com/3d-models/residential-furniture-622e5089f251459fb8fc321646432e22
 *   License: CC-BY-4.0 (license.txt ships alongside the model)
 */

import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';

/** Target footprint (meters) for the model's largest GROUND dimension —
 *  the pack is a floor-plan-style layout (its natural height is a few
 *  dozen cm at this scale, like an architectural diorama), so we fit the
 *  XZ footprint to nearly fill the 12 m cell and let height land where
 *  it lands. */
const TARGET_FOOTPRINT = 11.0;

function ShowroomModel() {
  const { scene } = useGLTF('/assets/glb/residential/scene.gltf');

  const fitted = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Measure once, fit once: uniform scale to TARGET_MAX_DIM, then
    // recenter so the footprint sits centered on the cell with its
    // base on the ground.
    const box = new THREE.Box3().setFromObject(m);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const footprint = Math.max(size.x, size.z);
    const scale = footprint > 0 ? TARGET_FOOTPRINT / footprint : 1;

    m.scale.setScalar(scale);
    const [cx, cz] = cellCenter(3, 1);
    m.position.set(
      cx - center.x * scale,
      -box.min.y * scale,
      cz - center.z * scale
    );
    return m;
  }, [scene]);

  return <primitive object={fitted} />;
}

export function ResidentialShowroom() {
  return (
    <Suspense fallback={null}>
      <ShowroomModel />
    </Suspense>
  );
}
