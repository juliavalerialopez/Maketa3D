import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_ROOM,
  draggedCorners,
  reachableStep,
  roomParams,
  roomSize,
  shapeFor,
  startWallDrag,
  useRoomStore,
  wallsChangedBy,
} from '../src/store/roomStore.js'
import {
  boundingBox,
  cutPoint,
  describeRoom,
  isValidRoomCorners,
  lCorners,
  rectangleCorners,
  roomWalls,
  splitWall,
  tidyCorners,
} from '../src/store/roomShape.js'
import { newLayout } from '../src/store/layoutFile.js'
import { useObjectsStore } from '../src/store/objectsStore.js'
import { beginGesture, endGesture, useHistoryStore } from '../src/store/historyStore.js'

const room = () => useRoomStore.getState().room
const params = () => roomParams(room())
// A room with these corners, 2.6 m high, without doors or windows.
const roomOf = (corners) => ({ shape: 'custom', height: 2.6, corners, openings: [] })
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

beforeEach(() => newLayout())

test('a new project starts as a 5 m square, 2.6 m high', () => {
  assert.deepEqual(room(), DEFAULT_ROOM)
  assert.equal(params().shape, 'square')
  assert.deepEqual(roomSize(room()), { width: 5, depth: 5 })
  assert.equal(room().height, 2.6)
})

test('a square keeps its sides equal; a rectangle has its own width and depth', () => {
  const { setRoomSize, setShape } = useRoomStore.getState()
  setRoomSize({ width: 4 })
  assert.deepEqual(roomSize(room()), { width: 4, depth: 4 })
  // From a square, a Rectangle keeps the width and is 3/4 as deep (J.4.1).
  setShape('rectangle')
  assert.deepEqual(roomSize(room()), { width: 4, depth: 3 })
  setRoomSize({ depth: 3.5 })
  assert.deepEqual(roomSize(room()), { width: 4, depth: 3.5 })
  // Back to a square: the width is the side.
  setShape('square')
  assert.deepEqual(roomSize(room()), { width: 4, depth: 4 })
})

test('a new L keeps the size and cuts half of each side away at the front right', () => {
  const { setShape } = useRoomStore.getState()
  setShape('rectangle')
  useRoomStore.getState().setRoomSize({ width: 6, depth: 4 })
  setShape('l')
  assert.deepEqual(room().corners, lCorners(6, 4, 3, 2, 0))
  assert.deepEqual(roomSize(room()), { width: 6, depth: 4 })
  const { notchWidth, notchDepth, notch } = params()
  assert.deepEqual([notchWidth, notchDepth, notch], [3, 2, 0])
  // Back to a rectangle: the same bounding box.
  setShape('rectangle')
  assert.deepEqual(room().corners, rectangleCorners(6, 4))
})

test('the rotate button moves the cut away corner clockwise around the room', () => {
  const { setShape, rotateNotch } = useRoomStore.getState()
  setShape('l')
  const notches = []
  for (let i = 0; i < 4; i++) {
    rotateNotch()
    notches.push(params().notch)
  }
  // Front right, then front left, back left, back right and front right again.
  assert.deepEqual(notches, [1, 2, 3, 0])
})

test('each leg of the L stays at least 0.5 m', () => {
  const { setShape, setRoomSize } = useRoomStore.getState()
  setShape('l')
  setRoomSize({ notchWidth: 10, notchDepth: 0.1 })
  assert.equal(params().notchWidth, 4.5)
  assert.equal(params().notchDepth, 0.5)
  // A narrower room makes the notch smaller with it.
  setRoomSize({ width: 3 })
  assert.equal(params().notchWidth, 2.5)
})

