import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fitOpenings,
  nearestWall,
  newOpening,
  openingsProblem,
  reanchorOpenings,
  tallestOpening,
} from '../src/store/openings.js'
import { draggedRoom, reachableStep, startWallDrag, useRoomStore } from '../src/store/roomStore.js'
import { rectangleCorners, splitWall } from '../src/store/roomShape.js'
import { importLayout, layoutData, newLayout } from '../src/store/layoutFile.js'
import { useHistoryStore } from '../src/store/historyStore.js'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)
// A 6 x 5 room, 2.6 m high. Wall 0 is the back wall, from x -3 to 3.
const roomWith = (openings) => ({ shape: 'rectangle', height: 2.6, corners: rectangleCorners(6, 5), openings })
const door = (props) => ({ id: 'd', type: 'door', wallIndex: 0, offset: 1, width: 0.9, height: 2.05, sill: 0, ...props })
const window = (props) => ({ id: 'w', type: 'window', wallIndex: 0, offset: 3, width: 1.2, height: 1.2, sill: 0.9, ...props })
const room = () => useRoomStore.getState().room

beforeEach(() => newLayout())

test('an opening fits inside its wall with 0.1 m left at each end, under the ceiling, off other openings', () => {
  assert.equal(openingsProblem(roomWith([door(), window()])), null)
  assert.equal(openingsProblem(roomWith([door({ offset: 0.05 })])), 'wall')
  assert.equal(openingsProblem(roomWith([door({ offset: 5.05 })])), 'wall')
  assert.equal(openingsProblem(roomWith([window({ sill: 1.5 })])), 'height')
  assert.equal(openingsProblem(roomWith([door(), window({ offset: 1.5 })])), 'overlap')
  // Touching is fine.
  assert.equal(openingsProblem(roomWith([door(), window({ offset: 1.9 })])), null)
})

test('a new opening is centred on the chosen wall, or the longest, and needs room', () => {
  const { opening } = newOpening(roomWith([]), 'door', 1)
  assert.equal(opening.wallIndex, 1)
  close(opening.offset, (5 - 0.9) / 2)
  assert.equal(opening.sill, 0)
  // No wall chosen: the longest (the 6 m back wall, the first of two).
  assert.equal(newOpening(roomWith([]), 'window').opening.wallIndex, 0)
  // A 1.2 m window does not fit on a 1.3 m wall (0.1 m at each end needed).
  const narrow = { ...roomWith([]), corners: rectangleCorners(6, 1.3) }
  assert.equal(newOpening(narrow, 'window', 1).problem, 'short')
  // Where another one already is: no room.
  assert.equal(newOpening(roomWith([window({ offset: 2.4 })]), 'door', 0).problem, 'full')
})

test('openings stay where they are when walls are renumbered, and move with their own wall', () => {
  const before = rectangleCorners(6, 5)
  // A cut elsewhere on the back wall (at x 0.5): the door (x -2..-1.1) is on
  // wall 0 still, the window (x 1..2.2) on wall 1, the second piece.
  const cut = splitWall(before, 0, 3.5)
  const [d, w] = reanchorOpenings(before, cut, [door(), window({ offset: 4 })])
  assert.equal(d.wallIndex, 0)
  close(d.offset, 1)
  assert.equal(w.wallIndex, 1)
  close(w.offset, 0.5)
  // The back wall moved 1 m out: openings on it go with it.
  const moved = before.map((corner, index) => (index < 2 ? { ...corner, z: corner.z - 1 } : corner))
  const [carried] = reanchorOpenings(before, moved, [door()], 0, [0, -1])
  assert.equal(carried.wallIndex, 0)
  close(carried.offset, 1)
  // A cut through the door (at x -1.5, the door -2..-1.1): it is on no
  // single wall any more.
  assert.equal(reanchorOpenings(before, splitWall(before, 0, 1.5), [door()]), null)
})

test('a wall stops where a door on the wall next to it would no longer fit', () => {
  // A door at the right end of the back wall (x 1.9..2.8).
  const withDoor = roomWith([door({ offset: 4.9 })])
  // The right wall (wall 1) dragged in: the back wall shrinks; the door needs
  // 0.1 m to its right, so the wall stops 0.1 m in (2 steps in).
  const drag = startWallDrag(withDoor, 1)
  assert.equal(reachableStep(withDoor, drag, 0, -10), -2)
  assert.equal(draggedRoom(withDoor, drag, -3).problem, 'openings')
})

