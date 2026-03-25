export interface InputFrame {
  seq: number;
  dirX: number;
  dirZ: number;
  sprint: boolean;
  dtMs: number;
}

const keys: Record<string, boolean> = {};

function onKeyDown(e: KeyboardEvent) {
  keys[e.code] = true;
}

function onKeyUp(e: KeyboardEvent) {
  keys[e.code] = false;
}

let listening = false;

export function startInputListening() {
  if (listening) return;
  listening = true;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

export function stopInputListening() {
  listening = false;
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  Object.keys(keys).forEach((k) => delete keys[k]);
}

export function buildInputFrame(seq: number, dtMs: number): InputFrame {
  const left = keys['KeyA'] || keys['ArrowLeft'];
  const right = keys['KeyD'] || keys['ArrowRight'];
  const up = keys['KeyW'] || keys['ArrowUp'];
  const down = keys['KeyS'] || keys['ArrowDown'];
  const sprint = keys['ShiftLeft'] || keys['ShiftRight'];

  let dirX = 0;
  let dirZ = 0;

  if (left) dirX -= 1;
  if (right) dirX += 1;
  if (up) dirZ -= 1;
  if (down) dirZ += 1;

  // Normalize diagonal movement
  const mag = Math.sqrt(dirX * dirX + dirZ * dirZ);
  if (mag > 0) {
    dirX /= mag;
    dirZ /= mag;
  }

  return { seq, dirX, dirZ, sprint: !!sprint, dtMs };
}
