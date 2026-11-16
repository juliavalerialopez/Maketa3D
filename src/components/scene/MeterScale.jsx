import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// The legend square is only drawn between these sizes, in pixels per meter.
const MIN_PIXELS = 16
const MAX_PIXELS = 140

// Tells the scale legend (ScaleLegend) how many pixels one meter is on screen,
// as the CSS variable --meter on the view's pane.
export default function MeterScale() {
  const last = useRef(null)
  useFrame(({ camera, gl }) => {
    if (camera.zoom === last.current) return
    last.current = camera.zoom
    const pane = gl.domElement.closest('.scene-pane')
    if (!pane) return
    pane.style.setProperty('--meter', `${camera.zoom}px`)
    pane.style.setProperty('--legend-display', camera.zoom >= MIN_PIXELS && camera.zoom <= MAX_PIXELS ? 'block' : 'none')
  })
  return null
}
