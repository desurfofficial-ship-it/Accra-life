/**
 * ObjectiveMarker.tsx — the player-facing objective waypoint (playability
 * patch rule 2).
 *
 * The systems layer already tracks the active job/hustle step target and
 * renders a beacon for it — but inside the SIMULATION scene, which has its
 * renderer disabled when the R3F map owns the view, so nobody ever saw it.
 * This component mirrors that beacon into the RENDERED world:
 *
 *   - Polls GameAPI.interactions.getObjectiveTarget() (250 ms) for the
 *     active objective's registered world position.
 *   - Renders a pulsing ground ring + floating diamond icon there.
 *   - When Act is pressed out of range (flashObjectiveMarker()), it
 *     flashes gold and pulses harder for ~1.6s.
 *
 * Positions come straight from the registered InteractableTargets, which
 * are anchored to GridMap venue anchors — the same coordinate space the
 * R3F city grid is built on — so the marker sits exactly where the player
 * has to walk.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getGameAPI } from './gameAPIBridge';

interface MarkerSnapshot {
  x: number;
  y: number;
  z: number;
}

const RING_COLOR_ACTIVE = 0x10b981; // emerald — matches the systems beacon
const RING_COLOR_FLASH = 0xfacc15; // gold — Act-pressed-out-of-range attention

export function ObjectiveMarker() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const diamondRef = useRef<THREE.Mesh>(null);
  const [target, setTarget] = useState<MarkerSnapshot | null>(null);
  const flashRef = useRef(false);

  // Poll the interactions system for the active objective target. Polling
  // (not events) keeps this component decoupled from the systems layer —
  // it renders null pre-boot and picks the objective up whenever the
  // bridge appears, exactly like TroTroPrompt / LivingTrotro do.
  useEffect(() => {
    const id = window.setInterval(() => {
      const interactions = getGameAPI()?.interactions;
      if (!interactions) return;
      const objTarget = interactions.getObjectiveTarget();
      flashRef.current = interactions.isObjectiveFlashing();
      const next: MarkerSnapshot | null = objTarget
        ? { x: objTarget.position.x, y: objTarget.position.y, z: objTarget.position.z }
        : null;
      setTarget((prev) =>
        prev && next && prev.x === next.x && prev.y === next.y && prev.z === next.z
          ? prev
          : next
      );
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  // Pulse animation: gentle breathing when idle, hard gold flash when the
  // player pressed Act while out of range (rule 3's "briefly highlight").
  useFrame((state) => {
    const group = groupRef.current;
    const ring = ringRef.current;
    const diamond = diamondRef.current;
    if (!group || !ring || !diamond) return;
    const t = state.clock.elapsedTime;
    const flashing = flashRef.current;
    const ringMat = ring.material as THREE.MeshBasicMaterial;
    const diamondMat = diamond.material as THREE.MeshBasicMaterial;
    ringMat.color.setHex(flashing ? RING_COLOR_FLASH : RING_COLOR_ACTIVE);
    diamondMat.color.setHex(flashing ? RING_COLOR_FLASH : 0x34d399);
    const ringPulse = 1 + Math.sin(t * (flashing ? 9 : 3.4)) * (flashing ? 0.28 : 0.1);
    ring.scale.set(ringPulse, ringPulse, 1);
    ringMat.opacity = flashing ? 0.95 : 0.75 + Math.sin(t * 3.4) * 0.15;
    diamond.position.y = 2.1 + Math.sin(t * (flashing ? 5 : 1.9)) * (flashing ? 0.28 : 0.15);
    diamond.rotation.y += 0.03;
  });

  if (!target) return null;

  return (
    <group ref={groupRef} position={[target.x, target.y, target.z]}>
      {/* Pulsing ground ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.9, 1.18, 40]} />
        <meshBasicMaterial color={RING_COLOR_ACTIVE} side={THREE.DoubleSide} transparent opacity={0.8} depthWrite={false} />
      </mesh>
      {/* Inner dot ring for weight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.32, 0.44, 32]} />
        <meshBasicMaterial color={RING_COLOR_ACTIVE} side={THREE.DoubleSide} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {/* Floating diamond icon */}
      <mesh ref={diamondRef} position={[0, 2.1, 0]}>
        <octahedronGeometry args={[0.26, 0]} />
        <meshBasicMaterial color={0x34d399} />
      </mesh>
    </group>
  );
}
