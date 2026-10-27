// Room render ("snapshot") of the Plan scene, cropped to the 16:9 frame.
// SnapshotBridge (inside the Canvas) puts the capture function here, so code
// outside the Canvas (the mode switch) can call it while the Canvas is alive.
export const snapshotBridge = { capture: null }

const MAX_WIDTH = 1920
// The canvas is transparent; this is the page colour behind it (.scene-pane).
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

// Takes the snapshot now: a PNG data URL, or null when there is no Plan
// canvas or the render fails (e.g. WebGL context lost).
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
