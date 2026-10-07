/**
 * TroTroBoarding.tsx — tro-tro boarding on the custom map, wired to the
 * REAL game systems (skills/tro-tro-system.md v4.6 six-method contract).
 *
 * Mandatory boarding sequence (per contract):
 *   0. State gate — gameAPI.getTrotroStatus() must be 'IDLE_AT_STOP'
 *      (skill-legal window; engine also seats during 'BOARDING') or the
 *      Mate refuses: DEPARTING → 'Ah! You missed it! Wait for the next
 *      one!' · EN_ROUTE/ARRIVING → 'No van at the stop yet…'
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
import { useEffect, useRef, useState, useCallback, useReducer } from 'react';
import * as THREE from 'three';
import { TroTroStop } from './TroTroStop';
import { getGameAPI, TROTRO_BOARD_EVENT } from './gameAPIBridge';
import { eventService } from '../game/World/EventService';
import {
  TROTRO_DESTINATIONS,
  destinationArrival,
  type TrotroDestination
} from '../game/World/GridMap';
import { MATE_LINES } from '../game/World/TrotroService';

// ── Spec constants ──────────────────────────────────────────────────────────

const CAPACITY = 14;                     // Sprinter van seats (TrotroService)
const INTERACTION_RANGE = 3.0;           // meters — spec Rule 1
const VAN_CYCLE_MS = 30_000;            // 30s — next van arrives if full
/** [E] range on the visible map — matches the GTA prompt radius (3.5 m). */
const E_KEY_RANGE = 3.5;
/** Demo canonical fare (pre-boot fallback — mirrors EXP_TROTRO_FARE ₵5). */
export const DEMO_FARE = 5;
/** Demo starting balance (pre-boot fallback — matches INITIAL_STATE below). */
export const DEMO_START_BALANCE = 20;
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
  // v4.9 rush-hour chaos — the Mate drops the relaxed patter (spec line).
  rushGreeting: 'Circle! Circle! Rush hour o! No time to argue, enter or stay!',
  roofTap: 'Make you tap the roof — I go branch!',
};

