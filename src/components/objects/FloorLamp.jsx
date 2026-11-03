import Parts from './Parts'

const BASE_HEIGHT = 0.03
const POLE_RADIUS = 0.015
const SHADE_HEIGHT = 0.3

// Round base, thin pole and a shade that widens toward the bottom, filling
// its size bounds: the shade's bottom rim is as wide as the footprint.
// Drawn at the origin, standing on y = 0.
export default function FloorLamp({ size, color, faded }) {
  const { width, height } = size
  const radius = width / 2
  const shadeBottom = height - SHADE_HEIGHT
  const poleHeight = shadeBottom - BASE_HEIGHT

  const parts = [
    // Base
    { position: [0, BASE_HEIGHT / 2, 0], cylinder: [radius * 0.8, radius * 0.85, BASE_HEIGHT] },
    // Pole
    { position: [0, BASE_HEIGHT + poleHeight / 2, 0], cylinder: [POLE_RADIUS, POLE_RADIUS, poleHeight] },
    // Shade
    { position: [0, shadeBottom + SHADE_HEIGHT / 2, 0], cylinder: [radius * 0.65, radius, SHADE_HEIGHT] },
  ]

  return <Parts parts={parts} color={color} faded={faded} />
}
