import { ARENA_HALF } from '../game/constants';
import { OBSTACLES } from '../game/obstacles';

const WALL_HEIGHT = 1.2;
const WALL_THICKNESS = 0.5;
const FLOOR_SIZE = ARENA_HALF * 2;

const wallColor = '#1e1e2e';
const floorColor = '#111118';
const obstacleWallColor = '#20243a';
const pillarAccentColors = ['#ff5010', '#00dcff', '#00dcff', '#ff5010'] as const;

function Wall({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={wallColor} roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

export function Arena() {
  const tileCount = 10;
  const tileSize = FLOOR_SIZE / tileCount;
  const pillarObstacles = OBSTACLES.filter((o) => o.kind === 'pillar');
  const centerWalls = OBSTACLES.filter((o) => o.kind === 'wall');

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color={floorColor} roughness={1} metalness={0} />
      </mesh>

      {/* Walls: North, South, East, West */}
      <Wall
        position={[0, WALL_HEIGHT / 2, -ARENA_HALF - WALL_THICKNESS / 2]}
        args={[FLOOR_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]}
      />
      <Wall
        position={[0, WALL_HEIGHT / 2, ARENA_HALF + WALL_THICKNESS / 2]}
        args={[FLOOR_SIZE + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS]}
      />
      <Wall
        position={[-ARENA_HALF - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]}
        args={[WALL_THICKNESS, WALL_HEIGHT, FLOOR_SIZE]}
      />
      <Wall
        position={[ARENA_HALF + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]}
        args={[WALL_THICKNESS, WALL_HEIGHT, FLOOR_SIZE]}
      />

      {/* Neon edge strips along wall tops */}
      <mesh position={[0, WALL_HEIGHT + 0.02, -ARENA_HALF]}>
        <boxGeometry args={[FLOOR_SIZE, 0.05, 0.05]} />
        <meshStandardMaterial color="#ff5010" emissive="#ff5010" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT + 0.02, ARENA_HALF]}>
        <boxGeometry args={[FLOOR_SIZE, 0.05, 0.05]} />
        <meshStandardMaterial color="#00dcff" emissive="#00dcff" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[-ARENA_HALF, WALL_HEIGHT + 0.02, 0]}>
        <boxGeometry args={[0.05, 0.05, FLOOR_SIZE]} />
        <meshStandardMaterial color="#ff5010" emissive="#ff5010" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[ARENA_HALF, WALL_HEIGHT + 0.02, 0]}>
        <boxGeometry args={[0.05, 0.05, FLOOR_SIZE]} />
        <meshStandardMaterial color="#00dcff" emissive="#00dcff" emissiveIntensity={0.8} />
      </mesh>

      {/* Grid tiles for depth */}
      {Array.from({ length: tileCount * tileCount }).map((_, i) => {
        const xi = i % tileCount;
        const zi = Math.floor(i / tileCount);
        const tx = -ARENA_HALF + tileSize * 0.5 + xi * tileSize;
        const tz = -ARENA_HALF + tileSize * 0.5 + zi * tileSize;
        const alt = (xi + zi) % 2 === 0;

        return (
          <mesh key={`tile-${i}`} position={[tx, 0.02, tz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tileSize * 0.92, tileSize * 0.92]} />
            <meshStandardMaterial
              color={alt ? '#151526' : '#10101c'}
              emissive={alt ? '#0e0f18' : '#0a0b14'}
              emissiveIntensity={0.2}
              roughness={0.95}
              metalness={0.05}
            />
          </mesh>
        );
      })}

      {/* Neon pillars as landmarks */}
      {pillarObstacles.map((pillar, idx) => (
        <group key={`pillar-${idx}`} position={[pillar.x, 0, pillar.z]}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[pillar.halfW * 2, 1.1, pillar.halfD * 2]} />
            <meshStandardMaterial color="#202235" roughness={0.75} metalness={0.15} />
          </mesh>
          <mesh position={[0, 1.12, 0]}>
            <boxGeometry args={[pillar.halfW * 1.75, 0.06, pillar.halfD * 1.75]} />
            <meshStandardMaterial
              color={pillarAccentColors[idx % pillarAccentColors.length]}
              emissive={pillarAccentColors[idx % pillarAccentColors.length]}
              emissiveIntensity={1.8}
              roughness={0.2}
              metalness={0.4}
            />
          </mesh>
        </group>
      ))}

      {/* Gameplay center walls (blocking obstacles) */}
      {centerWalls.map((barrier, idx) => {
        const width = barrier.halfW * 2;
        const depth = barrier.halfD * 2;
        const isHorizontal = width >= depth;
        const accentColor = idx % 2 === 0 ? '#00dcff' : '#ff5010';
        const stripArgs: [number, number, number] = isHorizontal
          ? [width, 0.05, 0.06]
          : [0.06, 0.05, depth];

        return (
          <group key={`center-wall-${idx}`} position={[barrier.x, 0, barrier.z]}>
            <mesh position={[0, WALL_HEIGHT / 2, 0]}>
              <boxGeometry args={[width, WALL_HEIGHT, depth]} />
              <meshStandardMaterial color={obstacleWallColor} roughness={0.86} metalness={0.12} />
            </mesh>
            <mesh position={[0, WALL_HEIGHT + 0.03, 0]}>
              <boxGeometry args={stripArgs} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
