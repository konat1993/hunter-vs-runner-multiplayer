import * as THREE from 'three';

/** Vertical FOV (Three.js default). */
export const CAMERA_FOV = 55;

/** Initial Canvas props; `applyArenaFraming` overrides on first layout. */
export const CAMERA_POSITION: [number, number, number] = [0, 22, 8];

/** Same viewing axis as legacy [0, 22, 8] — isometric-style tilt toward the arena. */
const CAMERA_DIRECTION = new THREE.Vector3(0, 22, 8).normalize();

const NDCEPS = 0.003;

function cornersProjectInsideFrustum(
  camera: THREE.PerspectiveCamera,
  corners: THREE.Vector3[],
): boolean {
  for (const c of corners) {
    const p = c.clone().project(camera);
    if (
      p.x < -1 + NDCEPS ||
      p.x > 1 - NDCEPS ||
      p.y < -1 + NDCEPS ||
      p.y > 1 - NDCEPS
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Places the camera along {@link CAMERA_DIRECTION} so the square arena on y=0
 * (half-extent arenaHalf * margin) fits in the perspective frustum, then moves
 * along the same ray by `zoom` (>1 = farther = wider field of view on the ground).
 */
export function applyArenaFraming(
  camera: THREE.PerspectiveCamera,
  options: {
    arenaHalf: number;
    aspect: number;
    margin?: number;
    zoom?: number;
  },
): void {
  const margin = options.margin ?? 1.08;
  const zoom = options.zoom ?? 1;
  const R = options.arenaHalf * margin;

  const corners = [
    new THREE.Vector3(R, 0, R),
    new THREE.Vector3(R, 0, -R),
    new THREE.Vector3(-R, 0, R),
    new THREE.Vector3(-R, 0, -R),
  ];

  camera.fov = CAMERA_FOV;
  camera.aspect = options.aspect;
  camera.near = 0.1;
  camera.far = 600;

  let hi = 80;
  for (let expand = 0; expand < 30; expand++) {
    camera.position.copy(CAMERA_DIRECTION).multiplyScalar(hi);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (cornersProjectInsideFrustum(camera, corners)) break;
    hi *= 1.35;
  }

  let lo = 6;
  if (lo >= hi) lo = hi * 0.25;

  for (let i = 0; i < 52; i++) {
    const mid = (lo + hi) / 2;
    camera.position.copy(CAMERA_DIRECTION).multiplyScalar(mid);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (cornersProjectInsideFrustum(camera, corners)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const baseDist = hi;
  const finalDist = baseDist * zoom;
  camera.position.copy(CAMERA_DIRECTION).multiplyScalar(finalDist);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

export const CAMERA_ZOOM_MIN = 0.75;
export const CAMERA_ZOOM_MAX = 1.4;
export const CAMERA_ZOOM_STEP = 0.08;

export function clampCameraZoom(value: number): number {
  return Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, value));
}
