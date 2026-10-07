/**
 * TroTroStop.tsx — Modular Tro-tro Stop component for R3F
 *
 * Renders a simple yellow cylinder (representing the stop sign) at a
 * configurable position. Designed to be drop-in modular:
 *
 *   <TroTroStop position={[0, 0, 0]} />
 *
 * Props:
 *   position  — [x, y, z] world position (default [0, 0, 0])
 *   height    — sign post height in meters (default 3.0)
 *   radius    — sign panel radius (default 0.3)
 *
 * Ready to hook into tro-tro-system.md skill logic: the component exposes
 * its position via a forwarded ref so external systems can query it for
 * distance checks, boarding triggers, etc.
 */

import { forwardRef, type ReactNode } from 'react';

export interface TroTroStopProps {
  position?: [number, number, number];
  height?: number;
  radius?: number;
  children?: ReactNode;
}

export const TroTroStop = forwardRef<THREE.Group, TroTroStopProps>(
  ({ position = [0, 0, 0], height = 3.0, radius = 0.3, children }, ref) => {
    return (
      <group ref={ref} position={position}>
        {/* Sign post — steel cylinder */}
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.05, height, 8]} />
          <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Yellow sign panel at the top — the visual identifier */}
        <mesh position={[0, height * 0.45, 0]} castShadow>
          <cylinderGeometry args={[radius, radius, 0.08, 6]} />
          <meshStandardMaterial
            color="#facc15"
            roughness={0.35}
            emissive="#facc15"
            emissiveIntensity={0.15}
          />
        </mesh>

        {/* Small base plate at ground level for visual grounding */}
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.15, 0.18, 0.04, 12]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>

        {/* Optional children — other components can attach to the stop
            (e.g. a shelter, bench, or interaction zone mesh) */}
        {children}
      </group>
    );
  }
);

TroTroStop.displayName = 'TroTroStop';
