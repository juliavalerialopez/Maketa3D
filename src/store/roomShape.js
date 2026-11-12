// Geometry of a room made of corners (Part J, J.2). Plain JS, no React and no
// three.js, so stores and tests can use it.
//
// A room is a closed list of corners [{ x, z }, ...] seen from above, in
// order around the room (either direction), in meters, in world space (the
// front wall is at +z). Each wall runs from one corner to the next, the last
// one back to the first. In Part J every wall runs along x or along z.

// The shortest wall allowed, in meters.
export const MIN_WALL = 0.5

// Below this, two numbers count as the same (floating point noise).
const EPSILON = 1e-6

// A width x depth rectangle centred on (centerX, centerZ), the origin if not
// given.
export function rectangleCorners(width, depth, centerX = 0, centerZ = 0) {
  const x = width / 2
  const z = depth / 2
  return [
    { x: centerX - x, z: centerZ - z },
    { x: centerX + x, z: centerZ - z },
    { x: centerX + x, z: centerZ + z },
    { x: centerX - x, z: centerZ + z },
  ]
}

// The smallest box around the corners.
export function boundingBox(corners) {
  const xs = corners.map((corner) => corner.x)
  const zs = corners.map((corner) => corner.z)
  const [minX, maxX, minZ, maxZ] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  }
}

// Positions shown to the user (J.3) are measured from the origin: the front
// left corner of the room's bounding box seen from above (front at the
// bottom). Shown X grows to the right, shown Z toward the back, so every
// position inside the room is 0 or more. Stored positions stay in world
// space (front wall at +z) and do not change when walls move.

// A world position (x, z) as the shown [X, Z].
export function toShownPosition(corners, x, z) {
  const { minX, maxZ } = boundingBox(corners)
  // "+ 0" turns -0 into 0.
  return [x - minX + 0, maxZ - z + 0]
}

// A shown [X, Z] as the world position [x, z].
export function fromShownPosition(corners, shownX, shownZ) {
  const { minX, maxZ } = boundingBox(corners)
  return [shownX + minX + 0, maxZ - shownZ + 0]
}

// Twice the signed floor area: positive or negative depending on the order
// of the corners.
function doubleArea(corners) {
  return corners.reduce((sum, corner, index) => {
    const next = corners[(index + 1) % corners.length]
    return sum + corner.x * next.z - next.x * corner.z
  }, 0)
}

// The walls, one per pair of corners: { start, end, length, normal,
// startConvex, endConvex }. `normal` is the [x, z] unit vector pointing out
// of the room. A corner is convex when the room turns around it the usual
// way (all four of a rectangle); the inner corner of an L is not, and
// neither is a corner in the middle of a straight wall (as a cut makes).
// Only convex corners need a corner piece when walls are drawn.
export function roomWalls(corners) {
  const count = corners.length
  const sign = doubleArea(corners) > 0 ? 1 : -1
  const edge = (index) => {
    const start = corners[(index + count) % count]
    const end = corners[(index + count + 1) % count]
    return { start, end, dx: end.x - start.x, dz: end.z - start.z }
  }
  // The turn at the corner between two walls, as seen from above.
  const isConvex = (before, after) => (before.dx * after.dz - before.dz * after.dx) * sign > 0

  return corners.map((_, index) => {
    const { start, end, dx, dz } = edge(index)
    const length = Math.hypot(dx, dz)
    // "+ 0" turns -0 into 0.
    const normal = [(sign * dz) / length + 0, (-sign * dx) / length + 0]
    return {
      start,
      end,
      length,
      normal,
      startConvex: isConvex(edge(index - 1), edge(index)),
      endConvex: isConvex(edge(index), edge(index + 1)),
    }
  })
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

// True when the corners make a room: at least four corners, every wall
// along x or along z and at least MIN_WALL long, a floor with an area, and
// no wall crossing or touching another one (except its two neighbours).
export function isValidRoomCorners(corners) {
  if (!Array.isArray(corners) || corners.length < 4) return false
  if (!corners.every((corner) => corner && isFiniteNumber(corner.x) && isFiniteNumber(corner.z))) return false

  const count = corners.length
  const segments = corners.map((start, index) => {
    const end = corners[(index + 1) % count]
    return {
      minX: Math.min(start.x, end.x),
      maxX: Math.max(start.x, end.x),
      minZ: Math.min(start.z, end.z),
      maxZ: Math.max(start.z, end.z),
      alongX: Math.abs(end.z - start.z) < EPSILON,
      alongZ: Math.abs(end.x - start.x) < EPSILON,
      length: Math.hypot(end.x - start.x, end.z - start.z),
    }
  })
  if (!segments.every((segment) => segment.alongX !== segment.alongZ && segment.length >= MIN_WALL - EPSILON)) {
    return false
  }
  if (Math.abs(doubleArea(corners)) < EPSILON) return false

  // Walls along an axis are their own boxes: two meet exactly when the boxes
  // overlap.
  const meet = (a, b) =>
    Math.max(a.minX, b.minX) <= Math.min(a.maxX, b.maxX) + EPSILON &&
    Math.max(a.minZ, b.minZ) <= Math.min(a.maxZ, b.maxZ) + EPSILON
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      // The first and the last wall are neighbours.
      if (i === 0 && j === count - 1) continue
      if (meet(segments[i], segments[j])) return false
    }
  }
  return true
}

