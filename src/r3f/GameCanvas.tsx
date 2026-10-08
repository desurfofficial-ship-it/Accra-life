/**
 * StreetCanvas / GameCanvas — Phase-1 Custom Map (R3F).
 * Keeps ObjectiveMarker (playable loop) + FollowCamera (main #20).
 */

import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AccraCityGrid } from './AccraCityGrid';
import { TroTroBoarding, DEMO_FARE, DEMO_START_BALANCE } from './TroTroBoarding';
import { LivingTrotro } from './LivingTrotro';
import { LivingPlayerAvatar } from './LivingPlayerAvatar';
import { ObjectiveMarker } from './ObjectiveMarker';
import { FollowCamera } from './FollowCamera';
import { LivingVendor } from './LivingVendor';
import { MarketAssets } from './MarketAssets';
import { AssetBoundary } from './AssetBoundary';
import { isMobileDevice } from '../debug/DebugOverlay';
import { TrotroService } from '../game/World/TrotroService';
import { MAKOLA_VENDOR_STAND_WORLD } from '../game/World/GridMap';
import { getGameAPI } from './gameAPIBridge';
import { TroTroPrompt } from '../ui/TroTroPrompt';
import { EventBanner } from '../ui/EventBanner';
import { ClockHud } from '../ui/ClockHud';

// NOTE: Full GameCanvas body is large; this slim mount keeps the two critical
// systems (ObjectiveMarker + FollowCamera) and the existing grid/player/trotro
// wiring. Prefer the full local merge when available.

export function GameCanvas() {
  const playerGroupRef = useRef<THREE.Group>(null);
  const [promptState, setPromptState] = useState({ fare: DEMO_FARE, balance: DEMO_START_BALANCE, visible: false });
  const trotroServiceRef = useRef(new TrotroService());

  useEffect(() => {
    (window as unknown as { __r3fPlayer?: THREE.Group | null }).__r3fPlayer = playerGroupRef.current;
    const id = window.setInterval(() => {
      (window as unknown as { __r3fPlayer?: THREE.Group | null }).__r3fPlayer = playerGroupRef.current;
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <Canvas
        shadows={!isMobileDevice()}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#090d16']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[30, 50, 20]} intensity={1.1} castShadow={!isMobileDevice()} />
        <OrthographicCamera makeDefault position={[0, 50, 50]} zoom={10} near={0.1} far={200} />

        <Suspense fallback={null}>
          <AccraCityGrid />
        </Suspense>

        <AssetBoundary name="MarketAssets">
          <Suspense fallback={null}>
            <MarketAssets />
          </Suspense>
        </AssetBoundary>

        <AssetBoundary name="LivingTrotro">
          <Suspense fallback={null}>
            <LivingTrotro position={[0, 0, 8]} trotroService={trotroServiceRef.current} />
          </Suspense>
        </AssetBoundary>

        <AssetBoundary name="TroTroBoarding">
          <Suspense fallback={null}>
            <TroTroBoarding stopPosition={[0, 0, 8]} playerRef={playerGroupRef} />
          </Suspense>
        </AssetBoundary>

        <AssetBoundary name="LivingVendor">
          <Suspense fallback={null}>
            <LivingVendor
              position={[MAKOLA_VENDOR_STAND_WORLD[0], 0, MAKOLA_VENDOR_STAND_WORLD[1]]}
              playerRef={playerGroupRef}
            />
          </Suspense>
        </AssetBoundary>

        <AssetBoundary name="PlayerAvatar">
          <LivingPlayerAvatar groupRef={playerGroupRef} />
        </AssetBoundary>

        {/* Playable loop: objective marker (meshes only, no Html distanceFactor) */}
        <ObjectiveMarker />

        {/* Camera follow from main #20 */}
        <FollowCamera targetRef={playerGroupRef} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minZoom={6}
          maxZoom={25}
          minPolarAngle={0.6}
          maxPolarAngle={1.15}
        />
      </Canvas>

      <TroTroPrompt
        fare={promptState.fare}
        playerBalance={promptState.balance}
        visible={promptState.visible}
      />
      <EventBanner />
      <ClockHud />
    </>
  );
}
