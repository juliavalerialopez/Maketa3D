// Room render ("snapshot") of the Plan scene: what the 16:9 frame guide shows,
// always 1920 x 1080 (I.13). SnapshotBridge (inside the Canvas) puts the
// capture function here, so code outside the Canvas (the mode switch) can
// call it while the Canvas is alive.
export const snapshotBridge = { capture: null }

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

// Copies a freshly rendered WebGL canvas, already at the Room render size,
// into a PNG data URL on the white background. Must run right after the
// render, in the same task: the drawing buffer is not kept after the frame
// is shown.
export function canvasToPng(source) {
  const output = document.createElement('canvas')
  output.width = source.width
  output.height = source.height
  const context = output.getContext('2d')
  context.fillStyle = SCENE_BACKGROUND
  context.fillRect(0, 0, output.width, output.height)
  context.drawImage(source, 0, 0)
  return output.toDataURL('image/png')
}
