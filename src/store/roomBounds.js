import { Euler, Matrix4 } from 'three'

// Rotation order for objects: y turns the object on the floor, x and z tilt it.
export const ROTATION_ORDER = 'YXZ'

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

// Allowed range for one axis of the object's position, so its rotated box
// stays between the walls at -roomSize/2 and +roomSize/2. A tilted box's centre
// can sit off the origin, so the range is not always symmetric. An object
// wider than the room gets a single centred value.
function axisRange(roomSize, centre, extent) {
  const min = -roomSize / 2 + extent - centre
  const max = roomSize / 2 - extent - centre
  if (min <= max) return [min, max]
  const middle = (min + max) / 2
  return [middle, middle]
}

// Allowed [min, max] for the object's x and z, so its rotated (and tilted)
// box stays inside the walls.
export function positionLimits(object, room) {
  const { centre, extents } = rotatedBox(object)
  return {
    x: axisRange(room.width, centre[0], extents[0]),
    z: axisRange(room.depth, centre[2], extents[2]),
  }
}

// The object's position with x and z clamped inside the walls (y stays 0).
// Clamping each axis on its own lets an object slide along a wall.
export function clampPosition(object, room, x, z) {
  const limits = positionLimits(object, room)
  const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value))
  return [clamp(x, limits.x), 0, clamp(z, limits.z)]
}
