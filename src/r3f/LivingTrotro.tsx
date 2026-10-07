/**
 * LivingTrotro.tsx — 3D Trotro van with state machine visualization
 *
 * Renders a procedural trotro van (yellow Sprinter) that responds to
 * TrotroService state changes:
 *
 *   ARRIVING → van drives into position (lerp from off-screen)
 *   IDLE_AT_STOP → van stationary, "doors open" (door mesh rotated)
 *   BOARDING → mate character plays boarding animation
 *   DEPARTING → van drives away (lerp off-screen)
 *
 * Audio: when state → ARRIVING, plays a Mate shout ("Circle! Circle!")
 * via Web Speech API (fallback: console.log if no speech synthesis).
 */

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  TrotroService,
  TrotroState,
  MATE_LINES,
  type TrotroStateChange,
} from '../game/World/TrotroService';

// ── Van component (procedural, since no GLB uploaded) ──────────────────────

const VAN_COLOR = 0xf59e0b;      // yellow body
const VAN_STRIPE = 0xfacc15;     // bright yellow stripe
const VAN_TIRE = 0x1e293b;       // dark tires
const VAN_WINDOW = 0x60a5fa;     // blue windows

function TrotroVan({ doorOpen }: { doorOpen: boolean }) {
  const doorRef = useRef<THREE.Mesh>(null);

  // Animate door open/close
  useFrame(() => {
    if (!doorRef.current) return;
    const target = doorOpen ? -Math.PI * 0.7 : 0;
    doorRef.current.rotation.y += (target - doorRef.current.rotation.y) * 0.1;
  });

  return (
    <group>
      {/* Body */}
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 2.0, 5.2]} />
        <meshStandardMaterial color={VAN_COLOR} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Yellow stripe */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[2.22, 0.25, 5.22]} />
        <meshStandardMaterial color={VAN_STRIPE} roughness={0.45} />
      </mesh>
      {/* Cab front */}
      <mesh position={[0, 1.85, -1.8]} castShadow>
        <boxGeometry args={[2.15, 1.1, 1.4]} />
        <meshStandardMaterial color={VAN_STRIPE} roughness={0.45} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 1.85, -2.51]}>
        <boxGeometry args={[1.8, 0.8, 0.05]} />
        <meshStandardMaterial color={VAN_WINDOW} roughness={0.2} metalness={0.4} transparent opacity={0.7} />
      </mesh>
      {/* Side windows */}
      {[-1.05, 1.05].map((x, i) => (
        <mesh key={`win-${i}`} position={[x, 1.7, 0]}>
          <boxGeometry args={[0.05, 0.6, 3.5]} />
          <meshStandardMaterial color={VAN_WINDOW} roughness={0.2} metalness={0.4} transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Sliding door (animated open/closed) */}
      <mesh ref={doorRef} position={[1.12, 1.3, 0.5]} castShadow>
        <boxGeometry args={[0.06, 1.6, 1.0]} />
        <meshStandardMaterial color={VAN_COLOR} roughness={0.5} />
      </mesh>
      {/* Tires (4) */}
      {[[-0.9, -1.6], [0.9, -1.6], [-0.9, 1.6], [0.9, 1.6]].map(([wx, wz], i) => (
        <mesh key={`tire-${i}`} position={[wx, 0.35, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 12]} />
          <meshStandardMaterial color={VAN_TIRE} roughness={0.9} />
        </mesh>
      ))}
      {/* "CIRCLE" route sign on the dash */}
      <mesh position={[0, 2.2, -1.8]}>
        <boxGeometry args={[1.0, 0.3, 0.05]} />
        <meshStandardMaterial color={0xdc2626} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ── Mate character (simple capsule, animates on boarding) ───────────────────

function MateCharacter({ boarding }: { boarding: boolean }) {
  const mateRef = useRef<THREE.Group>(null);
  const animPhase = useRef(0);

  useFrame((_state, delta) => {
    if (!mateRef.current) return;
    if (boarding) {
      // Boarding animation: bob up and down + sway
      animPhase.current += delta * 4;
      mateRef.current.position.y = 0.9 + Math.sin(animPhase.current) * 0.08;
      mateRef.current.rotation.z = Math.sin(animPhase.current * 0.7) * 0.05;
    } else {
      // Idle: gentle breathing
      animPhase.current += delta * 1.5;
      mateRef.current.position.y = 0.9 + Math.sin(animPhase.current) * 0.02;
      mateRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={mateRef} position={[1.5, 0.9, 1.5]}>
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.5, 6, 12]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#c97f4f" roughness={0.5} />
      </mesh>
      {/* Mate's vest (yellow) */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.42, 0.3, 0.22]} />
        <meshStandardMaterial color={VAN_STRIPE} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ── Audio: Mate shout via Web Speech API ─────────────────────────────────────

function playMateShout(text: string) {
  try {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.2;
      utter.pitch = 0.9;
      utter.volume = 0.7;
      window.speechSynthesis.speak(utter);
    }
  } catch { /* ignore */ }
  console.log(`[trotro] Mate shouts: "${text}"`);
}

// ── Main component ────────────────────────────────────────────────────────────

interface LivingTrotroProps {
  position: [number, number, number];
  trotroService: TrotroService;
}

export function LivingTrotro({ position, trotroService }: LivingTrotroProps) {
  const [state, setState] = useState<TrotroState>(trotroService.getState());
  const vanGroupRef = useRef<THREE.Group>(null);
  const [dialogue, setDialogue] = useState<string>('');

  // Off-screen positions for arriving/departing
  const arriveFrom = useMemo<[number, number, number]>(() => [position[0] - 15, 0, position[2]], [position]);
  const departTo = useMemo<[number, number, number]>(() => [position[0] + 20, 0, position[2]], [position]);

  // Subscribe to state changes
  useEffect(() => {
    const unsub = trotroService.onStateChange((change: TrotroStateChange) => {
      setState(change.state);

      switch (change.state) {
        case 'ARRIVING': {
          const line = MATE_LINES.ARRIVING[Math.floor(Math.random() * MATE_LINES.ARRIVING.length)];
          setDialogue(line);
          playMateShout(line);
          break;
        }
        case 'IDLE_AT_STOP':
          setDialogue(`${trotroService.getSeatsAvailable()} seats. Fare ₵${trotroService.getCanonicalFareGHS()}`);
          break;
        case 'BOARDING':
          setDialogue(MATE_LINES.BOARDED);
          break;
        case 'DEPARTING':
          setDialogue(MATE_LINES.DEPARTING);
          setTimeout(() => setDialogue(''), 3000);
          break;
        case 'EN_ROUTE':
          setDialogue('');
          break;
      }
    });

    // Start the cycle after a brief delay
    const startTimer = setTimeout(() => trotroService.startCycle(), 1500);
    return () => { unsub(); clearTimeout(startTimer); };
  }, [trotroService]);

  // Animate van position based on state
  useFrame((_state, delta) => {
    if (!vanGroupRef.current) return;
    const lerpSpeed = delta * 2;
    let targetX = position[0];

    switch (state) {
      case 'EN_ROUTE':
        targetX = arriveFrom[0]; // off-screen left
        break;
      case 'ARRIVING':
        targetX = position[0]; // lerp to stop
        break;
      case 'IDLE_AT_STOP':
      case 'BOARDING':
        targetX = position[0]; // stationary
        break;
      case 'DEPARTING':
        targetX = departTo[0]; // drive away
        break;
    }

    vanGroupRef.current.position.x += (targetX - vanGroupRef.current.position.x) * lerpSpeed;
  });

  const doorOpen = state === 'IDLE_AT_STOP' || state === 'BOARDING';
  const isBoarding = state === 'BOARDING';

  return (
    <group ref={vanGroupRef} position={arriveFrom}>
      <TrotroVan doorOpen={doorOpen} />
      {/* Mate stands by the door when van is at stop */}
      {(state === 'IDLE_AT_STOP' || state === 'BOARDING') && (
        <MateCharacter boarding={isBoarding} />
      )}
      {/* State indicator + dialogue HTML overlay */}
      {state !== 'EN_ROUTE' && (
        <Html position={[0, 3.5, 0]} center distanceFactor={10}>
          <div style={{
            background: 'rgba(8,8,8,0.92)',
            border: `1.5px solid ${isBoarding ? '#22c55e' : '#facc15'}`,
            borderRadius: '4px',
            padding: '6px 12px',
            color: '#f8fafc',
            fontFamily: 'Arial Narrow, Arial, sans-serif',
            fontSize: '0.7rem',
            fontWeight: 700,
            textAlign: 'center',
            pointerEvents: 'none',
            minWidth: '120px',
          }}>
            <div style={{ color: '#facc15', fontSize: '0.6rem', marginBottom: '2px' }}>
              {state.replace(/_/g, ' ')}
            </div>
            {dialogue && <div style={{ color: '#f8fafc' }}>{dialogue}</div>}
          </div>
        </Html>
      )}
    </group>
  );
}
