import Parts from './Parts'

// Box-based sofa that fills its size bounds exactly. The back is at local -z,
// so an unrotated sofa faces +z. Proportions scale with size. Drawn at the
// origin, standing on y = 0; the scene places and rotates it.
export default function Sofa({ size, color, faded }) {
  const { width, depth, height } = size
  const armWidth = width * 0.075
  const armHeight = height * 0.75
  const backDepth = depth * 0.22
  const seatHeight = height * 0.5
  const innerWidth = width - 2 * armWidth

  const parts = [
    // Seat
    { position: [0, seatHeight / 2, backDepth / 2], box: [innerWidth, seatHeight, depth - backDepth] },
    // Back
    { position: [0, height / 2, -(depth - backDepth) / 2], box: [innerWidth, height, backDepth] },
    // Arms
    { position: [-(width - armWidth) / 2, armHeight / 2, 0], box: [armWidth, armHeight, depth] },
    { position: [(width - armWidth) / 2, armHeight / 2, 0], box: [armWidth, armHeight, depth] },
  ]

  return <Parts parts={parts} color={color} faded={faded} />
}
