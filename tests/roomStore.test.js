import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_ROOM,
  draggedCorners,
  reachableStep,
  roomParams,
  roomSize,
  shapeFor,
  useRoomStore,
} from '../src/store/roomStore.js'
import { describeRoom, lCorners, rectangleCorners } from '../src/store/roomShape.js'
import { newLayout } from '../src/store/layoutFile.js'
import { useObjectsStore } from '../src/store/objectsStore.js'
import { beginGesture, endGesture, useHistoryStore } from '../src/store/historyStore.js'

const room = () => useRoomStore.getState().room
const params = () => roomParams(room())

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
  setShape('rectangle')
  setRoomSize({ depth: 3 })
  assert.deepEqual(roomSize(room()), { width: 4, depth: 3 })
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
  assert.equal(setWallLength(0, 6), true)
  assert.deepEqual(roomSize(room()), { width: 6, depth: 5 })
  assert.equal(room().shape, 'rectangle')
  // Under 0.5 m, or over the 10 m limit: refused, nothing changes.
  const before = room()
  assert.equal(setWallLength(0, 0.2), false)
  assert.equal(setWallLength(0, 12), false)
  assert.equal(room(), before)
  // One undo step per typed length.
  useHistoryStore.getState().undo()
  assert.deepEqual(roomSize(room()), { width: 5, depth: 5 })
})

test('a dragged wall moves in 5 cm steps and stops at the limit', () => {
  const corners = rectangleCorners(5, 5)
  // The right wall (wall 1) dragged out 1 m: 20 steps, a 6 m wide room.
  assert.equal(reachableStep(corners, 1, 0, 20), 20)
  assert.deepEqual(roomSize({ corners: draggedCorners(corners, 1, 20) }), { width: 6, depth: 5 })
  // Dragged far in: it stops when the room is 2 m wide (the smallest).
  assert.equal(reachableStep(corners, 1, 0, -100), -60)
  // Dragged far out: it stops at 10 m wide.
  assert.equal(reachableStep(corners, 1, 0, 200), 100)
  // Back to where it started: the room as before.
  assert.equal(draggedCorners(corners, 1, 0), corners)
})

test('in an L, a wall stops before a wall next to it would get under 0.5 m', () => {
  // The cut away corner's wall along x (wall 2, at z = 0, from x 2 to 0)
  // dragged toward the front: the wall at x = 2 shrinks to 0.5 m and stops.
  const corners = lCorners(4, 4, 2, 2, 0)
  const step = reachableStep(corners, 2, 0, 100)
  assert.equal(step, 30)
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
