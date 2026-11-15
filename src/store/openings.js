// Doors and windows (Part J, J.8). Plain JS, no React and no three.js, so
// stores and tests can use it.
//
// An opening is { id, type: 'door' | 'window', wallIndex, offset, width,
// height, sill }: on wall `wallIndex` of the room (roomWalls), `offset`
// meters from the wall's first corner to its near edge, `width` along the
// wall, `height` and `sill` (from the floor to its bottom; a door's is 0) in
// meters. They live in the room (room.openings), so undo covers them.

import { roomWalls } from './roomShape.js'

// What a new one is like.
export const OPENING_TYPES = {
  door: { label: 'Door', width: 0.9, height: 2.05, sill: 0 },
  window: { label: 'Window', width: 1.2, height: 1.2, sill: 0.9 },
}

// At least this much wall is left at each end of an opening, in meters.
export const OPENING_EDGE = 0.1
// The smallest width and height of an opening, in meters.
export const MIN_OPENING_SIZE = 0.3
// The largest width of an opening, in meters.
export const MAX_OPENING_WIDTH = 10 - 2 * OPENING_EDGE

const EPSILON = 1e-6

// The room's openings (none in rooms from before J.8).
export const openingsOf = (room) => room.openings ?? []

// Wall `wall`'s direction from its first corner, [x, z], 1 m long.
const direction = (wall) => [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]

// The opening's two ends on the floor, [[x, z], [x, z]], from its wall's
// first corner side. `walls` is roomWalls of the room.
export function openingEnds(walls, opening) {
  const wall = walls[opening.wallIndex]
  const [dx, dz] = direction(wall)
  const at = (distance) => [wall.start.x + dx * distance, wall.start.z + dz * distance]
  return [at(opening.offset), at(opening.offset + opening.width)]
}

// Why the room's openings do not fit, or null when they all do (J.8 rules):
// - 'wall': one is not on a wall, or is too close to an end (OPENING_EDGE);
// - 'height': one is taller than the room (sill + height);
// - 'overlap': two on the same wall overlap.
export function openingsProblem(room) {
  const walls = roomWalls(room.corners)
  const openings = openingsOf(room)
  for (const opening of openings) {
    const wall = walls[opening.wallIndex]
    if (!wall) return 'wall'
    if (opening.offset < OPENING_EDGE - EPSILON) return 'wall'
    if (opening.offset + opening.width > wall.length - OPENING_EDGE + EPSILON) return 'wall'
    if (opening.sill + opening.height > room.height + EPSILON) return 'height'
  }
  for (let i = 0; i < openings.length; i++) {
    for (let j = i + 1; j < openings.length; j++) {
      const [a, b] = [openings[i], openings[j]]
      if (a.wallIndex !== b.wallIndex) continue
      if (a.offset < b.offset + b.width - EPSILON && b.offset < a.offset + a.width - EPSILON) return 'overlap'
    }
  }
  return null
}

// The openings of a room whose corners change from `oldCorners` to
// `newCorners`, each kept where it is on the floor and put on the new wall it
// lies on. Openings on wall `movedIndex` (of the old corners) move with it by
// `shift` ([x, z]). Null when one no longer lies on a single wall (e.g. a cut
// through it). Their fit is checked separately (openingsProblem).
export function reanchorOpenings(oldCorners, newCorners, openings, movedIndex = -1, shift = [0, 0]) {
  if (!openings.length) return openings
  const oldWalls = roomWalls(oldCorners)
  const newWalls = roomWalls(newCorners)
  const placed = []
  for (const opening of openings) {
    let [a, b] = openingEnds(oldWalls, opening)
    if (opening.wallIndex === movedIndex) {
      a = [a[0] + shift[0], a[1] + shift[1]]
      b = [b[0] + shift[0], b[1] + shift[1]]
    }
    const wallIndex = newWalls.findIndex((wall) => {
      const [dx, dz] = direction(wall)
      return [a, b].every(([x, z]) => {
        const along = (x - wall.start.x) * dx + (z - wall.start.z) * dz
        const across = (x - wall.start.x) * -dz + (z - wall.start.z) * dx
        return Math.abs(across) < EPSILON && along > -EPSILON && along < wall.length + EPSILON
      })
    })
    if (wallIndex === -1) return null
    const wall = newWalls[wallIndex]
    const [dx, dz] = direction(wall)
    const along = ([x, z]) => (x - wall.start.x) * dx + (z - wall.start.z) * dz
    // "+ 0" turns -0 into 0.
    placed.push({ ...opening, wallIndex, offset: Math.min(along(a), along(b)) + 0 })
  }
  return placed
}

