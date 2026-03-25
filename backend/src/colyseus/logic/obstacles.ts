export interface Obstacle {
  kind: 'pillar' | 'wall';
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export const PLAYER_COLLISION_RADIUS = 0.3;

export const OBSTACLES: Obstacle[] = [
  // Existing neon pillars (0.9 x 0.9 footprint)
  { kind: 'pillar', x: -8, z: -2, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 8, z: 2, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: -2, z: 8, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 2, z: -8, halfW: 0.45, halfD: 0.45 },

  // New center walls creating choke points
  { kind: 'wall', x: 0, z: -6, halfW: 3.5, halfD: 0.3 },
  { kind: 'wall', x: 0, z: 6, halfW: 3.5, halfD: 0.3 },
  { kind: 'wall', x: -6, z: 0, halfW: 0.3, halfD: 3.5 },
  { kind: 'wall', x: 6, z: 0, halfW: 0.3, halfD: 3.5 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveObstacleCollisions(
  x: number,
  z: number,
  radius: number,
  obstacles: Obstacle[] = OBSTACLES,
) {
  let px = x;
  let pz = z;

  for (const obs of obstacles) {
    const minX = obs.x - obs.halfW;
    const maxX = obs.x + obs.halfW;
    const minZ = obs.z - obs.halfD;
    const maxZ = obs.z + obs.halfD;

    const closestX = clamp(px, minX, maxX);
    const closestZ = clamp(pz, minZ, maxZ);

    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq >= radius * radius) continue;

    if (distSq > 1e-8) {
      const dist = Math.sqrt(distSq);
      const push = radius - dist;
      px += (dx / dist) * push;
      pz += (dz / dist) * push;
      continue;
    }

    // Player center is inside obstacle projection; push along smallest overlap axis.
    const overlapLeft = px - minX;
    const overlapRight = maxX - px;
    const overlapTop = pz - minZ;
    const overlapBottom = maxZ - pz;

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapZ = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapZ) {
      if (overlapLeft < overlapRight) {
        px = minX - radius;
      } else {
        px = maxX + radius;
      }
    } else if (overlapTop < overlapBottom) {
      pz = minZ - radius;
    } else {
      pz = maxZ + radius;
    }
  }

  return { x: px, z: pz };
}
