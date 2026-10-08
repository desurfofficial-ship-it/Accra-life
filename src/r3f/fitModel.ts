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
 *
 * HARDENING (post PR #16):
 * - Never return an unscaled model when the bbox is zero/invalid.
 *   A zero bbox is treated as "measurement failed" and we apply a
 *   conservative fallback scale so the camera cannot sit inside
 *   10-million-unit market signage.
 * - Absolute post-fit clamp: if fitted footprint still exceeds
 *   maxFootprint * 3, force another uniform shrink.
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
    if (win.__scaleWarnings.length > 40) win.__scaleWarnings.shift();
  }
}

function measureWorldBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      const g = mesh.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingSphere) g.computeBoundingSphere();
    }
  });
  return new THREE.Box3().setFromObject(root);
}

/**
 * Clone an object, measure its bounding box, apply a uniform scale so the
 * footprint fits, and re-centre at origin with the base at y=0.
 * Returns a THREE.Group wrapping the clone.
 *
 * NEVER leaves the model at its raw (often multi-million-unit) scale.
 */
export function fitToFootprint(
  source: THREE.Object3D,
  maxFootprint: number,
  maxHeight?: number,
  url?: string,
): THREE.Group {
  const label = url ?? '(unknown)';

  const clone = source.clone(true);
  const group = new THREE.Group();
  group.name = `fit:${label.split('/').pop() ?? 'model'}`;
  group.add(clone);

  let box = measureWorldBox(group);
  let size = new THREE.Vector3();
  box.getSize(size);

  const invalid =
    !Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z) ||
    size.x <= 0 || size.y <= 0 || size.z <= 0;

  if (invalid) {
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) {
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        mesh.geometry.boundingBox = null;
      }
    });
    box = measureWorldBox(group);
    box.getSize(size);
  }

  const stillInvalid =
    !Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z) ||
    size.x <= 0 || size.y <= 0 || size.z <= 0;

  let scale: number;

  if (stillInvalid) {
    // Measurement failed — do NOT leave the model at raw scale.
    scale = maxFootprint / 1000;
    recordScaleWarning({
      url: label,
      target: maxFootprint,
      fitted: 0,
      raw: { x: size.x, y: size.y, z: size.z },
      reason: `invalid/zero size — applied fallback scale ${scale.toExponential(2)} (was: left unscaled)`,
    });
  } else {
    const footprint = Math.max(size.x, size.z);
    scale = footprint > 0 ? maxFootprint / footprint : 1;

    if (maxHeight !== undefined && size.y > 0) {
      const heightScale = maxHeight / size.y;
      scale = Math.min(scale, heightScale);
    }

    const MAX_SCALE_UP = 50;
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
  }

  group.scale.setScalar(scale);

  const fittedBox = measureWorldBox(group);
  const fittedSize = new THREE.Vector3();
  const fittedCenter = new THREE.Vector3();
  fittedBox.getSize(fittedSize);
  fittedBox.getCenter(fittedCenter);

  const fittedFootprint = Math.max(fittedSize.x, fittedSize.z);
  if (Number.isFinite(fittedFootprint) && fittedFootprint > maxFootprint * 3) {
    const extra = maxFootprint / fittedFootprint;
    group.scale.multiplyScalar(extra);
    recordScaleWarning({
      url: label,
      target: maxFootprint,
      fitted: fittedFootprint,
      raw: { x: size.x, y: size.y, z: size.z },
      reason: `post-fit still ${fittedFootprint.toFixed(1)} (>3× target) — forced extra ×${extra.toExponential(2)}`,
    });
    const box2 = measureWorldBox(group);
    box2.getSize(fittedSize);
    box2.getCenter(fittedCenter);
    fittedBox.copy(box2);
  }

  group.position.set(-fittedCenter.x, -fittedBox.min.y, -fittedCenter.z);

  const finalFootprint = Math.max(fittedSize.x, fittedSize.z);
  if (finalFootprint > maxFootprint * 2 || !Number.isFinite(finalFootprint)) {
    recordScaleWarning({
      url: label,
      target: maxFootprint,
      fitted: finalFootprint,
      raw: { x: size.x, y: size.y, z: size.z },
      reason: 'still too large after fit',
    });
  }

  return group;
}
