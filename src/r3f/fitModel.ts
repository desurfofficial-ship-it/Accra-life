/**
 * fitModel.ts — auto-scale any 3D model to a target footprint.
 *
 * Every downloaded GLB uses wildly different units (chinese_market at
 * 10.6M units, house_exterior at 17,500, building_office at 7,650).
 * Hand-tuned SCALES constants don't compensate reliably.
 *
 * fitToFootprint() measures the model's bounding box AFTER applying
 * all node transforms (updateMatrixWorld), then applies a UNIFORM
 * scale so max(sizeX, sizeZ) = maxFootprint (and height <= maxHeight
 * if given). The result is wrapped in a group so the original node
 * transforms (including non-uniform ones like mini_market's
 * (18.9, 39.5, 0.43)) stay inside — the outer scale stays uniform.
 *
 * After scaling, the model is re-centred: x=z=0, bottom at y=0.
 *
 * IMPORTANT: callers MUST place the returned group via a parent
 *   <group position={[x,y,z]}><primitive object={fitted} /></group>
 * and MUST NOT set position/scale on the primitive itself — that would
 * overwrite the centering offset computed here.
 */

import * as THREE from 'three';

export type ScaleWarning = {
  url: string;
  target: number;
  fitted: number;
  raw?: { x: number; y: number; z: number };
  reason: string;
};

function recordScaleWarning(w: ScaleWarning): void {
  console.warn('[scale]', w.url, w.reason, w);
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __scaleWarnings?: ScaleWarning[] };
    if (!win.__scaleWarnings) win.__scaleWarnings = [];
    win.__scaleWarnings.push(w);
    // Keep bounded
    if (win.__scaleWarnings.length > 40) win.__scaleWarnings.shift();
  }
}

/**
 * Measure a tight world-space AABB, forcing geometry bounding boxes
 * so empty/uninitialized geometries don't under-measure (which would
 * over-scale and put the camera inside giant signage).
 */
function measureWorldBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  // Ensure every mesh has a local bounding box computed.
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      const g = mesh.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
    }
  });
  return new THREE.Box3().setFromObject(root);
}

/**
 * Clone an object, update its world matrices, measure its bounding box,
 * apply a uniform scale so the footprint fits, and re-centre at origin
 * with the base at y=0. Returns a THREE.Group wrapping the clone.
 *
 * @param source The original loaded scene/mesh (NOT mutated — cloned).
 * @param maxFootprint Target value for max(size.x, size.z) in world units.
 * @param maxHeight Optional max height. If the height-limited scale is
 *                  smaller than the footprint-limited scale, the smaller
 *                  one wins (so tall thin models don't exceed maxHeight).
 * @param url Optional URL for the dev assertion warning.
 * @returns A new THREE.Group containing the fitted clone.
 */
export function fitToFootprint(
  source: THREE.Object3D,
  maxFootprint: number,
  maxHeight?: number,
  url?: string,
): THREE.Group {
  const label = url ?? '(unknown)';

  // Clone + force matrix update so Box3 measures the post-transform geometry.
  const clone = source.clone(true);
  const group = new THREE.Group();
  group.name = `fit:${label.split('/').pop() ?? 'model'}`;
  group.add(clone);

  const box = measureWorldBox(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Guard against NaN or zero dimensions.
  if (
    !Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z) ||
    size.x === 0 || size.y === 0 || size.z === 0
  ) {
    recordScaleWarning({
      url: label,
      target: maxFootprint,
      fitted: 0,
      raw: { x: size.x, y: size.y, z: size.z },
      reason: 'invalid/zero size — left unscaled',
    });
    return group;
  }

  // Compute uniform scale from footprint (max of X and Z).
  const footprint = Math.max(size.x, size.z);
  let scale = footprint > 0 ? maxFootprint / footprint : 1;

  // If maxHeight is given and the height-limited scale is smaller, use that.
  if (maxHeight !== undefined && size.y > 0) {
    const heightScale = maxHeight / size.y;
    scale = Math.min(scale, heightScale);
  }

  // Safety clamps: never explode a near-zero measurement into a megastructure,
  // and never shrink a sane model into invisibility via a bad target.
  const MAX_SCALE_UP = 50; // if model is already smaller than target, allow up to 50×
  const MIN_SCALE = 1e-8;
  if (scale > MAX_SCALE_UP) {
    recordScaleWarning({
      url: label,
      target: maxFootprint,
      fitted: footprint * MAX_SCALE_UP,
      raw: { x: size.x, y: size.y, z: size.z },
      reason: `scale ${scale.toExponential(2)} capped at ${MAX_SCALE_UP}× (possible under-measured bbox)`,
    });
    scale = MAX_SCALE_UP;
  }
  if (scale < MIN_SCALE) {
    recordScaleWarning({
      url: label,
      target: maxFootprint,
      fitted: footprint * MIN_SCALE,
      raw: { x: size.x, y: size.y, z: size.z },
      reason: `scale ${scale.toExponential(2)} below min — left at min`,
    });
    scale = MIN_SCALE;
  }

  // Apply uniform scale to the OUTER group (not the inner clone — preserves
  // the clone's internal node transforms, including non-uniform ones).
  group.scale.setScalar(scale);

  // Re-measure after scaling to re-centre.
  const fittedBox = measureWorldBox(group);
  const fittedSize = new THREE.Vector3();
  const fittedCenter = new THREE.Vector3();
  fittedBox.getSize(fittedSize);
  fittedBox.getCenter(fittedCenter);

  // Offset the group so the model's bottom is at y=0 and centred on x=z=0.
  // Callers must NOT overwrite this via <primitive position=...>; place via
  // a parent <group position={[x,y,z]}> instead.
  group.position.set(-fittedCenter.x, -fittedBox.min.y, -fittedCenter.z);

  // Dev assertion: if the fitted model is still larger than 2× the target,
  // warn (visible in ?debug=1 overlay via window.__scaleWarnings).
  const fittedFootprint = Math.max(fittedSize.x, fittedSize.z);
  if (fittedFootprint > maxFootprint * 2 || !Number.isFinite(fittedFootprint)) {
    recordScaleWarning({
      url: label,
      target: maxFootprint,
      fitted: fittedFootprint,
      raw: { x: size.x, y: size.y, z: size.z },
      reason: 'still too large after fit',
    });
  }

  return group;
}
