import {
  getMapDefinition,
  isDiscClearOfObstacles,
  PLAYER_COLLISION_RADIUS,
  shortestPathGridSteps,
} from './map-config';

describe('map-config maze layout', () => {
  const maze = getMapDefinition('maze');
  const { arenaHalf, obstacles, spawns } = maze;

  it('spawn points are clear of all obstacles', () => {
    const r = PLAYER_COLLISION_RADIUS + 0.02;
    for (const s of spawns) {
      expect(isDiscClearOfObstacles(s.x, s.z, r, obstacles)).toBe(true);
    }
  });

  it('shortest grid path between spawns exists and is non-trivial', () => {
    const [a, b] = spawns;
    const steps = shortestPathGridSteps(
      a.x,
      a.z,
      b.x,
      b.z,
      arenaHalf,
      obstacles,
      PLAYER_COLLISION_RADIUS,
      0.38,
    );
    expect(steps).not.toBeNull();
    expect(steps!).toBeGreaterThan(12);
  });
});
