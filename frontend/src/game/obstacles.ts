/** Re-exports shared arena config (canonical: backend/src/map-config.ts). */
export type { MapDefinition, MapId, Obstacle } from '@map-config';
export {
  getMapDefinition,
  isValidMapId,
  MAP_IDS,
  PLAYER_COLLISION_RADIUS,
  resolveObstacleCollisions,
} from '@map-config';
