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
      <pointLight position={[-6, 2.8, -6]} intensity={1.1} distance={52} decay={2} color="#ff5010" />
      <pointLight position={[6, 2.8, 6]} intensity={1.1} distance={52} decay={2} color="#00dcff" />
      <pointLight position={[0, 6, 0]} intensity={0.5} distance={56} decay={2} color="#6a7dff" />
    </>
  );
}
