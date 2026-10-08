/** Simple ground plane — replaced by Accra block in the Walk step. */
export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
  );
}
