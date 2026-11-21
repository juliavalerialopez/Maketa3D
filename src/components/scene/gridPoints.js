import { boundingBox, containsPoint } from '../../store/roomShape.js'

// The 2D view's floor grid: dotted lines every meter from the origin corner (min x,
// max z), solid lines every GRID_LINE_EVERY meters instead of a dotted one,
// inside the room only.
const GRID_EVERY = 1
// Meters between the dots of a line.
export const GRID_DOT_STEP = 0.1
const DOTS_PER_LINE_GAP = Math.round(GRID_EVERY / GRID_DOT_STEP)
export const GRID_LINE_EVERY = 5
const DOTS_PER_SOLID_GAP = Math.round(GRID_LINE_EVERY / GRID_DOT_STEP)
// Margin kept from the walls, and the step used to clip solid lines.
const INSET = 0.05
const WALK = 0.05

const clearlyInside = (corners, x, z) =>
  [-INSET, INSET].every((dx) => [-INSET, INSET].every((dz) => containsPoint(corners, x + dx, z + dz)))

// { dots: [[x, z], ...], lines: [[x1, z1, x2, z2], ...] } in world space.
export function gridFor(corners) {
  const box = boundingBox(corners)
  const dots = []
  const lines = []
  // Dotted lines along z (at whole meters from the left) and along x (from the front).
  for (let i = GRID_EVERY; i < box.width; i += GRID_EVERY) {
    if (i % GRID_LINE_EVERY === 0) continue
    for (let k = 0; k * GRID_DOT_STEP <= box.depth; k++) {
      const [x, z] = [box.minX + i, box.maxZ - k * GRID_DOT_STEP]
      if (k % DOTS_PER_SOLID_GAP !== 0 && clearlyInside(corners, x, z)) dots.push([x, z])
    }
  }
  for (let j = GRID_EVERY; j < box.depth; j += GRID_EVERY) {
    if (j % GRID_LINE_EVERY === 0) continue
    for (let k = 0; k * GRID_DOT_STEP <= box.width; k++) {
      const [x, z] = [box.minX + k * GRID_DOT_STEP, box.maxZ - j]
      // A crossing is already a dot of the first set.
      if (k % DOTS_PER_LINE_GAP !== 0 && k % DOTS_PER_SOLID_GAP !== 0 && clearlyInside(corners, x, z)) dots.push([x, z])
    }
  }
  // A solid line along z at x (alongZ) or along x at z: the runs of it inside the room.
  const runs = (fixed, from, to, alongZ) => {
    let start = null
    let last = null
    const close = () => {
      if (start !== null) lines.push(alongZ ? [fixed, start, fixed, last] : [start, fixed, last, fixed])
      start = null
    }
    for (let at = from; at <= to + 1e-9; at += WALK) {
      if (clearlyInside(corners, ...(alongZ ? [fixed, at] : [at, fixed]))) {
        start ??= at
        last = at
      } else close()
    }
    close()
  }
  for (let i = GRID_LINE_EVERY; i < box.width; i += GRID_LINE_EVERY) runs(box.minX + i, box.minZ, box.maxZ, true)
  for (let j = GRID_LINE_EVERY; j < box.depth; j += GRID_LINE_EVERY) runs(box.maxZ - j, box.minX, box.maxX, false)
  return { dots, lines }
}
