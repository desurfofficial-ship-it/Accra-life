/**
 * StreetCanvas.tsx — Phase-1 Custom Map
 *
 * Architecture:
 *   <Canvas> (R3F, full-screen, opaque)
 *     ├── <AccraCityGrid /> (5x5 grid with roads + buildings + landmarks)
 *     ├── <TroTroBoarding /> (7-step boarding system at Circle Station)
 *     ├── <PlayerAvatar /> (WASD movement on the roads)
 *     └── <OrbitControls />
 *
 * No external map APIs — the entire city is built procedurally.
 * The player can walk on the roads between blocks and navigate
 * between districts (Adabraka, Makola, Circle, Osu, Labadi).
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { useRef, useEffect, useState, Suspense, type RefObject } from 'react';
import * as THREE from 'three';
import { AccraCityGrid, TOTAL_SIZE, cellCenter } from './AccraCityGrid';
import { MarketStalls } from './MarketStalls';
import { CityTrees } from './CityTrees';
import { LandscapeProps } from './LandscapeProps';
import { SuburbHouses } from './SuburbHouses';
import { BeachProps } from './BeachProps';
import { InteriorFurniture } from './InteriorFurniture';
import { BuildingAssets } from './BuildingAssets';
import { TroTroBoarding, DEMO_FARE, DEMO_START_BALANCE } from './TroTroBoarding';
import { LivingTrotro } from './LivingTrotro';
import { LivingPlayerAvatar } from './LivingPlayerAvatar';
import { LivingVendor } from './LivingVendor';
import { MarketAssets } from './MarketAssets';
import { AssetBoundary } from './AssetBoundary';
import { TrotroService } from '../game/World/TrotroService';
import { MAKOLA_VENDOR_STAND_WORLD } from '../game/World/GridMap';
import { getGameAPI } from './gameAPIBridge';
import { TroTroPrompt } from '../ui/TroTroPrompt';
import { EventBanner } from '../ui/EventBanner';
import { ClockHud } from '../ui/ClockHud';

/** Prompt range — matches the systems-layer trotro_stop radius (3.5 m). */
const TROTRO_PROMPT_RANGE = 3.5;

// ── Player Avatar ────────────────────────────────────────────────────────────

const MOVE_SPEED = 6.0; // slightly faster for the larger map
const WORLD_BOUNDS = {
  minX: -TOTAL_SIZE / 2,
  maxX: TOTAL_SIZE / 2,
  minZ: -TOTAL_SIZE / 2,
  maxZ: TOTAL_SIZE / 2,
};

interface PlayerAvatarProps {
  groupRef: RefObject<THREE.Group | null>;
}

function PlayerAvatar({ groupRef }: PlayerAvatarProps) {
  const keysRef = useRef<Record<string, boolean>>({});
  // Phase-8 animation-gating: tracks whether the player is currently moving
  // (dx/dz ≠ 0) so LivingPlayerAvatar can pause the walk animation when idle.
  const isMovingRef = useRef(false);
  // Phase-8 polish: tracks whether the player is sprinting (Jog button OR
  // keyboard Shift) so LivingPlayerAvatar can pick the run clip when one
  // exists, or speed up the procedural walk bob/sway.
  const isSprintingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    // Movement source (v4.8): when the systems layer is live, the avatar
    // consumes the REAL InputManager movement vector — keyboard WASD
    // (KeyW codes) plus the agent-facing virtual joystick
    // (gameAPI.setJoystickInput), the joystick overriding the keys exactly
    // like PlayerController does. Before the bridge boots, fall back to
    // the local keyboard listener so the map is still walkable.
    const api = getGameAPI();
    let dx = 0, dz = 0;
    if (api) {
      const input = api.input.getMovementInput();
      dx = input.moveX;
      dz = input.moveZ;
    } else {
      const keys = keysRef.current;
      if (keys['w'] || keys['arrowup']) dz -= 1;
      if (keys['s'] || keys['arrowdown']) dz += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
    }
    if (dx !== 0 || dz !== 0) { const len = Math.sqrt(dx*dx + dz*dz); dx /= len; dz /= len; }
    const moveDist = MOVE_SPEED * delta;
    groupRef.current.position.x += dx * moveDist;
    groupRef.current.position.z += dz * moveDist;
    groupRef.current.position.x = THREE.MathUtils.clamp(groupRef.current.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
    groupRef.current.position.z = THREE.MathUtils.clamp(groupRef.current.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
    if (dx !== 0 || dz !== 0) {
      const targetAngle = Math.atan2(dx, dz);
      const current = groupRef.current.rotation.y;
      let diff = targetAngle - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.15;
    }
    // Phase-8 animation gating: write isMoving so LivingPlayerAvatar's
    // useFrame can pause/resume the walk animation.
    isMovingRef.current = (dx !== 0 || dz !== 0);
    // Phase-8 polish: write isSprinting — driven by the agent joystick
    // virtualSprint flag OR the keyboard Shift keys. When gameAPI isn't
    // booted (pre-onboarding), fall back to checking keysRef for Shift.
    if (api) {
      isSprintingRef.current = api.input.getMovementInput().sprint;
    } else {
      isSprintingRef.current = !!(keysRef.current['shift'] || keysRef.current['shiftleft'] || keysRef.current['shiftright']);
    }
  });

  // Spawn at Adabraka (cell [0,0] = home district)
  const [spawnX, spawnZ] = cellCenter(0, 0);

  return (
    <group ref={groupRef} position={[spawnX, 0, spawnZ]}>
      {/* Phase-8: real rigged character model (Sunset Walking Low Poly Girl
          by micaelsampaio, CC-BY-4.0). Walk animation plays on loop; the
          isMovingRef gates it — paused when the player stands still, resumed
          when WASD/joystick input is non-zero. isSprintingRef drives the
          run clip when one exists (currently no run clip → procedural walk
          is just sped-up; future models with a run clip will use it). */}
      <LivingPlayerAvatar isMovingRef={isMovingRef} isSprintingRef={isSprintingRef} />
    </group>
  );
}