test('a wall with a door moves with the door on it', () => {
  const withDoor = roomWith([door()])
  const drag = startWallDrag(withDoor, 0)
  const { room: moved } = draggedRoom(withDoor, drag, 10)
  assert.equal(moved.openings[0].wallIndex, 0)
  close(moved.openings[0].offset, 1)
})

test('after a new shape or size, openings slide or get lower to fit, or are left out', () => {
  const resized = fitOpenings({ ...roomWith([window({ offset: 4.5 })]), corners: rectangleCorners(5, 5) })
  close(resized.openings[0].offset, 5 - 0.1 - 1.2)
  const lower = fitOpenings({ ...roomWith([door()]), height: 2 })
  close(lower.openings[0].height, 2)
  const gone = fitOpenings({ ...roomWith([door({ wallIndex: 5 })]) })
  assert.deepEqual(gone.openings, [])
  assert.equal(tallestOpening(roomWith([door(), window()])), 2.1)
})

test('after a new shape a door stays on the wall facing the same way, nearest to where it was', () => {
  const { setShape, addOpening, rotateNotch, setRoomSize } = useRoomStore.getState()
  setShape('rectangle')
  setRoomSize({ width: 6 })
  setRoomSize({ depth: 5 })
  // A door on the front wall (wall 2 of a rectangle, facing +z), at the left.
  const { id } = addOpening('door', 2)
  useRoomStore.getState().updateOpening(id, { offset: 4 })
  const frontZ = () => {
    const opening = room().openings[0]
    const wall = room().corners[opening.wallIndex]
    return wall.z
  }
  assert.equal(frontZ(), 2.5)
  // As an L (the front right cut away) it is still on the front wall.
  setShape('l')
  assert.equal(room().openings.length, 1)
  assert.equal(frontZ(), 2.5)
  // A half-typed width that would drop it leaves no trace once finished.
  const base = room()
  setRoomSize({ width: 2 }, base)
  setRoomSize({ width: 6 }, base)
  assert.equal(room().openings.length, 1)
  // Turned: the notch moves to the front left; the door is still on a wall
  // facing the front.
  rotateNotch()
  assert.equal(room().openings.length, 1)
  assert.equal(room().corners[room().openings[0].wallIndex].z, room().corners[(room().openings[0].wallIndex + 1) % room().corners.length].z)
})

test('the nearest wall to a point on the floor, within reach', () => {
  const corners = rectangleCorners(6, 5)
  assert.deepEqual(nearestWall(corners, 0, -2.3, 0.6), { wallIndex: 0, along: 3 })
  assert.equal(nearestWall(corners, 0, 0, 0.6), null)
})

test('adding, changing and removing an opening, each one undo step', () => {
  const { addOpening, updateOpening, removeOpening } = useRoomStore.getState()
  const { id } = addOpening('door', 0)
  assert.equal(room().openings.length, 1)
  assert.equal(updateOpening(id, { width: 1 }), true)
  // Not past the wall's end.
  assert.equal(updateOpening(id, { offset: 4.5 }), false)
  removeOpening(id)
  assert.equal(room().openings.length, 0)
  const history = useHistoryStore.getState()
  history.undo()
  assert.equal(room().openings[0].width, 1)
  history.undo()
  history.undo()
  assert.equal(room().openings.length, 0)
})

test('openings are saved in the file and opened again; a file whose opening does not fit is refused', () => {
  useRoomStore.getState().addOpening('window', 1)
  const saved = layoutData()
  const [entry] = saved.room.openings
  assert.equal(entry.type, 'window')
  assert.equal(entry.wall, 1)
  newLayout()
  assert.equal(importLayout(JSON.stringify(saved)), 'done')
  assert.equal(room().openings.length, 1)
  assert.equal(room().openings[0].wallIndex, 1)
  // Too tall for the room, on a wall that does not exist, or of an unknown type.
  const bad = [
    { ...entry, height: 3 },
    { ...entry, wall: 9 },
    { ...entry, type: 'arch' },
  ]
  for (const opening of bad) {
    const file = { ...saved, room: { ...saved.room, openings: [opening] } }
    assert.equal(importLayout(JSON.stringify(file)), 'invalid')
  }
})
