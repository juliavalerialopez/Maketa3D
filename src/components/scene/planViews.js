// The views of Plan's scene (J.1): 2D (from above), 3D (the orbit camera) and
// Walk. Plain JS, no React and no three.js, so tests can use it.

import { boundingBox, fitRegions, nearestInRegions } from '../../store/roomShape.js'

// The 3D camera's vertical field of view, in degrees.
export const PLAN_FOV = 50

// 2D: how high above the floor the camera sits, in meters (above any wall or
// object, so nothing is cut off).
export const TOP_CAMERA_HEIGHT = 50

// 2D zoom limits, in pixels per meter.
export const TOP_MIN_ZOOM = 5
export const TOP_MAX_ZOOM = 1000

// 2D: the room fills this share of the view at most, so the walls are not at
// the very edge.
const TOP_FILL = 0.8

// 2D: what the arrow keys use as "straight ahead" (nudgeOffset in
// roomBounds.js). Up on screen is the back of the room (-z).
export const TOP_NUDGE_VIEW = { position: [0, 0, 0], target: [0, 0, -1] }

// The 2D view that shows the whole room (its corners' bounding box),
// centered, in a view `width` x `height` pixels: { center: [x, z], zoom }
// (zoom in pixels per meter).
export function fitTopView(room, width, height) {
  const box = boundingBox(room.corners)
  const zoom = width > 0 && height > 0 ? Math.min((width * TOP_FILL) / box.width, (height * TOP_FILL) / box.depth) : 50
  return { center: [box.centerX, box.centerZ], zoom: Math.min(TOP_MAX_ZOOM, Math.max(TOP_MIN_ZOOM, zoom)) }
}

// Walk (J.1.2): eye height and the field of view, wider than 3D's so the
// room does not feel zoomed in from inside.
export const EYE_HEIGHT = 1.6
export const WALK_FOV = 70
// Walking speed in meters per second; Shift doubles it.
export const WALK_SPEED = 1.4
export const WALK_RUN = 2
// How close to a wall the eyes can get, in meters.
const WALL_GAP = 0.25

// Keys that walk, by physical key (so W A S D sit in the same place on any
// keyboard layout): [forward, right].
export const WALK_KEYS = {
  KeyW: [1, 0],
  ArrowUp: [1, 0],
  KeyS: [-1, 0],
  ArrowDown: [-1, 0],
  KeyD: [0, 1],
  ArrowRight: [0, 1],
  KeyA: [0, -1],
  ArrowLeft: [0, -1],
}

// (x, z) kept WALL_GAP inside the walls (J.2: any room of corners, so an L's
// inner walls stop the walk too). A point inside stays, one outside goes to
// the nearest point inside, so walking into a wall slides along it.
export function clampInRoom(room, x, z) {
  const nearest = nearestInRegions(fitRegions(room.corners, WALL_GAP, WALL_GAP), x, z)
  if (nearest) return nearest
  // A room too small to keep the gap: its middle.
  const box = boundingBox(room.corners)
  return [box.centerX, box.centerZ]
}

// Where Walk starts: at the 3D camera (`planView`, { position, target }),
// moved inside the walls, looking the same way but level. { position: [x, z],
// direction: [x, y, z] }.
export function walkStart(room, planView) {
  const [x, , z] = planView.position
  const dx = planView.target[0] - x
  const dz = planView.target[2] - z
  const length = Math.hypot(dx, dz)
  // Straight down or no target: look toward the back.
  const direction = length > 1e-6 ? [dx / length, 0, dz / length] : [0, 0, -1]
  return { position: clampInRoom(room, x, z), direction }
}

// The held walk keys as [forward, right], each -1, 0 or 1.
export function walkInput(keys) {
  let forward = 0
  let right = 0
  for (const code of keys) {
    const step = WALK_KEYS[code]
    if (!step) continue
    forward += step[0]
    right += step[1]
  }
  return [Math.sign(forward), Math.sign(right)]
}

// One step of `distance` meters from `position` ([x, z]) for `input`
// ([forward, right], walkInput) while looking along `look` (any [x, z],
// e.g. the camera's direction seen from above). Level, the same speed on a
// diagonal, and stopped by the walls (sliding along them).
export function walkStep(room, position, look, input, distance) {
  const [forward, right] = input
  const lookLength = Math.hypot(look[0], look[1])
  if ((!forward && !right) || lookLength < 1e-6) return clampInRoom(room, position[0], position[1])
  const fx = look[0] / lookLength
  const fz = look[1] / lookLength
  // To the right of the look direction, seen from above with y up.
  const mx = forward * fx - right * fz
  const mz = forward * fz + right * fx
  const length = Math.hypot(mx, mz)
  return clampInRoom(room, position[0] + (mx / length) * distance, position[1] + (mz / length) * distance)
}

// How far the head tilts up or down at most, in radians (85°).
const MAX_PITCH = (85 * Math.PI) / 180
const clampPitch = (pitch) => Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch))

// Looking around in Walk by dragging the view (J.1.2): the room follows the
// pointer, so a drag across the whole view height turns the head by the field
// of view. `start` is [yaw, pitch] in radians when the drag began (yaw turns
// left, pitch looks up), dx and dy the drag so far in pixels (right, down),
// `viewHeight` the view's height in pixels. Returns the new [yaw, pitch].
export function lookAfterDrag(start, dx, dy, viewHeight) {
  const perPixel = viewHeight > 0 ? (WALK_FOV * Math.PI) / 180 / viewHeight : 0
  return [start[0] + dx * perPixel, clampPitch(start[1] + dy * perPixel)]
}
