/**
 * BeachProps.tsx — Beach GLB assets in Labadi district
 *
 * Loads beach-themed GLB models and places them in the Labadi Beach
 * district (cells [4,0] to [4,1]) of the AccraCityGrid.
 *
 * Assets (all CC0/free-license):
 *   - beach_ball.glb (116KB) — colorful beach ball
 *   - beach_table.glb (3.6MB) — beach side table
 *   - beach_reef.glb (8.6MB) — underwater reef detail
 *   - beach_kit.glb (9MB) — assorted beach items
 *
 * Uses useGLTF from @react-three/drei with Suspense for async loading.
 * Models are lazily loaded — only when this component renders.
 */

import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';

// ── Beach ball (small, lightweight — always loaded) ────────────────────────

function BeachBall({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/assets/glb/beach/beach_ball.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <primitive object={cloned} position={position} scale={0.5} castShadow />
  );
}

// ── Beach table ─────────────────────────────────────────────────────────────

function BeachTable({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const { scene } = useGLTF('/assets/glb/beach/beach_table.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);

  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={0.6} />
  );
}

// ── Beach kit (assorted items) ──────────────────────────────────────────────

function BeachKit({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/assets/glb/beach/beach_kit.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);

  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <primitive object={cloned} position={position} scale={0.5} />
  );
}

// ── Beach reef (underwater detail) ──────────────────────────────────────────

function BeachReef({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/assets/glb/beach/beach_reef.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);

  cloned.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <primitive object={cloned} position={position} scale={0.4} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BeachProps() {
  const [cell0X, cell0Z] = cellCenter(4, 0); // Labadi cell [4,0]
  const [cell1X, cell1Z] = cellCenter(4, 1); // Labadi cell [4,1]

  return (
    <Suspense fallback={null}>
      {/* Cell [4,0] — beach ball + table */}
      <BeachBall position={[cell0X + 1, 0.5, cell0Z]} />
      <BeachTable position={[cell0X - 2, 0, cell0Z + 1]} rotation={0.5} />

      {/* Cell [4,1] — beach kit + reef */}
      <BeachKit position={[cell1X - 1, 0, cell1Z]} />
      <BeachReef position={[cell1X + 2, 0, cell1Z + 2]} />
    </Suspense>
  );
}

// Preload the smallest asset for fast initial load
useGLTF.preload('/assets/glb/beach/beach_ball.glb');
