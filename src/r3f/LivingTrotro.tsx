/**
 * LivingTrotro.tsx — 3D Trotro van with state machine + real GLB models
 *
 * Uses the uploaded van GLB models instead of procedural geometry.
 * The `small_van.glb` (2.7MB) is the primary model — lightweight enough
 * for browser. The other two (european_delivery_van 35MB, retro_vw 2.6MB)
 * are available as alternatives via the `vanModel` prop.
 *
 * State machine drives:
 *   ARRIVING → van drives into position (lerp from off-screen)
 *   IDLE_AT_STOP → van stationary, doors open (door mesh rotated)
 *   BOARDING → mate character plays boarding animation
 *   DEPARTING → van drives away (lerp off-screen)
 *
 * Audio: when state → ARRIVING, plays a Mate shout ("Circle! Circle!")
 * via Web Speech API (fallback: console.log if no speech synthesis).
 */

import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { assetUrl } from '../assetUrl';
import {
  TrotroService,
  TrotroState,
  MATE_LINES,
  type TrotroStateChange,
} from '../game/World/TrotroService';
import { eventService } from '../game/World/EventService';

// ── Van model selector ─────────────────────────────────────────────────────

export type VanModelId = 'small_van' | 'european_delivery_van' | 'retro_vw';

const VAN_PATHS: Record<VanModelId, string> = {
  small_van: assetUrl('assets/glb/vehicles/small_van.glb'),
  european_delivery_van: assetUrl('assets/glb/vehicles/european_delivery_van.glb'),
  retro_vw: assetUrl('assets/glb/vehicles/retro_anime_vintage_volkswagen_van.glb'),
};

// Scale tuning per model (GLB exports vary wildly in scale)
const VAN_SCALES: Record<VanModelId, number> = {
  small_van: 0.5,
  european_delivery_van: 0.3,
  retro_vw: 0.4,
};

// ── GLB Van component ──────────────────────────────────────────────────────

function GLBVan({ modelId, doorOpen }: { modelId: VanModelId; doorOpen: boolean }) {
  const url = VAN_PATHS[modelId];
  const scale = VAN_SCALES[modelId];
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    const m = scene.clone(true);
    m.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Tint the van yellow for trotro branding (override material color)
        if (child.material instanceof THREE.MeshStandardMaterial) {
          const mat = child.material.clone();
          mat.color = new THREE.Color(0xf59e0b); // MTN yellow
          mat.roughness = 0.5;
          child.material = mat;
        }
      }
    });
    return m;
  }, [scene]);

  // Try to find and animate a "door" child mesh
  const doorRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    cloned.traverse((child) => {
      const name = (child.name || '').toLowerCase();
      if (name.includes('door') || name.includes('slide') || name.includes('passenger')) {
        doorRef.current = child;
      }
    });
  }, [cloned]);

  useFrame(() => {
    if (!doorRef.current) return;
    const target = doorOpen ? -Math.PI * 0.6 : 0;
    doorRef.current.rotation.y += (target - doorRef.current.rotation.y) * 0.1;
  });

  return <primitive object={cloned} scale={scale} />;
}

// ── Procedural fallback van (if GLB fails to load) ─────────────────────────

const VAN_COLOR = 0xf59e0b;
const VAN_STRIPE = 0xfacc15;
const VAN_TIRE = 0x1e293b;
const VAN_WINDOW = 0x60a5fa;

