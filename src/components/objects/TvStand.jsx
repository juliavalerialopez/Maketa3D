import Parts from './Parts'
import { STAND_HEIGHT, STAND_MARGIN, TV_HEIGHT_PER_INCH, TV_LIFT, TV_WIDTH_PER_INCH } from './tvStandSize'

const PANEL_DEPTH = 0.05
const TV_COLOR = '#0b0b0b'
const SCREEN_COLOR = '#1b2026'

// A stand with a TV centered on it, filling its size bounds exactly. The TV
// size follows from the stand width. The screen faces +z, like the Sofa.
// The color is the stand's; the TV is always black. Drawn at the origin.
export default function TvStand({ size, color }) {
  const { width, depth } = size
  const tvWidth = width - 2 * STAND_MARGIN
  const tvHeight = (tvWidth * TV_HEIGHT_PER_INCH) / TV_WIDTH_PER_INCH
  const panelY = STAND_HEIGHT + TV_LIFT + tvHeight / 2

  const parts = [
    // Stand
    { position: [0, STAND_HEIGHT / 2, 0], box: [width, STAND_HEIGHT, depth] },
    // Foot and neck
    { position: [0, STAND_HEIGHT + 0.01, 0], box: [Math.min(0.4, tvWidth * 0.35), 0.02, 0.22], color: TV_COLOR },
    { position: [0, STAND_HEIGHT + 0.045, 0], box: [0.08, 0.05, 0.04], color: TV_COLOR },
    // Panel, and the screen on its front face
    { position: [0, panelY, 0], box: [tvWidth, tvHeight, PANEL_DEPTH], color: TV_COLOR },
    {
      position: [0, panelY, PANEL_DEPTH / 2 + 0.001],
      box: [tvWidth - 0.02, tvHeight - 0.02, 0.002],
      color: SCREEN_COLOR,
    },
  ]

  return <Parts parts={parts} color={color} />
}
