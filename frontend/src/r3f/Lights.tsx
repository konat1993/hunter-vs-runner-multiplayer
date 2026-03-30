export function Lights() {
  return (
    <>
      <ambientLight intensity={0.2} color="#0a0f1c" />
      <hemisphereLight intensity={0.34} color="#7d92ff" groundColor="#12141f" />
      <directionalLight
        position={[12, 20, 10]}
        intensity={0.62}
        color="#dce6ff"
        castShadow={false}
      />
      <pointLight position={[-8, 3.2, -8]} intensity={1.25} distance={58} decay={2} color="#ff6030" />
      <pointLight position={[8, 3.2, 8]} intensity={1.25} distance={58} decay={2} color="#20e8ff" />
      <pointLight position={[0, 6.5, 0]} intensity={0.45} distance={62} decay={2} color="#5c6ee8" />
    </>
  );
}
