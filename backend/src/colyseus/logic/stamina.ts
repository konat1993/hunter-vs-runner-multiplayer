import type { PlayerState } from '../state/PlayerState';

const STAMINA_MAX = 100;
const DRAIN_PER_SEC = 25;
const REGEN_PER_SEC = 15;
const SPRINT_MIN_STAMINA = 0;

export function updateStamina(
  player: PlayerState,
  sprinting: boolean,
  moving: boolean,
  dtMs: number,
) {
  const dt = dtMs / 1000;
  const canSprint =
    player.sprintReady &&
    sprinting &&
    moving &&
    player.stamina > SPRINT_MIN_STAMINA;

  if (canSprint) {
    player.stamina = Math.max(0, player.stamina - DRAIN_PER_SEC * dt);
    if (player.stamina <= 0) {
      player.stamina = 0;
      player.sprintReady = false;
    }
    return;
  }

  if (!player.sprintReady) {
    player.stamina = Math.min(STAMINA_MAX, player.stamina + REGEN_PER_SEC * dt);
    if (player.stamina >= STAMINA_MAX) {
      player.stamina = STAMINA_MAX;
      player.sprintReady = true;
    }
  } else {
    player.stamina = Math.min(STAMINA_MAX, player.stamina + REGEN_PER_SEC * dt);
  }
}
