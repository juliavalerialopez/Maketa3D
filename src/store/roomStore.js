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
import { SIZE_LIMITS, normalizeShape } from './roomMeasure.js'

// Allowed room size in meters, per dimension: [min, max]. Width and depth are
// the room's size seen from above (its corners' bounding box). Used by the
// Room inputs and by layout import.
export const ROOM_LIMITS = SIZE_LIMITS

// The room: { shape, linked, height, corners, openings } (J.2, J.4, J.8,
// K.1.4). Corners as in roomShape.js, in world space with the front wall at
// +z. `shape` is the card that made it: 'standard' (a rectangle), 'l' (each a
// preset of corners) or 'custom' (shaped in Build). `linked`: a Standard
// room keeps its width and depth equal. Openings (doors and windows) as in
// openings.js. The project file keeps height, corners and openings; the shape
// and `linked` are worked out again when it opens (shapeFor, linkedFor).

// A new project's room: a linked 5 m Standard, 2.6 m high.
export const DEFAULT_ROOM = { shape: 'standard', linked: true, height: 2.6, corners: rectangleCorners(5, 5), openings: [] }

// An L's cut away piece, per side: at least MIN_WALL, and leaving a leg of at
// least MIN_WALL.
export const notchLimits = (size) => [MIN_WALL, size - MIN_WALL]

const near = (a, b) => Math.abs(a - b) < 1e-9
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value))
// To the nearest 5 cm.
const roundToStep = (meters) => Math.round(meters * 20) / 20

// The shape card for a room with these corners (a file just opened, or a Build
// edit): any rectangle is a Standard.
export function shapeFor(corners) {
  const { shape } = describeRoom(corners)
  return shape === 'rectangle' ? 'standard' : shape
}

// Whether a room with these corners starts linked: its sides are equal.
export function linkedFor(corners) {
  const { width, depth } = describeRoom(corners)
  return near(width, depth)
}

// The room's size seen from above: { width, depth } of its bounding box.
export function roomSize(room) {
  const { width, depth } = boundingBox(room.corners)
  return { width, depth }
}

// Everything the Room inputs show and edit: { shape, linked, height, width,
// depth }, plus notchWidth, notchDepth and notch for an L, and the middle
// (centerX, centerZ), which stays where it is when sizes change.
export function roomParams(room) {
  const box = boundingBox(room.corners)
  return {
    ...describeRoom(room.corners),
    shape: room.shape,
    linked: Boolean(room.linked),
    height: room.height,
    centerX: box.centerX,
    centerZ: box.centerZ,
  }
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
  if (shape === 'standard') next.corners = rectangleCorners(width, depth, centerX, centerZ)
  if (shape === 'l') {
    const notchWidth = clamp(params.notchWidth, notchLimits(width))
    const notchDepth = clamp(params.notchDepth, notchLimits(depth))
    next.corners = lCorners(width, depth, notchWidth, notchDepth, params.notch, centerX, centerZ)
  }
  return next
}

// The room with new sizes: { width, depth, height, notchWidth, notchDepth },
// each optional. In a linked Standard, the side that was not typed follows the
// one that was (Width wins when both are given).
export function resizedRoom(room, size) {
  const params = { ...roomParams(room), ...size }
  if (params.shape === 'standard' && room.linked) {
    if ('depth' in size && !('width' in size)) params.width = params.depth
    else params.depth = params.width
  }
  return shapedRoom(room, params)
}

// The room as another shape (J.4): a Standard keeps the bounding box (and is
// linked when its sides are equal), a new L keeps it too and cuts half of each
// side away at the front right. The old names 'square' and 'rectangle' mean
// Standard; Custom is made in Build only.
export function reshapedRoom(room, name) {
  const shape = normalizeShape(name)
  const params = roomParams(room)
  if (!shape || shape === 'custom' || shape === params.shape) return room
  const next = { ...params, shape }
  if (shape === 'l') {
    next.notchWidth = roundToStep(next.width / 2)
    next.notchDepth = roundToStep(next.depth / 2)
    next.notch = 0
  }
  const shaped = shapedRoom(room, next)
  return shape === 'standard' ? { ...shaped, linked: near(next.width, next.depth) } : shaped
}

// An L with its cut away corner at corner `notch` (an index into
// NOTCH_CORNERS: 0 front right, 1 front left, 2 back left, 3 back right).
export function notchedRoom(room, notch) {
  const params = roomParams(room)
  if (params.shape !== 'l' || notch === params.notch) return room
  return shapedRoom(room, { ...params, notch })
}

// An L with its cut away corner moved to the next corner, clockwise seen from
// above (front at the bottom).
export function rotatedNotch(room) {
  const params = roomParams(room)
  return params.shape === 'l' ? notchedRoom(room, (params.notch + 1) % 4) : room
}

// A Standard room linked or unlinked. Linking makes the depth equal to the
// width, so it is one change.
export function linkedRoom(room, linked) {
  if (room.shape !== 'standard' || Boolean(room.linked) === linked) return room
  const next = { ...room, linked }
  return linked ? resizedRoom(next, { width: roomParams(room).width }) : next
}

// The walls (their numbers) that a Room configuration field moves (J.4.2),
// shown while the pointer is over the field. The room stays centred, so
// Width moves every wall along z (left and right, and an L's notch wall
// too), Depth every wall along x, both of them all walls in a linked Standard; Notch width
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
  if ((key === 'width' || key === 'depth') && room.shape === 'standard' && room.linked) return pick(() => true)
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
  // A Build edit that makes the sides unequal unlinks them.
  const linked = Boolean(room.linked) && linkedFor(corners)
  const next = { ...room, corners, openings, shape: shapeFor(corners), linked }
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
  // 'standard' or 'l' (the shape cards); 'square' and 'rectangle' mean Standard.
  setShape: (shape) => set((state) => ({ room: reshapedRoom(state.room, shape) })),
  rotateNotch: () => set((state) => ({ room: rotatedNotch(state.room) })),
  // An L's cut away corner, by index (NOTCH_CORNERS).
  setNotchCorner: (notch) => set((state) => ({ room: notchedRoom(state.room, notch) })),
  // A Standard's Width and Depth linked or not.
  setLinked: (linked) => set((state) => ({ room: linkedRoom(state.room, linked) })),
  // Back to the default room: a linked 5 m Standard, 2.6 m high, no doors or
  // windows.
  resetRoom: () => set({ room: { ...DEFAULT_ROOM, corners: rectangleCorners(5, 5), openings: [] } }),
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