test('an opened file gets its shape from the corners', () => {
  assert.equal(shapeFor(rectangleCorners(5, 5)), 'square')
  assert.equal(shapeFor(rectangleCorners(5, 5), 'rectangle'), 'rectangle')
  assert.equal(shapeFor(rectangleCorners(6, 5)), 'rectangle')
  assert.equal(shapeFor(lCorners(6, 5, 2, 1.5, 3, 1, -1)), 'l')
  // A notch that is not at a corner (as Build can make) is custom.
  const tShape = [
    { x: -3, z: -2 },
    { x: 3, z: -2 },
    { x: 3, z: 0 },
    { x: 1, z: 0 },
    { x: 1, z: 2 },
    { x: -1, z: 2 },
    { x: -1, z: 0 },
    { x: -3, z: 0 },
  ]
  assert.equal(shapeFor(tShape), 'custom')
  assert.deepEqual(describeRoom(lCorners(6, 5, 2, 1.5, 3, 1, -1)), {
    shape: 'l',
    width: 6,
    depth: 5,
    notchWidth: 2,
    notchDepth: 1.5,
    notch: 3,
  })
})

test('a custom room keeps its corners: only its height can change here', () => {
  const custom = [
    { x: -3, z: -2 },
    { x: 3, z: -2 },
    { x: 3, z: 0 },
    { x: 1, z: 0 },
    { x: 1, z: 2 },
    { x: -1, z: 2 },
    { x: -1, z: 0 },
    { x: -3, z: 0 },
  ]
  useRoomStore.getState().setRoom({ shape: 'custom', height: 2.6, corners: custom })
  useRoomStore.getState().setRoomSize({ width: 8, height: 3 })
  assert.deepEqual(room().corners, custom)
  assert.equal(room().height, 3)
})

test('a typed wall length that keeps the room allowed is applied, its shape following', () => {
  const { setWallLength } = useRoomStore.getState()
  // The square's back wall to 6 m: now a 6 x 5 rectangle.
  assert.equal(setWallLength(0, 6), null)
  assert.deepEqual(roomSize(room()), { width: 6, depth: 5 })
  assert.equal(room().shape, 'rectangle')
  // Under 0.5 m, or over the 10 m limit: refused, nothing changes.
  const before = room()
  assert.equal(setWallLength(0, 0.2), 'shape')
  assert.equal(setWallLength(0, 12), 'shape')
  assert.equal(room(), before)
  // One undo step per typed length.
  useHistoryStore.getState().undo()
  assert.deepEqual(roomSize(room()), { width: 5, depth: 5 })
})

test('a dragged wall moves in 5 cm steps and stops at the limit', () => {
  const corners = rectangleCorners(5, 5)
  const square = roomOf(corners)
  const drag = startWallDrag(square, 1)
  // The right wall (wall 1) dragged out 1 m: 20 steps, a 6 m wide room.
  assert.equal(reachableStep(square, drag, 0, 20), 20)
  assert.deepEqual(roomSize({ corners: draggedCorners(drag, 20) }), { width: 6, depth: 5 })
  // Dragged far in: it stops when the room is 2 m wide (the smallest).
  assert.equal(reachableStep(square, drag, 0, -100), -60)
  // Dragged far out: it stops at 10 m wide.
  assert.equal(reachableStep(square, drag, 0, 200), 100)
  // Back to where it started: the room as before.
  assert.deepEqual(draggedCorners(drag, 0), corners)
})

test('in an L, a wall stops before a wall next to it gets under 0.5 m, or flattens the notch', () => {
  // The cut away corner's wall along x (wall 2, at z = 0, from x 2 to 0)
  // dragged toward the front: the wall at x = 0 shrinks to 0.5 m and stops.
  const l = roomOf(lCorners(4, 4, 2, 2, 0))
  const drag = startWallDrag(l, 2)
  assert.equal(reachableStep(l, drag, 0, 33), 30)
  // Dragged all the way to the front wall, the notch is gone: a rectangle.
  assert.equal(reachableStep(l, drag, 30, 40), 40)
  assert.deepEqual(describeRoom(draggedCorners(drag, 40)), { shape: 'rectangle', width: 4, depth: 4 })
})

// The back wall of a 6 x 5 room cut into three: x -3..-1, -1..1, 1..3.
const cutRoom = [
  { x: -3, z: -2.5 },
  { x: -1, z: -2.5 },
  { x: 1, z: -2.5 },
  { x: 3, z: -2.5 },
  { x: 3, z: 2.5 },
  { x: -3, z: 2.5 },
]