/** v4.9: boarding sequence pacing — rush hour is 40%+ more urgent. */
const GREETING_SEQUENCE_MS = 1500;      // NORMAL: relaxed Mate patter
const RUSH_GREETING_SEQUENCE_MS = 700;  // RUSH_HOUR: no time to argue

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
  // Mirrors state.phase for the [E]-key listener (no stale closures).
  const phaseRef = useRef(state.phase);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  // Reactive stop-sign glow (restored phase-4 behaviour, lost in the map
  // migration): the yellow sign panel lerps its emissiveIntensity up while
  // the player is in range and back down when they leave. The material is
  // found once by traversing the stop group for a non-black emissive.
  const stopRef = useRef<THREE.Group>(null);
  const signMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  /** Door fare — real EXP_TROTRO_FARE (surged during RUSH_HOUR) when the
   * bridge is live; the flat demo fare pre-boot. */
  const doorFare = useCallback(() => {
    const api = getGameAPI();
    return api ? api.getFareDue() : DEMO_FARE;
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
    const api = getGameAPI();
    // v4.9: RUSH_HOUR swaps the relaxed patter for the surge bark — the
    // exact [LOGIC] line, and the whole sequence speeds up (no time to
    // argue).
    const rush = api?.getCurrentEvent() === 'RUSH_HOUR';
    const line = rush
      ? MATE_DIALOGUE.rushGreeting
      : MATE_DIALOGUE.greeting[Math.floor(Math.random() * MATE_DIALOGUE.greeting.length)];
    setState(s => ({ ...s, phase: 'greeting', dialogue: line }));
    syncFromAPI();
    stepTimerRef.current = performance.now();
  }, [syncFromAPI]);

  /** v4.9: greeting → capacity check pacing (1500 ms NORMAL / 700 ms rush). */
  const sequenceDelayMs = useCallback(() => {
    const api = getGameAPI();
    return api?.getCurrentEvent() === 'RUSH_HOUR' ? RUSH_GREETING_SEQUENCE_MS : GREETING_SEQUENCE_MS;
  }, []);

  // ── Step 2: Physical state gate (v4.6) + capacity check (real service) ───
  const checkCapacity = useCallback(() => {
    const api = getGameAPI();
    if (api) {
      // Step 0 — mandatory state gate: BEFORE any funds/space check, the
      // van must be physically docked. DEPARTING gets the missed-van line;
      // EN_ROUTE/ARRIVING get the wait line. No debit can happen here.
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
        // v4.9: the door fare (₵5 NORMAL / ₵7.5 RUSH_HOUR) + the surge
        // changes the Mate's voice — no time to argue, enter or stay.
        dialogue: api.getCurrentEvent() === 'RUSH_HOUR'
          ? `${MATE_DIALOGUE.rushGreeting} ₵${api.getFareDue()} — ${api.getSeatsAvailable()} seats!`
          : `${api.getSeatsAvailable()} seats free. Pay ₵${api.getFareDue()}?`,
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
      // Step 0 (v4.6): physical state gate re-checked at board time — the
      // van may have started departing between the capacity check and the
      // button click; never debit while the door can shut mid-transaction.
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
      // Step 3+4: fare gate + door-price debit (grants the real ticket
      // item) — v4.9: the amount is getFareDue() (base × event surge), so
      // a RUSH_HOUR ride debits ₵7.5 while NORMAL keeps the flat ₵5.
      const fareDue = api.getFareDue();
      const buy = api.purchaseEverydayExpense('EXP_TROTRO_FARE', { amountGHS: fareDue });
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
        // Defensive: unreachable after the Step-0 gate (single-threaded JS —
        // no state timer can interleave between isTrotroFull/boardPassenger),
        // but a failed seat must NEVER strand the player's money.
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

      // Step 7: transit → arrive → free the seat (turnover)
      window.setTimeout(() => {
        // v4.9 roof-tap alighting beat (the "Yes" roadmap item): the
        // passenger signals the stop the real way — knock the van ceiling.
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

  // ── [E]-key routing from the systems layer ──────────────────────────────────
  // main.ts's handleWorldTargetInteracted('trotro_stop') dispatches
  // TROTRO_BOARD_EVENT when the player presses E inside the InteractionSystem
  // radius (3.5 m — slightly wider than this panel's 3 m auto-trigger).
  // Starts the same Mate sequence as the proximity path; idempotent while a
  // sequence is already running.
  useEffect(() => {
    const onBoardRequest = () => {
      if (phaseRef.current !== 'idle') return;
      startGreeting();
      window.setTimeout(() => checkCapacity(), sequenceDelayMs());
    };
    window.addEventListener(TROTRO_BOARD_EVENT, onBoardRequest);
    return () => window.removeEventListener(TROTRO_BOARD_EVENT, onBoardRequest);
  }, [startGreeting, checkCapacity, sequenceDelayMs]);

  // ── [E]-key on the VISIBLE map ───────────────────────────────────────────
  // The systems-layer InteractionSystem only sees the hidden legacy world,
  // so pressing E near the on-screen stop did nothing (the GTA prompt
  // advertises [E] — it must work). The R3F layer binds its own KeyE: when
  // the on-screen avatar is in range and no sequence is running, E starts
  // the Mate sequence. Idempotent with the systems-layer route.
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

  // ── useFrame: proximity check (Rule 1) ────────────────────────────────────
  useFrame(() => {
    if (!playerRef?.current) return;

    const playerPos = playerRef.current.position;
    const stopPos = new THREE.Vector3(...stopPosition);
    const distance = playerPos.distanceTo(stopPos);

    const inRange = distance < INTERACTION_RANGE;

    // Reactive stop-sign glow: lerp the sign panel's emissiveIntensity
    // toward a bright target while the player is in range, back to the
    // faint idle glow when they leave (restored phase-4 behaviour).
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
      // ENTERING range — start the 7-step sequence from Step 1
      wasInRangeRef.current = true;
      startGreeting();
      // Auto-advance to capacity check after 1.5s
      window.setTimeout(() => checkCapacity(), sequenceDelayMs());
    } else if (!inRange && wasInRangeRef.current) {
      // LEAVING range — reset
      wasInRangeRef.current = false;
      setState(s => (s.phase === 'rejected' || s.phase === 'greeting' || s.phase === 'capacity_check'
        ? { ...s, phase: 'idle', dialogue: '' }
        : s));
    }

    // Rejection cooldown: the player steps back while the LIVE van cycles
    // itself (TrotroService state machine: DEPARTING → EN_ROUTE → ARRIVING
    // → IDLE_AT_STOP). We deliberately do NOT call api.resetVehicle() here
    // — on the shared machine it would stall the van at EN_ROUTE with no
    // timer and desync the visible van from the AI bridge (v4.6).
    //
    //   a) The van docks again before the cooldown ends (getTrotroStatus
    //      back in the skill-legal window) → clear the rejection early so
    //      the player can retry without waiting out the full cycle.
    //   b) Still not boardable after 30s → reset the panel (the van keeps
    //      cycling on its own; no vehicle reset from the UI layer).
    if (state.phase === 'rejected') {
      const api = getGameAPI();
      const docked = api ? (api.getTrotroStatus() === 'IDLE_AT_STOP' || api.getTrotroStatus() === 'BOARDING') : false;
      if (docked) {
        // Van docked again → clear the rejection immediately. No vanDepartedAt
        // guard here: NOT_AT_STOP rejections keep the previous (possibly null)
        // timestamp, and a null-timestamp rejection must still recover once
        // the van physically returns.
        setState(s => ({ ...s, phase: 'idle', dialogue: '', vanDepartedAt: null }));
        console.log('[tro-tro] Van docked at the stop. Press [E] to board.');
      } else if (state.vanDepartedAt && performance.now() - state.vanDepartedAt > VAN_CYCLE_MS) {
        setState(s => ({ ...s, phase: 'idle', dialogue: '', currentPassengers: api ? api.getCurrentPassengers() : 8 + Math.floor(Math.random() * 5), vanDepartedAt: null }));
        console.log('[tro-tro] Next van cycle — re-approach the stop to board.');
      }
    }
  });

  const fare = doorFare();

  // v4.9: the world event can flip (NORMAL ↔ RUSH_HOUR) while the Mate
  // panel is already open — without this subscription the button label
  // (and GTA prompt fare) render stale ₵5 while the door debit takes the
  // surged ₵7.5. Re-render on every event change so the panel always
  // quotes the live door price.
  const [, rerenderOnEvent] = useReducer((c: number) => c + 1, 0);
  useEffect(() => {
    const unsub = eventService.onEventChange(() => rerenderOnEvent());
    return unsub;
  }, []);

  return (
    <group position={stopPosition}>
      {/* The yellow Tro-tro Stop sign (reactive glow via stopRef) */}
      <TroTroStop ref={stopRef} position={[0, 0, 0]} />

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
