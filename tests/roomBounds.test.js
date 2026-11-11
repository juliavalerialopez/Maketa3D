import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  clampPosition,
  normalizeDegrees,
  normalizeRadians,
  nudgeOffset,
  objectTransform,
  positionLimits,
  toDegrees,
  toRadians,
  wallDistances,
} from '../src/store/roomBounds.js'

const room = { width: 6, depth: 5, height: 2.6 }
const sofa = { size: { width: 2, depth: 0.9, height: 0.8 }, rotation: [0, 0, 0] }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`)

test('an object pushed past each wall stops at it', () => {
  assert.deepEqual(clampPosition(sofa, room, 10, 0), [2, 0, 0])
  assert.deepEqual(clampPosition(sofa, room, -10, 0), [-2, 0, 0])
  assert.deepEqual(clampPosition(sofa, room, 0, 10), [0, 0, 2.05])
  assert.deepEqual(clampPosition(sofa, room, 0, -10), [0, 0, -2.05])
})

test('an object inside the room keeps its position', () => {
  assert.deepEqual(clampPosition(sofa, room, 0.5, -1), [0.5, 0, -1])
})

test('a turned object uses its rotated footprint', () => {
  const turned = { ...sofa, rotation: [0, Math.PI / 2, 0] }
  const limits = positionLimits(turned, room)
  close(limits.x[1], 3 - 0.45)
  close(limits.z[1], 2.5 - 1)
})

test('an object wider than the room is centered on that axis', () => {
  const narrow = { width: 1.5, depth: 5, height: 2.6 }
  const [x] = clampPosition(sofa, narrow, 5, 0)
  close(x, 0)
})

test('the distances to the walls add up to the room size minus the footprint', () => {
  const placed = { ...sofa, position: [1, 0, -0.5] }
  const { left, right, back, front } = wallDistances(placed, room)
  close(left.distance, 3)
  close(right.distance, 1)
  close(back.distance, 1.55)
  close(front.distance, 2.55)
  close(left.distance + right.distance, room.width - 2)
  close(back.distance + front.distance, room.depth - 0.9)
})

test('a turned object measures from its rotated footprint, with lines from each side to the wall', () => {
  const turned = { ...sofa, position: [0, 0, 0], rotation: [0, Math.PI / 2, 0] }
  const { left, back } = wallDistances(turned, room)
  close(left.distance, 3 - 0.45)
  close(back.distance, 2.5 - 1)
  close(left.from[0], -0.45)
  assert.deepEqual(left.to, [-3, left.from[1]])
  close(back.from[1], -1)
  assert.deepEqual(back.to, [back.from[0], -2.5])
})

test('an object against a wall is 0 from it', () => {
  const [x, , z] = clampPosition(sofa, room, 10, 10)
  const { right, front } = wallDistances({ ...sofa, position: [x, 0, z] }, room)
  close(right.distance, 0)
  close(front.distance, 0)
})

// Arrow keys (J0.5): relative to the screen, snapped to a room axis.
test('looking toward the back, Up moves to the back, Right to the right', () => {
  const view = { position: [0, 4, 5], target: [0, 0, 0] }
  assert.deepEqual(nudgeOffset(view, 'ArrowUp', 0.1), [0, -0.1])
  assert.deepEqual(nudgeOffset(view, 'ArrowDown', 0.1), [0, 0.1])
  assert.deepEqual(nudgeOffset(view, 'ArrowRight', 0.1), [0.1, 0])
  assert.deepEqual(nudgeOffset(view, 'ArrowLeft', 0.01), [-0.01, 0])
})

test('from the default corner view the keys snap to the nearest room axis', () => {
  // Looking from +x, a bit more than from +z: straight ahead is -x.
  const view = { position: [4.2, 4, 4], target: [0, 0, 0] }
  assert.deepEqual(nudgeOffset(view, 'ArrowUp', 0.1), [-0.1, 0])
  assert.deepEqual(nudgeOffset(view, 'ArrowRight', 0.1), [0, -0.1])
})

test('other keys do not nudge', () => {
  assert.equal(nudgeOffset({ position: [0, 4, 5], target: [0, 0, 0] }, 'Enter', 0.1), null)
})

test('angles convert between degrees and radians and stay within one turn', () => {
  close(toDegrees(Math.PI / 2), 90)
  close(toRadians(180), Math.PI)
  assert.equal(normalizeDegrees(-90), 270)
  assert.equal(normalizeDegrees(360), 0)
  assert.equal(normalizeDegrees(45), 45)
  close(normalizeRadians(-Math.PI / 2), (3 * Math.PI) / 2)
  close(normalizeRadians(2 * Math.PI), 0)
})

test('a tilted object is lifted so its lowest point touches the floor', () => {
  const onItsBack = { ...sofa, position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0] }
  const { position } = objectTransform(onItsBack)
  close(position[1], 0.45)
})
