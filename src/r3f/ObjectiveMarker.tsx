/**
 * ObjectiveMarker — glowing ring + floating label at the active job/hustle
 * target in the R3F map (Phase1Scene beacons are invisible when r3f owns the canvas).
 */
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

type ObjPos = { x: number; y: number; z: number; label?: string } | null;

function readObjective(): ObjPos {
  return (window as unknown as { __objectiveWorldPos?: ObjPos }).__objectiveWorldPos ?? null;
}

export function ObjectiveMarker() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const pulse = useRef(0);

  useFrame((_, dt) => {
    const pos = readObjective();
    if (!pos || !groupRef.current) {
      if (visible) setVisible(false);
      if (label) setLabel(null);
      return;
    }
    if (!visible) setVisible(true);
    groupRef.current.position.set(pos.x, 0.05, pos.z);
    if (pos.label && pos.label !== label) setLabel(pos.label);
    pulse.current += dt * 4;
    if (ringRef.current) {
      const s = 1 + Math.sin(pulse.current) * 0.12;
      ringRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group ref={groupRef} visible={visible}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.05, 32]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshBasicMaterial color="#6ee7b7" />
      </mesh>
      {label && (
        <Html position={[0, 3.0, 0]} center distanceFactor={12}>
          <div
            style={{
              background: 'rgba(6,28,18,0.92)',
              border: '1.5px solid #34d399',
              borderRadius: 6,
              padding: '4px 10px',
              color: '#ecfdf5',
              fontFamily: 'system-ui,sans-serif',
              fontSize: '0.7rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}
