// Geometry of a room made of corners (Part J, J.2). Plain JS, no React and no
// three.js, so stores and tests can use it.
//
// A room is a closed list of corners [{ x, z }, ...] seen from above, in
// order around the room (either direction), in meters, in world space (the
// front wall is at +z). Each wall runs from one corner to the next, the last
// one back to the first. In Part J every wall runs along x or along z.

// The shortest wall allowed, in meters.
export const MIN_WALL = 0.5
// The least gap between two walls that do not meet at a corner, in meters
// (J.7.1): as much as the shortest wall.
export const WALL_CLEARANCE = MIN_WALL

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

// Where an L's cut away corner can be, as [x sign, z sign] of that corner of
// the bounding box, in the order the rotate button goes: seen from above with
// the front at the bottom, clockwise from the front right.
export const NOTCH_CORNERS = [
  [1, 1], // front right
  [-1, 1], // front left
  [-1, -1], // back left
  [1, -1], // back right
]

// An L room (J.4): a width x depth rectangle centred on (centerX, centerZ)
// with a notchWidth x notchDepth piece cut away at corner `notch` (an index
// into NOTCH_CORNERS).
export function lCorners(width, depth, notchWidth, notchDepth, notch = 0, centerX = 0, centerZ = 0) {
  const [sx, sz] = NOTCH_CORNERS[notch]
  const [x, z] = [width / 2, depth / 2]
  // Drawn for the front right corner, then mirrored to the chosen one.
  const local = [
    [-x, -z],
    [x, -z],
    [x, z - notchDepth],
    [x - notchWidth, z - notchDepth],
    [x - notchWidth, z],
    [-x, z],
  ]
  // "+ 0" turns -0 into 0.
  return local.map(([px, pz]) => ({ x: centerX + px * sx + 0, z: centerZ + pz * sz + 0 }))
}

