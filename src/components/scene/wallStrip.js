// Just above the walls: where the flat symbols of doors and windows sit.
export const SYMBOL_Y = 0.03

// How wide a door or window symbol is across the thin walls of Plan's 2D view,
// a little wider than the wall so its lines read.
export const PLAN_BAND = 0.12

// A flat box along `wall` from `from` to `to` (meters along it), `across` from
// its inside line outward to `across + depth`, 1 cm high at height `y`:
// { position, size }. Plain JS, no React: the door and window symbols and
// Plan's 2D marks (J.9.5) share it.
export function wallStrip(wall, from, to, across, depth, y = SYMBOL_Y) {
  const [dx, dz] = [(wall.end.x - wall.start.x) / wall.length, (wall.end.z - wall.start.z) / wall.length]
  const [nx, nz] = wall.normal
  const middle = (from + to) / 2
  const out = across + depth / 2
  const alongX = Math.abs(dz) < 1e-9
  return {
    position: [wall.start.x + dx * middle + nx * out, y, wall.start.z + dz * middle + nz * out],
    size: alongX ? [to - from, 0.01, depth] : [depth, 0.01, to - from],
  }
}
