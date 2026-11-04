import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { cameraView, framePosition, isInFrame } from '../src/services/frame.js'

// A 16:9 canvas, so the frame is the whole canvas. The camera stands at
// z = 5 and looks at the middle of the room.
const camera = new PerspectiveCamera(50, 16 / 9, 0.1, 100)
camera.position.set(0, 1.2, 5)
camera.lookAt(0, 0.4, 0)
const view = cameraView(camera, 1600, 900)

const sofaAt = (x, z) => ({
  size: { width: 2, depth: 0.9, height: 0.8 },
  position: [x, 0, z],
  rotation: [0, 0, 0],
})

test('an object in the middle is in frame', () => {
  assert.equal(isInFrame(sofaAt(0, 0), view), true)
})

test('an object partly inside the frame counts', () => {
  assert.equal(isInFrame(sofaAt(4.5, 0), view), true)
})

test('an object fully outside the frame is not in it', () => {
  assert.equal(isInFrame(sofaAt(7, 0), view), false)
})

test('an object behind the camera is not in frame', () => {
  assert.equal(isInFrame(sofaAt(0, 10), view), false)
})

test('the point the camera looks at is in the middle of the frame', () => {
  assert.deepEqual(framePosition(new Vector3(0, 0.4, 0), camera, 1600, 900), { x: 50, y: 50 })
})

test('positions outside the frame are clamped to its edges', () => {
  const { x } = framePosition(new Vector3(100, 0.4, 0), camera, 1600, 900)
  assert.equal(x, 100)
})

test('in a wide canvas the position is measured in the 16:9 frame, not the canvas', () => {
  // 2000 x 900: the frame is 1600 x 900 in the middle, so the centre stays at 50%.
  assert.deepEqual(framePosition(new Vector3(0, 0.4, 0), camera, 2000, 900), { x: 50, y: 50 })
})

test('without a Room render camera, every object counts', () => {
  assert.equal(isInFrame(sofaAt(100, 100), null), true)
})
