// Room render ("snapshot") of the Plan scene, cropped to the 16:9 frame.
// SnapshotBridge (inside the Canvas) puts the capture function here, so code
// outside the Canvas (the mode switch) can call it while the Canvas is alive.
export const snapshotBridge = { capture: null }

const MAX_WIDTH = 1920
// The canvas is transparent; the Room render fills this colour behind it.
// Always white, whatever the theme (.scene-pane follows the theme on screen),
// so the image sent to the AI does not depend on the theme.
export const SCENE_BACKGROUND = '#ffffff'

// The 16:9 frame inside a width x height area: fits the height, or the width
// when the area is narrower than 16:9, centered. Same rule as .frame-guide-box.
export function frameRect(width, height) {
  const frameWidth = Math.min(width, (height * 16) / 9)
  const frameHeight = (frameWidth * 9) / 16
  return {
    x: (width - frameWidth) / 2,
    y: (height - frameHeight) / 2,
    width: frameWidth,
    height: frameHeight,
  }
}

// Where a point (a Vector3, world space) shows in the Room render: percent
// of the frame's width from the left and of its height from the top, and
// whether it is inside the frame and in front of the camera. `width` and
// `height` are the canvas size the frame is cut from. Changes `point`.
export function framePosition(point, camera, width, height) {
  point.project(camera)
  const rect = frameRect(width, height)
  const x = (((point.x + 1) / 2) * width - rect.x) / rect.width
  const y = (((1 - point.y) / 2) * height - rect.y) / rect.height
  const inFrame = point.z > -1 && point.z < 1 && x >= 0 && x <= 1 && y >= 0 && y <= 1
  const percent = (value) => Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10
  return { x: percent(x), y: percent(y), inFrame }
}

// Takes the snapshot now: { image, objects } with image a PNG data URL and
// objects [{ id, x, y, inFrame }] (see framePosition, for each object's
// centre), or null when there is no Plan canvas or the render fails (e.g.
// WebGL context lost).
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
