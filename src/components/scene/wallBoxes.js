import { roomWalls } from '../../store/roomShape'

// How thick the walls are drawn in 3D, outward from the inside edge.
export const WALL_THICKNESS = 0.05

// One box per wall of the room (J.2), `thickness` thick, sitting just outside
// the floor edge: { position, size, normal, wall } (`normal` [x, 0, z] points
// out of the room, `wall` is the roomWalls entry). A wall along x also covers
// the outer corner square at each end that turns outward, so every outer
// corner is closed by exactly one wall; for a rectangle that is the front and
// back walls.
export function wallBoxes(corners, height, thickness = WALL_THICKNESS) {
  return roomWalls(corners).map((wall) => {
    const { start, end, length, normal, startConvex, endConvex } = wall
    const alongX = Math.abs(end.z - start.z) < 1e-9
    const before = alongX && startConvex ? thickness : 0
    const after = alongX && endConvex ? thickness : 0
    const [dx, dz] = [(end.x - start.x) / length, (end.z - start.z) / length]
    // From the wall's middle: out by half a thickness, and along it toward
    // the end that is longer.
    const shift = (after - before) / 2
    const x = (start.x + end.x) / 2 + (normal[0] * thickness) / 2 + dx * shift
    const z = (start.z + end.z) / 2 + (normal[1] * thickness) / 2 + dz * shift
    const span = length + before + after
    return {
      position: [x, height / 2, z],
      size: alongX ? [span, height, thickness] : [thickness, height, span],
      normal: [normal[0], 0, normal[1]],
      wall,
    }
  })
}