// The room's openings made to fit after its shape or size changed in Room
// configuration (J.4 shapes, sizes, height); `previousCorners` are the
// corners they were placed on. Each goes to the wall facing the same way
// that is nearest to where it was (wall numbers change between shapes),
// keeps its place along it as far as it can, slides to fit, gets lower to fit
// under the ceiling, and is left out when it cannot fit at all (no such
// wall, too short, or it would overlap one kept before it).
export function fitOpenings(room, previousCorners = room.corners) {
  const openings = openingsOf(room)
  if (!openings.length) return room
  const oldWalls = roomWalls(previousCorners)
  const walls = roomWalls(room.corners)
  const kept = []
  for (const opening of openings) {
    const oldWall = oldWalls[opening.wallIndex]
    if (!oldWall) continue
    const [a, b] = openingEnds(oldWalls, opening)
    const centre = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    const placed = nearestFacingWall(walls, oldWall.normal, centre)
    if (!placed) continue
    const { wall, wallIndex, along } = placed
    const maxOffset = wall.length - OPENING_EDGE - opening.width
    if (maxOffset < OPENING_EDGE - EPSILON) continue
    const offset = Math.min(maxOffset, Math.max(OPENING_EDGE, along - opening.width / 2))
    const height = Math.min(opening.height, room.height - opening.sill)
    if (height < MIN_OPENING_SIZE - EPSILON) continue
    const next = { ...opening, wallIndex, offset, height }
    if (openingsProblem({ ...room, openings: [...kept, next] })) continue
    kept.push(next)
  }
  return { ...room, openings: kept }
}

// Of `walls`, the one facing `normal` nearest to the floor point `point`:
// { wall, wallIndex, along } (where `point` falls along it), or null.
function nearestFacingWall(walls, normal, [x, z]) {
  let best = null
  walls.forEach((wall, wallIndex) => {
    if (Math.abs(wall.normal[0] - normal[0]) > EPSILON || Math.abs(wall.normal[1] - normal[1]) > EPSILON) return
    const [dx, dz] = direction(wall)
    const along = (x - wall.start.x) * dx + (z - wall.start.z) * dz
    const clamped = Math.min(wall.length, Math.max(0, along))
    const distance = Math.hypot(wall.start.x + dx * clamped - x, wall.start.z + dz * clamped - z)
    if (!best || distance < best.distance) best = { wall, wallIndex, along, distance }
  })
  return best
}

// Where a new opening of `type` goes (J.8): centred on wall `wallIndex`, or
// on the longest wall when that is -1. Returns the opening (without its id),
// or a problem: 'short' (the wall is too short for it) or 'full' (it would
// overlap another opening).
export function newOpening(room, type, wallIndex = -1) {
  const walls = roomWalls(room.corners)
  const index =
    wallIndex >= 0 ? wallIndex : walls.reduce((best, wall, i) => (wall.length > walls[best].length ? i : best), 0)
  const { width, height, sill } = OPENING_TYPES[type]
  const wall = walls[index]
  if (wall.length < width + 2 * OPENING_EDGE - EPSILON) return { problem: 'short' }
  const opening = { type, wallIndex: index, offset: (wall.length - width) / 2, width, height: Math.min(height, room.height - sill), sill }
  if (openingsProblem({ ...room, openings: [...openingsOf(room), opening] })) return { problem: 'full' }
  return { opening }
}

// Openings are placed in 5 cm steps, like walls.
const STEPS_PER_METER = 20

// A new opening of `type` on wall `wallIndex`, centred `along` meters from
// its first corner as far as the wall allows: in 5 cm steps, stopping 0.1 m
// before each end (J.8.1). Returns { opening (without its id), problem }:
// problem is null when it can go there, 'short' when the wall is too short
// for it, or 'full' when another opening is in the way.
export function placedOpening(room, type, wallIndex, along) {
  const wall = roomWalls(room.corners)[wallIndex]
  const { width, height, sill } = OPENING_TYPES[type]
  const snapped = Math.round((along - width / 2) * STEPS_PER_METER) / STEPS_PER_METER
  const offset = Math.max(OPENING_EDGE, Math.min(wall.length - OPENING_EDGE - width, snapped))
  // "+ 0" turns -0 into 0.
  const opening = { type, wallIndex, offset: offset + 0, width, height: Math.min(height, room.height - sill), sill }
  if (wall.length < width + 2 * OPENING_EDGE - EPSILON) return { opening, problem: 'short' }
  if (openingsProblem({ ...room, openings: [...openingsOf(room), opening] })) return { opening, problem: 'full' }
  return { opening, problem: null }
}

// The nearest wall to the floor point (x, z) within `reach` meters, as
// { wallIndex, along } (how far along it from its first corner), or null.
export function nearestWall(corners, x, z, reach) {
  let best = null
  roomWalls(corners).forEach((wall, wallIndex) => {
    const [dx, dz] = direction(wall)
    const along = (x - wall.start.x) * dx + (z - wall.start.z) * dz
    const clamped = Math.min(wall.length, Math.max(0, along))
    const distance = Math.hypot(wall.start.x + dx * clamped - x, wall.start.z + dz * clamped - z)
    if (distance <= reach && (!best || distance < best.distance)) best = { wallIndex, along, distance }
  })
  return best && { wallIndex: best.wallIndex, along: best.along }
}

// The tallest opening's top (sill + height), 0 without openings: the room
// cannot be lower than this.
export const tallestOpening = (room) => Math.max(0, ...openingsOf(room).map((opening) => opening.sill + opening.height))

// Display name of an opening, numbered per type in list order: "Door 1".
export function openingLabel(room, opening) {
  const sameType = openingsOf(room).filter((other) => other.type === opening.type)
  return `${OPENING_TYPES[opening.type].label} ${sameType.indexOf(opening) + 1}`
}
