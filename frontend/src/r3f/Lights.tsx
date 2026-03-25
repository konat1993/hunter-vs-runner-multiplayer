export function Lights() {
  return (
    <>
      <ambientLight intensity={0.18} color="#0b1020" />
      <hemisphereLight intensity={0.3} color="#8da0ff" groundColor="#141421" />
      <directionalLight
        position={[10, 18, 8]}
        intensity={0.7}
        color="#d8e3ff"
        castShadow={false}
      />
      <pointLight position={[-6, 2.8, -6]} intensity={1.2} distance={18} color="#ff5010" />
      <pointLight position={[6, 2.8, 6]} intensity={1.2} distance={18} color="#00dcff" />
      <pointLight position={[0, 6, 0]} intensity={0.45} distance={30} color="#6a7dff" />
    </>
  );
}
