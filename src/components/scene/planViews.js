// The views of Plan's scene (J.1): 2D (from above), 3D (the orbit camera) and
// Walk. Plain JS, no React and no three.js, so tests can use it.

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

// The 2D view that shows the whole room, centered, in a view `width` x
// `height` pixels: { center: [x, z], zoom } (zoom in pixels per meter).
// Uses width and depth of a room centered on the origin; J.2.2 moves it to
// the corners' bounding box.
export function fitTopView(room, width, height) {
  const zoom = width > 0 && height > 0 ? Math.min((width * TOP_FILL) / room.width, (height * TOP_FILL) / room.depth) : 50
  return { center: [0, 0], zoom: Math.min(TOP_MAX_ZOOM, Math.max(TOP_MIN_ZOOM, zoom)) }
}
