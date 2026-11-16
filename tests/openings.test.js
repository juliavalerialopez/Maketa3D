import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultSized,
  fitOpenings,
  freeSpan,
  nearestWall,
  openingStart,
  openingsProblem,
  placedOpening,
  reanchorOpenings,
  spannedOpening,
  tallestOpening,
  widenedOpening,
} from '../src/store/openings.js'
import { draggedRoom, reachableStep, startWallDrag, useRoomStore } from '../src/store/roomStore.js'
import { rectangleCorners, roomWalls, splitWall } from '../src/store/roomShape.js'
import { importLayout, layoutData, newLayout } from '../src/store/layoutFile.js'
import { useHistoryStore } from '../src/store/historyStore.js'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)
// A 6 x 5 room, 2.6 m high. Wall 0 is the back wall, from x -3 to 3.
const roomWith = (openings) => ({ shape: 'rectangle', height: 2.6, corners: rectangleCorners(6, 5), openings })
const door = (props) => ({ id: 'd', type: 'door', wallIndex: 0, offset: 1, width: 0.9, height: 2.05, sill: 0, ...props })
const window = (props) => ({ id: 'w', type: 'window', wallIndex: 0, offset: 3, width: 1.2, height: 1.2, sill: 0.9, ...props })
const room = () => useRoomStore.getState().room
// Adds a new opening of `type` centred on wall `wallIndex` of the store's room.
const addCentred = (type, wallIndex) => {
  const { length } = roomWalls(room().corners)[wallIndex]
  return useRoomStore.getState().addOpening(placedOpening(room(), type, wallIndex, length / 2).opening)
}

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

test('an opening is free between its wall ends, 0.1 m in, and its neighbours on the same wall (J.9.1.1)', () => {
  // Wall 0 is 6 m long.
  assert.deepEqual(freeSpan(roomWith([door()]), door()), { from: 0.1, to: 5.9 })
  // The window (3 to 4.2) is past the door; one on another wall does not count.
  const three = roomWith([door(), window(), window({ id: 'w2', wallIndex: 1, offset: 0.5 })])
  assert.deepEqual(freeSpan(three, door()), { from: 0.1, to: 3 })
  assert.deepEqual(freeSpan(three, window()), { from: 1.9, to: 5.9 })
})

test('a wider opening grows past its far edge, then back toward the wall start (J.9.1.1)', () => {
  // Room past its far edge: it stays where it is.
  assert.deepEqual(widenedOpening(roomWith([door()]), door(), 1.2), { offset: 1, width: 1.2 })
  // Against the wall's end (5.9): it grows back toward the start.
  const atEnd = door({ offset: 5 })
  assert.deepEqual(widenedOpening(roomWith([atEnd]), atEnd, 1.2), { offset: 4.7, width: 1.2 })
  // Against another opening: the same, and too wide for the span it does not fit.
  const beforeWindow = door({ offset: 2.1 })
  const withWindow = roomWith([beforeWindow, window()])
  const wider = widenedOpening(withWindow, beforeWindow, 1.5)
  assert.deepEqual(wider, { offset: 1.5, width: 1.5 })
  assert.equal(openingsProblem(roomWith([{ ...beforeWindow, ...wider }, window()])), null)
  const tooWide = widenedOpening(withWindow, beforeWindow, 3)
  assert.notEqual(openingsProblem(roomWith([{ ...beforeWindow, ...tooWide }, window()])), null)
  // Narrower: it keeps its near edge.
  assert.deepEqual(widenedOpening(roomWith([atEnd]), atEnd, 0.6), { offset: 5, width: 0.6 })
  // Through the store: a door at the wall's end gets wider.
  useRoomStore.getState().setRoom(roomWith([atEnd]))
  assert.ok(useRoomStore.getState().updateOpening('d', widenedOpening(room(), atEnd, 1.2)))
  close(useRoomStore.getState().room.openings[0].offset, 4.7)
})

test('Default size puts the standard width and height back, growing like Width, or does not fit (J.8.1.1)', () => {
  // A narrow, low door in the middle of the wall: it keeps its place.
  const small = door({ width: 0.6, height: 1.8 })
  assert.deepEqual(defaultSized(roomWith([small]), small), { offset: 1, width: 0.9, height: 2.05 })
  // Against the wall's end (5.9): it grows back toward the start.
  const atEnd = door({ offset: 5.3, width: 0.6 })
  assert.deepEqual(defaultSized(roomWith([atEnd]), atEnd), { offset: 5, width: 0.9, height: 2.05 })
  // A window keeps its sill; in a low room it is lower.
  const wide = window({ width: 2, height: 0.8 })
  assert.deepEqual(defaultSized(roomWith([wide]), wide), { offset: 3, width: 1.2, height: 1.2 })
  const low = { ...roomWith([wide]), height: 2 }
  close(defaultSized(low, wide).height, 1.1)
  // Squeezed between two others with less than 0.9 m free: it does not fit.
  const squeezed = door({ offset: 2.2, width: 0.6 })
  const between = roomWith([window({ offset: 1, width: 1.2 }), squeezed, window({ id: 'w2', offset: 2.8 })])
  assert.equal(defaultSized(between, squeezed), null)
})

