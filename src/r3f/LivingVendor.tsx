/**
 * LivingVendor.tsx — the Makola street-vendor stand on the visible custom
 * map, wired to the REAL VendorService (skills/vendor-system.md contract).
 *
 * Flow (per contract):
 *   0. Proximity — the [E] key only binds within 3.5 m of the stand
 *      (same radius as the systems-layer 'makola_vendor_stand'
 *      interactable and the VendorService proximity gate).
 *   1. Trigger   — [E] (or VENDOR_SELL_EVENT from the systems layer)
 *                  → gameAPI.startVendorJob() (void — the bridge injects
 *                  the live player position into the service's gate).
 *   2. Dialogue  — the service locks the event ONCE and reports it via
 *                  onShiftUpdate(): NORMAL → 'Welcome! What you need
 *                  today?' (₵10) · RUSH_HOUR → 'Rush hour! Everyone
 *                  buying! Make haste!' (₵15).
 *   3. Shift     — 10 s selling bar; the ENGINE owns the timer.
 *   4. Payout    — the engine credits the wallet through the addFunds
 *                  path (category SALE, channel CASH) — this component
 *                  NEVER calls addFunds itself (double-credit guard).
 *                  Sale-complete beat: chime + '+₵' float + '[vendor]'
 *                  console log; then a 30 s restock cooldown applies.
 *
 * Pre-boot (window.GameAPI absent) the stand renders as scenery with a
 * 'market opens after boot' hint — same demo posture as TroTroBoarding.
 */

import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { getGameAPI, VENDOR_SELL_EVENT } from './gameAPIBridge';
import type { VendorService, VendorShiftSnapshot } from '../game/Jobs/VendorService';

// ── Constants ────────────────────────────────────────────────────────────────

/** [E] range on the visible map — matches the interactable radius. */
const E_KEY_RANGE = 3.5;

const IDLE_SNAPSHOT: VendorShiftSnapshot = {
  phase: 'IDLE',
  jobId: null,
  event: 'NORMAL',
  earningsGHS: 0,
  dialogue: '',
  startedAtMs: null,
  endsAtMs: null,
  cooldownEndsAtMs: 0,
  paidGHS: 0,
  transactionId: null,
};

// ── Audio ────────────────────────────────────────────────────────────────────

/** Sale-complete chime — a short WebAudio arpeggio (C6 · E6 · G6). */
function playSaleChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [
      { freq: 1046.5, at: 0 },
      { freq: 1318.5, at: 0.09 },
      { freq: 1568.0, at: 0.18 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + n.at);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + n.at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + n.at);
      osc.stop(ctx.currentTime + n.at + 0.4);
    }
    window.setTimeout(() => void ctx.close(), 900);
  } catch { /* ignore */ }
  console.log('[vendor] chime: sale complete');
}

// ── Component ────────────────────────────────────────────────────────────────

interface LivingVendorProps {
  position: [number, number, number];
  playerRef: RefObject<THREE.Group | null>;
}

