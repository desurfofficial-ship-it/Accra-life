/**
 * GameCanvas — Phase-1 custom map.
 * Movement lives in PlayerAvatar (capsule first, 4 m/s joystick).
 */
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { AccraCityGrid } from './AccraCityGrid';
import { TroTroBoarding, DEMO_FARE, DEMO_START_BALANCE } from './TroTroBoarding';
import { LivingTrotro } from './LivingTrotro';
import { PlayerAvatar } from './PlayerAvatar';
import { ObjectiveMarker } from './ObjectiveMarker';
import { FollowCamera } from './FollowCamera';
import { LivingVendor } from './LivingVendor';
import { MarketAssets } from './MarketAssets';
import { AssetBoundary } from './AssetBoundary';
import { isMobileDevice } from '../debug/DebugOverlay';
import { TrotroService } from '../game/World/TrotroService';
import { MAKOLA_VENDOR_STAND_WORLD } from '../game/World/GridMap';
import { TroTroPrompt } from '../ui/TroTroPrompt';
import { EventBanner } from '../ui/EventBanner';
import { ClockHud } from '../ui/ClockHud';

function DebugRendererProbe() {
  const { gl } = useThree();
  useEffect(() => {
    (window as unknown as { __debugGetR3FRenderer?: () => typeof gl }).__debugGetR3FRenderer = () => gl;
    return () => {
      delete (window as unknown as { __debugGetR3FRenderer?: () => typeof gl }).__debugGetR3FRenderer;
    };
  }, [gl]);
  return null;
}

export function GameCanvas() {
  const playerGroupRef = useRef<THREE.Group>(null);
  const [promptState] = useState({ fare: DEMO_FARE, balance: DEMO_START_BALANCE, visible: false });
  const trotroServiceRef = useRef(new TrotroService());

  useEffect(() => {
    (window as unknown as { __r3fPlayer?: RefObject<THREE.Group | null> }).__r3fPlayer = playerGroupRef;
    return () => {
      delete (window as unknown as { __r3fPlayer?: RefObject<THREE.Group | null> }).__r3fPlayer;
    };
  }, []);

  const mobile = isMobileDevice();

  return (
    <>
      <Canvas
        shadows={!mobile}
        dpr={mobile ? [1, 1.25] : [1, 1.5]}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: !mobile, alpha: false, powerPreference: 'high-performance' }}
      >
        <DebugRendererProbe />
        <color attach="background" args={['#090d16']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[30, 50, 20]} intensity={1.1} castShadow={!mobile} />
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

        <PlayerAvatar groupRef={playerGroupRef} />

        <ObjectiveMarker />
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
