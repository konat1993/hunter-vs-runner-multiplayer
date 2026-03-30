/**
 * Single source for arena layout, spawns, and collision (server + client via Vite alias).
 */

import { generateMazeObstaclesRaw } from './maze-generator';

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

/** Uniform scale vs original 15m half-extent layout (30% smaller playfield). */
export const ARENA_WORLD_SCALE = 0.7;

const ARENA_HALF_BASE = 15;

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

function scaleObstacle(o: Obstacle): Obstacle {
  const s = ARENA_WORLD_SCALE;
  return {
    kind: o.kind,
    x: o.x * s,
    z: o.z * s,
    halfW: o.halfW * s,
    halfD: o.halfD * s,
  };
}

/** Coordinates in pre-scale “design” space (15m half arena). */
const CLASSIC_OBSTACLES_RAW: Obstacle[] = [
  { kind: 'pillar', x: -8, z: -2, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 8, z: 2, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: -2, z: 8, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 2, z: -8, halfW: 0.45, halfD: 0.45 },
  { kind: 'wall', x: 0, z: -6, halfW: 3.5, halfD: 0.3 },
  { kind: 'wall', x: 0, z: 6, halfW: 3.5, halfD: 0.3 },
  { kind: 'wall', x: -6, z: 0, halfW: 0.3, halfD: 3.5 },
  { kind: 'wall', x: 6, z: 0, halfW: 0.3, halfD: 3.5 },
];

const CLASSIC_OBSTACLES: Obstacle[] = CLASSIC_OBSTACLES_RAW.map(scaleObstacle);

/** Deterministic grid maze + corner pillars; design space before ARENA_WORLD_SCALE. */
const MAZE_OBSTACLES_RAW: Obstacle[] = generateMazeObstaclesRaw().map((o) => ({ ...o }));

const MAZE_OBSTACLES: Obstacle[] = MAZE_OBSTACLES_RAW.map(scaleObstacle);

function scaleSpawn(p: { x: number; z: number }): { x: number; z: number } {
  const s = ARENA_WORLD_SCALE;
  return { x: p.x * s, z: p.z * s };
}

const MAPS: Record<MapId, MapDefinition> = {
  classic: {
    id: 'classic',
    label: 'Arena',
    arenaHalf: ARENA_HALF_BASE * ARENA_WORLD_SCALE,
    obstacles: CLASSIC_OBSTACLES,
    spawns: [scaleSpawn({ x: -8, z: -8 }), scaleSpawn({ x: 8, z: 8 })],
    /** Tight but playable — closer than original 1.2, looser than 0.55 overlap-only. */
    hunterCatchDistance: 0.78,
  },
  maze: {
    id: 'maze',
    label: 'Labyrinth',
    queueHint: 'Fewer players on this map — matchmaking may take longer.',
    arenaHalf: ARENA_HALF_BASE * ARENA_WORLD_SCALE,
    obstacles: MAZE_OBSTACLES,
    spawns: [scaleSpawn({ x: -11, z: -11 }), scaleSpawn({ x: 11, z: 11 })],
    hunterCatchDistance: 0.78,
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

/** Disc vs axis-aligned rectangle — for spawn checks and grid BFS. */
export function isDiscClearOfObstacles(
  x: number,
  z: number,
  radius: number,
  obstacles: Obstacle[],
): boolean {
  for (const obs of obstacles) {
    const minX = obs.x - obs.halfW;
    const maxX = obs.x + obs.halfW;
    const minZ = obs.z - obs.halfD;
    const maxZ = obs.z + obs.halfD;
    const closestX = clamp(x, minX, maxX);
    const closestZ = clamp(z, minZ, maxZ);
    const dx = x - closestX;
    const dz = z - closestZ;
    if (dx * dx + dz * dz < radius * radius) return false;
  }
  return true;
}

/**
 * Shortest path length in grid steps (4-neighbour BFS). Returns null if unreachable.
 * Coarse navigation metric for layout validation — not used in gameplay.
 */
export function shortestPathGridSteps(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  arenaHalf: number,
  obstacles: Obstacle[],
  radius: number,
  cellStep = 0.38,
): number | null {
  const span = 2 * arenaHalf;
  const n = Math.max(2, Math.ceil(span / cellStep));
  const idx = (ix: number, iz: number) => iz * n + ix;

  const walkable: boolean[] = new Array(n * n);
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = -arenaHalf + (ix + 0.5) * cellStep;
      const z = -arenaHalf + (iz + 0.5) * cellStep;
      walkable[idx(ix, iz)] = isDiscClearOfObstacles(x, z, radius, obstacles);
    }
  }

  const clampI = (v: number) => Math.max(0, Math.min(n - 1, v));
  const ixf = clampI(Math.floor((fromX + arenaHalf) / cellStep));
  const izf = clampI(Math.floor((fromZ + arenaHalf) / cellStep));
  const ixt = clampI(Math.floor((toX + arenaHalf) / cellStep));
  const izt = clampI(Math.floor((toZ + arenaHalf) / cellStep));

  const nearestWalkable = (ix: number, iz: number): [number, number] | null => {
    if (walkable[idx(ix, iz)]) return [ix, iz];
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (!walkable[idx(i, j)]) continue;
        const dd = (i - ix) ** 2 + (j - iz) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = [i, j];
        }
      }
    }
    return best;
  };

  const start = nearestWalkable(ixf, izf);
  const endPt = nearestWalkable(ixt, izt);
  if (!start || !endPt) return null;
  const [sx, sz] = start;
  const [ex, ez] = endPt;

  const startKey = idx(sx, sz);
  const goalKey = idx(ex, ez);
  if (!walkable[startKey] || !walkable[goalKey]) return null;

  const dist = new Map<number, number>();
  const q: number[] = [startKey];
  dist.set(startKey, 0);

  while (q.length > 0) {
    const cur = q.shift()!;
    if (cur === goalKey) return dist.get(cur) ?? null;
    const iz = Math.floor(cur / n);
    const ix = cur - iz * n;
    const d0 = dist.get(cur) ?? 0;
    const neigh: [number, number][] = [
      [ix + 1, iz],
      [ix - 1, iz],
      [ix, iz + 1],
      [ix, iz - 1],
    ];
    for (const [nx, nz] of neigh) {
      if (nx < 0 || nx >= n || nz < 0 || nz >= n) continue;
      const k = idx(nx, nz);
      if (!walkable[k] || dist.has(k)) continue;
      dist.set(k, d0 + 1);
      q.push(k);
    }
  }

  return null;
}
