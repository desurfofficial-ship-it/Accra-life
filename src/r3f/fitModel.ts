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
 */

import * as THREE from 'three';

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
  // Clone + force matrix update so Box3 measures the post-transform geometry.
  const clone = source.clone(true);
  const group = new THREE.Group();
  group.add(clone);

  // Update world matrices so the bounding box accounts for node scales.
  group.updateMatrixWorld(true);

  // Measure.
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Guard against NaN or zero dimensions.
  if (
    !Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z) ||
    size.x === 0 || size.y === 0 || size.z === 0
  ) {
    console.warn('[scale]', url ?? '(unknown)', 'invalid size:', { x: size.x, y: size.y, z: size.z });
    return group; // Return as-is — AssetBoundary will catch render issues.
  }

  // Compute uniform scale from footprint (max of X and Z).
  const footprint = Math.max(size.x, size.z);
  let scale = footprint > 0 ? maxFootprint / footprint : 1;

  // If maxHeight is given and the height-limited scale is smaller, use that.
  if (maxHeight !== undefined && size.y > 0) {
    const heightScale = maxHeight / size.y;
    scale = Math.min(scale, heightScale);
  }

  // Apply uniform scale to the OUTER group (not the inner clone — preserves
  // the clone's internal node transforms, including non-uniform ones).
  group.scale.setScalar(scale);

  // Re-measure after scaling to re-centre.
  group.updateMatrixWorld(true);
  const fittedBox = new THREE.Box3().setFromObject(group);
  const fittedSize = new THREE.Vector3();
  const fittedCenter = new THREE.Vector3();
  fittedBox.getSize(fittedSize);
  fittedBox.getCenter(fittedCenter);

  // Offset the group so the model's bottom is at y=0 and centred on x=z=0.
  group.position.set(-fittedCenter.x, -fittedBox.min.y, -fittedCenter.z);

  // Dev assertion: if the fitted model is still larger than 2x the target,
  // warn (visible in ?debug=1 overlay via recordAssetFailure).
  const fittedFootprint = Math.max(fittedSize.x, fittedSize.z);
  if (fittedFootprint > maxFootprint * 2 || !Number.isFinite(fittedFootprint)) {
    console.warn('[scale]', url ?? '(unknown)', 'still too large after fit:', {
      target: maxFootprint,
      fittedFootprint,
      fittedSize: { x: fittedSize.x, y: fittedSize.y, z: fittedSize.z },
    });
    // Record for the debug overlay.
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __scaleWarnings?: Array<{ url: string; target: number; fitted: number }> };
      if (!w.__scaleWarnings) w.__scaleWarnings = [];
      w.__scaleWarnings.push({ url: url ?? '(unknown)', target: maxFootprint, fitted: fittedFootprint });
    }
  }

  return group;
}
