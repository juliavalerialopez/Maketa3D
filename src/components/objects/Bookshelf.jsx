import Parts from './Parts'

const BOARD = 0.02 // sides, top, bottom and shelves
const BACK = 0.01
const SHELVES = 4

// Two sides, top, bottom, four evenly spaced shelves and a thin back, filling
// its size bounds exactly. The back is at local -z, so an unrotated bookshelf
// opens toward +z. Drawn at the origin, standing on y = 0.
export default function Bookshelf({ size, color, faded }) {
  const { width, depth, height } = size
  const innerWidth = width - 2 * BOARD
  const boardDepth = depth - BACK
  const boardZ = BACK / 2
  // Bottom of the lowest board to top of the highest: SHELVES + 1 equal gaps.
  const gap = (height - BOARD) / (SHELVES + 1)

  const horizontal = (y) => ({ position: [0, y, boardZ], box: [innerWidth, BOARD, boardDepth] })

  const parts = [
    // Sides
    { position: [-(width - BOARD) / 2, height / 2, boardZ], box: [BOARD, height, boardDepth] },
    { position: [(width - BOARD) / 2, height / 2, boardZ], box: [BOARD, height, boardDepth] },
    // Back
    { position: [0, height / 2, -(depth - BACK) / 2], box: [width, height, BACK] },
    // Bottom, shelves and top
    ...Array.from({ length: SHELVES + 2 }, (_, index) => horizontal(BOARD / 2 + index * gap)),
  ]

  return <Parts parts={parts} color={color} faded={faded} />
}
