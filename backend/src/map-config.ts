/**
 * Single source for arena layout, spawns, and collision (server + client via Vite alias).
 */

export interface Obstacle {
  kind: 'pillar' | 'wall';
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export const PLAYER_COLLISION_RADIUS = 0.3;

export type MapId = 'classic' | 'maze';

export const MAP_IDS: MapId[] = ['classic', 'maze'];

export interface MapDefinition {
  id: MapId;
  label: string;
  /** Shown under maze option — queue may be slower. */
  queueHint?: string;
  arenaHalf: number;
  obstacles: Obstacle[];
  /** Index 0 / 1 — hunter randomization uses these positions. */
  spawns: [{ x: number; z: number }, { x: number; z: number }];
  hunterCatchDistance: number;
}

const CLASSIC_OBSTACLES: Obstacle[] = [
  { kind: 'pillar', x: -8, z: -2, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 8, z: 2, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: -2, z: 8, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 2, z: -8, halfW: 0.45, halfD: 0.45 },
  { kind: 'wall', x: 0, z: -6, halfW: 3.5, halfD: 0.3 },
  { kind: 'wall', x: 0, z: 6, halfW: 3.5, halfD: 0.3 },
  { kind: 'wall', x: -6, z: 0, halfW: 0.3, halfD: 3.5 },
  { kind: 'wall', x: 6, z: 0, halfW: 0.3, halfD: 3.5 },
];

/** Maze-like center, open corners / outer ring for chases. */
const MAZE_OBSTACLES: Obstacle[] = [
  { kind: 'pillar', x: -13, z: -13, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 13, z: 13, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: -13, z: 13, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 13, z: -13, halfW: 0.45, halfD: 0.45 },
  // North row
  { kind: 'wall', x: -6, z: -10, halfW: 3.2, halfD: 0.3 },
  { kind: 'wall', x: 6, z: -10, halfW: 3.2, halfD: 0.3 },
  { kind: 'wall', x: 0, z: -10, halfW: 1.2, halfD: 0.3 },
  // South row
  { kind: 'wall', x: -6, z: 10, halfW: 3.2, halfD: 0.3 },
  { kind: 'wall', x: 6, z: 10, halfW: 3.2, halfD: 0.3 },
  { kind: 'wall', x: 0, z: 10, halfW: 1.2, halfD: 0.3 },
  // West column
  { kind: 'wall', x: -10, z: -5, halfW: 0.3, halfD: 2.8 },
  { kind: 'wall', x: -10, z: 5, halfW: 0.3, halfD: 2.8 },
  // East column
  { kind: 'wall', x: 10, z: -5, halfW: 0.3, halfD: 2.8 },
  { kind: 'wall', x: 10, z: 5, halfW: 0.3, halfD: 2.8 },
  // Inner maze core
  { kind: 'wall', x: -4, z: -4, halfW: 2.8, halfD: 0.3 },
  { kind: 'wall', x: 4, z: -4, halfW: 2.8, halfD: 0.3 },
  { kind: 'wall', x: -4, z: 4, halfW: 2.8, halfD: 0.3 },
  { kind: 'wall', x: 4, z: 4, halfW: 2.8, halfD: 0.3 },
  { kind: 'wall', x: 0, z: 0, halfW: 0.3, halfD: 2.6 },
  { kind: 'wall', x: -4, z: 0, halfW: 0.3, halfD: 2.6 },
  { kind: 'wall', x: 4, z: 0, halfW: 0.3, halfD: 2.6 },
  { kind: 'wall', x: 0, z: -4, halfW: 2.6, halfD: 0.3 },
  { kind: 'wall', x: 0, z: 4, halfW: 2.6, halfD: 0.3 },
];

const MAPS: Record<MapId, MapDefinition> = {
  classic: {
    id: 'classic',
    label: 'Arena',
    arenaHalf: 15,
    obstacles: CLASSIC_OBSTACLES,
    spawns: [
      { x: -8, z: -8 },
      { x: 8, z: 8 },
    ],
    hunterCatchDistance: 1.2,
  },
  maze: {
    id: 'maze',
    label: 'Labyrinth',
    queueHint: 'Fewer players on this map — matchmaking may take longer.',
    arenaHalf: 15,
    obstacles: MAZE_OBSTACLES,
    spawns: [
      { x: -11, z: -11 },
      { x: 11, z: 11 },
    ],
    hunterCatchDistance: 1.15,
  },
};

export function getMapDefinition(mapId: MapId): MapDefinition {
  return MAPS[mapId];
}

export function isValidMapId(value: string): value is MapId {
  return value === 'classic' || value === 'maze';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveObstacleCollisions(
  x: number,
  z: number,
  radius: number,
  obstacles: Obstacle[],
): { x: number; z: number } {
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
