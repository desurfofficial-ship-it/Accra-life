/**
 * TroTroBoarding.tsx — tro-tro boarding on the custom map, wired to the
 * REAL game systems (skills/tro-tro-system.md v4.6 six-method contract).
 *
 * Labels: NEVER use <Html distanceFactor> under OrthographicCamera —
 * drei scales by camera.zoom (~100× too big on phone).
 */

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TroTroStop } from './TroTroStop';
import { getGameAPI, TROTRO_BOARD_EVENT } from './gameAPIBridge';
import {
  TROTRO_DESTINATIONS,
  destinationArrival,
  type TrotroDestination
} from '../game/World/GridMap';
import { MATE_LINES } from '../game/World/TrotroService';
import {
  reportWorldLabel,
  shouldShowWorldLabel,
  tickWorldLabelFrame,
} from './worldLabel';

const CAPACITY = 14;
const INTERACTION_RANGE = 3.0;
const VAN_CYCLE_MS = 30_000;
const E_KEY_RANGE = 3.5;
export const DEMO_FARE = 5;
export const DEMO_START_BALANCE = 20;
const TROTRO_TICKET_ITEM_ID = 'trotro_ticket_osu_circle';

const MATE_DIALOGUE = {
  greeting: [
    'Circle! Circle! Enter well!',
    'Oga, move inside make we go!',
    'Last stop! Enter make we move!',
  ],
  full: 'No space! Next one!',
  insufficient: 'Oga, you no get change? Abeg shift make others enter.',
  boarded: 'Make you sit well. We dey go!',
  rushGreeting: 'Circle! Circle! Rush hour o! No time to argue, enter or stay!',
  roofTap: 'Make you tap the roof — I go branch!',
};

const GREETING_SEQUENCE_MS = 1500;
const RUSH_GREETING_SEQUENCE_MS = 700;

interface BoardingState {
  phase: 'idle' | 'greeting' | 'capacity_check' | 'fare_check' | 'debiting' | 'ticketing' | 'boarding' | 'transit' | 'arrived' | 'rejected';
  dialogue: string;
  currentPassengers: number;
  vanDepartedAt: number | null;
  playerBalance: number;
  ticketIssued: boolean;
}

const INITIAL_STATE: BoardingState = {
  phase: 'idle',
  dialogue: '',
  currentPassengers: 12,
  vanDepartedAt: null,
  playerBalance: 20,
  ticketIssued: false,
};

interface TroTroBoardingProps {
  stopPosition: [number, number, number];
  playerRef: React.RefObject<THREE.Group | null>;
  onArriveAt?: (destinationId: string) => void;
}

