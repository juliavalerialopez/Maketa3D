import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  boundingBox,
  containsPoint,
  distanceToWall,
  fitRegions,
  fromShownPosition,
  isValidRoomCorners,
  moveWall,
  nearestInRegions,
  rectangleCorners,
  roomWalls,
  setWallLength,
  toShownPosition,
} from '../src/store/roomShape.js'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

// A 6 x 5 rectangle, and a 4 x 4 L: the front right quarter is cut away
// (the front is +z, the right +x).
const rectangle = rectangleCorners(6, 5)
const lShape = [
  { x: -2, z: -2 },
  { x: 2, z: -2 },
  { x: 2, z: 0 },
  { x: 0, z: 0 },
  { x: 0, z: 2 },
  { x: -2, z: 2 },
]

test('a rectangle is centred on the origin, and its box is its size', () => {
  assert.deepEqual(rectangle[0], { x: -3, z: -2.5 })
  assert.deepEqual(boundingBox(rectangle), {
    minX: -3,
    maxX: 3,
    minZ: -2.5,
    maxZ: 2.5,
    width: 6,
    depth: 5,
    centerX: 0,
    centerZ: 0,
  })
  assert.deepEqual(boundingBox(lShape), {
    minX: -2,
    maxX: 2,
    minZ: -2,
    maxZ: 2,
    width: 4,
    depth: 4,
    centerX: 0,
    centerZ: 0,
  })
  // Around another middle.
  assert.deepEqual(rectangleCorners(2, 4, 1, -1)[0], { x: 0, z: -3 })
})

test('every wall knows its length and which way is out of the room', () => {
  const walls = roomWalls(rectangle)
  assert.deepEqual(walls.map((wall) => wall.length), [6, 5, 6, 5])
  assert.deepEqual(walls.map((wall) => wall.normal), [[0, -1], [1, 0], [0, 1], [-1, 0]])
  // The same room with its corners the other way round: front, right, back, left.
  const reversed = roomWalls([...rectangle].reverse())
  assert.deepEqual(reversed.map((wall) => wall.normal), [[0, 1], [1, 0], [0, -1], [-1, 0]])
})

test('the inner corner of an L is not convex, the others are', () => {
  const walls = roomWalls(lShape)
  // Wall 2 runs from (2, 0) to the inner corner (0, 0).
  assert.equal(walls[2].endConvex, false)
  assert.equal(walls[3].startConvex, false)
  assert.equal(walls[0].startConvex, true)
  assert.equal(walls[5].endConvex, true)
  assert.deepEqual(walls[2].normal, [0, 1])
  assert.deepEqual(walls[3].normal, [1, 0])
})

test('rectangles and L shapes are valid rooms', () => {
  assert.equal(isValidRoomCorners(rectangle), true)
  assert.equal(isValidRoomCorners(lShape), true)
  assert.equal(isValidRoomCorners([...lShape].reverse()), true)
})

test('broken rooms are not valid', () => {
  assert.equal(isValidRoomCorners(null), false)
  assert.equal(isValidRoomCorners(rectangle.slice(0, 3)), false)
  assert.equal(isValidRoomCorners([...rectangle.slice(0, 3), { x: -3, z: NaN }]), false)
  // A slanted wall.
  assert.equal(isValidRoomCorners([{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }, { x: 1, z: 4 }, { x: 0, z: 4 }]), false)
  // A wall shorter than 0.5 m.
  assert.equal(isValidRoomCorners(rectangleCorners(6, 0.4)), false)
  // Walls that cross: a figure eight made of two squares.
  const crossing = [
    { x: 0, z: 0 },
    { x: 2, z: 0 },
    { x: 2, z: 2 },
    { x: 4, z: 2 },
    { x: 4, z: 4 },
    { x: 1, z: 4 },
    { x: 1, z: -1 },
    { x: 0, z: -1 },
  ]
  assert.equal(isValidRoomCorners(crossing), false)
})

test('a point in the cut away corner of an L is outside the room', () => {
  assert.equal(containsPoint(lShape, -1, 1), true)
  assert.equal(containsPoint(lShape, 1, -1), true)
  assert.equal(containsPoint(lShape, 1, 1), false)
  assert.equal(containsPoint(lShape, 5, 0), false)
})

