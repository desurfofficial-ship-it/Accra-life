import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { cellCenter } from './AccraCityGrid';
import { assetUrl } from '../assetUrl';

function BeachBall({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF(assetUrl('assets/glb/beach/beach_ball.glb'), assetUrl('draco/'));
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} position={position} scale={0.5} castShadow />;
}
function BeachTable({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const { scene } = useGLTF(assetUrl('assets/glb/beach/beach_table.glb'), assetUrl('draco/'));
  const cloned = useMemo(() => { const m = scene.clone(true); m.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } }); return m; }, [scene]);
  return <primitive object={cloned} position={position} rotation={[0, rotation, 0]} scale={0.6} />;
}
function BeachKit({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF(assetUrl('assets/glb/beach/beach_kit.glb'), assetUrl('draco/'));
  const cloned = useMemo(() => { const m = scene.clone(true); m.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } }); return m; }, [scene]);
  return <primitive object={cloned} position={position} scale={0.5} />;
}
function BeachReef({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF(assetUrl('assets/glb/beach/beach_reef.glb'), assetUrl('draco/'));
  const cloned = useMemo(() => { const m = scene.clone(true); m.traverse((c) => { if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; } }); return m; }, [scene]);
  return <primitive object={cloned} position={position} scale={0.4} />;
}
export function BeachProps() {
  const [c0X, c0Z] = cellCenter(4, 0), [c1X, c1Z] = cellCenter(4, 1);
  return (<Suspense fallback={null}>
    <BeachBall position={[c0X + 1, 0.5, c0Z]} />
    <BeachTable position={[c0X - 2, 0, c0Z + 1]} rotation={0.5} />
    <BeachKit position={[c1X - 1, 0, c1Z]} />
    <BeachReef position={[c1X + 2, 0, c1Z + 2]} />
  </Suspense>);
}
// REMOVED FOR BOOT PAYLOAD: useGLTF.preload(assetUrl('assets/glb/beach/beach_ball.glb'));
