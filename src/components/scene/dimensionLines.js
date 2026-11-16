import { areaLabelPoint, axisStops, boundingBox, roomArea } from '../../store/roomShape.js'

// The room's sizes drawn like a floor plan (J.5.3): along the back of the room
// a chain of dimension lines from corner to corner, with one line over it for
// the whole width, and the same down the left side for the depth. A plain
// rectangle has only the whole-width and whole-depth lines. Plus the area, in
// the middle of the floor. Plain JS, no React and no three.js, so tests can
// use it.

// Half the length of the tick at the end of a dimension line, in meters.
const TICK = 0.1
// How far the whole-size line sits beyond the chain, in meters.
const TOTAL_STEP = 0.45

// A line from `from` to `to` (the stops along one axis) at `fixed` on the
// other, with a tick at each end and a label in the middle: { lines: [[x1, z1,
// x2, z2]], labels: [{ x, z, text }] }. `alongX` is true for a line along x.
function dimension(from, to, fixed, alongX) {
  const point = (along, across) => (alongX ? [along, across] : [across, along])
  const tick = (along) => [...point(along, fixed - TICK), ...point(along, fixed + TICK)]
  const [x, z] = point((from + to) / 2, fixed)
  return {
    lines: [[...point(from, fixed), ...point(to, fixed)], tick(from), tick(to)],
    labels: [{ x, z, text: (to - from).toFixed(2) }],
  }
}

// A dimension line for every wall (Build): parallel to the wall, `offset`
// meters outside it, from end to end with a tick at each end (across the
// line) and the wall's length in the middle, e.g. "3.50 m". `walls` is
// roomWalls of the room. Returns { lines: [[x1, z1, x2, z2]], labels: [{ x, z,
// text }] }.
export function wallDimensionsFor(walls, offset) {
  const lines = []
  const labels = []
  for (const { start, end, length, normal } of walls) {
    const [nx, nz] = normal
    const [ax, az] = [start.x + nx * offset, start.z + nz * offset]
    const [bx, bz] = [end.x + nx * offset, end.z + nz * offset]
    const tick = (x, z) => [x - nx * TICK, z - nz * TICK, x + nx * TICK, z + nz * TICK]
    lines.push([ax, az, bx, bz], tick(ax, az), tick(bx, bz))
    labels.push({ x: (ax + bx) / 2, z: (az + bz) / 2, text: `${length.toFixed(2)} m` })
  }
  return { lines, labels }
}

// The dimension lines and labels of a room, `gap` meters outside its back
// and left edges: { lines, labels, area: { x, z, text } }.
export function dimensionsFor(corners, gap) {
  const { minX, minZ } = boundingBox(corners)
  const { xs, zs } = axisStops(corners)
  const lines = []
  const labels = []
  const add = (part) => {
    lines.push(...part.lines)
    labels.push(...part.labels)
  }
  // Along the back (above in the view, z is smaller), then down the left side.
  const chains = [
    { stops: xs, alongX: true, first: minZ - gap, sign: -1 },
    { stops: zs, alongX: false, first: minX - gap, sign: -1 },
  ]
  for (const { stops, alongX, first, sign } of chains) {
    const last = stops.length - 1
    // The pieces between corners, when there is more than one.
    if (last > 1) for (let i = 0; i < last; i++) add(dimension(stops[i], stops[i + 1], first, alongX))
    add(dimension(stops[0], stops[last], last > 1 ? first + sign * TOTAL_STEP : first, alongX))
  }
  const [areaX, areaZ] = areaLabelPoint(corners)
  return { lines, labels, area: { x: areaX, z: areaZ, text: `${roomArea(corners).toFixed(1)} m²` } }
}
