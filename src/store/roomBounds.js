import { Euler, Matrix4 } from 'three'
import { boundingBox, distanceToWall, fitRegions, nearestInRegions } from './roomShape.js'

// Rotation order for objects: y turns the object on the floor, x and z tilt it.
export const ROTATION_ORDER = 'YXZ'

// Angles (I.6): the store keeps radians, the panel and the layout file show
// degrees.
const DEGREES_PER_RADIAN = 180 / Math.PI
const FULL_TURN = Math.PI * 2
export const toDegrees = (radians) => radians * DEGREES_PER_RADIAN
export const toRadians = (degrees) => degrees / DEGREES_PER_RADIAN
// The same angle from 0 up to (not including) a full turn: -90° -> 270°, 360° -> 0°.
export const normalizeDegrees = (degrees) => ((degrees % 360) + 360) % 360
export const normalizeRadians = (radians) => ((radians % FULL_TURN) + FULL_TURN) % FULL_TURN

const euler = new Euler()
const matrix = new Matrix4()

// The object's box after rotation: where its centre sits relative to the
// object's origin (the middle of its base), and its half extents along the
// world axes. Both are [x, y, z].
function rotatedBox(object) {
  const [rx, ry, rz] = object.rotation
  matrix.makeRotationFromEuler(euler.set(rx, ry, rz, ROTATION_ORDER))
  const m = matrix.elements // column-major: m[column * 4 + row]
  const half = [object.size.width / 2, object.size.height / 2, object.size.depth / 2]
  const centre = [0, 1, 2].map((row) => m[4 + row] * half[1])
  const extents = [0, 1, 2].map(
    (row) => Math.abs(m[row]) * half[0] + Math.abs(m[4 + row]) * half[1] + Math.abs(m[8 + row]) * half[2],
  )
  return { centre, extents }
}

// How far a tilted object is raised so its lowest point touches the floor.
function floorLift(object) {
  const { centre, extents } = rotatedBox(object)
  return extents[1] - centre[1]
}

// Position and rotation as rendered: stored values plus the floor lift.
export function objectTransform(object) {
  const [x, y, z] = object.position
  return {
    position: [x, y + floorLift(object), z],
    rotation: [...object.rotation, ROTATION_ORDER],
  }
}

// Below this, a position counts as on the edge of where it may go.
const EPSILON = 1e-9

// Allowed range for one axis of the object's position, so its rotated box
// stays between `min` and `max` (the room's bounding box on that axis). A
// tilted box's centre can sit off the origin, so the range is not always
// symmetric. An object wider than the room gets a single centred value.
function axisRange(min, max, centre, extent) {
  const low = min + extent - centre
  const high = max - extent - centre
  if (low <= high) return [low, high]
  const middle = (low + high) / 2
  return [middle, middle]
}

// The limits on both axes from the room's bounding box only: for an object
// that fits nowhere inside the walls (too big for the room).
function boxLimits(box, centre, extents) {
  return {
    x: axisRange(box.minX, box.maxX, centre[0], extents[0]),
    z: axisRange(box.minZ, box.maxZ, centre[2], extents[2]),
  }
}

const inRegion = (region, x, z) =>
  x >= region.minX - EPSILON && x <= region.maxX + EPSILON && z >= region.minZ - EPSILON && z <= region.maxZ + EPSILON

// Allowed [min, max] for the object's x and z (Location in Object details),
// so its rotated (and tilted) box stays inside the walls: how far it can go
// along each axis from where it is now. In an L room that depends on where it
// is: in the narrow leg the range across the leg is smaller.
export function positionLimits(object, room) {
  const { centre, extents } = rotatedBox(object)
  const x = object.position[0] + centre[0]
  const z = object.position[2] + centre[2]
  const holding = fitRegions(room.corners, extents[0], extents[2]).filter((region) => inRegion(region, x, z))
  if (!holding.length) return boxLimits(boundingBox(room.corners), centre, extents)
  return {
    x: [Math.min(...holding.map((region) => region.minX)) - centre[0], Math.max(...holding.map((region) => region.maxX)) - centre[0]],
    z: [Math.min(...holding.map((region) => region.minZ)) - centre[2], Math.max(...holding.map((region) => region.maxZ)) - centre[2]],
  }
}

// How far each side of the object's footprint is from the wall in that
// direction (J0.4): left (-x), right (+x), back (-z) and front (+z). The sides
// are the extremes of its rotated (and tilted) box along the room's axes.
// Each is { distance, from, to }: the distance in meters and the line on the
// floor ([x, z] points) from the middle of that side straight to the wall
// (in an L room, the first wall in that direction).
export function wallDistances(object, room) {
  const { centre, extents } = rotatedBox(object)
  const x = object.position[0] + centre[0]
  const z = object.position[2] + centre[2]
  const side = (from, direction) => {
    const distance = distanceToWall(room.corners, from[0], from[1], direction) ?? 0
    return { distance, from, to: [from[0] + direction[0] * distance, from[1] + direction[1] * distance] }
  }
  return {
    left: side([x - extents[0], z], [-1, 0]),
    right: side([x + extents[0], z], [1, 0]),
    back: side([x, z - extents[2]], [0, -1]),
    front: side([x, z + extents[2]], [0, 1]),
  }
}

// Arrow keys on the selected object (J0.5): the [dx, dz] to move it by `step`
// meters, relative to the screen and snapped to the nearest room axis. Up
// moves away from the camera, Down toward it, Left and Right sideways on
// screen. `view` is the Plan view ({ position, target }); null for other keys.
export function nudgeOffset(view, key, step) {
  const forwardX = view.target[0] - view.position[0]
  const forwardZ = view.target[2] - view.position[2]
  // The room axis closest to straight ahead on screen (seen from above).
  const ahead = Math.abs(forwardX) > Math.abs(forwardZ) ? [Math.sign(forwardX), 0] : [0, Math.sign(forwardZ)]
  // To the right of ahead: looking along -z, the right is +x.
  const right = [-ahead[1], ahead[0]]
  const direction = {
    ArrowUp: ahead,
    ArrowDown: [-ahead[0], -ahead[1]],
    ArrowRight: right,
    ArrowLeft: [-right[0], -right[1]],
  }[key]
  // "+ 0" turns -0 into 0.
  return direction ? [direction[0] * step + 0, direction[1] * step + 0] : null
}

// The object's position (x, z) moved inside the walls (y stays 0): its rotated
// footprint must fit inside the room, also out of an L's cut away corner. A
// position that fits stays exactly as it is; one that does not goes to the
// nearest one that does, so an object pushed into a wall slides along it. An
// object too big for the room is clamped to the room's bounding box (centred
// on an axis it is wider than).
export function clampPosition(object, room, x, z) {
  const { centre, extents } = rotatedBox(object)
  const regions = fitRegions(room.corners, extents[0], extents[2])
  const [cx, cz] = [x + centre[0], z + centre[2]]
  if (regions.some((region) => inRegion(region, cx, cz))) return [x, 0, z]
  const nearest = nearestInRegions(regions, cx, cz)
  // "+ 0" turns -0 into 0.
  if (nearest) return [nearest[0] - centre[0] + 0, 0, nearest[1] - centre[2] + 0]
  const limits = boxLimits(boundingBox(room.corners), centre, extents)
  const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value))
  return [clamp(x, limits.x), 0, clamp(z, limits.z)]
}
