import { create } from 'zustand'
import { normalizeRadians } from './roomBounds.js'

// The placeable camera (I.14): one per project, always present. The Room
// render is taken from it. Shown in Plan as a small camera model and as
// "Camera" at the top of the Objects list; it cannot be deleted.

// The selection id of the camera (objects use their own ids).
export const CAMERA_ID = 'camera'

// Limits for the Camera details fields and the layout file.
export const CAMERA_LIMITS = {
  // X and Z in meters, either side of the room's middle.
  x: [-10, 10],
  z: [-10, 10],
  // Height of the lens above the floor, in meters.
  height: [0.2, 6],
  // Up or down from level, in degrees.
  tilt: [-89, 89],
  // Vertical field of view of the 16:9 lens, in degrees.
  fov: [20, 100],
}

// Where the camera starts (New Project, and files saved before I.14): the
// Plan view's starting place, at (4, 4, 4), looking at the middle of the
// floor. pan turns it around the vertical axis (0 looks along -z), tilt is
// up (+) or down (-); both in radians. fov is in degrees, like the Plan view.
export const DEFAULT_CAMERA = {
  position: [4, 4, 4],
  pan: Math.atan2(4, 4),
  tilt: -Math.atan2(4, Math.hypot(4, 4)),
  fov: 50,
}

const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value))

// A camera position [x, height, z] within CAMERA_LIMITS.
export function clampCameraPosition([x, y, z]) {
  return [clamp(x, CAMERA_LIMITS.x), clamp(y, CAMERA_LIMITS.height), clamp(z, CAMERA_LIMITS.z)]
}

export const useCameraStore = create((set) => ({
  camera: DEFAULT_CAMERA,
  // Changes some of position, pan, tilt and fov. pan is kept within one turn.
  updateCamera: (partial) =>
    set((state) => {
      const camera = { ...state.camera, ...partial }
      if (partial.pan !== undefined) camera.pan = normalizeRadians(partial.pan)
      return { camera }
    }),
  setCamera: (camera) => set({ camera }),
}))
