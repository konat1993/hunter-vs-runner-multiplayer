import type { Room } from '@colyseus/sdk';
import type { InputFrame } from './input';
import { INPUT_RATE_HZ } from './constants';

const INPUT_INTERVAL_MS = 1000 / INPUT_RATE_HZ;

let lastSentAt = 0;

export function sendInput(room: Room, input: InputFrame) {
  const now = performance.now();
  if (now - lastSentAt < INPUT_INTERVAL_MS) return;
  lastSentAt = now;
  room.send('player:input', input);
}

export function resetNetThrottle() {
  lastSentAt = 0;
}
