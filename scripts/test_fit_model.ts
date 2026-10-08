/**
 * test_fit_model.ts — fitToFootprint unit tests.
 * Run: npx --yes tsx scripts/test_fit_model.ts
 */
import * as THREE from 'three';
import { fitToFootprint } from '../src/r3f/fitModel';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL  ${msg}`);
  }
}

function footprintOf(obj: THREE.Object3D): number {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  return Math.max(size.x, size.z);
}

console.log('=== fitToFootprint tests ===');

{
  const geo = new THREE.BoxGeometry(10000, 2000, 8000);
  const mesh = new THREE.Mesh(geo);
  mesh.scale.setScalar(0.001);
  const group = new THREE.Group();
  group.add(mesh);

  const fitted = fitToFootprint(group, 10, 15, 'test-big-0.001');
  const fp = footprintOf(fitted);
  assert(Math.abs(fp - 10) / 10 < 0.05, `big+0.001 → footprint≈10 got ${fp.toFixed(3)}`);
}

{
  const geo = new THREE.BoxGeometry(56, 98, 139);
  const mesh = new THREE.Mesh(geo);
  mesh.scale.set(18.9, 39.5, 0.43);
  const group = new THREE.Group();
  group.add(mesh);

  const fitted = fitToFootprint(group, 9.6, 14.4, 'test-nonuniform');
  const fp = footprintOf(fitted);
  assert(fp <= 9.6 * 1.05, `non-uniform footprint ≤9.6 got ${fp.toFixed(3)}`);
}

{
  const geo = new THREE.BoxGeometry(5, 100, 5);
  const mesh = new THREE.Mesh(geo);
  const fitted = fitToFootprint(mesh, 20, 10, 'test-tall');
  fitted.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(fitted);
  const size = new THREE.Vector3();
  box.getSize(size);
  assert(size.y <= 10 * 1.05, `height ≤10 got ${size.y.toFixed(3)}`);
}

{
  const empty = new THREE.Group();
  const fitted = fitToFootprint(empty, 10, undefined, 'test-empty');
  assert(
    Math.abs(fitted.scale.x - 10 / 1000) < 1e-6,
    `empty gets fallback scale 0.01 got ${fitted.scale.x}`,
  );
}

{
  const geo = new THREE.BoxGeometry(4, 6, 4);
  const mesh = new THREE.Mesh(geo);
  mesh.position.y = 100;
  const fitted = fitToFootprint(mesh, 8, undefined, 'test-y0');
  fitted.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(fitted);
  assert(Math.abs(box.min.y) < 0.05, `bottom≈0 got ${box.min.y.toFixed(4)}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
