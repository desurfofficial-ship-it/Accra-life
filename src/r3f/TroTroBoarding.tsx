/**
 * TroTroBoarding.tsx — tro-tro boarding on the custom map, wired to the
 * REAL game systems (skills/tro-tro-system.md v4 five-method contract).
 *
 * Mandatory boarding sequence (per contract):
 *   1. Dialogue  — Mate greets with authentic Accra flavor
 *   2. Capacity  — gameAPI.isTrotroFull() (real TrotroService, 14 seats,
 *                  persisted across sessions via the economy snapshot)
 *   3. Fare      — gameAPI.canAfford / balance check (real Wallet, CASH)
 *   4. Debit     — gameAPI.purchaseEverydayExpense('EXP_TROTRO_FARE')
 *                  (canonical ₵6 path — debits AND grants the real ticket
 *                  item trotro_ticket_osu_circle into the player's inventory)
 *   5. Ticket    — gameAPI.hasOwnedItem('trotro_ticket_osu_circle')
 *   6. Boarding  — gameAPI.boardPassenger() (real seat accounting)
 *   7. Transit   — teleport the player to the destination district cell
 *                  (GridMap.TROTRO_DESTINATIONS) and free the seat
 *                  (gameAPI.alightPassenger() — transit-end turnover)
 *
 * When window.GameAPI is not yet available (pre-onboarding) the component
 * runs the same 7 steps against local demo state so the custom map stays
 * explorable behind the onboarding overlay.
 */

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { TroTroStop } from './TroTroStop';
import { getGameAPI } from './gameAPIBridge';
import {
  TROTRO_DESTINATIONS,
  destinationArrival,
  type TrotroDestination
} from '../game/World/GridMap';

// ── Spec constants ──────────────────────────────────────────────────────────

const CAPACITY = 14;                     // Sprinter van seats (TrotroService)
const INTERACTION_RANGE = 3.0;           // meters — spec Rule 1
const VAN_CYCLE_MS = 30_000;            // 30s — next van arrives if full
const DEMO_FARE = 6;                     // demo canonical fare (pre-boot)
const TROTRO_TICKET_ITEM_ID = 'trotro_ticket_osu_circle';

// ── Mate dialogue lines (authentic Accra flavor per spec) ───────────────────

const MATE_DIALOGUE = {
  greeting: [
    'Circle! Circle! Enter well!',
    'Oga, move inside make we go!',
    'Last stop! Enter make we move!',
  ],
  full: 'No space! Next one!',
  insufficient: 'Oga, you no get change? Abeg shift make others enter.',
  boarded: 'Make you sit well. We dey go!',
};

// ── State ────────────────────────────────────────────────────────────────────

interface BoardingState {
  phase: 'idle' | 'greeting' | 'capacity_check' | 'fare_check' | 'debiting' | 'ticketing' | 'boarding' | 'transit' | 'arrived' | 'rejected';
  dialogue: string;
  currentPassengers: number;
  vanDepartedAt: number | null;
  playerBalance: number;     // demo: starts at ₵20, real: Wallet.getCashBalance()
  ticketIssued: boolean;
}

const INITIAL_STATE: BoardingState = {
  phase: 'idle',
  dialogue: '',
  currentPassengers: 12,     // demo: 12/14 — leaves room for the player
  vanDepartedAt: null,
  playerBalance: 20,          // demo balance — real: Wallet.getCashBalance()
  ticketIssued: false,
};

// ── Component ────────────────────────────────────────────────────────────────

interface TroTroBoardingProps {
  stopPosition: [number, number, number];
  playerRef: React.RefObject<THREE.Group | null>;
  /** Called when boarding completes — the arrival teleport already happened. */
  onArriveAt?: (destinationId: string) => void;
}

