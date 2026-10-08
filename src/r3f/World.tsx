import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Ground } from './Ground';

/** Phone-first 3D world shell. Walk / earn / home land in later step PRs. */
export function World() {
  return (
    <Canvas
      dpr={[1, 1.25]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#090d16']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 40, 15]} intensity={1} />
      <OrthographicCamera makeDefault position={[0, 40, 40]} zoom={12} near={0.1} far={200} />
      <Ground />
    </Canvas>
  );
}
