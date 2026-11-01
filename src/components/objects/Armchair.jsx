import Parts from './Parts'

const SEAT_HEIGHT = 0.45
const ARM_WIDTH = 0.12
const ARM_HEIGHT = 0.62
const BACK_DEPTH = 0.18

// Seat, back and two arms, filling its size bounds exactly. The back is at
// local -z, so an unrotated armchair faces +z, like the Sofa. Drawn at the
// origin, standing on y = 0; the scene places and rotates it.
export default function Armchair({ size, color }) {
  const { width, depth, height } = size
  const innerWidth = width - 2 * ARM_WIDTH
  const armX = (width - ARM_WIDTH) / 2

  const parts = [
    // Seat
    { position: [0, SEAT_HEIGHT / 2, BACK_DEPTH / 2], box: [innerWidth, SEAT_HEIGHT, depth - BACK_DEPTH] },
    // Back
    { position: [0, height / 2, -(depth - BACK_DEPTH) / 2], box: [innerWidth, height, BACK_DEPTH] },
    // Arms
    { position: [-armX, ARM_HEIGHT / 2, 0], box: [ARM_WIDTH, ARM_HEIGHT, depth] },
    { position: [armX, ARM_HEIGHT / 2, 0], box: [ARM_WIDTH, ARM_HEIGHT, depth] },
  ]

  return <Parts parts={parts} color={color} />
}