export function TroTroBoarding({ stopPosition, playerRef, onArriveAt }: TroTroBoardingProps) {
  const [state, setState] = useState<BoardingState>(INITIAL_STATE);
  const wasInRangeRef = useRef(false);
  const stepTimerRef = useRef<number>(0);
  const selectedDestinationRef = useRef<string>('circle');

  /** Canonical fare — real EXP_TROTRO_FARE when the bridge is live. */
  const canonicalFare = useCallback(() => {
    const api = getGameAPI();
    return api ? api.getCanonicalFareGHS() : DEMO_FARE;
  }, []);

  /** Pull live seat/balance state from the real systems into display state. */
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

  // ── Step 1: Dialogue — Mate greets ────────────────────────────────────────
  const startGreeting = useCallback(() => {
    const line = MATE_DIALOGUE.greeting[Math.floor(Math.random() * MATE_DIALOGUE.greeting.length)];
    setState(s => ({ ...s, phase: 'greeting', dialogue: line }));
    syncFromAPI();
    stepTimerRef.current = performance.now();
  }, [syncFromAPI]);

  // ── Step 2: Capacity check (real TrotroService) ──────────────────────────
  const checkCapacity = useCallback(() => {
    const api = getGameAPI();
    if (api) {
      if (api.isTrotroFull()) {
        console.log(`[tro-tro] Mate: "${MATE_DIALOGUE.full}" (van ${api.getCurrentPassengers()}/${api.getCapacity()})`);
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now() }));
        return;
      }
      setState(s => ({
        ...s,
        phase: 'capacity_check',
        dialogue: `${api.getSeatsAvailable()} seats free. Pay ₵${api.getCanonicalFareGHS()}?`,
      }));
      return;
    }
    // Demo fallback (pre-boot)
    setState(s => {
      if (s.currentPassengers >= CAPACITY) {
        return { ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now() };
      }
      return { ...s, phase: 'capacity_check', dialogue: `${CAPACITY - s.currentPassengers} seats free. Pay ₵${DEMO_FARE}?` };
    });
  }, []);

  // ── Steps 3-7: board (fare → debit+ticket → seat → transit → arrive) ─────
  const board = useCallback((destinationId: TrotroDestination['id']) => {
    selectedDestinationRef.current = destinationId;
    const dest = TROTRO_DESTINATIONS.find(d => d.id === destinationId) as TrotroDestination | undefined;
    const destName = dest?.name ?? destinationId;
    const api = getGameAPI();

    // ── Step 7 helper: teleport the visible player to the arrival cell ──
    const arriveAtDestination = () => {
      const arrival = destinationArrival(destinationId);
      if (arrival && playerRef?.current) {
        playerRef.current.position.set(arrival[0], 0, arrival[1]);
        console.log(`[tro-tro] Teleported to ${destName} cell (world ${arrival[0].toFixed(1)}, ${arrival[1].toFixed(1)})`);
      }
      onArriveAt?.(destinationId);
    };

    if (api) {
      // Real flow — ordering is mandatory per the contract.
      if (api.isTrotroFull()) {
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now() }));
        return;
      }
      // Step 3+4: fare gate + canonical debit (grants the real ticket item)
      const buy = api.purchaseEverydayExpense('EXP_TROTRO_FARE');
      if (!buy.success) {
        console.log(`[tro-tro] Mate: "${MATE_DIALOGUE.insufficient}" (${buy.message ?? 'declined'})`);
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.insufficient, playerBalance: api.getCashBalance() }));
        return;
      }
      // Step 5: ticket verification (real inventory)
      const ticketOwned = api.hasOwnedItem(TROTRO_TICKET_ITEM_ID);
      // Step 6: real seat accounting (false = van filled up in the meantime)
      const seated = api.boardPassenger();
      if (!seated) {
        setState(s => ({ ...s, phase: 'rejected', dialogue: MATE_DIALOGUE.full, vanDepartedAt: performance.now() }));
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

      // Step 7: transit → arrive → free the seat (turnover)
      window.setTimeout(() => {
        setState(prev => ({ ...prev, phase: 'transit', dialogue: MATE_DIALOGUE.boarded }));
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

    // ── Demo fallback (pre-boot): local wallet math ──
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

  // ── useFrame: proximity check (Rule 1) ────────────────────────────────────
  useFrame(() => {
    if (!playerRef?.current) return;

    const playerPos = playerRef.current.position;
    const stopPos = new THREE.Vector3(...stopPosition);
    const distance = playerPos.distanceTo(stopPos);

    const inRange = distance < INTERACTION_RANGE;

    if (inRange && !wasInRangeRef.current) {
      // ENTERING range — start the 7-step sequence from Step 1
      wasInRangeRef.current = true;
      startGreeting();
      // Auto-advance to capacity check after 1.5s
      window.setTimeout(() => checkCapacity(), 1500);
    } else if (!inRange && wasInRangeRef.current) {
      // LEAVING range — reset
      wasInRangeRef.current = false;
      setState(s => (s.phase === 'rejected' || s.phase === 'greeting' || s.phase === 'capacity_check'
        ? { ...s, phase: 'idle', dialogue: '' }
        : s));
    }

    // Van cycle: if rejected (full van), after 30s a fresh van arrives
    if (state.phase === 'rejected' && state.vanDepartedAt) {
      if (performance.now() - state.vanDepartedAt > VAN_CYCLE_MS) {
        const api = getGameAPI();
        if (api) api.resetVehicle(); // fresh van, empty seats
        setState(s => ({ ...s, phase: 'idle', dialogue: '', currentPassengers: api ? api.getCurrentPassengers() : 8 + Math.floor(Math.random() * 5), vanDepartedAt: null }));
        console.log('[tro-tro] New van arrived. Re-approach to board.');
      }
    }
  });

  const fare = canonicalFare();

  return (
    <group position={stopPosition}>
      {/* The yellow Tro-tro Stop sign */}
      <TroTroStop position={[0, 0, 0]} />

      {/* Interaction zone — visible wireframe sphere (radius = INTERACTION_RANGE) */}
      {state.phase !== 'idle' && state.phase !== 'arrived' && (
        <mesh>
          <sphereGeometry args={[INTERACTION_RANGE, 16, 12]} />
          <meshBasicMaterial color="#facc15" wireframe transparent opacity={0.15} />
        </mesh>
      )}

      {/* HTML overlay — shows Mate dialogue + boarding buttons */}
      {state.phase !== 'idle' && (
        <Html position={[0, 4, 0]} center distanceFactor={8}>
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
            minWidth: '180px',
            maxWidth: '280px',
            pointerEvents: 'auto',
          }}>
            {/* Mate dialogue */}
            <div style={{ marginBottom: '6px', color: '#facc15' }}>
              🗣️ Mate: {state.dialogue}
            </div>

            {/* Boarding buttons — appear after capacity check passes */}
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

            {/* Boarding in progress */}
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

            {/* Stats */}
            <div style={{ marginTop: '4px', fontSize: '0.55rem', color: '#94a3b8' }}>
              Seats: {state.currentPassengers}/{CAPACITY} · Balance: ₵{state.playerBalance}
              {state.ticketIssued && ' · 🎫 ticket'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