// ── Main Canvas ─────────────────────────────────────────────────────────────

export function StreetCanvas() {
  const playerGroupRef = useRef<THREE.Group>(null);

  // Dev/debug handle — mirrors the window.__phase1Scene pattern in main.ts:
  // exposes the R3F player group so devtools / agent hosts can read or set
  // the custom-map player position without touching game internals.
  useEffect(() => {
    (window as unknown as { __r3fPlayer?: RefObject<THREE.Group | null> }).__r3fPlayer = playerGroupRef;
    return () => {
      delete (window as unknown as { __r3fPlayer?: RefObject<THREE.Group | null> }).__r3fPlayer;
    };
  }, []);

  // Tro-tro stop position = Circle Station (cell [3,2])
  const [troTroX, troTroZ] = cellCenter(3, 2);
  const trotroStopPosition: [number, number, number] = [troTroX, 0, troTroZ];

  // Living trotro service — state machine drives the van lifecycle.
  // v4.6: pre-boot we run a local fallback instance so the map has a van
  // before onboarding finishes; once the systems layer exposes
  // window.GameAPI we adopt ITS TrotroService so the AI-facing bridge
  // (gameAPI.getTrotroStatus / boardPassenger) and the visible van share
  // ONE machine — two disconnected instances would let the AI board a
  // van that is not physically at the stop (or break boarding entirely,
  // since the bridge instance never ran startCycle on its own).
  const trotroServiceRef = useRef<TrotroService | null>(null);
  if (!trotroServiceRef.current) {
    trotroServiceRef.current = new TrotroService(14); // 14-seat Sprinter
  }
  const [activeTrotro, setActiveTrotro] = useState<TrotroService>(trotroServiceRef.current);
  useEffect(() => {
    let cancelled = false;
    const adopt = (): boolean => {
      const shared = getGameAPI()?.trotro;
      if (shared && !cancelled) {
        setActiveTrotro(shared);
        return true;
      }
      return false;
    };
    if (adopt()) return;
    const poll = window.setInterval(() => {
      if (adopt()) window.clearInterval(poll);
    }, 500);
    return () => { cancelled = true; window.clearInterval(poll); };
  }, []);

  // ── GTA-style [E] prompt (DOM overlay above the Canvas) ──
  // Visible while the on-screen avatar is near the stop; shows the real
  // Wallet balance (green when the fare is affordable, red when not).
  // Polls at 5 Hz and bails out of setState when nothing changed so the
  // R3F tree does not re-render while the values are static.
  const [promptState, setPromptState] = useState({ visible: false, balance: DEMO_START_BALANCE, fare: DEMO_FARE });
  useEffect(() => {
    const id = window.setInterval(() => {
      const player = playerGroupRef.current;
      if (!player) return;
      const dx = player.position.x - troTroX;
      const dz = player.position.z - troTroZ;
      const visible = Math.sqrt(dx * dx + dz * dz) < TROTRO_PROMPT_RANGE;
      const api = getGameAPI();
      const balance = api ? api.getCashBalance() : DEMO_START_BALANCE;
      // v4.11: quote the DOOR price (base × event surge) — the same number
      // TroTroBoarding charges. getCanonicalFareGHS() (base only) made the
      // prompt show ₵5 while the door took ₵7.5 during RUSH_HOUR.
      const fare = api ? api.getFareDue() : DEMO_FARE;
      setPromptState(prev =>
        prev.visible === visible && prev.balance === balance && prev.fare === fare
          ? prev
          : { visible, balance, fare }
      );
    }, 200);
    return () => window.clearInterval(id);
  }, [troTroX, troTroZ]);

  return (
    <>
      {/* v4.11: 'percentage' = PCFShadowMap. Bare `shadows` mapped to
        PCFSoftShadowMap, which newer three removed (it logged a
        deprecation warning each boot and downgraded to PCFShadowMap
        anyway — so this is the same rendering, minus the warning). */}
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <OrthographicCamera makeDefault position={[0, 50, 50]} zoom={10} near={0.1} far={200} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      {/* Custom Accra city grid — 5x5 blocks with roads + buildings + landmarks.
          Procedural, no asset files — kept OUTSIDE AssetBoundary so roads +
          blocks always render even if every model 404s. */}
      <AccraCityGrid />

      {/* Asset packs — each wrapped in <AssetBoundary><Suspense fallback={null}>
          so a 404 in one group doesn't blank the whole Canvas. */}
      <AssetBoundary name="MarketStalls">
        <Suspense fallback={null}>
          <MarketStalls />
        </Suspense>
      </AssetBoundary>
      <AssetBoundary name="CityTrees">
        <Suspense fallback={null}>
          <CityTrees />
        </Suspense>
      </AssetBoundary>
      <AssetBoundary name="LandscapeProps">
        <Suspense fallback={null}>
          <LandscapeProps />
        </Suspense>
      </AssetBoundary>
      <AssetBoundary name="SuburbHouses">
        <Suspense fallback={null}>
          <SuburbHouses />
        </Suspense>
      </AssetBoundary>
      <AssetBoundary name="BeachProps">
        <Suspense fallback={null}>
          <BeachProps />
        </Suspense>
      </AssetBoundary>
      <AssetBoundary name="InteriorFurniture">
        <Suspense fallback={null}>
          <InteriorFurniture />
        </Suspense>
      </AssetBoundary>
      <AssetBoundary name="BuildingAssets">
        <Suspense fallback={null}>
          <BuildingAssets />
        </Suspense>
      </AssetBoundary>
      {/* Phase 8 follow-up: 4 user-uploaded market GLBs (super, mini,
          cat, chinese) at distinct grid cells. Each is a real commercial
          building — Super Market at [2,4], Mini Market at [0,2],
          Cat Market at [4,1] (Labadi decorative), Chinese Market at
          [3,4] (Osu Chinatown). */}
      <AssetBoundary name="MarketAssets">
        <Suspense fallback={null}>
          <MarketAssets />
        </Suspense>
      </AssetBoundary>

      {/* Tro-tro boarding system at Circle Station */}
      <AssetBoundary name="TroTroBoarding">
        <Suspense fallback={null}>
          <TroTroBoarding
            stopPosition={trotroStopPosition}
            playerRef={playerGroupRef}
            onArriveAt={(destId) => console.log(`[tro-tro] Arrived at ${destId}`)}
          />
        </Suspense>
      </AssetBoundary>

      {/* Living trotro van — state machine drives arrive/idle/board/depart.
          activeTrotro is the SHARED service (window.GameAPI.trotro) once the
          systems layer boots — one van for the renderer and the AI bridge. */}
      <AssetBoundary name="LivingTrotro">
        <Suspense fallback={null}>
          <LivingTrotro
            position={trotroStopPosition}
            trotroService={activeTrotro}
          />
        </Suspense>
      </AssetBoundary>

      {/* Makola street-vendor stand (skills/vendor-system.md) — adopts the
          SHARED VendorService (window.GameAPI.vendor) once the systems
          layer boots; the engine owns the 10s shift timer and the payout. */}
      <AssetBoundary name="LivingVendor">
        <Suspense fallback={null}>
          <LivingVendor
            position={[MAKOLA_VENDOR_STAND_WORLD[0], 0, MAKOLA_VENDOR_STAND_WORLD[1]]}
            playerRef={playerGroupRef}
          />
        </Suspense>
      </AssetBoundary>

      {/* Player avatar — spawns at Adabraka (home), walks with WASD */}
      <AssetBoundary name="PlayerAvatar">
        <Suspense fallback={null}>
          <PlayerAvatar groupRef={playerGroupRef} />
        </Suspense>
      </AssetBoundary>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minZoom={5}
        maxZoom={25}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
      />
      </Canvas>

      {/* GTA-style [E] Board Tro-tro prompt — fixed bottom-center, above
          the Canvas. Shows the real Cedi balance from the live Wallet
          (green = affordable, red = cannot afford). */}
      <TroTroPrompt
        fare={promptState.fare}
        playerBalance={promptState.balance}
        visible={promptState.visible}
      />

      {/* Phase 6+ follow-up: GTA-style Rush Hour alert banner — slides down
          from the top whenever eventService.getCurrentEvent() === 'RUSH_HOUR'.
          Subscribes to eventService.onEventChange internally; shows the
          live in-game clock alongside the alert text. */}
      <EventBanner />

      {/* Phase 6+ polish: persistent in-game clock HUD — fixed top-right.
          Shows the in-game time (HH:MM) + day phase icon + current event
          badge + next-rush countdown. Helps the player plan around Rush
          Hour windows. Subscribes to gameClock via 1s poll +
          eventService.onEventChange + eventScheduler.getNextTriggerHour(). */}
      <ClockHud />
    </>
  );
}
