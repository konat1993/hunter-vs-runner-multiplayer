/**
 * Deterministic grid maze → AABB obstacles (design space, before ARENA_WORLD_SCALE).
 * Used by map-config for the `maze` map — must stay bitwise reproducible on server + client.
 */

export const MAZE_GENERATOR_SEED = 0x48765203;

/** Thicker slabs read better from the isometric camera; keep ~cellSize - 2*thickness > 2*player radius. */
const WALL_THICKNESS_HALF = 0.26;

export interface RawObstacle {
  kind: 'pillar' | 'wall';
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export interface MazeGeneratorParams {
  cols: number;
  rows: number;
  cellSize: number;
  seed: number;
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

type Dir = 0 | 1 | 2 | 3;

function neighbor(ci: number, cj: number, d: Dir): [number, number] | null {
  switch (d) {
    case 0:
      return [ci, cj + 1];
    case 1:
      return [ci + 1, cj];
    case 2:
      return [ci, cj - 1];
    case 3:
      return [ci - 1, cj];
    default:
      return null;
  }
}

function opposite(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

function carveMaze(cols: number, rows: number, rng: () => number): boolean[][][] {
  const w: boolean[][][] = [];
  for (let i = 0; i < cols; i++) {
    w[i] = [];
    for (let j = 0; j < rows; j++) {
      w[i]![j] = [true, true, true, true];
    }
  }

  const visited: boolean[][] = Array.from({ length: cols }, () =>
    Array(rows).fill(false),
  );
  const stack: [number, number][] = [];
  const startI = 0;
  const startJ = 0;
  visited[startI]![startJ] = true;
  stack.push([startI, startJ]);

  const dirs: Dir[] = [0, 1, 2, 3];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1]!;
    const [ci, cj] = cur;
    shuffleInPlace(dirs, rng);
    let advanced = false;
    for (const d of dirs) {
      const nb = neighbor(ci, cj, d);
      if (!nb) continue;
      const [ni, nj] = nb;
      if (ni < 0 || ni >= cols || nj < 0 || nj >= rows) continue;
      if (visited[ni]![nj]) continue;
      w[ci]![cj]![d] = false;
      w[ni]![nj]![opposite(d)] = false;
      visited[ni]![nj] = true;
      stack.push([ni, nj]);
      advanced = true;
      break;
    }
    if (!advanced) stack.pop();
  }

  return w;
}

function openBoundaryGates(
  w: boolean[][][],
  cols: number,
  rows: number,
): void {
  const mj = Math.floor(rows / 2);
  const mi = Math.floor(cols / 2);
  if (mj >= 0 && mj < rows) {
    w[0]![mj]![3] = false;
    w[cols - 1]![mj]![1] = false;
  }
  if (mi >= 0 && mi < cols) {
    w[mi]![0]![2] = false;
    w[mi]![rows - 1]![0] = false;
  }
}

/**
 * Emit each edge once: N and E for every cell; S only for cj===0; W only for ci===0.
 */
function wallSegmentsToObstacles(
  w: boolean[][][],
  cols: number,
  rows: number,
  cellSize: number,
): RawObstacle[] {
  const halfW = cols * cellSize * 0.5;
  const halfH = rows * cellSize * 0.5;
  const minX = -halfW;
  const minZ = -halfH;
  const out: RawObstacle[] = [];
  const t = WALL_THICKNESS_HALF;

  for (let ci = 0; ci < cols; ci++) {
    for (let cj = 0; cj < rows; cj++) {
      const cell = w[ci]![cj]!;
      const cx = minX + (ci + 0.5) * cellSize;
      const cz = minZ + (cj + 0.5) * cellSize;

      if (cell[0]) {
        const z = minZ + (cj + 1) * cellSize;
        out.push({
          kind: 'wall',
          x: cx,
          z,
          halfW: cellSize * 0.5,
          halfD: t,
        });
      }
      if (cell[1]) {
        const x = minX + (ci + 1) * cellSize;
        out.push({
          kind: 'wall',
          x,
          z: cz,
          halfW: t,
          halfD: cellSize * 0.5,
        });
      }
      if (cj === 0 && cell[2]) {
        const z = minZ;
        out.push({
          kind: 'wall',
          x: cx,
          z,
          halfW: cellSize * 0.5,
          halfD: t,
        });
      }
      if (ci === 0 && cell[3]) {
        const x = minX;
        out.push({
          kind: 'wall',
          x,
          z: cz,
          halfW: t,
          halfD: cellSize * 0.5,
        });
      }
    }
  }

  return out;
}

const MAZE_PILLARS_RAW: RawObstacle[] = [
  { kind: 'pillar', x: -13, z: -13, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 13, z: 13, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: -13, z: 13, halfW: 0.45, halfD: 0.45 },
  { kind: 'pillar', x: 13, z: -13, halfW: 0.45, halfD: 0.45 },
];

export function generateMazeObstaclesRaw(
  params?: Partial<MazeGeneratorParams>,
): RawObstacle[] {
  const cols = params?.cols ?? 11;
  const rows = params?.rows ?? 11;
  const cellSize = params?.cellSize ?? 1.38;
  const seed = params?.seed ?? MAZE_GENERATOR_SEED;
  const rng = mulberry32(seed);
  const w = carveMaze(cols, rows, rng);
  openBoundaryGates(w, cols, rows);
  const walls = wallSegmentsToObstacles(w, cols, rows, cellSize);
  return [...MAZE_PILLARS_RAW, ...walls];
}
