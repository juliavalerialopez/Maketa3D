import { frameRect } from '../../services/frame'

// Room render ("snapshot") of the Plan scene, cropped to the 16:9 frame.
// SnapshotBridge (inside the Canvas) puts the capture function here, so code
// outside the Canvas (the mode switch) can call it while the Canvas is alive.
export const snapshotBridge = { capture: null }

const MAX_WIDTH = 1920
// The canvas is transparent; the Room render fills this colour behind it.
// Always white, whatever the theme (.scene-pane follows the theme on screen),
// so the image sent to the AI does not depend on the theme.
export const SCENE_BACKGROUND = '#ffffff'

// Takes the snapshot now: the Room render { image, objects, view } stored in
// modeStore (see roomRender there), or null when there is no Plan canvas or
// the render fails (e.g. WebGL context lost).
export function takeSnapshot() {
  try {
    return snapshotBridge.capture?.() ?? null
  } catch {
    return null
  }
}

// Copies the frame area of a freshly rendered WebGL canvas into a new
// image, at most 1920 x 1080. Must run right after the render, in the same
// task: the drawing buffer is not kept after the frame is shown.
export function cropToFrame(source) {
  const rect = frameRect(source.width, source.height)
  const scale = Math.min(1, MAX_WIDTH / rect.width)
  const output = document.createElement('canvas')
  output.width = Math.round(rect.width * scale)
  output.height = Math.round((output.width * 9) / 16)
  const context = output.getContext('2d')
  context.fillStyle = SCENE_BACKGROUND
  context.fillRect(0, 0, output.width, output.height)
  context.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, output.width, output.height)
  return output.toDataURL('image/png')
}
