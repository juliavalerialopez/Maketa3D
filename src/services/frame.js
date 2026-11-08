// The Room render's frame. The Room render shows exactly the 16:9 frame guide
// of the Plan view, always at RENDER_WIDTH x RENDER_HEIGHT (I.13). Is an
// object in it? (H.6.2) Yes when any part of its box shows inside the frame,
// so a partly visible object counts.
import { Euler, Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { objectTransform, toDegrees, toRadians } from '../store/roomBounds.js'

// The Room render's fixed size, whatever the window size (I.13).
export const RENDER_WIDTH = 1920
export const RENDER_HEIGHT = 1080

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

// The vertical field of view (degrees) of a 16:9 camera that sees exactly
// the frame guide of a `width` x `height` canvas whose camera has vertical
// field of view `fov`. The same when the frame fits the height; narrower when
// the canvas is taller than 16:9 and the frame is a band across its middle.
export function frameFov(fov, width, height) {
  const share = frameRect(width, height).height / height
  return 2 * toDegrees(Math.atan(Math.tan(toRadians(fov / 2)) * share))
}

// A camera slot's view (I.14.1): what the frame guide shows right now, as
// plain numbers { position, target, fov }. `camera` is the Plan camera,
// `target` the point it orbits, `width` x `height` the canvas size.
export function frameView(camera, target, width, height) {
  return {
    position: camera.position.toArray(),
    target: target.toArray(),
    fov: frameFov(camera.fov, width, height),
  }
}

// A 16:9 three.js camera for a camera slot's view (frameView). Pass `camera`
// to update an existing one instead of making a new one.
export function viewCamera({ position, target, fov }, camera = new PerspectiveCamera()) {
  camera.fov = fov
  camera.aspect = RENDER_WIDTH / RENDER_HEIGHT
  camera.near = 0.1
  camera.far = 1000
  camera.updateProjectionMatrix()
  camera.position.set(...position)
  camera.lookAt(...target)
  camera.updateMatrixWorld()
  return camera
}

// Where a point (a Vector3, world space) shows in the Room render: percent of
// the frame's width from the left and of its height from the top, clamped to
// the frame (I.12: the one place for this projection, with isInFrame below).
// `width` and `height` are the size the camera renders at (the Room render
// size, so the frame is the whole image). Changes
// `point`.
export function framePosition(point, camera, width, height) {
  point.project(camera)
  const rect = frameRect(width, height)
  const x = (((point.x + 1) / 2) * width - rect.x) / rect.width
  const y = (((1 - point.y) / 2) * height - rect.y) / rect.height
  const percent = (value) => Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10
  return { x: percent(x), y: percent(y) }
}

// The camera as plain numbers, stored with the Room render so later checks
// use the camera that took it: { projection, view, width, height }, with the
// two 4 x 4 matrices as arrays and the canvas size in pixels.
export function cameraView(camera, width, height) {
  camera.updateMatrixWorld()
  return {
    projection: camera.projectionMatrix.toArray(),
    view: camera.matrixWorldInverse.toArray(),
    width,
    height,
  }
}

// Scratch objects, reused to avoid allocations per check.
const matrix = new Matrix4()
const viewMatrix = new Matrix4()
const viewProjection = new Matrix4()
const euler = new Euler()
const point = new Vector3()

// The 8 corners of the object's box in world space. The origin is the middle
// of the base: x and z go ±half the size, y from 0 to the height. Placed like
// the scene places it (objectTransform: position, rotation, floor lift).
function corners(object) {
  const { width, depth, height } = object.size
  const { position, rotation } = objectTransform(object)
  matrix.makeRotationFromEuler(euler.set(...rotation)).setPosition(...position)
  const result = []
  for (const x of [-width / 2, width / 2])
    for (const y of [0, height])
      for (const z of [-depth / 2, depth / 2]) result.push(new Vector3(x, y, z).applyMatrix4(matrix))
  return result
}

// True when any part of the object's box shows inside the Room render's
// frame. Corners behind the camera are left out; the box is in frame when the
// rectangle around its other corners overlaps the frame. With no stored view
// (no Room render yet), every object counts as in frame.
export function isInFrame(object, view) {
  if (!view) return true
  viewProjection.fromArray(view.projection).multiply(viewMatrix.fromArray(view.view))
  const rect = frameRect(view.width, view.height)

  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity
  let inFront = 0
  for (const corner of corners(object)) {
    // w > 0: in front of the camera.
    point.copy(corner)
    const w = point.x * viewProjection.elements[3] + point.y * viewProjection.elements[7] +
      point.z * viewProjection.elements[11] + viewProjection.elements[15]
    if (w <= 0) continue
    point.applyMatrix4(viewProjection)
    inFront++
    const x = ((point.x + 1) / 2) * view.width
    const y = ((1 - point.y) / 2) * view.height
    left = Math.min(left, x)
    right = Math.max(right, x)
    top = Math.min(top, y)
    bottom = Math.max(bottom, y)
  }
  if (inFront === 0) return false
  return right >= rect.x && left <= rect.x + rect.width && bottom >= rect.y && top <= rect.y + rect.height
}
