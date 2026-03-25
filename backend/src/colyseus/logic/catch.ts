import type { PlayerState } from '../state/PlayerState';

const DEBOUNCE_MS = 100;

export class CatchDetector {
  private proximityStartMs: number | null = null;

  check(
    hunter: PlayerState,
    runner: PlayerState,
    catchDistance: number,
    elapsedMs: number,
  ): boolean {
    const dx = hunter.x - runner.x;
    const dz = hunter.z - runner.z;
    const distSq = dx * dx + dz * dz;
    const catchDistSq = catchDistance * catchDistance;

    if (distSq <= catchDistSq) {
      if (this.proximityStartMs === null) {
        this.proximityStartMs = elapsedMs;
      } else if (elapsedMs - this.proximityStartMs >= DEBOUNCE_MS) {
        return true;
      }
    } else {
      this.proximityStartMs = null;
    }

    return false;
  }

  reset() {
    this.proximityStartMs = null;
  }
}
