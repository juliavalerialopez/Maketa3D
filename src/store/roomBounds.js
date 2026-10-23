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

// How far an object's centre may move from the room centre along x and z so
// its rotated footprint stays inside the walls.
export function positionLimits(object, room) {
  const cos = Math.abs(Math.cos(object.rotation[1]))
  const sin = Math.abs(Math.sin(object.rotation[1]))
  const halfX = (cos * object.size.width + sin * object.size.depth) / 2
  const halfZ = (sin * object.size.width + cos * object.size.depth) / 2
  return {
    x: Math.max(0, room.width / 2 - halfX),
    z: Math.max(0, room.depth / 2 - halfZ),
  }
}
