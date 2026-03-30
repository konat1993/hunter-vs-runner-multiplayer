import { useMemo } from 'react';
import * as THREE from 'three';

/** Dark “circuit” texture for a large backdrop plane — no external assets. */
function makeCircuitTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const t = new THREE.CanvasTexture(canvas);
    t.needsUpdate = true;
    return t;
  }

  ctx.fillStyle = '#04050c';
  ctx.fillRect(0, 0, w, h);

  const drawLines = (color: string, alpha: number, count: number, seed: number) => {
    let s = seed;
    const rnd = () => {
      s = (s * 1103515245 + 12345) >>> 0;
      return s / 4294967296;
    };
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const x1 = rnd() * w;
      const y1 = rnd() * h;
      const x2 = x1 + (rnd() - 0.5) * 120;
      const y2 = y1 + (rnd() - 0.5) * 120;
      if (rnd() > 0.55) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, y2);
        ctx.stroke();
      }
      if (rnd() > 0.92) {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 1.8;
        ctx.fillRect(x1, y1, 3, 3);
        ctx.globalAlpha = alpha;
      }
    }
  };

  drawLines('#00dcff', 0.12, 140, 0x41c0);
  drawLines('#ff5010', 0.1, 110, 0x82d1);
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#4a5a8a';
  for (let g = 0; g < 24; g++) {
    const x = (g / 24) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let g = 0; g < 18; g++) {
    const y = (g / 18) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function ArenaBackdrop({ arenaHalf }: { arenaHalf: number }) {
  const texture = useMemo(() => makeCircuitTexture(), []);
  const floorSize = arenaHalf * 2;

  return (
    <group>
      <mesh position={[0, 10, -arenaHalf - 32]} renderOrder={-5}>
        <planeGeometry args={[floorSize * 3.2, 22]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.42}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-arenaHalf - 32, 10, 0]} rotation={[0, Math.PI / 2, 0]} renderOrder={-5}>
        <planeGeometry args={[floorSize * 3.2, 22]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[arenaHalf + 32, 10, 0]} rotation={[0, -Math.PI / 2, 0]} renderOrder={-5}>
        <planeGeometry args={[floorSize * 3.2, 22]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
