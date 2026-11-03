// Is an object in the Room render? (H.6.2) The Room render is the 16:9 frame
// cut from the Plan canvas; an object is in frame when any part of its box
// shows inside that frame, so a partly visible object counts.
import { Euler, Matrix4, Vector3 } from 'three'
import { objectTransform } from '../store/roomBounds'

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