export function TroTroBoarding({ stopPosition, playerRef, onArriveAt }: TroTroBoardingProps) {
  const [state, setState] = useState<BoardingState>(INITIAL_STATE);
  const [labelVisible, setLabelVisible] = useState(false);
  const labelId = 'trotro-boarding-stop';
  const wasInRangeRef = useRef(false);
  const stepTimerRef = useRef<number>(0);
  const selectedDestinationRef = useRef<string>('circle');
  const phaseRef = useRef(state.phase);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  const stopRef = useRef<THREE.Group>(null);
  const signMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const doorFare = useCallback(() => {
    const api = getGameAPI();
    return api ? api.getFareDue() : DEMO_FARE;
  }, []);

  const syncFromAPI = useCallback(() => {
    const api = getGameAPI();
    if (!api) return;
    setState(s => ({
      ...s,
      currentPassengers: api.getCurrentPassengers(),
      playerBalance: api.getCashBalance(),
      ticketIssued: api.hasOwnedItem(TROTRO_TICKET_ITEM_ID),
    }));
  }, []);

  const startGreeting = useCallback(() => {
    const api = getGameAPI();
    const rush = api?.getCurrentEvent() === 'RUSH_HOUR';
    const line = rush
      ? MATE_DIALOGUE.rushGreeting
      : MATE_DIALOGUE.greeting[Math.floor(Math.random() * MATE_DIALOGUE.greeting.length)];
    setState(s => ({ ...s, phase: 'greeting', dialogue: line }));
    syncFromAPI();
    stepTimerRef.current = performance.now();
  }, [syncFromAPI]);

  const sequenceDelayMs = useCallback(() => {
    const api = getGameAPI();
    return api?.getCurrentEvent() === 'RUSH_HOUR' ? RUSH_GREETING_SEQUENCE_MS : GREETING_SEQUENCE_MS;
  }, []);

  const checkCapacity = useCallback(() => {
    const api = getGameAPI();
    if (api) {
      const status = api.getTrotroStatus();
      if (status !== 'IDLE_AT_STOP' && status !== 'BOARDING') {
        const line = status === 'DEPARTING' ? MATE_LINES.MISSED : MATE_LINES.NOT_AT_STOP;
        console.log(`[tro-tro] van ${status} — boarding refused: "${line}"`);
        setState(s => ({
          ...s,
          phase: 'rejected',
          dialogue: line,
          vanDepartedAt: status === 'DEPARTING' ? performance.now() : s.vanDepartedAt,
        }));
        return;
      }
      if (api.isTrotroFull()) {
        console.log(`[tro-tro] Mate: "${MATE_DIALOGUE.full}" (van ${api.getCurrentPassengers()}/${api.getCapacity()})`);
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now() }));
        return;
      }
      setState(s => ({
        ...s,
        phase: 'capacity_check',
        dialogue: api.getCurrentEvent() === 'RUSH_HOUR'
          ? `${MATE_DIALOGUE.rushGreeting} ₵${api.getFareDue()} — ${api.getSeatsAvailable()} seats!`
          : `${api.getSeatsAvailable()} seats free. Pay ₵${api.getFareDue()}?`,
      }));
      return;
    }
    setState(s => {
      if (s.currentPassengers >= CAPACITY) {
        return { ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now() };
      }
      return { ...s, phase: 'capacity_check', dialogue: `${CAPACITY - s.currentPassengers} seats free. Pay ₵${DEMO_FARE}?` };
    });
  }, []);

  const board = useCallback((destinationId: TrotroDestination['id']) => {
    selectedDestinationRef.current = destinationId;
    const dest = TROTRO_DESTINATIONS.find(d => d.id === destinationId) as TrotroDestination | undefined;
    const destName = dest?.name ?? destinationId;
    const api = getGameAPI();

    const arriveAtDestination = () => {
      const arrival = destinationArrival(destinationId);
      if (arrival && playerRef?.current) {
        playerRef.current.position.set(arrival[0], 0, arrival[1]);
        console.log(`[tro-tro] Teleported to ${destName} cell (world ${arrival[0].toFixed(1)}, ${arrival[1].toFixed(1)})`);
      }
      onArriveAt?.(destinationId);
    };

    if (api) {
      const status = api.getTrotroStatus();
      if (status !== 'IDLE_AT_STOP' && status !== 'BOARDING') {
        setState(s => ({
          ...s,
          phase: 'rejected',
          dialogue: status === 'DEPARTING' ? MATE_LINES.MISSED : MATE_LINES.NOT_AT_STOP,
          vanDepartedAt: status === 'DEPARTING' ? performance.now() : s.vanDepartedAt,
        }));
        return;
      }
      if (api.isTrotroFull()) {
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now() }));
        return;
      }
      const fareDue = api.getFareDue();
      const buy = api.purchaseEverydayExpense('EXP_TROTRO_FARE', { amountGHS: fareDue });
      if (!buy.success) {
        console.log(`[tro-tro] Mate: "${MATE_DIALOGUE.insufficient}" (${buy.message ?? 'declined'})`);
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.insufficient, playerBalance: api.getCashBalance() }));
        return;
      }
      const ticketOwned = api.hasOwnedItem(TROTRO_TICKET_ITEM_ID);
      const seated = api.boardPassenger();
      if (!seated) {
        const fare = fareDue;
        const refund = api.addFunds({
          amount: fare,
          category: 'TRANSPORT',
          description: 'Trotro fare refund — seat lost after payment',
          channel: 'CASH',
        });
        console.log(`[tro-tro] seat lost after payment — refunded ₵${fare} (success=${refund.success})`);
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now(), playerBalance: api.getCashBalance() }));
        return;
      }
      console.log(`[tro-tro] purchaseEverydayExpense('EXP_TROTRO_FARE') ok · ticket=${ticketOwned} · balance ₵${api.getCashBalance()} · van ${api.getCurrentPassengers()}/${api.getCapacity()}`);

      setState(s => ({
        ...s,
        phase: 'boarding',
        dialogue: `${MATE_DIALOGUE.boarded} → ${destName}`,
        playerBalance: api.getCashBalance(),
        ticketIssued: ticketOwned,
        currentPassengers: api.getCurrentPassengers(),
      }));

      window.setTimeout(() => {
        console.log('[tro-tro] You tap the roof twice — "Mate, branch here!"');
        setState(prev => ({ ...prev, phase: 'transit', dialogue: MATE_DIALOGUE.roofTap }));
        window.setTimeout(() => {
          arriveAtDestination();
          api.alightPassenger();
          setState(prev => ({
            ...prev,
            phase: 'arrived',
            dialogue: `Arrived at ${destName}!`,
            currentPassengers: api.getCurrentPassengers(),
            playerBalance: api.getCashBalance(),
          }));
          window.setTimeout(() => {
            setState(prev => ({ ...prev, phase: 'idle', dialogue: '', ticketIssued: false }));
            syncFromAPI();
          }, 3000);
        }, 1500);
      }, 1000);
      return;
    }

    const fare = DEMO_FARE;
    setState(s => {
      if (s.playerBalance < fare) {
        return { ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.insufficient };
      }
      window.setTimeout(() => {
        setState(prev => ({ ...prev, phase: 'transit', dialogue: MATE_DIALOGUE.boarded }));
        window.setTimeout(() => {
          arriveAtDestination();
          setState(prev => ({ ...prev, phase: 'arrived', dialogue: `Arrived at ${destName}!` }));
          window.setTimeout(() => {
            setState(prev => ({ ...prev, phase: 'idle', dialogue: '', ticketIssued: false }));
          }, 3000);
        }, 1500);
      }, 1000);
      return {
        ...s,
        phase: 'boarding',
        dialogue: `${MATE_DIALOGUE.boarded} → ${destName}`,
        playerBalance: s.playerBalance - fare,
        ticketIssued: true,
        currentPassengers: s.currentPassengers + 1,
      };
    });
  }, [onArriveAt, playerRef, syncFromAPI]);

  useEffect(() => {
    const onBoardRequest = () => {
      if (phaseRef.current !== 'idle') return;
      startGreeting();
      window.setTimeout(() => checkCapacity(), sequenceDelayMs());
    };
    window.addEventListener(TROTRO_BOARD_EVENT, onBoardRequest);
    return () => window.removeEventListener(TROTRO_BOARD_EVENT, onBoardRequest);
  }, [startGreeting, checkCapacity, sequenceDelayMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat) return;
      if (phaseRef.current !== 'idle') return;
      const player = playerRef?.current;
      if (!player) return;
      const dx = player.position.x - stopPosition[0];
      const dz = player.position.z - stopPosition[2];
      if (Math.sqrt(dx * dx + dz * dz) > E_KEY_RANGE) return;
      startGreeting();
      window.setTimeout(() => checkCapacity(), sequenceDelayMs());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playerRef, stopPosition, startGreeting, checkCapacity, sequenceDelayMs]);

  useFrame(() => {
    tickWorldLabelFrame();
    if (!playerRef?.current) return;

    const playerPos = playerRef.current.position;
    const stopPos = new THREE.Vector3(...stopPosition);
    const distance = playerPos.distanceTo(stopPos);

    if (phaseRef.current !== 'idle') {
      reportWorldLabel(labelId, distance);
      const show = shouldShowWorldLabel(labelId);
      setLabelVisible((prev) => (prev === show ? prev : show));
    } else {
      setLabelVisible((prev) => (prev ? false : prev));
    }

    const inRange = distance < INTERACTION_RANGE;

    if (stopRef.current && !signMatRef.current) {
      stopRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (mat && mat.emissive && (mat.emissive.r > 0 || mat.emissive.g > 0 || mat.emissive.b > 0)) {
            signMatRef.current = mat;
          }
        }
      });
    }
    if (signMatRef.current) {
      const targetGlow = inRange ? 0.9 : 0.15;
      const mat = signMatRef.current;
      mat.emissiveIntensity += (targetGlow - mat.emissiveIntensity) * 0.12;
    }

    if (inRange && !wasInRangeRef.current) {
      wasInRangeRef.current = true;
      startGreeting();
      window.setTimeout(() => checkCapacity(), sequenceDelayMs());
    } else if (!inRange && wasInRangeRef.current) {
      wasInRangeRef.current = false;
      if (phaseRef.current === 'greeting' || phaseRef.current === 'capacity_check') {
        setState(s => ({ ...s, phase: 'idle', dialogue: '' }));
      }
    }

    if (state.vanDepartedAt && performance.now() - state.vanDepartedAt > VAN_CYCLE_MS) {
      setState(s => ({ ...s, vanDepartedAt: null, currentPassengers: 12, phase: 'idle', dialogue: '' }));
    }
  });

  const fare = doorFare();

  return (
    <group position={stopPosition}>
      <group ref={stopRef}>
        <TroTroStop />
      </group>

      {state.phase !== 'idle' && state.phase !== 'arrived' && (
        <mesh>
          <sphereGeometry args={[INTERACTION_RANGE, 16, 12]} />
          <meshBasicMaterial color="#facc15" wireframe transparent opacity={0.15} />
        </mesh>
      )}

      {state.phase !== 'idle' && labelVisible && (
        <Html position={[0, 4, 0]} center zIndexRange={[40, 0]}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.92)',
            border: '1px solid #facc15',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#f8fafc',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 700,
            textAlign: 'center',
            minWidth: '160px',
            maxWidth: '220px',
            pointerEvents: 'auto',
            transition: 'opacity 150ms ease',
          }}>
            <div style={{ marginBottom: '6px', color: '#facc15' }}>
              🗣️ Mate: {state.dialogue}
            </div>

            {state.phase === 'capacity_check' && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {TROTRO_DESTINATIONS.map(dest => (
                  <button
                    key={dest.id}
                    onClick={() => board(dest.id)}
                    style={{
                      background: '#facc15', color: '#0a0a0a', border: 'none',
                      borderRadius: '3px', padding: '3px 8px',
                      fontFamily: 'inherit', fontSize: '0.65rem', fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {dest.name} ₵{fare}
                  </button>
                ))}
              </div>
            )}

            {state.phase === 'boarding' && (
              <div style={{ color: '#22c55e' }}>🚐 Boarding...</div>
            )}
            {state.phase === 'transit' && (
              <div style={{ color: '#60a5fa' }}>🚐 In transit...</div>
            )}
            {state.phase === 'rejected' && (
              <div style={{ color: '#ef4444' }}>❌ {state.dialogue}</div>
            )}
            {state.phase === 'arrived' && (
              <div style={{ color: '#22c55e' }}>✅ {state.dialogue}</div>
            )}

            <div style={{ marginTop: '4px', fontSize: '0.55rem', color: '#94a3b8' }}>
              {state.currentPassengers}/{CAPACITY} · Balance: ₵{state.playerBalance}
              {state.ticketIssued && ' · 🎫 ticket'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