export function LivingVendor({ position, playerRef }: LivingVendorProps) {
  const [snapshot, setSnapshot] = useState<VendorShiftSnapshot>(IDLE_SNAPSHOT);
  const [, setNowMs] = useState(0);
  const serviceRef = useRef<VendorService | null>(null);
  const bridgeReadyRef = useRef(false);

  // Adopt the SHARED VendorService once the systems layer boots (same
  // pattern as StreetCanvas adopting window.GameAPI.trotro), then render
  // the shift purely from onShiftUpdate snapshots.
  useEffect(() => {
    let cancelled = false;
    const adopt = () => {
      if (cancelled || serviceRef.current) return true;
      const api = getGameAPI();
      if (!api?.vendor) return false;
      serviceRef.current = api.vendor;
      setSnapshot(api.vendor.getSnapshot());
      api.vendor.onShiftUpdate((snap) => {
        setSnapshot(snap);
        if (snap.phase === 'PAID' && snap.paidGHS > 0) playSaleChime();
      });
      return true;
    };
    if (!adopt()) {
      const id = window.setInterval(() => {
        if (adopt()) window.clearInterval(id);
      }, 300);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }
    return () => { cancelled = true; };
  }, []);

  // 100 ms UI tick — drives the shift progress bar (the SERVICE owns the
  // real 10 s timer; this is display-only).
  useEffect(() => {
    if (snapshot.phase !== 'SELLING') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [snapshot.phase]);

  // The one and only trigger: gameAPI.startVendorJob() — the bridge
  // injects the live player position into the proximity gate.
  const requestSell = () => {
    const api = getGameAPI();
    if (!api) {
      console.log('[vendor] bridge not ready — the market opens after boot');
      return;
    }
    console.log('[vendor] [E] sell request at the stand');
    api.startVendorJob();
  };

  // ── [E] key on the visible map (range-gated) ───────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat) return;
      const player = playerRef?.current;
      if (!player) return;
      const dx = player.position.x - position[0];
      const dz = player.position.z - position[2];
      if (Math.sqrt(dx * dx + dz * dz) > E_KEY_RANGE) return;
      requestSell();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, playerRef]);

  // ── [E] routed from the systems layer (InteractionSystem target) ───────────
  useEffect(() => {
    const onSellRequest = () => requestSell();
    window.addEventListener(VENDOR_SELL_EVENT, onSellRequest);
    return () => window.removeEventListener(VENDOR_SELL_EVENT, onSellRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proximity check — show the prompt pill while the player is in range.
  const inRangeRef = useRef(false);
  const [inRange, setInRange] = useState(false);
  useFrame(() => {
    if (!playerRef?.current) return;
    const dx = playerRef.current.position.x - position[0];
    const dz = playerRef.current.position.z - position[2];
    const near = Math.sqrt(dx * dx + dz * dz) <= E_KEY_RANGE;
    if (near !== inRangeRef.current) {
      inRangeRef.current = near;
      setInRange(near);
    }
  });

  // Shift progress (display-only — the engine timer pays).
  const now = Date.now();
  const progress =
    snapshot.phase === 'SELLING' && snapshot.startedAtMs !== null && snapshot.endsAtMs !== null
      ? Math.min(1, Math.max(0, (now - snapshot.startedAtMs) / (snapshot.endsAtMs - snapshot.startedAtMs)))
      : 0;
  const restockRemainingS =
    snapshot.phase === 'IDLE' && snapshot.cooldownEndsAtMs > now
      ? Math.ceil((snapshot.cooldownEndsAtMs - now) / 1000)
      : 0;

  const showPanel = inRange || snapshot.phase !== 'IDLE';

  return (
    <group position={position}>
      {/* ── The stand visuals (mirror of the systems-layer builder) ── */}
      <group>
        {/* table top + legs */}
        <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.08, 0.9]} />
          <meshStandardMaterial color="#92400e" roughness={0.7} />
        </mesh>
        {[[-0.95, -0.3], [0.95, -0.3], [-0.95, 0.3], [0.95, 0.3]].map(([lx, lz], i) => (
          <mesh key={`leg-${i}`} position={[lx, 0.41, lz]} castShadow>
            <boxGeometry args={[0.08, 0.82, 0.08]} />
            <meshStandardMaterial color="#78350f" roughness={0.6} />
          </mesh>
        ))}
        {/* tomato pyramid */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={`tomato-${i}`}
            position={[-0.7 + (i % 3) * 0.2, i < 3 ? 0.95 : 0.79, 0.1]}
            castShadow
          >
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshStandardMaterial color="#dc2626" roughness={0.4} />
          </mesh>
        ))}
        {/* yams */}
        {[0.15, 0.45].map((yx, i) => (
          <mesh key={`yam-${i}`} position={[yx, 0.94, 0.05]} rotation={[0, 0, i === 0 ? 0.2 : -0.15]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.55, 8]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.8} />
          </mesh>
        ))}
        {/* supply crate */}
        <mesh position={[0.75, 0.23, -0.45]} castShadow>
          <boxGeometry args={[0.7, 0.45, 0.5]} />
          <meshStandardMaterial color="#a16207" roughness={0.75} />
        </mesh>
        {/* market umbrella */}
        <mesh position={[-0.8, 1.2, -0.75]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 2.4, 8]} />
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </mesh>
        <mesh position={[-0.8, 2.5, -0.75]} castShadow>
          <coneGeometry args={[1.35, 0.55, 8]} />
          <meshStandardMaterial color="#c2410c" roughness={0.55} />
        </mesh>
        {/* yellow price sign */}
        <mesh position={[0.1, 1.02, 0.46]}>
          <planeGeometry args={[0.85, 0.3]} />
          <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Interaction zone glow while a shift runs */}
      {snapshot.phase !== 'IDLE' && (
        <mesh position={[0, 0.02, 0]}>
          <ringGeometry args={[1.6, 1.85, 32]} />
          <meshBasicMaterial
            color={snapshot.event === 'RUSH_HOUR' ? '#f97316' : '#22c55e'}
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* HTML overlay — vendor prompt / dialogue / shift bar / payout.
          NOTE: no distanceFactor — under this OrthographicCamera drei's
          distance scaling explodes to giant text; a fixed-size anchored
          overlay stays crisp and readable at any zoom. */}
      {showPanel && (
        <Html position={[0, 3.4, 0]} center zIndexRange={[40, 0]}>
          <style>{`@keyframes vendorFloat { 0% { transform: translateY(6px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-8px); opacity: 0.15; } }`}</style>
          <div style={{
            background: 'rgba(15, 23, 42, 0.92)',
            border: `1px solid ${snapshot.event === 'RUSH_HOUR' ? '#f97316' : '#facc15'}`,
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
            {snapshot.phase === 'IDLE' && restockRemainingS > 0 && (
              <div style={{ color: '#94a3b8' }}>
                🧺 {snapshot.dialogue || 'Table restocking…'} ({restockRemainingS}s)
              </div>
            )}

            {snapshot.phase === 'IDLE' && restockRemainingS === 0 && (
              <div style={{ color: '#facc15' }}>
                🧺 Vendor Stand — press [E] to sell
                <div style={{ marginTop: '3px', fontSize: '0.55rem', color: '#94a3b8' }}>
                  {snapshot.event === 'RUSH_HOUR'
                    ? 'Rush hour pay: ₵15 · 10s shift'
                    : 'Normal pay: ₵10 · 10s shift'}
                </div>
              </div>
            )}

            {snapshot.phase === 'SELLING' && (
              <>
                <div style={{ marginBottom: '5px', color: snapshot.event === 'RUSH_HOUR' ? '#f97316' : '#facc15' }}>
                  🗣️ {snapshot.dialogue}
                </div>
                <div style={{
                  width: '100%', height: '8px', background: '#1e293b',
                  borderRadius: '4px', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.round(progress * 100)}%`, height: '100%',
                    background: snapshot.event === 'RUSH_HOUR' ? '#f97316' : '#22c55e',
                    transition: 'width 0.12s linear',
                  }} />
                </div>
                <div style={{ marginTop: '3px', fontSize: '0.55rem', color: '#94a3b8' }}>
                  Selling… {Math.ceil(((snapshot.endsAtMs ?? now) - now) / 1000)}s · earns ₵{snapshot.earningsGHS}
                </div>
              </>
            )}

            {snapshot.phase === 'PAID' && (
              <div style={{ color: '#22c55e' }}>
                ✅ {snapshot.dialogue}
                <div style={{
                  marginTop: '2px', fontSize: '0.9rem', fontWeight: 900,
                  color: '#facc15', animation: 'vendorFloat 1.2s ease-out',
                }}>
                  +₵{snapshot.paidGHS}
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
