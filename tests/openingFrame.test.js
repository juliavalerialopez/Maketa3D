import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RENDER_HEIGHT, RENDER_WIDTH, openingFrame, viewCamera } from '../src/services/frame.js'
import { rectangleCorners, roomWalls } from '../src/store/roomShape.js'

// A 4 x 4 room, 2.6 m high. The camera stands near the front wall, in the
// middle, at 1.3 m, looking straight at the back wall (z -2).
const walls = roomWalls(rectangleCorners(4, 4))
const back = walls.find((wall) => wall.normal[1] < 0)
const front = walls.find((wall) => wall.normal[1] > 0)
const camera = () => viewCamera({ position: [0, 1.3, 1.5], target: [0, 1.3, -2], fov: 50 })
const frame = (wall, opening, view = camera()) => openingFrame(wall, opening, view, RENDER_WIDTH, RENDER_HEIGHT)
// A 1 m wide opening in the middle of its 4 m wall.
const window = { type: 'window', offset: 1.5, width: 1, height: 1, sill: 0.8 }

test('a window in the middle of the wall the camera looks at covers the middle of the Room render (J.11.1)', () => {
  const { left, right, top, bottom } = frame(back, window)
  // Centred from side to side, and around the camera's height (1.3 m).
  assert.ok(Math.abs(left + right - 100) < 0.2, `${left} to ${right}`)
  assert.ok(Math.abs(top + bottom - 100) < 0.2, `${top} to ${bottom}`)
  assert.ok(left > 30 && right < 70 && top > 20 && bottom < 80)
  // 1 m wide and 1 m high: the same size on screen, in pixels.
  const [wide, high] = [((right - left) / 100) * RENDER_WIDTH, ((bottom - top) / 100) * RENDER_HEIGHT]
  assert.ok(Math.abs(wide - high) < 4, `${wide} x ${high}`)
})

test('a wider or higher window covers more; one moved along the wall moves in the image', () => {
  const base = frame(back, window)
  const wider = frame(back, { ...window, width: 2 })
  assert.ok(wider.right - wider.left > 1.9 * (base.right - base.left))
  const higher = frame(back, { ...window, sill: 1.2 })
  assert.ok(higher.top < base.top && higher.bottom < base.bottom)
  const moved = frame(back, { ...window, offset: 0.2 })
  assert.notEqual(moved.left, base.left)
  assert.ok(Math.abs(moved.right - moved.left - (base.right - base.left)) < 0.2)
})

test('an opening that does not show has no rectangle', () => {
  // On the wall behind the camera.
  assert.equal(frame(front, window), null)
  // On a wall the camera is outside of (the wall is hidden).
  const outside = viewCamera({ position: [0, 1.3, -6], target: [0, 1.3, 0], fov: 50 })
  assert.equal(frame(back, window, outside), null)
  // Outside the frame: the camera looks away from it, to the right.
  const away = viewCamera({ position: [0, 1.3, 1.5], target: [2, 1.3, 1.5], fov: 50 })
  assert.equal(frame(back, { ...window, offset: 0.1, width: 0.5 }, away), null)
})

test('an opening partly outside the frame is clamped to it', () => {
  // Close to the back wall: the 3.8 m wide window runs past both sides.
  const close = viewCamera({ position: [0, 1.3, -1], target: [0, 1.3, -2], fov: 50 })
  const { left, right } = frame(back, { ...window, offset: 0.1, width: 3.8 }, close)
  assert.equal(left, 0)
  assert.equal(right, 100)
})
