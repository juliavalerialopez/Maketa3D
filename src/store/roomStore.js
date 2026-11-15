import { create } from 'zustand'
import {
  MIN_WALL,
  boundingBox,
  describeRoom,
  isValidRoomCorners,
  lCorners,
  moveWall,
  prepareWallDrag,
  rectangleCorners,
  roomWalls,
  slideCutPoint,
  tidyCorners,
  wallLengthMove,
} from './roomShape.js'
import { fitOpenings, openingsOf, openingsProblem, reanchorOpenings } from './openings.js'

// Allowed room size in meters, per dimension: [min, max]. Width and depth are
// the room's size seen from above (its corners' bounding box). Used by the
// Room inputs and by layout import.
export const ROOM_LIMITS = {
  width: [2, 10],
  depth: [2, 10],
  height: [2, 4],
}

// The room: { shape, height, corners, openings } (J.2, J.4, J.8). Corners as
// in roomShape.js, in world space with the front wall at +z. `shape` is the
// shape button that made it: 'square', 'rectangle', 'l' (each a preset of
// corners) or 'custom' (shaped in Build). Openings (doors and windows) as in
// openings.js. The project file keeps height, corners and openings; the shape
// is worked out again when it opens (shapeFor).

// A new project's room: a 5 m square, 2.6 m high.
export const DEFAULT_ROOM = { shape: 'square', height: 2.6, corners: rectangleCorners(5, 5), openings: [] }

// An L's cut away piece, per side: at least MIN_WALL, and leaving a leg of at
// least MIN_WALL.
export const notchLimits = (size) => [MIN_WALL, size - MIN_WALL]

const near = (a, b) => Math.abs(a - b) < 1e-9
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value))
// To the nearest 5 cm.
const roundToStep = (meters) => Math.round(meters * 20) / 20
// A Rectangle made from a room with equal sides: its depth, as a share of
// its width (J.4.1).
const RECTANGLE_DEPTH = 0.75

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
// Doors and windows are made to fit (fitOpenings); anything else the room
// holds is kept.
export function shapedRoom(room, params) {
  return fitOpenings(shapedCorners(room, params), room.corners)
}

