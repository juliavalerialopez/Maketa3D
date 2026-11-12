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
} from '../src/store/roomStore.js'
import {
  cutSpan,
  cutWall,
  describeRoom,
  lCorners,
  rectangleCorners,
  tidyCorners,
} from '../src/store/roomShape.js'
import { newLayout } from '../src/store/layoutFile.js'
import { useObjectsStore } from '../src/store/objectsStore.js'
import { beginGesture, endGesture, useHistoryStore } from '../src/store/historyStore.js'

const room = () => useRoomStore.getState().room
const params = () => roomParams(room())
// A room with these corners, 2.6 m high, without doors or windows.
const roomOf = (corners) => ({ shape: 'custom', height: 2.6, corners, openings: [] })

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

test('a cut makes a 1 m piece (a third of a short wall), at least 0.5 m from both ends', () => {
  const room = rectangleCorners(6, 5)
  // The back wall (wall 0, 6 m) cut at 2 m from its start: x -1.5..-0.5.
  const cut = cutWall(room, 0, 2)
  assert.equal(cut.index, 1)
  assert.deepEqual(cut.corners.slice(1, 3), [
    { x: -1.5, z: -2.5 },
    { x: -0.5, z: -2.5 },
  ])
  // Cut too near an end: moved in so 0.5 m is left.
  assert.deepEqual(cutSpan(room, 0, 0.1), [0.5, 1.5])
  // A 2.1 m wall gives a 0.7 m piece; a 1.5 m wall a 0.5 m one; shorter none.
  const short = rectangleCorners(2.1, 1.5)
  const piece = cutSpan(short, 0, 1.05)
  assert.ok(Math.abs(piece[1] - piece[0] - 0.7) < 1e-9)
  assert.deepEqual(cutSpan(short, 1, 0.75), [0.5, 1])
  assert.equal(cutSpan(rectangleCorners(1.4, 3), 0, 0.7), null)
})

test('a cut piece dragged out gets side walls of at least 0.5 m, and back in line it is one wall again', () => {
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
