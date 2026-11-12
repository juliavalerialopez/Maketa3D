import { create } from 'zustand'
import {
  MIN_WALL,
  boundingBox,
  describeRoom,
  isValidRoomCorners,
  lCorners,
  moveWall,
  rectangleCorners,
  setWallLength,
  tidyCorners,
} from './roomShape.js'

// Allowed room size in meters, per dimension: [min, max]. Width and depth are
// the room's size seen from above (its corners' bounding box). Used by the
// Room inputs and by layout import.
export const ROOM_LIMITS = {
  width: [2, 10],
  depth: [2, 10],
  height: [2, 4],
}

// The room: { shape, height, corners } (J.2, J.4). Corners as in
// roomShape.js, in world space with the front wall at +z. `shape` is the
// shape button that made it: 'square', 'rectangle', 'l' (each a preset of
// corners) or 'custom' (shaped in Build). The project file keeps only height
// and corners; the shape is worked out again when it opens (shapeFor).

// A new project's room: a 5 m square, 2.6 m high.
export const DEFAULT_ROOM = { shape: 'square', height: 2.6, corners: rectangleCorners(5, 5) }

// An L's cut away piece, per side: at least MIN_WALL, and leaving a leg of at
// least MIN_WALL.
export const notchLimits = (size) => [MIN_WALL, size - MIN_WALL]

const near = (a, b) => Math.abs(a - b) < 1e-9
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value))
// To the nearest 5 cm.
const roundToStep = (meters) => Math.round(meters * 20) / 20

// The shape button for a room with these corners (a file just opened): a
// rectangle is a Square when its sides are equal and Rectangle was not
// chosen.
export function shapeFor(corners, chosen) {
  const { shape, width, depth } = describeRoom(corners)
  if (shape !== 'rectangle') return shape
  if (chosen === 'rectangle' || !near(width, depth)) return 'rectangle'
  return 'square'
}

// The room's size seen from above: { width, depth } of its bounding box.
export function roomSize(room) {
  const { width, depth } = boundingBox(room.corners)
  return { width, depth }
}

// Everything the Room inputs show and edit: { shape, height, width, depth },
// plus notchWidth, notchDepth and notch for an L, and the middle (centerX,
// centerZ), which stays where it is when sizes change.
export function roomParams(room) {
  const box = boundingBox(room.corners)
  return { ...describeRoom(room.corners), shape: room.shape, height: room.height, centerX: box.centerX, centerZ: box.centerZ }
}

// The room for `params` (roomParams, changed). An L's notch is kept inside
// its limits. A custom room keeps its corners; only its height changes.
// Anything else the room holds is kept.
export function shapedRoom(room, params) {
  const { shape, height, width, depth, centerX, centerZ } = params
  const next = { ...room, shape, height }
  if (shape === 'square') next.corners = rectangleCorners(width, width, centerX, centerZ)
  if (shape === 'rectangle') next.corners = rectangleCorners(width, depth, centerX, centerZ)
  if (shape === 'l') {
    const notchWidth = clamp(params.notchWidth, notchLimits(width))
    const notchDepth = clamp(params.notchDepth, notchLimits(depth))
    next.corners = lCorners(width, depth, notchWidth, notchDepth, params.notch, centerX, centerZ)
  }
  return next
}

// The room with new sizes: { width, depth, height, notchWidth, notchDepth },
// each optional. A Square's side is its width.
export function resizedRoom(room, size) {
  const params = { ...roomParams(room), ...size }
  if (params.shape === 'square') params.depth = params.width
  return shapedRoom(room, params)
}

// The room as another preset shape (J.4), keeping width and depth where they
// make sense: a Square takes the width as its side, a Rectangle keeps the
// bounding box, a new L cuts half of each side away at the front right.
export function reshapedRoom(room, shape) {
  const params = roomParams(room)
  if (shape === params.shape) return room
  const next = { ...params, shape }
  if (shape === 'square') next.depth = next.width
  if (shape === 'l') {
    next.notchWidth = roundToStep(next.width / 2)
    next.notchDepth = roundToStep(next.depth / 2)
    next.notch = 0
  }
  return shapedRoom(room, next)
}

// An L with its cut away corner moved to the next corner, clockwise seen from
// above (front at the bottom).
export function rotatedNotch(room) {
  const params = roomParams(room)
  if (params.shape !== 'l') return room
  return shapedRoom(room, { ...params, notch: (params.notch + 1) % 4 })
}