// What kind of room the corners make: { shape: 'rectangle', width, depth },
// { shape: 'l', width, depth, notchWidth, notchDepth, notch } or
// { shape: 'custom', width, depth } (anything else, e.g. cut in Plan).
// Width and depth are always the bounding box's.
export function describeRoom(corners) {
  const box = boundingBox(corners)
  const size = { width: box.width, depth: box.depth }
  const near = (a, b) => Math.abs(a - b) < EPSILON
  const onBox = (corner, [sx, sz]) => near(corner.x, sx > 0 ? box.maxX : box.minX) && near(corner.z, sz > 0 ? box.maxZ : box.minZ)
  if (corners.length === 4 && isValidRoomCorners(corners)) {
    if (NOTCH_CORNERS.every((signs) => corners.some((corner) => onBox(corner, signs)))) return { shape: 'rectangle', ...size }
  }
  if (corners.length === 6 && isValidRoomCorners(corners)) {
    const notch = NOTCH_CORNERS.findIndex((signs) => !corners.some((corner) => onBox(corner, signs)))
    const inner = corners.find(
      (corner) => corner.x > box.minX + EPSILON && corner.x < box.maxX - EPSILON && corner.z > box.minZ + EPSILON && corner.z < box.maxZ - EPSILON,
    )
    if (notch !== -1 && inner) {
      const [sx, sz] = NOTCH_CORNERS[notch]
      const notchWidth = Math.abs((sx > 0 ? box.maxX : box.minX) - inner.x)
      const notchDepth = Math.abs((sz > 0 ? box.maxZ : box.minZ) - inner.z)
      const expected = lCorners(box.width, box.depth, notchWidth, notchDepth, notch, box.centerX, box.centerZ)
      const same = expected.every((point) => corners.some((corner) => near(corner.x, point.x) && near(corner.z, point.z)))
      if (same) return { shape: 'l', ...size, notchWidth, notchDepth, notch }
    }
  }
  return { shape: 'custom', ...size }
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

// The room's floor area in square meters.
export const roomArea = (corners) => Math.abs(doubleArea(corners)) / 2

// The distinct x values and z values of the corners where a wall turns, each
// sorted: where a chain of dimension lines along the room has its ticks
// (J.5.3). Values that differ by less than a millimeter are one.
export function axisStops(corners) {
  // Only corners where the wall turns: a corner in the middle of a straight
  // wall (where it was cut, J.7.1) is no stop.
  const turns = corners.filter((corner, index) => {
    const before = corners[(index + corners.length - 1) % corners.length]
    const after = corners[(index + 1) % corners.length]
    const cross = (corner.x - before.x) * (after.z - corner.z) - (corner.z - before.z) * (after.x - corner.x)
    return Math.abs(cross) > 1e-9
  })
  const stops = (values) =>
    [...values]
      .sort((a, b) => a - b)
      .filter((value, index, sorted) => index === 0 || value - sorted[index - 1] > 1e-3)
  return { xs: stops(turns.map((corner) => corner.x)), zs: stops(turns.map((corner) => corner.z)) }
}

// Where the room's area is written (J.5.3): the middle of the floor, [x, z].
// For an L whose middle falls in the cut away corner, the middle of the
// bounding box, or failing that the middle of the floor anyway.
export function areaLabelPoint(corners) {
  const twice = doubleArea(corners)
  let cx = 0
  let cz = 0
  corners.forEach((corner, index) => {
    const next = corners[(index + 1) % corners.length]
    const cross = corner.x * next.z - next.x * corner.z
    cx += (corner.x + next.x) * cross
    cz += (corner.z + next.z) * cross
  })
  const centroid = [cx / (3 * twice), cz / (3 * twice)]
  if (containsPoint(corners, ...centroid)) return centroid
  const box = boundingBox(corners)
  return containsPoint(corners, box.centerX, box.centerZ) ? [box.centerX, box.centerZ] : centroid
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

// The corners with wall `index` moved sideways by `offset` meters along its
// outward side (negative: into the room). Its two corners move with it, so
// the walls next to it stretch or shrink. The result may not be a valid room
// (check with isValidRoomCorners).
export function moveWall(corners, index, offset) {
  const count = corners.length
  const [nx, nz] = roomWalls(corners)[index].normal
  const ends = [index, (index + 1) % count]
  return corners.map((corner, cornerIndex) =>
    ends.includes(cornerIndex) ? { x: corner.x + nx * offset + 0, z: corner.z + nz * offset + 0 } : corner,
  )
}

// True when the walls before and after corner `index` run the same way (the
// corner sits in the middle of a straight wall, as a cut makes).
function isStraightCorner(corners, index) {
  const count = corners.length
  const before = corners[(index - 1 + count) % count]
  const corner = corners[index]
  const after = corners[(index + 1) % count]
  const alongX = (a, b) => Math.abs(a.z - b.z) < EPSILON
  const alongZ = (a, b) => Math.abs(a.x - b.x) < EPSILON
  return (alongX(before, corner) && alongX(corner, after)) || (alongZ(before, corner) && alongZ(corner, after))
}

// Getting wall `index` ready to be dragged sideways (J.6, J.7). A wall whose
// neighbour runs straight on from it (a piece cut out of a longer wall) gets
// a new corner at that end, so a side wall can grow there as it moves.
// Returns { corners, index } (the wall's index in the new corners).
export function prepareWallDrag(corners, index) {
  const endIndex = (index + 1) % corners.length
  const atStart = isStraightCorner(corners, index)
  const atEnd = isStraightCorner(corners, endIndex)
  const next = []
  let wallIndex = index
  corners.forEach((corner, cornerIndex) => {
    // The wall's end gets a copy just before it: the wall ends there.
    if (cornerIndex === endIndex && atEnd) next.push({ ...corner })
    next.push(corner)
    if (cornerIndex === index) {
      // The wall's start gets a copy just after it: the wall starts there.
      if (atStart) next.push({ ...corner })
      wallIndex = next.length - 1
    }
  })
  return { corners: next, index: wallIndex }
}

// The corners tidied after a wall moved (J.7): corners on top of each other
// become one (a side wall that shrank to nothing), and a corner at one of
// `points` ([x, z], the moved wall's ends) that sits in the middle of a
// straight wall is removed, so a piece back in line with its neighbours is
// one wall again. Other straight corners (a cut not moved yet) stay.
export function tidyCorners(corners, points) {
  const same = (a, b) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.z - b.z) < EPSILON
  let result = corners.filter((corner, index) => !same(corner, corners[(index + 1) % corners.length]))
  for (;;) {
    const index = result.findIndex(
      (corner, cornerIndex) => points.some(([x, z]) => same(corner, { x, z })) && isStraightCorner(result, cornerIndex),
    )
    if (index === -1 || result.length <= 4) return result
    result = result.filter((_, cornerIndex) => cornerIndex !== index)
  }
}

// The shortest wall that can be cut, in meters: both pieces are at least
// MIN_WALL (J.7.1).
export const MIN_CUT_WALL = 2 * MIN_WALL

// A cut point moves along its wall in 5 cm steps, counted from the wall's
// start.
const CUT_STEPS_PER_METER = 20

// Where a cut of wall `index` goes for the pointer `along` meters from the
// wall's start (J.7.1): in 5 cm steps, at least MIN_WALL from both ends.
// Meters from the start, or null when the wall is too short to cut.
export function cutPoint(corners, index, along) {
  const { length } = roomWalls(corners)[index]
  if (length < MIN_CUT_WALL - EPSILON) return null
  const snapped = Math.round(along * CUT_STEPS_PER_METER) / CUT_STEPS_PER_METER
  return Math.min(length - MIN_WALL, Math.max(MIN_WALL, snapped))
}

// The corners with wall `index` split in two at `cutPoint(corners, index,
// along)`: a new corner on the wall, so each piece is a wall of its own that
// can be dragged (J.7.1). Null when the wall is too short to cut.
export function splitWall(corners, index, along) {
  const at = cutPoint(corners, index, along)
  if (at === null) return null
  const { start, end, length } = roomWalls(corners)[index]
  const [dx, dz] = [(end.x - start.x) / length, (end.z - start.z) / length]
  const point = { x: start.x + dx * at + 0, z: start.z + dz * at + 0 }
  return [...corners.slice(0, index + 1), point, ...corners.slice(index + 1)]
}

// The index of the wall running from `a` to `b` ({ x, z }, either way round),
// or -1. The selected wall is kept this way, so it survives renumbering.
export function findWall(corners, a, b) {
  const same = (p, q) => Math.abs(p.x - q.x) < EPSILON && Math.abs(p.z - q.z) < EPSILON
  return corners.findIndex((corner, index) => {
    const next = corners[(index + 1) % corners.length]
    return (same(corner, a) && same(next, b)) || (same(corner, b) && same(next, a))
  })
}

// The corners with wall `index` set to `length` meters (J.5): its end
// farther from the origin moves (the right end of a wall along x, the back end
// of a wall along z), by moving the wall that meets it there, or, where that
// end is a cut point, by sliding the cut point (J.7.1). The result may not be
// a valid room.
export function setWallLength(corners, index, length) {
  const slid = slideCutPoint(corners, index, length)
  if (slid) return slid
  const { wall, offset } = wallLengthMove(corners, index, length)
  return moveWall(corners, wall, offset)
}

// True when wall `index`'s end is its far one from the origin (setWallLength):
// shown X grows to the right (+x), shown Z toward the back (-z).
function endIsFar(walls, index) {
  const { start, end } = walls[index]
  return Math.abs(end.z - start.z) < EPSILON ? end.x > start.x : end.z < start.z
}

// The corners with wall `index` set to `length` meters by sliding its far end
// along the wall, when that end is a cut point (a straight corner, J.7.1):
// the piece on the other side gets shorter or longer. Null when the far end
// is a real corner. The result may not be a valid room.
export function slideCutPoint(corners, index, length) {
  const walls = roomWalls(corners)
  const { start, end, length: current } = walls[index]
  const far = endIsFar(walls, index)
  const cornerIndex = far ? (index + 1) % corners.length : index
  if (!isStraightCorner(corners, cornerIndex)) return null
  // From the near end toward the far one.
  const sign = far ? 1 : -1
  const [dx, dz] = [((end.x - start.x) / current) * sign, ((end.z - start.z) / current) * sign]
  const change = length - current
  return corners.map((corner, cornerAt) =>
    cornerAt === cornerIndex ? { x: corner.x + dx * change + 0, z: corner.z + dz * change + 0 } : corner,
  )
}

// Which wall a typed length of wall `index` moves, and how far
// (setWallLength): { wall, offset } for moveWall.
export function wallLengthMove(corners, index, length) {
  const count = corners.length
  const walls = roomWalls(corners)
  const { start, end, length: current } = walls[index]
  const alongX = Math.abs(end.z - start.z) < EPSILON
  const neighbour = endIsFar(walls, index) ? (index + 1) % count : (index - 1 + count) % count
  const [nx, nz] = walls[neighbour].normal
  const away = alongX ? nx : -nz
  return { wall: neighbour, offset: (length - current) * away }
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

// True when the corners make a room: at least four corners, every wall
// along x or along z and at least MIN_WALL long, a floor with an area, no
// wall folding back over its neighbour, and every wall at least
// WALL_CLEARANCE from the others (except its two neighbours).
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

  // Two walls in line at a corner (a cut) run on the same way, never back
  // over each other.
  const foldsBack = corners.some((corner, index) => {
    const before = corners[(index - 1 + count) % count]
    const after = corners[(index + 1) % count]
    return (before.x - corner.x) * (after.x - corner.x) + (before.z - corner.z) * (after.z - corner.z) > EPSILON
  })
  if (foldsBack) return false

  // Walls along an axis are their own boxes. Two walls that are not
  // neighbours stay at least WALL_CLEARANCE apart, so their drawn thickness
  // never overlaps and a dragged wall stops before another one (J.7.1).
  const tooClose = (a, b) =>
    Math.max(a.minX, b.minX) < Math.min(a.maxX, b.maxX) + WALL_CLEARANCE - EPSILON &&
    Math.max(a.minZ, b.minZ) < Math.min(a.maxZ, b.maxZ) + WALL_CLEARANCE - EPSILON
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      // The first and the last wall are neighbours.
      if (i === 0 && j === count - 1) continue
      if (tooClose(segments[i], segments[j])) return false
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
