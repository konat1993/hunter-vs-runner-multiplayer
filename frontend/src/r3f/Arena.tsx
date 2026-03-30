import { RoundedBox } from '@react-three/drei';
import type { MapId, Obstacle } from '../game/obstacles';

const WALL_HEIGHT_BASE = 1.2;
/** Interior maze segments — slightly taller than arena rim for readability */
const MAZE_WALL_HEIGHT = 1.34;
const WALL_THICKNESS = 0.5;

const wallColor = '#1a1c28';
/** Base floor — bright neutral grey-blue for readability. */
const floorColor = '#3c4452';
const obstacleBodyMaze = '#252a38';
const pillarAccentColors = ['#ff5010', '#00dcff', '#00dcff', '#ff5010'] as const;

const ORANGE = '#ff5010';
const CYAN = '#00dcff';

function wallHeightForIndex(idx: number): number {
  const h = ((idx * 2654435761) >>> 0) % 3;
  return WALL_HEIGHT_BASE + h * 0.09;
}

function Wall({
  position,
  args,
}: {
  position: [number, number, number];
  args: [number, number, number];
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={wallColor} roughness={0.88} metalness={0.14} />
    </mesh>
  );
}

function NeonBorderEdge({
  axis,
  fixed,
  span,
  colorNorthSouth,
  colorEastWest,
}: {
  axis: 'x' | 'z';
  fixed: number;
  span: number;
  colorNorthSouth: string;
  colorEastWest: string;
}) {
  const layers = [0, 1, 2];
  const color = axis === 'z' ? colorNorthSouth : colorEastWest;
  const emissive = axis === 'z' ? 1.45 : 1.05;

  return (
    <>
      {layers.map((layer) => {
        const off = (layer - 1) * 0.055;
        const yLift = WALL_HEIGHT_BASE + 0.02 + layer * 0.04;
        if (axis === 'z') {
          return (
            <mesh key={`nb-z-${fixed}-${layer}`} position={[0, yLift, fixed + off]}>
              <boxGeometry args={[span, 0.04, 0.045]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={emissive - layer * 0.12}
                roughness={0.35}
                metalness={0.45}
              />
            </mesh>
          );
        }
        return (
          <mesh key={`nb-x-${fixed}-${layer}`} position={[fixed + off, yLift, 0]}>
            <boxGeometry args={[0.045, 0.04, span]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={emissive - layer * 0.12}
              roughness={0.35}
              metalness={0.45}
            />
          </mesh>
        );
      })}
    </>
  );
}

export interface ArenaProps {
  arenaHalf: number;
  obstacles: Obstacle[];
  mapId?: MapId;
  /** Maze: subtle floor tint for the exposed double-wide strip. */
  riskyCorridor?: { x: number; z: number; halfW: number; halfD: number };
}

export function Arena({
  arenaHalf,
  obstacles,
  mapId = 'classic',
  riskyCorridor,
}: ArenaProps) {
  const floorSize = arenaHalf * 2;
  const tileCount = mapId === 'maze' ? 12 : 10;
  const tileSize = floorSize / tileCount;
  const pillarObstacles = obstacles.filter((o) => o.kind === 'pillar');
  const centerWalls = obstacles.filter((o) => o.kind === 'wall');

  const halfW = arenaHalf * 0.5;

  return (
    <group>
      {/* Base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={floorColor} roughness={1} metalness={0} />
      </mesh>

      {/* Soft zone tint (matte) — no neon on floor tiles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-halfW, 0.006, 0]}>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial
          color="#4a4540"
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[halfW, 0.006, 0]}>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial
          color="#424a58"
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>

      {/* Perimeter walls */}
      <Wall
        position={[0, WALL_HEIGHT_BASE / 2, -arenaHalf - WALL_THICKNESS / 2]}
        args={[floorSize + WALL_THICKNESS * 2, WALL_HEIGHT_BASE, WALL_THICKNESS]}
      />
      <Wall
        position={[0, WALL_HEIGHT_BASE / 2, arenaHalf + WALL_THICKNESS / 2]}
        args={[floorSize + WALL_THICKNESS * 2, WALL_HEIGHT_BASE, WALL_THICKNESS]}
      />
      <Wall
        position={[-arenaHalf - WALL_THICKNESS / 2, WALL_HEIGHT_BASE / 2, 0]}
        args={[WALL_THICKNESS, WALL_HEIGHT_BASE, floorSize]}
      />
      <Wall
        position={[arenaHalf + WALL_THICKNESS / 2, WALL_HEIGHT_BASE / 2, 0]}
        args={[WALL_THICKNESS, WALL_HEIGHT_BASE, floorSize]}
      />

      <NeonBorderEdge
        axis="z"
        fixed={-arenaHalf}
        span={floorSize}
        colorNorthSouth={ORANGE}
        colorEastWest={ORANGE}
      />
      <NeonBorderEdge
        axis="z"
        fixed={arenaHalf}
        span={floorSize}
        colorNorthSouth={CYAN}
        colorEastWest={CYAN}
      />
      <NeonBorderEdge
        axis="x"
        fixed={-arenaHalf}
        span={floorSize}
        colorNorthSouth={ORANGE}
        colorEastWest={ORANGE}
      />
      <NeonBorderEdge
        axis="x"
        fixed={arenaHalf}
        span={floorSize}
        colorNorthSouth={CYAN}
        colorEastWest={CYAN}
      />

      {riskyCorridor && mapId === 'maze' ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[riskyCorridor.x, 0.022, riskyCorridor.z]}
        >
          <planeGeometry args={[riskyCorridor.halfW * 2, riskyCorridor.halfD * 2]} />
          <meshStandardMaterial
            color="#6a5048"
            roughness={0.94}
            metalness={0.05}
            transparent
            opacity={0.55}
          />
        </mesh>
      ) : null}

      {Array.from({ length: tileCount * tileCount }).map((_, i) => {
        const xi = i % tileCount;
        const zi = Math.floor(i / tileCount);
        const tx = -arenaHalf + tileSize * 0.5 + xi * tileSize;
        const tz = -arenaHalf + tileSize * 0.5 + zi * tileSize;
        const alt = (xi + zi) % 2 === 0;
        const warmSide = tx < 0;
        const tileLight = alt
          ? warmSide
            ? '#524c46'
            : '#4a5260'
          : warmSide
            ? '#5d5852'
            : '#545c68';

        return (
          <mesh key={`tile-${i}`} position={[tx, 0.018, tz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tileSize * 0.98, tileSize * 0.98]} />
            <meshStandardMaterial
              color={tileLight}
              roughness={0.88}
              metalness={0.06}
            />
          </mesh>
        );
      })}

      {pillarObstacles.map((pillar, idx) => (
        <group key={`pillar-${idx}`} position={[pillar.x, 0, pillar.z]}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[pillar.halfW * 2, 1.1, pillar.halfD * 2]} />
            <meshStandardMaterial color="#1a1e32" roughness={0.72} metalness={0.2} />
          </mesh>
          <mesh position={[0, 1.12, 0]}>
            <boxGeometry args={[pillar.halfW * 1.75, 0.06, pillar.halfD * 1.75]} />
            <meshStandardMaterial
              color={pillarAccentColors[idx % pillarAccentColors.length]}
              emissive={pillarAccentColors[idx % pillarAccentColors.length]}
              emissiveIntensity={1.85}
              roughness={0.18}
              metalness={0.5}
            />
          </mesh>
        </group>
      ))}

      {centerWalls.map((barrier, idx) => {
        const width = barrier.halfW * 2;
        const depth = barrier.halfD * 2;
        const isHorizontal = width >= depth;
        const zoneAccent = barrier.x < 0 ? ORANGE : CYAN;
        const wh =
          mapId === 'maze' ? MAZE_WALL_HEIGHT : wallHeightForIndex(idx);
        const stripArgs: [number, number, number] = isHorizontal
          ? [width * 0.92, 0.05, 0.075]
          : [0.075, 0.05, depth * 0.92];

        return (
          <group key={`center-wall-${idx}`} position={[barrier.x, 0, barrier.z]}>
            <RoundedBox
              args={[width, wh, depth]}
              radius={mapId === 'maze' ? 0.06 : 0.03}
              smoothness={4}
              position={[0, wh / 2, 0]}
            >
              <meshPhysicalMaterial
                color={mapId === 'maze' ? obstacleBodyMaze : '#1c2034'}
                roughness={0.78}
                metalness={0.22}
                clearcoat={mapId === 'maze' ? 0.28 : 0.12}
                clearcoatRoughness={0.45}
              />
            </RoundedBox>
            <mesh position={[0, wh + 0.035, 0]}>
              <boxGeometry args={stripArgs} />
              <meshStandardMaterial
                color={zoneAccent}
                emissive={zoneAccent}
                emissiveIntensity={mapId === 'maze' ? 1.25 : 1.45}
                roughness={0.28}
                metalness={0.42}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
