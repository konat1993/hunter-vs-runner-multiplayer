import type { Room } from '@colyseus/sdk';
import type { InputFrame } from './input';
import { INPUT_RATE_HZ } from './constants';

const INPUT_INTERVAL_MS = 1000 / INPUT_RATE_HZ;

let lastSentAt = 0;
let lastSentInput: Pick<InputFrame, 'dirX' | 'dirZ' | 'sprint'> | null = null;

export function sendInput(room: Room, input: InputFrame) {
  const now = performance.now();
  const inputChanged =
    !lastSentInput ||
    lastSentInput.dirX !== input.dirX ||
    lastSentInput.dirZ !== input.dirZ ||
    lastSentInput.sprint !== input.sprint;

  // Never throttle state transitions (e.g. movement -> stop), only repeated identical frames.
  if (!inputChanged && now - lastSentAt < INPUT_INTERVAL_MS) return;

  lastSentAt = now;
  lastSentInput = { dirX: input.dirX, dirZ: input.dirZ, sprint: input.sprint };
  room.send('player:input', input);
}

export function resetNetThrottle() {
  lastSentAt = 0;
  lastSentInput = null;
}
