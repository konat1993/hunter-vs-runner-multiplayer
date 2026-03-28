import type { Obstacle } from '@map-config';
import { getMapDefinition, type MapId } from '@map-config';
import type { InputFrame } from './input';
import {
  WALK_SPEED,
  SPRINT_SPEED,
  STAMINA_MAX,
  STAMINA_DRAIN_PER_SEC,
  STAMINA_REGEN_PER_SEC,
  SPRINT_MIN_STAMINA,
} from './constants';
import { PLAYER_COLLISION_RADIUS, resolveObstacleCollisions } from './obstacles';

export interface PredictedState {
  x: number;
  z: number;
  stamina: number;
  sprintReady: boolean;
}

export function applyInputToState(
  state: PredictedState,
  input: InputFrame,
  arenaHalf: number,
  obstacles: Obstacle[],
): PredictedState {
  const dt = input.dtMs / 1000;
  let { x, z, stamina, sprintReady } = state;

  const canSprint = sprintReady && input.sprint && stamina > SPRINT_MIN_STAMINA;
  const speed = (input.dirX !== 0 || input.dirZ !== 0)
    ? (canSprint ? SPRINT_SPEED : WALK_SPEED)
    : 0;

  const isMoving = input.dirX !== 0 || input.dirZ !== 0;

  x += input.dirX * speed * dt;
  z += input.dirZ * speed * dt;

  // Clamp to arena bounds
  x = Math.max(-arenaHalf, Math.min(arenaHalf, x));
  z = Math.max(-arenaHalf, Math.min(arenaHalf, z));

  const resolved = resolveObstacleCollisions(x, z, PLAYER_COLLISION_RADIUS, obstacles);
  x = resolved.x;
  z = resolved.z;

  // Stamina update
  if (canSprint && isMoving) {
    stamina = Math.max(0, stamina - STAMINA_DRAIN_PER_SEC * dt);
    if (stamina <= 0) {
      stamina = 0;
      sprintReady = false;
    }
  } else if (!sprintReady) {
    stamina = Math.min(STAMINA_MAX, stamina + STAMINA_REGEN_PER_SEC * dt);
    if (stamina >= STAMINA_MAX) {
      stamina = STAMINA_MAX;
      sprintReady = true;
    }
  } else {
    stamina = Math.min(STAMINA_MAX, stamina + STAMINA_REGEN_PER_SEC * dt);
  }

  return { x, z, stamina, sprintReady };
}

export class PredictionBuffer {
  private pending: InputFrame[] = [];
  private state: PredictedState = { x: 0, z: 0, stamina: 100, sprintReady: true };
  private arenaHalf = getMapDefinition('classic').arenaHalf;
  private obstacles: Obstacle[] = getMapDefinition('classic').obstacles;

  syncMap(mapId: MapId) {
    const def = getMapDefinition(mapId);
    this.arenaHalf = def.arenaHalf;
    this.obstacles = def.obstacles;
  }

  getState(): PredictedState {
    return { ...this.state };
  }

  applyInput(input: InputFrame): PredictedState {
    this.state = applyInputToState(this.state, input, this.arenaHalf, this.obstacles);
    this.pending.push(input);
    return { ...this.state };
  }

  reconcile(
    authoritative: { x: number; z: number; stamina: number; sprintReady: boolean },
    lastProcessedSeq: number,
  ) {
    // Drop confirmed inputs
    this.pending = this.pending.filter((i) => i.seq > lastProcessedSeq);

    // Start from server authoritative state
    let reconciled: PredictedState = {
      x: authoritative.x,
      z: authoritative.z,
      stamina: authoritative.stamina,
      sprintReady: authoritative.sprintReady,
    };

    // Re-apply unprocessed inputs
    for (const input of this.pending) {
      reconciled = applyInputToState(reconciled, input, this.arenaHalf, this.obstacles);
    }

    // Snap prevention: if divergence is huge, hard-snap; otherwise smooth
    const dx = reconciled.x - this.state.x;
    const dz = reconciled.z - this.state.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 2) {
      this.state = reconciled;
    } else {
      // Smooth correction over time
      this.state = {
        x: this.state.x + dx * 0.3,
        z: this.state.z + dz * 0.3,
        stamina: reconciled.stamina,
        sprintReady: reconciled.sprintReady,
      };
    }
  }

  reset(x: number, z: number, stamina = 100, sprintReady = true) {
    this.state = { x, z, stamina, sprintReady };
    this.pending = [];
  }
}
