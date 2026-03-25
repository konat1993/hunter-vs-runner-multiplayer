import type { PlayerState } from '../state/PlayerState';
import {
  OBSTACLES,
  PLAYER_COLLISION_RADIUS,
  resolveObstacleCollisions,
} from './obstacles';

const WALK_SPEED = 6.0;
const SPRINT_SPEED = 9.0;
const ARENA_HALF = 15;

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
  player.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, player.x));
  player.z = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, player.z));

  const resolved = resolveObstacleCollisions(
    player.x,
    player.z,
    PLAYER_COLLISION_RADIUS,
    OBSTACLES,
  );
  player.x = resolved.x;
  player.z = resolved.z;

  player.vx = dirX * speed;
  player.vz = dirZ * speed;

  player.lastProcessedInputSeq = input.seq;
}
