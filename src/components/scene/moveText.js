// Text for the label shown while an object is moved (J0.3.1): how far it has
// moved along each of the room's axes, with an arrow for the way it went on
// screen. Plain JS, no React, so it can be tested.

// Moves shorter than this along an axis count as none (they would show "0 cm").
export const MIN_MOVE = 0.005

// Arrows by screen direction, counter-clockwise from right, 45° apart.
const ARROWS = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘']

// "30 cm" under 1 m, "1 m" or "1.25 m" from 1 m on.
export function movedText(meters) {
  const size = Math.abs(meters)
  if (Math.round(size * 100) < 100) return `${Math.round(size * 100)} cm`
  return `${Number((Math.round(size * 100) / 100).toFixed(2))} m`
}

// The arrow nearest to a screen direction (dx to the right, dy up).
export function arrowFor(dx, dy) {
  const angle = Math.atan2(dy, dx)
  const step = Math.round(angle / (Math.PI / 4))
  return ARROWS[((step % 8) + 8) % 8]
}