test('in a rectangle, a footprint fits in one shrunk rectangle', () => {
  const regions = fitRegions(rectangle, 1, 0.45)
  const box = regions.reduce(
    (all, region) => ({
      minX: Math.min(all.minX, region.minX),
      maxX: Math.max(all.maxX, region.maxX),
      minZ: Math.min(all.minZ, region.minZ),
      maxZ: Math.max(all.maxZ, region.maxZ),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  )
  assert.deepEqual(box, { minX: -2, maxX: 2, minZ: -2.05, maxZ: 2.05 })
  assert.deepEqual(nearestInRegions(regions, 10, 0), [2, 0])
  assert.deepEqual(nearestInRegions(regions, 0.5, -1), [0.5, -1])
})

test('in an L, a footprint is kept out of the cut away corner and slides along its walls', () => {
  const regions = fitRegions(lShape, 0.5, 0.5)
  // Pushed into the corner from the back part, it stops at the back part's front edge.
  const [x, z] = nearestInRegions(regions, 1.2, 1)
  close(x, 1.2)
  close(z, -0.5)
  // From the left part, it stops at the wall at x = 0.
  const [x2, z2] = nearestInRegions(regions, 0.3, 1.5)
  close(x2, -0.5)
  close(z2, 1.5)
  // Where it already fits, it stays.
  assert.deepEqual(nearestInRegions(regions, -1, 1), [-1, 1])
})

test('a footprint exactly as wide as the room fits in one line', () => {
  const regions = fitRegions(rectangle, 3, 0.5)
  assert.ok(regions.length > 0)
  assert.deepEqual(nearestInRegions(regions, 2, 0), [0, 0])
})

test('a wall with a corner in its middle (as a cut makes) is valid and joins straight', () => {
  const cut = [{ x: -3, z: -2.5 }, { x: 0, z: -2.5 }, { x: 3, z: -2.5 }, { x: 3, z: 2.5 }, { x: -3, z: 2.5 }]
  assert.equal(isValidRoomCorners(cut), true)
  // A straight join is neither an outer nor an inner corner: no corner piece is needed there.
  const walls = roomWalls(cut)
  assert.equal(walls[0].endConvex, false)
  assert.equal(walls[1].startConvex, false)
})

test('a footprint bigger than the room fits nowhere', () => {
  assert.deepEqual(fitRegions(rectangle, 4, 1), [])
  assert.equal(nearestInRegions([], 0, 0), null)
})

test('the distance to a wall follows the room, also around the corner of an L', () => {
  close(distanceToWall(rectangle, 1, 0, [1, 0]), 2)
  close(distanceToWall(rectangle, 1, 0, [-1, 0]), 4)
  close(distanceToWall(rectangle, 1, 0, [0, 1]), 2.5)
  // From the left part of the L, toward +x, the first wall is the inner one at x = 0.
  close(distanceToWall(lShape, -1, 1, [1, 0]), 1)
  // From the back part, toward the front, the first wall is at z = 0.
  close(distanceToWall(lShape, 1, -1, [0, 1]), 1)
  // From the back part's left side, toward the front, the outer wall at z = 2.
  close(distanceToWall(lShape, -1, -1, [0, 1]), 3)
})

test('a typed wall length moves the end farther from the origin', () => {
  // The back wall (along x, wall 0) grows to the right: the right wall moves.
  assert.deepEqual(boundingBox(setWallLength(rectangle, 0, 7)), {
    ...boundingBox(rectangle),
    maxX: 4,
    width: 7,
    centerX: 0.5,
  })
  // The right wall (along z, wall 1) grows toward the back: the back wall moves.
  const deeper = boundingBox(setWallLength(rectangle, 1, 6))
  assert.deepEqual([deeper.minZ, deeper.maxZ], [-3.5, 2.5])
  // The front wall (wall 2, drawn right to left) also moves its right end.
  assert.equal(boundingBox(setWallLength(rectangle, 2, 5)).maxX, 2)
  // In the L, the left part of the front wall (wall 4, x -2..0) moves the
  // cut away corner's wall at x = 0.
  const wider = setWallLength(lShape, 4, 3)
  assert.ok(isValidRoomCorners(wider))
  assert.ok(wider.some((corner) => corner.x === 1 && corner.z === 2))
  // Too short for the L: the cut away corner's wall would vanish.
  assert.equal(isValidRoomCorners(setWallLength(lShape, 4, 4)), false)
})

test('moving a wall moves its two corners along its outward side', () => {
  // The back wall (wall 0) out by 1 m: toward -z.
  const moved = moveWall(rectangle, 0, 1)
  assert.deepEqual(moved.slice(0, 2), [
    { x: -3, z: -3.5 },
    { x: 3, z: -3.5 },
  ])
  assert.deepEqual(moved.slice(2), rectangle.slice(2))
})

test('shown positions count from the front left corner: X to the right, Z toward the back', () => {
  // The front left corner of a 6 x 5 room is 0, 0, the back right 6, 5.
  assert.deepEqual(toShownPosition(rectangle, -3, 2.5), [0, 0])
  assert.deepEqual(toShownPosition(rectangle, 3, -2.5), [6, 5])
  assert.deepEqual(toShownPosition(rectangle, 0, 0), [3, 2.5])
  // Typed numbers go back to the same place.
  assert.deepEqual(fromShownPosition(rectangle, 3, 2.5), [0, 0])
  assert.deepEqual(fromShownPosition(rectangle, 1, 4), [-2, -1.5])
  // An L counts from the front left corner of its bounding box.
  assert.deepEqual(toShownPosition(lShape, -2, 2), [0, 0])
  assert.deepEqual(toShownPosition(lShape, 1, -1), [3, 3])
})