function ProceduralVan({ doorOpen }: { doorOpen: boolean }) {
  const doorRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!doorRef.current) return;
    const target = doorOpen ? -Math.PI * 0.7 : 0;
    doorRef.current.rotation.y += (target - doorRef.current.rotation.y) * 0.1;
  });

  return (
    <group>
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 2.0, 5.2]} />
        <meshStandardMaterial color={VAN_COLOR} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[2.22, 0.25, 5.22]} />
        <meshStandardMaterial color={VAN_STRIPE} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.85, -1.8]} castShadow>
        <boxGeometry args={[2.15, 1.1, 1.4]} />
        <meshStandardMaterial color={VAN_STRIPE} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.85, -2.51]}>
        <boxGeometry args={[1.8, 0.8, 0.05]} />
        <meshStandardMaterial color={VAN_WINDOW} roughness={0.2} metalness={0.4} transparent opacity={0.7} />
      </mesh>
      {[-1.05, 1.05].map((x, i) => (
        <mesh key={`win-${i}`} position={[x, 1.7, 0]}>
          <boxGeometry args={[0.05, 0.6, 3.5]} />
          <meshStandardMaterial color={VAN_WINDOW} roughness={0.2} metalness={0.4} transparent opacity={0.6} />
        </mesh>
      ))}
      <mesh ref={doorRef} position={[1.12, 1.3, 0.5]} castShadow>
        <boxGeometry args={[0.06, 1.6, 1.0]} />
        <meshStandardMaterial color={VAN_COLOR} roughness={0.5} />
      </mesh>
      {[[-0.9, -1.6], [0.9, -1.6], [-0.9, 1.6], [0.9, 1.6]].map(([wx, wz], i) => (
        <mesh key={`tire-${i}`} position={[wx, 0.35, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.25, 12]} />
          <meshStandardMaterial color={VAN_TIRE} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -1.8]}>
        <boxGeometry args={[1.0, 0.3, 0.05]} />
        <meshStandardMaterial color={0xdc2626} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ── Van wrapper (tries GLB, falls back to procedural) ──────────────────────

function TrotroVan({ doorOpen, vanModel }: { doorOpen: boolean; vanModel: VanModelId }) {
  return (
    <Suspense fallback={<ProceduralVan doorOpen={doorOpen} />}>
      <GLBVan modelId={vanModel} doorOpen={doorOpen} />
    </Suspense>
  );
}

// ── Mate character ──────────────────────────────────────────────────────────

function MateCharacter({ boarding }: { boarding: boolean }) {
  const mateRef = useRef<THREE.Group>(null);
  const animPhase = useRef(0);

  useFrame((_state, delta) => {
    if (!mateRef.current) return;
    if (boarding) {
      animPhase.current += delta * 4;
      mateRef.current.position.y = 0.9 + Math.sin(animPhase.current) * 0.08;
      mateRef.current.rotation.z = Math.sin(animPhase.current * 0.7) * 0.05;
    } else {
      animPhase.current += delta * 1.5;
      mateRef.current.position.y = 0.9 + Math.sin(animPhase.current) * 0.02;
      mateRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={mateRef} position={[1.5, 0.9, 1.5]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.2, 0.5, 6, 12]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color="#c97f4f" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.42, 0.3, 0.22]} />
        <meshStandardMaterial color={VAN_STRIPE} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ── Audio ────────────────────────────────────────────────────────────────────

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
  vanModel?: VanModelId;
}

export function LivingTrotro({ position, trotroService, vanModel = 'small_van' }: LivingTrotroProps) {
  const [state, setState] = useState<TrotroState>(trotroService.getState());
  const vanGroupRef = useRef<THREE.Group>(null);
  const [dialogue, setDialogue] = useState<string>('');

  const arriveFrom = useMemo<[number, number, number]>(() => [position[0] - 15, 0, position[2]], [position]);
  const departTo = useMemo<[number, number, number]>(() => [position[0] + 20, 0, position[2]], [position]);

  useEffect(() => {
    const unsub = trotroService.onStateChange((change: TrotroStateChange) => {
      setState(change.state);
      switch (change.state) {
        case 'ARRIVING': {
          // v4.9: RUSH_HOUR barks the surge lines; NORMAL keeps the relaxed
          // route-call pool. The event is read from the shared singleton so
          // both van layers agree even though each owns a TrotroService.
          const rush = eventService.isRushHour();
          const pool = rush ? MATE_LINES.RUSH_HOUR : MATE_LINES.ARRIVING;
          const line = pool[Math.floor(Math.random() * pool.length)];
          setDialogue(line);
          playMateShout(line);
          break;
        }
        case 'IDLE_AT_STOP': {
          // v4.8 culture pass: the dwell is when a real Mate is LOUDEST —
          // bark a change-call / fill-up grumble instead of a dry seats readout
          // (fare + balance stay on the GTA prompt and the Mate panel).
          // v4.9: during RUSH_HOUR the bark carries the surge price.
          const rush = eventService.isRushHour();
          const dwell = rush
            ? MATE_LINES.RUSH_HOUR[Math.floor(Math.random() * MATE_LINES.RUSH_HOUR.length)]
            : MATE_LINES.DWELL[Math.floor(Math.random() * MATE_LINES.DWELL.length)];
          setDialogue(dwell);
          playMateShout(dwell);
          break;
        }
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
    const startTimer = setTimeout(() => trotroService.startCycle(), 1500);
    return () => { unsub(); clearTimeout(startTimer); };
  }, [trotroService]);

  useFrame((_state, delta) => {
    if (!vanGroupRef.current) return;
    const lerpSpeed = delta * 2;
    let targetX = position[0];
    switch (state) {
      case 'EN_ROUTE': targetX = arriveFrom[0]; break;
      case 'ARRIVING': targetX = position[0]; break;
      case 'IDLE_AT_STOP':
      case 'BOARDING': targetX = position[0]; break;
      case 'DEPARTING': targetX = departTo[0]; break;
    }
    vanGroupRef.current.position.x += (targetX - vanGroupRef.current.position.x) * lerpSpeed;
  });

  const doorOpen = state === 'IDLE_AT_STOP' || state === 'BOARDING';
  const isBoarding = state === 'BOARDING';

  return (
    <group ref={vanGroupRef} position={arriveFrom}>
      <TrotroVan doorOpen={doorOpen} vanModel={vanModel} />
      {(state === 'IDLE_AT_STOP' || state === 'BOARDING') && (
        <MateCharacter boarding={isBoarding} />
      )}
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

// Preload the primary van model
// REMOVED FOR BOOT PAYLOAD: useGLTF.preload(VAN_PATHS.small_van);
// REMOVED FOR BOOT PAYLOAD: useGLTF.preload(VAN_PATHS.retro_vw);
