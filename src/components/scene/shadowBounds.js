// How far from the middle of the world the room's shadows must reach, and how
// big the shadow map is, so a large room keeps its shadows. Plain JS, no React
// and no three.js, so tests can use it.

// A room up to this far from the middle fits the light's first shadow box
// (reach 5 m, 512 pixels).
const BASE_REACH = 5
const BASE_MAP = 512
const MAX_MAP = 4096

// { reach, mapSize } for a room of `corners`: the shadow box covers every
// corner and 1 m more, and the map grows with it so the shadows keep their
// sharpness.
export function shadowBounds(corners) {
  const farthest = Math.max(0, ...corners.map(({ x, z }) => Math.hypot(x, z)))
  const reach = Math.max(BASE_REACH, farthest + 1)
  const mapSize = Math.min(MAX_MAP, BASE_MAP * Math.ceil(reach / BASE_REACH))
  return { reach, mapSize }
}