// True when the corners make a room the app allows: closed, along the axes,
// walls of at least MIN_WALL, and within the size limits seen from above.
export function isAllowedRoom(corners) {
  if (!isValidRoomCorners(corners)) return false
  const { width, depth } = boundingBox(corners)
  const within = (value, [min, max]) => value >= min - 1e-9 && value <= max + 1e-9
  return within(width, ROOM_LIMITS.width) && within(depth, ROOM_LIMITS.depth)
}

// The room with new corners (Build), its shape button following them, or
// null when they do not make an allowed room.
export function reshapedCorners(room, corners) {
  if (!isAllowedRoom(corners)) return null
  return { ...room, corners, shape: shapeFor(corners, room.shape) }
}

// Moving a wall in Build snaps to this, in meters (J.6).
export const WALL_SNAP = 0.05

// The corners with a wall dragged to `step` (WALL_SNAP steps out of the
// room). `drag` is prepareWallDrag's result for the room's `corners` before
// the drag. The wall moves, and a side wall that shrank to nothing, or a
// piece back in line with its neighbours (also at 0, after a drag out and
// back), is tidied into one wall (J.7).
export function draggedCorners(corners, drag, step) {
  const moved = step === 0 ? drag.corners : moveWall(drag.corners, drag.index, step * WALL_SNAP)
  const ends = [moved[drag.index], moved[(drag.index + 1) % moved.length]].map(({ x, z }) => [x, z])
  return tidyCorners(moved, ends)
}

// Dragging a wall (J.6, J.7): from `fromStep` (the last allowed step) toward
// `targetStep`, the farthest step the wall reaches. It stops where the room
// stops being allowed (a wall under 0.5 m, walls crossing, too big or too
// small) and does not jump past it, with one exception: a wall next to it
// that is under 0.5 m only for a little while (a cut piece's side walls
// growing from nothing, or shrinking back to nothing as the piece lines up
// again) is passed over, up to 0.5 m on, and up to 0.25 m beyond the pointer.
export function reachableStep(corners, drag, fromStep, targetStep) {
  const allowed = (step) => isAllowedRoom(draggedCorners(corners, drag, step))
  const direction = Math.sign(targetStep - fromStep)
  if (!direction) return fromStep
  const gapSteps = Math.round(MIN_WALL / WALL_SNAP)
  // The farthest a jump may land: a little beyond the pointer.
  const limit = targetStep + direction * Math.round(gapSteps / 2)
  const within = (step) => (direction > 0 ? step <= limit : step >= limit)
  let reached = fromStep
  let step = fromStep
  while (step !== targetStep) {
    step += direction
    if (allowed(step)) {
      reached = step
      continue
    }
    let landing = null
    for (let ahead = step + direction; Math.abs(ahead - step) <= gapSteps && within(ahead); ahead += direction) {
      if (allowed(ahead)) {
        landing = ahead
        break
      }
    }
    if (landing === null) break
    reached = landing
    step = landing
    if (direction > 0 ? step >= targetStep : step <= targetStep) break
  }
  return reached
}

export const useRoomStore = create((set, get) => ({
  room: DEFAULT_ROOM,
  // { width, depth, height, notchWidth, notchDepth }, each optional.
  setRoomSize: (size) => set((state) => ({ room: resizedRoom(state.room, size) })),
  // 'square', 'rectangle' or 'l' (the shape buttons).
  setShape: (shape) => set((state) => ({ room: reshapedRoom(state.room, shape) })),
  rotateNotch: () => set((state) => ({ room: rotatedNotch(state.room) })),
  // Build (J.6, J.7): new corners. Returns false and changes nothing when
  // they do not make an allowed room.
  setCorners: (corners) => {
    const room = reshapedCorners(get().room, corners)
    if (room) set({ room })
    return Boolean(room)
  },
  // Build (J.5): a typed wall length. Returns false and changes nothing when
  // the room would not be allowed (a wall under 0.5 m, crossing walls, too
  // big or too small).
  setWallLength: (index, length) => {
    const room = reshapedCorners(get().room, setWallLength(get().room.corners, index, length))
    if (room) set({ room })
    return Boolean(room)
  },
  // Replaces the whole room (New Project, Open Project).
  setRoom: (room) => set({ room }),
}))