test('a cut splits a wall in two at a point in 5 cm steps, at least 0.5 m from both ends', () => {
  const room = rectangleCorners(6, 5)
  // The back wall (wall 0, 6 m, from x -3) cut at 2 m from its start.
  const split = splitWall(room, 0, 2)
  assert.equal(split.length, 5)
  assert.deepEqual(split[1], { x: -1, z: -2.5 })
  // Each piece is a wall of its own: 2 m and 4 m.
  const walls = roomWalls(split)
  close(walls[0].length, 2)
  close(walls[1].length, 4)
  assert.ok(isValidRoomCorners(split))
  // The point snaps to 5 cm and keeps 0.5 m to each end.
  close(cutPoint(room, 0, 2.43), 2.45)
  close(cutPoint(room, 0, 0.1), 0.5)
  close(cutPoint(room, 0, 5.9), 5.5)
  // A 1 m wall cuts only in its middle; a shorter one not at all.
  close(cutPoint(rectangleCorners(1, 3), 0, 0.2), 0.5)
  assert.equal(cutPoint(rectangleCorners(0.95, 3), 0, 0.4), null)
  assert.equal(splitWall(rectangleCorners(0.95, 3), 0, 0.4), null)
})

test('a split piece dragged out gets a side wall, and back in line it is one wall again', () => {
  const split = splitWall(rectangleCorners(6, 5), 0, 2)
  // The first piece, x -3..-1, dragged 0.5 m out (toward -z).
  const drag = startWallDrag(roomOf(split), 0)
  assert.equal(reachableStep(roomOf(split), drag, 0, 10), 10)
  const bump = draggedCorners(drag, 10)
  assert.ok(bump.some((corner) => corner.x === -1 && corner.z === -3))
  assert.ok(isValidRoomCorners(bump))
  assert.deepEqual(draggedCorners(drag, 0), rectangleCorners(6, 5))
})

test('a typed length of a piece ending at the cut point slides the point; the other piece follows', () => {
  const { setRoom, setWallLength } = useRoomStore.getState()
  setRoom(roomOf(splitWall(rectangleCorners(6, 5), 0, 2)))
  // The first piece (x -3..-1) ends at the cut point: 2.5 m moves it to -0.5.
  assert.equal(setWallLength(0, 2.5), null)
  assert.deepEqual(room().corners[1], { x: -0.5, z: -2.5 })
  close(roomWalls(room().corners)[1].length, 3.5)
  // The other piece would get under 0.5 m, or fold back over the first:
  // refused.
  assert.equal(setWallLength(0, 5.7), 'shape')
  assert.equal(setWallLength(0, 6.5), 'shape')
  // The second piece ends at a real corner: its length moves the right wall.
  assert.equal(setWallLength(1, 4), null)
  assert.equal(boundingBox(room().corners).maxX, 3.5)
})

test('a dragged wall stops 0.5 m before a wall it does not join, and never jumps past it', () => {
  // A 6 x 5 room with a 1 m slot cut in from the front to z = 0. Wall 4 is
  // the slot's end, along x at z = 0, facing the back wall (z = -2.5).
  const slot = [
    { x: -3, z: -2.5 },
    { x: 3, z: -2.5 },
    { x: 3, z: 2.5 },
    { x: 0.5, z: 2.5 },
    { x: 0.5, z: 0 },
    { x: -0.5, z: 0 },
    { x: -0.5, z: 2.5 },
    { x: -3, z: 2.5 },
  ]
  const drag = startWallDrag(roomOf(slot), 4)
  // Out of the room is into the slot (+z); the back wall is the other way.
  assert.deepEqual(drag.normal, [0, 1])
  // Dragged 5 m toward the back wall, far past it: it stops at z = -2,
  // 0.5 m before it.
  const step = reachableStep(roomOf(slot), drag, 0, -100)
  assert.equal(step, -40)
  const stopped = draggedCorners(drag, step)
  assert.ok(stopped.every((corner) => corner.z >= -2.5 - 1e-9))
  // Two walls that do not meet, closer than 0.5 m: not a room.
  const near = slot.map((corner) => (corner.z === 0 ? { ...corner, z: -2.2 } : corner))
  assert.equal(isValidRoomCorners(near), false)
})

