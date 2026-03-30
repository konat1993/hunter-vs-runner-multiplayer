/**
 * Position updates use `resolveObstacleCollisions` (AABB) from map-config — not Rapier or another physics engine.
 * Adding Rapier (@dimforge/rapier3d-compat) would imply syncing dynamic bodies with Colyseus and reworking client prediction; only worthwhile if gameplay needs non-box colliders or continuous physics beyond what AABBs provide.
 */
import type { Obstacle } from '../../map-config';
import type { PlayerState } from '../state/PlayerState';
import {
  PLAYER_COLLISION_RADIUS,
  resolveObstacleCollisions,
} from '../../map-config';

const WALK_SPEED = 6.0;
const SPRINT_SPEED = 9.0;

interface InputPayload {
  seq: number;
  dirX: number;
  dirZ: number;
  sprint: boolean;
  dtMs: number;
}

export function applyMovement(
  player: PlayerState,
  input: InputPayload,
  dtMs: number,
  arenaHalf: number,
  obstacles: Obstacle[],
) {
  const dt = dtMs / 1000;

  // Clamp direction
  let dirX = Math.max(-1, Math.min(1, input.dirX));
  let dirZ = Math.max(-1, Math.min(1, input.dirZ));

  // Normalize diagonal
  const mag = Math.sqrt(dirX * dirX + dirZ * dirZ);
  if (mag > 1) {
    dirX /= mag;
    dirZ /= mag;
  }

  const canSprint = player.sprintReady && input.sprint && player.stamina > 0;
  const isMoving = dirX !== 0 || dirZ !== 0;
  const speed = isMoving ? (canSprint ? SPRINT_SPEED : WALK_SPEED) : 0;

  player.x += dirX * speed * dt;
  player.z += dirZ * speed * dt;

  // Clamp to arena
  player.x = Math.max(-arenaHalf, Math.min(arenaHalf, player.x));
  player.z = Math.max(-arenaHalf, Math.min(arenaHalf, player.z));

  const resolved = resolveObstacleCollisions(
    player.x,
    player.z,
    PLAYER_COLLISION_RADIUS,
    obstacles,
  );
  player.x = resolved.x;
  player.z = resolved.z;

  player.vx = dirX * speed;
  player.vz = dirZ * speed;

  player.lastProcessedInputSeq = input.seq;
}