test('a door placed with the pointer is centred on it in 5 cm steps, 0.1 m from the wall ends (J.8.1)', () => {
  // Wall 0 is 6 m long: the pointer 2.03 m along it puts the door's near
  // edge at 1.58, snapped to 1.6.
  const { opening, problem } = placedOpening(roomWith([]), 'door', 0, 2.03)
  assert.equal(problem, null)
  close(opening.offset, 1.6)
  assert.equal(opening.width, 0.9)
  assert.equal(opening.sill, 0)
  // Near an end it stops 0.1 m before it.
  close(placedOpening(roomWith([]), 'door', 0, 0.2).opening.offset, 0.1)
  close(placedOpening(roomWith([]), 'door', 0, 5.95).opening.offset, 6 - 0.1 - 0.9)
  // Over another opening: shown, but it cannot go there.
  assert.equal(placedOpening(roomWith([window()]), 'door', 0, 3.5).problem, 'full')
  // A wall too short for it.
  const narrow = { ...roomWith([]), corners: rectangleCorners(6, 1) }
  assert.equal(placedOpening(narrow, 'door', 1, 0.5).problem, 'short')
})

test('a new opening is added where it can go and nowhere else (J.8.1)', () => {
  const { addOpening } = useRoomStore.getState()
  const { id } = addOpening(placedOpening(room(), 'door', 0, 1).opening)
  const placed = room().openings.find((opening) => opening.id === id)
  assert.equal(placed.wallIndex, 0)
  close(placed.offset, 0.55)
  // Over the first one: refused, nothing changes.
  const before = room()
  assert.deepEqual(addOpening(placedOpening(room(), 'door', 0, 1.2).opening), { problem: 'full' })
  assert.equal(room(), before)
})

test('a window starts where the first click is, 0.1 m from the wall ends, not inside another opening (J.8.2)', () => {
  // The back wall is 6 m long, a window on it from 3 to 4.2.
  assert.deepEqual(openingStart(roomWith([]), 0, 1.02), { wallIndex: 0, along: 1, problem: null })
  close(openingStart(roomWith([]), 0, -0.4).along, 0.1)
  close(openingStart(roomWith([]), 0, 7).along, 5.9)
  assert.equal(openingStart(roomWith([window()]), 0, 3.5).problem, 'full')
  // Touching it is fine.
  assert.equal(openingStart(roomWith([window()]), 0, 4.2).problem, null)
  const narrow = { ...roomWith([]), corners: rectangleCorners(6, 0.45) }
  assert.equal(openingStart(narrow, 1, 0.2).problem, 'short')
})

test('a window spans from the first click to the second, either way, at least 0.3 m wide (J.8.2)', () => {
  const { opening, problem } = spannedOpening(roomWith([]), 'window', 0, 1, 2.52)
  assert.equal(problem, null)
  close(opening.offset, 1)
  close(opening.width, 1.5)
  assert.equal(opening.height, 1.2)
  assert.equal(opening.sill, 0.9)
  // The second click before the first.
  const back = spannedOpening(roomWith([]), 'window', 0, 2.5, 1).opening
  close(back.offset, 1)
  close(back.width, 1.5)
  // Past the wall's end it stops 0.1 m before it.
  close(spannedOpening(roomWith([]), 'window', 0, 5, 9).opening.width, 0.9)
  assert.equal(spannedOpening(roomWith([]), 'window', 0, 1, 1.2).problem, 'narrow')
  // Over another opening (3 to 4.2).
  assert.equal(spannedOpening(roomWith([window()]), 'window', 0, 2, 3.5).problem, 'full')
  assert.equal(spannedOpening(roomWith([window()]), 'window', 0, 2, 3).problem, null)
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
  const { setShape, rotateNotch, setRoomSize } = useRoomStore.getState()
  setShape('rectangle')
  setRoomSize({ width: 6 })
  setRoomSize({ depth: 5 })
  // A door on the front wall (wall 2 of a rectangle, facing +z), at the left.
  const { id } = addCentred('door', 2)
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
  const { updateOpening, removeOpening } = useRoomStore.getState()
  const { id } = addCentred('door', 0)
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
  addCentred('window', 1)
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