test('a middle piece (two cuts) dragged out gets side walls of at least 0.5 m, and back in line it is one wall again', () => {
  const drag = startWallDrag(roomOf(cutRoom), 1)
  assert.equal(drag.corners.length, 8)
  // 0.2 m out is too shallow for its side walls: it stays in line.
  assert.equal(reachableStep(roomOf(cutRoom), drag, 0, 4), 0)
  // From 0.25 m it jumps out to 0.5 m: a bump.
  assert.equal(reachableStep(roomOf(cutRoom), drag, 0, 5), 10)
  const bump = draggedCorners(drag, 10)
  assert.equal(bump.length, 8)
  assert.ok(bump.some((corner) => corner.x === -1 && corner.z === -3))
  // Back within 0.25 m of the line: in line again, and one wall again.
  assert.equal(reachableStep(roomOf(cutRoom), drag, 10, 5), 0)
  assert.deepEqual(draggedCorners(drag, 0), rectangleCorners(6, 5))
})

test('a bump dragged again later goes back into one straight wall', () => {
  const bump = draggedCorners(startWallDrag(roomOf(cutRoom), 1), 10)
  // The bump's outer wall, from (-1, -3) to (1, -3).
  const index = bump.findIndex((corner) => corner.x === -1 && corner.z === -3)
  const drag = startWallDrag(roomOf(bump), index)
  // Dragged back in (toward +z, so negative steps): it lines up and merges.
  const step = reachableStep(roomOf(bump), drag, 0, -9)
  assert.equal(step, -10)
  assert.deepEqual(draggedCorners(drag, step), rectangleCorners(6, 5))
})

test('tidying merges corners on top of each other and straight corners where a wall ended', () => {
  const corners = [
    { x: -3, z: -2.5 },
    { x: -1, z: -2.5 },
    { x: -1, z: -2.5 },
    { x: 1, z: -2.5 },
    { x: 3, z: -2.5 },
    { x: 3, z: 2.5 },
    { x: -3, z: 2.5 },
  ]
  assert.deepEqual(tidyCorners(corners, [[-1, -2.5], [1, -2.5]]), rectangleCorners(6, 5))
  // A straight corner elsewhere (an earlier cut) stays.
  assert.equal(tidyCorners(corners, [[-1, -2.5]]).length, 5)
})

test('each Room configuration field highlights the walls it moves', () => {
  const rect = { shape: 'rectangle', height: 2.6, corners: rectangleCorners(6, 5), openings: [] }
  // Walls: 0 back, 1 right, 2 front, 3 left.
  assert.deepEqual(wallsChangedBy(rect, 'width'), [1, 3])
  assert.deepEqual(wallsChangedBy(rect, 'depth'), [0, 2])
  // Height moves no wall (its top edge lights up instead).
  assert.deepEqual(wallsChangedBy(rect, 'height'), [])
  assert.deepEqual(wallsChangedBy({ ...rect, shape: 'square' }, 'width'), [0, 1, 2, 3])
  // The L's notch at the front right: its inner walls are 2 (along x, at
  // z = 0) and 3 (along z, at x = 0).
  const l = { ...rect, shape: 'l', corners: lCorners(4, 4, 2, 2, 0) }
  assert.deepEqual(wallsChangedBy(l, 'notchWidth'), [3])
  assert.deepEqual(wallsChangedBy(l, 'notchDepth'), [2])
  assert.deepEqual(wallsChangedBy(l, 'width'), [1, 3, 5])
})

test('a new shape pushes pieces inside, counts them, and undoes in one step', () => {
  const { addObject, updateObject } = useObjectsStore.getState()
  addObject('armchair')
  const [chair] = useObjectsStore.getState().objects
  // In the front right corner, where a new L cuts the room away.
  updateObject(chair.id, { position: [1.8, 0, 1.8] })
  beginGesture()
  useRoomStore.getState().setShape('l')
  const moved = useObjectsStore.getState().fitToRoom(room())
  endGesture()
  assert.equal(moved, 1)
  assert.notDeepEqual(useObjectsStore.getState().objects[0].position, [1.8, 0, 1.8])
  useHistoryStore.getState().undo()
  assert.equal(params().shape, 'square')
  assert.deepEqual(useObjectsStore.getState().objects[0].position, [1.8, 0, 1.8])
})