function shapedCorners(room, params) {
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
// bounding box (one with equal sides gets a depth of 3/4 of its width, at
// least 2 m, so it looks like a rectangle, J.4.1), a new L cuts half of each
// side away at the front right.
export function reshapedRoom(room, shape) {
  const params = roomParams(room)
  if (shape === params.shape) return room
  const next = { ...params, shape }
  if (shape === 'square') next.depth = next.width
  if (shape === 'rectangle' && near(next.width, next.depth)) {
    next.depth = Math.max(ROOM_LIMITS.depth[0], roundToStep(next.width * RECTANGLE_DEPTH))
  }
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

// The walls (their numbers) that a Room configuration field moves (J.4.2),
// shown while the pointer is over the field. The room stays centred, so
// Width moves every wall along z (left and right, and an L's notch wall
// too), Depth every wall along x, a Square's Side all of them; Notch width
// and Notch depth move the notch's inner wall along z or along x. Height
// moves no wall: it shows as the walls' top edge instead.
export function wallsChangedBy(room, key) {
  const box = boundingBox(room.corners)
  const walls = roomWalls(room.corners)
  const alongZ = (wall) => Math.abs(wall.normal[0]) > 0.5
  const inner = (wall) =>
    alongZ(wall)
      ? !near(wall.start.x, box.minX) && !near(wall.start.x, box.maxX)
      : !near(wall.start.z, box.minZ) && !near(wall.start.z, box.maxZ)
  const pick = (keep) => walls.flatMap((wall, index) => (keep(wall) ? [index] : []))
  if (key === 'width' && room.shape === 'square') return pick(() => true)
  if (key === 'width') return pick(alongZ)
  if (key === 'depth') return pick((wall) => !alongZ(wall))
  if (key === 'notchWidth') return pick((wall) => alongZ(wall) && inner(wall))
  if (key === 'notchDepth') return pick((wall) => !alongZ(wall) && inner(wall))
  return []
}

// True when the corners make a room the app allows: closed, along the axes,
// walls of at least MIN_WALL, and within the size limits seen from above.
export function isAllowedRoom(corners) {
  if (!isValidRoomCorners(corners)) return false
  const { width, depth } = boundingBox(corners)
  const within = (value, [min, max]) => value >= min - 1e-9 && value <= max + 1e-9
  return within(width, ROOM_LIMITS.width) && within(depth, ROOM_LIMITS.depth)
}

// The room with new corners (Build), its shape button following them, and
// its doors and windows kept where they are (J.8; those on wall `moved.wall`
// of the old corners move with it by `moved.shift`, [x, z]). Returns
// { room }, or { problem }: 'shape' (not an allowed room) or 'openings' (a
// door or window would no longer fit its wall).
export function roomWithCorners(room, corners, moved = { wall: -1, shift: [0, 0] }) {
  if (!isAllowedRoom(corners)) return { problem: 'shape' }
  const openings = reanchorOpenings(room.corners, corners, openingsOf(room), moved.wall, moved.shift)
  if (!openings) return { problem: 'openings' }
  const next = { ...room, corners, openings, shape: shapeFor(corners, room.shape) }
  return openingsProblem(next) ? { problem: 'openings' } : { room: next }
}

// Moving a wall in Build snaps to this, in meters (J.6).
export const WALL_SNAP = 0.05

// Getting wall `index` of `room` ready to be dragged (J.6, J.7):
// prepareWallDrag's { corners, index } plus the wall's number in the room
// (`wall`) and its outward side (`normal`).
export function startWallDrag(room, index) {
  return { ...prepareWallDrag(room.corners, index), wall: index, normal: roomWalls(room.corners)[index].normal }
}

// The corners with a wall dragged to `step` (WALL_SNAP steps out of the
// room). `drag` is startWallDrag's result for the room before the drag. The
// wall moves, and a side wall that shrank to nothing, or a piece back in line
// with its neighbours (also at 0, after a drag out and back), is tidied into
// one wall (J.7).
export function draggedCorners(drag, step) {
  const moved = step === 0 ? drag.corners : moveWall(drag.corners, drag.index, step * WALL_SNAP)
  const ends = [moved[drag.index], moved[(drag.index + 1) % moved.length]].map(({ x, z }) => [x, z])
  return tidyCorners(moved, ends)
}

// The room (as before the drag) with a wall dragged to `step`: roomWithCorners'
// { room } or { problem }. Doors and windows on the wall move with it (J.8).
export function draggedRoom(room, drag, step) {
  const offset = step * WALL_SNAP
  const shift = [drag.normal[0] * offset, drag.normal[1] * offset]
  return roomWithCorners(room, draggedCorners(drag, step), { wall: drag.wall, shift })
}

// Dragging a wall (J.6, J.7): from `fromStep` (the last allowed step) toward
// `targetStep`, the farthest step the wall reaches. It stops where the room
// stops being allowed (a wall under 0.5 m, walls crossing, too big or too
// small) and does not jump past it, with one exception: a wall next to it
// that is under 0.5 m only for a little while (a cut piece's side walls
// growing from nothing, or shrinking back to nothing as the piece lines up
// again) is passed over, up to 0.5 m on, and up to 0.25 m beyond the pointer.
// Doors and windows that would no longer fit stop it too (J.8).
export function reachableStep(room, drag, fromStep, targetStep) {
  const allowed = (step) => !draggedRoom(room, drag, step).problem
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

// The room with opening `id` changed by `partial` (J.8), or null when it
// would not fit (its wall, the room height, another opening).
export function roomWithOpening(room, id, partial) {
  const openings = openingsOf(room).map((opening) => (opening.id === id ? { ...opening, ...partial } : opening))
  const next = { ...room, openings }
  return openingsProblem(next) ? null : next
}

export const useRoomStore = create((set, get) => ({
  room: DEFAULT_ROOM,
  // { width, depth, height, notchWidth, notchDepth }, each optional, applied
  // to `base` (the room when the edit began; the current one if not given),
  // so a number half typed never moves or drops a door for good (J.8).
  setRoomSize: (size, base) => set((state) => ({ room: resizedRoom(base ?? state.room, size) })),
  // 'square', 'rectangle' or 'l' (the shape buttons).
  setShape: (shape) => set((state) => ({ room: reshapedRoom(state.room, shape) })),
  rotateNotch: () => set((state) => ({ room: rotatedNotch(state.room) })),
  // Build (J.6, J.7): new corners, `moved` as in roomWithCorners. Returns
  // null when done, else the problem ('shape' or 'openings'), changing
  // nothing.
  setCorners: (corners, moved) => {
    const result = roomWithCorners(get().room, corners, moved)
    if (result.room) set({ room: result.room })
    return result.problem ?? null
  },
  // Build (J.5): a typed wall length: null when done, else the problem as in
  // setCorners.
  setWallLength: (index, length) => {
    const { corners } = get().room
    // A piece ending at a cut point: the point slides along the wall (J.7.1).
    const slid = slideCutPoint(corners, index, length)
    if (slid) return get().setCorners(slid)
    const { wall, offset } = wallLengthMove(corners, index, length)
    const [nx, nz] = roomWalls(corners)[wall].normal
    return get().setCorners(moveWall(corners, wall, offset), { wall, shift: [nx * offset, nz * offset] })
  },
  // Build (J.8.1, J.8.2): a new door or window, as placedOpening or
  // spannedOpening make it (without its id). Returns { id }, or { problem:
  // 'full' } when it does not fit, changing nothing then.
  addOpening: (opening) => {
    const { room } = get()
    const id = crypto.randomUUID()
    const next = { ...room, openings: [...openingsOf(room), { id, ...opening }] }
    if (openingsProblem(next)) return { problem: 'full' }
    set({ room: next })
    return { id }
  },
  // Build (J.8): changes opening `id`. Returns false and changes nothing when
  // it would not fit.
  updateOpening: (id, partial) => {
    const room = roomWithOpening(get().room, id, partial)
    if (room) set({ room })
    return Boolean(room)
  },
  removeOpening: (id) =>
    set((state) => ({ room: { ...state.room, openings: openingsOf(state.room).filter((opening) => opening.id !== id) } })),
  // Replaces the whole room (New Project, Open Project).
  setRoom: (room) => set({ room }),
}))