// True when the point (x, z) is inside the room. A point exactly on a wall
// may count either way, so use it only for points clearly inside or outside.
export function containsPoint(corners, x, z) {
  let inside = false
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const a = corners[i]
    const b = corners[j]
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside
  }
  return inside
}

// Where the centre of a box extentX x extentZ (half sizes, along the room
// axes) can go so the whole box is inside the room: a list of rectangles
// { minX, maxX, minZ, maxZ }, which together are the allowed area. Empty when
// the box fits nowhere. The room is cut into a grid at its corners' x and z
// values; every block of grid cells that is all inside the room gives one
// rectangle, shrunk by the box's half sizes.
export function fitRegions(corners, extentX, extentZ) {
  const xs = [...new Set(corners.map((corner) => corner.x))].sort((a, b) => a - b)
  const zs = [...new Set(corners.map((corner) => corner.z))].sort((a, b) => a - b)
  const columns = xs.length - 1
  const rows = zs.length - 1

  // Inside cells, counted from the first cell: sums[i][k] is the number of
  // inside cells with column < i and row < k.
  const sums = Array.from({ length: columns + 1 }, () => Array.from({ length: rows + 1 }, () => 0))
  for (let i = 0; i < columns; i++) {
    for (let k = 0; k < rows; k++) {
      const inside = containsPoint(corners, (xs[i] + xs[i + 1]) / 2, (zs[k] + zs[k + 1]) / 2) ? 1 : 0
      sums[i + 1][k + 1] = inside + sums[i][k + 1] + sums[i + 1][k] - sums[i][k]
    }
  }
  const insideCount = (i1, i2, k1, k2) => sums[i2][k2] - sums[i1][k2] - sums[i2][k1] + sums[i1][k1]

  const regions = []
  for (let i1 = 0; i1 < columns; i1++) {
    for (let i2 = i1 + 1; i2 <= columns; i2++) {
      const minX = xs[i1] + extentX
      const maxX = xs[i2] - extentX
      if (minX > maxX + EPSILON) continue
      for (let k1 = 0; k1 < rows; k1++) {
        for (let k2 = k1 + 1; k2 <= rows; k2++) {
          if (insideCount(i1, i2, k1, k2) !== (i2 - i1) * (k2 - k1)) break
          const minZ = zs[k1] + extentZ
          const maxZ = zs[k2] - extentZ
          if (minZ > maxZ + EPSILON) continue
          regions.push({ minX, maxX: Math.max(minX, maxX), minZ, maxZ: Math.max(minZ, maxZ) })
        }
      }
    }
  }
  return regions
}

// The point of `regions` (from fitRegions) nearest to (x, z), as [x, z], or
// null when there are none. A point already inside stays where it is, and a
// point outside slides along the edge, like an object pushed into a wall.
export function nearestInRegions(regions, x, z) {
  let best = null
  let bestDistance = Infinity
  for (const region of regions) {
    const nearX = Math.min(region.maxX, Math.max(region.minX, x))
    const nearZ = Math.min(region.maxZ, Math.max(region.minZ, z))
    const distance = (nearX - x) ** 2 + (nearZ - z) ** 2
    if (distance < bestDistance) {
      best = [nearX, nearZ]
      bestDistance = distance
    }
  }
  return best
}

// From (x, z) inside the room, the distance straight along one axis to the
// first wall: `direction` is [1, 0] (toward +x), [-1, 0], [0, 1] or [0, -1].
// Null when no wall is in that direction.
export function distanceToWall(corners, x, z, direction) {
  const [stepX, stepZ] = direction
  let nearest = null
  corners.forEach((start, index) => {
    const end = corners[(index + 1) % corners.length]
    // Moving along x meets walls that run along z, and the other way round.
    const crossing = stepX !== 0 ? Math.abs(end.x - start.x) < EPSILON : Math.abs(end.z - start.z) < EPSILON
    if (!crossing) return
    const [along, wallAt, low, high] =
      stepX !== 0
        ? [x, start.x, Math.min(start.z, end.z), Math.max(start.z, end.z)]
        : [z, start.z, Math.min(start.x, end.x), Math.max(start.x, end.x)]
    const across = stepX !== 0 ? z : x
    if (across < low - EPSILON || across > high + EPSILON) return
    const distance = (wallAt - along) * (stepX || stepZ)
    if (distance >= -EPSILON && (nearest === null || distance < nearest)) nearest = Math.max(0, distance)
  })
  return nearest
}
