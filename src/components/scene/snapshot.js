// Room render ("snapshot") of the Plan scene: what the 16:9 frame guide shows,
// always 1920 x 1080 (I.13), and the camera slots' thumbnails (I.14.1). SnapshotBridge (inside the Canvas) puts its functions
// here, so code outside the Canvas (the mode switch, the camera slots) can
// call them while the Canvas is alive:
// - capture(view): the Room render of `view` (a camera slot's view, I.14.2);
// - thumbnail(view): a small image of `view`, for its camera slot;
// - currentView(): the frame guide's view now, to save in a camera slot.
export const snapshotBridge = { capture: null, thumbnail: null, currentView: null }

// The canvas is transparent; the Room render fills this colour behind it.
// Always white, whatever the theme (.scene-pane follows the theme on screen),
// so the image sent to the AI does not depend on the theme.
export const SCENE_BACKGROUND = '#ffffff'

// A camera slot's thumbnail size, 16:9.
const THUMBNAIL_WIDTH = 320
const THUMBNAIL_HEIGHT = 180
const THUMBNAIL_QUALITY = 0.85

// Calls a bridge function, or gives null when there is no Plan canvas or the
// render fails (e.g. WebGL context lost).
function callBridge(name, ...args) {
  try {
    return snapshotBridge[name]?.(...args) ?? null
  } catch {
    return null
  }
}

// The Room render of a camera slot's `view`: { image, objects, view }, one
// entry of modeStore.roomRenders, or null.
export const takeSnapshot = (view) => callBridge('capture', view)

// A camera slot's thumbnail (JPEG data URL) from `view`, or null.
export const takeThumbnail = (view) => callBridge('thumbnail', view)

// The frame guide's view now ({ position, target, fov }), or null.
export const currentView = () => callBridge('currentView')

// What the frame guide shows now as a camera slot ({ view, thumbnail }), or
// null when the Plan scene cannot render (e.g. context lost).
export function captureSlot() {
  const view = currentView()
  const thumbnail = view && takeThumbnail(view)
  return thumbnail ? { view, thumbnail } : null
}

// Copies a freshly rendered WebGL canvas, already at the Room render size,
// into a PNG data URL on the white background. Must run right after the
// render, in the same task: the drawing buffer is not kept after the frame
// is shown.
export function canvasToPng(source) {
  return copyCanvas(source, source.width, source.height).toDataURL('image/png')
}

// The same, made small for a camera slot, as a JPEG data URL.
export function canvasToThumbnail(source) {
  return copyCanvas(source, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT).toDataURL('image/jpeg', THUMBNAIL_QUALITY)
}

function copyCanvas(source, width, height) {
  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const context = output.getContext('2d')
  context.fillStyle = SCENE_BACKGROUND
  context.fillRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
  return output
}
